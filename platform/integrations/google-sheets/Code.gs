const TAB_RESPONSES = '回答一覧';
const TAB_ANSWERS = '回答詳細';
const TAB_STORES = '店舗・医院マスタ';
const TAB_EVENTS = 'イベント';
const TAB_STORE_SHEETS = '店舗タブ管理';
const DEFAULT_SPREADSHEET_ID = '1diiL76VHtmVFGQPeUfUJ2V7lEz_mM7fWO-oVCnRwu0s';

function setup() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', DEFAULT_SPREADSHEET_ID);
  if (!props.getProperty('WEBHOOK_SECRET')) {
    props.setProperty('WEBHOOK_SECRET', Utilities.getUuid() + Utilities.getUuid());
  }
  Logger.log('SPREADSHEET_ID=' + props.getProperty('SPREADSHEET_ID'));
  Logger.log('WEBHOOK_SECRET=' + props.getProperty('WEBHOOK_SECRET'));
}

function doGet() {
  const props = PropertiesService.getScriptProperties();
  return jsonResponse({
    ok: true,
    configured: Boolean(props.getProperty('SPREADSHEET_ID') && props.getProperty('WEBHOOK_SECRET')),
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const props = PropertiesService.getScriptProperties();
    const expectedSecret = props.getProperty('WEBHOOK_SECRET');
    const spreadsheetId = props.getProperty('SPREADSHEET_ID') || DEFAULT_SPREADSHEET_ID;

    if (!expectedSecret || !spreadsheetId) {
      return jsonResponse({ ok: false, error: 'Script Properties are not configured.' });
    }
    if (!body.secret || body.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' });
    }
    const ss = SpreadsheetApp.openById(spreadsheetId);
    if (body.action) {
      return handleStoreLifecycle(ss, body);
    }
    if (!body.response || !body.response.id || !body.store || !body.store.id) {
      return jsonResponse({ ok: false, error: 'response.id and store.id are required.' });
    }
    const response = body.response;
    const store = body.store || {};
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const events = Array.isArray(body.events) ? body.events : [];
    const responseSheet = ss.getSheetByName(TAB_RESPONSES);
    const answerSheet = ss.getSheetByName(TAB_ANSWERS);
    const storeSheet = ss.getSheetByName(TAB_STORES);
    const eventSheet = ss.getSheetByName(TAB_EVENTS);

    if (!responseSheet || !answerSheet || !storeSheet || !eventSheet) {
      return jsonResponse({ ok: false, error: 'Required spreadsheet tabs are missing.' });
    }

    // Idempotency: the response UUID is the write key. Retries never duplicate rows.
    if (findExactInColumn(responseSheet, 1, response.id)) {
      return jsonResponse({ ok: true, duplicate: true, responseId: response.id });
    }

    responseSheet.appendRow([
      response.id,
      response.submittedAt || '',
      store.name || '',
      store.industry || '',
      response.surveyName || store.name || '',
      store.slug || '',
      response.version || '',
      response.averageScore == null ? '' : response.averageScore,
      response.totalScore == null ? '' : response.totalScore,
      response.reviewEligible === true ? '対象' : '対象外',
      response.needsFollowUp === true ? '要フォロー' : '',
      new Date(),
    ]);

    answers.forEach(function(answer) {
      answerSheet.appendRow([
        response.id,
        response.submittedAt || '',
        store.name || '',
        answer.questionId || '',
        answer.questionTitle || '',
        answer.questionType || '',
        normalizeCellValue(answer.value),
        answer.score == null ? '' : answer.score,
      ]);
    });

    appendStoreResponse(ss, store, response, answers);

    upsertStore(storeSheet, store, response);

    events.forEach(function(event) {
      eventSheet.appendRow([
        event.id || Utilities.getUuid(),
        event.createdAt || new Date(),
        response.id,
        store.name || '',
        store.slug || '',
        event.type || '',
        response.reviewEligible === true ? '対象' : '対象外',
        JSON.stringify(event.metadata || {}),
      ]);
    });

    return jsonResponse({ ok: true, responseId: response.id });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function handleStoreLifecycle(ss, body) {
  const store = body.store || {};
  if (!store.id) return jsonResponse({ ok: false, error: 'store.id is required.' });
  const storeSheet = ss.getSheetByName(TAB_STORES);
  if (storeSheet) upsertStore(storeSheet, store, { submittedAt: '' });
  const sheet = ensureStoreSheet(ss, store);
  const archived = body.action === 'survey_archived';
  updateStoreSheetRegistry(ss, store, sheet, archived ? 'archived' : 'active');
  renameStoreSheet(ss, sheet, store, archived);
  if (archived) {
    if (!sheet.isSheetHidden()) sheet.hideSheet();
  } else if (sheet.isSheetHidden()) {
    sheet.showSheet();
  }
  appendLifecycleEvent(ss, body, store);
  return jsonResponse({ ok: true, action: body.action, sheetId: sheet.getSheetId() });
}

function appendStoreResponse(ss, store, response, answers) {
  const sheet = ensureStoreSheet(ss, store);
  if (sheet.isSheetHidden()) sheet.showSheet();
  renameStoreSheet(ss, sheet, store, false);
  updateStoreSheetRegistry(ss, store, sheet, 'active');
  if (findExactInColumn(sheet, 1, response.id)) return;

  const fixedHeaders = ['回答ID', '回答日時', 'アンケート名', 'バージョン', '平均スコア', '合計スコア', '要フォロー', 'Google口コミ対象'];
  const answerHeaders = answers.map(function(answer) {
    return (answer.questionTitle || '質問') + ' [' + String(answer.questionId || '').slice(0, 8) + ']';
  });
  const headers = ensureStoreSheetHeaders(sheet, fixedHeaders.concat(answerHeaders));
  const answerByHeader = {};
  answers.forEach(function(answer) {
    const header = (answer.questionTitle || '質問') + ' [' + String(answer.questionId || '').slice(0, 8) + ']';
    answerByHeader[header] = normalizeCellValue(answer.value);
  });
  const fixedValues = [
    response.id,
    response.submittedAt || '',
    response.surveyName || store.name || '',
    response.version || '',
    response.averageScore == null ? '' : response.averageScore,
    response.totalScore == null ? '' : response.totalScore,
    response.needsFollowUp === true ? '要フォロー' : '',
    response.reviewEligible === true ? '対象' : '対象外',
  ];
  const row = headers.map(function(header, index) {
    return index < fixedValues.length ? fixedValues[index] : (answerByHeader[header] == null ? '' : answerByHeader[header]);
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function ensureStoreSheet(ss, store) {
  const registry = ensureStoreSheetRegistry(ss);
  const row = findExactInColumn(registry, 1, store.id);
  if (row) {
    const sheetId = Number(registry.getRange(row, 4).getValue());
    const existing = ss.getSheets().find(function(sheet) { return sheet.getSheetId() === sheetId; });
    if (existing) return existing;
  }
  const sheet = ss.insertSheet(uniqueStoreSheetName(ss, store, false));
  sheet.setFrozenRows(1);
  updateStoreSheetRegistry(ss, store, sheet, 'active');
  return sheet;
}

function ensureStoreSheetRegistry(ss) {
  let sheet = ss.getSheetByName(TAB_STORE_SHEETS);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_STORE_SHEETS);
    sheet.getRange(1, 1, 1, 6).setValues([['Survey ID', '店舗・医院名', 'slug', 'シートID', '状態', '更新日時']]);
    formatHeader(sheet, 6);
  }
  return sheet;
}

function updateStoreSheetRegistry(ss, store, storeSheet, status) {
  const registry = ensureStoreSheetRegistry(ss);
  const row = findExactInColumn(registry, 1, store.id) || registry.getLastRow() + 1;
  registry.getRange(row, 1, 1, 6).setValues([[
    store.id,
    store.name || '',
    store.slug || '',
    storeSheet.getSheetId(),
    status,
    new Date(),
  ]]);
}

function ensureStoreSheetHeaders(sheet, requestedHeaders) {
  const lastColumn = sheet.getLastColumn();
  const headers = lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].filter(String) : [];
  requestedHeaders.forEach(function(header) {
    if (headers.indexOf(header) === -1) headers.push(header);
  });
  if (headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeader(sheet, headers.length);
  }
  return headers;
}

function formatHeader(sheet, columns) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, columns).setBackground('#e2f0f1').setFontWeight('bold').setWrap(true);
}

function renameStoreSheet(ss, sheet, store, archived) {
  const desired = uniqueStoreSheetName(ss, store, archived, sheet.getSheetId());
  if (sheet.getName() !== desired) sheet.setName(desired);
  sheet.setTabColor(archived ? '#9aa0a6' : '#5e969e');
}

function uniqueStoreSheetName(ss, store, archived, currentSheetId) {
  const prefix = archived ? '削除済み_' : '';
  const base = sanitizeSheetName(prefix + (store.name || '名称未設定') + ' [' + (store.slug || String(store.id).slice(0, 8)) + ']');
  let candidate = base;
  let suffix = 2;
  while (ss.getSheets().some(function(sheet) { return sheet.getName() === candidate && sheet.getSheetId() !== currentSheetId; })) {
    candidate = sanitizeSheetName(base.slice(0, 94) + '_' + suffix++);
  }
  return candidate;
}

function sanitizeSheetName(value) {
  const cleaned = String(value).replace(/[\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || '名称未設定').slice(0, 100);
}

function appendLifecycleEvent(ss, body, store) {
  const sheet = ss.getSheetByName(TAB_EVENTS);
  if (!sheet) return;
  sheet.appendRow([
    Utilities.getUuid(),
    body.occurredAt || new Date(),
    '',
    store.name || '',
    store.slug || '',
    body.action || '',
    '',
    JSON.stringify({ surveyId: store.id, status: store.status || '' }),
  ]);
}

function upsertStore(sheet, store, response) {
  if (!sheet || !store.id) return;
  const row = findExactInColumn(sheet, 1, store.id);
  const current = row ? sheet.getRange(row, 1, 1, 9).getValues()[0] : [];
  const values = [[
    store.id,
    store.name || '',
    store.industry || '',
    store.slug || '',
    store.status || '',
    store.googleReviewUrl || '',
    store.publishedAt || current[6] || '',
    response.submittedAt || current[7] || '',
    store.responseCount == null ? (current[8] || '') : Number(store.responseCount),
  ]];
  if (row) {
    sheet.getRange(row, 1, 1, values[0].length).setValues(values);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, values[0].length).setValues(values);
  }
}

function findExactInColumn(sheet, column, value) {
  if (!sheet || sheet.getLastRow() < 2 || !value) return null;
  const range = sheet.getRange(2, column, sheet.getLastRow() - 1, 1);
  const match = range.createTextFinder(String(value)).matchEntireCell(true).findNext();
  return match ? match.getRow() : null;
}

function normalizeCellValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(' / ');
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

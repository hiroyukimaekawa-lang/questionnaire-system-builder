const TAB_RESPONSES = '回答一覧';
const TAB_ANSWERS = '回答詳細';
const TAB_STORES = '店舗・医院マスタ';
const TAB_EVENTS = 'イベント';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const props = PropertiesService.getScriptProperties();
    const expectedSecret = props.getProperty('WEBHOOK_SECRET');
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');

    if (!expectedSecret || !spreadsheetId) {
      return jsonResponse({ ok: false, error: 'Script Properties are not configured.' });
    }
    if (!body.secret || body.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' });
    }
    if (!body.response || !body.response.id) {
      return jsonResponse({ ok: false, error: 'response.id is required.' });
    }

    const ss = SpreadsheetApp.openById(spreadsheetId);
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

function upsertStore(sheet, store, response) {
  if (!sheet || !store.id) return;
  const row = findExactInColumn(sheet, 1, store.id);
  const values = [[
    store.id,
    store.name || '',
    store.industry || '',
    store.slug || '',
    store.status || '',
    store.googleReviewUrl || '',
    store.publishedAt || '',
    response.submittedAt || '',
    store.responseCount == null ? '' : Number(store.responseCount),
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

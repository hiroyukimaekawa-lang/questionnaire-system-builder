import test from 'node:test';
import assert from 'node:assert/strict';
import {inferPageType, inferSurveyId} from '../lib/assistant/context';

test('14/15: pagePath -> pageType is inferred for every admin route the assistant can appear on', () => {
  assert.equal(inferPageType('/admin'), 'manage_list');
  assert.equal(inferPageType('/admin/manage'), 'manage_list');
  assert.equal(inferPageType('/admin/manage/abc-123'), 'manage_list');
  assert.equal(inferPageType('/admin/manage/abc-123/analytics'), 'analytics');
  assert.equal(inferPageType('/admin/manage/abc-123/responses'), 'responses');
  assert.equal(inferPageType('/admin/surveys/new'), 'survey_builder');
  assert.equal(inferPageType('/admin/surveys/abc-123'), 'survey_editor');
  assert.equal(inferPageType('/admin/surveys/abc-123/preview'), 'survey_editor');
  assert.equal(inferPageType('/admin/surveys/abc-123/questions'), 'survey_editor');
  assert.equal(inferPageType('/admin/surveys/abc-123/responses'), 'responses');
  assert.equal(inferPageType('/admin/users'), 'users');
  assert.equal(inferPageType('/admin/account/update-password'), 'account');
  assert.equal(inferPageType('/admin/invitations'), 'unknown');
  assert.equal(inferPageType('/admin/system/google-sheets'), 'unknown');
});

test('trailing slashes and query strings do not change the inferred pageType', () => {
  assert.equal(inferPageType('/admin/surveys/abc-123/'), 'survey_editor');
  assert.equal(inferPageType('/admin/surveys/abc-123?tab=design'), 'survey_editor');
});

test('16: surveyId is read from the route, never guessed for pages without one', () => {
  assert.equal(inferSurveyId('/admin/surveys/abc-123'), 'abc-123');
  assert.equal(inferSurveyId('/admin/surveys/abc-123/responses'), 'abc-123');
  assert.equal(inferSurveyId('/admin/manage/xyz-789/analytics'), 'xyz-789');
  assert.equal(inferSurveyId('/admin/surveys/new'), undefined);
  assert.equal(inferSurveyId('/admin/users'), undefined);
  assert.equal(inferSurveyId('/admin'), undefined);
});

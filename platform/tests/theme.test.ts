import test from 'node:test';import assert from 'node:assert/strict';
import {getThemeTemplate,resolveSurveyTheme,surveyThemeTemplates,themeIdForBusiness} from '../lib/theme/templates';
import {defaultConfig} from '../lib/survey';

test('3業種のcleanテーマを再利用可能な設定として持つ',()=>{assert.deepEqual(Object.keys(surveyThemeTemplates).sort(),['clinic-clean','restaurant-clean','salon-clean']);for(const theme of Object.values(surveyThemeTemplates)){assert.match(theme.config.primaryColor,/^#[0-9A-F]{6}$/i);assert.ok(theme.config.heroTitle);assert.ok(theme.config.introText);assert.ok(theme.config.completionText)}});
test('業種から適切なテーマを選ぶ',()=>{assert.equal(themeIdForBusiness('clinic'),'clinic-clean');assert.equal(themeIdForBusiness('restaurant'),'restaurant-clean');assert.equal(themeIdForBusiness('salon'),'salon-clean');assert.equal(themeIdForBusiness('other'),'clinic-clean')});
test('旧configもclinic-cleanの不足値で安全に補完する',()=>{const legacy={...defaultConfig,themeId:undefined,secondaryColor:undefined,heroTitle:undefined,heroSubtitle:undefined};const resolved=resolveSurveyTheme(legacy);assert.equal(resolved.themeId,'clinic-clean');assert.equal(resolved.secondaryColor,getThemeTemplate('clinic-clean').config.secondaryColor);assert.ok(resolved.heroTitle)});

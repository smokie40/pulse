import {test,expect} from 'vitest';
import {translate,initialLanguage} from './i18n';
test('Russian and English labels',()=>{expect(translate('en','Студия')).toBe('Studio');expect(translate('ru','Precision')).toBe('Точность');});
test('language persists and defaults to browser preference',()=>{expect(initialLanguage('ru','en-US')).toBe('ru');expect(initialLanguage(null,'ru-RU')).toBe('ru');expect(initialLanguage(null,'en-GB')).toBe('en');});

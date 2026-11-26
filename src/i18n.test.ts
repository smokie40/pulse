import {test,expect} from 'vitest';
import {translate,initialLanguage} from './i18n';
test('Russian and English labels',()=>{expect(translate('en','Студия')).toBe('Studio');expect(translate('ru','Precision')).toBe('Равномерные удары');});
test('language persists and defaults to browser preference',()=>{expect(initialLanguage('ru','en-US')).toBe('ru');expect(initialLanguage(null,'ru-RU')).toBe('ru');expect(initialLanguage(null,'en-GB')).toBe('en');});

test('musical Russian terminology',()=>{expect(translate('ru','Подразделение')).toBe('Длительность нот');expect(translate('ru','Аппликатура')).toBe('Чередование рук');expect(translate('ru','Озвучивать подразделения')).toBe('Клик на каждую ноту');expect(translate('en','Подразделение')).toBe('Subdivision');});

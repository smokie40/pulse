import {test,expect} from '@playwright/test';

test('browser starts, stops and restores a microphone-free exercise',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!sessionStorage.getItem('compat-seeded')){localStorage.setItem('pulse-settings',JSON.stringify({bpm:120,countIn:0,minutes:0,mode:'steady',rudiment:'RL',sub:4}));sessionStorage.setItem('compat-seeded','yes');}});
 await page.goto('./');await page.locator('#libraryBtn').click();await page.locator('[data-mode="steady"]').click();await expect(page.locator('#bpm')).toHaveValue('120');
 await page.locator('#start').click();await expect(page.locator('#playing')).toBeVisible({timeout:10000});await expect(page.locator('#liveStaff .note-current')).toHaveCount(1);
 await expect(page.locator('#remaining')).toHaveText('00:02',{timeout:10000});await page.locator('#stop').click();await expect(page.locator('#results')).toBeVisible();
 await page.reload();await page.locator('#progressBtn').click();await expect(page.locator('#historyRows .history-row')).toHaveCount(1);expect(errors).toEqual([]);
});

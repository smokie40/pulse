import {test,expect} from '@playwright/test';

test('feature controllers navigate without uncaught page errors',async({page})=>{const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('./');await page.locator('#homeMic').click();await expect(page.locator('#lab')).toBeVisible();await expect(page.locator('#guideHead')).toBeVisible();await page.locator('#guideSkip').click();await expect(page.locator('#training')).toBeVisible();await page.locator('#progressBtn').click();await expect(page.locator('#progress')).toBeVisible();await page.locator('#libraryBtn').click();await page.locator('[data-mode="steady"]').click();await expect(page.locator('#setup')).toBeVisible();expect(errors).toEqual([])});

test('old classic URL opens the maintained studio and retains saved settings',async({page})=>{
 await page.addInitScript(()=>{if(!sessionStorage.getItem('legacy-seeded')){localStorage.setItem('pulse-settings',JSON.stringify({bpm:137,mode:'steady'}));sessionStorage.setItem('legacy-seeded','1');}});
 await page.goto('./legacy.html');
 await expect(page).toHaveURL(/\/$/);
 await expect(page.locator('#training')).toBeVisible();
 await page.locator('#libraryBtn').click();
 await page.locator('[data-mode="steady"]').click();
 await expect(page.locator('#bpm')).toHaveValue('137');
});

async function confirmQuit(page) {
  if (await page.locator('[data-quit-dialog][open]').count()) await page.locator('[data-quit-confirm]').click();
}
async function playFromTitle(page) {
  await page.clock.runFor(300);
  await page.locator('[data-title-play]').click();
}
async function exitAndPlay(page) {
  await page.locator('[data-restart-run]').click();
  await confirmQuit(page);
  await playFromTitle(page);
}
module.exports = { confirmQuit, playFromTitle, exitAndPlay };

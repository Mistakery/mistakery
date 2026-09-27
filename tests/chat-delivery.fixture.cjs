// Resource/graph tests can use the player's reveal gesture; pacing is verified
// separately with a controlled clock in chat-delivery.browser.test.cjs.
async function revealMessages(page) {
  const pending = await page.evaluate(() => window.MistakeryApp.view === 'playing'
    && window.MistakeryApp.cardDelivery && !window.MistakeryApp.cardDelivery.delivered);
  if (pending) await page.locator('[data-chat-current]').first().click();
  await page.waitForFunction(() => !document.querySelector('[data-choice]:disabled'));
}
module.exports = { revealMessages };

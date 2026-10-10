// Resource/graph tests can use the player's reveal gesture; pacing is verified
// separately with a controlled clock in chat-delivery.browser.test.cjs.
async function revealMessages(page) {
  const pending = await page.evaluate(() => window.MistakeryApp.view === 'playing'
    && window.MistakeryApp.cardDelivery && !window.MistakeryApp.cardDelivery.delivered);
  if (pending) await page.locator('button.typing-bubble').press('Enter');
  await page.waitForFunction(() => !document.querySelector('[data-choice]:disabled'));
}
async function completeFounderSend(page, controlledClock = false) {
  if (!await page.locator('[data-sending-reply], [data-composing-reply]').count()) return;
  if (controlledClock) await page.clock.runFor(850);
  else await page.waitForFunction(() => !document.querySelector('[data-composing-reply], [data-sending-reply]'));
}
module.exports = { revealMessages, completeFounderSend };

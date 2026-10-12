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
async function continueWinFeedback(page) {
  if (await page.locator('[data-win-finale][open]').count()) {
    await page.locator('[data-win-finale-choice]').first().click();
  }
}
async function retainedMessages(page) {
  return page.evaluate(() => {
    const a = MistakeryApp, card = a.deck.cards.find(c => c.id === a.state.currentCardId);
    const nodes = Array.from(document.querySelectorAll('[data-chat-current]'));
    const extra = Object.values(card.bubbleBreaks || {}).reduce((total, parts) => total + parts.length, 0);
    const firstOriginal = nodes.length - extra - 2;
    return nodes.filter((node, index) => Number(node.dataset.messageOrigin ?? index) >= firstOriginal)
      .map(node => node.textContent);
  });
}
module.exports = { revealMessages, completeFounderSend, continueWinFeedback, retainedMessages };

(function () {
  // Presentation only: the save format and first-victory collection stay unchanged.
  window.MistakeryDeals = {
    create({ host, read }) {
      function snapshot() {
        const state = read();
        const wins = Object.keys(state.progress.wins);
        const saved = wins.filter(key => state.savedWins.has(key)).length;
        return { ...state, count: wins.length, pending: state.persistent ? wins.length - saved : 0 };
      }
      function update() {
        const { count, pending, persistent } = snapshot();
        host.querySelector('[data-deals-count]').textContent = `Deals ${count}/3`;
        host.querySelector('[data-deals-marks]').innerHTML = [1, 2, 3].map(n =>
          `<i class="deals-mark${n <= count ? ' is-filled' : ''}${n <= count && n > count - pending ? ' is-pending' : ''}"></i>`).join('');
        host.setAttribute('aria-label', `Deals: ${count} of 3 closed across attempts.${pending ? ` ${pending} not saved.` : ''}${persistent ? '' : ' Test mode: progress stays in this tab only.'}`);
      }
      function celebrate() {
        if (snapshot().pending || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const mark = [...host.querySelectorAll('.deals-mark.is-filled')].at(-1);
        mark?.animate([{ opacity: .35, transform: 'scale(.75)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
      }
      return { update, celebrate };
    },
  };
})();

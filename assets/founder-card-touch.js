(() => {
  // Each reward screen owns its listeners and animation; setView disposes it.
  function mount(card) {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const listeners = [];
    const origin = () => ({ x: .24, y: .18, rx: 0, ry: 0 });
    let frame = 0, current = origin(), target = origin(), sweep = null;
    let rect = null, gesture = null, disposed = false, suppressClick = false;
    function on(node, name, listener, options) {
      node.addEventListener(name, listener, options);
      listeners.push(() => node.removeEventListener(name, listener, options));
    }
    function paint() {
      card.style.setProperty('--light-x', `${current.x * 100}%`);
      card.style.setProperty('--light-y', `${current.y * 100}%`);
      card.style.setProperty('--light-angle', `${(current.x - .24) * 35}deg`);
      card.style.setProperty('--rx', `${current.rx}deg`);
      card.style.setProperty('--ry', `${current.ry}deg`);
      card.style.setProperty('--drift-x', `${(current.x - .24) * 72}px`);
      card.style.setProperty('--drift-y', `${(current.y - .18) * 52}px`);
    }
    function tick(time) {
      frame = 0;
      if (disposed || !card.isConnected || motion.matches || document.hidden) return;
      if (sweep !== null) {
        const t = Math.min((time - sweep) / 1300, 1);
        target = { x: .16 + .7 * Math.sin(t * Math.PI), y: .18 + .5 * Math.sin(t * Math.PI), rx: 0, ry: 0 };
        if (t === 1) { sweep = null; target = origin(); }
      }
      let difference = 0;
      for (const key of Object.keys(current)) {
        current[key] += (target[key] - current[key]) * .12;
        difference += Math.abs(target[key] - current[key]);
      }
      paint();
      if (sweep !== null || difference > .001) schedule();
    }
    function schedule() {
      if (!frame && !disposed && !motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
    }
    function reset() { sweep = null; rect = null; target = origin(); schedule(); }
    function stop() {
      cancelAnimationFrame(frame); frame = 0; sweep = null; rect = gesture = null;
      current = origin(); target = origin(); paint();
    }
    function point(event) {
      if (motion.matches || event.isPrimary === false) return;
      sweep = null;
      rect ??= card.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      target = { x, y, rx: (.5 - y) * 9, ry: (x - .5) * 9 }; schedule();
    }
    function replay() {
      if (motion.matches || disposed) return;
      sweep = performance.now(); schedule();
    }
    on(card, 'pointerenter', event => {
      rect = card.getBoundingClientRect();
      if (event.pointerType === 'mouse') point(event);
    });
    on(card, 'pointerdown', event => {
      if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
      suppressClick = false;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      rect = card.getBoundingClientRect(); point(event);
    }, { passive: true });
    on(card, 'pointermove', event => {
      if (gesture?.id === event.pointerId) gesture.moved ||= Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 10;
      point(event);
    }, { passive: true });
    on(card, 'pointerleave', () => { gesture = null; reset(); });
    on(card, 'pointercancel', () => { gesture = null; reset(); });
    on(card, 'pointerup', event => {
      suppressClick = gesture?.id !== event.pointerId || gesture.moved;
      gesture = null;
      if (event.pointerType !== 'mouse') reset();

    }, { passive: true });
    on(card, 'keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) replay(); }
    });
    on(card, 'click', event => { if (event.detail === 0 || !suppressClick) replay(); });
    on(window, 'blur', stop);
    on(document, 'visibilitychange', () => { if (document.hidden) stop(); });
    on(motion, 'change', stop);
    return () => { disposed = true; stop(); listeners.forEach(remove => remove()); };
  }
  window.MistakeryFounderCard = { mount };
})();

(() => {
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const springs = new Map();
  let frame = 0, lastTime = 0, gesture = null;
  const cardAt = event => event.target instanceof Element ? event.target.closest('.founder-card') : null;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function schedule() { if (!frame) { lastTime = 0; frame = requestAnimationFrame(step); } }
  function spring(card) {
    if (!springs.has(card)) springs.set(card, { x:0, y:0, vx:0, vy:0, tx:0, ty:0 });
    card.style.willChange = 'transform';
    return springs.get(card);
  }
  function clear(card) {
    card.classList.remove('is-touching');
    for (const name of ['--tilt-x','--tilt-y','--shine-x','--shine-y','will-change']) card.style.removeProperty(name);
    springs.delete(card);
  }
  function step(time) {
    frame = 0;
    const dt = Math.min(lastTime ? (time-lastTime)/1000 : 1/60, 1/30);
    lastTime = time;
    for (const [card,s] of springs) {
      if (!card.isConnected || !motion.matches) { clear(card); continue; }
      // Damped spring, mass 1.5; small substeps remain stable after a slow frame.
      const count = Math.ceil(dt/(1/120)), h = dt/count;
      for (let i=0;i<count;i++) {
        s.vx += (260*(s.tx-s.x)-30*s.vx)/1.5*h;
        s.vy += (260*(s.ty-s.y)-30*s.vy)/1.5*h;
        s.x += s.vx*h; s.y += s.vy*h;
      }
      card.style.setProperty('--tilt-x', s.x.toFixed(3)+'deg');
      card.style.setProperty('--tilt-y', s.y.toFixed(3)+'deg');
      const settled = Math.abs(s.tx-s.x)+Math.abs(s.ty-s.y)+Math.abs(s.vx)+Math.abs(s.vy)<.015;
      if (settled) {
        if (!card.classList.contains('is-touching')) clear(card);
        else card.style.removeProperty('will-change');
      }
    }
    if ([...springs.values()].some(s=>Math.abs(s.tx-s.x)+Math.abs(s.ty-s.y)+Math.abs(s.vx)+Math.abs(s.vy)>=.015)) frame=requestAnimationFrame(step);
  }
  function point(card, event, rect) {
    if (!motion.matches) return;
    const x=clamp((event.clientX-rect.left)/rect.width,0,1), y=clamp((event.clientY-rect.top)/rect.height,0,1);
    card.classList.remove('enter','is-shimmering');
    card.classList.add('is-touching');
    card.style.setProperty('--shine-x',(x*100)+'%');
    card.style.setProperty('--shine-y',(y*100)+'%');
    const s=spring(card); s.tx=(.5-y)*8; s.ty=(x-.5)*8;
    schedule();
  }
  function release(card) {
    card.classList.remove('is-touching');
    const s=springs.get(card);
    if (s) { s.tx=0; s.ty=0; schedule(); }
  }
  function shimmer(card) {
    if (!motion.matches) return;
    card.classList.remove('enter','is-shimmering');
    void card.offsetWidth;
    card.classList.add('is-shimmering');
  }
  function reset() {
    gesture=null;
    for (const card of springs.keys()) clear(card);
    document.querySelectorAll('.founder-card.is-shimmering').forEach(card=>card.classList.remove('is-shimmering'));
    if(frame) cancelAnimationFrame(frame);
    frame=0;
  }
  document.addEventListener('pointerdown',event=>{
    if(event.isPrimary===false){reset();return;}
    const card=cardAt(event);
    if(!card || (event.pointerType==='mouse' && event.button!==0))return;
    gesture={card,id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,rect:card.getBoundingClientRect()};
    point(card,event,gesture.rect);
  },{passive:true});
  document.addEventListener('pointermove',event=>{
    if(gesture && gesture.id===event.pointerId){
      gesture.moved ||= Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10;
      point(gesture.card,event,gesture.rect);
    }else if(event.pointerType==='mouse' && event.buttons===0){
      const card=cardAt(event);if(card)point(card,event,card.getBoundingClientRect());
    }
  },{passive:true});
  document.addEventListener('pointerup',event=>{
    if(!gesture || gesture.id!==event.pointerId)return;
    const {card,moved}=gesture;gesture=null;release(card);
    if(!moved)shimmer(card);
  },{passive:true});
  document.addEventListener('pointercancel',event=>{
    if(gesture?.id===event.pointerId){release(gesture.card);gesture=null;}
  },{passive:true});
  document.addEventListener('pointerout',event=>{
    if(event.pointerType!=='mouse')return;
    const card=cardAt(event);
    if(card && !card.contains(event.relatedTarget))release(card);
  },{passive:true});
  document.addEventListener('keydown',event=>{
    const card=cardAt(event);
    if(card && (event.key==='Enter'||event.key===' ')){event.preventDefault();if(!event.repeat)shimmer(card);}
  });
  // Supports assistive-technology activation without a pointer sequence.
  document.addEventListener('click',event=>{const card=cardAt(event);if(card&&event.detail===0)shimmer(card);});
  document.addEventListener('animationend',event=>{
    if(event.animationName==='touch-shimmer')event.target.classList.remove('is-shimmering');
  });
  motion.addEventListener('change',reset);
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
})();

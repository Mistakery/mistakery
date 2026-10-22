const { confirmQuit } = require('./exit-flow.fixture.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { revealMessages } = require('./chat-delivery.fixture.cjs');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
const expected = [
  ['LIVE_AGENT_OUTCOME_1', 4, "You didn't just succeed — you made history! ✨", ['Put me on Forbes!', 'Can I sleep now?'], ['Меня на обложку Forbes!', 'Теперь можно поспать?']],
  ['LIVE_AGENT_OUTCOME_3', 3, "That's not just progress — it's a revolution! 🚀", ['Disrupt everything!', 'IPO time!'], ['Взорвать всё!', 'Пора на IPO!']],
  ['INFLUENCER_OUTCOME_2', 8, "It's not just a win — it's your vision coming to life! 🚀", ['Just the beginning!', 'Sell to Big Tech!'], ['Это только начало!', 'Продать Бигтеху!']],
  ['INFLUENCER_OUTCOME_4', 5, "It's not just growth — it's transformation! 🚀", ['Next market!', 'Pay my bonus'], ['Следующий рынок!', 'Выплатите мне бонус']],
  ['INFLUENCER_OUTCOME_6', 7, "That's not just a result — it's proof of your greatness! ✨", ['Never doubted myself', "Don't jinx it"], ['Ни секунды не сомневался', 'Только не сглазь']],
  ['PADEL_OUTCOME_2', 6, "You didn't just win — you changed the game! 🚀", ['I am the game', 'Show me the money'], ['Я и есть игра', 'Покажите мне деньги']],
  ['PADEL_OUTCOME_4', 1, "That's not just a win — it's a breakthrough! 🚀", ['Told you so!', 'Cash out now!'], ['Я же говорил!', 'Фиксируем кэш!']],
  ['PADEL_OUTCOME_5', 2, "It's not luck — it's pure genius! ✨", ['Always was', 'Total accident'], ['Всегда им был', 'Чистая случайность']],
];
async function open(browser, motion = 'reduce') {
  const page = await browser.newPage({ viewport: { width: 320, height: 650 }, reducedMotion: motion });
  await page.goto(url + '?test=route');
  await page.waitForFunction(() => MistakeryApp?.state);
  await page.evaluate(() => {
    window.cues = []; const play = MistakerySound.play;
    MistakerySound.play = function(kind) { cues.push(kind); return play.call(this, kind); };
    window.clips = []; const Audio = window.AudioContext || window.webkitAudioContext;
    const create = Audio.prototype.createBufferSource;
    Audio.prototype.createBufferSource = function(...args) {
      const source = create.apply(this, args), start = source.start;
      source.start = function(...args) {
        const data = source.buffer.getChannelData(0);
        const kind = Object.entries(MISTAKERY_SOUND_SAMPLES).find(([, sample]) => {
          const pcm = atob(sample.pcm);
          if (pcm.length !== data.length * 2 || sample.sampleRate !== source.buffer.sampleRate) return false;
          for (let i = 0; i < data.length; i++) {
            const value = pcm.charCodeAt(i*2) | pcm.charCodeAt(i*2+1) << 8;
            if (data[i] !== (value >= 32768 ? value-65536 : value)/32768) return false;
          }
          return true;
        })?.[0];
        clips.push(kind); return start.apply(this,args);
      }; return source;
    };
  });
  await page.clock.install(); await page.clock.pauseAt(new Date());
  return page;
}
async function seed(page, id, cash = 50) {
  await page.evaluate(({id,cash}) => {
    const a = MistakeryApp; MistakerySound.stop();
    a.state = MistakeryRoute.startRun(a.deck, { seed: 'win-feedback' });
    a.state.currentCardId = id;
    a.state.resources = {cash, team:50, customers:50, founder:50};
    a.state.schedulerResources = {...a.state.resources};
    a.state.route.resourceLedger = {...a.state.resources};
    a.runStartState = structuredClone(a.state);
    a.cardDelivery = null; a.locked = false; a.view = 'playing'; a.render();
  }, {id,cash});
  await page.clock.runFor(20000);
  await page.evaluate(() => { MistakerySound.stop(); cues.length = 0; clips.length = 0; });
}
const state = page => page.evaluate(() => structuredClone(MistakeryApp.state));
for (const [name,type] of [['Chromium',chromium],['WebKit',webkit]]) {
  test(`${name}: all eight wins, both outcome replies and both free AI replies hold delivery on 320px`, async () => {
    const browser = await type.launch();
    try {
      const page = await open(browser); const errors=[]; page.on('pageerror', e=>errors.push(e.message));
      const wins = await page.evaluate(() => MistakeryApp.deck.cards.filter(c=>c.outcomeTone==='success').map(c=>c.id));
      assert.deepEqual(wins.sort(), expected.map(c=>c[0]).sort());
      for (const [id,variant,message,buttons,ru] of expected) for (const side of ['left','right']) for (const reply of [0,1]) {
        await seed(page,id);
        const before = await state(page);
        const resolved = await page.evaluate(side => MistakeryRoute.resolveChoice(MistakeryApp.deck,MistakeryApp.state,side).state,side);
        await page.evaluate(()=>{window.oldOutcomeButtons=[...document.querySelectorAll('[data-choice]')];});
        await page.locator(`[data-choice=${side}]`).click();
        await page.evaluate(()=>oldOutcomeButtons.forEach(button=>button.click()));
        assert.equal(await page.locator('[data-win-finale][open]').count(),1,`${id}/${side}/${reply}`);
        assert.deepEqual(await state(page),resolved,'ordinary route accounting and RNG run exactly once');
        assert.equal(resolved.resources.cash,before.resources.cash-.5);
        const dialog=page.locator('[data-win-finale]');
        assert.equal(await dialog.locator('.message').textContent(),message);
        assert.equal(await dialog.locator('.loss-finale__lead').evaluate(n=>getComputedStyle(n).color),'rgb(23, 33, 43)','owner requested ordinary dark text');
        assert.deepEqual(await dialog.locator('[data-win-finale-choice]').allTextContents(),buttons);
        assert.deepEqual(await page.evaluate(id=>MistakeryApp.deck.cards.find(c=>c.id===id).winFeedback.choices.map(c=>c.ru),id),ru);
        assert.equal(await page.evaluate(id=>MistakeryApp.deck.cards.find(c=>c.id===id).winFeedback.variant,id),variant);
        assert.equal(await dialog.locator('.contact__text').textContent(),'@b2buddyAI Agent');
        assert.equal(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth && n.getBoundingClientRect().left>=0 && n.getBoundingClientRect().right<=320),true);
        for(const button of await dialog.locator('button').all()) assert.equal(await button.evaluate(n=>n.scrollWidth<=n.clientWidth),true);
        const held=await page.locator('[data-chat]').innerHTML(); const scroll=await page.locator('[data-chat]').evaluate(n=>n.scrollTop);
        assert.equal(await page.locator('.typing-bubble').count(),0);
        await page.evaluate(()=>MistakeryApp.render()); await page.clock.runFor(20000);
        assert.equal(await page.locator('[data-chat]').innerHTML(),held);
        assert.equal(await page.locator('[data-chat]').evaluate(n=>n.scrollTop),scroll);
        assert.equal(await page.evaluate(()=>cues.filter(c=>c==='ai-finale').length),1);
        assert.equal(await page.evaluate(()=>clips.filter(c=>c==='ai-finale').length),1,'approved PCM actually plays once');
        assert.equal(await page.evaluate(()=>cues.includes('incoming')),false);
        await page.evaluate(reply=>{ window.staleWinButtons=[...document.querySelectorAll('[data-win-finale-choice]')]; staleWinButtons[reply].click(); staleWinButtons[1-reply].click(); },reply);
        assert.equal(await page.locator('[data-win-finale]').count(),0);
        assert.equal(await page.locator('[data-resource][data-impact]').count(),0,'free continuation must not repeat the settled cost pulse');
        assert.deepEqual(await state(page),resolved,'both buttons and double click are free and consume no RNG');
        assert.equal(await page.locator('[data-scene]').getAttribute('data-active-card'),resolved.currentCardId);
        await page.clock.runFor(20000);
        assert.equal(await page.evaluate(()=>MistakeryApp.cardDelivery.delivered),true);
        const delivered=await page.evaluate(()=>cues.slice());
        await page.evaluate(()=>MistakeryApp.render()); await page.clock.runFor(20000);
        assert.deepEqual(await page.evaluate(()=>cues),delivered,'normal delivery resumes once');
      }
      assert.deepEqual(errors,[]);
    } finally {await browser.close();}
  });
  test(`${name}: Back, Escape, rerender, restart, navigation and hidden never leave stale continuations`,async()=>{
    const browser=await type.launch();
    try {
      const page=await open(browser,'no-preference');
      await seed(page,'PADEL_OUTCOME_2'); const before=await state(page);
      await page.locator('[data-choice=left]').click(); const resolved=await state(page);
      await page.evaluate(()=>{window.oldWinButton=document.querySelector('[data-win-finale-choice]');document.querySelector('[data-test-back]').click();});
      assert.deepEqual(await state(page),before); assert.equal(await page.locator('[data-win-finale]').count(),0);
      await page.evaluate(()=>oldWinButton.click()); assert.deepEqual(await state(page),before);
      await page.locator('[data-choice=left]').click();
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      await page.clock.runFor(20000); assert.equal(await page.locator('[data-win-finale][open]').count(),1);
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
      await page.emulateMedia({reducedMotion:'reduce'}); await page.evaluate(()=>MistakeryApp.render());
      await page.keyboard.press('Escape'); await page.clock.runFor(20000); assert.deepEqual(await state(page),resolved);
      await page.locator('[data-choice=left]').click(); await page.clock.runFor(20000);
      await page.locator('[data-test-back]').click(); assert.deepEqual(await state(page),resolved);
      assert.equal(await page.locator('[data-win-finale]').count(),0,'Back after a later move cannot replay answered feedback');
      for(const restart of ['[data-test-restart]','[data-restart-run]']) {
        await seed(page,'LIVE_AGENT_OUTCOME_1'); await page.locator('[data-choice=right]').click();
        await page.evaluate(selector=>{window.oldWinButton=document.querySelector('[data-win-finale-choice]');document.querySelector(selector).click();},restart);
        if (restart === '[data-restart-run]') await confirmQuit(page);
        const reset=await state(page); await page.evaluate(()=>oldWinButton.click()); await page.clock.runFor(20000);
        assert.deepEqual(await state(page),reset); assert.equal(await page.locator('[data-win-finale]').count(),0);
      }
      await seed(page,'LIVE_AGENT_OUTCOME_3'); await page.locator('[data-choice=left]').click();
      const interrupted = await state(page);
      const finaleCues = await page.evaluate(()=>cues.filter(c=>c==='ai-finale').length);
      await page.evaluate(()=>document.querySelector('[data-restart-run]').click()); await confirmQuit(page);
      await page.locator('[data-test-back]').click();
      assert.deepEqual(await state(page),interrupted);
      assert.equal(await page.locator('[data-scene]').getAttribute('data-active-card'),'LIVE_AGENT_OUTCOME_3','restored pending popup restores the original outcome background');
      assert.equal(await page.locator('[data-resource=cash]').getAttribute('data-fill'),'49.5');
      assert.equal(await page.locator('[data-win-finale][open]').count(),1);
      assert.equal(await page.evaluate(()=>cues.filter(c=>c==='ai-finale').length),finaleCues);
      assert.equal(await page.locator('.typing-bubble').count(),0);
      await page.keyboard.press('Escape'); await page.clock.runFor(20000);
      assert.deepEqual(await state(page),interrupted);
      await seed(page,'LIVE_AGENT_OUTCOME_3'); await page.locator('[data-choice=left]').click();
      await page.evaluate(()=>{window.oldWinButton=document.querySelector('[data-win-finale-choice]');});
      await seed(page,'INFLUENCER_OUTCOME_1');const navigated=await state(page);
      await page.evaluate(()=>oldWinButton.click()); assert.deepEqual(await state(page),navigated);
      assert.equal(await page.locator('[data-win-finale]').count(),0);
    } finally {await browser.close();}
  });
  test(`${name}: victory confetti preserves all eight wins and cleans up after 1200ms`, async()=>{
    const browser=await type.launch();
    try {
      const page=await open(browser,'no-preference');
      for(const [id] of expected){
        await seed(page,id);
        const resolved=await page.evaluate(()=>MistakeryRoute.resolveChoice(MistakeryApp.deck,MistakeryApp.state,'left').state);
        await page.locator('[data-choice=left]').click();
        const particles=page.locator('.win-confetti i');
        assert.equal(await particles.count(),30,id);
        assert.deepEqual(await state(page),resolved,'confetti consumes no resources or RNG');
        assert.equal(await page.locator('.win-confetti').getAttribute('aria-hidden'),'true');
        assert.equal(await page.locator('.win-confetti').evaluate(n=>getComputedStyle(n).pointerEvents),'none');
        assert.equal(await page.locator('[data-win-finale] .loss-finale__body').evaluate(n=>getComputedStyle(n).outlineStyle),'none');
        assert.match(await page.locator('[data-win-finale]').evaluate(n=>getComputedStyle(n).backgroundImage),/210, 228, 240/);
        assert.equal(await particles.evaluateAll(ns=>Math.max(...ns.map(n=>{const t=n.getAnimations()[0].effect.getTiming();return t.duration+t.delay}))),1200);
        await page.evaluate(()=>MistakeryApp.render());
        assert.equal(await particles.count(),30,'rerender retains a single burst');
        await page.clock.runFor(1200);
        assert.equal(await particles.count(),0,'bounded lifetime removes particles');
        await page.evaluate(()=>MistakeryApp.render());
        assert.equal(await particles.count(),0,'settled rerender cannot restart');
        await page.locator('[data-win-finale-choice]').first().click();
        assert.deepEqual(await state(page),resolved,'free continuation unchanged');
      }
    } finally {await browser.close();}
  });
  test(`${name}: victory confetti respects Back, fresh attempts, hidden, reduce and fast dismissal`,async()=>{
    const browser=await type.launch();
    try {
      const page=await open(browser,'no-preference');
      const particles=()=>page.locator('.win-confetti i').count();
      await seed(page,'LIVE_AGENT_OUTCOME_1');
      await page.locator('[data-choice=left]').click();assert.equal(await particles(),30);
      await page.evaluate(()=>document.querySelector('[data-test-back]').click());assert.equal(await particles(),0);
      await page.locator('[data-choice=right]').click();assert.equal(await particles(),0,'re-answer after Back must not celebrate the same win');
      await page.evaluate(()=>document.querySelector('[data-restart-run]').click()); await confirmQuit(page);
      await page.locator('[data-test-back]').click();assert.equal(await particles(),0,'restored pending popup stays quiet');
      await page.keyboard.press('Escape');assert.equal(await particles(),0);
      await seed(page,'LIVE_AGENT_OUTCOME_1');
      await page.evaluate(()=>{MistakeryApp.state.seed='fresh-attempt';});
      await page.locator('[data-choice=left]').click();assert.equal(await particles(),30,'a fresh attempt can celebrate');
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      assert.equal(await particles(),0);
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));MistakeryApp.render();});assert.equal(await particles(),0);
      await seed(page,'LIVE_AGENT_OUTCOME_3');await page.locator('[data-choice=left]').click();assert.equal(await particles(),30);
      await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.win-confetti').waitFor({state:'detached',timeout:2000});assert.equal(await particles(),0);
      await seed(page,'INFLUENCER_OUTCOME_2');await page.locator('[data-choice=left]').click();assert.equal(await particles(),0);
      await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>MistakeryApp.render());assert.equal(await particles(),0);
      await seed(page,'PADEL_OUTCOME_2');await page.locator('[data-choice=left]').click();assert.equal(await particles(),30);
      await page.locator('[data-win-finale-choice]').last().click();assert.equal(await particles(),0,'quick reply cancels immediately');
      await seed(page,'PADEL_OUTCOME_4');await page.locator('[data-choice=left]').click();assert.equal(await particles(),30);
      await page.evaluate(()=>document.querySelector('[data-restart-run]').click()); await confirmQuit(page);assert.equal(await particles(),0);
      await seed(page,'PADEL_OUTCOME_5',.5);await page.locator('[data-choice=left]').click();assert.equal(await particles(),0,'resource loss excludes confetti');
    } finally {await browser.close();}
  });
  test(`${name}: failure, catastrophic and settled resource loss exclude victory feedback`,async()=>{
    const browser=await type.launch();
    try {
      const page=await open(browser);
      const failures=await page.evaluate(()=>MistakeryApp.deck.cards.filter(c=>c.outcomeTone && c.outcomeTone!=='success').map(c=>c.id));
      for(const id of failures){await seed(page,id);await page.locator('[data-choice=left]').click();assert.equal(await page.locator('[data-win-finale]').count(),0,id);}
      for (const [key,value,ending] of [['cash',0,'cash_low'],['team',0,'team_low'],['team',100,'team_high'],['customers',0,'customers_low'],['founder',0,'founder_low'],['founder',100,'founder_high']]) {
        await seed(page,'LIVE_AGENT_OUTCOME_1');
        await page.evaluate(({key,value})=>{MistakeryApp.state.resources[key]=value;MistakeryApp.state.route.resourceLedger[key]=value;}, {key,value});
        await page.locator('[data-choice=left]').click();
        assert.equal(await page.locator('[data-win-finale]').count(),0);
        assert.equal(await page.evaluate(()=>MistakeryApp.state.endingId),ending);
      }
      for(const [id] of expected){await seed(page,id,.5);await page.locator('[data-choice=right]').click();assert.equal(await page.locator('[data-win-finale]').count(),0,id);assert.equal(await page.evaluate(()=>MistakeryApp.state.endingId),'cash_low');assert.equal(await page.evaluate(()=>MistakeryApp.view),'ended');}
    } finally {await browser.close();}
  });
}

const { decisions: influencerEffects, contextual: influencerContext, outcomes: influencerOutcomes } = require('./influencer-resources.fixture.cjs');
const { decisions: padelEffects, outcomes: padelOutcomes } = require('./padel-resources.fixture.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const app = read('app.js');
const html = read('index.html');
const css = read('style.css');
const canonicalDeck = require('../cards.json');
const bundledDeck = require('../cards.bundle.js');
const failedChallengeImage = {
  src: 'assets/ai-influencer-challenge-failed.webp',
  alt: "I gave up: why even I couldn't save these losers — challenge finale",
  width: 1200,
  height: 567,
};

function sha256(name) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
}

function activeCardIds() {
  const match = app.match(/const ACTIVE_CARD_IDS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(match, 'missing ACTIVE_CARD_IDS runtime gate');
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]);
}

test('runtime exposes only the approved opening, live agent, influencer, and Padel sequences', () => {
  assert.deepEqual(activeCardIds(), [
    'OPEN_01',
    'OPEN_02a',
    'OPEN_02b',
    'OPEN_BOSS',
    'OPEN_DEV',
    'OPEN_INVESTOR',
    'LIVE_AGENT_01',
    'LIVE_AGENT_02',
    'LIVE_AGENT_03',
    'LIVE_AGENT_04',
    'LIVE_AGENT_04B',
    'LIVE_AGENT_05',
    'LIVE_AGENT_06',
    'LIVE_AGENT_07',
    'LIVE_AGENT_07B',
    'LIVE_AGENT_08',
    'LIVE_AGENT_OUTCOME_0',
    'LIVE_AGENT_OUTCOME_1',
    'LIVE_AGENT_OUTCOME_2',
    'LIVE_AGENT_OUTCOME_3',
    'LIVE_AGENT_OUTCOME_4',
    'INFLUENCER_01',
    'INFLUENCER_02',
    'INFLUENCER_02A',
    'INFLUENCER_03',
    'INFLUENCER_04',
    'INFLUENCER_05',
    'INFLUENCER_06',
    'INFLUENCER_07',
    'INFLUENCER_08',
    'INFLUENCER_OUTCOME_1',
    'INFLUENCER_OUTCOME_2',
    'INFLUENCER_OUTCOME_3',
    'INFLUENCER_OUTCOME_4',
    'INFLUENCER_OUTCOME_5',
    'INFLUENCER_OUTCOME_6',
    'INFLUENCER_OUTCOME_7',
    'PADEL_INVITE',
    'DREAM_TEAM',
    'IRL_PADEL_01',
    'IRL_PADEL_03B',
    'IRL_PADEL_04',
    'IRL_PADEL_05',
    'IRL_PADEL_06',
    'PADEL_OUTCOME_0',
    'PADEL_OUTCOME_1',
    'PADEL_OUTCOME_2',
    'PADEL_OUTCOME_3',
    'PADEL_OUTCOME_4',
    'PADEL_OUTCOME_5',
    'PADEL_OUTCOME_6',
    'PADEL_OUTCOME_7',
  ]);
  assert.match(app, /ACTIVE_CARD_IDS\.includes\(card\.id\)/);
  assert.match(app, /card\.id\s*===\s*['"]OPEN_INVESTOR['"][\s\S]*continueFromInvestor/);
  assert.match(app, /function\s+continueFromInfluencer[\s\S]*resolveInfluencerChoice/);
  assert.match(app, /function\s+selectInfluencerOutcome[\s\S]*rng\(\)\s*<\s*0\.4/);
  assert.match(app, /function\s+finishInfluencerOutcome[\s\S]*influencerPreviousCardId\s*=\s*null[\s\S]*startSaved\(1\)/);
  assert.match(app, /card\.id\s*===\s*['"]DREAM_TEAM['"][\s\S]*continueFromDreamTeam/);
  assert.match(app, /card\.id\s*===\s*['"]IRL_PADEL_06['"][\s\S]*continueFromPadelMatchPoint/);
  assert.match(app, /function\s+finishPadelOutcome[\s\S]*padelCeoScore\s*=\s*null[\s\S]*startSaved\(1\)/);
  assert.doesNotMatch(`${app}\n${html}`, /NEXT CONTENT DISABLED|BOTH ORIGINAL ARCS STOP HERE/);
});

test('copy edits keep the offline bundle canonical and the engine byte-for-byte unchanged', () => {
  assert.deepEqual(bundledDeck, canonicalDeck);
  assert.equal(sha256('game.js'), '4587f9034eb5e83e639c2a96e2bf21d4531511bc6c48234d5a025d94c245e466');
});

test('three active cards preserve the approved message boundaries and revised investor copy', () => {
  const cards = Object.fromEntries(canonicalDeck.cards.map((card) => [card.id, card]));
  assert.equal(cards.OPEN_02a.text, "Competitor analysis complete 📊\nWe have a slight KPI deviation (0 clients).\nI reframed this as a 'pre-revenue learning phase' 📈\n\nWant me to send a motivational quote to the team? 🚀🤖");
  assert.equal(cards.OPEN_DEV.text, 'payroll is friday\n\nare we getting money or another speech about changing b2b saas forever?');
  assert.equal(cards.OPEN_INVESTOR.text, 'I DIDN’T DUMP MY CASH INTO THIS AI CRAP TO GET ZERO CLIENTS.\n\nWHERE THE HELL ARE THE BUYERS???\n\nIF I WANTED TO WASTE MONEY I’D BUY A YACHT FOR MY EX-WIFE.');
});

test('AI influencer cards preserve approved copy and graph with document resource effects', () => {
  const withoutReasons = choices => Object.fromEntries(Object.entries(choices).map(([side, { effect_reason, ...choice }]) => [side, choice]));
  const cards = Object.fromEntries(canonicalDeck.cards.map((card) => [card.id, card]));
  const ids = [
    'INFLUENCER_01',
    'INFLUENCER_02',
    'INFLUENCER_02A',
    'INFLUENCER_03',
    'INFLUENCER_04',
    'INFLUENCER_05',
    'INFLUENCER_06',
    'INFLUENCER_07',
    'INFLUENCER_08',
    'INFLUENCER_OUTCOME_1',
    'INFLUENCER_OUTCOME_2',
    'INFLUENCER_OUTCOME_3',
    'INFLUENCER_OUTCOME_4',
    'INFLUENCER_OUTCOME_5',
    'INFLUENCER_OUTCOME_6',
    'INFLUENCER_OUTCOME_7',
  ];

  assert.equal(cards.OPEN_INVESTOR.choices.left.next, 'INFLUENCER_01');
  assert.equal(cards.OPEN_INVESTOR.choices.right.next, 'PADEL_01');
  assert.deepEqual(ids.filter((id) => cards[id]), ids);
  assert.deepEqual(ids.filter((id) => !cards[id]), []);
  assert.equal(canonicalDeck.sources['@ai_evangelist'].name, '@ai_evangelist');
  assert.equal(canonicalDeck.sources['@error_404'].name, '@error_404');

  assert.deepEqual(cards.INFLUENCER_01.messages, [
    {
      direction: 'incoming',
      source: '@hustler',
      avatar: 'H',
      text: 'Guys, huge play!!\nMy boy from that AI bootcamp is a top AI influencer now. Down to promote us for a symbolic % on each sale',
    },
    {
      direction: 'incoming',
      source: '@bigdeals',
      avatar: 'BD',
      text: 'Yeah right, heard that one before.',
    },
    {
      direction: 'incoming',
      source: '@bigdeals',
      avatar: 'BD',
      text: "20% max, anything higher and, we'll lose our shirts.",
    },
    {
      direction: 'incoming',
      source: '@hype_queen',
      avatar: 'HQ',
      text: "major red flag vibes tbh. but if he has meme potential, let's run it. we can farm clips off him",
    },
  ]);
  assert.deepEqual(withoutReasons(cards.INFLUENCER_01.choices), {
    left: { label: "Let's go", effects: influencerEffects.INFLUENCER_01[0], next: 'INFLUENCER_02' },
    right: { label: 'Nah, cringe', effects: influencerEffects.INFLUENCER_01[1], next: 'INFLUENCER_OUTCOME_1' },
  });

  assert.equal(cards.INFLUENCER_02.text, "Hey 👋\nHeard about your tool. I feel like we got a huge future together.\n\nLet me drop a video with your link in the description. You get customers, I get a cut of the sales. Win-win!\nUsually I take 20%, but you guys are cool, we'll work out the terms.\n\nSend over the demo. I keep it 💯 honest with my audience, gotta test it myself first.");
  assert.deepEqual(withoutReasons(cards.INFLUENCER_02.choices), {
    left: { label: 'Deal', effects: influencerEffects.INFLUENCER_02[0], next: 'INFLUENCER_03' },
    right: { label: 'Maybe 10%', effects: influencerEffects.INFLUENCER_02[1], next: 'INFLUENCER_02A' },
  });

  assert.equal(cards.INFLUENCER_02A.text, "Hahaha\nI like your style 😂\nLet's lock in 20% for now, but I'll hook you up.\nI'll give you access to my private database of 50 killer B2B prompts. People pay $1k for this 😉");
  assert.deepEqual(withoutReasons(cards.INFLUENCER_02A.choices), {
    left: { label: 'Deal. Just deliver', effects: influencerEffects.INFLUENCER_02A[0], next: 'INFLUENCER_03' },
    right: { label: 'We need you in sales', effects: influencerEffects.INFLUENCER_02A[1], next: 'INFLUENCER_03' },
  });

  assert.equal(cards.INFLUENCER_03.text, 'wtf??\nlooks like your blogger is trying to crash us\n\nthousands of requests right now:\n<strong>make me $1B right now. make zero mistakes</strong>\n\nis he dumb or just playing dumb? 😂');
  assert.equal(cards.INFLUENCER_04.text, "Aaand it's down. Knew it 👏👏\n\nGuys, if you can't even handle my basic workflow, my traffic will literally destroy you.\nDon't wanna bury your launch, but I never lie to my community.\n\nGotta drop an honest video 😔");
  assert.deepEqual(withoutReasons(cards.INFLUENCER_04.choices), {
    left: { label: 'Have fun', effects: influencerEffects.INFLUENCER_04[0], next: 'INFLUENCER_06' },
    right: { label: 'Any other options?', effects: influencerEffects.INFLUENCER_04[1], next: 'INFLUENCER_05' },
  });

  assert.equal(cards.INFLUENCER_05.text, "Well, there is an option 🤔\n\nI don't usually do this, but I see potential in you guys. I can just focus on the core features and smooth things over\n\nSince I'm risking my reputation for an unstable product though:\n60% revshare + Co-Founder status to oversee product quality 🤝");
  assert.deepEqual(withoutReasons(cards.INFLUENCER_05.choices), {
    left: { label: 'Just save the launch', effects: influencerEffects.INFLUENCER_05[0], next: 'INFLUENCER_07' },
    right: { label: "That's insane", effects: influencerEffects.INFLUENCER_05[1], next: 'INFLUENCER_06' },
  });
  assert.deepEqual(withoutReasons(cards.INFLUENCER_05.contextualChoices.INFLUENCER_06), {
    left: { label: "My bad, let's do it", effects: influencerContext.INFLUENCER_05.INFLUENCER_06[0], next: 'INFLUENCER_07' },
    right: { label: 'Shove it', effects: influencerContext.INFLUENCER_05.INFLUENCER_06[1], next: 'INFLUENCER_08' },
  });

  assert.equal(cards.INFLUENCER_06.text, 'Cool. Dropping it tonight 🤷‍♂️');
  assert.deepEqual(cards.INFLUENCER_06.image, {
    src: 'assets/ai-influencer-scheduled-review.webp',
    alt: 'Creator Studio: B2BuyerSpyer hate review scheduled for publication today at 6:00 PM',
    width: 1200,
    height: 676,
  });
  assert.equal(Object.hasOwn(cards.INFLUENCER_06, 'placeholder'), false);
  assert.deepEqual(withoutReasons(cards.INFLUENCER_06.choices), {
    left: { label: 'Alternatives?', effects: influencerEffects.INFLUENCER_06[0], next: 'INFLUENCER_05' },
    right: { label: 'Cool. Forget the deal', effects: influencerEffects.INFLUENCER_06[1], next: 'INFLUENCER_08' },
  });
  assert.deepEqual(withoutReasons(cards.INFLUENCER_06.contextualChoices.INFLUENCER_05), {
    left: { label: 'Actually, 60% is ok', effects: influencerContext.INFLUENCER_06.INFLUENCER_05[0], next: 'INFLUENCER_07' },
    right: { label: 'Try me, buddy', effects: influencerContext.INFLUENCER_06.INFLUENCER_05[1], next: 'INFLUENCER_08' },
  });

  assert.equal(Object.hasOwn(cards.INFLUENCER_07, 'placeholder'), false);
  assert.deepEqual(cards.INFLUENCER_07.image, {
    src: 'assets/ai-influencer-unicorn-challenge.webp',
    alt: 'Published video: CHALLENGE: Turning a Broke AI Startup Into a Unicorn in 30 Days',
    width: 1200,
    height: 676,
  });
  assert.equal(cards.INFLUENCER_07.text, 'Video’s live. Don’t screw this up, team!!!\n\nOr do. That’s just more views lol 😂');
  assert.deepEqual(Object.values(cards.INFLUENCER_07.choices).map((choice) => choice.label), ['DELETE THIS!!!', 'Anything for views']);
  assert.deepEqual(cards.INFLUENCER_08.messages[0].image, {
    src: 'assets/ai-influencer-traffic-review.webp',
    alt: 'Published B2BuyerSpyer review with 124K views and comments asking where to try the tool',
    width: 1200,
    height: 676,
  });
  assert.equal(Object.hasOwn(cards.INFLUENCER_08.messages[0], 'placeholder'), false);
  assert.deepEqual(Object.values(cards.INFLUENCER_08.choices).map((choice) => choice.label), ['Spam promos in comments!', 'Double prices NOW!!']);

  assert.equal(Object.hasOwn(cards.INFLUENCER_OUTCOME_2.messages[0], 'placeholder'), false);
  assert.deepEqual(cards.INFLUENCER_OUTCOME_2.messages[0].image, {
    src: 'assets/ai-influencer-episode-two.webp',
    alt: 'Episode 2: I made $30,000 while the founder does all the work',
    width: 1200,
    height: 676,
  });
  assert.deepEqual(cards.INFLUENCER_OUTCOME_3.messages[0].image, failedChallengeImage);
  assert.equal(Object.hasOwn(cards.INFLUENCER_OUTCOME_3.messages[0], 'placeholder'), false);
  assert.deepEqual(cards.INFLUENCER_OUTCOME_4.messages.map(message => message.text), [
    "See the numbers? I dropped that hate video on purpose to get you attention. In marketing it's called rage-bait",
    "Let's set up my 20% 💸",
  ]);
  assert.equal(cards.INFLUENCER_OUTCOME_4.messages[0].imageRef, 'influencer_viral_analytics');
  assert.deepEqual(canonicalDeck.images.influencer_viral_analytics, {
    src: 'assets/ai-influencer-viral-analytics.webp',
    alt: 'Video analytics showing 2.6 million views and growing traffic from the B2BuyerSpyer review',
    width: 1000,
    height: 1000,
  });
  assert.equal(cards.INFLUENCER_OUTCOME_6.text, cards.INFLUENCER_OUTCOME_4.messages.map(message => message.text).join('\n\n'));

  for (const id of ids) {
    const expected = influencerEffects[id] || [{}, {}];
    ['left', 'right'].forEach((side, index) => assert.deepEqual(cards[id].choices[side].effects, expected[index], `${id}.${side}`));
    if (id.startsWith('INFLUENCER_OUTCOME_')) assert.deepEqual(cards[id].outcomeEffects, influencerOutcomes[id.split('_').at(-1)]);
  }
});

test('Padel Invite, Dream Team, five IRL cards, and eight outcomes are the canonical scoped Padel graph', () => {
  const padelIndex = canonicalDeck.cards.findIndex((card) => card.id === 'PADEL_INVITE');
  assert.deepEqual(
    canonicalDeck.cards.slice(padelIndex, padelIndex + 16).map((card) => card.id),
    [
      'PADEL_INVITE',
      'DREAM_TEAM',
      'IRL_PADEL_01',
      'IRL_PADEL_03B',
      'IRL_PADEL_04',
      'IRL_PADEL_05',
      'IRL_PADEL_06',
      'PADEL_OUTCOME_0',
      'PADEL_OUTCOME_1',
      'PADEL_OUTCOME_2',
      'PADEL_OUTCOME_3',
      'PADEL_OUTCOME_4',
      'PADEL_OUTCOME_5',
      'PADEL_OUTCOME_6',
      'PADEL_OUTCOME_7',
      'AGENT_01',
    ],
  );

  const choicesWithoutReasons = card => Object.fromEntries(Object.entries(card.choices).map(([side, { effect_reason, ...choice }]) => [side, choice]));
  const cards = Object.fromEntries(canonicalDeck.cards.map((card) => [card.id, card]));
  assert.equal(cards.OPEN_INVESTOR.choices.left.next, 'INFLUENCER_01');
  assert.equal(cards.OPEN_INVESTOR.choices.right.next, 'PADEL_01');
  assert.deepEqual(cards.OPEN_INVESTOR.choices.left.effects, { cash: -2, founder: 1 });
  assert.deepEqual(cards.OPEN_INVESTOR.choices.right.effects, { cash: -2, team: -4, founder: 2 });

  assert.equal(cards.PADEL_INVITE.source, '@padel_pro');
  assert.equal(cards.PADEL_INVITE.text, 'Yo champ, anyone in the club would die for this match, but I held the slot for you.\nTomorrow 7 AM vs ClosedAI CEO.\n\nThat’s your dream client, man. Remember who opened this door for you 💪');
  assert.deepEqual(choicesWithoutReasons(cards.PADEL_INVITE), {
    left: { label: "I'm in", effects: padelEffects.PADEL_INVITE[0], next: 'DREAM_TEAM' },
    right: { label: 'Feeling sick, pass', effects: padelEffects.PADEL_INVITE[1], next: 'PADEL_OUTCOME_0' },
  });

  assert.equal(cards.DREAM_TEAM.mode, 'team');
  assert.deepEqual(cards.DREAM_TEAM.messages, [
    {
      direction: 'outgoing',
      text: "Guess what? Playing padel with ClosedAI's CEO tomorrow.\nFinally landing our first big client!! 💸",
    },
    {
      direction: 'incoming',
      source: '@bigdeals',
      avatar: 'BD',
      text: 'Insane pull, boss! 🎯\nNow let him win. Stroke his ego and we close this easily',
    },
    {
      direction: 'incoming',
      source: '@hype_queen',
      avatar: 'HQ',
      text: 'nah, smoke him. pure clout for us\nimagine the feed: no-name startup founder violates ClosedAI CEO in 4K 💀',
    },
  ]);
  assert.deepEqual(choicesWithoutReasons(cards.DREAM_TEAM), {
    left: { label: "I'll play nice 😇", effects: padelEffects.DREAM_TEAM[0], next: 'IRL_PADEL_01' },
    right: { label: 'We’ll see', effects: padelEffects.DREAM_TEAM[1], next: 'IRL_PADEL_01' },
  });
  assert.equal(canonicalDeck.sources.dream_team.name, 'Dream Team');
  assert.equal(canonicalDeck.sources.dream_team.role, '6 members · 3 online');
  assert.equal(canonicalDeck.sources['@padel_pro'].irlName, 'Padel coach');
  assert.equal(canonicalDeck.sources['@iclosedai'].irlName, 'ClosedAI CEO');
  assert.equal(canonicalDeck.sources['@padel_pro'].irlAvatar, 'assets/irl-padel-coach-avatar.webp');
  assert.equal(canonicalDeck.sources['@iclosedai'].irlAvatar, 'assets/irl-closedai-ceo-avatar.webp');
  assert.equal(fs.existsSync(path.join(root, canonicalDeck.sources['@padel_pro'].irlAvatar)), true);
  assert.equal(fs.existsSync(path.join(root, canonicalDeck.sources['@iclosedai'].irlAvatar)), true);

  assert.equal(cards.IRL_PADEL_01.mode, 'irl');
  assert.equal(cards.IRL_PADEL_01.source, '@padel_pro');
  assert.equal(cards.IRL_PADEL_01.location, 'IRL · PADEL CLUB');
  assert.equal(cards.IRL_PADEL_01.score, 'Score: 0–0');
  assert.equal(cards.IRL_PADEL_01.text, "Bro, you do NOT pitch here.\nStart selling, and you're a nobody to him.\nEarn his respect on the court first.");
  assert.deepEqual(choicesWithoutReasons(cards.IRL_PADEL_01), {
    left: { label: 'Mouth shut, game on', effects: padelEffects.IRL_PADEL_01[0], ceoScore: 0, next: 'IRL_PADEL_04' },
    right: { label: 'Now or never, pitching', effects: padelEffects.IRL_PADEL_01[1], ceoScore: 1, next: 'IRL_PADEL_03B' },
  });

  assert.equal(cards.IRL_PADEL_03B.mode, 'irl');
  assert.equal(cards.IRL_PADEL_03B.source, '@iclosedai');
  assert.equal(cards.IRL_PADEL_03B.location, 'IRL · PADEL CLUB');
  assert.equal(cards.IRL_PADEL_03B.score, 'Score: 0–0');
  assert.equal(cards.IRL_PADEL_03B.text, 'Who let a pop-up ad onto my court?\nGo fetch the balls and grab my water before I replace your whole startup with one prompt.');
  assert.deepEqual(choicesWithoutReasons(cards.IRL_PADEL_03B), {
    left: { label: 'Getting your water', effects: padelEffects.IRL_PADEL_03B[0], ceoScore: -1, next: 'IRL_PADEL_04' },
    right: { label: 'Business after the match', effects: padelEffects.IRL_PADEL_03B[1], ceoScore: 1, next: 'IRL_PADEL_04' },
  });

  assert.equal(cards.IRL_PADEL_04.mode, 'irl');
  assert.equal(cards.IRL_PADEL_04.source, '@iclosedai');
  assert.equal(cards.IRL_PADEL_04.score, 'Score: 0–0');
  assert.equal(cards.IRL_PADEL_04.text, 'We skip the side switching.\nYou won’t melt after a couple of sets in the sun, right?');
  assert.deepEqual(choicesWithoutReasons(cards.IRL_PADEL_04), {
    left: { label: 'Happy to take it', effects: padelEffects.IRL_PADEL_04[0], ceoScore: -1, next: 'IRL_PADEL_05' },
    right: { label: "Let's stick to rules", effects: padelEffects.IRL_PADEL_04[1], ceoScore: 1, next: 'IRL_PADEL_05' },
  });

  assert.equal(cards.IRL_PADEL_05.mode, 'irl');
  assert.equal(cards.IRL_PADEL_05.source, '@iclosedai');
  assert.equal(cards.IRL_PADEL_05.score, 'Score: 4–4');
  assert.equal(cards.IRL_PADEL_05.text, 'THAT BALL WAS OUT! Are you blind???\nDon’t even try to cheat me. That’s my point.');
  assert.deepEqual(choicesWithoutReasons(cards.IRL_PADEL_05), {
    left: { label: 'Definitely out, my bad', effects: padelEffects.IRL_PADEL_05[0], ceoScore: -1, next: 'IRL_PADEL_06' },
    right: { label: "No way, that's in", effects: padelEffects.IRL_PADEL_05[1], ceoScore: 1, next: 'IRL_PADEL_06' },
  });

  assert.equal(cards.IRL_PADEL_06.mode, 'irl');
  assert.equal(cards.IRL_PADEL_06.source, '@padel_pro');
  assert.equal(cards.IRL_PADEL_06.score, 'Score: 5–5 · 40–40 · DECIDING POINT');
  assert.equal(cards.IRL_PADEL_06.text, "Match point, bro. Give him the win.\nThe best shot right now is the one you don't take.");
  assert.deepEqual(choicesWithoutReasons(cards.IRL_PADEL_06), {
    left: { label: "I'll throw it, coach", effects: padelEffects.IRL_PADEL_06[0] },
    right: { label: 'Fighting till the end', effects: padelEffects.IRL_PADEL_06[1] },
  });

  const outcomes = {
    0: {
      mode: 'personal',
      source: '@padel_pro',
      score: undefined,
      text: 'Man... for real?\nI risked my own reputation to give you a golden ticket and you backed out.\nYou just clowned both of us 🤡',
      labels: ['I have a fever!', '😔😔😔'],
    },
    1: {
      mode: 'irl',
      source: '@iclosedai',
      score: 'YOU WON THE MATCH',
      text: 'Relax, boy. It was only a warm-up.\nWatching you sweat and cheat for that win was painful.\nHave fun begging for money!',
      labels: ['Please wait, sir!', 'Learn to lose'],
    },
    2: {
      mode: 'irl',
      source: '@iclosedai',
      score: 'YOU WON THE MATCH',
      text: "Well, look at that.\nTurns out you actually have some balls.\nSend the demo. Let's see if your startup is just as ballsy.",
      labels: ['Play hard, work harder', 'Prepare to stare'],
    },
    3: {
      mode: 'irl',
      source: '@iclosedai',
      score: 'YOU LOST THE MATCH',
      text: 'Easiest win of my life.\nIt was almost cute watching you panic on match point.\nKnew you were soft from the start. Get off my court.',
      labels: ['Just let you win!', 'So... about the deal?'],
    },
    4: {
      mode: 'irl',
      source: '@iclosedai',
      score: 'YOU LOST THE MATCH',
      text: "Easy win.\nGood boy. Ready to do whatever I say.\nDeal is done. Send the demo, let's see what new toy I just bought.",
      labels: ['Right away, boss!', "We're the future"],
    },
    5: {
      mode: 'irl',
      source: '@iclosedai',
      score: 'YOU LOST THE MATCH',
      text: 'What were you thinking, kid? I always win.\nConsider this deal your consolation prize for trying.\nSend the demo.',
      labels: ['Accepted', 'Rematch tomorrow'],
    },
    6: {
      mode: 'irl',
      source: '@iclosedai',
      score: 'YOU LOST THE MATCH',
      text: "You lost, kid. Nice try.\nKeep working hard, maybe one day I'll hire you to take out my trash.\nAnd yes, forget about business.",
      labels: ['Remember my name', 'Fine without you'],
    },
    7: {
      mode: 'irl',
      source: '@iclosedai',
      score: 'MATCH ABORTED',
      text: 'MATCH OVER! I am SO done with this.\nBitching and crying over every single point.\nKnow your place, nobody. You’re blacklisted everywhere.',
      labels: ["Who's crying now?", "I'll do anything, please!"],
    },
  };
  Object.entries(outcomes).forEach(([number, expected]) => {
    const card = cards[`PADEL_OUTCOME_${number}`];
    assert.ok(card, `missing PADEL_OUTCOME_${number}`);
    assert.equal(card.mode, expected.mode);
    assert.equal(card.source, expected.source);
    assert.equal(card.score, expected.score);
    assert.equal(card.text, expected.text);
    assert.deepEqual([card.choices.left.label, card.choices.right.label], expected.labels);
    assert.deepEqual(card.outcomeEffects, padelOutcomes[number]);
    assert.deepEqual(card.choices.left.effects, {});
    assert.deepEqual(card.choices.right.effects, {});
    assert.equal(card.choices.left.next, undefined);
    assert.equal(card.choices.right.next, undefined);
  });

  assert.equal(fs.existsSync(path.join(root, 'assets', 'irl-padel-court.webp')), true);
});

test('onboarding and Saved Messages retain the approved copy and stages', () => {
  for (const fragment of [
    'Congratulations! 🎉\\nYou successfully escaped the corporate grind',
    'No more working for the man. From now on, you are THE MAN.',
    'Fast forward 5 months:\\nyou have your own AI startup',
    'Does the world actually need your product? It’s AI. Of course they do.\\n\\nAre there any paying customers?',
    'So long, corporate jail!',
    'Trust the process',
    'Open the Masterplan',
    'NEVER WORK AGAIN PLAN',
    '<b>3.</b> Pick up a fancy sport (Golf?? Padel??)',
    '<b>9.</b> Buy mom a house (finally be the favorite son)',
    '<b>10.</b> Hire ex-boss to fire him',
    '5 MONTHS AS A FOUNDER',
    '<b>2.</b> Bro as a cofounder ✅',
    '<b>3.</b> Padel (CEO networking) ✅',
    '<b>4.</b> Built AI B2B SaaS. B2B sales - easy money ✅',
    '<b>9.</b> Unicorn 🦄🎯 (waiting for the market to wake up)',
    'Right on track',
    'Slightly behind',
    'WE’RE SO BACK',
    'it’s so over',
  ]) assert.ok(app.includes(fragment), `missing approved copy: ${fragment}`);

  assert.doesNotMatch(app, /Duh\./);

  assert.match(app, /shellStage:\s*['"]intro['"]/);
  assert.match(app, /shellStage:\s*['"]optimistic['"]/);
  assert.match(app, /shellStage:\s*['"]real['"]/);
  assert.match(app, /Array\.from\([^)]*delivered/);
});

test('index uses one Screen 13 Personal Chat shell in semantic row order', () => {
  assert.match(html, /class="frame"/);
  assert.match(html, /class="phone"[^>]*data-game/);
  assert.match(html, /class="top"/);
  assert.match(html, /class="resources"[^>]*data-resources/);
  assert.match(html, /class="messenger-scene scene--card personal-scene"/);
  assert.match(html, /class="contact"/);
  assert.match(html, /data-pinned/);
  assert.match(html, /class="chat"[^>]*data-chat[\s\S]*data-reply-hint[\s\S]*class="choices"[^>]*data-choices/);
  assert.match(html, /data-message-avatar/);
  assert.match(html, /data-card-id/);
});

test('CSS matches the approved phone, typography, Quiet Glass, and shadow spacing', () => {
  assert.match(css, /\.frame\s*\{[^}]*width:\s*340px;[^}]*height:\s*700px;/s);
  assert.match(css, /\.phone\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*#bdd5e8 0%,\s*#d4e4f0 100%\);/s);
  assert.match(css, /--message-font-size:\s*12\.2px;/);
  assert.match(css, /\.message p\s*\{[^}]*font-size:\s*var\(--message-font-size\);[^}]*line-height:\s*1\.42;/s);
  assert.match(css, /--message-clearance:\s*4px;/);
  assert.match(css, /\.chat\s*\{[^}]*gap:\s*8px;[^}]*overflow:\s*visible;[^}]*z-index:\s*2;/s);
  assert.match(css, /\.message-clearance\s*\{[^}]*height:\s*var\(--message-clearance\);[^}]*flex:\s*0 0 var\(--message-clearance\);/s);
  assert.match(css, /\.reply-hint-dock\s*\{[^}]*padding:\s*4px 10px 8px;[^}]*z-index:\s*3;/s);
  assert.match(css, /\.reply-hint\s*\{[^}]*width:\s*100%;[^}]*height:\s*34px;[^}]*font-weight:\s*400;/s);
  assert.match(css, /\.reply-hint__arrow\s*\{[^}]*flex:\s*0 0 24px;[^}]*width:\s*24px;[^}]*height:\s*24px;/s);
  assert.match(css, /\.self-message p,\s*\.team-bubble p\s*\{[^}]*font-size:\s*var\(--message-font-size\);/s);
  assert.match(css, /\.choice\s*\{[^}]*font-size:\s*13px;/s);
  assert.match(css, /\.team-scene \.choice\s*\{[^}]*font-size:\s*12\.2px;/s);
  assert.match(css, /\.irl-scene \.choice\s*\{[^}]*font-size:\s*12\.2px;/s);
  assert.match(css, /\.pinned\s*\{[^}]*height:\s*48px;/s);
  assert.doesNotMatch(css, /\.irl-location\s+\.pin\s*\{/);
  assert.match(css, /\.irl-scene\s*\{[^}]*background:\s*#d2dbe1;/s);
  assert.match(css, /\.irl-scene::before\s*\{[^}]*background:\s*#d2dbe1;/s);
  assert.match(css, /url\(["']assets\/irl-padel-court\.webp["']\)/);
  assert.match(css, /\.irl-scene::after\s*\{[^}]*inset:\s*1px;[^}]*background:\s*linear-gradient\(180deg,\s*rgba\(7,\s*20,\s*32,\s*\.12\),\s*rgba\(7,\s*20,\s*32,\s*\.22\)\s*48%,\s*rgba\(7,\s*20,\s*32,\s*\.38\)\),\s*url\(["']assets\/irl-padel-court\.webp["']\)\s*center\s*54%\s*\/\s*cover\s*no-repeat;[^}]*filter:\s*blur\(1\.8px\)\s*saturate\(\.88\);[^}]*clip-path:\s*inset\(0\s*round\s*25px\);/s);
  assert.doesNotMatch(css, /\.irl-scene::after\s*\{[^}]*(?:border-radius:\s*24px|box-shadow:)/s);
  assert.match(css, /\.irl-dialog p\s*\{[^}]*font-size:\s*var\(--message-font-size\);[^}]*font-weight:\s*400;[^}]*line-height:\s*1\.38;/s);
});

// Resource values read in full from Google Doc 1oGlgbtUK7Ayrq8sx4O9HCHPtVhOJ-_wJJ0xjH5wgjcc.
exports.decisions = {
  INFLUENCER_01: [{ customers: 5 }, { cash: -25 }],
  INFLUENCER_02: [{ customers: 5 }, { founder: 3 }],
  INFLUENCER_02A: [{ customers: 5 }, { customers: 5, founder: 2 }],
  INFLUENCER_03: [{ team: 5 }, { cash: -10, team: -5 }],
  INFLUENCER_04: [{ founder: 5 }, { founder: -5 }],
  INFLUENCER_05: [{ founder: -10, team: -5 }, { founder: 5 }],
  INFLUENCER_06: [{ founder: -5 }, { founder: 5 }],
  INFLUENCER_07: [{}, {}],
  INFLUENCER_08: [{ customers: 5 }, { founder: 5 }],
};
exports.contextual = {
  INFLUENCER_05: { INFLUENCER_06: [{ founder: -15, team: -5 }, { founder: 7 }] },
  INFLUENCER_06: { INFLUENCER_05: [{ founder: -15, team: -5 }, { founder: 7 }] },
};
exports.outcomes = {
  // User confirmed Cash -25 is charged only on the refusal choice.
  1: { founder: -5 },
  2: { cash: 15, customers: 25, team: -10, founder: -10 },
  3: { cash: -15, customers: -10, team: -15, founder: -25 },
  4: { cash: 15, customers: 25, team: -8, founder: 10 },
  5: { cash: -10, customers: -15, team: -10, founder: -15 },
  6: { cash: 30, customers: 15, team: -8, founder: 15 },
  7: { cash: -15, customers: -20, team: -12, founder: -20 },
};
exports.sum = require('./turn-resources.fixture.cjs').afterTurn;
exports.decision = (id, side, previous) => (exports.contextual[id]?.[previous] || exports.decisions[id])[side === 'left' ? 0 : 1];

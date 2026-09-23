// Approved values from “2.0 Ветка падел”; refusal penalty occurs only on Card 1.
exports.decisions = {
  PADEL_INVITE: [{ cash: -1, customers: 3 }, { cash: -25 }],
  DREAM_TEAM: [{ cash: -1 }, { cash: -1 }],
  IRL_PADEL_01: [{ cash: -1, founder: -1 }, { cash: -1, founder: 3 }],
  IRL_PADEL_03B: [{ cash: -1, founder: -3 }, { cash: -1, founder: 1 }],
  IRL_PADEL_04: [{ cash: -1, founder: -3 }, { cash: -1, founder: 5 }],
  IRL_PADEL_05: [{ cash: -1, founder: -4 }, { cash: -1, founder: 5 }],
  IRL_PADEL_06: [{ cash: -1, founder: -6 }, { cash: -1, founder: 6 }],
};
exports.outcomes = {
  0: {},
  1: { customers: -3, team: -2, founder: -2 },
  2: { cash: 25, customers: 10, team: 8, founder: 15 },
  3: { customers: -3, team: -8, founder: -15 },
  4: { cash: 15, customers: 10, team: 4, founder: 2 },
  5: { cash: 20, customers: 10, team: 6, founder: 8 },
  6: { customers: -3, team: -3, founder: -5 },
  7: { customers: -5, team: -4, founder: -12 },
};

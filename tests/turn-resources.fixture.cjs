// User-approved baseline: every resolved gameplay choice costs 0.5 Cash.
exports.afterTurn = (resources, ...effects) => Object.fromEntries(Object.entries(resources).map(([key, value]) =>
  [key, Math.max(0, Math.min(100, value - (key === 'cash' ? 0.5 : 0) + effects.reduce((n, e) => n + (e[key] || 0), 0)))]));

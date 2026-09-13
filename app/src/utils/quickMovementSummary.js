export function summarizeHolds(performers) {
  const groups = new Map();
  for (const performer of performers) {
    const matches = [...(performer.tip || '').matchAll(/\bhold\s+(?:for\s+)?(\d+(?:\.\d+)?)\s+counts?\b/gi)];
    if (!matches.length) continue;
    const counts = matches.reduce((total, match) => total + Number(match[1]), 0);
    if (!groups.has(counts)) groups.set(counts, []);
    groups.get(counts).push(performer);
  }
  return [...groups].map(([counts, members]) => {
    const labels = [];
    for (const [prefix, symbol] of [['BD', 'D'], ['TD', 'Q'], ['SD', 'S']]) {
      const section = performers.filter(p => p.id.startsWith(prefix));
      const held = members.filter(p => p.id.startsWith(prefix));
      if (held.length) labels.push(held.length === section.length ? symbol : held.map(p => p.id).join('/'));
    }
    return { counts, scope: members.length === performers.length ? '' : labels.join('/') };
  });
}

export function rehearsalFromMeasures(measures = '') {
  const letters = [...new Set([...measures.matchAll(/\b([A-Z])(?=\d)/g)].map(match => match[1]))];
  if (letters.length && /\bEnd\b/.test(measures)) letters.push('End');
  return letters.join('-');
}

const d = window.dev;
const out = [];
await d.loadWait(1400);
out.push('0 ' + JSON.stringify(d.probe()));
for (let i = 0; i < 8; i++) {
  d.key('Enter', 30);
  const t = d.game.scenes.top;
  out.push(i + ' scene=' + t.name + ' rows=' + (typeof t.rows) + ' keys=' + Object.keys(t).slice(0, 14).join(','));
  if (t.name === 'overworld') break;
}
return out.join('\n');

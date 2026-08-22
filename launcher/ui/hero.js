/*
 * Launcher key art.
 *
 * Drawn to a canvas rather than shipped as a PNG, for the same reason the game
 * generates its own tiles and sprites: no binary assets anywhere in the repo,
 * and the art stays editable by anyone who can read the file. It is the game's
 * own title screen composition -- sky bands, the Hollow Sea, a dark crescent
 * coast, and something very large moving underneath -- at launcher resolution.
 */

(function heroArt() {
  const canvas = document.getElementById('hero-art');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const SKY = ['#161d34', '#1d2647', '#26325a', '#31406d', '#41507f',
               '#566191', '#6f7396', '#8c7d96', '#a98b92', '#c49a8c'];
  const SEA = ['#132038', '#172742', '#1b2e4e', '#20365b', '#253e68'];

  const HORIZON = Math.round(H * 0.46);

  // Fixed star field, seeded so the art is identical on every launch.
  const stars = [];
  let seed = 20260821;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 90; i++) {
    stars.push({ x: rnd() * W, y: rnd() * HORIZON * 0.72, b: rnd() });
  }

  let t = 0;

  function draw() {
    // Sky.
    const bandH = Math.ceil(HORIZON / SKY.length);
    SKY.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * bandH, W, bandH + 1);
    });

    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * 1.4 + s.b * 10);
      if (tw < 0.55) continue;
      ctx.fillStyle = tw > 0.86 ? '#ffffff' : '#c3cce6';
      ctx.fillRect(s.x | 0, s.y | 0, 2, 2);
    }

    // Sea.
    const seaH = Math.ceil((H - HORIZON) / SEA.length);
    SEA.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, HORIZON + i * seaH, W, seaH + 1);
    });

    // Drifting shimmer lines. Cheap, and it sells "water" instantly.
    for (let i = 0; i < 26; i++) {
      const y = HORIZON + 8 + i * 8;
      const w = 14 + ((i * 13) % 34);
      const x = ((t * (26 + i * 4) + i * 90) % (W + 80)) - 40;
      ctx.fillStyle = i < 14 ? '#33507a' : '#2b4568';
      ctx.fillRect(x | 0, y, w, 2);
      ctx.fillRect(((x + 260) % W) | 0, y, (w / 2) | 0, 2);
    }

    // The crescent coast framing both sides of the inner sea.
    for (let x = 0; x < W; x++) {
      const edge = Math.abs(x - W / 2) / (W / 2);
      const h = Math.floor(Math.pow(edge, 2.4) * (H * 0.30));
      if (h <= 0) continue;
      ctx.fillStyle = '#0f1526';
      ctx.fillRect(x, HORIZON - h, 1, h + 3);
      ctx.fillStyle = '#1e2740';
      ctx.fillRect(x, HORIZON - h, 1, 2);
    }

    // The Warden: a vast silhouette rolling just under the surface.
    const cx = W / 2 + Math.sin(t * 0.22) * 90;
    const cy = HORIZON + (H - HORIZON) * 0.34 + Math.sin(t * 0.5) * 4;
    ctx.fillStyle = '#0c1424';
    for (let i = 0; i < 54; i++) {
      const a = (i / 54) * Math.PI;
      const w = Math.sin(a) * 150;
      if (w <= 0) continue;
      ctx.fillRect((cx - w / 2) | 0, (cy - 22 + i * 1.5) | 0, w | 0, 2);
    }
    // Two dim eye-lights: the only warm colour below the waterline.
    const glow = 0.5 + 0.5 * Math.sin(t * 1.05);
    if (glow > 0.38) {
      ctx.fillStyle = `rgba(201, 139, 74, ${glow})`;
      ctx.fillRect((cx - 26) | 0, (cy - 8) | 0, 5, 3);
      ctx.fillRect((cx + 21) | 0, (cy - 8) | 0, 5, 3);
    }

    t += 1 / 60;
    requestAnimationFrame(draw);
  }

  draw();
})();

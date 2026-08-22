/*
 * Launcher key art.
 *
 * Drawn to a canvas rather than shipped as a PNG, for the same reason the game
 * generates its own tiles and sprites: no binary assets anywhere in the repo,
 * and the art stays editable by anyone who can read the file. It is the game's
 * own title composition -- a banded dusk sky, the Hollow Sea, the crescent
 * coast with the Bastion light on it, kin in the air, and the Warden rolling
 * just under the surface.
 *
 * One routine paints it at any size, so the shelf thumbnail is the same picture
 * as the hero rather than a separate asset that can drift out of step with it.
 * Only the hero animates; a list of thumbnails each running their own rAF loop
 * is a lot of battery for something 56 pixels wide.
 */

(function keyArt() {
  const SKY = ['#141a30', '#1a2340', '#212c53', '#2a3765', '#374478',
               '#48538a', '#5d6296', '#78709a', '#96809a', '#b58e92', '#cb9c8c'];
  const SEA = ['#14213a', '#182844', '#1c2f50', '#21375d', '#263f6a', '#2b4676'];

  /** Deterministic scatter, so the art is identical on every launch. */
  function rng(seed) {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  function scatter(count, W, H, seed) {
    const rnd = rng(seed);
    const out = [];
    for (let i = 0; i < count; i++) out.push({ x: rnd() * W, y: rnd() * H, b: rnd() });
    return out;
  }

  /* ------------------------------------------------------------- pieces */

  function sky(ctx, W, horizon) {
    const band = Math.ceil(horizon / SKY.length);
    SKY.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * band, W, band + 1);
    });
  }

  function stars(ctx, field, t, px) {
    for (const s of field) {
      const tw = 0.5 + 0.5 * Math.sin(t * 1.4 + s.b * 10);
      if (tw < 0.5) continue;
      ctx.fillStyle = tw > 0.86 ? '#ffffff' : '#b9c4e2';
      ctx.fillRect(s.x | 0, s.y | 0, px, px);
    }
  }

  /** A low amber moon, half swallowed by the haze above the water. */
  function moon(ctx, W, horizon, px) {
    const cx = Math.round(W * 0.71);
    const cy = Math.round(horizon - horizon * 0.30);
    const r = Math.max(4, Math.round(horizon * 0.075));

    ctx.fillStyle = 'rgba(233, 176, 116, 0.10)';
    ctx.beginPath(); ctx.arc(cx, cy, r * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6dcb0';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    // The crescent is cut out of the disc rather than painted over it, so the
    // sky behind shows through exactly as it is instead of being guessed at.
    ctx.save();
    ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.22, r * 0.92, 0, Math.PI * 2); ctx.clip();
    sky(ctx, W, horizon);
    ctx.restore();

    // Its reflection, broken into rungs on the water.
    ctx.fillStyle = 'rgba(226, 168, 110, 0.16)';
    for (let i = 0; i < 10; i++) {
      const w = (r * 1.6) * (1 - i / 13);
      ctx.fillRect((cx - w / 2) | 0, horizon + 3 * px + i * 4 * px, w | 0, px);
    }
  }

  /** Long flat cloud bars, the only thing in the sky with weight. */
  function clouds(ctx, W, horizon, t) {
    const rnd = rng(4242);
    for (let i = 0; i < 7; i++) {
      const y = Math.round(horizon * (0.18 + rnd() * 0.62));
      const w = W * (0.10 + rnd() * 0.26);
      const h = Math.max(2, Math.round(horizon * 0.022));
      const drift = (t * (3 + i * 1.6) + rnd() * W) % (W + w * 2) - w;
      ctx.fillStyle = i % 2 ? 'rgba(20, 25, 45, 0.5)' : 'rgba(30, 36, 62, 0.55)';
      ctx.fillRect(drift | 0, y, w | 0, h);
      ctx.fillRect((drift + w * 0.3) | 0, y - h, (w * 0.45) | 0, h);
    }
  }

  function sea(ctx, W, H, horizon, t, px) {
    const band = Math.ceil((H - horizon) / SEA.length);
    SEA.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, horizon + i * band, W, band + 1);
    });

    // Drifting shimmer. Cheap, and it sells "water" instantly.
    const rows = Math.max(6, Math.round((H - horizon) / (5 * px)));
    for (let i = 0; i < rows; i++) {
      const y = horizon + 5 * px + i * 5 * px;
      const w = (10 + ((i * 17) % 30)) * px;
      const x = ((t * (18 + i * 3) * px + i * 97) % (W + 120)) - 60;
      ctx.fillStyle = i < rows * 0.45 ? 'rgba(96, 138, 196, 0.30)' : 'rgba(74, 112, 168, 0.24)';
      ctx.fillRect(x | 0, y, w, px);
      ctx.fillRect(((x + W * 0.4) % W) | 0, y, (w / 2) | 0, px);
    }
  }

  /**
   * Height of the coast at a given x.
   *
   * Steep exponent on purpose: the land should be two headlands closing in from
   * the sides, not a dome across the whole sky. The Bastion reads its own
   * footing from the same curve, so the tower always stands *on* the rock.
   */
  function coastHeight(x, W, horizon) {
    const edge = Math.abs(x - W / 2) / (W / 2);
    return Math.floor(Math.pow(edge, 6) * horizon * 0.34);
  }

  /** The crescent coast, closing around the inner sea from both sides. */
  function coast(ctx, W, H, horizon, px) {
    for (let x = 0; x < W; x++) {
      const h = coastHeight(x, W, horizon);
      if (h <= 1) continue;   // a one-pixel rise is a hard black bar, not a shore
      ctx.fillStyle = '#070b14';
      ctx.fillRect(x, horizon - h, 1, h + 2);
      ctx.fillStyle = '#33456e';
      ctx.fillRect(x, horizon - h, 1, px);
    }
  }

  /** The Bastion light on the right headland: the one lit window in the world. */
  function bastion(ctx, W, H, horizon, t, px) {
    const x = Math.round(W * 0.93);
    const base = horizon - coastHeight(x, W, horizon);
    const h = Math.max(10, Math.round(horizon * 0.20));
    const w = Math.max(3, Math.round(W * 0.009));

    ctx.fillStyle = '#0a0f1b';
    ctx.fillRect(x, base - h, w, h + 6);
    ctx.fillRect(x - px, base - h - px * 2, w + px * 2, px * 2);

    const pulse = 0.55 + 0.45 * Math.sin(t * 0.9);
    ctx.fillStyle = 'rgba(240, 186, 110, ' + (pulse * 0.12).toFixed(2) + ')';
    ctx.beginPath();
    ctx.arc(x + w / 2, base - h + px * 2, w * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(248, 200, 128, ' + pulse.toFixed(2) + ')';
    ctx.fillRect(x, base - h + px, w, px * 2);
  }

  /** Kin on the wing: chevrons crossing the sky, each at its own pace. */
  function flyers(ctx, W, horizon, t, px) {
    const flock = scatter(10, W, horizon * 0.72, 90210);
    flock.forEach((f, i) => {
      const speed = 9 + f.b * 16;
      const x = ((f.x + t * speed) % (W + 60)) - 30;
      const y = horizon * 0.16 + f.y * 0.8 + Math.sin(t * (0.7 + f.b) + i) * (2 * px);
      const flap = Math.sin(t * (3.4 + f.b * 2.2) + i * 1.7) > 0 ? px : 0;
      const s = i % 4 === 0 ? px * 2 : px;
      ctx.fillStyle = i % 3 === 0 ? '#4a577b' : '#3a4666';
      ctx.fillRect(x | 0, y | 0, s, s);
      ctx.fillRect((x - s * 2) | 0, (y - flap) | 0, s * 2, s);
      ctx.fillRect((x + s) | 0, (y - flap) | 0, s * 2, s);
    });
  }

  /**
   * The Warden, rolling just under the surface.
   *
   * A ray rather than a blob: two swept wings, a thick body and a long tail
   * read as something alive at a glance, which a lens-shaped silhouette never
   * quite does.
   */
  function warden(ctx, W, H, horizon, t, px) {
    const cx = W / 2 + Math.sin(t * 0.19) * (W * 0.07);
    const cy = horizon + (H - horizon) * 0.46 + Math.sin(t * 0.44) * px * 2;
    const span = Math.max(40, W * 0.30);
    const roll = Math.sin(t * 0.19 + Math.PI / 2);

    ctx.fillStyle = '#111c31';
    // Wings: a swept curve out to each tip, thinning as it goes.
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const wingX = u * (span / 2);
      const lift = Math.sin(u * Math.PI * 0.85) * span * 0.055 * roll;
      const thick = Math.max(px, (1 - u * u) * span * 0.10);
      ctx.fillRect((cx + wingX) | 0, (cy - lift - thick / 2) | 0, px * 2, thick | 0);
      ctx.fillRect((cx - wingX) | 0, (cy - lift - thick / 2) | 0, px * 2, thick | 0);
    }
    // Body.
    for (let i = 0; i < 24; i++) {
      const u = i / 24;
      const w = Math.sin((1 - u) * Math.PI * 0.6) * span * 0.17;
      ctx.fillRect((cx - w / 2) | 0, (cy - span * 0.05 + u * span * 0.16) | 0, w | 0, px);
    }
    // Tail.
    for (let i = 0; i < 18; i++) {
      const u = i / 18;
      const sway = Math.sin(t * 1.1 - u * 2.4) * span * 0.05 * u;
      ctx.fillRect((cx + sway) | 0, (cy + span * 0.11 + u * span * 0.30) | 0,
        Math.max(px, (1 - u) * span * 0.035) | 0, px);
    }
    // Two dim eye-lights: the only warm colour below the waterline.
    const glow = 0.45 + 0.55 * Math.sin(t * 1.05);
    if (glow > 0.35) {
      ctx.fillStyle = 'rgba(214, 148, 78, ' + glow.toFixed(2) + ')';
      ctx.fillRect((cx - span * 0.055) | 0, (cy - span * 0.015) | 0, px * 2, px);
      ctx.fillRect((cx + span * 0.03) | 0, (cy - span * 0.015) | 0, px * 2, px);
    }
  }

  /* -------------------------------------------------------------- paint */

  function paint(ctx, W, H, field, t) {
    const horizon = Math.round(H * 0.52);
    // One "pixel" of the art. Kept coarse so the picture still reads as pixel
    // art at hero size instead of dissolving into hairlines.
    const px = Math.max(1, Math.round(W / 620));

    sky(ctx, W, horizon);
    stars(ctx, field, t, px);
    moon(ctx, W, horizon, px);
    clouds(ctx, W, horizon, t);
    sea(ctx, W, H, horizon, t, px);
    coast(ctx, W, H, horizon, px);
    bastion(ctx, W, H, horizon, t, px);
    warden(ctx, W, H, horizon, t, px);
    flyers(ctx, W, horizon, t, px);
  }

  /** One still frame. Used for the shelf thumbnails. */
  window.paintKeyArt = function paintKeyArt(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    paint(ctx, canvas.width, canvas.height,
      scatter(Math.round(canvas.width / 6), canvas.width, canvas.height * 0.4, 20260821), 1.7);
  };

  const hero = document.getElementById('hero-art');
  if (!hero) return;
  const ctx = hero.getContext('2d');
  let field = [];
  let t = 0;

  /**
   * The canvas is sized to the pixels it actually occupies.
   *
   * Drawing at a fixed size and letting CSS stretch it is how pixel art turns
   * to soup: every line lands between pixels and the whole picture softens.
   */
  function fit() {
    const w = Math.max(320, Math.round(hero.clientWidth));
    const h = Math.max(220, Math.round(hero.clientHeight));
    if (hero.width === w && hero.height === h) return;
    hero.width = w;
    hero.height = h;
    field = scatter(Math.round((w * h) / 3600), w, h * 0.42, 20260821);
  }

  window.addEventListener('resize', fit);
  fit();

  (function frame() {
    fit();
    paint(ctx, hero.width, hero.height, field, t);
    t += 1 / 60;
    requestAnimationFrame(frame);
  })();
})();

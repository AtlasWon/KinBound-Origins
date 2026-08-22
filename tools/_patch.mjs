import { readFileSync, writeFileSync } from 'node:fs';
function patch(path, pairs) {
  let s = readFileSync(path, 'utf8');
  for (const [from, to] of pairs) {
    if (!s.includes(from)) { console.error('MISS in ' + path + ':\n' + from.slice(0, 220)); process.exit(1); }
    s = s.replace(from, to);
  }
  writeFileSync(path, s);
  console.log('patched ' + path);
}

patch('src/gfx/tileset.ts', [

/* ------------------------------------------------------------ tile ids */
[`  PLATE,
  PLATE_DOWN,
  COUNT,
}`,
 `  PLATE,
  PLATE_DOWN,
  ASH,
  LAVA,
  BASALT,
  BASALT_FLOOR,
  GRATE,
  PIPE,
  MARSH,
  SNOW,
  ICE,
  COUNT,
}`],

/* -------------------------------------------------------------- palette */
[`  outline: '#1a1e26',
  shadow: 'rgba(18,22,30,0.28)',
} as const;`,
 `  ashDeep: '#33303a',
  ashDark: '#474450',
  ashMid: '#5e5a68',
  ashLight: '#787384',
  ashPale: '#9a94a4',

  lavaCore: '#ffe9a0',
  lavaHot: '#ffb03a',
  lavaMid: '#e05a1c',
  lavaCool: '#8f2c14',
  lavaCrust: '#3a1e18',

  basaltDeep: '#1e1c26',
  basaltDark: '#2c2a36',
  basaltMid: '#3d3a4a',
  basaltLight: '#524e62',
  basaltPale: '#6b6680',

  ironDeep: '#2e3138',
  ironDark: '#454a54',
  ironMid: '#616872',
  ironLight: '#828a95',
  ironPale: '#a6aeb8',

  marshDeep: '#2b3524',
  marshDark: '#3c4a2e',
  marshMid: '#556340',
  marshLight: '#6f7c50',
  marshScum: '#8fa356',

  snowShade: '#b8c4d4',
  snowMid: '#d8e2ee',
  snowLight: '#eef4fb',
  snowPale: '#ffffff',

  outline: '#1a1e26',
  shadow: 'rgba(18,22,30,0.28)',
} as const;`],

/* -------------------------------------------------------------- variants */
[`  [T.BRAMBLE]: 2,
};`,
 `  [T.BRAMBLE]: 2,
  [T.ASH]: 3,
  [T.LAVA]: 3,
  [T.BASALT]: 3,
  [T.BASALT_FLOOR]: 3,
  [T.MARSH]: 3,
  [T.SNOW]: 3,
};`],

/* ------------------------------------------------------------ dispatch */
[`      case T.PLATE: this.plate(px, fill, false); break;
      case T.PLATE_DOWN: this.plate(px, fill, true); break;`,
 `      case T.PLATE: this.plate(px, fill, false); break;
      case T.PLATE_DOWN: this.plate(px, fill, true); break;
      case T.ASH: this.ash(px, fill, rng); break;
      case T.LAVA: this.lava(px, fill, rng); break;
      case T.BASALT: this.basalt(px, fill, rng, true); break;
      case T.BASALT_FLOOR: this.basalt(px, fill, rng, false); break;
      case T.GRATE: this.grate(px, fill); break;
      case T.PIPE: this.pipe(px, fill); break;
      case T.MARSH: this.marsh(px, fill, rng); break;
      case T.SNOW: this.snow(px, fill, rng); break;
      case T.ICE: this.ice(px, fill, rng); break;`],

/* --------------------------------------------------------- new drawings */
[`  /**
   * Pressure plate. The two states have to be legible from across the room,
   * because reading the board at a glance is the entire puzzle.
   */`,
 `  /* -------------------------------------------------------- volcanic */

  /** Cold ash: soft, grey, drifted, with cinders that have not gone out. */
  private ash(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.ashMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(Math.floor(x / 3), Math.floor(y / 3), 201) * 0.6
                + hash2(Math.floor(x / 8), Math.floor(y / 8), 17) * 0.4;
        if (n > 0.78) px(x, y, PAL.ashPale);
        else if (n > 0.6) px(x, y, PAL.ashLight);
        else if (n < 0.16) px(x, y, PAL.ashDeep);
        else if (n < 0.32) px(x, y, PAL.ashDark);
      }
    }
    // Wind-drifted ridges, so ash reads as loose rather than as paving.
    for (let i = 0; i < 3; i++) {
      const ry = 3 + rng.below(TILE_PX - 6);
      for (let x = 0; x < TILE_PX; x++) {
        const y = ry + Math.round(Math.sin(x * 0.22 + i * 1.7) * 2);
        px(x, y, PAL.ashPale);
        px(x, y + 1, PAL.ashDark);
      }
    }
    // Live cinders. Rare enough to be a detail, not a texture.
    for (let i = 0; i < 3; i++) {
      const cx = 2 + rng.below(TILE_PX - 4);
      const cy = 2 + rng.below(TILE_PX - 4);
      px(cx, cy, PAL.lavaHot);
      px(cx + 1, cy, PAL.lavaMid);
      px(cx, cy + 1, PAL.lavaCool);
    }
  }

  /**
   * Molten rock. It is a wall the player must read as lethal at a glance, so
   * the crust is nearly black and the cracks between it are the brightest
   * thing in the whole tileset.
   */
  private lava(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.lavaCrust);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(Math.floor(x / 3), Math.floor(y / 3), 211);
        if (n > 0.72) px(x, y, '#4a2a1e');
        else if (n < 0.28) px(x, y, '#2a1410');
      }
    }
    // A branching network of glowing fissures.
    const glow = (x: number, y: number) => {
      px(x, y, PAL.lavaCore);
      px(x - 1, y, PAL.lavaHot);
      px(x + 1, y, PAL.lavaHot);
      px(x, y - 1, PAL.lavaMid);
      px(x, y + 1, PAL.lavaMid);
      px(x - 2, y, PAL.lavaCool);
      px(x + 2, y, PAL.lavaCool);
    };
    for (let i = 0; i < 3; i++) {
      let x = rng.below(TILE_PX);
      const dir = rng.chance(50) ? 1 : -1;
      for (let y = 0; y < TILE_PX; y++) {
        glow(((x % TILE_PX) + TILE_PX) % TILE_PX, y);
        x += rng.below(3) - 1 + (y % 6 === 0 ? dir : 0);
      }
    }
    for (let i = 0; i < 2; i++) {
      let y = rng.below(TILE_PX);
      for (let x = 0; x < TILE_PX; x++) {
        if ((x + i * 5) % 11 > 6) { y += rng.below(3) - 1; continue; }
        glow(x, ((y % TILE_PX) + TILE_PX) % TILE_PX);
        y += rng.below(3) - 1;
      }
    }
  }

  /** Columnar basalt: as a wall it is barred, as a floor it is plated. */
  private basalt(px: Px, fill: (c: string) => void, rng: Rng, wall: boolean): void {
    fill(PAL.basaltMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(Math.floor(x / 2), Math.floor(y / 4), 221);
        if (n > 0.72) px(x, y, PAL.basaltLight);
        else if (n < 0.3) px(x, y, PAL.basaltDark);
      }
    }
    if (wall) {
      // Hexagonal columns, read as vertical bars with lit left edges.
      for (let i = 0; i < 5; i++) {
        const x = 1 + i * 6 + rng.below(2);
        for (let y = 0; y < TILE_PX; y++) {
          px(x, y, PAL.basaltPale);
          px(x + 1, y, PAL.basaltMid);
          px(x + 4, y, PAL.basaltDeep);
          px(x + 5, y, PAL.basaltDeep);
        }
        // Column joints.
        for (let y = 3 + rng.below(6); y < TILE_PX; y += 9 + rng.below(4)) {
          for (let d = 0; d < 6; d++) px(x + d, y, PAL.basaltDeep);
        }
      }
      // A few cracks still warm from below.
      for (let i = 0; i < 2; i++) {
        const cx = rng.below(TILE_PX);
        for (let y = 20 + rng.below(6); y < TILE_PX; y++) px(cx, y, PAL.lavaCool);
      }
    } else {
      // Floor: flat plates with a warm seam between them.
      for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
          const plate = ((x + (Math.floor(y / 11) % 2) * 5) % 11 === 0) || y % 11 === 0;
          if (plate) px(x, y, PAL.basaltDeep);
          else if ((y % 11) === 1) px(x, y, PAL.basaltLight);
        }
      }
      for (let i = 0; i < 5; i++) {
        px(rng.below(TILE_PX), rng.below(TILE_PX), PAL.lavaCool);
      }
    }
  }

  /* ------------------------------------------------------- industrial */

  /** Walkway grating over a drop, the floor of every Concord works. */
  private grate(px: Px, fill: (c: string) => void): void {
    fill(PAL.ironDeep);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const bar = x % 5 < 3;
        const cross = y % 8 < 2;
        if (cross) px(x, y, y % 8 === 0 ? PAL.ironLight : PAL.ironMid);
        else if (bar) px(x, y, x % 5 === 0 ? PAL.ironLight : PAL.ironDark);
        // Everything else stays void, which is what makes it read as grating.
      }
    }
    // Rivets at the crossings.
    for (let y = 0; y < TILE_PX; y += 8) {
      for (let x = 2; x < TILE_PX; x += 10) {
        px(x, y, PAL.ironPale);
        px(x + 1, y + 1, PAL.ironDeep);
      }
    }
  }

  /** A run of pipework, the Cinderfall equivalent of a fence. */
  private pipe(px: Px, fill: (c: string) => void): void {
    fill(PAL.ironDeep);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(x, Math.floor(y / 3), 231);
        px(x, y, n > 0.7 ? PAL.ironDark : PAL.ironDeep);
      }
    }
    // Two cylinders, lit along the top.
    for (const top of [5, 19]) {
      for (let x = 0; x < TILE_PX; x++) {
        px(x, top, PAL.ironDeep);
        px(x, top + 1, PAL.ironPale);
        px(x, top + 2, PAL.ironLight);
        px(x, top + 3, PAL.ironMid);
        px(x, top + 4, PAL.ironMid);
        px(x, top + 5, PAL.ironDark);
        px(x, top + 6, PAL.ironDeep);
      }
      // Flanged joints.
      for (const jx of [6, 22]) {
        for (let y = top - 1; y <= top + 7; y++) {
          px(jx, y, PAL.ironLight);
          px(jx + 1, y, PAL.ironDark);
        }
      }
    }
    // Valve wheel between the runs.
    for (let d = -3; d <= 3; d++) {
      px(16 + d, 14, PAL.lavaMid);
      px(16, 14 + d, PAL.lavaMid);
    }
    px(16, 14, PAL.lavaHot);
  }

  /* ------------------------------------------------------------ wetland */

  /** Standing marsh water: shallow enough to wade, dirty enough to say so. */
  private marsh(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.marshMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const w = Math.sin((x + y * 0.4) * 0.3) + Math.sin((x * 0.5 - y) * 0.22);
        if (w > 1) px(x, y, PAL.marshLight);
        else if (w < -1) px(x, y, PAL.marshDeep);
        else if (hash2(x, y, 241) > 0.8) px(x, y, PAL.marshDark);
      }
    }
    // Scum mats and reed stubs breaking the surface.
    for (let i = 0; i < 4; i++) {
      const cx = 3 + rng.below(TILE_PX - 6);
      const cy = 3 + rng.below(TILE_PX - 6);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (dx * dx + dy * dy * 2 <= 9) px(cx + dx, cy + dy, PAL.marshScum);
        }
      }
      px(cx - 1, cy - 2, '#a8bd68');
    }
    for (let i = 0; i < 5; i++) {
      const rx = rng.below(TILE_PX);
      const ry = 6 + rng.below(TILE_PX - 8);
      for (let k = 0; k < 5 + rng.below(5); k++) px(rx, ry - k, k > 2 ? '#7f8a4a' : PAL.marshDark);
    }
  }

  /* -------------------------------------------------------------- cold */

  private snow(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.snowMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(Math.floor(x / 4), Math.floor(y / 4), 251) * 0.65
                + hash2(x, y, 3) * 0.35;
        if (n > 0.76) px(x, y, PAL.snowPale);
        else if (n > 0.58) px(x, y, PAL.snowLight);
        else if (n < 0.22) px(x, y, PAL.snowShade);
      }
    }
    // Drift shadows: without them snow is a white rectangle.
    for (let i = 0; i < 3; i++) {
      const ry = 4 + rng.below(TILE_PX - 8);
      for (let x = 0; x < TILE_PX; x++) {
        const y = ry + Math.round(Math.sin(x * 0.19 + i * 2.1) * 2.5);
        px(x, y, PAL.snowShade);
        px(x, y - 1, PAL.snowPale);
      }
    }
  }

  private ice(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill('#a8cee0');
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(Math.floor(x / 5), Math.floor(y / 5), 257);
        if (n > 0.68) px(x, y, '#c4e2ee');
        else if (n < 0.3) px(x, y, '#8fb8cc');
      }
    }
    // Fracture lines, which also warn the player the surface is slick.
    for (let i = 0; i < 4; i++) {
      let x = rng.below(TILE_PX);
      let y = rng.below(TILE_PX);
      const dx = rng.chance(50) ? 1 : -1;
      for (let s = 0; s < 18; s++) {
        px(x, y, '#e8f6fc');
        px(x + 1, y, '#7fa8bc');
        x += dx;
        y += rng.below(3) - 1;
      }
    }
    for (let x = 0; x < TILE_PX; x++) px(x, 0, '#e8f6fc');
  }

  /**
   * Pressure plate. The two states have to be legible from across the room,
   * because reading the board at a glance is the entire puzzle.
   */`],
]);

/* ------------------------------------------------------ terrain legend */
patch('src/world/terrain.ts', [[
  `  'x': { ground: T.PLATE, collision: 0, tag: 'floor', step: 'stone' },
};`,
  `  'x': { ground: T.PLATE, collision: 0, tag: 'floor', step: 'stone' },

  // Volcanic country around Cinderfall.
  'A': { ground: T.ASH, collision: 0, tag: 'sand', step: 'sand' },
  'V': { ground: T.LAVA, collision: 1, tag: 'cave' },
  'E': { ground: T.BASALT, collision: 1, tag: 'cave' },
  'e': { ground: T.BASALT_FLOOR, collision: 0, tag: 'cave', step: 'stone' },
  'M': { ground: T.GRATE, collision: 0, tag: 'floor', step: 'stone' },
  'P': { ground: T.PIPE, collision: 1, tag: 'floor' },

  // Wetland and high cold, for the marsh and the peaks.
  'm': { ground: T.MARSH, collision: 2, tag: 'water', encounter: true, step: 'water' },
  'n': { ground: T.SNOW, collision: 0, tag: 'grass', step: 'sand' },
  'i': { ground: T.ICE, collision: 0, tag: 'floor', step: 'stone' },
};`,
]]);

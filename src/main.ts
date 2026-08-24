/**
 * Entry point.
 */
import { Game } from './core/game.js';
import { TitleScene } from './scenes/title.js';
import { validateFont } from './gfx/font.js';
import { registry } from './data/registry.js';
import { loadKinArt } from './gfx/kinart.js';
import { loadItemArt } from './gfx/itemart.js';
import { clearSpriteCache } from './gfx/kinsprite.js';
import { audio, type TrackData } from './audio/audio.js';
import { migrateLegacySaves } from './systems/save.js';

/**
 * Silent mode.
 *
 * `?mute=1` switches audio off for the whole session, before the first note
 * can be scheduled.
 *
 * The playtest harness (`?dev=1`) is silent by *default*, and needs `?sound=1`
 * to make any noise. Automated runs open the game every few minutes; having
 * that start music over whatever the person at the keyboard is listening to is
 * hostile, and opting in every time is something you only have to forget once.
 *
 * A URL flag rather than a setting because it has to be decided before boot,
 * and because it must not stick -- someone handed a muted build once should
 * get sound back the next time they open it normally.
 */
function wantsSilence(): boolean {
  const params = new URLSearchParams(location.search);
  if (params.has('mute')) return params.get('mute') !== '0';
  return params.has('dev') && !params.has('sound');
}

async function boot(): Promise<void> {
  migrateLegacySaves();

  if (wantsSilence()) {
    audio.disable();
    console.log('[kinbound] audio off for this session. Add ?sound=1 to hear it.');
  }

  const errors = validateFont();
  if (errors.length) console.error('Font failed validation:\n' + errors.join('\n'));

  const canvas = document.getElementById('screen') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('missing #screen canvas');

  const game = new Game(canvas);
  (globalThis as unknown as { game: Game }).game = game;

  try {
    await registry.loadCore(game.assets);

    /*
     * Hand-drawn creature art, decoded here and nowhere else.
     *
     * Image decoding is asynchronous and every sprite accessor in the game is
     * synchronous, called from inside a render tick. There is exactly one safe
     * place to reconcile that, and it is here: after the species list exists
     * (so we know what to look for) and before the first frame is drawn (so
     * nothing can ask for a sprite that has not finished arriving). It never
     * throws -- a species with no art, or with bad art, simply keeps the
     * procedural sprite.
     */
    await loadKinArt([...registry.species.keys()]);
    clearSpriteCache();

    /*
     * Hand-drawn item art, decoded here for the same reason and under the same
     * rule: the accessors in gfx/itemart.ts are synchronous and called from
     * render ticks, so every image has to be flat pixels before the first
     * frame. Keyed on the `icon` field rather than the item id -- that field is
     * the name of the drawing, and two items may share one. An item with no
     * file, or with a bad one, keeps the icon generated in code.
     */
    await loadItemArt([...registry.items.values()].map((i) => i.icon).filter(Boolean));

    const tracks = await game.assets
      .loadJson<TrackData[]>('data/audio/tracks.json')
      .catch(() => [] as TrackData[]);
    audio.loadTracks(tracks);
    audio.setVolumes(game.settings.musicVolume, game.settings.sfxVolume);
  } catch (e) {
    console.error('content load failed', e);
  }

  game.start(new TitleScene());

  if (location.search.includes('dev')) {
    const { installHarness } = await import('./dev/harness.js');
    installHarness(game);
  }

  document.getElementById('loading')?.remove();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void boot());
} else {
  void boot();
}

/**
 * Options.
 *
 * Two tabs: gameplay settings, and full key rebinding. Every setting takes
 * effect immediately and is written to storage on exit, so nothing here needs
 * an "apply" step.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { ListMenu, type MenuItem } from '../ui/menu.js';
import { ACTIONS, InputManager, type Action } from '../core/input.js';
import { audio } from '../audio/audio.js';

type Tab = 'game' | 'keys';

const TEXT_SPEEDS = ['slow', 'normal', 'fast', 'instant'] as const;
const BATTLE_SPEEDS = ['classic', 'brisk', 'fast'] as const;

const ACTION_LABELS: Record<Action, string> = {
  up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right',
  confirm: 'Confirm', cancel: 'Cancel', menu: 'Menu', run: 'Run',
  map: 'Region map', bag: 'Bag', party: 'Party', vellum: 'Vellum',
  nextTab: 'Next tab', prevTab: 'Previous tab',
  debug: 'Debug overlay', speedUp: 'Hold to speed up',
};

export class OptionsScene implements Scene {
  readonly name = 'options';
  readonly transparent = true;

  private tab: Tab = 'game';
  private menu = new ListMenu<string>([], 8);
  private rebinding: Action | null = null;

  enter(game: Game): void { this.rebuild(game); }

  exit(game: Game): void { game.persistSettings(); }

  private rebuild(game: Game): void {
    const idx = this.menu.index;
    const s = game.settings;
    const items: MenuItem<string>[] = this.tab === 'game'
      ? [
        { label: 'Text speed', value: 'textSpeed', detail: s.textSpeed },
        { label: 'Battle speed', value: 'battleSpeed', detail: s.battleSpeed },
        { label: 'Battle effects', value: 'battleAnimations', detail: s.battleAnimations ? 'on' : 'off' },
        { label: 'Always run', value: 'autoRun', detail: s.autoRun ? 'on' : 'off' },
        { label: 'Autosave', value: 'autosave', detail: s.autosave ? 'on' : 'off' },
        { label: 'Move hints', value: 'moveHints', detail: s.moveHints ? 'on' : 'off' },
        { label: 'Clock', value: 'useSystemClock', detail: s.useSystemClock ? 'system' : s.fixedTime },
        { label: 'Show FPS', value: 'showFps', detail: s.showFps ? 'on' : 'off' },
        { label: 'Music', value: 'musicVolume', detail: `${Math.round(s.musicVolume * 100)}%` },
        { label: 'Sound', value: 'sfxVolume', detail: `${Math.round(s.sfxVolume * 100)}%` },
      ]
      : [
        ...ACTIONS.map((a) => ({
          label: ACTION_LABELS[a],
          value: `key:${a}`,
          detail: game.input.bindings[a].map((c) => InputManager.label(c)).join(' / '),
        })),
        { label: 'Reset to defaults', value: 'resetKeys' },
      ];
    this.menu.setItems(items, true);
    this.menu.index = Math.min(idx, items.length - 1);
    this.menu.visible = this.tab === 'game' ? 10 : 9;
  }

  update(game: Game, _dt: number): void {
    if (this.rebinding) return;

    if (game.input.pressed('nextTab') || game.input.pressed('prevTab')) {
      this.tab = this.tab === 'game' ? 'keys' : 'game';
      this.menu.index = 0;
      this.menu.scroll = 0;
      this.rebuild(game);
      return;
    }

    // Left/right cycles a value without opening anything.
    if (this.tab === 'game') {
      if (game.input.repeated('left')) { this.cycle(game, -1); return; }
      if (game.input.repeated('right')) { this.cycle(game, 1); return; }
    }

    const res = this.menu.update(game);
    if (res === 'cancel') { game.persistSettings(); game.scenes.pop(); return; }
    if (res !== 'select') return;

    const value = this.menu.selectedValue ?? '';
    if (value === 'resetKeys') {
      game.input.resetBindings();
      this.rebuild(game);
      return;
    }
    if (value.startsWith('key:')) {
      const action = value.slice(4) as Action;
      this.rebinding = action;
      game.input.captureBinding((code) => {
        // Remove the key from any other action so bindings stay unambiguous.
        for (const a of ACTIONS) {
          if (a === action) continue;
          const next = game.input.bindings[a].filter((c) => c !== code);
          if (next.length !== game.input.bindings[a].length) game.input.setBinding(a, next);
        }
        game.input.setBinding(action, [code]);
        this.rebinding = null;
        this.rebuild(game);
        game.persistSettings();
      });
      return;
    }
    this.cycle(game, 1);
  }

  private cycle(game: Game, dir: number): void {
    const s = game.settings;
    const value = this.menu.selectedValue ?? '';
    switch (value) {
      case 'textSpeed': {
        const i = TEXT_SPEEDS.indexOf(s.textSpeed);
        s.textSpeed = TEXT_SPEEDS[(i + dir + TEXT_SPEEDS.length) % TEXT_SPEEDS.length]!;
        break;
      }
      case 'battleSpeed': {
        const i = BATTLE_SPEEDS.indexOf(s.battleSpeed);
        s.battleSpeed = BATTLE_SPEEDS[(i + dir + BATTLE_SPEEDS.length) % BATTLE_SPEEDS.length]!;
        break;
      }
      case 'battleAnimations': s.battleAnimations = !s.battleAnimations; break;
      case 'autoRun': s.autoRun = !s.autoRun; break;
      case 'autosave': s.autosave = !s.autosave; break;
      case 'moveHints': s.moveHints = !s.moveHints; break;
      case 'showFps': s.showFps = !s.showFps; break;
      case 'useSystemClock': {
        // Cycles system -> morning -> day -> evening -> night -> system.
        const order = ['system', 'morning', 'day', 'evening', 'night'] as const;
        const cur = s.useSystemClock ? 'system' : s.fixedTime;
        const i = order.indexOf(cur as typeof order[number]);
        const next = order[(i + dir + order.length) % order.length]!;
        s.useSystemClock = next === 'system';
        if (next !== 'system') s.fixedTime = next;
        break;
      }
      case 'musicVolume':
        s.musicVolume = Math.max(0, Math.min(1, Math.round((s.musicVolume + dir * 0.1) * 10) / 10));
        break;
      case 'sfxVolume':
        s.sfxVolume = Math.max(0, Math.min(1, Math.round((s.sfxVolume + dir * 0.1) * 10) / 10));
        break;
    }
    audio.setVolumes(s.musicVolume, s.sfxVolume);
    this.rebuild(game);
  }

  render(_game: Game, r: Renderer): void {
    r.clear('#26304a');
    for (let y = 0; y < SCREEN_H; y += 4) r.rect(0, y, SCREEN_W, 1, '#2b3652');

    (['game', 'keys'] as Tab[]).forEach((t, i) => {
      const x = 6 + i * 70;
      const active = t === this.tab;
      r.window(x, active ? 2 : 4, 66, active ? 16 : 14, { fill: active ? '#f0f2f8' : '#c8cede' });
      r.text(t === 'game' ? 'GAMEPLAY' : 'CONTROLS', x + 8, active ? 7 : 8, {
        color: active ? '#282838' : '#5a6274',
      });
    });

    this.menu.render(r, 6, 22, SCREEN_W - 12, { rowHeight: 12 });

    r.window(6, SCREEN_H - 22, SCREEN_W - 12, 18);
    if (this.rebinding) {
      r.text(`Press a key for ${ACTION_LABELS[this.rebinding]}...`, 12, SCREEN_H - 17, { color: '#c04848' });
    } else {
      r.text(this.tab === 'game' ? 'Left/Right changes a value' : 'Enter to rebind',
        12, SCREEN_H - 17, { color: '#485068' });
      r.text('X switches tab', SCREEN_W - 14, SCREEN_H - 17, { color: '#6a7490', align: 'right' });
    }
  }
}

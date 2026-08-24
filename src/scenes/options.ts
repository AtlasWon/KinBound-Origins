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
import { ListMenu, navLeft, navRight, type MenuItem } from '../ui/menu.js';
import { ACTIONS, DEFAULT_BINDINGS, InputManager, type Action } from '../core/input.js';
import { audio } from '../audio/audio.js';
import { fit, GAP } from '../ui/layout.js';

type Tab = 'game' | 'keys';

/**
 * The measured slots this screen is built from.
 *
 * The list used to be told to show ten rows of twelve units in a gap 116 tall.
 * It drew 128, so the bottom row was cut in half by its own frame and the last
 * value bled into the hint bar underneath. Naming the bands here and asking the
 * list to fit the one it has been given is what stops that recurring the next
 * time a setting is added.
 */
const TAB_BAND = { y: 2, h: 16 };
const LIST_Y = 22;
const HINT = { h: 18, y: SCREEN_H - 22 };
const LIST_H = HINT.y - LIST_Y - 3;

const TEXT_SPEEDS = ['slow', 'normal', 'fast', 'instant'] as const;
const BATTLE_SPEEDS = ['classic', 'brisk', 'fast'] as const;

const ACTION_LABELS: Record<Action, string> = {
  up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right',
  confirm: 'Confirm', cancel: 'Cancel', menu: 'Menu',
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
    // However many rows the slot holds -- never however many someone hoped it
    // would hold.
    this.menu.fitTo(LIST_H, { rowHeight: 12 });
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

    // Left/right cycles a value without opening anything. Read through the nav
    // helpers so A/D and the arrows both work even after a rebind.
    if (this.tab === 'game') {
      if (navLeft(game)) { this.cycle(game, -1); return; }
      if (navRight(game)) { this.cycle(game, 1); return; }
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
        // Escape backs out of a rebind. Without this the only way to leave the
        // prompt was to spend a key on the setting you had opened by mistake.
        if (code === 'Escape' && !game.input.bindings[action].includes('Escape')) {
          this.rebinding = null;
          return;
        }
        // Remove the key from any other action so bindings stay unambiguous --
        // but never to the point of leaving that action with nothing at all.
        // Stripping the last key off "Move down" strands the player in this
        // very list, unable to reach "Reset to defaults" to undo it, so an
        // action that would be emptied falls back to its shipped keys instead.
        for (const a of ACTIONS) {
          if (a === action) continue;
          const next = game.input.bindings[a].filter((c) => c !== code);
          if (next.length === game.input.bindings[a].length) continue;
          game.input.setBinding(a, next.length > 0
            ? next
            : DEFAULT_BINDINGS[a].filter((c) => c !== code));
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

    // Tabs are sized to their own captions and centred in them, so a longer
    // word can never sit on the frame the way it did at a fixed 66 units.
    const labels: [Tab, string][] = [['game', 'GAMEPLAY'], ['keys', 'CONTROLS']];
    let tx = 6;
    for (const [t, label] of labels) {
      const active = t === this.tab;
      const w = r.textWidth(label) + 18;
      const h = active ? TAB_BAND.h : TAB_BAND.h - 2;
      const y = active ? TAB_BAND.y : TAB_BAND.y + 2;
      r.window(tx, y, w, h, { fill: active ? '#f0f2f8' : '#c8cede' });
      r.text(label, tx + Math.floor(w / 2), y + Math.floor((h - 7) / 2), {
        color: active ? '#282838' : '#5a6274', align: 'center',
      });
      tx += w + 6;
    }

    // The tab hint belongs up here beside the tabs it is talking about. It used
    // to share the bottom bar with the contextual hint and the two ran into
    // each other: the screen read "changes a valueX switches tab".
    r.text('X switches tab', SCREEN_W - 6, TAB_BAND.y + 5, {
      color: '#8894b4', align: 'right',
    });

    this.menu.render(r, 6, LIST_Y, SCREEN_W - 12, { rowHeight: 12 });

    r.window(6, HINT.y, SCREEN_W - 12, HINT.h);
    const hintX = 12;
    const hintW = SCREEN_W - 12 - 12 - 6;
    const hintY = HINT.y + Math.floor((HINT.h - 7) / 2);
    if (this.rebinding) {
      r.text(fit(r, `Press a key for ${ACTION_LABELS[this.rebinding]}, Esc to cancel`, hintW),
        hintX, hintY, { color: '#c04848' });
    } else {
      const back = 'Esc back';
      const backW = r.textWidth(back);
      r.text(fit(r, this.tab === 'game' ? 'Left/Right changes a value' : 'Enter to rebind',
        hintW - backW - GAP), hintX, hintY, { color: '#485068' });
      r.text(back, hintX + hintW, hintY, { color: '#6a7490', align: 'right' });
    }
  }
}

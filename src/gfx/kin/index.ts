/**
 * The design lookup.
 *
 * Every hand-authored Kin lives in one of the group files and is merged here
 * into a single record keyed by species id. `kinsprite.ts` consults it once per
 * sprite: if an id has a design, the design draws the creature; if it does not,
 * the old body plan draws it exactly as before. That is the whole migration
 * path -- forty-eight species can be converted one at a time, by different
 * people, without any of them touching a shared file.
 *
 * A duplicate id between two groups is a bug: two agents have claimed the same
 * species. It is reported at load rather than silently resolved, because the
 * alternative is one of them quietly losing a day's work.
 */

import type { Pen } from './parts.js';
import { DESIGNS as STARTERS } from './designs/starters.js';
import { DESIGNS as GROUP_A } from './designs/group_a.js';
import { DESIGNS as GROUP_B } from './designs/group_b.js';
import { DESIGNS as GROUP_C } from './designs/group_c.js';
import { DESIGNS as GROUP_D } from './designs/group_d.js';
import { DESIGNS as GROUP_E } from './designs/group_e.js';
import { DESIGNS as GROUP_F } from './designs/group_f.js';
import { DESIGNS as GROUP_G } from './designs/group_g.js';
import { DESIGNS as GROUP_H } from './designs/group_h.js';

export type DesignFn = (p: Pen) => void;

const GROUPS: Array<[string, Record<string, DesignFn>]> = [
  ['starters', STARTERS],
  ['group_a', GROUP_A], ['group_b', GROUP_B], ['group_c', GROUP_C], ['group_d', GROUP_D],
  ['group_e', GROUP_E], ['group_f', GROUP_F], ['group_g', GROUP_G], ['group_h', GROUP_H],
];

export const DESIGNS: Record<string, DesignFn> = (() => {
  const out: Record<string, DesignFn> = {};
  const owner: Record<string, string> = {};
  for (const [name, group] of GROUPS) {
    for (const id of Object.keys(group)) {
      if (owner[id] !== undefined) {
        console.warn(`kin design: "${id}" is claimed by both ${owner[id]} and ${name}; ${name} wins`);
      }
      owner[id] = name;
      out[id] = group[id]!;
    }
  }
  return out;
})();

/** Which group owns a species, for tooling and for the record. */
export function designGroups(): Array<[string, string[]]> {
  return GROUPS.map(([name, group]) => [name, Object.keys(group)] as [string, string[]]);
}

/**
 * Design group A.
 *
 * One agent owns this file and nothing else. Add an entry per species id, each
 * a function that draws that creature and only that creature. Nothing outside
 * this file needs to change for a design to go live: `kin/index.ts` merges
 * every group, and `kinsprite.ts` runs a design in place of the body plan
 * whenever one exists for the id.
 *
 * See `kin/parts.ts` for the toolkit and `kin/designs/starters.ts` for three
 * worked examples of the standard this is aiming at.
 */

import type { Pen } from '../parts.js';

export const DESIGNS: Record<string, (p: Pen) => void> = {
};

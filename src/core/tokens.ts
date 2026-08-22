/**
 * Text tokens.
 *
 * Authored dialogue cannot know what the player called themselves, so it writes
 * {name} and this resolves it at the moment the line is shown. One small table
 * rather than threading the game state through every text path -- the state
 * publishes to it whenever the name changes, and anything that draws words can
 * ask without knowing where the answer came from.
 *
 * An unknown token is left exactly as written. A line that reads "{nmae}" on
 * screen is a typo somebody can see and fix; one that silently renders as an
 * empty gap is a typo nobody ever finds.
 */

const values = new Map<string, string>();

export function setToken(key: string, value: string): void {
  values.set(key, value);
}

export function getToken(key: string): string | undefined {
  return values.get(key);
}

export function resolveTokens(text: string): string {
  if (!text.includes('{')) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => values.get(key) ?? whole);
}

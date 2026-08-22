import test from 'node:test';
import assert from 'node:assert/strict';
import { ListMenu } from '../build/js/ui/menu.js';

test('the cursor never rests on a row that cannot be chosen', () => {
  // This is the forced-switch case: the fainted lead is disabled, and a cursor
  // parked on it would leave Confirm doing nothing at all.
  const menu = new ListMenu([
    { label: 'Fainted lead', value: 0, enabled: false },
    { label: 'Healthy', value: 1 },
    { label: 'Healthy too', value: 2 },
  ], 6);
  assert.equal(menu.index, 1, 'should skip the disabled first row');
  assert.equal(menu.selectedValue, 1);
});

test('rebuilding a list moves the cursor off a row that just became disabled', () => {
  const menu = new ListMenu([
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ], 6);
  menu.index = 1;
  menu.setItems([
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b', enabled: false },
    { label: 'C', value: 'c' },
  ], true);
  assert.notEqual(menu.selectedValue, 'b');
  assert.ok(menu.items[menu.index].enabled !== false);
});

test('the cursor lands on the nearest usable row, not always the first', () => {
  const menu = new ListMenu([
    { label: '0', value: 0 },
    { label: '1', value: 1, enabled: false },
    { label: '2', value: 2, enabled: false },
    { label: '3', value: 3, enabled: false },
    { label: '4', value: 4 },
  ], 6);
  menu.index = 3;
  menu.setItems(menu.items, true);
  assert.equal(menu.selectedValue, 4, 'index 3 is closer to 4 than to 0');
});

test('an all-disabled list is left alone rather than looping', () => {
  const menu = new ListMenu([
    { label: 'Nothing here.', value: '', enabled: false },
  ], 6);
  assert.equal(menu.index, 0);
  assert.equal(menu.items.length, 1);
});

test('move() skips disabled rows and wraps', () => {
  const menu = new ListMenu([
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b', enabled: false },
    { label: 'C', value: 'c' },
  ], 6);
  menu.index = 0;
  menu.move(1);
  assert.equal(menu.selectedValue, 'c', 'should hop over the disabled row');
  menu.move(1);
  assert.equal(menu.selectedValue, 'a', 'should wrap back to the top');
});

test('scrolling keeps the selected row on screen', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ label: `row ${i}`, value: i }));
  const menu = new ListMenu(items, 5);
  for (let i = 0; i < 12; i++) menu.move(1);
  assert.ok(menu.index >= menu.scroll && menu.index < menu.scroll + menu.visible,
    `index ${menu.index} outside window ${menu.scroll}..${menu.scroll + menu.visible}`);
  assert.ok(menu.scroll + menu.visible <= items.length);
});

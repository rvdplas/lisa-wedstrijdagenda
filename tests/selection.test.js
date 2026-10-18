import assert from "node:assert/strict";
import { test } from "node:test";
import { page } from "./helpers.js";

const entry = (key, date, cancelled = false) => ({ key, date, cancelled });

test("matches are selected by default, cancelled ones never, and selection is explicit per key", async t => {
  const dom = await page();
  t.after(() => dom.window.close());
  const { LisaSelection } = dom.window;
  const entries = [entry("a", "2099-01-02"), entry("b", "2099-01-02"), entry("c", "2099-01-03", true)];
  const selection = LisaSelection.create();
  assert.deepEqual(selection.selected(entries).map(item => item.key), ["a", "b"]);
  selection.set("a", false);
  assert.deepEqual(selection.selected(entries).map(item => item.key), ["b"]);
  selection.set("c", true);
  assert.equal(selection.isSelected(entries[2]), false);
  selection.setAll(entries, false);
  assert.equal(selection.selected(entries).length, 0);
  selection.setAll(entries, true);
  assert.deepEqual(selection.selected(entries).map(item => item.key), ["a", "b"]);
});

test("entries are grouped by date in chronological order with Dutch labels", async t => {
  const dom = await page();
  t.after(() => dom.window.close());
  const groups = dom.window.LisaSelection.groupByDate([
    entry("c", "2099-02-01"), entry("a", "2026-10-24"), entry("b", "2026-10-24"),
  ]);
  assert.equal(JSON.stringify(groups.map(group => group.items.map(item => item.key))), '[["a","b"],["c"]]');
  assert.equal(groups[0].label, "zaterdag 24 oktober");
});

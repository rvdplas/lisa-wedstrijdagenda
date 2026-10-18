import assert from "node:assert/strict";
import { test } from "node:test";
import { source } from "./helpers.js";

test("MV3 manifest loads existing local assets with only storage permission and Lisa scope", async () => {
  const manifest = JSON.parse(await source("manifest.json"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.equal(manifest.host_permissions, undefined);
  const assets = [manifest.action.default_popup, "popup.css", "popup.js"];
  for (const script of manifest.content_scripts) {
    assert.deepEqual(script.matches, ["https://mijn.lisahockey.nl/*"]);
    assets.push(...script.js, ...(script.css || []));
  }
  for (const asset of assets) assert.ok((await source(asset)).length > 0, asset);
  assert.equal(manifest.content_scripts[0].world, "MAIN");
  assert.deepEqual(manifest.content_scripts[1].js, ["attendees.js", "calendar.js", "lisa.js", "bulk.js", "selection.js", "panel-styles.js", "panel.js", "content.js"]);
  const popup = await source(manifest.action.default_popup);
  assert.ok(popup.indexOf('src="attendees.js"') < popup.indexOf('src="popup.js"'));
});

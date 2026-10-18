import assert from "node:assert/strict";
import { test } from "node:test";
import { page, cardHTML, sample, attachVue, storageMock, source, until } from "./helpers.js";

async function setup(t, specs, { settings = { agendaName: "Sake" } } = {}) {
  const dom = await page('<div id="tilesContainer"></div>');
  t.after(() => dom.window.close());
  const { window } = dom;
  const container = window.document.querySelector("#tilesContainer");
  const tiles = [];
  const add = (spec, index = tiles.length) => {
    container.insertAdjacentHTML("beforeend", cardHTML({
      cancelled: spec.cancelled, player: spec.player ?? "Testspeler",
    }));
    const card = container.lastElementChild;
    tiles.push({ card, data: { ...sample, id: `m${index}`, date: "2099-01-01", ...spec.data } });
    attachVue(dom, tiles);
    return card;
  };
  specs.forEach(add);
  const getSettings = storageMock(window, settings);
  const downloads = [];
  window.Blob = Blob;
  window.URL.createObjectURL = value => { downloads.push(value); return "blob:fixture"; };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  window.eval(await source("bridge.js"));
  window.eval(await source("content.js"));
  const host = () => window.document.querySelector("[data-lisa-agenda-panel]");
  await until(() => host()?.shadowRoot.querySelector(".badge")?.textContent && !/laden/.test(host().shadowRoot.querySelector(".badge").textContent));
  const $ = selector => host().shadowRoot.querySelector(selector);
  const $$ = selector => [...host().shadowRoot.querySelectorAll(selector)];
  const events = async () => (await downloads.find(item => item instanceof Blob).text()).split("BEGIN:VEVENT").length - 1;
  return { dom, window, container, add, host, $, $$, downloads, events, getSettings };
}

const bare = s => s.textContent.replace(/\s+/g, " ").trim();

test("no upcoming events shows an empty state and a disabled download button", async t => {
  const { $ } = await setup(t, []);
  assert.match(bare($(".empty")), /Geen komende wedstrijden/);
  assert.equal($(".primary").disabled, true);
  assert.equal($(".toggle").hidden, true);
  assert.equal(bare($(".badge")), "Niets te exporteren");
});

test("one upcoming match is ready, downloads once and explains the one-time import", async t => {
  const { $, downloads, events } = await setup(t, [{}]);
  assert.equal(bare($(".badge")), "Klaar om te exporteren");
  assert.equal(bare($(".primary")), "Download agenda (1)");
  assert.match(bare($(".note")), /Eenmalige import.*niet automatisch/);
  $(".primary").click();
  await until(() => downloads.includes("lisa-komende-wedstrijden.ics"));
  assert.equal(await events(), 1);
  await until(() => /gedownload/.test(bare($(".feedback"))));
  assert.match(bare($(".feedback")), /eenmalige import/);
  assert.equal($(".feedback").dataset.tone, "success");
});

test("matches on different dates are grouped by date and exported together", async t => {
  const { $, $$, downloads, events } = await setup(t, [
    { data: { date: "2099-03-07" } }, { data: { date: "2099-01-03" } }, { data: { date: "2099-01-03", memberId: "p2" } },
  ]);
  assert.deepEqual($$(".group h3").map(bare), ["zaterdag 3 januari", "zaterdag 7 maart"]);
  assert.deepEqual($$(".group").map(group => group.querySelectorAll("input").length), [2, 1]);
  $(".primary").click();
  await until(() => downloads.length);
  assert.equal(await events(), 3);
});

test("duplicate representations are counted, not listed or exported twice", async t => {
  const { $, $$, downloads, events } = await setup(t, [{ data: { id: "same" } }, { data: { id: "same" } }, { data: { id: "same", memberId: "p2" } }]);
  assert.equal($$("input[data-key]").length, 2);
  assert.match(bare($(".metrics")), /1 dubbele kaart overgeslagen/);
  $(".primary").click();
  await until(() => downloads.length);
  assert.equal(await events(), 2);
});

test("cancelled matches are listed, unselectable, and excluded from the file", async t => {
  const { $, $$, downloads, events } = await setup(t, [{}, { cancelled: true }]);
  const [active, cancelled] = $$("input[data-key]");
  assert.equal(active.checked, true);
  assert.equal(cancelled.checked, false);
  assert.equal(cancelled.disabled, true);
  assert.match(bare($(".tag[data-tone=cancelled]")), /Afgelast/);
  assert.match(bare($(".metrics")), /1 afgelast/);
  $(".primary").click();
  await until(() => downloads.length);
  assert.equal(await events(), 1);
});

test("deselecting an entry updates counts and the file contains exactly the selection", async t => {
  const { $, $$, downloads, events, window } = await setup(t, [{ data: { date: "2099-01-03" } }, { data: { date: "2099-02-04" } }]);
  $(".toggle").click();
  assert.equal($(".toggle").getAttribute("aria-expanded"), "true");
  assert.equal($(".selection").hidden, false);
  const first = $$("input[data-key]")[0];
  first.click();
  assert.equal(bare($(".primary")), "Download agenda (1)");
  assert.match(bare($(".toggle")), /1 van 2 wedstrijden/);
  $(".primary").click();
  await until(() => downloads.length);
  const text = (await downloads[0].text()).replace(/\r\n /g, "");
  assert.equal(await events(), 1);
  assert.ok(text.includes("DTSTART:20990204") && !text.includes("DTSTART:20990103"));
  assert.ok(window.document.querySelectorAll("[data-lisa-agenda-panel]").length === 1);
});

test("deselecting everything disables download and select-all restores it", async t => {
  const { $, $$ } = await setup(t, [{}, {}]);
  $("[data-all=off]").click();
  assert.equal($(".primary").disabled, true);
  assert.equal(bare($(".badge")), "Niets geselecteerd");
  assert.equal($$("input[data-key]").some(input => input.checked), false);
  $("[data-all=on]").click();
  assert.equal($(".primary").disabled, false);
  assert.equal(bare($(".primary")), "Download agenda (2)");
});

test("without a saved name the panel explains how to continue and reacts to saving one", async t => {
  const { $, window } = await setup(t, [{}], { settings: {} });
  assert.equal($(".primary").disabled, true);
  assert.match(bare($(".feedback")), /Stel eerst via het extensie-icoon/);
  await window.chrome.storage.local.set({ agendaName: "Sake" });
  await until(() => !$(".primary").disabled);
  assert.equal($(".primary").disabled, false);
});

test("downloads use the selected profile's agenda name and invitees", async t => {
  const { $, downloads } = await setup(t, [{ player: "Mila" }], {
    settings: {
      profiles: [
        { id: "first", name: "Noor", playerName: "Noor", agendaName: "Noor", attendeeEmails: "noor@example.nl" },
        { id: "second", name: "Mila", playerName: "Mila", agendaName: "Mila", attendeeEmails: "mila@example.nl" },
      ],
      selectedProfileId: "second",
    },
  });

  assert.equal(bare($(".active-profile")), "Actief profiel: Mila");
  $(".primary").click();
  await until(() => downloads.some(item => item instanceof Blob));
  const text = (await downloads.find(item => item instanceof Blob).text()).replaceAll("\r\n ", "");
  assert.match(text, /SUMMARY:\[Mila\]/);
  assert.match(text, /ATTENDEE;[^:]+:mailto:mila@example\.nl/);
  assert.doesNotMatch(text, /noor@example\.nl/);
});

test("active player profile filters matches and exports with that profile's agenda name", async t => {
  const { $, $$, downloads, window } = await setup(t, [
    { player: "Noor Jansen", data: { id: "noor-match", memberId: "noor", opponentTeam: "JO14-3" } },
    { player: "Mila Jansen", data: { id: "mila-match", memberId: "mila" } },
  ], {
    settings: {
      profiles: [
        { id: "noor", name: "Noor Jansen", agendaName: "Noor", attendeeEmails: "" },
        { id: "mila", name: "Mila Jansen", agendaName: "Mila", attendeeEmails: "" },
      ],
      selectedProfileId: "mila",
    },
  });
  assert.equal($$("input[data-key]").length, 1);
  assert.equal($$(".item b").map(bare)[0], "FIT JO14-2");
  assert.equal(bare($(".active-profile")), "Actief profiel: Mila Jansen");
  $(".primary").click();
  await until(() => downloads.some(item => item instanceof Blob));
  const text = (await downloads.find(item => item instanceof Blob).text()).replaceAll("\r\n ", "");
  assert.match(text, /SUMMARY:\[Mila\]/);
  assert.match(text, /FIT JO14-2/);
  assert.doesNotMatch(text, /FIT JO14-3/);
  await window.chrome.storage.local.set({ selectedProfileId: "noor" });
  await until(() => $$(".item b").some(item => bare(item) === "FIT JO14-3"));
  assert.equal($$("input[data-key]").length, 1);
  assert.equal(bare($(".active-profile")), "Actief profiel: Noor Jansen");
});

test("dynamic updates add entries without duplicating the panel, and navigation removes and restores it", async t => {
  const { $, window, container, add, host } = await setup(t, [{}]);
  add({ data: { date: "2099-02-02" } });
  await until(() => bare($(".primary")) === "Download agenda (2)");
  window.document.body.append(window.document.createElement("p"));
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.equal(window.document.querySelectorAll("[data-lisa-agenda-panel]").length, 1);
  container.remove();
  await until(() => !host());
  window.document.querySelector("#app").append(container);
  await until(() => host());
  assert.equal(window.document.querySelectorAll("[data-lisa-agenda-panel]").length, 1);
  assert.equal(host().nextElementSibling, container);
});

test("a match that cannot be read is reported while the others are still downloaded", async t => {
  const { $, $$, downloads, events, window } = await setup(t, [{}, { data: { opponentTeam: "Onbekend" } }]);
  window.console.error = () => {};
  $(".primary").click();
  await until(() => $(".feedback")?.dataset.tone === "warning" && downloads.length);
  assert.equal(await events(), 1);
  assert.equal($$(".feedback li").length, 1);
  assert.match(bare($(".feedback li")), /THUIS\/UIT/);
});

test("controls are native, labelled elements reachable by keyboard", async t => {
  const { $, $$ } = await setup(t, [{}]);
  assert.equal($(".toggle").tagName, "BUTTON");
  assert.equal($(".toggle").getAttribute("aria-controls"), $(".selection").id);
  assert.equal($("section.panel").getAttribute("aria-labelledby"), "ha-title");
  assert.ok($$("label.item input[type=checkbox]").length);
  assert.equal($(".feedback").getAttribute("aria-live"), "polite");
});

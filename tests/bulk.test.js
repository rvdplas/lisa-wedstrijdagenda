import assert from "node:assert/strict";
import { test } from "node:test";
import { page, cardHTML, sample, detailsHTML, attachVue, storageMock, source, until } from "./helpers.js";

const now = Date.UTC(2026, 9, 18, 20);

function addCard(dom, data = {}, { collapsed = false, cancelled = false, player = "Testspeler" } = {}) {
  const container = dom.window.document.querySelector("#tilesContainer");
  container.insertAdjacentHTML("afterbegin", cardHTML({ details: !collapsed, cancelled, player }));
  const card = container.querySelector(".el-card");
  card.setAttribute("data-lisa-agenda-match", JSON.stringify({ ...sample, ...data }));
  if (collapsed) card.querySelector(".tile-content").addEventListener("click", () => {
    setTimeout(() => card.querySelector(".el-card__body").insertAdjacentHTML("beforeend", detailsHTML), 5);
  });
  return card;
}

test("loads every Laat meer zien page including a training-only page before collecting matches", async t => {
  const dom = await page('<div id="tilesContainer"><button id="showMoreBtn">Laat meer zien</button></div>');
  t.after(() => dom.window.close());
  const container = dom.window.document.querySelector("#tilesContainer");
  const button = container.querySelector("button");
  const scrollCalls = [];
  dom.window.scrollTo = (...position) => scrollCalls.push(position);
  addCard(dom, { date: "2026-10-18" }, { collapsed: true });
  let clicks = 0;
  button.addEventListener("click", () => {
    const current = ++clicks;
    setTimeout(() => {
      if (current === 1) container.insertAdjacentHTML("afterbegin", '<div class="tile-content">Training</div>');
      if (current === 2) addCard(dom, { id: "later-match", date: "2027-01-02", timeKnown: false });
      if (current === 3) {
        addCard(dom, { id: "last-match", date: "2027-02-06" });
        button.remove();
      }
    }, 5);
  });
  const result = await dom.window.LisaBulk.collect(container, "Sake", { privateEvent: true, attendeeEmails: "ouder@example.nl" }, () => {}, now);
  assert.equal(clicks, 3);
  assert.deepEqual(scrollCalls, [[0, 0]]);
  assert.equal(result.count, 3);
  assert.equal(result.errors.length, 0);
  const text = result.file.text.replace(/\r\n /g, "");
  assert.equal(text.split("BEGIN:VCALENDAR").length - 1, 1);
  assert.equal(text.split("END:VCALENDAR").length - 1, 1);
  assert.equal(text.split("BEGIN:VEVENT").length - 1, 3);
  assert.equal(text.split("CLASS:PRIVATE").length - 1, 3);
  assert.equal(text.split("mailto:ouder@example.nl").length - 1, 3);
  assert.match(text, /DTSTART;VALUE=DATE:20270102/);
});

test("returns Lisa's activity scroll container to the top after its delayed scroll update", async t => {
  const dom = await page('<div class="app-content"><div id="tilesContainer"><button id="showMoreBtn">Laat meer zien</button></div></div>');
  t.after(() => dom.window.close());
  const { document } = dom.window;
  const container = document.querySelector("#tilesContainer");
  const scrollRegion = document.querySelector(".app-content");
  Object.defineProperties(scrollRegion, {
    clientHeight: { value: 100 },
    scrollHeight: { value: 1000 },
  });
  scrollRegion.style.overflowY = "auto";
  scrollRegion.scrollTop = 0;
  document.documentElement.scrollTop = 480;
  dom.window.scrollTo = (x, y) => { document.documentElement.scrollTop = y; };
  container.querySelector("button").addEventListener("click", event => {
    container.insertAdjacentHTML("beforeend", '<div class="tile-content">Activiteit</div>');
    event.currentTarget.remove();
    setTimeout(() => {
      scrollRegion.scrollTop = 5536;
      scrollRegion.dispatchEvent(new dom.window.Event("scroll"));
    }, 100);
  });

  await dom.window.LisaBulk.loadAll(container, () => {}, 50);
  await new Promise(resolve => setTimeout(resolve, 150));

  assert.equal(document.documentElement.scrollTop, 0);
  assert.equal(scrollRegion.scrollTop, 0);
});

test("keeps today and different players, skips the past, cancellations and all cards without player names", async t => {
  const dom = await page('<div id="tilesContainer"></div>');
  t.after(() => dom.window.close());
  const container = dom.window.document.querySelector("#tilesContainer");
  addCard(dom, { date: "2026-10-17", id: "past" });
  addCard(dom, { date: "2026-10-18" });
  addCard(dom, { memberId: "second-player" });
  addCard(dom, { relationType: "favorite" }, { player: null });
  addCard(dom, { date: "2026-10-18" });
  addCard(dom, { id: "cancelled" }, { cancelled: true });
  addCard(dom, { id: "standalone-favorite", memberId: "", relationType: "favorite" }, { player: "" });
  addCard(dom, { id: "unnamed-personal" }, { player: "   " });
  const result = await dom.window.LisaBulk.collect(container, "Sake", {}, () => {}, now);
  assert.equal(result.count, 2);
  assert.equal(result.duplicates, 1);
  assert.equal(result.cancelled, 1);
  assert.equal(result.errors.length, 0);
});

test("partial failures report each missing match while retaining successful events", async t => {
  const dom = await page('<div id="tilesContainer"></div>');
  t.after(() => dom.window.close());
  const container = dom.window.document.querySelector("#tilesContainer");
  addCard(dom, { id: "good" });
  addCard(dom, { id: "bad-team", opponentTeam: "Onbekend" });
  addCard(dom, { date: "" });
  dom.window.console.error = () => {};
  const result = await dom.window.LisaBulk.collect(container, "Sake", {}, () => {}, now);
  assert.equal(result.count, 1);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors.join("\n"), /datum/);
  assert.match(result.errors.join("\n"), /THUIS\/UIT/);
});

test("no upcoming matches produces no file and today uses Dutch time at the date boundary", async t => {
  const dom = await page('<div id="tilesContainer"></div>');
  t.after(() => dom.window.close());
  const container = dom.window.document.querySelector("#tilesContainer");
  const result = await dom.window.LisaBulk.collect(container, "Sake", {}, () => {}, now);
  assert.equal(result.count, 0);
  assert.equal(result.file, null);
  assert.equal(dom.window.LisaBulk.today(Date.UTC(2026, 9, 18, 22, 30)), "2026-10-19");
});

test("unnamed cards are excluded before metadata and details are read, including after pagination", async t => {
  const dom = await page('<div id="tilesContainer"><button id="showMoreBtn">Laat meer zien</button></div>');
  t.after(() => dom.window.close());
  dom.window.scrollTo = () => {};
  const container = dom.window.document.querySelector("#tilesContainer");
  const unnamed = addCard(dom, {}, { player: null, collapsed: true });
  unnamed.removeAttribute("data-lisa-agenda-match");
  let opened = false;
  unnamed.querySelector(".tile-content").addEventListener("click", () => { opened = true; });
  const button = container.querySelector("#showMoreBtn");
  button.addEventListener("click", () => {
    addCard(dom, { id: "later-unnamed" }, { player: null });
    addCard(dom, { id: "named" });
    button.remove();
  });
  const result = await dom.window.LisaBulk.collect(container, "Testspeler", {}, () => {}, now);
  assert.equal(result.count, 1);
  assert.equal(result.errors.length, 0);
  assert.equal(opened, false);
});

test("bulk includes today's all-day match using its visible date even when raw date is yesterday", async t => {
  const dom = await page('<div id="tilesContainer"></div>');
  t.after(() => dom.window.close());
  const container = dom.window.document.querySelector("#tilesContainer");
  const card = addCard(dom, { date: "2026-10-30T23:00:00Z", timeKnown: false });
  const day = dom.window.document.createElement("div");
  day.className = "tile-day";
  day.innerHTML = '<div class="mb-3"><div class="h6 mb-2 text-muted">zaterdag 31 oktober 2026</div></div>';
  container.append(day);
  day.querySelector(".mb-3").append(card);
  const result = await dom.window.LisaBulk.collect(container, "Testspeler", {}, () => {}, Date.UTC(2026, 9, 31, 12));
  assert.equal(result.count, 1);
  assert.equal(result.errors.length, 0);
  assert.match(result.file.text, /DTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261101/);
});

test("stalled pagination reports failure rather than looping or claiming everything loaded", async t => {
  const dom = await page('<div id="tilesContainer"><button id="showMoreBtn">Laat meer zien</button></div>');
  t.after(() => dom.window.close());
  const container = dom.window.document.querySelector("#tilesContainer");
  const scrollCalls = [];
  dom.window.scrollTo = (...position) => scrollCalls.push(position);
  await assert.rejects(dom.window.LisaBulk.loadAll(container, () => {}, 10), /mogelijk onvolledig/);
  assert.deepEqual(scrollCalls, [[0, 0]]);
});

test("pagination failure still exports available matches with an explicit incomplete-list warning", async t => {
  const dom = await page('<div id="tilesContainer"><button id="showMoreBtn" disabled>Laat meer zien</button></div>');
  t.after(() => dom.window.close());
  const container = dom.window.document.querySelector("#tilesContainer");
  addCard(dom);
  dom.window.console.error = () => {};
  const result = await dom.window.LisaBulk.collect(container, "Sake", {}, () => {}, now);
  assert.equal(result.count, 1);
  assert.ok(result.file);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /mogelijk onvolledig/);
});

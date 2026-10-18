import assert from "node:assert/strict";
import { test } from "node:test";
import { page, attachMetadata, attachVue, sample, source, cardHTML, detailsHTML } from "./helpers.js";

test("all-day export follows the visible October 31 date instead of the raw previous-day value", async t => {
  const dom = await page(`<div class="tile-day"><div class="mb-3"><div class="h6 mb-2 text-muted">zaterdag 31 oktober 2026</div>${cardHTML()}</div></div>`);
  t.after(() => dom.window.close());
  const card = attachMetadata(dom, { timeKnown: false, date: "2026-10-30T23:00:00Z" });
  const file = await dom.window.LisaCalendar.create(dom.window.LisaPage.read(card), "Testspeler");
  assert.match(file.text, /DTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261101/);
});

test("visible day headings preserve month/year boundaries and timed-event dates", async t => {
  for (const [heading, date, expected] of [
    ["zaterdag 31 oktober 2026", "2026-10-30T23:00:00Z", "2026-10-31"],
    ["zaterdag 7 november 2026", "2026-11-06", "2026-11-07"],
    ["vrijdag 1 januari 2027", "2026-12-31T23:00:00Z", "2027-01-01"],
    ["dinsdag 29 februari 2028", "2028-02-28T23:00:00Z", "2028-02-29"],
    ["Saturday 31 October 2026", "2026-10-30", "2026-10-31"],
  ]) {
    await t.test(heading, async t => {
      const dom = await page(`<div class="tile-day"><div class="mb-3"><div class="h6 mb-2 text-muted">${heading}</div>${cardHTML()}</div></div>`);
      t.after(() => dom.window.close());
      const card = attachMetadata(dom, { date });
      const match = dom.window.LisaPage.read(card);
      assert.equal(match.date, expected);
      const file = await dom.window.LisaCalendar.create(match, "Testspeler");
      assert.match(file.text, new RegExp(`DTSTART:${expected.replaceAll("-", "")}T`));
    });
  }
});

test("an unreadable or invalid visible date is reported instead of using a conflicting raw date", async t => {
  for (const heading of ["onbekende datum", "maandag 31 februari 2026"]) {
    const dom = await page(`<div class="tile-day"><div class="mb-3"><div class="h6">${heading}</div>${cardHTML()}</div></div>`);
    t.after(() => dom.window.close());
    const card = attachMetadata(dom);
    assert.throws(() => dom.window.LisaPage.metadata(card), /datum/);
  }
});

test("reads real Lisa selectors, away/home perspective and club name abbreviation", async t => {
  const dom = await page();
  t.after(() => dom.window.close());
  const card = attachMetadata(dom);
  const match = dom.window.LisaPage.read(card);
  assert.equal(match.side, "UIT");
  assert.equal(match.opponent, "FIT JO14-2");
  assert.equal(match.meetingTime, "11:35");
  assert.equal(match.startTime, "12:45");
  assert.equal(match.location, "Sportpark 'Kadoelen', Veld 3");
  assert.ok(!JSON.stringify(match).includes("PRIVATE"));
  attachMetadata(dom, { opponentClub: "H.V. De Terriers", opponentTeam: "JO14-1 T/C" });
  assert.equal(dom.window.LisaPage.read(card).side, "THUIS");
});

test("fails visibly rather than guessing on changed or ambiguous Lisa data", async t => {
  const dom = await page();
  t.after(() => dom.window.close());
  const card = dom.window.document.querySelector(".el-card");
  assert.throws(() => dom.window.LisaPage.read(card), /paginastructuur/);
  attachMetadata(dom, { opponentTeam: "Onbekend" });
  assert.throws(() => dom.window.LisaPage.read(card), /THUIS\/UIT/);
  attachMetadata(dom, { timeKnown: null });
  assert.throws(() => dom.window.LisaPage.read(card), /onvolledig/);
  card.setAttribute("data-lisa-agenda-match", "{");
  assert.throws(() => dom.window.LisaPage.read(card), /ongeldig/);
});

test("MAIN bridge traverses production Vue tree and exposes only whitelisted match data", async t => {
  const dom = await page();
  t.after(() => dom.window.close());
  const card = dom.window.document.querySelector(".el-card");
  attachVue(dom, [{ card }]);
  await dom.window.eval(await source("bridge.js"));
  assert.deepEqual(JSON.parse(card.getAttribute("data-lisa-agenda-match")), sample);
  assert.ok(!card.getAttribute("data-lisa-agenda-match").includes("DO-NOT-EXPOSE"));
  delete dom.window.document.querySelector("#app").__vue_app__;
  dom.window.document.dispatchEvent(new dom.window.Event("lisa-agenda:scan"));
  assert.equal(card.hasAttribute("data-lisa-agenda-match"), false);
});

test("download request opens a collapsed card and waits for async details, not an arbitrary delay", async t => {
  const dom = await page(cardHTML({ details: false }));
  t.after(() => dom.window.close());
  const card = attachMetadata(dom);
  let toggles = 0;
  card.querySelector(".tile-content").addEventListener("click", () => {
    toggles++;
    setTimeout(() => card.querySelector(".el-card__body").insertAdjacentHTML("beforeend", detailsHTML), 10);
  });
  await dom.window.LisaPage.waitForDetails(card, 300);
  assert.equal(toggles, 1);
  await dom.window.LisaPage.waitForDetails(card, 300);
  assert.equal(toggles, 1);
  assert.equal(dom.window.LisaPage.read(card).meetingTime, "11:35");
});

test("failed detail loading returns an explicit timeout", async t => {
  const dom = await page(cardHTML({ details: false }));
  t.after(() => dom.window.close());
  const card = attachMetadata(dom);
  await assert.rejects(dom.window.LisaPage.waitForDetails(card, 10), /niet geladen/);
});

test("unplanned match exports an all-day file through the same Lisa adapter", async t => {
  const dom = await page();
  t.after(() => dom.window.close());
  const card = attachMetadata(dom, { timeKnown: false });
  card.querySelector(".main-start-time").remove();
  card.querySelector(".main-meeting-time").remove();
  const { text } = await dom.window.LisaCalendar.create(dom.window.LisaPage.read(card), "Sake");
  assert.match(text, /DTSTART;VALUE=DATE:20261024\r\nDTEND;VALUE=DATE:20261025/);
  assert.match(text, /SUMMARY:\[Sake\] UIT \| FIT JO14-2/);
});


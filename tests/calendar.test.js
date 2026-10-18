import assert from "node:assert/strict";
import { test } from "node:test";
import "../extension/attendees.js";
import "../extension/calendar.js";

const { create, localEpoch } = globalThis.LisaCalendar;
const match = {
  id: "match-1", clubId: "club-1", memberId: "player-1",
  date: "2026-10-24", timeKnown: true, meetingTime: "11:35", startTime: "12:45",
  side: "UIT", opponent: "FIT JO14-2", homeTeam: "AMHC FIT JO14-2",
  awayTeam: "H.V. De Terriers JO14-1 T/C", location: "Sportpark 'Kadoelen', Veld 3",
};
const unfold = text => text.replace(/\r\n /g, "");

test("attendees are included once in timed and all-day events without sending or changing UID", async () => {
  for (const timeKnown of [true, false]) {
    const data = { ...match, timeKnown };
    const normal = await create(data, "Sake");
    const file = await create(data, "Sake", Date.now(), {
      privateEvent: true,
      attendeeEmails: "ouder@example.nl; ander@example.org\nOUDER@example.nl",
    });
    const text = unfold(file.text);
    assert.equal(text.split("\r\n").filter(line => line.startsWith("ATTENDEE;")).length, 2);
    assert.match(text, /ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:ouder@example.nl\r\n/);
    assert.match(text, /mailto:ander@example.org\r\n/);
    assert.match(text, /CLASS:PRIVATE/);
    assert.doesNotMatch(text, /METHOD:REQUEST|ORGANIZER:/);
    assert.doesNotMatch(normal.text, /ATTENDEE/);
    assert.equal(file.text.match(/UID:(.+)\r\n/)[1], normal.text.match(/UID:(.+)\r\n/)[1]);
    for (const line of file.text.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75);
  }
  await assert.rejects(create(match, "Sake", Date.now(), { attendeeEmails: "bad-email" }), /Ongeldig e-mailadres/);
  const special = await create(match, "Sake", Date.now(), { attendeeEmails: "ouder+team#1@example.nl" });
  assert.match(unfold(special.text), /mailto:ouder%2Bteam%231@example.nl\r\n/);
});

test("private preference marks timed and all-day events without changing their UID", async () => {
  for (const timeKnown of [true, false]) {
    const data = { ...match, timeKnown };
    const normal = await create(data, "Sake");
    const privateFile = await create(data, "Sake", Date.now(), { privateEvent: true });
    const disabled = await create(data, "Sake", Date.now(), { privateEvent: false });
    assert.doesNotMatch(normal.text, /CLASS:/);
    assert.doesNotMatch(disabled.text, /CLASS:/);
    assert.equal(privateFile.text.split("\r\n").filter(line => line === "CLASS:PRIVATE").length, 1);
    assert.equal(privateFile.text.match(/UID:(.+)\r\n/)[1], normal.text.match(/UID:(.+)\r\n/)[1]);
  }
});

test("exports the exact agreed title, gathering time, three-hour duration and location", async () => {
  const { text, filename } = await create(match, " Sake ", Date.UTC(2026, 9, 18));
  assert.match(text, /SUMMARY:\[Sake\] UIT \| FIT JO14-2\r\n/);
  assert.match(text, /DTSTART:20261024T093500Z\r\nDTEND:20261024T123500Z/);
  assert.match(unfold(text), /LOCATION:Sportpark 'Kadoelen'\\, Veld 3/);
  assert.match(unfold(text), /Verzamelen: 11:35\\nWedstrijdstart: 12:45/);
  assert.equal(filename, "Sake-UIT-FIT-JO14-2-2026-10-24.ics");
  assert.ok(text.endsWith("END:VCALENDAR\r\n"));
  assert.equal(text.replaceAll("\r\n", "").includes("\n"), false);
});

test("Amsterdam summer and winter time do not depend on machine timezone", () => {
  assert.equal(new Date(localEpoch("2026-07-04", "11:35")).toISOString(), "2026-07-04T09:35:00.000Z");
  assert.equal(new Date(localEpoch("2026-12-05", "11:35")).toISOString(), "2026-12-05T10:35:00.000Z");
});

test("three elapsed hours across midnight and DST changes", async () => {
  const midnight = await create({ ...match, meetingTime: "23:35" }, "Sake");
  assert.match(midnight.text, /DTSTART:20261024T213500Z\r\nDTEND:20261025T003500Z/);
  const dst = await create({ ...match, date: "2026-10-25", meetingTime: "01:30" }, "Sake");
  assert.match(dst.text, /DTSTART:20261024T233000Z\r\nDTEND:20261025T023000Z/);
  assert.throws(() => localEpoch("2026-03-29", "02:30"), /bestaat niet/);
});

test("unknown time creates one all-day event with exclusive next-day end", async () => {
  for (const [date, end] of [["2026-10-24", "20261025"], ["2026-12-31", "20270101"], ["2028-02-29", "20280301"]]) {
    const { text } = await create({ ...match, date, timeKnown: false, meetingTime: "" }, "Sake");
    assert.match(text, new RegExp(`DTSTART;VALUE=DATE:${date.replaceAll("-", "")}\\r\\nDTEND;VALUE=DATE:${end}`));
    assert.doesNotMatch(text, /DTSTART:|TZID|Verzamelen:/);
    assert.match(unfold(text), /Tijdstip nog niet vastgesteld/);
  }
});

test("escapes text and folds every UTF-8 line at 75 octets without broken characters", async () => {
  const name = "Zoë 🏑".repeat(35) + ",;\nBEGIN:VEVENT";
  const { text } = await create({ ...match, location: "A\\B;\r\nC,D" }, name);
  for (const line of text.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75);
  assert.ok(!text.includes("\uFFFD"));
  assert.equal(text.split("BEGIN:VEVENT").length - 1, 2);
  assert.match(unfold(text), /\\,\\;\\nBEGIN:VEVENT\] UIT/);
  assert.match(unfold(text), /LOCATION:A\\\\B\\;\\nC\\,D/);
  assert.equal(text.split("\r\n").filter(line => line === "BEGIN:VEVENT").length, 1);
});

test("stable UID survives rescheduling but distinguishes names, matches and family members", async () => {
  const uid = async (data, name = "Sake") => (await create(data, name)).text.match(/UID:(.+)\r\n/)[1];
  const original = await uid(match);
  assert.equal(await uid({ ...match, date: "2026-11-07", meetingTime: "10:00" }), original);
  assert.notEqual(await uid(match, "Andere naam"), original);
  assert.notEqual(await uid({ ...match, memberId: "player-2" }), original);
  assert.notEqual(await uid({ ...match, id: "match-2" }), original);
});

test("invalid dates, missing name and cancelled matches cannot export", async () => {
  await assert.rejects(create(match, "  "), /naam/);
  await assert.rejects(create({ ...match, cancelled: true }, "Sake"), /afgelast/);
  for (const date of ["", "2026-02-30", "2026-13-01", "onbekend"]) {
    await assert.rejects(create({ ...match, date }, "Sake"), /datum/);
  }
  await assert.rejects(create({ ...match, side: "" }, "Sake"), /eigen team/);
  await assert.rejects(create({ ...match, meetingTime: "25:70" }, "Sake"), /verzameltijd/);
});

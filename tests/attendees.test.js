import assert from "node:assert/strict";
import { test } from "node:test";
import "../extension/attendees.js";

const { parse } = globalThis.LisaAttendees;

test("accepts plain addresses separated by lines, commas and semicolons and removes duplicates", () => {
  assert.deepEqual(parse(), []);
  assert.deepEqual(parse(" , ;\n "), []);
  assert.deepEqual(parse(" Ouder@example.nl; ander+team@example.org,\r\nouder@EXAMPLE.nl\n"),
    ["Ouder@example.nl", "ander+team@example.org"]);
});

test("rejects invalid addresses and calendar property injection instead of dropping inputs", () => {
  for (const value of [
    "geen-adres", "persoon@", "Naam <ouder@example.nl>", "a@@example.nl",
    "a..b@example.nl", "a@-example.nl", "a@exam_ple.nl",
    "valid@example.nl\nBEGIN:VEVENT", "a@example.nl?subject=tekst",
    "a@example.nl\r\nATTENDEE:mailto:ander@example.nl", 42, null,
  ]) assert.throws(() => parse(value), /ongeldig/i, String(value));
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { source, page, storageMock, until } from "./helpers.js";

test("popup loads, trims and saves name locally without rendering user input as HTML", async t => {
  const dom = await page(await source("popup.html"));
  t.after(() => dom.window.close());
  const get = storageMock(dom.window, { agendaName: "Oude naam" });
  dom.window.eval(await source("popup.js"));
  const input = dom.window.document.querySelector("#agenda-name");
  await until(() => !input.disabled);
  assert.equal(input.value, "Oude naam");
  assert.equal(dom.window.document.querySelector("#profile-name").value, "Oude naam");
  assert.equal(dom.window.document.querySelector("#private-event").checked, false);
  input.value = "  <b>Sake</b>  ";
  dom.window.document.querySelector("form").dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  await until(() => dom.window.document.querySelector("#status").textContent.includes("opgeslagen"));
  assert.equal(get().agendaName, "<b>Sake</b>");
  assert.equal(get().profiles[0].agendaName, "<b>Sake</b>");
  assert.equal(dom.window.document.querySelectorAll("b").length, 0);
});

test("popup keeps agenda names and invitees separate for each profile", async t => {
  const dom = await page(await source("popup.html"));
  t.after(() => dom.window.close());
  const get = storageMock(dom.window, {
    agendaName: "Noor", attendeeEmails: "noor@example.nl",
  });
  dom.window.eval(await source("popup.js"));
  const select = dom.window.document.querySelector("#profile");
  const profileName = dom.window.document.querySelector("#profile-name");
  const agendaName = dom.window.document.querySelector("#agenda-name");
  const attendees = dom.window.document.querySelector("#attendee-emails");
  const save = dom.window.document.querySelector("#save");
  const submit = () => dom.window.document.querySelector("form")
    .dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  await until(() => !select.disabled);
  const firstId = select.value;

  dom.window.document.querySelector("#add-profile").click();
  profileName.value = "Mila";
  profileName.dispatchEvent(new dom.window.Event("input"));
  agendaName.value = "Mila";
  agendaName.dispatchEvent(new dom.window.Event("input"));
  attendees.value = "mila@example.nl";
  attendees.dispatchEvent(new dom.window.Event("input"));
  submit();
  await until(() => !save.disabled);
  const secondId = select.value;
  assert.equal(get().profiles.length, 2);
  assert.equal(get().selectedProfileId, secondId);
  assert.equal(get().attendeeEmails, "mila@example.nl");

  select.value = firstId;
  select.dispatchEvent(new dom.window.Event("change"));
  assert.equal(profileName.value, "Noor");
  assert.equal(agendaName.value, "Noor");
  assert.equal(attendees.value, "noor@example.nl");
  profileName.value = "Noor";
  profileName.dispatchEvent(new dom.window.Event("input"));
  submit();
  await until(() => !save.disabled);
  assert.deepEqual(Array.from(get().profiles, profile => [profile.name, profile.agendaName, profile.attendeeEmails]), [
    ["Noor", "Noor", "noor@example.nl"],
    ["Mila", "Mila", "mila@example.nl"],
  ]);
  assert.deepEqual(Array.from(get().profiles, profile => profile.playerName), ["Noor", "Mila"]);

  dom.window.document.querySelector("#delete-profile").click();
  submit();
  await until(() => !save.disabled);
  assert.equal(get().profiles.length, 1);
  assert.equal(get().selectedProfileId, secondId);
});

test("switching profiles saves the selection and the edited profile without pressing save", async t => {
  const dom = await page(await source("popup.html"));
  t.after(() => dom.window.close());
  const get = storageMock(dom.window, {
    profiles: [
      { id: "noor", name: "Noor", agendaName: "Noor", attendeeEmails: "" },
      { id: "mila", name: "Mila", agendaName: "Mila", attendeeEmails: "" },
    ],
    selectedProfileId: "noor",
  });
  dom.window.eval(await source("popup.js"));
  const select = dom.window.document.querySelector("#profile");
  const profileName = dom.window.document.querySelector("#profile-name");
  const agendaName = dom.window.document.querySelector("#agenda-name");
  await until(() => !select.disabled);

  profileName.value = "Noor Jansen";
  profileName.dispatchEvent(new dom.window.Event("input"));
  agendaName.value = "Noor";
  agendaName.dispatchEvent(new dom.window.Event("input"));
  select.value = "mila";
  select.dispatchEvent(new dom.window.Event("change"));

  await until(() => get().selectedProfileId === "mila");
  assert.equal(get().profiles[0].name, "Noor Jansen");
  assert.equal(get().profiles[0].playerName, "Noor Jansen");
  assert.equal(profileName.value, "Mila");
  assert.equal(agendaName.value, "Mila");
  await until(() => dom.window.document.querySelector("#status").textContent.includes("opgeslagen."));
  assert.equal(dom.window.document.querySelector("#status").textContent, "Profiel en wijzigingen opgeslagen.");
});

test("popup restores and persists private preference in both directions", async t => {
  const dom = await page(await source("popup.html"));
  t.after(() => dom.window.close());
  const get = storageMock(dom.window, { agendaName: "Sake", privateEvent: true });
  dom.window.eval(await source("popup.js"));
  const checkbox = dom.window.document.querySelector("#private-event");
  await until(() => !checkbox.disabled);
  assert.equal(checkbox.checked, true);
  for (const checked of [false, true]) {
    checkbox.checked = checked;
    dom.window.document.querySelector("form").dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
    await until(() => !dom.window.document.querySelector("#save").disabled);
    assert.equal(get().privateEvent, checked);
    assert.equal(get().agendaName, "Sake");
  }
});

test("popup restores, validates, deduplicates and clears optional invitees", async t => {
  const dom = await page(await source("popup.html"));
  t.after(() => dom.window.close());
  const get = storageMock(dom.window, { agendaName: "Sake", attendeeEmails: "ouder@example.nl" });
  dom.window.eval(await source("popup.js"));
  const input = dom.window.document.querySelector("#attendee-emails");
  const save = dom.window.document.querySelector("#save");
  const submit = () => dom.window.document.querySelector("form")
    .dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  await until(() => !input.disabled);
  assert.equal(input.value, "ouder@example.nl");
  input.value = "geen geldig adres";
  submit();
  assert.match(input.validationMessage, /Ongeldig e-mailadres/);
  assert.equal(get().attendeeEmails, "ouder@example.nl");
  input.value = "ouder@example.nl; ander@example.org, OUDER@example.nl";
  input.dispatchEvent(new dom.window.Event("input"));
  assert.equal(input.validationMessage, "");
  submit();
  await until(() => !save.disabled);
  assert.equal(get().attendeeEmails, "ouder@example.nl\nander@example.org");
  assert.equal(input.value, get().attendeeEmails);
  input.value = "";
  submit();
  await until(() => !save.disabled);
  assert.equal(get().attendeeEmails, "");
});

test("popup rejects whitespace names and reports storage failures", async t => {
  const dom = await page(await source("popup.html"));
  t.after(() => dom.window.close());
  storageMock(dom.window);
  dom.window.eval(await source("popup.js"));
  const input = dom.window.document.querySelector("#agenda-name");
  await until(() => !input.disabled);
  input.value = "   ";
  const submit = () => dom.window.document.querySelector("form")
    .dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  submit();
  assert.equal(input.validationMessage, "Vul een naam in.");
  input.value = "Sake";
  input.dispatchEvent(new dom.window.Event("input"));
  assert.equal(input.validationMessage, "");
  dom.window.chrome.storage.local.set = async () => { throw new Error("Storage unavailable"); };
  const errors = [];
  dom.window.console.error = (...args) => errors.push(args);
  submit();
  await until(() => dom.window.document.querySelector("#status").textContent.includes("Opslaan mislukt"));
  assert.equal(errors.length, 1);
  assert.equal(dom.window.document.querySelector("#save").disabled, false);
});

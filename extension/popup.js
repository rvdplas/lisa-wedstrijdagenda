(() => {
  "use strict";

  const form = document.getElementById("settings");
  const profileSelect = document.getElementById("profile");
  const profileName = document.getElementById("profile-name");
  const input = document.getElementById("agenda-name");
  const privateEvent = document.getElementById("private-event");
  const attendees = document.getElementById("attendee-emails");
  const addProfile = document.getElementById("add-profile");
  const deleteProfile = document.getElementById("delete-profile");
  const save = document.getElementById("save");
  const status = document.getElementById("status");
  let profiles = [];
  let activeProfileId = "";

  function id() {
    return crypto.randomUUID();
  }

  function selected() {
    return profiles.find(profile => profile.id === activeProfileId);
  }

  function displayProfile(profile) {
    profileName.value = profile.name;
    input.value = profile.agendaName;
    attendees.value = profile.attendeeEmails;
  }

  function renderProfiles(selectedId) {
    profileSelect.replaceChildren(...profiles.map(profile => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.name;
      return option;
    }));
    profileSelect.value = selectedId;
    activeProfileId = selectedId;
    deleteProfile.disabled = profiles.length <= 1;
    displayProfile(selected());
  }

  function updateDraft() {
    const profile = selected();
    if (!profile) return;
    profile.name = profileName.value;
    profile.playerName = profile.name;
    profile.agendaName = input.value;
    profile.attendeeEmails = attendees.value;
    const option = [...profileSelect.options].find(item => item.value === profile.id);
    if (option) option.textContent = profile.name || "Naamloos profiel";
  }

  chrome.storage.local.get([
    "profiles", "selectedProfileId", "agendaName", "privateEvent", "attendeeEmails",
  ]).then(stored => {
    profiles = Array.isArray(stored.profiles)
      ? stored.profiles.filter(profile =>
        profile && typeof profile.id === "string" && typeof profile.name === "string")
        .map(profile => ({
          id: profile.id,
          name: profile.name,
          playerName: typeof profile.playerName === "string" && profile.playerName.trim()
            ? profile.playerName : profile.name,
          agendaName: typeof profile.agendaName === "string" ? profile.agendaName : "",
          attendeeEmails: typeof profile.attendeeEmails === "string" ? profile.attendeeEmails : "",
        }))
      : [];
    if (!profiles.length) {
      profiles = [{
        id: id(),
        name: typeof stored.agendaName === "string" && stored.agendaName.trim()
          ? stored.agendaName.trim() : "Profiel 1",
        playerName: "",
        agendaName: typeof stored.agendaName === "string" ? stored.agendaName : "",
        attendeeEmails: typeof stored.attendeeEmails === "string" ? stored.attendeeEmails : "",
      }];
    }
    const activeId = profiles.some(profile => profile.id === stored.selectedProfileId)
      ? stored.selectedProfileId : profiles[0].id;
    privateEvent.checked = stored.privateEvent === true;
    renderProfiles(activeId);
    for (const element of [profileSelect, profileName, input, privateEvent, attendees, addProfile, save]) {
      element.disabled = false;
    }
    deleteProfile.disabled = profiles.length <= 1;
  }).catch(error => {
    console.error("[Lisa wedstrijdagenda] Instellingen laden mislukt.", error);
    status.textContent = "Instellingen laden mislukt. Sluit dit venster en probeer het opnieuw.";
  });

  profileSelect.addEventListener("change", async () => {
    updateDraft();
    activeProfileId = profileSelect.value;
    const profile = selected();
    displayProfile(profile);
    status.textContent = "Profiel en wijzigingen opslaan...";
    try {
      await chrome.storage.local.set({
        profiles,
        selectedProfileId: profile.id,
        agendaName: profile.agendaName,
        attendeeEmails: profile.attendeeEmails,
      });
      status.textContent = "Profiel en wijzigingen opgeslagen.";
    } catch (error) {
      console.error("[Lisa wedstrijdagenda] Profielkeuze opslaan mislukt.", error);
      status.textContent = "Profielkeuze opslaan mislukt. Probeer opnieuw of klik op Opslaan.";
    }
  });
  for (const field of [profileName, input, attendees]) {
    field.addEventListener("input", () => {
      field.setCustomValidity("");
      updateDraft();
    });
  }
  addProfile.addEventListener("click", () => {
    updateDraft();
    const profile = {
      id: id(),
      name: `Profiel ${profiles.length + 1}`,
      playerName: "",
      agendaName: "",
      attendeeEmails: "",
    };
    profiles.push(profile);
    renderProfiles(profile.id);
    profileName.focus();
    status.textContent = "Vul de profielnaam en agendanaam in en sla op.";
  });
  deleteProfile.addEventListener("click", () => {
    if (profiles.length <= 1) return;
    const index = profiles.findIndex(profile => profile.id === profileSelect.value);
    profiles.splice(index, 1);
    renderProfiles(profiles[Math.min(index, profiles.length - 1)].id);
    status.textContent = "Profiel verwijderd. Sla op om de wijziging te bewaren.";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    updateDraft();
    const profile = selected();
    if (!profile?.name.trim()) {
      profileName.setCustomValidity("Vul een profielnaam in.");
      profileName.reportValidity();
      return;
    }
    if (!profile.agendaName.trim()) {
      input.setCustomValidity("Vul een naam in.");
      input.reportValidity();
      return;
    }
    let attendeeEmails;
    try {
      attendeeEmails = LisaAttendees.parse(profile.attendeeEmails).join("\n");
    } catch (error) {
      attendees.setCustomValidity(error.message);
      attendees.reportValidity();
      return;
    }
    profile.name = profile.name.trim();
    profile.playerName = profile.name;
    profile.agendaName = profile.agendaName.trim();
    profile.attendeeEmails = attendeeEmails;
    save.disabled = true;
    status.textContent = "";
    try {
      await chrome.storage.local.set({
        profiles,
        selectedProfileId: profile.id,
        agendaName: profile.agendaName,
        attendeeEmails,
        privateEvent: privateEvent.checked,
      });
      renderProfiles(profile.id);
      status.textContent = "Instellingen opgeslagen. Je kunt nu wedstrijden downloaden.";
    } catch (error) {
      console.error("[Lisa wedstrijdagenda] Opslaan mislukt.", error);
      status.textContent = "Opslaan mislukt. Probeer het opnieuw.";
    } finally {
      save.disabled = false;
    }
  });
})();

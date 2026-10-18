(() => {
  "use strict";

  const settingKeys = ["profiles", "selectedProfileId", "agendaName", "privateEvent", "attendeeEmails"];
  const rescanDelay = 200;
  let agendaName = "";
  let selectedPlayerName = "";
  let activeProfileName = "";
  let storageError = "";
  let timer = 0;
  let mounted;

  function activeSettings(stored) {
    const profile = Array.isArray(stored.profiles)
      ? stored.profiles.find(item => item?.id === stored.selectedProfileId)
      : null;
    return {
      agendaName: typeof profile?.agendaName === "string" ? profile.agendaName : stored.agendaName,
      playerName: typeof profile?.playerName === "string" && profile.playerName.trim()
        ? profile.playerName : profile?.name || "",
      profileName: typeof profile?.name === "string" ? profile.name : "",
      attendeeEmails: typeof profile?.attendeeEmails === "string" ? profile.attendeeEmails : stored.attendeeEmails,
    };
  }

  const normalizedPlayerName = name => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("nl");

  function saveFile(file) {
    const url = URL.createObjectURL(new Blob([file.text], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = file.filename;
    document.body.append(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }

  const errorText = error => error instanceof Error ? error.message : "Er ging iets mis bij het maken van het agenda-bestand.";

  function blockedReason() {
    return storageError || (agendaName ? "" : "Stel eerst via het extensie-icoon een naam in.");
  }

  function view(state) {
    const items = state.entries.map(entry => ({
      key: entry.key, date: entry.date, title: entry.title,
      subtitle: entry.ownTeam, cancelled: entry.cancelled, timeKnown: entry.timeKnown,
      selected: state.selection.isSelected(entry),
    }));
    const scanWarning = state.scanErrors.length
      ? { tone: "warning", message: "Niet alle wedstrijden konden worden gelezen en ontbreken in dit overzicht.", details: state.scanErrors }
      : null;
    return {
      phase: blockedReason() && state.phase === "idle" ? "blocked" : state.phase,
      blocked: blockedReason(), progress: state.progress, items, playerName: selectedPlayerName,
      profileName: activeProfileName,
      duplicates: state.duplicates, feedback: state.feedback || scanWarning,
    };
  }

  function render(state) {
    const next = view(state);
    const serialized = JSON.stringify(next);
    if (serialized === state.rendered) return;
    state.rendered = serialized;
    state.panel.update(next);
  }

  function rescan(state) {
    const found = LisaBulk.scan(state.container);
    const playerName = normalizedPlayerName(selectedPlayerName);
    state.entries = playerName
      ? found.entries.filter(entry => normalizedPlayerName(entry.playerName) === playerName)
      : found.entries;
    state.duplicates = found.duplicates;
    state.scanErrors = found.errors;
    render(state);
  }

  async function load(state) {
    state.phase = "loading";
    state.progress = "Activiteiten laden...";
    render(state);
    try {
      await LisaBulk.loadAll(state.container, message => { state.progress = message; render(state); });
    } catch (error) {
      console.error("[Lisa wedstrijdagenda] Activiteiten laden mislukt.", error);
      state.feedback = { tone: "warning", message: errorText(error) };
    }
    if (mounted !== state) return;
    state.phase = "idle";
    state.progress = "";
    rescan(state);
  }

  async function download(state) {
    const selected = state.selection.selected(state.entries);
    if (!selected.length || state.phase !== "idle") return;
    state.phase = "working";
    state.feedback = null;
    state.progress = "Agenda-bestand voorbereiden...";
    render(state);
    try {
      const stored = await chrome.storage.local.get(settingKeys);
      const current = activeSettings(stored);
      const name = typeof current.agendaName === "string" ? current.agendaName.trim() : "";
      if (!name) throw new Error("Stel eerst via het extensie-icoon een naam in.");
      const playerName = normalizedPlayerName(current.playerName || "");
      if (playerName && selected.some(entry => normalizedPlayerName(entry.playerName) !== playerName)) {
        throw new Error("De selectie bevat wedstrijden van een andere speler. Werk de wedstrijdselectie bij en probeer het opnieuw.");
      }
      LisaAttendees.parse(current.attendeeEmails);
      const result = await LisaBulk.build(state.container, selected, name, {
        privateEvent: stored.privateEvent === true, attendeeEmails: current.attendeeEmails,
      }, message => { state.progress = message; render(state); });
      if (result.file) saveFile(result.file);
      const invited = current.attendeeEmails?.trim() && result.count
        ? " Controleer de genodigden in Outlook en verstuur uitnodigingen zelf." : "";
      state.feedback = result.file
        ? {
          tone: result.errors.length ? "warning" : "success",
          message: `${result.count === 1 ? "1 wedstrijd" : `${result.count} wedstrijden`} gedownload. Open het .ics-bestand om te importeren in Outlook; dit is een eenmalige import.${invited}`
            + (result.errors.length ? ` ${result.errors.length} ${result.errors.length === 1 ? "wedstrijd is" : "wedstrijden zijn"} niet meegenomen:` : ""),
          details: result.errors,
        }
        : { tone: "error", message: "Er is geen bestand gedownload.", details: result.errors };
    } catch (error) {
      console.error("[Lisa wedstrijdagenda] Download mislukt.", error);
      state.feedback = { tone: "error", message: errorText(error) };
    }
    if (mounted !== state) return;
    state.phase = "idle";
    state.progress = "";
    rescan(state);
  }

  function mount(container) {
    document.querySelectorAll("[data-lisa-agenda-panel]").forEach(node => node.remove());
    const state = {
      container, selection: LisaSelection.create(), entries: [], duplicates: 0, scanErrors: [],
      phase: "idle", progress: "", feedback: null, rendered: "",
    };
    state.panel = LisaPanel.create({
      onDownload: () => { void download(state); },
      onToggle: (key, selected) => { state.selection.set(key, selected); state.feedback = null; render(state); },
      onSelectAll: selected => { state.selection.setAll(state.entries, selected); state.feedback = null; render(state); },
    });
    container.before(state.panel.host);
    mounted = state;
    void load(state);
  }

  function sync() {
    timer = 0;
    const container = document.querySelector("#tilesContainer");
    if (!container) {
      mounted?.panel.destroy();
      mounted = undefined;
      return;
    }
    if (!mounted || mounted.container !== container) {
      mounted?.panel.destroy();
      mount(container);
      return;
    }
    if (!mounted.panel.host.isConnected) container.before(mounted.panel.host);
    if (mounted.phase === "idle") rescan(mounted);
  }

  function schedule() {
    if (!timer) timer = setTimeout(sync, rescanDelay);
  }

  function readSettings() {
    chrome.storage.local.get(settingKeys).then(stored => {
      const current = activeSettings(stored);
      agendaName = typeof current.agendaName === "string" ? current.agendaName.trim() : "";
      selectedPlayerName = typeof current.playerName === "string" ? current.playerName.trim() : "";
      activeProfileName = typeof current.profileName === "string" ? current.profileName.trim() : "";
      storageError = "";
    }).catch(error => {
      console.error("[Lisa wedstrijdagenda] Instellingen laden mislukt.", error);
      storageError = "Instellingen konden niet worden geladen. Herlaad de pagina.";
    }).finally(() => {
      if (mounted) render(mounted);
      schedule();
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !["profiles", "selectedProfileId", "agendaName"].some(key => changes[key])) return;
    readSettings();
  });
  document.addEventListener("lisa-agenda:ready", schedule);
  new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.("[data-lisa-agenda-panel]"))) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  readSettings();
})();

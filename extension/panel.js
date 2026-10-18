(() => {
  "use strict";

  const icons = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  };

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (name === "text") node.textContent = value;
      else if (name === "html") node.innerHTML = value;
      else if (name === "class") node.className = value;
      else node.setAttribute(name, value);
    }
    node.append(...children);
    return node;
  }

  const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

  // Presentational Shadow DOM panel: it renders a view model and reports user intent via callbacks.
  function create({ onDownload, onToggle, onSelectAll }) {
    const host = el("div", { "data-lisa-agenda-panel": "" });
    const root = host.attachShadow({ mode: "open" });
    const style = el("style", { text: LisaPanelStyles });
    const badge = el("span", { class: "badge" });
    const activeProfile = el("p", { class: "active-profile", "aria-label": "Geselecteerd profiel" }, [
      el("span", { text: "Actief profiel: " }),
      el("strong"),
    ]);
    const activeProfileName = activeProfile.querySelector("strong");
    const matches = el("strong");
    const matchesLabel = el("span");
    const duplicates = el("li", { class: "secondary" });
    const cancelled = el("li", { class: "secondary" });
    const metrics = el("ul", { class: "metrics" }, [el("li", {}, [matches, " ", matchesLabel]), duplicates, cancelled]);
    const button = el("button", { type: "button", class: "primary" });
    const note = el("p", { class: "note", text: "Eenmalige import van een .ics-bestand in Outlook. Latere wijzigingen in Lisa worden niet automatisch bijgewerkt." });
    const feedback = el("div", { class: "feedback", role: "status", "aria-live": "polite", hidden: "" });
    const empty = el("p", { class: "empty", hidden: "" });
    const toggle = el("button", { type: "button", class: "toggle", "aria-expanded": "false", "aria-controls": "selection" });
    const toggleCount = el("span", { class: "count" });
    toggle.append(el("span", { html: icons.chevron }), el("span", { text: "Selectie aanpassen" }), toggleCount);
    const list = el("div", { class: "list" });
    const selection = el("div", { class: "selection", id: "selection", hidden: "" }, [
      el("div", { class: "bulk" }, [
        el("button", { type: "button", class: "link", "data-all": "on", text: "Alles selecteren" }),
        el("button", { type: "button", class: "link", "data-all": "off", text: "Niets selecteren" }),
      ]),
      list,
    ]);
    const title = el("h2", { id: "ha-title", text: "Hockey Agenda Export" });
    const main = el("div", { class: "main" }, [
      el("div", { class: "head" }, [
        el("div", { class: "mark", html: icons.calendar }),
        el("div", { class: "titles" }, [title, el("p", { class: "subtitle", text: "LISA \u2192 Outlook" })]),
        badge,
      ]),
      el("div", { class: "summary" }, [metrics, button]),
      note, feedback, empty,
    ]);
    main.insertBefore(activeProfile, main.querySelector(".summary"));
    root.append(style, el("section", { class: "panel", "aria-labelledby": "ha-title" }, [main, toggle, selection]));

    const checkboxes = new Map();
    let signature = "";

    button.addEventListener("click", () => onDownload());
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      selection.hidden = !open;
    });
    selection.addEventListener("click", event => {
      const all = event.target.closest?.("[data-all]");
      if (all) onSelectAll(all.dataset.all === "on");
    });
    list.addEventListener("change", event => {
      if (event.target.matches("input[data-key]")) onToggle(event.target.dataset.key, event.target.checked);
    });

    function renderList(items) {
      checkboxes.clear();
      list.replaceChildren();
      for (const group of LisaSelection.groupByDate(items)) {
        const heading = el("h3", { text: group.label });
        const ul = el("ul", { class: "items" });
        for (const item of group.items) {
          const input = el("input", { type: "checkbox", "data-key": item.key });
          input.checked = item.selected;
          input.disabled = item.cancelled;
          checkboxes.set(item.key, input);
          const text = el("span", { class: "text" }, [
            el("b", { text: item.title }), el("span", { text: item.subtitle }),
          ]);
          const tag = item.cancelled ? el("span", { class: "tag", "data-tone": "cancelled", text: "Afgelast" })
            : !item.timeKnown ? el("span", { class: "tag", text: "Tijd volgt" }) : "";
          const label = el("label", { class: "item" }, [input, text, tag]);
          if (item.cancelled) label.setAttribute("data-disabled", "");
          ul.append(el("li", {}, [label]));
        }
        list.append(el("section", { class: "group" }, [heading, ul]));
      }
    }

    function update(view) {
      const { items } = view;
      activeProfile.hidden = !view.profileName;
      activeProfileName.textContent = view.profileName || "";
      const total = items.filter(item => !item.cancelled).length;
      const chosen = items.filter(item => item.selected).length;
      const skipped = items.length - total;
      const working = view.phase === "loading" || view.phase === "working";
      const tone = view.phase === "blocked" ? "blocked" : working ? "busy" : chosen ? "ready" : "idle";
      badge.dataset.tone = tone;
      badge.textContent = view.phase === "loading" ? "Activiteiten laden\u2026"
        : view.phase === "working" ? "Agenda maken\u2026"
        : view.phase === "blocked" ? "Instellen vereist"
        : !total ? "Niets te exporteren"
        : chosen ? "Klaar om te exporteren" : "Niets geselecteerd";

      matches.textContent = String(chosen);
      matchesLabel.textContent = chosen === 1 ? "wedstrijd geselecteerd" : "wedstrijden geselecteerd";
      duplicates.hidden = !view.duplicates;
      duplicates.replaceChildren(el("strong", { text: String(view.duplicates) }), " ",
        el("span", { text: view.duplicates === 1 ? "dubbele kaart overgeslagen" : "dubbele kaarten overgeslagen" }));
      cancelled.hidden = !skipped;
      cancelled.replaceChildren(el("strong", { text: String(skipped) }), " ",
        el("span", { text: "afgelast" }));

      button.replaceChildren(el("span", { html: icons.download }),
        el("span", { text: chosen ? `Download agenda (${chosen})` : "Download agenda" }));
      button.disabled = working || view.phase === "blocked" || !chosen;
      button.setAttribute("aria-busy", String(working));
      button.title = view.phase === "blocked" ? view.blocked : "";

      const message = view.phase === "blocked" ? { tone: "warning", message: view.blocked }
        : working && view.progress ? { tone: "info", message: view.progress } : view.feedback;
      feedback.hidden = !message;
      feedback.removeAttribute("data-tone");
      feedback.replaceChildren();
      feedback.setAttribute("role", message?.tone === "error" ? "alert" : "status");
      if (message) {
        feedback.dataset.tone = message.tone;
        feedback.append(el("p", { text: message.message }));
        if (message.details?.length) feedback.append(el("ul", {}, message.details.map(text => el("li", { text }))));
      }

      empty.hidden = Boolean(items.length) || working;
      empty.textContent = view.playerName
        ? `Geen komende wedstrijden voor ${view.playerName} gevonden. Controleer of de profielnaam overeenkomt met de spelernaam op de Lisa-wedstrijdkaart.`
        : "Geen komende wedstrijden gevonden. Zodra er wedstrijden met een spelernaam in je Lisa-agenda staan, kun je ze hier downloaden.";
      toggle.hidden = !items.length;
      if (!items.length) selection.hidden = true;
      else selection.hidden = toggle.getAttribute("aria-expanded") !== "true";
      toggleCount.textContent = `${chosen} van ${plural(total, "wedstrijd", "wedstrijden")}`;

      const next = JSON.stringify(items.map(item => [item.key, item.title, item.subtitle, item.date, item.cancelled, item.timeKnown]));
      if (next !== signature) {
        signature = next;
        renderList(items);
      }
      for (const item of items) {
        const input = checkboxes.get(item.key);
        input.checked = item.selected;
        input.disabled = item.cancelled || working;
      }
    }

    return { host, update, destroy: () => host.remove() };
  }

  globalThis.LisaPanel = Object.freeze({ create });
})();

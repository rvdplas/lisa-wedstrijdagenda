(() => {
  "use strict";

  const cardSelector = '.tile-content svg[data-icon="field-hockey-stick-ball"], .tile-content svg[data-icon="field-hockey"]';
  const cards = root => [...new Set([...root.querySelectorAll(cardSelector)].map(icon => icon.closest(".el-card")).filter(Boolean))];
  const refresh = () => document.dispatchEvent(new Event("lisa-agenda:scan"));

  function waitForScrollToSettle() {
    return new Promise(resolve => {
      let idleTimer;
      let maxTimer;
      const finish = () => {
        clearTimeout(idleTimer);
        clearTimeout(maxTimer);
        document.removeEventListener("scroll", onScroll, true);
        resolve();
      };
      const onScroll = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(finish, 300);
      };
      document.addEventListener("scroll", onScroll, true);
      idleTimer = setTimeout(finish, 300);
      maxTimer = setTimeout(finish, 2000);
    });
  }

  function scrollToTop(container) {
    window.scrollTo(0, 0);
    for (const root of new Set([document.documentElement, document.body, document.scrollingElement])) {
      if (root) root.scrollTop = 0;
    }
    for (let element = container; element; element = element.parentElement) {
      const overflowY = window.getComputedStyle(element).overflowY;
      if (["auto", "scroll", "overlay"].includes(overflowY)) element.scrollTop = 0;
    }
  }

  function today(now = Date.now()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  async function loadAll(container, progress, timeout = 15000) {
    let usedShowMore = false;
    try {
      while (container.isConnected) {
        const button = container.querySelector("#showMoreBtn");
        if (!button) return;
        const count = container.querySelectorAll(".tile-content").length;
        progress("Alle activiteiten laden via 'Laat meer zien'...");
        await new Promise((resolve, reject) => {
          let timer;
          const observer = new MutationObserver(() => {
            if (!container.isConnected) finish(new Error("Het Lisa-overzicht is gesloten. Start de download opnieuw."));
            else if (container.querySelectorAll(".tile-content").length > count) finish();
          });
          function finish(error) {
            observer.disconnect();
            clearTimeout(timer);
            if (error) reject(error);
            else resolve();
          }
          observer.observe(document.documentElement, { childList: true, subtree: true });
          timer = setTimeout(() => finish(new Error("'Laat meer zien' heeft geen nieuwe activiteiten geladen. De lijst is mogelijk onvolledig.")), timeout);
          if (button.disabled) {
            finish(new Error("'Laat meer zien' is niet beschikbaar. De lijst is mogelijk onvolledig."));
          } else {
            usedShowMore = true;
            button.click();
          }
        });
      }
      throw new Error("Het Lisa-overzicht is gesloten. Start de download opnieuw.");
    } finally {
      if (usedShowMore) {
        await waitForScrollToSettle();
        scrollToTop(container);
      }
    }
  }

  const matchKey = data => JSON.stringify([data.clubId, data.id, data.memberId]);
  const cardTitle = card => card.querySelector(".tile-content strong")?.textContent.trim() || "Onbekende wedstrijd";

  // Reads the cards currently in the DOM without expanding them: upcoming matches
  // with a player name, deduplicated per club, match and member.
  function scan(container, now = Date.now()) {
    refresh();
    const errors = [];
    const entries = [];
    const seen = new Set();
    let duplicates = 0;
    for (const card of cards(container)) {
      if (!LisaPage.hasPlayer(card)) continue;
      let data;
      try {
        data = LisaPage.metadata(card);
        LisaCalendar.parseDate(data.date);
      } catch (error) {
        console.error("[Lisa wedstrijdagenda] Wedstrijd lezen mislukt.", error);
        errors.push(`${cardTitle(card)}: ${error.message}`);
        continue;
      }
      if (data.date.slice(0, 10) < today(now)) continue;
      const key = matchKey(data);
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      entries.push({
        key, card, data, cancelled: LisaPage.cancelled(card),
        date: data.date.slice(0, 10),
        playerName: LisaPage.playerName(card),
        title: `${data.opponentClub} ${data.opponentTeam}`.trim(),
        ownTeam: data.ownTeam, timeKnown: data.timeKnown,
      });
    }
    return { entries, duplicates, errors };
  }

  // Expands the chosen entries, reads their details and creates one combined calendar file.
  async function build(container, selected, name, options, progress = () => {}, now = Date.now()) {
    const current = new Map(scan(container, now).entries.map(entry => [entry.key, entry]));
    const files = [];
    const errors = [];
    let cancelled = 0;
    for (const [index, chosen] of selected.entries()) {
      const label = `${chosen.date} ${chosen.ownTeam} - ${chosen.title}`;
      try {
        const entry = current.get(chosen.key);
        if (!entry || !container.isConnected) throw new Error("De wedstrijdkaart is niet meer zichtbaar.");
        progress(`Wedstrijd ${index + 1} van ${selected.length} verwerken...`);
        if (entry.cancelled) {
          cancelled++;
          continue;
        }
        await LisaPage.waitForDetails(entry.card);
        if (!entry.card.isConnected || !container.isConnected) throw new Error("De wedstrijdkaart is niet meer zichtbaar.");
        refresh();
        const match = LisaPage.read(entry.card);
        if (match.cancelled) {
          cancelled++;
          continue;
        }
        files.push(await LisaCalendar.create(match, name, now, options));
      } catch (error) {
        console.error("[Lisa wedstrijdagenda] Wedstrijd exporteren mislukt.", error);
        errors.push(`${label}: ${error.message}`);
      }
    }
    return { file: files.length ? LisaCalendar.combine(files) : null, count: files.length, cancelled, errors };
  }

  async function collect(container, name, options, progress = () => {}, now = Date.now()) {
    const errors = [];
    try {
      await loadAll(container, progress);
    } catch (error) {
      console.error("[Lisa wedstrijdagenda] Activiteiten laden mislukt.", error);
      errors.push(error.message);
    }
    if (!container.isConnected) throw new Error("Het Lisa-overzicht is gesloten. Start de download opnieuw.");
    const found = scan(container, now);
    const selected = found.entries.filter(entry => !entry.cancelled);
    const built = await build(container, selected, name, options, progress, now);
    return {
      file: built.file, count: built.count,
      cancelled: found.entries.length - selected.length + built.cancelled,
      duplicates: found.duplicates, errors: [...errors, ...found.errors, ...built.errors],
    };
  }

  globalThis.LisaBulk = Object.freeze({ collect, scan, build, loadAll, today });
})();

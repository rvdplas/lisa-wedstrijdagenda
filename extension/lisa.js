(() => {
  "use strict";

  const clean = value => (value || "").replace(/\s+/g, " ").trim();
  const normalize = value => clean(value).toLocaleLowerCase("nl").replace(/[^\p{L}\p{N}]/gu, "");
  const clubKey = value => clean(value).toLocaleLowerCase("nl")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim()
    .replace(/^(?:(?:amhc|mhc|hc|hv|h|v|hockeyclub|de)\s+)+/, "")
    .replaceAll(" ", "");
  const text = (root, selector) => clean(root.querySelector(selector)?.textContent);
  const playerName = card => text(card, ".tile-content .d-block.text-muted.mt-1:not(.small)");
  const hasPlayer = card => Boolean(playerName(card));

  function matchDate(card, rawDate) {
    const heading = card.closest(".tile-day")?.querySelector(":scope > .mb-3 > .h6");
    if (!heading) return rawDate;
    const value = clean(heading.textContent).toLocaleLowerCase("nl");
    const match = /^\p{L}+\s+(\d{1,2})\s+(\p{L}+)\s+(\d{4})$/u.exec(value);
    const months = [
      ["januari", "january"], ["februari", "february"], ["maart", "march"],
      ["april"], ["mei", "may"], ["juni", "june"], ["juli", "july"],
      ["augustus", "august"], ["september"], ["oktober", "october"],
      ["november"], ["december"],
    ];
    const month = match ? months.findIndex(names => names.includes(match[2])) : -1;
    if (!match || month < 0) throw new Error("De zichtbare wedstrijddatum in Lisa kon niet worden gelezen.");
    const date = `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
    LisaCalendar.parseDate(date);
    return date;
  }

  function metadata(card) {
    const raw = card.getAttribute("data-lisa-agenda-match");
    if (!raw) throw new Error("De Lisa-paginastructuur wordt niet herkend. Herlaad de pagina; blijft dit zo, dan moet de extensie worden aangepast.");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (cause) {
      throw new Error("De wedstrijdgegevens uit Lisa zijn ongeldig.", { cause });
    }
    if (!data || typeof data !== "object" || typeof data.timeKnown !== "boolean"
      || !["id", "clubId", "memberId", "date", "ownTeam", "opponentClub", "opponentTeam"]
        .every(key => typeof data[key] === "string")) {
      throw new Error("De wedstrijdgegevens uit Lisa zijn onvolledig.");
    }
    return { ...data, date: matchDate(card, data.date) };
  }

  function cancelled(card) {
    return /\bafgelast\b|\bcancelled\b/i.test(card.textContent);
  }

  function read(card) {
    if (!hasPlayer(card)) throw new Error("Deze wedstrijdkaart heeft geen spelernaam.");
    const data = metadata(card);
    const details = card.querySelector(".match-tile-details");
    if (!details?.querySelector(".main-info")) throw new Error("De wedstrijddetails zijn nog niet geladen.");
    const teams = [...details.querySelectorAll(".team")].map(team => ({
      name: text(team, ".team-name"), club: text(team, ".club-name"),
    }));
    if (teams.length !== 2 || teams.some(team => !team.name || !team.club)) {
      throw new Error("De teams konden niet uit de wedstrijddetails worden gelezen.");
    }
    const isOpponent = team => normalize(team.name) === normalize(data.opponentTeam)
      && clubKey(team.club) === clubKey(data.opponentClub);
    const opponents = teams.map(isOpponent);
    if (opponents[0] === opponents[1]) {
      throw new Error("THUIS/UIT kon niet betrouwbaar worden bepaald. De tegenstander komt niet overeen met de wedstrijdkaart.");
    }
    const opponentIndex = opponents[0] ? 0 : 1;
    const fullName = team => `${team.club} ${team.name}`;
    const locationSection = [...details.querySelectorAll(".section")]
      .find(section => /^(Plaats|Location)$/i.test(text(section, ".title")));
    const address = locationSection?.querySelector(".address-info");
    const location = address ? clean([...address.childNodes].map(node =>
      node.nodeName === "BR" ? ", " : node.textContent).join("")) : "";
    return {
      ...data,
      cancelled: cancelled(card),
      side: opponentIndex === 0 ? "UIT" : "THUIS",
      opponent: `${data.opponentClub} ${data.opponentTeam}`.trim(),
      homeTeam: fullName(teams[0]), awayTeam: fullName(teams[1]),
      startTime: text(details, ".main-start-time"),
      meetingTime: text(details, ".main-meeting-time"),
      location,
    };
  }

  function waitForDetails(card, timeout = 15000) {
    const ready = () => card.querySelector(".match-tile-details .main-info");
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let timer;
      const observer = new MutationObserver(() => {
        if (ready()) finish();
      });
      function finish(error) {
        observer.disconnect();
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      }
      observer.observe(card, { childList: true, subtree: true });
      timer = setTimeout(() => finish(new Error("Lisa heeft de wedstrijddetails niet geladen. Klap de kaart dicht en weer open, of herlaad de pagina.")), timeout);
      if (!card.querySelector(".match-tile-details")) {
        const toggle = card.querySelector(".tile-content.cursor-pointer");
        if (!toggle) {
          finish(new Error("Deze wedstrijdkaart heeft geen toegankelijke wedstrijddetails."));
          return;
        }
        toggle.click();
      }
    });
  }

  globalThis.LisaPage = Object.freeze({ metadata, cancelled, read, waitForDetails, hasPlayer, playerName });
})();

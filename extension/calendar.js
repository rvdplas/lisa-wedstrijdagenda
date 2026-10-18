(() => {
  "use strict";

  const encoder = new TextEncoder();
  const zone = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });

  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value || "");
    if (!match) throw new Error("De wedstrijddatum ontbreekt of is ongeldig.");
    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new Error("De wedstrijddatum is ongeldig.");
    }
    return { year, month, day, date };
  }

  function localEpoch(date, time) {
    const { year, month, day } = parseDate(date);
    const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(time || "");
    if (!match) throw new Error("De verzameltijd ontbreekt of is ongeldig.");
    const target = Date.UTC(year, month - 1, day, Number(match[1]), Number(match[2]), Number(match[3] || 0));
    let epoch = target;
    for (let attempt = 0; attempt < 4; attempt++) {
      const parts = Object.fromEntries(zone.formatToParts(epoch).map(part => [part.type, part.value]));
      const observed = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
        Number(parts.hour), Number(parts.minute), Number(parts.second));
      if (observed === target) return epoch;
      epoch += target - observed;
    }
    throw new Error("Deze lokale tijd bestaat niet door de overgang naar zomertijd.");
  }

  const utc = epoch => new Date(epoch).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const dateOnly = date => date.toISOString().slice(0, 10).replaceAll("-", "");
  const escapeText = value => String(value).replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n").replaceAll(";", "\\;").replaceAll(",", "\\,");

  function fold(line) {
    const lines = [];
    let current = "";
    let bytes = 0;
    for (const character of line) {
      const size = encoder.encode(character).length;
      if (bytes + size > 75) {
        lines.push(current);
        current = " ";
        bytes = 1;
      }
      current += character;
      bytes += size;
    }
    lines.push(current);
    return lines.join("\r\n");
  }

  async function identity(parts) {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify(parts)));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  async function create(match, name, now = Date.now(), { privateEvent = false, attendeeEmails = "" } = {}) {
    const attendees = LisaAttendees.parse(attendeeEmails);
    name = name.trim();
    if (!name) throw new Error("Stel eerst via het extensie-icoon een naam in.");
    if (match.cancelled) throw new Error("Wedstrijd afgelast.");
    if (!match.opponent || !["THUIS", "UIT"].includes(match.side)) {
      throw new Error("Het eigen team of de tegenstander kon niet betrouwbaar worden bepaald.");
    }
    if (!match.id || !match.clubId) throw new Error("De wedstrijdidentificatie ontbreekt.");
    const { date } = parseDate(match.date);
    const summary = `[${name}] ${match.side} | ${match.opponent}`;
    const uid = await identity([match.clubId, match.id, match.memberId || "", name]);
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lisa wedstrijdagenda//NL",
      "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${uid}@lisa-wedstrijdagenda.local`,
      `DTSTAMP:${utc(now)}`,
    ];
    if (privateEvent === true) lines.push("CLASS:PRIVATE");
    for (const email of attendees) {
      const address = encodeURIComponent(email).replace("%40", "@");
      lines.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${address}`);
    }
    if (match.timeKnown) {
      const start = localEpoch(match.date, match.meetingTime);
      lines.push(`DTSTART:${utc(start)}`, `DTEND:${utc(start + 3 * 60 * 60 * 1000)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(date)}`,
        `DTEND;VALUE=DATE:${dateOnly(new Date(date.getTime() + 86400000))}`);
    }
    const description = [
      `${match.homeTeam} - ${match.awayTeam}`,
      match.timeKnown ? `Verzamelen: ${match.meetingTime}` : "Tijdstip nog niet vastgesteld.",
      match.timeKnown && match.startTime ? `Wedstrijdstart: ${match.startTime}` : "",
      "Gedownload uit Lisa. Latere wijzigingen worden niet automatisch bijgewerkt.",
    ].filter(Boolean).join("\n");
    lines.push(`SUMMARY:${escapeText(summary)}`, `DESCRIPTION:${escapeText(description)}`);
    if (match.location) lines.push(`LOCATION:${escapeText(match.location)}`);
    lines.push("END:VEVENT", "END:VCALENDAR");
    const filename = `${name}-${match.side}-${match.opponent}-${match.date.slice(0, 10)}`
      .normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 180) + ".ics";
    return { text: lines.map(fold).join("\r\n") + "\r\n", filename };
  }

  function combine(files) {
    if (!files.length) throw new Error("Er zijn geen wedstrijden om te downloaden.");
    const start = files[0].text.indexOf("BEGIN:VEVENT\r\n");
    const header = files[0].text.slice(0, start);
    const events = files.map(file => {
      const begin = file.text.indexOf("BEGIN:VEVENT\r\n");
      const end = file.text.lastIndexOf("END:VEVENT\r\n");
      if (begin < 0 || end < begin) throw new Error("Een agenda-bestand is ongeldig.");
      return file.text.slice(begin, end + "END:VEVENT\r\n".length);
    });
    return { text: header + events.join("") + "END:VCALENDAR\r\n", filename: "lisa-komende-wedstrijden.ics" };
  }

  globalThis.LisaCalendar = Object.freeze({ create, combine, parseDate, localEpoch });
})();

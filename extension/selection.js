(() => {
  "use strict";

  const dateFormat = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long",
  });

  // Cancelled matches can never be selected; everything else is selected unless the user opted out.
  function create() {
    const excluded = new Set();
    const selectable = entry => !entry.cancelled;
    return {
      isSelected: entry => selectable(entry) && !excluded.has(entry.key),
      set(key, selected) {
        if (selected) excluded.delete(key);
        else excluded.add(key);
      },
      setAll(entries, selected) {
        for (const entry of entries.filter(selectable)) this.set(entry.key, selected);
      },
      selected(entries) {
        return entries.filter(entry => selectable(entry) && !excluded.has(entry.key));
      },
    };
  }

  function groupByDate(entries) {
    const groups = new Map();
    for (const entry of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
      if (!groups.has(entry.date)) groups.set(entry.date, []);
      groups.get(entry.date).push(entry);
    }
    return [...groups].map(([date, items]) => ({ date, label: formatDate(date), items }));
  }

  function formatDate(date) {
    const { year, month, day } = LisaCalendar.parseDate(date);
    return dateFormat.format(new Date(Date.UTC(year, month - 1, day)));
  }

  globalThis.LisaSelection = Object.freeze({ create, groupByDate, formatDate });
})();

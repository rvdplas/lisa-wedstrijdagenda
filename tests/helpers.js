import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import { JSDOM } from "jsdom";

export const source = name => readFile(new URL(`../extension/${name}`, import.meta.url), "utf8");

export const sample = {
  id: "match-24", clubId: "club-1", memberId: "player-1", date: "2026-10-24T00:00:00",
  relationType: "family",
  timeKnown: true, ownTeam: "H.V. De Terriers JO14-1 T/C",
  opponentClub: "FIT", opponentTeam: "JO14-2",
};

export function cardHTML({ details = true, cancelled = false, player = "Testspeler" } = {}) {
  return `<div class="el-card"><div class="el-card__body tile">
    <div class="tile-content cursor-pointer">
      <svg data-icon="field-hockey-stick-ball"></svg>
      <strong>FIT JO14-2 - H.V. De Terriers JO14-1 T/C</strong>
      ${player === null ? "" : `<span class="d-block text-muted mt-1">${player}</span>`}
      <span class="d-block text-muted small mt-1">Veld 3</span>
      ${cancelled ? "<span>Afgelast</span>" : ""}
    </div>
    ${details ? detailsHTML : ""}
  </div></div>`;
}

export const detailsHTML = `<div class="match-tile-details">
  <div class="main-info"><div class="main-date">zaterdag 24 okt</div>
    <div class="main-start-time">12:45</div><div class="main-meeting-time">11:35</div>
  </div>
  <div class="team"><div class="team-name">JO14-2</div><div class="club-name">AMHC FIT</div></div>
  <div class="team"><div class="team-name">JO14-1 T/C</div><div class="club-name">H.V. De Terriers</div></div>
  <div class="section"><div class="title"><span>Plaats</span></div>
    <div class="address-info"><span>Sportpark 'Kadoelen'</span><br><span>Veld 3</span></div>
  </div>
  <div class="section"><div class="title">DWF Code</div><span>PRIVATE-CODE</span></div>
  <div class="section"><div class="title">Spelers</div><span>PRIVATE-PLAYER</span></div>
</div>`;

export async function page(html = cardHTML()) {
  const dom = new JSDOM(`<div id="app">${html}</div>`, {
    url: "https://mijn.lisahockey.nl/", runScripts: "outside-only",
  });
  dom.window.TextEncoder = TextEncoder;
  Object.defineProperty(dom.window, "crypto", { value: webcrypto });
  for (const name of ["attendees.js", "calendar.js", "lisa.js", "bulk.js", "selection.js", "panel-styles.js", "panel.js"]) dom.window.eval(await source(name));
  return dom;
}

export function attachMetadata(dom, overrides = {}) {
  const card = dom.window.document.querySelector(".el-card");
  card.setAttribute("data-lisa-agenda-match", JSON.stringify({ ...sample, ...overrides }));
  return card;
}

export function attachVue(dom, tiles) {
  const app = dom.window.document.querySelector("#app");
  app.__vue_app__ = {
    _container: {
      _vnode: {
        component: {
          subTree: {
            children: tiles.map(({ card, data = sample }) => ({
              component: {
                type: { __name: "MatchTile" },
                props: {
                  tile: {
                    date: data.date, clubId: data.clubId, clubMemberId: data.memberId, relationType: data.relationType,
                    match: {
                      id: data.id, isMatchTimeKnown: data.timeKnown, teamName: data.ownTeam,
                      opponentClubName: data.opponentClub, opponentTeam: data.opponentTeam,
                      secret: "DO-NOT-EXPOSE",
                    },
                  },
                },
                subTree: { el: card },
              },
            })),
          },
        },
      },
    },
  };
}

export function storageMock(window, initial = {}) {
  let values = { ...initial };
  const listeners = [];
  window.chrome = {
    storage: {
      local: {
        get: async keys => Object.fromEntries(
          (Array.isArray(keys) ? keys : [keys]).map(key => [key, values[key]]),
        ),
        set: async update => {
          const changes = Object.fromEntries(Object.entries(update).map(([key, value]) =>
            [key, { oldValue: values[key], newValue: value }]));
          values = { ...values, ...update };
          listeners.forEach(listener => listener(changes, "local"));
        },
      },
      onChanged: { addListener: listener => listeners.push(listener) },
    },
  };
  return () => values;
}

export async function until(predicate, timeout = 1500) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for fixture");
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

(() => {
  "use strict";

  // Lisa's production Vue build exposes its root VNode, not per-element component metadata.
  // Only the match fields needed by this extension cross into the isolated content script.
  function publish() {
    document.querySelectorAll("[data-lisa-agenda-match]")
      .forEach(card => card.removeAttribute("data-lisa-agenda-match"));
    const app = document.querySelector("#app")?.__vue_app__;
    const root = app?._container?._vnode;
    if (!root) return;
    const seen = new Set();
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object" || seen.has(node)) continue;
      seen.add(node);
      const component = node.component;
      if (component?.type?.__name === "MatchTile") {
        const tile = component.props?.tile;
        const match = tile?.match;
        const element = component.subTree?.el;
        const card = element?.closest?.(".el-card");
        if (card && match) {
          const text = value => typeof value === "string" || typeof value === "number" ? String(value) : "";
          card.setAttribute("data-lisa-agenda-match", JSON.stringify({
            id: text(match.id), clubId: text(tile.clubId), memberId: text(tile.clubMemberId),
            relationType: text(tile.relationType),
            date: text(tile.date), timeKnown: typeof match.isMatchTimeKnown === "boolean" ? match.isMatchTimeKnown : null,
            ownTeam: text(match.teamName), opponentClub: text(match.opponentClubName),
            opponentTeam: text(match.opponentTeam),
          }));
        }
      }
      if (component?.subTree) stack.push(component.subTree);
      if (Array.isArray(node.children)) stack.push(...node.children);
      if (node.suspense?.activeBranch) stack.push(node.suspense.activeBranch);
    }
  }

  document.addEventListener("lisa-agenda:scan", publish);
  publish();
  document.dispatchEvent(new Event("lisa-agenda:ready"));
})();

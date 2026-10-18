(() => {
  "use strict";

  globalThis.LisaPanelStyles = `
    :host { display: block; margin: 0 0 1rem; color: #192638; font: 14px/1.5 Inter, "Segoe UI", Arial, sans-serif; }
    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }
    button, input { font: inherit; }
    .panel { background: #fff; border: 1px solid #e4e8ee; border-radius: 12px; box-shadow: 0 1px 3px rgba(25, 38, 56, .05); overflow: hidden; }
    .main { padding: 16px 20px; }
    .head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .mark { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px; background: #f8eef0; color: #843238; flex: none; }
    .mark svg { width: 22px; height: 22px; }
    .titles { flex: 1; min-width: 0; }
    h2 { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.3; }
    .subtitle { margin: 0; font-size: 12px; color: #69778a; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid #e4e8ee; border-radius: 99px; background: #fbfcfd; color: #4c5a6b; font-size: 12px; font-weight: 600; white-space: nowrap; }
    .badge::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #98a3af; }
    .badge[data-tone="ready"]::before { background: #21795b; }
    .badge[data-tone="busy"]::before { background: #c58a1b; }
    .badge[data-tone="blocked"]::before { background: #b3382c; }
    .active-profile { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; margin: 12px 0 0; padding: 8px 12px; border: 1px solid #e8cfd2; border-radius: 8px; background: #fbf5f5; color: #5f272d; font-size: 13px; }
    .active-profile span { color: #69778a; }
    .active-profile strong { font-weight: 700; overflow-wrap: anywhere; }
    .summary { display: flex; align-items: center; justify-content: space-between; gap: 12px 20px; flex-wrap: wrap; margin-top: 14px; }
    .metrics { display: flex; align-items: baseline; gap: 6px 18px; flex-wrap: wrap; margin: 0; padding: 0; list-style: none; }
    .metrics li { display: flex; align-items: baseline; gap: 6px; color: #69778a; font-size: 13px; }
    .metrics strong { color: #192638; font-size: 22px; font-weight: 750; line-height: 1.1; }
    .metrics .secondary strong { font-size: 15px; color: #4c5a6b; }
    .primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 16px; border: 1px solid #843238; border-radius: 8px; background: #843238; color: #fff; font-weight: 650; cursor: pointer; white-space: nowrap; }
    .primary:hover:not(:disabled) { background: #6d262d; }
    .primary:disabled { opacity: .5; cursor: not-allowed; }
    .primary svg { width: 16px; height: 16px; }
    .note { margin: 10px 0 0; font-size: 12px; color: #69778a; }
    .feedback { margin: 12px 0 0; padding: 9px 12px; border-radius: 8px; font-size: 13px; background: #eef2f6; color: #2b3949; }
    .feedback[data-tone="success"] { background: #eaf7f0; color: #17624a; }
    .feedback[data-tone="warning"] { background: #fff6e0; color: #7a5200; }
    .feedback[data-tone="error"] { background: #fdeeed; color: #8f2a20; }
    .feedback p { margin: 0; }
    .feedback ul { margin: 6px 0 0; padding-left: 18px; font-size: 12px; overflow-wrap: anywhere; }
    .empty { margin: 14px 0 0; padding: 14px; border: 1px dashed #d5dbe3; border-radius: 8px; color: #69778a; text-align: center; font-size: 13px; }
    .toggle { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 20px; border: 0; border-top: 1px solid #edf0f3; background: #fcfcfd; color: #843238; font-weight: 650; text-align: left; cursor: pointer; }
    .toggle:hover { background: #f6f7f9; }
    .toggle svg { width: 14px; height: 14px; transition: transform .15s; }
    .toggle[aria-expanded="true"] svg { transform: rotate(90deg); }
    .toggle .count { margin-left: auto; color: #69778a; font-weight: 500; font-size: 12px; }
    .selection { padding: 12px 20px 16px; border-top: 1px solid #edf0f3; background: #fcfcfd; }
    .bulk { display: flex; gap: 16px; margin-bottom: 8px; }
    .link { padding: 4px 0; border: 0; background: none; color: #843238; font-size: 12px; font-weight: 650; cursor: pointer; }
    .link:hover { text-decoration: underline; }
    .list { max-height: 360px; overflow: auto; border: 1px solid #e8ebf0; border-radius: 8px; background: #fff; }
    .group + .group { border-top: 1px solid #e8ebf0; }
    h3 { margin: 0; padding: 6px 14px; background: #f6f8fb; color: #4c5a6b; font-size: 12px; font-weight: 700; text-transform: capitalize; }
    ul.items { margin: 0; padding: 0; list-style: none; }
    .item { display: flex; align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer; }
    .item + .item, .items li + li .item { border-top: 1px solid #f0f1f3; }
    .item:hover { background: #fbfcfd; }
    .item input { width: 16px; height: 16px; margin: 0; accent-color: #843238; flex: none; }
    .item[data-disabled] { cursor: not-allowed; color: #8c98a7; }
    .text { flex: 1; min-width: 0; }
    .text b { display: block; font-size: 13px; font-weight: 650; overflow-wrap: anywhere; }
    .text span { display: block; font-size: 12px; color: #69778a; overflow-wrap: anywhere; }
    .tag { padding: 2px 8px; border-radius: 6px; background: #f3f5f7; color: #667588; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .tag[data-tone="cancelled"] { background: #fdeeed; color: #8f2a20; }
    button:focus-visible, input:focus-visible { outline: 3px solid #2777bd; outline-offset: 2px; }
    @media (max-width: 560px) {
      .main { padding: 14px; }
      .selection { padding: 12px 14px 14px; }
      .toggle { padding: 10px 14px; }
      .summary { align-items: stretch; }
      .primary { width: 100%; }
      .badge { order: 3; }
    }
    @media (prefers-reduced-motion: reduce) { .toggle svg { transition: none; } }
  `;
})();

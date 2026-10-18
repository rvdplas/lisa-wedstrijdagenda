(() => {
  "use strict";

  function parse(value = "") {
    if (typeof value !== "string") throw new Error("De instellingen voor genodigden zijn ongeldig.");
    const addresses = value.split(/[,;\r\n]+/).map(address => address.trim()).filter(Boolean);
    const unique = new Map();
    for (const address of addresses) {
      const parts = address.split("@");
      if (address.length > 254 || parts.length !== 2
        || !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(parts[0])
        || parts[0].length > 64
        || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(parts[1])) {
        throw new Error(`Ongeldig e-mailadres: ${address}. Gebruik alleen e-mailadressen, zonder namen of haakjes.`);
      }
      const key = address.toLowerCase();
      if (!unique.has(key)) unique.set(key, address);
    }
    return [...unique.values()];
  }

  globalThis.LisaAttendees = Object.freeze({ parse });
})();

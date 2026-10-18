# Privacybeleid — Lisa wedstrijdagenda

**Laatst bijgewerkt: 18 oktober 2026**

Lisa wedstrijdagenda is een Chrome-extensie waarmee ouders hockeywedstrijden
uit hun Lisa-dashboard als agenda-bestand kunnen downloaden. Dit beleid legt
uit welke gegevens de extensie verwerkt en wat ermee gebeurt.

## Welke gegevens worden verwerkt?

De extensie verwerkt de volgende gegevens om de agenda-functies uit te voeren:

- **Profiel- en instelgegevens:** profielnamen, agendanamen, het actieve
  profiel en de voorkeur om agenda-items als privé te markeren.
- **Genodigden:** e-mailadressen die je zelf bij een profiel invult.
- **Wedstrijdgegevens uit Lisa:** de spelernaam op wedstrijdkaarten en
  wedstrijdinformatie zoals teams, datum, tijd en locatie. De extensie leest
  wedstrijdkaarten en bijbehorende details op het Lisa-dashboard om wedstrijden
  te tonen en agenda-items te maken.

De interne wedstrijd-, club- en speleridentificaties worden gebruikt om
agenda-items herkenbaar te maken en een vaste agenda-identificatie te vormen.
Ze worden niet als leesbare identificaties in het agenda-bestand opgenomen.

## Waarvoor worden de gegevens gebruikt?

De gegevens worden uitsluitend gebruikt om:

- wedstrijden van het gekozen profiel te tonen en te selecteren;
- de wedstrijdgegevens om te zetten naar een agenda-bestand (`.ics`);
- de profielinstellingen en voorkeuren voor een volgend gebruik te bewaren;
- optioneel de door jou ingevulde genodigden en de privé-markering in het
  agenda-bestand op te nemen.

De extensie verstuurt geen uitnodigingen en synchroniseert niet met een agenda.
Een agenda-app kan de inhoud van het bestand na import volgens zijn eigen
instellingen verwerken.

## Opslag en delen

Profielen en instellingen worden lokaal in Chrome opgeslagen via
`chrome.storage.local`. De extensie heeft geen eigen server, verstuurt geen
gegevens naar de ontwikkelaar of andere diensten en gebruikt geen analytics
of advertenties.

Het `.ics`-bestand wordt door je browser naar je apparaat gedownload. Als je
genodigden hebt ingesteld, staan hun e-mailadressen in dat bestand. Je bepaalt
zelf met wie je het bestand deelt en in welke agenda-app je het importeert.

De extensie leest gegevens op `https://mijn.lisahockey.nl/` wanneer je het
Lisa-dashboard gebruikt. Lisa kan de websitegegevens verwerken volgens de
eigen voorwaarden en het privacybeleid van Lisa; dat valt buiten de controle
van deze extensie.

## Bewaren en verwijderen

De opgeslagen instellingen blijven in de lokale extensieopslag staan totdat je
ze wijzigt of verwijdert, of de lokale extensiegegevens via Chrome wist.
Gedownloade bestanden en geïmporteerde agenda-items beheert de agenda-app of
het apparaat waarin je ze hebt opgeslagen; de extensie verwijdert of wijzigt
die niet automatisch.

## Open source en wijzigingen

De broncode en dit beleid worden samen gepubliceerd in de openbare
GitHub-repository van het project. Dit beleid wordt aangepast als de
gegevensverwerking verandert. Controleer de actuele versie van dit bestand in
die repository.

## Contact

Je kunt via GitHub Issues in de projectrepository vragen over dit beleid
stellen; zie ook [SUPPORT.md](./SUPPORT.md). Plaats geen persoonsgegevens of e-mailadressen in een openbaar
issue.

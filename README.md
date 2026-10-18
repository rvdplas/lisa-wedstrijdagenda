# Lisa wedstrijdagenda

Extensie voor Chrome 111 of nieuwer, voor wedstrijden op **https://mijn.lisahockey.nl/**. Voegt boven
de activiteitenlijst van het dashboard één compact paneel **Hockey Agenda Export**
toe (in een Shadow DOM, dus zonder invloed op de Lisa-opmaak). Wedstrijdkaarten
blijven ongewijzigd. Alleen kaarten met een ingevulde spelernaam onder
de wedstrijdtitel worden opgenomen; kaarten zonder spelernaam nooit.
Werkt voor wedstrijden en oefenwedstrijden die Lisa
als wedstrijdkaart toont, niet voor trainingen, diensten of andere afspraken.

[Privacybeleid](./PRIVACY.md) · [Support](./SUPPORT.md)

## Installeren

1. Bewaar deze projectmap op je computer.
2. Open `chrome://extensions` in desktop-Chrome.
3. Zet **Ontwikkelaarsmodus** aan.
4. Klik op **Uitgepakte extensie laden** en selecteer de map
   [extension](./extension), niet de bovenliggende projectmap.
5. Klik op het extensie-icoon (eventueel via het puzzelstukje) en open
   **Lisa wedstrijdagenda**.
6. Vul de **Naam speler (profiel)** in zoals die op de Lisa-wedstrijdkaarten staat, bepaal de **Naam in agenda**, en klik op **Opslaan**.
7. Open of herlaad je ingelogde Lisa-dashboard.

### Privé in Outlook

Vink via het extensie-icoon **Agenda-items als privé markeren (Outlook)** aan
en klik op **Opslaan**. Nieuwe downloads bevatten dan `CLASS:PRIVATE`, zowel
voor afspraken met een tijdstip als voor hele-dagafspraken. Standaard staat
de optie uit en voegt de extensie geen zichtbaarheidsmarkering toe.

Controleer na import in Outlook of de afspraak als **Privé** is gemarkeerd:
de importverwerking en toegangsrechten worden door Outlook en je organisatie
bepaald. De markering is geen versleuteling of garantie dat niemand de inhoud
kan zien. De extensie wijzigt geen Outlook-accountinstellingen of bestaande
afspraken. De keuze geldt direct voor de volgende download, ook zonder de
Lisa-pagina opnieuw te laden.

### Profielen voor meerdere kinderen

In het instellingenvenster kun je voor ieder kind een profiel aanmaken. Gebruik
als profielnaam de spelernaam zoals die op de Lisa-wedstrijdkaarten staat.
Stel per profiel de **Naam in agenda** en **Genodigden** in. Alleen wedstrijden
van de actieve speler worden in het paneel getoond en gedownload; de agendanaam
van dat profiel wordt in de wedstrijdtitels gebruikt. Klik op **Opslaan** om de
profielkeuze en wijzigingen toe te passen. De optie
**Agenda-items als privé markeren** geldt voor alle profielen.

Bij een bestaande installatie wordt de eerder ingestelde agendanaam en lijst
met genodigden automatisch als eerste profiel getoond. Controleer de spelernaam
en sla ieder bestaand profiel eenmaal op om de wedstrijden aan die speler te
koppelen. Een profiel kun je
verwijderen met **Verwijderen**; klik daarna op **Opslaan** om de wijziging te
bewaren. Er moet altijd ten minste één profiel overblijven.

Er is geen build of installatie van npm-pakketten nodig om de extensie te
gebruiken. Andere ouders kunnen dezelfde extensiemap installeren en hun eigen
naam invullen. Publicatie in de Chrome Web Store is niet inbegrepen.

## Gebruiken

### Het exportpaneel

Boven het Lisa-dashboard staat het paneel **Hockey Agenda Export**
(LISA → Outlook). Bij het openen van het dashboard klikt de extensie
automatisch op **Laat meer zien** totdat alle activiteiten geladen zijn. Daarna
scrollt de pagina en eventuele scrollcontainers terug naar boven, waarna het
paneel het aantal geselecteerde wedstrijden, het aantal overgeslagen dubbele
kaarten en afgelaste wedstrijden, en de knop **Download agenda** toont.

Onder **Selectie aanpassen** staan alle komende wedstrijden per datum. Alle
wedstrijden zijn standaard geselecteerd; je kunt ze afzonderlijk aan- en
uitzetten of **Alles selecteren** / **Niets selecteren** gebruiken. Afgelaste
wedstrijden worden getoond maar zijn niet selecteerbaar. Het aantal op de
knop en het gedownloade bestand komen exact overeen met je selectie.
Bij het downloaden worden de details van de gekozen wedstrijden achtereenvolgens
geladen; Lisa kan hierbij kaarten uitklappen.

Je krijgt één `.ics`-bestand met alle verwerkbare wedstrijden **vanaf vandaag**,
inclusief vandaag volgens de Nederlandse datum. De ingestelde naam, privéoptie
en genodigden gelden voor alle afspraken. Hele-dagafspraken blijven ondersteund.
Alleen wedstrijden die Lisa in dit dashboard beschikbaar stelt, kunnen worden
meegenomen; de extensie vraagt geen verborgen seizoenen of andere teams op.

Kaarten zonder spelernaam, waaronder favoriete-teamkaarten, worden altijd
overgeslagen. Dubbele kaarten voor dezelfde wedstrijd en speler worden eenmaal
opgenomen. Verschillende spelers blijven afzonderlijke afspraken.
Afgelaste wedstrijden en wedstrijden in het verleden worden niet opgenomen.

Na afloop toont het paneel hoeveel afspraken zijn gemaakt en welke wedstrijden
niet konden worden verwerkt, inclusief de reden. De overige afspraken worden
wel gedownload. Als **Laat meer zien** vastloopt, staat er expliciet dat de lijst
mogelijk onvolledig is. Zonder verwerkbare afspraken wordt geen bestand gemaakt.
Er worden geen uitnodigingen verstuurd en eerdere agenda-imports veranderen niet.

### Genodigden vooraf invullen

Vul via het extensie-icoon bij **Genodigden (optioneel)** de e-mailadressen in:
een adres per regel, of gescheiden door komma's of puntkomma's. Gebruik alleen
adressen, zonder namen of haakjes. Klik op **Opslaan**. De lijst geldt voor alle
volgende downloads en wordt lokaal bewaard. Dubbele adressen worden verwijderd;
ongeldige adressen worden gemeld en niet opgeslagen. Maak het veld leeg en sla
op om geen genodigden meer toe te voegen.

Het agenda-bestand bevat deze adressen als `ATTENDEE` met een verzoek om reactie.
**De extensie verstuurt geen uitnodigingen.** Er is geen Outlook-accountkoppeling,
geen ingestelde organisator en geen automatische vergaderaanvraag (`METHOD:REQUEST`).
Open het bestand in Outlook, controleer of de deelnemers zijn overgenomen en
verstuur daar zelf de uitnodiging vanuit je eigen account. Afhankelijk van je
Outlook-versie en de manier van importeren moet je de afspraak eerst omzetten
naar een vergadering of de deelnemers opnieuw toevoegen.

Dit geldt ook voor hele-dagafspraken en werkt samen met de optie **Privé**.
De uitnodigingsadressen staan leesbaar in het gedownloade bestand; deel dat
bestand dus bewust. Veranderen van de lijst past eerdere imports niet aan.

Het bestand is een **eenmalige import**: Outlook synchroniseert niet met Lisa.
Open het `.ics`-bestand in je agenda-app en bevestig daar de import.

Voorbeeld:

- Titel: `[Sake] UIT | FIT JO14-2`
- Verzamelen: 11:35, wedstrijdstart: 12:45
- Agenda-afspraak: **11:35 tot 14:35**
- Locatie: sportpark en veld, voor zover Lisa die opgeeft

De begin- en eindtijd worden vanuit **Europe/Amsterdam** naar UTC omgezet. Zo
blijft het juiste tijdstip behouden bij zomer-/wintertijd en bij een computer
in een andere tijdzone. Je agenda kan het tijdstip in je eigen weergavetijdzone
tonen. De duur is exact drie verstreken uren.

Een wedstrijd met een bekende datum maar zonder vastgesteld tijdstip wordt
een hele-dagafspraak. Een kaart met ontbrekende of ongeldige datum wordt in het paneel gemeld als
niet leesbaar. Afgelaste wedstrijden zijn niet selecteerbaar. Als Lisa de
afgelasting pas in de details toont, wordt deze bij het laden daarvan alsnog
gecontroleerd en gemeld.

De titel gebruikt altijd de agendanaam van het actieve profiel. Het profiel
selecteert geen kind of team in Lisa: het paneel exporteert de geselecteerde
wedstrijden. THUIS/UIT wordt bepaald vanuit het eigen team bij die kaart.

## Grenzen

- Geen synchronisatie: wijzigingen en afgelastingen na import moet je zelf in
  de agenda verwerken.
- Opnieuw downloaden mag altijd. Dezelfde wedstrijd, spelercontext en
  ingestelde naam krijgen een vaste UID, ook als datum of tijd verandert.
  De agenda-app bepaalt of opnieuw importeren bijwerkt of dupliceert.
  Een gewijzigde ingestelde naam levert een andere UID op.
- Domeinaanname: als Lisa een wedstrijdtijd heeft vastgesteld, is er ook een
  verzameltijd. Een onleesbare pagina wordt niet met verzonnen tijden aangevuld.
- Alleen dashboard-wedstrijdkaarten op het genoemde domein worden ondersteund.
  Kaarten zonder opvraagbare wedstrijddetails kunnen niet worden gedownload.
- Geen alarmen, automatische agenda-koppeling of herinneringsinstellingen.
- De volledige datum inclusief jaar wordt uit de zichtbare dagkop boven de
  wedstrijdkaart gelezen (Nederlandse en Engelse datumnotatie). Deze is leidend
  voor zowel de download als de selectie van komende wedstrijden. Zo kan een
  ruwe datumwaarde rond middernacht de afspraak niet naar de vorige dag
  verschuiven. Alleen als de kaart geen dagkop heeft, wordt de opgeslagen
  kaartdatum gebruikt. Een aanwezige maar onleesbare dagkop geeft een foutmelding.

## Privacy en permissies

Alle verwerking gebeurt lokaal. De extensie bewaart profielen met hun
agendanamen en uitnodigingsadressen, en de gedeelde privévoorkeur in
`chrome.storage.local`. Geen eigen server, analytics, wachtwoordopslag of
extra API-verzoeken vanuit de extensie. Het openen van details laat Lisa zelf
zijn normale gegevens laden.

De download bevat de ingestelde naam, beide teams, datum/tijden en locatie,
geen spelerslijst uit Lisa, DWF-code of accountgegevens. Zelf ingestelde
genodigden worden wel als e-mailadressen opgenomen. De interne wedstrijd-,
club- en speleridentificatie worden alleen gebruikt voor een gehashte UID.
De enige aangevraagde Chrome-permissie is `storage`; scripts worden uitsluitend
op `https://mijn.lisahockey.nl/*` uitgevoerd.

## Technische aansluiting en testen

De aansluiting is gebaseerd op de publiek beschikbare Lisa-dashboardbundel,
bekeken op 18 oktober 2026. [bridge.js](./extension/bridge.js) leest een beperkte
set kaartgegevens uit de productie-Vue-boom (`MatchTile.props.tile`).
Alleen die velden worden via een DOM-attribuut aan het geisoleerde
content-script doorgegeven. Er worden geen tokens of volledige gebruikers-
of applicatiestores uitgelezen.

[lisa.js](./extension/lisa.js) leest de details uit Lisa's bestaande DOM:
`.match-tile-details`, `.main-start-time`, `.main-meeting-time`, `.team` en
de locatie-sectie. Gangbare clubvoorvoegsels zoals AMHC, MHC en H.V. worden
bij het vergelijken van clubnamen genegeerd; het teamnummer moet overeenkomen.
Bij niet-herkende of dubbelzinnige gegevens verschijnt een foutmelding in
plaats van een onbetrouwbare download. Een wijziging aan Lisa kan een
aanpassing aan deze adapter vereisen.

Structuur van de extensie: [bulk.js](./extension/bulk.js) leest en ontdubbelt
kaarten (`scan`) en maakt het bestand (`build`); [selection.js](./extension/selection.js)
bevat de selectiestatus en datumgroepering; [panel.js](./extension/panel.js)
tekent het paneel (stijl in [panel-styles.js](./extension/panel-styles.js));
[content.js](./extension/content.js) koppelt dit aan de pagina en instellingen.

De kaartherkenning in [bulk.js](./extension/bulk.js) gebruikt de gerenderde
Font Awesome-icoonnaam `field-hockey-stick-ball` en ondersteunt ook de oudere
naam `field-hockey`. Lisa vraagt het icoon met die oudere alias op, maar
Font Awesome rendert het SVG-attribuut `data-icon` met de canonieke naam.

Ontwikkeltests:

```sh
npm ci
npm test
npm run check
```

De DOM-tests gebruiken fixtures van de aangetroffen componentstructuur,
inclusief ingeklapte kaarten, dynamisch toegevoegde kaarten en de lokale
instellingen. Ze zijn geen vervanging voor een ingelogde praktijktest.

### Controle na installatie of een Lisa-update

1. Controleer een uitwedstrijd en een thuiswedstrijd: titel, tegenstander en
   THUIS/UIT moeten kloppen.
2. Download via het paneel; controleer verzameltijd, datum inclusief
   jaar, drie uur duur en locatie na import.
3. Controleer een wedstrijd zonder tijdstip: slechts een hele-dagafspraak op
   de betreffende datum.
4. Controleer een afgelaste wedstrijd (niet selecteerbaar) en een lege naam
   (knop uitgeschakeld, met uitleg).
5. Wijzig de naam via het extensie-icoon: het paneel moet de nieuwe naam meteen
   gebruiken bij de volgende download.
6. Zet wedstrijden uit onder **Selectie aanpassen** en controleer dat alleen de
   gekozen wedstrijden in het bestand staan.
7. Navigeer binnen Lisa of laad meer kaarten: het paneel mag niet dubbel
   verschijnen en mag de favoriete-teamszijbalk niet overlappen.
8. Bedien het paneel met alleen het toetsenbord (Tab, Spatie, Enter).

Na wijzigingen aan de extensie: klik op **Opnieuw laden** in
`chrome://extensions` en herlaad daarna het Lisa-tabblad.

De domeinbegrippen staan in [GLOSSARY.md](./GLOSSARY.md).

# Case Study - Optima Geräte

## Kontext

**Optima** verschickt Energiemanager-Geräte (kleine Hardware-Boxen) an Endkunden und begleitet jedes Gerät von der Bestellung, bis es beim Kunden **online** ist. Jedes Gerät durchläuft einen festen Lebenszyklus:

```text
Bestellt -> Verschickt -> Verbaut -> Aktiviert -> Online
                                        \-> Online mit Problem / Offline / Storniert
```

Bei hunderten Geräten verliert man ohne Überblick den Faden: Was ist verschickt, aber nie aktiviert worden? Welches Gerät ist seit Tagen offline? Bei welchem Kunden steht die Installation an, aber es wurde noch gar kein Gerät bestellt?

## Das Problem, das du löst

Wir wollen ein Dashboard, das diese Geräte-Flotte steuerbar macht, eine Übersicht, die auf einen Blick zeigt, wo jedes Gerät im Prozess steht, was liegenbleibt und was als Nächstes zu tun ist.

## Deine Aufgabe

Bau das Dashboard als **Frontend + eigenes Backend**. Die Daten kommen aus einer API, die wir dir stellen (siehe unten). Dein Frontend spricht ausschließlich mit deinem Backend, nicht direkt mit unserer API.

### Kern (MVP)

1. Geräte-Liste mit den wichtigsten Spalten: Kunde (Name/Ort), Gerätetyp, aktueller Lifecycle-Status, Serien-/MAC-Nummer, geplanter Installationstermin, Online-Indikator. Filterbar nach Lifecycle-Status und Gerätetyp, durchsuchbar (Kunde / Serial / MAC).
2. KPI-Leiste oben: Anzahl Geräte pro Lifecycle-Stufe klickbar, filtert die Liste plus ein Zähler „Installation steht an“.
3. Status pflegen: den Lifecycle eines Geräts weiterschalten und MAC/Serial/Notiz bearbeiten. Unsere API ist read-only, diese Änderungen hält dein Backend selbst und überlagert die gezogenen Daten; die Zeitstempel bei einem Statuswechsel setzt du selbst.
4. Detailansicht eines Geräts: eine Timeline der Stationen (wann bestellt / verschickt / verbaut / aktiviert) und der Kontext zum Kunden.

### Anforderung an dein Backend

Dein Backend soll echte Arbeit machen, nicht nur die API durchreichen:

- die Daten einmal von unserer read-only API in eine eigene kleine DB ziehen und darauf operieren - Status ändern, Notizen etc. laufen gegen deine DB, nicht gegen uns,
- die KPI-Zahlen serverseitig aggregieren (die API liefert die nicht fertig),
- den Online-Status ableiten (z. B. „offline seit 3 Tagen“ aus einem `lastSeen`-Zeitstempel),
  - Filter/Suche/Sortierung serverseitig lösen,
- Auth/Token gegen unsere API kapseln und Fehler sauber behandeln.

### Optional

- „Anstehende Bestellungen“: Kunden mit anstehender Installation, für die noch gar kein Gerät existiert (Arbeitsvorrat fürs Bestellen).
- Installationstermine nach Kalenderwoche gruppieren.
- Live-Online-Ampel grün/rot inkl. „offline seit …“.
- Saubere Empty-/Loading-/Error-States, brauchbar auf Mobile, ein paar Tests.
- Many more…

## Die API (du bekommst nur API-Zugang)

Base-URL & Token bekommst du separat. Auth: `Authorization: Bearer <token>`. Die API ist **read-only** du ziehst nur Daten; Änderungen (Status etc.) hältst du in deinem eigenen Backend.

| Methode + Pfad | Liefert / bewirkt |
| --- | --- |
| `GET /devices?lifecycle=&deviceType=&search=` | Liste aller Geräte inkl. Kunden- & Installations-Kontext |
| `GET /devices/:id` | Ein Gerät mit allen Details + Timeline-Zeitstempeln |
| `GET /upcoming-orders` | Geräte mit Installation in den nächsten 14 Tagen, die noch nicht verschickt/verbaut sind *(Arbeitsvorrat, optional)* |
| `GET /online-status` | `[{ mac, lastSeen, isOnline }]` roher Live-Status, den du selbst auswertest *(optional)* |

**Beispiel-Element aus `GET /devices`:**

```json
{
  "id": "dev_1a2b",
  "deviceType": "GW5",
  "lifecycle": "Verschickt",
  "serialNumber": "GW5-002931",
  "macAddress": "A4:CF:12:AB:CD:EF",
  "trackingUrl": "https://post.at/track/...",
  "notes": null,
  "orderedAt": "2026-06-10T08:00:00Z",
  "shippedAt": "2026-06-12T14:20:00Z",
  "installedAt": null,
  "activatedAt": null,
  "lastSeenAt": null,
  "customer": {
    "name": "Fam. Muster",
    "email": "muster@example.at",
    "state": "Tirol"
  },
  "installation": {
    "type": "Wärmepumpe",
    "date": "2026-07-08"
  }
}
```

**Lifecycle-Werte:** `Bestellt` · `Verschickt` · `Verbaut` · `Aktiviert` · `Online` · `Online mit Problem` · `Offline` · `Storniert`

**Gerätetypen (Beispiele):** `GW5` · `Zero` · `Meo CoPilot` · `Meo Cloud`

## Rahmen & Regeln

- Zeit: plane ca. 1 Arbeitstag, max. 2. Scope schlägt Vollständigkeit.
- Tech-Stack: frei wählbar. Intern nutzen wir TypeScript, React (Vite) und Node.
- KI-Tools (Copilot, Claude, …) sind erlaubt und erwünscht!!!

## Abgabe

Loom-Video (5 bis 10 Min): App kurz live zeigen (Happy Path) und dein Warum erklären Architektur, Trade-offs, was du mit mehr Zeit anders/weiter machen würdest. Das Video ist uns so wichtig wie der Code. **Bitte auch deine Gedankengänge (Assumptions) in das Video, das ist super wichtig um zu verstehen, was du dir dabei gedacht hast.**

Wir erwarten **keine** produktionsreife App, sondern wollen sehen, wie du unter realem Zeitdruck priorisierst und umsetzt.

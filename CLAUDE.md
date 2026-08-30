# KTM – Kälte-Technik-Management

Projektanweisungen für Claude Code. Diese Datei wird automatisch gelesen –
die Preislogik muss nicht in jeder Sitzung neu erklärt werden.

## Was das ist

PWA für einen Kälte-/Klimatechnik-Betrieb in Österreich (Einzelbetrieb).
Angebote, Rechnungen, Materialkatalog, Projektverwaltung, Kühllastrechner.

Vanilla JS, **kein Framework**. Offline-first: IndexedDB lokal + Supabase-Sync.
Läuft als PWA auf Handy, Tablet und Laptop. Deployment über Vercel – baut
automatisch nach dem Push, dauert 1–2 Minuten.

## Dateien

| Datei | Inhalt |
|---|---|
| `js/01-core-db-sync.js` | DB, Sync, `recomputeOffer`, `offerProfitCore`, `ekInfo` |
| `js/03-pages.js` | Renderer, `CALC_STATE`, **Build-Nummer** |
| `js/07-extensions-init.js` | Modals, PDF-Export, App-Methoden (~7800 Zeilen) |
| `js/06-lernen-rechnungen.js` | Rechnungen, Finanzübersicht |
| `js/09-katalog-import.js` | Katalogdaten, 236 Einträge |
| `styles/app.css` | Styles |

## Preislogik – das Herzstück

**Grundregel:** `sellingPrice` im Katalog ist **immer der Listenpreis NETTO**,
genau wie im gedruckten Herstellerkatalog. Kein Aufschlag, keine Rundung.

**Verkauf:** Listenpreis netto × 1,20 = Endpreis. Der Kunde sieht **nur** diesen
Endpreis. Die Wörter „netto", „brutto", „MwSt." oder „inkl. USt." dürfen im
Angebot und im PDF **nirgends** auftauchen.

**Einkauf:** Der EK wird aus dem Listenpreis berechnet, nie umgekehrt. Der
eingetragene Prozentwert ist immer der **Rabatt** auf den Netto-Listenpreis:

```
ekNetto = listenpreisNetto × (100 − rabatt) / 100
```

Reihenfolge: tatsächlicher EK → Artikelrabatt → Markenrabatt → keiner.
Markenrabatte gelten **pro Hersteller**, nie global.

**Drei getrennte Dinge, nie verwechseln:**
Kundenrabatt ≠ Händlerrabatt ≠ Einkaufspreis

**Umsatzsteuer:** Material und Geräte immer 20 %. Arbeitsleistung folgt dem
MwSt-Schalter des Angebots, wird **nicht** rabattiert und erscheint **nicht** in
der Positionstabelle, sondern als eigene Zeile im Summenblock nach dem Rabatt.

**Summenblock:**
```
Zwischensumme (Material inkl. USt.)
− Rabatt (x %) auf Material
+ Arbeitsleistung Montage
= Gesamtbetrag
```

**Gewinn:** Verkauf netto − Einkauf netto. Niemals Netto gegen Brutto rechnen.
Der EK-Snapshot an der Position (`purchasePriceNet`) hat Vorrang vor dem
Materialstamm – so bleibt ein altes Angebot stabil, wenn sich der Materialstamm
später ändert.

## Zentrale Funktionen – nicht duplizieren

```js
recomputeOffer(offer)                                // Summen
offerProfitCore(offer, materials, dealerDiscounts)   // Gewinn/Marge
ekInfo(m, dealerDiscounts)                           // EK-Ermittlung
ekPerSalesUnit(m, dealerDiscounts)                   // EK je Verkaufseinheit
matBrutto(m) / matNetto(m)                           // Materialpreis
posVatRate(p, offer) / isLaborPos(p)                 // Steuersatz
```

`dealerDiscounts` **immer mitgeben**. Ohne den Parameter fällt die Funktion auf
einen Cache zurück, der beim ersten Rendern leer sein kann – dann fehlen
Markenrabatte still und Positionen erscheinen fälschlich als „EK fehlt".

## Arbeitsweise

1. Erst den bestehenden Code **lesen**, dann bauen. Nie raten.
2. Punkt für Punkt: bauen, testen, pushen.
3. **Build-Nummer in `js/03-pages.js` vor jedem Push hochzählen.**
4. Jede geänderte JS-Datei auf Syntax prüfen:
   `node -e "new (require('vm').Script)(require('fs').readFileSync('DATEI','utf8'))"`
5. Bei Unklarheit **nachfragen** statt raten.
6. Keine kosmetische Zwischenlösung – die Ursache beheben.
7. Antworten kurz und auf Deutsch.

## Ohne ausdrücklichen Auftrag unantastbar

- Die gesamte Preis-, Steuer- und Gewinnlogik
- Die Katalog-Listenpreise (echte Herstellerpreise, abfotografiert)
- Menüstruktur, Seiten, Datenmodell

## Bekannte Fallstricke

Alle sind hier bereits einmal passiert und haben Geld oder Daten gekostet:

- **Doppelte Funktionsnamen.** In JS gewinnt stillschweigend die zweite
  Definition, die erste wird toter Code. Hat zu Datenverlust geführt
  (`openProjectModal` löschte Besichtigungsdaten). Vor Änderungen prüfen, ob
  eine Funktion mehrfach existiert.
- **Bruttopreis zurück ins Netto-Feld schreiben.** Verdoppelt den Preis bei
  jedem Speichern: aus 436 wurden 627,84 und dann 904,09.
- **Positionen ohne `materialId`.** Entstehen ohne Katalogbezug, tauchen doppelt
  auf und verlieren ihren Einkaufspreis.
- **Kategorie an der Angebotsposition ist eine Kopie**, keine Live-Verknüpfung.
  Ändert man sie am Material, müssen bestehende Positionen mitgezogen werden.
- **Sync ohne Zeitstempel-Vergleich** überschreibt lokale Änderungen still.
- **Rollen-/Bundware** (Kupferrohr): Einkauf pro Rolle, Verkauf pro Meter.
  Immer `ekPerSalesUnit()` nutzen, nie selbst rechnen.
- **Export- und Import-Listen auseinandergelaufen.** Der Restore leerte 15
  Bereiche und stellte 11 wieder her. Beide nutzen jetzt `ALL_STORES`.

## Pushen

```bash
git add -A && git commit -m "Build v164 – ..." && git push
```

Alternativ ohne git:
```bash
node tools/push.js js/03-pages.js -m "Build v164"
node tools/push.js --alle-geaenderten -m "Nachricht"
node tools/push.js <datei> -m "Test" --probe    # nur anzeigen
```

Der GitHub-Token kommt aus `GITHUB_TOKEN` und darf **niemals** in einer Datei
stehen – er landet sonst dauerhaft in der Git-Historie.

## Testen

Es gibt keine automatisierten Tests. Nach jeder Änderung mindestens:

```bash
for f in js/*.js; do node -e "new (require('vm').Script)(require('fs').readFileSync('$f','utf8'))" || echo "FEHLER $f"; done
```

Bei Änderungen an der Preislogik zusätzlich mit echten Zahlen gegenrechnen –
z. B. LG EZ09CYN: Listenpreis 436 netto → Endpreis 523,20 → bei 53 % Rabatt
EK 204,92 → Gewinn 231,08.

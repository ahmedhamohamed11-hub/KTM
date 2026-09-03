

        // ============================================================
        // ====== KÄLTELAST-BERECHNUNGSENGINE (Phase 3) ===============
        // ============================================================
        // GRUNDREGEL DIESER DATEI: hier wird gerechnet, nicht geraten.
        // Jede Zahl ist entweder eine physikalische Formel oder ein als
        // solcher gekennzeichneter Richtwert. Nichts hier ruft eine KI oder
        // eine kostenpflichtige API auf - die Engine laeuft komplett offline.
        //
        // Aufbau (bewusst so, damit die spaeteren Phasen andocken koennen):
        //   KAELTE_RICHTWERTE   - nachschlagbare Richtwerte, alle mit Quelle
        //   kaelteVorschlaege() - fuellt fehlende Eingaben mit Richtwerten
        //   kaelteBerechne()    - reine Physik, kennt keine Vorschlaege
        //   kaelteAuslegung()   - fasst mehrere Kuehlstellen zusammen
        // Spaetere Module (Rohrdimensionierung, Verbund, Komponentenwahl)
        // rufen kaelteAuslegung() auf und brauchen nichts davon zu kopieren.
        //
        // STATUS-KENNZEICHNUNG jedes Werts:
        //   eingabe    🟢 vom Benutzer eingegeben
        //   berechnet  🔵 aus anderen Werten berechnet
        //   schaetzung 🟡 Richtwert-Schaetzung, vom Benutzer aenderbar
        //   hersteller 🟠 Herstellerwert erforderlich/eingetragen
        //   pruefen    🔴 fachliche Pruefung zwingend erforderlich

        const KAELTE_STATUS = {
            eingabe:    { icon: '🟢', label: 'Eingabe' },
            berechnet:  { icon: '🔵', label: 'Berechnet' },
            schaetzung: { icon: '🟡', label: 'Richtwert-Schätzung' },
            hersteller: { icon: '🟠', label: 'Herstellerwert' },
            pruefen:    { icon: '🔴', label: 'Prüfung erforderlich' }
        };

        // ---------- Richtwerte. Jeder Eintrag nennt seine Herkunft. ----------
        const KAELTE_RICHTWERTE = {
            // Waermeleitfaehigkeit Daemmstoffe [W/mK]. Typische Katalogwerte -
            // der konkrete Paneelhersteller hat Vorrang (deshalb Status
            // 'hersteller', sobald ein echter Wert eingetragen ist).
            lambda: {
                'PIR': 0.022, 'PUR': 0.023, 'EPS': 0.038, 'Mineralwolle': 0.040
            },
            // Waermeuebergangswiderstaende [m²K/W], Standardwerte Bauphysik
            rsi: 0.125,
            rse: 0.040,

            // Empfohlene Paneelstaerke nach Raumtemperatur. Praxis-Richtwerte,
            // KEINE Normvorgabe - deshalb immer nur als Vorschlag markiert.
            paneelstaerke(raumtemp) {
                if (raumtemp <= -25) return 200;
                if (raumtemp <= -18) return 150;
                if (raumtemp <= -10) return 120;
                if (raumtemp <= 0) return 100;
                if (raumtemp <= 5) return 80;
                return 60;
            },

            // Personenlast im Kuehlraum: steigt mit sinkender Temperatur.
            // Stuetzpunkte 210 W bei +10 °C und 390 W bei -20 °C (KKA,
            // "Der Kuehlraum"), dazwischen linear interpoliert.
            personenlast(raumtemp) {
                const w = 210 + (10 - raumtemp) * 6;
                return Math.max(180, Math.min(450, Math.round(w)));
            },

            // Beleuchtung [W/m²] nach Nutzung. Praxis-Richtwerte Kuehlraum.
            beleuchtung: { niedrig: 6, normal: 10, hoch: 16 },

            // Luftwechsel [1/h]. ACHTUNG: die klassischen Kühlraum-Tabellen
            // (Dossat/ASHRAE) geben Luftwechsel je 24 STUNDEN an, nicht je
            // Stunde - das ist eine klassische Fehlerquelle und war hier
            // zunächst auch falsch drin (Faktor 24 zu hoch).
            // Näherung der Tabelle: n24 ≈ 95/√V über 0 °C, ≈ 76/√V darunter.
            // Umgerechnet auf 1/h also n24/24.
            luftwechsel(volumen, raumtemp, tueroeffnungenProStunde) {
                const v = Math.max(1, Number(volumen) || 1);
                const n24 = (raumtemp < 0 ? 76 : 95) / Math.sqrt(v);
                // Tueroeffnungen skalieren gegen eine Referenz von 6/h
                const ref = 6;
                const oeff = (tueroeffnungenProStunde == null || tueroeffnungenProStunde === '') ? ref : Number(tueroeffnungenProStunde);
                const faktor = Math.max(0.35, Math.min(3.5, oeff / ref));
                return Math.round((n24 / 24) * faktor * 1000) / 1000;
            },

            // Tueroeffnungen [1/h] nach Nutzung - reine Erfahrungswerte.
            tueroeffnungen: { niedrig: 3, normal: 8, hoch: 20 },

            // Ventilatorleistung: Richtwert als Anteil der Nutzkaeltelast.
            // Der echte Wert kommt aus dem Verdampfer-Datenblatt (Phase 5).
            ventilatorAnteil: 0.06,

            // Sicherheitszuschlag [%]
            sicherheitszuschlag: { knapp: 5, normal: 10, konservativ: 20 },

            // Taegliche Laufzeit [h] - uebliche Auslegungsannahme, weil der
            // Verdichter waehrend Abtauung und Stillstandszeiten nicht laeuft.
            laufzeit(raumtemp) { return raumtemp < 0 ? 18 : 16; },

            // Auslegungs-Aussentemperatur [°C] und rel. Feuchte [%].
            // Fuer Oesterreich uebliche Auslegungswerte fuer Innenaufstellung
            // bzw. Sommer-Auslegung. Standortgenau vom Techniker zu pruefen.
            aussentemperatur: 32,
            aussenfeuchte: 50,

            // Abtauung: Zusatzlast als Anteil der uebrigen Last. Nur bei
            // Temperaturen unter 0 °C relevant (Reifbildung am Verdampfer).
            abtauAnteil: { 'Elektrisch': 0.10, 'Heißgas': 0.06, 'Naturumlauf (Off-Cycle)': 0.02, 'Wasser': 0.05, 'Sonstige': 0.05 },

            // Produktdaten: spezifische Waermekapazitaet ueber/unter dem
            // Gefrierpunkt [kJ/kgK], Gefrierenthalpie [kJ/kg], Gefrierpunkt [°C].
            // Standard-Lehrbuchwerte fuer die Vorauslegung. Bei kritischen
            // Projekten sind produktspezifische Daten einzuholen.
            produkte: {
                'Fleisch frisch':   { cpUeber: 3.2, cpUnter: 1.7, hGefrier: 210, tGefrier: -1.7 },
                'Fleisch gefroren': { cpUeber: 3.2, cpUnter: 1.7, hGefrier: 210, tGefrier: -1.7 },
                'Fisch':            { cpUeber: 3.4, cpUnter: 1.8, hGefrier: 245, tGefrier: -2.2 },
                'Geflügel':         { cpUeber: 3.3, cpUnter: 1.7, hGefrier: 215, tGefrier: -2.8 },
                'Milchprodukte':    { cpUeber: 3.0, cpUnter: 1.6, hGefrier: 190, tGefrier: -1.5 },
                'Obst':             { cpUeber: 3.7, cpUnter: 1.9, hGefrier: 280, tGefrier: -1.5 },
                'Gemüse':           { cpUeber: 3.8, cpUnter: 1.9, hGefrier: 290, tGefrier: -1.0 },
                'Backwaren':        { cpUeber: 2.6, cpUnter: 1.4, hGefrier: 130, tGefrier: -2.0 },
                'Getränke':         { cpUeber: 3.9, cpUnter: 2.0, hGefrier: 300, tGefrier: -2.0 },
                'Fertiggerichte':   { cpUeber: 3.1, cpUnter: 1.7, hGefrier: 200, tGefrier: -2.0 },
                'Sonstiges':        { cpUeber: 3.3, cpUnter: 1.8, hGefrier: 230, tGefrier: -1.8 }
            }
        };

        // ---------- Psychrometrie (echte Formeln, keine Richtwerte) ----------
        // Saettigungsdampfdruck nach Magnus [Pa]
        function kaelteSaettigungsdruck(tC) {
            return 610.94 * Math.exp((17.625 * tC) / (tC + 243.04));
        }
        // Absolute Feuchte (Wasserbeladung) [kg Wasser / kg trockene Luft]
        function kaelteAbsolutFeuchte(tC, rhProzent, pGesamt = 101325) {
            const pv = kaelteSaettigungsdruck(tC) * (Math.max(0, Math.min(100, rhProzent)) / 100);
            return 0.622 * pv / Math.max(1, (pGesamt - pv));
        }
        // Taupunkt [°C] - Magnus-Formel umgestellt
        function kaelteTaupunkt(tC, rhProzent) {
            const rh = Math.max(0.1, Math.min(100, rhProzent));
            const alpha = Math.log(rh / 100) + (17.625 * tC) / (tC + 243.04);
            return (243.04 * alpha) / (17.625 - alpha);
        }
        // Dichte feuchter Luft [kg/m³]
        function kaelteLuftdichte(tC, rhProzent, pGesamt = 101325) {
            const pv = kaelteSaettigungsdruck(tC) * (Math.max(0, Math.min(100, rhProzent)) / 100);
            const pd = pGesamt - pv;
            return (pd / (287.058 * (tC + 273.15))) + (pv / (461.495 * (tC + 273.15)));
        }

        const KAELTE_CP_LUFT = 1.006;       // kJ/kgK
        const KAELTE_H_VERDAMPFUNG = 2501;  // kJ/kg, Verdampfungsenthalpie Wasser bei 0 °C

        function kaelteZahl(v) {
            if (v === null || v === undefined || v === '') return null;
            const n = parseFloat(String(v).replace(',', '.'));
            return Number.isFinite(n) ? n : null;
        }

        // ---------- Vorschlagsebene ----------
        // Nimmt die Kuehlstelle wie erfasst und ergaenzt alles Fehlende mit
        // Richtwerten. Gibt fuer JEDEN Wert zurueck, woher er stammt.
        // Ein vom Benutzer eingetragener Wert wird NIE ueberschrieben.
        function kaelteVorschlaege(ks, optionen = {}) {
            const w = {};   // { wert, status, herkunft }
            const setz = (key, wert, status, herkunft) => { w[key] = { wert, status, herkunft }; };
            const nutzer = (key, herkunftWennFehlt) => kaelteZahl(ks[key]);

            const nutzung = ks.nutzungsgrad || 'normal';

            // --- Geometrie ---
            const L = kaelteZahl(ks.laenge), B = kaelteZahl(ks.breite), H = kaelteZahl(ks.hoehe);
            let volumen = kaelteZahl(ks.volumen);
            if (volumen != null) setz('volumen', volumen, 'eingabe', 'direkt eingegeben');
            else if (L && B && H) { volumen = L * B * H; setz('volumen', Math.round(volumen * 100) / 100, 'berechnet', 'L × B × H'); }
            else setz('volumen', null, 'pruefen', 'Raummaße fehlen');

            const grundflaeche = (L && B) ? L * B : null;
            setz('grundflaeche', grundflaeche ? Math.round(grundflaeche * 100) / 100 : null, grundflaeche ? 'berechnet' : 'pruefen', 'L × B');
            // Paneelflaechen automatisch aus den Raummassen
            const wandflaeche = (L && B && H) ? 2 * (L + B) * H : null;
            setz('wandflaeche', wandflaeche ? Math.round(wandflaeche * 100) / 100 : null, wandflaeche ? 'berechnet' : 'pruefen', '2 × (L + B) × H');
            setz('deckenflaeche', grundflaeche ? Math.round(grundflaeche * 100) / 100 : null, grundflaeche ? 'berechnet' : 'pruefen', 'L × B');
            setz('bodenflaeche', grundflaeche ? Math.round(grundflaeche * 100) / 100 : null, grundflaeche ? 'berechnet' : 'pruefen', 'L × B');

            // --- Temperaturen ---
            const raumtemp = kaelteZahl(ks.raumtemperatur);
            if (raumtemp != null) setz('raumtemperatur', raumtemp, 'eingabe', 'direkt eingegeben');
            else setz('raumtemperatur', null, 'pruefen', 'Raumtemperatur fehlt – ohne sie ist keine Berechnung möglich');

            let aussentemp = kaelteZahl(ks.aussentemperatur);
            if (aussentemp != null) setz('aussentemperatur', aussentemp, 'eingabe', 'direkt eingegeben');
            else { aussentemp = KAELTE_RICHTWERTE.aussentemperatur; setz('aussentemperatur', aussentemp, 'schaetzung', 'Auslegungs-Richtwert Sommer – standortgenau prüfen'); }

            let aussenfeuchte = kaelteZahl(ks.aussenfeuchte);
            if (aussenfeuchte != null) setz('aussenfeuchte', aussenfeuchte, 'eingabe', 'direkt eingegeben');
            else { aussenfeuchte = KAELTE_RICHTWERTE.aussenfeuchte; setz('aussenfeuchte', aussenfeuchte, 'schaetzung', 'übliche Auslegungsfeuchte'); }

            let raumfeuchte = kaelteZahl(ks.raumfeuchte);
            if (raumfeuchte != null) setz('raumfeuchte', raumfeuchte, 'eingabe', 'direkt eingegeben');
            else { raumfeuchte = (raumtemp != null && raumtemp < 0) ? 90 : 85; setz('raumfeuchte', raumfeuchte, 'schaetzung', 'übliche Lagerfeuchte'); }

            if (raumtemp != null) {
                setz('taupunktRaum', Math.round(kaelteTaupunkt(raumtemp, raumfeuchte) * 10) / 10, 'berechnet', 'Magnus-Formel aus Raumtemperatur und -feuchte');
            }
            setz('taupunktAussen', Math.round(kaelteTaupunkt(aussentemp, aussenfeuchte) * 10) / 10, 'berechnet', 'Magnus-Formel aus Außentemperatur und -feuchte');

            // --- Daemmung / U-Wert ---
            const material = ks.daemmmaterial || 'PIR';
            setz('daemmmaterial', material, ks.daemmmaterial ? 'eingabe' : 'schaetzung', ks.daemmmaterial ? 'direkt eingegeben' : 'übliches Kühlraumpaneel');

            let staerke = kaelteZahl(ks.daemmstaerke);
            if (staerke != null) setz('daemmstaerke', staerke, 'eingabe', 'direkt eingegeben');
            else if (raumtemp != null) { staerke = KAELTE_RICHTWERTE.paneelstaerke(raumtemp); setz('daemmstaerke', staerke, 'schaetzung', `Vorschlag für ${raumtemp} °C – Herstellerpaneel prüfen`); }
            else setz('daemmstaerke', null, 'pruefen', 'ohne Raumtemperatur kein Vorschlag möglich');

            const lambda = KAELTE_RICHTWERTE.lambda[material] ?? KAELTE_RICHTWERTE.lambda.PIR;
            setz('lambda', lambda, 'schaetzung', `Katalog-Richtwert ${material}`);

            let uWert = kaelteZahl(ks.uWert);
            if (uWert != null) setz('uWert', uWert, 'hersteller', 'eingetragener Herstellerwert – hat Vorrang');
            else if (staerke) {
                // U = 1 / (Rsi + d/λ + Rse)
                const r = KAELTE_RICHTWERTE.rsi + (staerke / 1000) / lambda + KAELTE_RICHTWERTE.rse;
                uWert = 1 / r;
                setz('uWert', Math.round(uWert * 1000) / 1000, 'berechnet', `1 / (${KAELTE_RICHTWERTE.rsi} + ${(staerke / 1000).toFixed(3)}/${lambda} + ${KAELTE_RICHTWERTE.rse})`);
            } else setz('uWert', null, 'pruefen', 'keine Dämmstärke bekannt');

            // --- Nutzung / innere Lasten ---
            let tueroeffnungen = kaelteZahl(ks.tueroeffnungen);
            if (tueroeffnungen != null) setz('tueroeffnungen', tueroeffnungen, 'eingabe', 'direkt eingegeben');
            else { tueroeffnungen = KAELTE_RICHTWERTE.tueroeffnungen[nutzung] ?? 8; setz('tueroeffnungen', tueroeffnungen, 'schaetzung', `Erfahrungswert Nutzung "${nutzung}"`); }

            let luftwechsel = kaelteZahl(ks.luftwechsel);
            if (luftwechsel != null) setz('luftwechsel', luftwechsel, 'eingabe', 'direkt eingegeben');
            else if (volumen && raumtemp != null) { luftwechsel = KAELTE_RICHTWERTE.luftwechsel(volumen, raumtemp, tueroeffnungen); setz('luftwechsel', luftwechsel, 'schaetzung', `Näherung aus Volumen ${Math.round(volumen)} m³ und ${tueroeffnungen} Türöffnungen/h`); }
            else setz('luftwechsel', null, 'pruefen', 'Volumen oder Raumtemperatur fehlt');

            let personen = kaelteZahl(ks.personen);
            if (personen != null) setz('personen', personen, 'eingabe', 'direkt eingegeben');
            else { personen = (grundflaeche && grundflaeche > 40) ? 2 : 1; setz('personen', personen, 'schaetzung', 'Annahme nach Raumgröße'); }

            let personenStunden = kaelteZahl(ks.personenStunden);
            if (personenStunden != null) setz('personenStunden', personenStunden, 'eingabe', 'direkt eingegeben');
            else { personenStunden = 2; setz('personenStunden', personenStunden, 'schaetzung', 'Aufenthaltsdauer je Tag'); }

            let beleuchtung = kaelteZahl(ks.beleuchtung);
            const belSpez = KAELTE_RICHTWERTE.beleuchtung[nutzung] ?? KAELTE_RICHTWERTE.beleuchtung.normal;
            if (beleuchtung != null) setz('beleuchtung', beleuchtung, 'eingabe', 'direkt eingegeben');
            else if (grundflaeche) { beleuchtung = Math.round(grundflaeche * belSpez); setz('beleuchtung', beleuchtung, 'schaetzung', `${belSpez} W/m² × ${grundflaeche.toFixed(1)} m² (Nutzung "${nutzung}")`); }
            else setz('beleuchtung', null, 'pruefen', 'Grundfläche unbekannt');

            let beleuchtungStunden = kaelteZahl(ks.beleuchtungStunden);
            if (beleuchtungStunden != null) setz('beleuchtungStunden', beleuchtungStunden, 'eingabe', 'direkt eingegeben');
            else { beleuchtungStunden = 4; setz('beleuchtungStunden', beleuchtungStunden, 'schaetzung', 'Brenndauer je Tag'); }

            let sonstige = kaelteZahl(ks.sonstigeWaerme);
            setz('sonstigeWaerme', sonstige ?? 0, sonstige != null ? 'eingabe' : 'schaetzung', sonstige != null ? 'direkt eingegeben' : 'keine weiteren Verbraucher angenommen');

            // --- Produkt ---
            const produktart = ks.produktart || 'Sonstiges';
            setz('produktart', produktart, ks.produktart ? 'eingabe' : 'schaetzung', ks.produktart ? 'direkt eingegeben' : 'allgemeine Produktdaten');
            const pd = KAELTE_RICHTWERTE.produkte[produktart] || KAELTE_RICHTWERTE.produkte['Sonstiges'];
            setz('cpUeber', pd.cpUeber, 'schaetzung', `spez. Wärmekapazität über Gefrierpunkt (${produktart})`);
            setz('cpUnter', pd.cpUnter, 'schaetzung', `spez. Wärmekapazität unter Gefrierpunkt (${produktart})`);
            setz('hGefrier', pd.hGefrier, 'schaetzung', `Gefrierenthalpie (${produktart})`);
            setz('tGefrier', pd.tGefrier, 'schaetzung', `Gefrierpunkt (${produktart})`);

            const menge = kaelteZahl(ks.produktmenge);
            setz('produktmenge', menge, menge != null ? 'eingabe' : 'schaetzung', menge != null ? 'Einlagerung je Tag' : 'keine Produkteinlagerung angenommen');

            let tEin = kaelteZahl(ks.produktEintrittstemperatur);
            if (tEin != null) setz('produktEintrittstemperatur', tEin, 'eingabe', 'direkt eingegeben');
            else if (menge) { tEin = 12; setz('produktEintrittstemperatur', tEin, 'schaetzung', 'Annahme gekühlte Anlieferung – bitte prüfen'); }
            else setz('produktEintrittstemperatur', null, 'schaetzung', 'ohne Produktmenge nicht relevant');

            let tZiel = kaelteZahl(ks.produktTemperaturZiel);
            if (tZiel != null) setz('produktTemperaturZiel', tZiel, 'eingabe', 'direkt eingegeben');
            else if (raumtemp != null) { tZiel = raumtemp; setz('produktTemperaturZiel', tZiel, 'schaetzung', 'auf Raumtemperatur angenommen'); }

            let abkuehlzeit = kaelteZahl(ks.abkuehlzeit);
            if (abkuehlzeit != null) setz('abkuehlzeit', abkuehlzeit, 'eingabe', 'direkt eingegeben');
            else if (menge) {
                // Richtwert: TK-Durchfrostung braucht laenger als reine Kuehlung
                abkuehlzeit = (raumtemp != null && raumtemp < 0) ? 24 : 12;
                setz('abkuehlzeit', abkuehlzeit, 'schaetzung', raumtemp != null && raumtemp < 0 ? 'Durchfrostung Tiefkühlung' : 'Abkühlung Normalkühlung');
            }

            // --- Abtauung ---
            const abtauart = ks.abtauart || ((raumtemp != null && raumtemp < 0) ? 'Elektrisch' : 'Naturumlauf (Off-Cycle)');
            setz('abtauart', abtauart, ks.abtauart ? 'eingabe' : 'schaetzung', ks.abtauart ? 'direkt eingegeben' : 'Vorschlag nach Raumtemperatur');

            // --- Auslegung ---
            let zuschlagArt = ks.sicherheitArt || 'normal';
            let zuschlag = kaelteZahl(ks.sicherheitszuschlag);
            if (zuschlag != null) setz('sicherheitszuschlag', zuschlag, 'eingabe', 'direkt eingegeben');
            else { zuschlag = KAELTE_RICHTWERTE.sicherheitszuschlag[zuschlagArt] ?? 10; setz('sicherheitszuschlag', zuschlag, 'schaetzung', `Zuschlag "${zuschlagArt}"`); }

            let laufzeit = kaelteZahl(ks.laufzeit);
            if (laufzeit != null) setz('laufzeit', laufzeit, 'eingabe', 'direkt eingegeben');
            else if (raumtemp != null) { laufzeit = KAELTE_RICHTWERTE.laufzeit(raumtemp); setz('laufzeit', laufzeit, 'schaetzung', 'übliche tägliche Verdichterlaufzeit'); }
            else setz('laufzeit', 16, 'schaetzung', 'Standardannahme');

            let verdampfung = kaelteZahl(ks.verdampfungstemperatur);
            if (verdampfung != null) setz('verdampfungstemperatur', verdampfung, 'eingabe', 'direkt eingegeben');
            else if (raumtemp != null) {
                // Uebliche Temperaturdifferenz Raum -> Verdampfung
                const dt = (raumtemp < 0) ? 7 : 8;
                setz('verdampfungstemperatur', raumtemp - dt, 'schaetzung', `Raumtemperatur − ${dt} K (übliche Auslegungsdifferenz)`);
            }

            return w;
        }

        // ---------- Berechnungsengine: reine Physik ----------
        // Bekommt die fertigen Werte (aus kaelteVorschlaege + Benutzerwerten)
        // und rechnet daraus die Last. Kennt keine Richtwerte und keine KI.
        function kaelteBerechne(werte) {
            const v = key => (werte[key] ? werte[key].wert : null);
            const teile = [];
            const hinweise = [];

            const raumtemp = v('raumtemperatur');
            const aussentemp = v('aussentemperatur');
            const uWert = v('uWert');
            const volumen = v('volumen');

            if (raumtemp == null || uWert == null || volumen == null) {
                return { moeglich: false, hinweise: ['Für die Berechnung fehlen noch Raumtemperatur, Raummaße oder U-Wert.'], teile: [], nutzlast: 0, gesamt: 0, auslegung: 0 };
            }

            const dT = aussentemp - raumtemp;

            // 1) Transmission je Bauteil: Q = U × A × ΔT
            // Boden liegt meist auf Erdreich/Nachbarraum -> geringere Differenz.
            const flaechen = [
                { name: 'Wände', a: v('wandflaeche'), dt: dT },
                { name: 'Decke', a: v('deckenflaeche'), dt: dT },
                { name: 'Boden', a: v('bodenflaeche'), dt: dT * 0.5 }
            ];
            let transmission = 0;
            const transDetail = [];
            flaechen.forEach(f => {
                if (!f.a) return;
                const q = uWert * f.a * f.dt;   // W
                transmission += q;
                transDetail.push(`${f.name}: ${uWert.toFixed(3)} × ${f.a.toFixed(1)} m² × ${f.dt.toFixed(1)} K = ${Math.round(q)} W`);
            });
            teile.push({ name: 'Transmission (Wände, Decke, Boden)', watt: transmission, formel: transDetail.join(' · ') || 'keine Flächen bekannt' });
            hinweises_boden_hinweis(hinweise);

            // 2) Infiltration: sensibel + latent, ueber echte Luftzustaende
            const luftwechsel = v('luftwechsel') || 0;
            const raumfeuchte = v('raumfeuchte');
            const aussenfeuchte = v('aussenfeuchte');
            let infSens = 0, infLat = 0;
            if (luftwechsel > 0) {
                const vDot = volumen * luftwechsel;                       // m³/h
                const rhoAussen = kaelteLuftdichte(aussentemp, aussenfeuchte);
                const mDot = vDot * rhoAussen / 3600;                     // kg/s
                const xAussen = kaelteAbsolutFeuchte(aussentemp, aussenfeuchte);
                const xRaum = kaelteAbsolutFeuchte(raumtemp, raumfeuchte);
                infSens = mDot * KAELTE_CP_LUFT * dT * 1000;              // W
                infLat = Math.max(0, mDot * (xAussen - xRaum) * KAELTE_H_VERDAMPFUNG * 1000); // W
                teile.push({ name: 'Infiltration sensibel', watt: infSens, formel: `${vDot.toFixed(0)} m³/h × ${rhoAussen.toFixed(3)} kg/m³ × ${KAELTE_CP_LUFT} kJ/kgK × ${dT.toFixed(1)} K` });
                teile.push({ name: 'Infiltration latent (Entfeuchtung)', watt: infLat, formel: `Δx = ${(xAussen * 1000).toFixed(1)} − ${(xRaum * 1000).toFixed(1)} g/kg × ${KAELTE_H_VERDAMPFUNG} kJ/kg` });
                if (infLat > infSens * 1.5) hinweises_latent(hinweise);
            }

            // 3) Produktlast: sensibel über Gefrierpunkt, Gefrieren, sensibel darunter
            const menge = v('produktmenge');
            const tEin = v('produktEintrittstemperatur');
            const tZiel = v('produktTemperaturZiel');
            const abkuehlzeit = v('abkuehlzeit');
            let produktlast = 0;
            if (menge && tEin != null && tZiel != null && abkuehlzeit > 0) {
                const cpU = v('cpUeber'), cpUn = v('cpUnter'), hG = v('hGefrier'), tG = v('tGefrier');
                let kJ = 0;
                const schritte = [];
                // a) Abkuehlung bis zum Gefrierpunkt
                const vonOben = Math.min(tEin, Math.max(tZiel, tG));
                if (tEin > vonOben) { const q = menge * cpU * (tEin - vonOben); kJ += q; schritte.push(`Abkühlen ${tEin}→${vonOben.toFixed(1)} °C: ${menge} kg × ${cpU} × ${(tEin - vonOben).toFixed(1)} = ${Math.round(q)} kJ`); }
                // b) Gefrieren (nur wenn Zieltemperatur unter dem Gefrierpunkt liegt)
                if (tZiel < tG && tEin > tG) { const q = menge * hG; kJ += q; schritte.push(`Gefrieren: ${menge} kg × ${hG} kJ/kg = ${Math.round(q)} kJ`); }
                // c) Weiter abkuehlen unter dem Gefrierpunkt
                if (tZiel < tG) { const vonUnten = Math.min(tG, tEin); const q = menge * cpUn * (vonUnten - tZiel); kJ += q; schritte.push(`Durchkühlen ${vonUnten.toFixed(1)}→${tZiel} °C: ${menge} kg × ${cpUn} × ${(vonUnten - tZiel).toFixed(1)} = ${Math.round(q)} kJ`); }
                produktlast = (kJ * 1000) / (abkuehlzeit * 3600);   // W
                teile.push({ name: 'Produktlast', watt: produktlast, formel: `${schritte.join(' · ')} → ${Math.round(kJ)} kJ / ${abkuehlzeit} h` });
            }

            // 4) Personen
            const personen = v('personen') || 0;
            const personenStunden = v('personenStunden') || 0;
            const wProPerson = KAELTE_RICHTWERTE.personenlast(raumtemp);
            const personenlast = personen * wProPerson * (personenStunden / 24);
            if (personenlast > 0) teile.push({ name: 'Personen', watt: personenlast, formel: `${personen} × ${wProPerson} W × ${personenStunden}/24 h` });

            // 5) Beleuchtung
            const beleuchtung = v('beleuchtung') || 0;
            const belStunden = v('beleuchtungStunden') || 0;
            const beleuchtungslast = beleuchtung * (belStunden / 24);
            if (beleuchtungslast > 0) teile.push({ name: 'Beleuchtung', watt: beleuchtungslast, formel: `${beleuchtung} W × ${belStunden}/24 h` });

            // 6) Sonstige elektrische Verbraucher
            const sonstige = v('sonstigeWaerme') || 0;
            if (sonstige > 0) teile.push({ name: 'Sonstige elektrische Verbraucher', watt: sonstige, formel: `${sonstige} W Dauerlast` });

            // Zwischensumme vor Ventilator/Abtauung (diese haengen davon ab)
            const zwischen1 = teile.reduce((s, t) => s + t.watt, 0);

            // 7) Ventilatorlast - Richtwert-Anteil, echter Wert kommt spaeter
            //    aus dem Verdampfer-Datenblatt.
            let ventilator = v('ventilatorleistung');
            let ventQuelle;
            if (ventilator != null && ventilator > 0) { ventQuelle = `${ventilator} W eingetragen`; }
            else { ventilator = zwischen1 * KAELTE_RICHTWERTE.ventilatorAnteil; ventQuelle = `${(KAELTE_RICHTWERTE.ventilatorAnteil * 100).toFixed(0)} % Richtwert – Verdampfer-Datenblatt maßgeblich`; }
            teile.push({ name: 'Ventilatoren', watt: ventilator, formel: ventQuelle });

            // 8) Abtauung - nur unter 0 °C relevant.
            // WICHTIG: der Reif am Verdampfer entsteht durch den Feuchte-
            // eintrag (Infiltration) und den Waermeeintrag durch die Huelle,
            // NICHT durch die Produktlast. Der Zuschlag wird deshalb nur auf
            // Transmission + Infiltration + Ventilatoren gerechnet. Ein
            // Prozentsatz auf die Gesamtlast waere bei grossen Produktlasten
            // deutlich zu hoch.
            const abtauart = v('abtauart');
            let abtaulast = 0;
            if (raumtemp < 0) {
                const anteil = KAELTE_RICHTWERTE.abtauAnteil[abtauart] ?? 0.08;
                const abtauBasis = transmission + infSens + infLat + ventilator;
                abtaulast = abtauBasis * anteil;
                teile.push({ name: `Abtauung (${abtauart})`, watt: abtaulast, formel: `${(anteil * 100).toFixed(0)} % auf Hülle + Infiltration + Ventilator (${Math.round(abtauBasis)} W) – Reif entsteht durch Feuchteeintrag, nicht durch die Produktlast` });
            }

            const nutzlast = teile.reduce((s, t) => s + t.watt, 0);
            const zuschlagProzent = v('sicherheitszuschlag') || 0;
            const zuschlagWatt = nutzlast * (zuschlagProzent / 100);
            const gesamt = nutzlast + zuschlagWatt;

            // Erforderliche Anlagenleistung: Tageslast auf die Laufzeit verteilt
            const laufzeit = v('laufzeit') || 16;
            const auslegung = gesamt * (24 / laufzeit);

            // Elektrische Abtauheizung: Richtwert, echter Wert aus dem
            // Verdampfer-Datenblatt. Bewusst als 'pruefen' gekennzeichnet.
            let abtauheizung = null;
            if (raumtemp < 0 && abtauart === 'Elektrisch') abtauheizung = auslegung * 0.5;

            return {
                moeglich: true, teile, hinweise,
                nutzlast, zuschlagProzent, zuschlagWatt, gesamt, laufzeit, auslegung, abtauheizung
            };
        }

        function hinweises_boden_hinweis(hinweise) {
            hinweise.push({ art: 'info', text: 'Der Boden wird mit halber Temperaturdifferenz gerechnet (Erdreich/Nachbarraum). Bei freiliegendem Boden oder darunterliegendem Warmbereich manuell korrigieren.' });
        }
        function hinweises_latent(hinweise) {
            hinweise.push({ art: 'warnung', text: 'Die latente Infiltrationslast ist deutlich höher als die sensible. Das deutet auf viele Türöffnungen oder sehr feuchte Außenluft hin – Türluftschleier oder Schnelllauftor prüfen.' });
        }

        // ---------- Plausibilitätsprüfung ----------
        function kaeltePruefe(werte, ergebnis, ks) {
            const meldungen = [];
            const v = key => (werte[key] ? werte[key].wert : null);
            const raumtemp = v('raumtemperatur'), tZiel = v('produktTemperaturZiel'), tEin = v('produktEintrittstemperatur');
            const verdampfung = v('verdampfungstemperatur'), volumen = v('volumen');

            if (raumtemp != null && tZiel != null && tZiel < raumtemp - 0.01) meldungen.push({ art: 'fehler', text: `Die gewünschte Produkttemperatur (${tZiel} °C) liegt unter der Raumtemperatur (${raumtemp} °C). Das ist mit reiner Raumkühlung nicht erreichbar.` });
            if (tEin != null && tZiel != null && tEin < tZiel) meldungen.push({ art: 'fehler', text: 'Die Eintrittstemperatur liegt unter der Zieltemperatur – das Produkt müsste erwärmt werden.' });
            if (verdampfung != null && raumtemp != null && verdampfung >= raumtemp) meldungen.push({ art: 'fehler', text: 'Die Verdampfungstemperatur muss unter der Raumtemperatur liegen.' });
            if (verdampfung != null && raumtemp != null && (raumtemp - verdampfung) > 15) meldungen.push({ art: 'warnung', text: `Die Temperaturdifferenz Raum/Verdampfung beträgt ${(raumtemp - verdampfung).toFixed(1)} K. Das trocknet die Ware stark aus – üblich sind 6–8 K.` });
            if (volumen != null && volumen > 3000) meldungen.push({ art: 'warnung', text: 'Sehr großes Raumvolumen – bei dieser Größe sollte die Luftführung gesondert geplant werden.' });
            if (raumtemp != null && raumtemp < -30) meldungen.push({ art: 'warnung', text: 'Raumtemperatur unter −30 °C: Kältemittel- und Verdichterauswahl gesondert prüfen.' });
            if (ergebnis && ergebnis.moeglich && ergebnis.auslegung > 0 && volumen) {
                const spez = ergebnis.auslegung / volumen;
                if (spez > 200) meldungen.push({ art: 'warnung', text: `Die spezifische Leistung liegt bei ${spez.toFixed(0)} W/m³ – ungewöhnlich hoch. Eingaben zu Produktmenge und Abkühlzeit prüfen.` });
                if (spez < 8) meldungen.push({ art: 'warnung', text: `Die spezifische Leistung liegt bei ${spez.toFixed(0)} W/m³ – ungewöhnlich niedrig. Sind alle Lasten erfasst?` });
            }
            // Ohne echte Herstellerdaten ist das Ergebnis eine Vorauslegung.
            meldungen.push({ art: 'pruefen', text: 'Ergebnis ist eine Vorauslegung auf Basis von Richtwerten. Paneel-U-Werte, Verdampfer- und Ventilatordaten sowie die Abtauheizung sind vor der Bestellung anhand der Herstellerdatenblätter zu prüfen.' });
            return meldungen;
        }

        // ---------- Gesamtauslegung über alle Kühlstellen ----------
        // Einstiegspunkt für die späteren Module (Verbund, Komponenten, Rohr).
        function kaelteAuslegung(project) {
            const stellen = (project && project.kaelte && project.kaelte.kuehlstellen) || [];
            const ergebnisse = stellen.map(ks => {
                const werte = kaelteVorschlaege(ks);
                const ergebnis = kaelteBerechne(werte);
                return { ks, werte, ergebnis, meldungen: kaeltePruefe(werte, ergebnis, ks) };
            });
            const rechenbar = ergebnisse.filter(e => e.ergebnis.moeglich);
            // Bewusst NUR die einfache Summe. Gleichzeitigkeitsfaktoren gehören
            // in die Verbundlogik (Phase 7) und werden hier nicht vorweggenommen.
            const summeAuslegung = rechenbar.reduce((s, e) => s + e.ergebnis.auslegung, 0);
            const summeGesamt = rechenbar.reduce((s, e) => s + e.ergebnis.gesamt, 0);
            return { ergebnisse, summeAuslegung, summeGesamt, anzahlRechenbar: rechenbar.length, anzahlGesamt: stellen.length };
        }

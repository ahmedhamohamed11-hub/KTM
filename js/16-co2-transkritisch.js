

        // ============================================================
        // ====== CO₂ TRANSKRITISCH (R744) ============================
        // ============================================================
        // Ueber der kritischen Temperatur (31 °C) verfluessigt CO2 nicht mehr.
        // Es gibt dann keine Verfluessigungstemperatur, sondern zwei UNABHAENGIGE
        // Groessen: die Gaskuehler-Austrittstemperatur und den Hochdruck.
        // Der Hochdruck ist eine freie Regelgroesse - zu jedem Austrittszustand
        // gibt es genau einen Druck mit maximaler Leistungszahl.
        //
        // Diese Tabelle wurde mit CoolProp vorgerechnet: fuer jede Kombination
        // aus Verdampfungs- und Gaskuehleraustrittstemperatur wurde der
        // Hochdruck in 0,5-bar-Schritten durchgefahren und das COP-Maximum
        // gesucht. Es steht also KEINE Faustformel dahinter.
        // (Die verbreitete Naeherung p = 2,6·t_gc − 7,5 liegt bei diesen
        // Bedingungen 5 bis 9 bar zu niedrig.)
        //
        // Feste Annahmen der Vorrechnung - stehen auch in der Ausgabe:
        //   Sauggasueberhitzung 5 K, isentroper Verdichterwirkungsgrad 0,65
        // Abweichende Werte verschieben das Ergebnis; fuer die Vorauslegung
        // ist das vertretbar, fuer die Bestellung gilt das Verdichterprogramm.
        //
        // Je Eintrag: [p_opt bar, q0 kJ/kg, COP, w kJ/kg, p_verdampfung bar, rho_saug kg/m³]
        const CO2_TRANSKRITISCH = {"t0":[-40,-35,-30,-25,-20,-15,-10,-5,0,5],"tgc":[20,25,28,31,34,37,40,43,46,50],"sh":5,"eta":0.65,"d":{"-40_20":[70.0,190.5,1.288,147.9,10.04,25.28],"-40_25":[70.0,171.5,1.16,147.9,10.04,25.28],"-40_28":[73.0,159.1,1.048,151.8,10.04,25.28],"-40_31":[82.5,153.9,0.942,163.4,10.04,25.28],"-40_34":[92.5,149.3,0.855,174.7,10.04,25.28],"-40_37":[103.0,145.0,0.782,185.5,10.04,25.28],"-40_40":[113.5,140.6,0.719,195.5,10.04,25.28],"-40_43":[125.0,136.7,0.665,205.7,10.04,25.28],"-40_46":[136.5,132.7,0.617,215.2,10.04,25.28],"-40_50":[140.0,121.4,0.557,218.0,10.04,25.28],"-35_20":[70.0,191.6,1.456,131.6,12.02,30.17],"-35_25":[70.0,172.6,1.312,131.6,12.02,30.17],"-35_28":[72.0,158.8,1.184,134.1,12.02,30.17],"-35_31":[81.5,153.9,1.058,145.5,12.02,30.17],"-35_34":[91.5,149.5,0.956,156.4,12.02,30.17],"-35_37":[101.5,144.9,0.871,166.4,12.02,30.17],"-35_40":[111.5,140.3,0.798,175.8,12.02,30.17],"-35_43":[122.5,136.4,0.736,185.3,12.02,30.17],"-35_46":[134.0,132.6,0.681,194.6,12.02,30.17],"-35_50":[140.0,122.5,0.615,199.3,12.02,30.17],"-30_20":[70.0,192.5,1.653,116.4,14.28,35.79],"-30_25":[70.0,173.5,1.49,116.4,14.28,35.79],"-30_28":[71.5,158.9,1.343,118.3,14.28,35.79],"-30_31":[81.0,154.1,1.192,129.3,14.28,35.79],"-30_34":[90.0,148.8,1.072,138.8,14.28,35.79],"-30_37":[100.0,144.5,0.972,148.6,14.28,35.79],"-30_40":[110.0,140.0,0.888,157.7,14.28,35.79],"-30_43":[120.5,135.9,0.816,166.6,14.28,35.79],"-30_46":[131.5,132.0,0.753,175.3,14.28,35.79],"-30_50":[140.0,123.4,0.679,181.7,14.28,35.79],"-25_20":[70.0,193.0,1.888,102.2,16.83,42.24],"-25_25":[70.0,174.0,1.703,102.2,16.83,42.24],"-25_28":[71.0,158.5,1.533,103.4,16.83,42.24],"-25_31":[80.0,153.3,1.351,113.5,16.83,42.24],"-25_34":[89.0,148.1,1.206,122.8,16.83,42.24],"-25_37":[98.5,143.6,1.089,131.9,16.83,42.24],"-25_40":[108.5,139.4,0.991,140.7,16.83,42.24],"-25_43":[118.5,135.1,0.907,149.0,16.83,42.24],"-25_46":[129.0,131.1,0.834,157.1,16.83,42.24],"-25_50":[140.0,123.9,0.75,165.2,16.83,42.24],"-20_20":[70.0,193.2,2.173,88.9,19.7,49.64],"-20_25":[70.0,174.2,1.96,88.9,19.7,49.64],"-20_28":[70.5,157.7,1.763,89.5,19.7,49.64],"-20_31":[79.5,152.8,1.539,99.3,19.7,49.64],"-20_34":[88.0,147.1,1.365,107.8,19.7,49.64],"-20_37":[97.5,142.7,1.224,116.6,19.7,49.64],"-20_40":[107.0,138.3,1.108,124.8,19.7,49.64],"-20_43":[116.5,133.8,1.01,132.4,19.7,49.64],"-20_46":[127.0,130.0,0.926,140.4,19.7,49.64],"-20_50":[140.0,124.1,0.83,149.6,19.7,49.64],"-15_20":[70.0,193.0,2.524,76.5,22.91,58.13],"-15_25":[70.0,174.1,2.276,76.5,22.91,58.13],"-15_28":[70.0,156.5,2.046,76.5,22.91,58.13],"-15_31":[78.5,150.9,1.766,85.4,22.91,58.13],"-15_34":[87.5,146.2,1.553,94.2,22.91,58.13],"-15_37":[96.0,140.8,1.383,101.8,22.91,58.13],"-15_40":[105.5,136.6,1.245,109.8,22.91,58.13],"-15_43":[115.0,132.3,1.129,117.2,22.91,58.13],"-15_46":[124.5,128.0,1.03,124.2,22.91,58.13],"-15_50":[138.5,123.0,0.919,133.9,22.91,58.13],"-10_20":[70.0,192.4,2.967,64.8,26.49,67.86],"-10_25":[70.0,173.4,2.675,64.8,26.49,67.86],"-10_28":[70.0,155.8,2.404,64.8,26.49,67.86],"-10_31":[78.0,149.3,2.047,73.0,26.49,67.86],"-10_34":[86.5,144.1,1.78,80.9,26.49,67.86],"-10_37":[95.0,138.9,1.573,88.3,26.49,67.86],"-10_40":[104.0,134.4,1.406,95.6,26.49,67.86],"-10_43":[113.0,129.9,1.267,102.5,26.49,67.86],"-10_46":[122.5,125.8,1.151,109.4,26.49,67.86],"-10_50":[136.0,120.8,1.02,118.4,26.49,67.86],"-5_20":[70.0,191.3,3.544,54.0,30.46,79.06],"-5_25":[70.0,172.3,3.193,54.0,30.46,79.06],"-5_28":[70.0,154.7,2.867,54.0,30.46,79.06],"-5_31":[77.5,147.2,2.401,61.3,30.46,79.06],"-5_34":[85.5,141.3,2.062,68.5,30.46,79.06],"-5_37":[94.0,136.4,1.803,75.7,30.46,79.06],"-5_40":[102.5,131.6,1.597,82.4,30.46,79.06],"-5_43":[111.5,127.3,1.43,89.1,30.46,79.06],"-5_46":[121.0,123.5,1.29,95.7,30.46,79.06],"-5_50":[133.5,118.0,1.136,103.9,30.46,79.06],"0_20":[70.0,189.6,4.325,43.9,34.85,92.0],"0_25":[70.0,170.7,3.892,43.9,34.85,92.0],"0_28":[70.0,153.1,3.491,43.9,34.85,92.0],"0_31":[77.0,144.3,2.864,50.4,34.85,92.0],"0_34":[85.0,138.7,2.418,57.4,34.85,92.0],"0_37":[93.0,133.2,2.087,63.8,34.85,92.0],"0_40":[101.5,128.7,1.83,70.3,34.85,92.0],"0_43":[110.0,124.1,1.624,76.4,34.85,92.0],"0_46":[119.0,120.0,1.455,82.5,34.85,92.0],"0_50":[131.5,114.8,1.27,90.4,34.85,92.0],"5_20":[70.0,187.3,5.437,34.5,39.69,107.03],"5_25":[70.0,168.3,4.886,34.5,39.69,107.03],"5_28":[70.0,150.7,4.376,34.5,39.69,107.03],"5_31":[76.5,140.7,3.495,40.3,39.69,107.03],"5_34":[84.0,134.2,2.885,46.5,39.69,107.03],"5_37":[92.0,129.2,2.448,52.8,39.69,107.03],"5_40":[100.0,124.2,2.119,58.6,39.69,107.03],"5_43":[108.5,120.0,1.86,64.5,39.69,107.03],"5_46":[117.0,115.6,1.651,70.0,39.69,107.03],"5_50":[129.5,110.8,1.426,77.7,39.69,107.03]}};

        // Bilineare Interpolation in der Tabelle. Ausserhalb wird NICHT
        // extrapoliert - dann kommt null und die Anlage muss anders gerechnet
        // werden.
        function kaelteCO2Transkritisch(tVerdampfung, tGaskuehler) {
            const T = CO2_TRANSKRITISCH;
            const naechste = (arr, v) => {
                if (v < arr[0] || v > arr[arr.length - 1]) return null;
                for (let i = 0; i < arr.length - 1; i++) if (v >= arr[i] && v <= arr[i + 1]) return [arr[i], arr[i + 1]];
                return [arr[arr.length - 1], arr[arr.length - 1]];
            };
            const a = naechste(T.t0, tVerdampfung), b = naechste(T.tgc, tGaskuehler);
            if (!a || !b) return null;
            const hol = (x, y) => T.d[`${x}_${y}`];
            const p00 = hol(a[0], b[0]), p01 = hol(a[0], b[1]), p10 = hol(a[1], b[0]), p11 = hol(a[1], b[1]);
            if (!p00 || !p01 || !p10 || !p11) return null;
            const fx = a[1] === a[0] ? 0 : (tVerdampfung - a[0]) / (a[1] - a[0]);
            const fy = b[1] === b[0] ? 0 : (tGaskuehler - b[0]) / (b[1] - b[0]);
            const ip = i => (p00[i] * (1 - fx) + p10[i] * fx) * (1 - fy) + (p01[i] * (1 - fx) + p11[i] * fx) * fy;
            const ueberkritisch = tGaskuehler >= 31;
            return {
                hochdruckBar: ip(0), q0: ip(1), cop: ip(2), arbeit: ip(3),
                pVerdampfung: ip(4), rhoSaug: ip(5),
                ueberkritisch,
                ueberhitzung: T.sh, wirkungsgrad: T.eta,
                hinweis: ueberkritisch
                    ? `Transkritischer Betrieb: bei ${tGaskuehler} °C Gaskühleraustritt gibt es keine Verflüssigung. Der Hochdruck ist Regelgröße – ${ip(0).toFixed(1).replace('.', ',')} bar ergibt hier die beste Leistungszahl (COP ${ip(2).toFixed(2).replace('.', ',')}).`
                    : `Unterkritischer Betrieb: bei ${tGaskuehler} °C verflüssigt CO₂ noch. Optimaler Hochdruck ${ip(0).toFixed(1).replace('.', ',')} bar, COP ${ip(2).toFixed(2).replace('.', ',')}.`
            };
        }

        // Massenstrom und Verdichterleistung im transkritischen Betrieb.
        function kaelteCO2Kreisprozess(p) {
            const { tVerdampfung, tGaskuehler, kaelteleistungW } = p;
            const t = kaelteCO2Transkritisch(tVerdampfung, tGaskuehler);
            if (!t) return { moeglich: false, hinweise: [`Für CO₂ liegt die Kombination ${tVerdampfung} °C Verdampfung / ${tGaskuehler} °C Gaskühleraustritt außerhalb der vorgerechneten Tabelle (Verdampfung −40 bis +5 °C, Gaskühler 20 bis 50 °C).`] };
            const mDot = (kaelteleistungW / 1000) / t.q0;
            return {
                moeglich: true, transkritisch: true, kaeltemittel: 'R744',
                tSat: tVerdampfung, hochdruckBar: t.hochdruckBar,
                q0: t.q0, cop: t.cop,
                mDot, mDotKgH: mDot * 3600,
                verdichterleistungKW: (kaelteleistungW / 1000) / t.cop,
                pVerdampfung: t.pVerdampfung, druckverhaeltnis: t.hochdruckBar / t.pVerdampfung,
                rhoSaug: t.rhoSaug,
                // Fluessigkeits- und Heissgasdichte im ueberkritischen Gebiet
                // sind druckabhaengig und stehen nicht in der Saettigungstabelle.
                // Deshalb hier bewusst nicht gesetzt: die Rohrauslegung fuer
                // Hochdruck- und Fluessigkeitsleitung braucht bei CO2 eigene
                // Daten und wird nicht mit Saettigungswerten gerechnet.
                rhoFluessig: null, rhoHeissgas: null,
                ueberkritisch: t.ueberkritisch,
                hinweise: [
                    { art: 'info', text: t.hinweis },
                    { art: 'pruefen', text: `Vorgerechnet mit ${t.ueberhitzung} K Sauggasüberhitzung und ${t.wirkungsgrad} isentropem Wirkungsgrad. Der tatsächliche Wirkungsgrad steht im Verdichterprogramm des Herstellers und verschiebt Hochdruck und Leistungsaufnahme.` },
                    { art: 'pruefen', text: 'Flashgas-Management, Hochdruckventil und Mitteldrucksammler sind bei diesem Systemtyp zwingend – sie werden hier nicht ausgelegt.' }
                ]
            };
        }

// Regressionstests der Kälte-Berechnungsengine.
// Aufruf:  node tools/test-kaelte.js
// Diese Tests müssen vor jedem Push grün sein.
const fs = require('fs');
const ctx = {};
const src = fs.readFileSync(__dirname + '/../js/11-kaelte-engine.js', 'utf8')
          + fs.readFileSync(__dirname + '/../js/12-kaelte-thermo.js', 'utf8');
new Function(src + `
  this.V=kaelteVorschlaege; this.B=kaelteBerechne; this.TP=kaelteTaupunkt;
  this.AF=kaelteAbsolutFeuchte; this.PS=kaelteSaettigungsdruck;
  this.KP=kaelteKreisprozess; this.RA=kaelteRohrAuswahl; this.ST=kmStoff;
  this.KMT=KAELTEMITTEL;
  this.FM=kaelteFuellmenge;
  this.FG=kaelteFGase;
  this.EX=kaelteExpansionsventil;
`).call(ctx);

let fehler = 0, gesamt = 0;
const KAELTEMITTEL_TEST = ctx.KMT;
function pruefe(name, ist, soll, toleranz) {
  gesamt++;
  const ok = Math.abs(ist - soll) <= toleranz;
  if (!ok) fehler++;
  console.log(`${ok ? '  OK ' : '  ✕  '} ${name.padEnd(52)} ist=${Number(ist).toFixed(3).padStart(10)} soll=${soll} ±${toleranz}`);
}

console.log('\n— Psychrometrie gegen Tabellenwerte —');
pruefe('Sättigungsdruck 20 °C [Pa]', ctx.PS(20), 2339, 10);
pruefe('Sättigungsdruck 0 °C [Pa]', ctx.PS(0), 611, 3);
pruefe('Absolute Feuchte 20 °C/50 % [g/kg]', ctx.AF(20,50)*1000, 7.26, 0.05);
pruefe('Taupunkt 20 °C/50 % [°C]', ctx.TP(20,50), 9.3, 0.1);

console.log('\n— Kältemittel-Stoffdaten gegen Literatur —');
pruefe('R290 Sättigungsdruck -10 °C [bar]', ctx.ST('R290',-10).p, 3.45, 0.02);
pruefe('R134a Sättigungsdruck 0 °C [bar]', ctx.ST('R134a',0).p, 2.93, 0.02);
pruefe('R404A Sättigungsdruck -25 °C [bar]', ctx.ST('R404A',-25).p, 2.50, 0.03);
pruefe('R744 Sättigungsdruck -10 °C [bar]', ctx.ST('R744',-10).p, 26.5, 0.1);
pruefe('R290 Verdampfungsenthalpie -30 °C [kJ/kg]', ctx.ST('R290',-30).r, 412, 5);
console.log('  OK  R744 über 31 °C liefert null (transkritisch):', ctx.ST('R744',35) === null);
if (ctx.ST('R744',35) !== null) fehler++;
gesamt++;

console.log('\n— Gemische: Tiefkühlbereich muss vorhanden sein —');
for (const [f, t] of [['R449A',-30],['R449A',-20],['R448A',-30],['R452A',-30],['R513A',-30],
                      ['R404A',-40],['R507A',-40],['R290',-40],['R134a',-40],['R32',-40]]) {
  gesamt++;
  const st = ctx.ST(f, t);
  if (!st) { console.log(`  ✕   ${f} bei ${t} °C: KEINE Stoffdaten`); fehler++; }
  else console.log(`  OK  ${f} bei ${t} °C: p_dew ${st.p.toFixed(3)} bar, p_bub ${st.pBubble.toFixed(3)} bar, r ${st.r.toFixed(0)} kJ/kg`);
}
console.log('\n— Alle Tabellen reichen bis -50 °C (außer R744, überkritisch ab 31 °C) —');
for (const f of Object.keys(KAELTEMITTEL_TEST)) {
  gesamt++;
  const t0 = KAELTEMITTEL_TEST[f].tabelle[0][0];
  if (t0 > -50) { console.log(`  ✕   ${f} beginnt erst bei ${t0} °C`); fehler++; }
  else console.log(`  OK  ${f}: ${t0} bis ${KAELTEMITTEL_TEST[f].tabelle.slice(-1)[0][0]} °C`);
}
console.log('\n— Gemisch-Glide (Siededruck über Taupunktdruck) —');
for (const [f, erwartetGlide] of [['R449A',true],['R448A',true],['R452A',true],['R513A',false],['R290',false]]) {
  gesamt++;
  const st = ctx.ST(f, -30);
  const hatGlide = Math.abs(st.glidBar) > 0.05;
  if (hatGlide !== erwartetGlide) { console.log(`  ✕   ${f}: Glide ${st.glidBar.toFixed(3)} bar, erwartet ${erwartetGlide ? 'vorhanden' : 'keiner'}`); fehler++; }
  else console.log(`  OK  ${f}: Glide ${st.glidBar.toFixed(3)} bar ${erwartetGlide ? '(Zeotrop)' : '(kein Glide)'}`);
}

console.log('\n— U-Wert —');
const uw = (d,l) => 1/(0.125 + (d/1000)/l + 0.040);
pruefe('100 mm PIR (λ=0,022) [W/m²K]', uw(100,0.022), 0.212, 0.005);
pruefe('150 mm PIR [W/m²K]', uw(150,0.022), 0.143, 0.005);

console.log('\n— Kältelast: Regressionsfälle —');
const f1 = ctx.B(ctx.V({laenge:6,breite:5,hoehe:2.5,raumtemperatur:-20,produktmenge:200,
                        produktart:'Fleisch gefroren',produktEintrittstemperatur:-18}));
pruefe('TK-Lager 75 m³, 200 kg/Tag [kW]', f1.auslegung/1000, 3.17, 0.15);
const f2 = ctx.B(ctx.V({laenge:4,breite:4,hoehe:2.5,raumtemperatur:2,produktmenge:500,
                        produktart:'Gemüse',produktEintrittstemperatur:15}));
pruefe('Kühlraum 40 m³, 500 kg/Tag [kW]', f2.auslegung/1000, 3.05, 0.15);

// Der Faktor-24-Fehler beim Luftwechsel darf nicht zurückkommen.
const w1 = ctx.V({laenge:6,breite:5,hoehe:2.5,raumtemperatur:-20});
pruefe('Luftwechsel TK 75 m³ [1/h] (NICHT 1/24h!)', w1.luftwechsel.wert, 0.49, 0.06);

console.log('\n— Kreisprozess —');
const kp = ctx.KP({kaeltemittel:'R290',tVerdampfung:-28,tVerfluessigung:40,
                   ueberhitzung:8,unterkuehlung:4,kaelteleistungW:10000});
// Sollwerte sind KEINE Schätzung: mit CoolProp exakt nachgerechnet
// (h aus überhitztem bzw. unterkühltem Zustand, nicht aus der Tabelle):
//   p_verd 1,814 bar · p_verfl 13,694 bar · Verhältnis 7,547
//   q0 259,4 kJ/kg · Massenstrom 138,8 kg/h bei 10 kW
pruefe('R290 10 kW: spez. Kälteleistung q0 [kJ/kg]', kp.q0, 259.4, 1.0);
pruefe('R290 10 kW: Massenstrom [kg/h]', kp.mDotKgH, 138.8, 0.5);
pruefe('R290 Druckverhältnis -28/+40 °C', kp.druckverhaeltnis, 7.547, 0.02);
// Sauggasdichte-Näherung (ideales Gas bei konstantem Druck) liegt gegenüber
// CoolProp bei +0,6 bis +1,6 % – für die Rohrauslegung unkritisch.
pruefe('R290 Sauggasdichte [kg/m³]', kp.rhoSaug, 4.05, 0.12);

console.log('\n— Rohrdimensionierung —');
const geo = {laenge:10, hoehenunterschied:3, formstuecke:{bogen90:6, tStueckDurchgang:2}};
const saug = ctx.RA('saug', kp, geo);
const e = saug.empfehlung;
console.log('  Empfohlene Saugleitung:', e ? e.rohr.bez : 'keine geeignet');
if (e) {
  console.log(`     Strömung ${e.w.toFixed(1)} m/s | Re ${Math.round(e.re)} | äquiv. Länge ${e.aeqLaenge.toFixed(1)} m`);
  console.log(`     Δp Reibung ${e.dpReibungBar.toFixed(4)} bar | Δp Höhe ${e.dpHoeheBar.toFixed(4)} bar`);
  gesamt++;
  if (e.w < 8 || e.w > 15) { console.log('  ✕  Strömung außerhalb des Bereichs für Steigleitung'); fehler++; }
  else console.log('  OK  Strömung im Bereich für Steigleitung (≥8 m/s wegen Öltransport)');
}
const fl = ctx.RA('fluessig', kp, {laenge:10, hoehenunterschied:0, formstuecke:{bogen90:6}});
console.log('  Empfohlene Flüssigkeitsleitung:', fl.empfehlung ? `${fl.empfehlung.rohr.bez} (${fl.empfehlung.w.toFixed(2)} m/s)` : 'keine');
gesamt++;
if (!fl.empfehlung || fl.empfehlung.w > 1.5) { console.log('  ✕  Flüssigkeitsgeschwindigkeit zu hoch'); fehler++; }
else console.log('  OK  Flüssigkeitsgeschwindigkeit unter 1,5 m/s');

console.log('\n— CO₂ transkritisch —');
const co2src = fs.readFileSync(__dirname + '/../js/16-co2-transkritisch.js', 'utf8');
const c2 = {};
new Function(co2src + 'this.T=kaelteCO2Transkritisch; this.KP=kaelteCO2Kreisprozess;').call(c2);
// Stuetzstellen muessen exakt reproduziert werden (mit CoolProp vorgerechnet)
pruefe('CO₂ t0 -10 / t_gc 34: Hochdruck [bar]', c2.T(-10, 34).hochdruckBar, 86.5, 0.1);
pruefe('CO₂ t0 -10 / t_gc 34: COP', c2.T(-10, 34).cop, 1.78, 0.01);
pruefe('CO₂ t0 -30 / t_gc 34: Hochdruck [bar]', c2.T(-30, 34).hochdruckBar, 90.0, 0.1);
pruefe('CO₂ t0 -10 / t_gc 40: Hochdruck [bar]', c2.T(-10, 40).hochdruckBar, 104.0, 0.1);
gesamt++;
if (!c2.T(-10, 34).ueberkritisch) { console.log('  ✕   34 °C hätte transkritisch sein müssen'); fehler++; }
else console.log('  OK  34 °C korrekt als transkritisch erkannt');
gesamt++;
if (c2.T(-10, 25).ueberkritisch) { console.log('  ✕   25 °C ist unterkritisch'); fehler++; }
else console.log('  OK  25 °C korrekt als unterkritisch erkannt');
gesamt++;
if (c2.KP({ tVerdampfung: -50, tGaskuehler: 36, kaelteleistungW: 20000 }).moeglich) { console.log('  ✕   -50 °C liegt außerhalb der Tabelle'); fehler++; }
else console.log('  OK  Außerhalb der Tabelle korrekt abgelehnt statt extrapoliert');
const kpc = c2.KP({ tVerdampfung: -30, tGaskuehler: 36, kaelteleistungW: 20000 });
pruefe('CO₂ 20 kW bei -30/36: Massenstrom [kg/h]', kpc.mDotKgH, 493, 3);
pruefe('CO₂ 20 kW bei -30/36: Verdichterleistung [kW]', kpc.verdichterleistungKW, 19.9, 0.3);

// Rohrauslegung muss auch transkritisch funktionieren (eigene Dichten)
const rc = c2.KP({ tVerdampfung: -30, tGaskuehler: 36, kaelteleistungW: 20000 });
pruefe('CO₂ Dichte nach Gaskühler [kg/m³]', rc.rhoFluessig, 683, 3);
pruefe('CO₂ Verdichtungsendtemperatur [°C]', rc.tVerdichtungsende, 161, 3);
gesamt++;
const rHG = ctx.RA('heissgas', rc, { laenge: 15, hoehenunterschied: 0, formstuecke: { bogen90: 6 } });
if (!rHG.empfehlung) { console.log('  ✕   Keine Heißgasdimension für CO₂ gefunden'); fehler++; }
else {
  const anteil = rHG.empfehlung.dpGesamtBar / rc.hochdruckBar * 100;
  if (anteil > 2.0) { console.log(`  ✕   CO₂ Heißgas: ${anteil.toFixed(2)} % Druckverlust über der Grenze`); fehler++; }
  else console.log(`  OK  CO₂ Heißgas ${rHG.empfehlung.rohr.bez}: ${anteil.toFixed(2)} % des Hochdrucks (Grenze 2 %)`);
}

console.log('\n— F-Gase-Prüfintervalle (EU) 2024/573 —');
const FG = ctx.FG || null;
if (FG) {
  const f1 = FG('R404A', 14.6);   // 57,3 t -> 6 Monate
  pruefe('R404A 14,6 kg: CO₂-Äquivalent [t]', f1.co2e, 57.3, 0.2);
  gesamt++; if (f1.intervallMonate !== 6) { console.log('  ✕   erwartet 6 Monate, ist ' + f1.intervallMonate); fehler++; } else console.log('  OK  R404A 14,6 kg -> alle 6 Monate');
  const f2 = FG('R404A', 130);    // > 500 t -> 3 Monate + LES
  gesamt++; if (f2.intervallMonate !== 3 || !f2.lesPflicht) { console.log('  ✕   erwartet 3 Monate mit LES-Pflicht'); fehler++; } else console.log('  OK  R404A 130 kg -> 3 Monate, LES vorgeschrieben');
  const f3 = FG('R404A', 130, { leckageErkennung: true });
  gesamt++; if (f3.intervallMonate !== 6) { console.log('  ✕   mit LES erwartet 6 Monate'); fehler++; } else console.log('  OK  mit LES verdoppelt sich das Intervall auf 6 Monate');
  const f4 = FG('R744', 20);
  gesamt++; if (f4.pflichtig) { console.log('  ✕   CO₂ ist kein F-Gas, darf nicht prüfpflichtig sein'); fehler++; } else console.log('  OK  R744 korrekt als nicht prüfpflichtig erkannt');
  const f5 = FG('R134a', 3.2);    // 4,6 t < 5 t
  gesamt++; if (f5.pflichtig) { console.log('  ✕   4,6 t liegen unter der 5-t-Grenze'); fehler++; } else console.log('  OK  R134a 3,2 kg (4,6 t) unter der 5-t-Grenze');
}

console.log('\n— Expansionsventil nach Ventilkapazität —');
const EX = ctx.EX;
const ex1 = EX({ kaeltemittel: 'R449A', tVerdampfung: -27, tVerfluessigung: 40, unterkuehlung: 4,
                 kaelteleistungW: 10000, dpLeitungBar: 0.3, dpVerteilerBar: 0.5 });
// Sollwert korrigiert (2026-09): die Hochdruckseite muss mit dem BLASEN-
// PUNKTdruck gerechnet werden, nicht mit dem Taupunktdruck - bei R449A/40°C
// ein Unterschied von 2,06 bar (gegen CoolProp geprueft, 12,5 %). Der alte
// Sollwert 13,9 bar basierte auf dem falschen Taupunktbezug.
pruefe('EXV: Δp am Ventil [bar] (Blasenpunkt-korrigiert)', ex1.dpVentil, 15.96, 0.2);
gesamt++;
if (ex1.dpVentil >= ex1.dpGesamt) { console.log('  ✕   Leitungsverluste wurden nicht abgezogen'); fehler++; }
else console.log('  OK  Leitungs- und Verteilerverlust vom verfügbaren Δp abgezogen');
// Zu kleines Ventil muss abgelehnt werden
const ex2 = EX({ kaeltemittel: 'R449A', tVerdampfung: -27, tVerfluessigung: 40, unterkuehlung: 4,
                 kaelteleistungW: 10000, dpLeitungBar: 0.3, dpVerteilerBar: 0.5, nennkapazitaetKW: 8 });
gesamt++;
if (ex2.bewertung.art !== 'fehler') { console.log('  ✕   8 kW Ventil bei 10 kW Bedarf hätte abgelehnt werden müssen'); fehler++; }
else console.log('  OK  Zu kleines Ventil wird abgelehnt');
// Zu großes Ventil muss gewarnt werden
const ex3 = EX({ kaeltemittel: 'R449A', tVerdampfung: -27, tVerfluessigung: 40, unterkuehlung: 4,
                 kaelteleistungW: 10000, dpLeitungBar: 0.3, dpVerteilerBar: 0.5, nennkapazitaetKW: 25 });
gesamt++;
if (ex3.bewertung.art !== 'warnung') { console.log('  ✕   25 kW Ventil bei 10 kW Bedarf hätte eine Warnung geben müssen'); fehler++; }
else console.log('  OK  Deutlich zu großes Ventil wird als unruhig regelnd gewarnt');
// Ohne Druckdifferenz keine Auslegung
const ex4 = EX({ kaeltemittel: 'R449A', tVerdampfung: -27, tVerfluessigung: 40, unterkuehlung: 4,
                 kaelteleistungW: 10000, dpLeitungBar: 20, dpVerteilerBar: 0 });
gesamt++;
if (ex4.moeglich) { console.log('  ✕   Ohne verbleibendes Δp darf nicht ausgelegt werden'); fehler++; }
else console.log('  OK  Ohne verbleibende Druckdifferenz korrekt abgelehnt');

console.log('\n— Bubble/Dew-Konsistenz bei zeotropen Gemischen (Korrektur 2026-09) —');
// Vorher zeigte pVerfluessigung den TAUPUNKTdruck, obwohl h3 (Fluessigkeit
// vor der Drossel) mit der BLASENPUNKT-Enthalpie bei derselben Temperatur
// gerechnet wird. Bei R449A/40°C ein Unterschied von 2,06 bar (12,5 %),
// gegen CoolProp geprueft (Referenzwerte Bubble 18,583 / Dew 16,522 bar).
const kpBD = ctx.KP({ kaeltemittel: 'R449A', tVerdampfung: -30, tVerfluessigung: 40, ueberhitzung: 8, unterkuehlung: 0, kaelteleistungW: 6720 });
pruefe('R449A 40°C: Verflüssigungsdruck jetzt = Blasenpunkt [bar]', kpBD.pVerfluessigung, 18.583, 0.02);
pruefe('R449A 40°C: Taupunktdruck separat verfügbar [bar]', kpBD.pVerfluessigungTau, 16.522, 0.02);
gesamt++;
if (Math.abs(kpBD.pVerfluessigung - kpBD.pVerfluessigungTau) < 1) { console.log('  ✕   Bubble/Dew-Differenz wird nicht mehr abgebildet'); fehler++; }
else console.log(`  OK  Bubble/Dew-Differenz sichtbar: ${(kpBD.pVerfluessigung - kpBD.pVerfluessigungTau).toFixed(2)} bar`);

console.log('\n— Exakter Nutzer-Testfall: R449A 6,72 kW, t0=-30, tc=+40, ÜH=8K, UK=0K —');
pruefe('Massenstrom [kg/h] (Vorgabe: ca. 187,7)', kpBD.mDotKgH, 187.7, 1.5);
const geoFl = { laenge: 30, hoehenunterschied: 11, formstuecke: { bogen90: 8, bogen45: 4, ventil: 1, magnetventil: 1, filtertrockner: 1, schauglas: 1 } };
const raFl = ctx.RA('fluessig', kpBD, geoFl);
const v12 = raFl.varianten.find(x => x.rohr.bez.includes('12'));
// Vorgabewerte des Nutzers fuer Ø12×1mm: w=0,65 m/s, Δp=1,279 bar, ΔT≈2,93K
pruefe('Ø12×1mm Flüssigkeit: w [m/s] (Vorgabe 0,65)', v12.w, 0.65, 0.02);
pruefe('Ø12×1mm Flüssigkeit: Δp [bar] (Vorgabe 1,279)', v12.dpGesamtBar, 1.279, 0.01);
pruefe('Ø12×1mm Flüssigkeit: ΔT [K] (Vorgabe ≈2,93)', v12.dTverlustK, 2.93, 0.1);
gesamt++;
if (v12.ok) { console.log('  ✕   Bei 0K Unterkühlung und 2,93K Verlust darf Ø12×1 NICHT als geeignet gelten'); fehler++; }
else console.log('  OK  Ø12×1mm korrekt als ungeeignet erkannt (Flashgas-Risiko bei 0K Unterkühlung)');
gesamt++;
if (!v12.bewertung.some(b => /Unterkühlungsreserve/.test(b.text))) { console.log('  ✕   Flashgas-/Unterkühlungsreserve-Meldung fehlt'); fehler++; }
else console.log('  OK  Flashgas-/Unterkühlungsreserve-Meldung vorhanden');
gesamt++;
if (raFl.empfehlung) { console.log('  ✕   Bei 0K Unterkühlung und dieser Leitungsführung darf KEINE Dimension empfohlen werden'); fehler++; }
else console.log('  OK  Korrekt keine Empfehlung – jede Dimension zehrt die (nicht vorhandene) Unterkühlung auf');

console.log('\n— Füllmenge: "Sonstige Bauteile" ist optional, kein Pflichtfeld —');
// Vorher blockierte ein leeres ODER sogar explizit auf 0 gesetztes "Sonstige"-
// Feld die Vollstaendigkeit dauerhaft (0 ist falsy in JS) - ein Techniker
// ohne zusaetzliche Bauteile konnte "vollstaendig" nie erreichen.
const fmOhneSonstige = ctx.FM([{art:'fluessig',diMm:10,laenge:5,bez:'x'}],
  { rhoFluessig: 1000 }, { verdampfer: 8, verfluessiger: 6, sammler: 10 });
gesamt++;
if (!fmOhneSonstige.sicher) { console.log('  ✕   Ohne "Sonstige Bauteile" (Feld leer gelassen) sollte die Füllmenge trotzdem vollständig sein'); fehler++; }
else console.log('  OK  Füllmenge vollständig ohne "Sonstige Bauteile" – optionaler Sammelposten blockiert nicht mehr');
gesamt++;
const fmMitSonstige0 = ctx.FM([{art:'fluessig',diMm:10,laenge:5,bez:'x'}],
  { rhoFluessig: 1000 }, { verdampfer: 8, verfluessiger: 6, sammler: 10, sonstige: 0 });
if (!fmMitSonstige0.sicher) { console.log('  ✕   Explizite 0 bei "Sonstige" darf nicht mehr als "fehlend" gelten'); fehler++; }
else console.log('  OK  Explizite 0 bei "Sonstige Bauteile" gilt korrekt als vollständig');

console.log('\n— Fehlende Daten dürfen nicht erfunden werden —');
gesamt++;
const kpCO2 = ctx.KP({kaeltemittel:'R744',tVerdampfung:-30,tVerfluessigung:40,kaelteleistungW:10000});
if (kpCO2.moeglich) { console.log('  ✕  CO₂ transkritisch hätte abgelehnt werden müssen'); fehler++; }
else console.log('  OK  CO₂ bei 40 °C korrekt abgelehnt (transkritisch)');

console.log(`\n${fehler === 0 ? '✓ ALLE TESTS BESTANDEN' : '✕ ' + fehler + ' FEHLER'} (${gesamt - fehler}/${gesamt})\n`);
process.exit(fehler ? 1 : 0);

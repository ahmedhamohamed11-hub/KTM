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
`).call(ctx);

let fehler = 0, gesamt = 0;
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

console.log('\n— Fehlende Daten dürfen nicht erfunden werden —');
gesamt++;
const kpCO2 = ctx.KP({kaeltemittel:'R744',tVerdampfung:-30,tVerfluessigung:40,kaelteleistungW:10000});
if (kpCO2.moeglich) { console.log('  ✕  CO₂ transkritisch hätte abgelehnt werden müssen'); fehler++; }
else console.log('  OK  CO₂ bei 40 °C korrekt abgelehnt (transkritisch)');

console.log(`\n${fehler === 0 ? '✓ ALLE TESTS BESTANDEN' : '✕ ' + fehler + ' FEHLER'} (${gesamt - fehler}/${gesamt})\n`);
process.exit(fehler ? 1 : 0);

// Regressionstests der Compliance-Engine (js/19-kaelte-compliance.js).
// Aufruf: node tools/test-compliance.js
const fs = require('fs');

global.escapeHtml = t => String(t);
global.formatDate = () => 'x';
global.formatCurrency = v => (v || 0).toFixed(2) + ' EUR';
global.icon = () => '';
global.idJS = x => JSON.stringify(x);

const ctxThermo = {};
new Function(
  fs.readFileSync(__dirname + '/../js/11-kaelte-engine.js', 'utf8') +
  fs.readFileSync(__dirname + '/../js/12-kaelte-thermo.js', 'utf8') +
  `this.FG = kaelteFGase; this.GWP = KAELTEMITTEL_GWP;`
).call(ctxThermo);
global.kaelteFGase = ctxThermo.FG;
global.KAELTEMITTEL_GWP = ctxThermo.GWP;
global.kaelteAuslegungsdaten = () => global.__testAuslegung;
global.kaelteMaterialListe = () => global.__testMaterial;

const ctxComp = {};
new Function(
  fs.readFileSync(__dirname + '/../js/19-kaelte-compliance.js', 'utf8') +
  `this.RULES = COMPLIANCE_RULES; this.AUSWERTEN = kaelteComplianceAuswerten; this.STATUS = COMPLIANCE_STATUS;`
).call(ctxComp);

let fehler = 0, gesamt = 0;
function pruefe(name, cond) {
  gesamt++;
  if (cond) { console.log('  OK  ' + name); } else { console.log('  ✕   ' + name); fehler++; }
}
function setzeProjekt(kaeltemittel, tc, mengeKg, fgaseOpts) {
  global.__testAuslegung = { kaeltemittel, tVerfluessigung: tc };
  global.__testMaterial = { pos: [{ schluessel: 'kaeltemittel', menge: mengeKg }] };
  return { kaelte: { fgase: fgaseOpts || {} } };
}

console.log('=== Rule Registry ===');
pruefe('Registrierte Regeln vorhanden', ctxComp.RULES.length >= 11);
pruefe('Keine doppelten Rule IDs', new Set(ctxComp.RULES.map(r => r.rule_id)).size === ctxComp.RULES.length);
pruefe('Jede Regel hat rule_id im Format RULE-<DOMAIN>-...', ctxComp.RULES.every(r => /^RULE-[A-Z0-9]+-/.test(r.rule_id)));
pruefe('Jede Regel hat verification_status', ctxComp.RULES.every(r => ['DRAFT', 'VERIFIED', 'DEPRECATED', 'SUPERSEDED'].includes(r.verification_status)));
pruefe('Keine DRAFT-Regel liefert bei irgendeinem Test-Input PASS',
  ctxComp.RULES.filter(r => r.verification_status === 'DRAFT').every(r => {
    const out = r.evaluate({ kaelte: {} });
    return out.status !== 'PASS' && out.status !== 'PASS_WITH_WARNINGS';
  }));

console.log('\n=== RULE-FGAS-2024-001/002: reale Testfälle ===');

// Große Anlage, R404A, ohne LES -> WARNING (Intervall) + FAIL (fehlendes LES)
let p = setzeProjekt('R404A', 35, 130, { les: false });
let c = ctxComp.AUSWERTEN(p);
let r1 = c.rules.find(r => r.rule_id === 'RULE-FGAS-2024-001');
let r2 = c.rules.find(r => r.rule_id === 'RULE-FGAS-2024-002');
pruefe('130 kg R404A: Prüfintervall-Regel meldet 3 Monate', r1.calculated.interval_months === 3);
pruefe('130 kg R404A ohne LES: LES-Pflicht-Regel = FAIL', r2.status === 'FAIL');
pruefe('Gesamtstatus bei einer FAIL-Regel = FAIL', c.overall_status === 'FAIL');

// Dieselbe Anlage MIT LES -> PASS
p = setzeProjekt('R404A', 35, 130, { les: true });
c = ctxComp.AUSWERTEN(p);
r2 = c.rules.find(r => r.rule_id === 'RULE-FGAS-2024-002');
pruefe('130 kg R404A MIT LES: LES-Pflicht-Regel = PASS', r2.status === 'PASS');
pruefe('Gesamtstatus ohne FAIL, aber mit Warnung = PASS_WITH_WARNINGS', c.overall_status === 'PASS_WITH_WARNINGS');

// Kleine Anlage, R449A, unter 5 t -> PASS (keine Prüfpflicht)
p = setzeProjekt('R449A', 40, 0.8, {});
c = ctxComp.AUSWERTEN(p);
r1 = c.rules.find(r => r.rule_id === 'RULE-FGAS-2024-001');
pruefe('0,8 kg R449A: unter der Prüfschwelle -> PASS', r1.status === 'PASS');

// CO2 / R744 ist kein F-Gas -> PASS mit entsprechender Begründung, keine Pflicht
p = setzeProjekt('R744', 36, 20, {});
c = ctxComp.AUSWERTEN(p);
r1 = c.rules.find(r => r.rule_id === 'RULE-FGAS-2024-001');
pruefe('R744 (CO₂): korrekt kein F-Gas -> PASS', r1.status === 'PASS');
pruefe('R744: Begründung nennt "kein fluoriertes Treibhausgas"', /kein fluoriertes Treibhausgas/.test(r1.reason));

// Fehlende Füllmenge -> DATA_MISSING, NIEMALS ein erfundener Wert
p = setzeProjekt('R449A', 40, 0, {});
c = ctxComp.AUSWERTEN(p);
r1 = c.rules.find(r => r.rule_id === 'RULE-FGAS-2024-001');
pruefe('Ohne Füllmenge: DATA_MISSING statt erfundenem Ergebnis', r1.status === 'DATA_MISSING');
pruefe('Gesamtstatus bei fehlenden Daten (keine FAIL) = DATA_MISSING', c.overall_status === 'DATA_MISSING');

// A2L/A3-Kältemittel (R290, R1270, R600a) sind ebenfalls keine F-Gase
console.log('\n=== Brennbare Kältemittel (A3) – nicht automatisch ATEX ===');
['R290', 'R1270', 'R600a'].forEach(km => {
  p = setzeProjekt(km, 40, 5, {});
  c = ctxComp.AUSWERTEN(p);
  const r = c.rules.find(x => x.rule_id === 'RULE-FGAS-2024-001');
  pruefe(`${km}: korrekt kein F-Gas -> PASS`, r.status === 'PASS');
});
const a3 = ctxComp.RULES.find(r => r.rule_id === 'RULE-A3-ROOM-001');
pruefe('RULE-A3-ROOM-001 existiert als Platzhalter (DRAFT)', a3 && a3.verification_status === 'DRAFT');
pruefe('A3-Regel behauptet NICHT automatisch ATEX', /[Nn]iemals automatisch als ATEX/.test(a3.quelle_hinweis || ''));
pruefe('A3-Regel liefert SOURCE_MISSING statt erfundener Bewertung', a3.evaluate().status === 'SOURCE_MISSING');

console.log('\n=== Migrierte Alt-API (js/08-anlagen-wartung.js) bleibt kompatibel ===');
{
  const vorherigesWindow = global.window;
  global.window = global;
  new Function(fs.readFileSync(__dirname + '/../js/08-anlagen-wartung.js', 'utf8'))();
  const w = { KTM_FGAS: global.KTM_FGAS };
  global.window = vorherigesWindow;
  pruefe('window.KTM_FGAS.co2eq existiert weiterhin', typeof w.KTM_FGAS.co2eq === 'function');
  pruefe('checkIntervalMonths(60) = 6 (50-500t-Bereich, unverändert)', w.KTM_FGAS.checkIntervalMonths(60) === 6);
  pruefe('checkIntervalMonths(600) = 3 (>500t, unverändert)', w.KTM_FGAS.checkIntervalMonths(600) === 3);
  pruefe('R404A weiterhin im GWP-Objekt (F.GWP[x]-Direktzugriff)', w.KTM_FGAS.GWP['R404A'] === 3922);
  pruefe('R410A (nur in der alten Tabelle) weiterhin vorhanden', w.KTM_FGAS.GWP['R410A'] === 2088);
}

console.log('\n=== Phase B: historischer Rechtsstand ===');
{
  const ctxV = {};
  new Function(fs.readFileSync(__dirname + '/../js/19-kaelte-compliance.js', 'utf8') +
    'this.RS = kaelteRechtsstand; this.VER = COMPLIANCE_RULE_SET_VERSION; this.AUSWERTEN = kaelteComplianceAuswerten;').call(ctxV);

  // Neues Projekt (Version wird beim Anlegen gesetzt, hier simuliert)
  const neu = { kaelte: { complianceRuleSetVersionAtCreation: ctxV.VER, kuehlstellen: [] } };
  const rsNeu = ctxV.RS(neu);
  pruefe('Neues Projekt: Rechtsstand = "aktuell"', rsNeu.zustand === 'aktuell');
  pruefe('Neues Projekt: kein Hinweis nötig', rsNeu.hinweis === null);

  // Bestehendes Projekt OHNE gespeicherten Wert (vor Einführung dieser Funktion)
  const alt = { kaelte: { kuehlstellen: [] } };
  const rsAlt = ctxV.RS(alt);
  pruefe('Altes Projekt ohne Wert: Rechtsstand = "unbekannt", NICHT "aktuell"', rsAlt.zustand === 'unbekannt');
  pruefe('Altes Projekt: KEINE stille Migration - versionBeiErstellung bleibt null', rsAlt.versionBeiErstellung === null);
  pruefe('Altes Projekt: Hinweis nennt "nicht rekonstruierbar"', /nicht rekonstruierbar/.test(rsAlt.hinweis));

  // Projekt unter einer ANDEREN (älteren) Version angelegt
  const geaendert = { kaelte: { complianceRuleSetVersionAtCreation: '2025.3', kuehlstellen: [] } };
  const rsGeaendert = ctxV.RS(geaendert);
  pruefe('Projekt mit älterer Version: Rechtsstand = "geaendert"', rsGeaendert.zustand === 'geaendert');
  pruefe('Alte Version bleibt sichtbar (2025.3), wird NICHT überschrieben', rsGeaendert.versionBeiErstellung === '2025.3');
  pruefe('Hinweis nennt sowohl alte als auch aktuelle Version', rsGeaendert.hinweis.includes('2025.3') && rsGeaendert.hinweis.includes(ctxV.VER));

  // Die Auswertung selbst nutzt bei einem "geaendert"-Projekt trotzdem IMMER
  // die aktuelle Regellogik - es gibt kein eingefrorenes altes Ergebnis.
  global.kaelteAuslegungsdaten = () => ({ kaeltemittel: 'R744', tVerfluessigung: 20 });
  global.kaelteMaterialListe = () => ({ pos: [{ schluessel: 'kaeltemittel', menge: 5 }] });
  const cGeaendert = ctxV.AUSWERTEN(geaendert);
  pruefe('Auswertung bei geändertem Rechtsstand rechnet trotzdem live (R744 korrekt kein F-Gas)',
    cGeaendert.rules.find(r => r.rule_id === 'RULE-FGAS-2024-001').status === 'PASS');
  pruefe('Ergebnis enthält beide Versionsangaben', cGeaendert.rule_set_version_at_creation === '2025.3' && cGeaendert.current_rule_set_version === ctxV.VER);
}

console.log(`\n${fehler === 0 ? '✓ ALLE COMPLIANCE-TESTS BESTANDEN' : '✕ ' + fehler + ' FEHLER'} (${gesamt - fehler}/${gesamt})\n`);
process.exit(fehler ? 1 : 0);

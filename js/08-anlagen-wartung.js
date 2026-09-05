// ============================================================================
// KTM – Anlagenverwaltung, F-Gase/Kältemittel-Protokoll & Wartung
// ============================================================================
// MIGRIERT (2026-09, Compliance-Engine Phase 2):
// Diese Datei zitierte bisher die AUFGEHOBENE Verordnung (EU) 517/2014 als
// Rechtsgrundlage. Aktuell gilt Verordnung (EU) 2024/573 (in Kraft seit
// 11.03.2024). Die Kontrollintervalle selbst (12/6/3 Monate ab 5/50/500 t
// CO2e) sind zwischen beiden Fassungen UNVERAENDERT (Art. 5 der neuen
// Verordnung) - das wurde in diesem Projekt bereits recherchiert und in
// kaelteFGase() (js/12-kaelte-thermo.js) mit Quellenangabe hinterlegt, dort
// zusaetzlich mit der LES-Verdopplung und der HFO-Mengenschwelle (Art. 5/12).
//
// Diese Datei bleibt bestehen, weil ihre oeffentliche API window.KTM_FGAS an
// 5 Stellen im Dashboard/Anlagen-Modul verwendet wird (allgemeine Anlagen-
// verwaltung, NICHT nur Kaelteanlagen-Auslegung-Projekte). Diese Aufrufer
// werden NICHT angefasst - die Funktionssignaturen bleiben identisch.
// checkIntervalMonths(t) kennt anders als kaelteFGase() weder Kaeltemittel
// noch Fuellmenge einzeln (nur die fertige Tonnenzahl) und kann deshalb die
// HFO-Mengenschwelle NICHT abbilden - bekannte Einschraenkung dieser alten,
// bewusst kompatibel gehaltenen API. Fuer Kaelteanlagen-Auslegung-Projekte
// mit voller Logik: kaelteFGase() bzw. RULE-FGAS-2024-001/002 verwenden.
// ============================================================================

(function () {
    'use strict';

    // GWP-Tabelle EINMAL gefuehrt (vorher gab es hier eine zweite, von der
    // Kaelte-Engine unabhaengige Kopie - klassische Dopplung). LAZY
    // zusammengefuehrt, nicht beim Laden: diese Datei laedt in der
    // Scriptreihenfolge VOR js/12-kaelte-thermo.js, KAELTEMITTEL_GWP
    // existiert also erst, wenn die Funktionen unten tatsaechlich vom
    // Benutzer ausgeloest aufgerufen werden (alle Skripte dann geladen).
    // Enthaelt zusaetzlich Kaeltemittel, die die neuere KAELTEMITTEL_GWP-
    // Tabelle (fuer die Kaelteanlagen-Auslegung) nicht fuehrt, damit
    // bestehende Anlagen-Datensaetze mit z. B. R410A oder R22 weiterhin
    // einen GWP-Wert bekommen.
    const GWP_ZUSATZ = { 'CO2': 1, 'NH3': 0, 'R717': 0,
        'R410A': 2088, 'R407C': 1774, 'R1234yf': 4, 'R1234ze': 7, 'R22': 1810,
        'R454B': 466, 'R454C': 148, 'R455A': 148, 'R468A': 1259, 'R471A': 148 };
    const GWP_FALLBACK = Object.assign({
        'R32': 675, 'R290': 3, 'R600a': 3, 'R744': 1, 'R134a': 1430, 'R404A': 3922,
        'R507A': 3985, 'R448A': 1387, 'R449A': 1397, 'R452A': 2140, 'R513A': 631
    }, GWP_ZUSATZ);
    function aktuelleGwpTabelle() {
        return (typeof KAELTEMITTEL_GWP !== 'undefined') ? Object.assign({}, GWP_ZUSATZ, KAELTEMITTEL_GWP) : GWP_FALLBACK;
    }
    // GWP bleibt als Objekt lesbar (zwei bestehende Aufrufer lesen
    // F.GWP[kaeltemittel] bzw. F.REFRIGERANTS direkt, nicht nur ueber
    // co2eq()) - als GETTER, damit wirklich EINE Quelle existiert und nicht
    // eine beim Laden eingefrorene Kopie neben der lazy aufgeloesten in
    // co2eq(). Zum Zeitpunkt des ERSTEN Lesezugriffs (durch Benutzerklick,
    // lange nach dem Laden aller Skripte) existiert KAELTEMITTEL_GWP sicher.
    const REFRIGERANTS = Object.keys(GWP_FALLBACK).filter(k => k !== 'CO2' && k !== 'NH3' && k !== 'R717');

    // CO2-Äquivalent in Tonnen
    function co2eq(refrigerant, fillKg) {
        const tabelle = aktuelleGwpTabelle();
        const gwp = tabelle[refrigerant] != null ? tabelle[refrigerant] : 0;
        return (Number(fillKg) || 0) * gwp / 1000; // t CO2e
    }

    // Prüfintervall (Monate) nach (EU) 2024/573, Art. 5.
    // <5t: keine Pflicht nach diesem Kriterium (Art. 5 - die zusaetzliche
    // Mengenschwelle bei HFO-Gemischen kennt diese Funktion mangels
    // Kaeltemittel-Parameter nicht, siehe Hinweis oben) · 5–50t: 12 Mon ·
    // 50–500t: 6 Mon · >500t: 3 Mon (jeweils verdoppelt mit Leckage-
    // Erkennungssystem - hier ohne, siehe kaelteFGase() fuer die volle Logik)
    function checkIntervalMonths(t) {
        if (t < 5) return null;      // keine gesetzliche Pflicht nach diesem Kriterium
        if (t < 50) return 12;
        if (t < 500) return 6;
        return 3;
    }

    function intervalLabel(t) {
        const m = checkIntervalMonths(t);
        if (m === null) return 'keine Prüfpflicht (< 5 t CO₂e)';
        return `alle ${m} Monate`;
    }

    // Nächste Fälligkeit aus letztem Prüfdatum + Intervall
    function nextCheckDate(lastCheckISO, t) {
        const m = checkIntervalMonths(t);
        if (m === null || !lastCheckISO) return null;
        const d = new Date(lastCheckISO);
        d.setMonth(d.getMonth() + m);
        return d;
    }

    // Öffentliche API bereitstellen - Signatur UNVERAENDERT (5 bestehende
    // Aufrufer in 03-pages.js und 07-extensions-init.js). GWP als Getter,
    // damit F.GWP[x] IMMER die aktuelle, konsolidierte Tabelle liefert.
    window.KTM_FGAS = { REFRIGERANTS, co2eq, checkIntervalMonths, intervalLabel, nextCheckDate };
    Object.defineProperty(window.KTM_FGAS, 'GWP', { get: aktuelleGwpTabelle, enumerable: true });
})();

// ============================================================================
// KTM – Anlagenverwaltung, F-Gase/Kältemittel-Protokoll & Wartung
// ============================================================================
// Fachlich nach EU-Verordnung 517/2014 (F-Gase-VO):
//  - CO2-Äquivalent = Füllmenge[kg] × GWP
//  - Dichtheitsprüf-Intervalle richten sich nach dem CO2-Äquivalent (Tonnen)
// ============================================================================

(function () {
    'use strict';

    // GWP-Werte gängiger Kältemittel (AR4/AR5, wie in der F-Gase-VO genutzt)
    const GWP = {
        'R32': 675, 'R290': 3, 'R600a': 3, 'R744': 1, 'CO2': 1, 'R717': 0, 'NH3': 0,
        'R410A': 2088, 'R407C': 1774, 'R134a': 1430, 'R404A': 3922, 'R507A': 3985,
        'R448A': 1387, 'R449A': 1397, 'R452A': 2140, 'R513A': 631, 'R1234yf': 4,
        'R1234ze': 7, 'R22': 1810, 'R454B': 466, 'R454C': 148, 'R455A': 148,
        'R468A': 1259, 'R471A': 148
    };

    const REFRIGERANTS = Object.keys(GWP).filter(k => k !== 'CO2' && k !== 'NH3');

    // CO2-Äquivalent in Tonnen
    function co2eq(refrigerant, fillKg) {
        const gwp = GWP[refrigerant] != null ? GWP[refrigerant] : 0;
        return (Number(fillKg) || 0) * gwp / 1000; // t CO2e
    }

    // Prüfintervall (Monate) nach F-Gase-VO 517/2014, Art. 4
    // <5t: keine Pflicht · 5–50t: 12 Mon · 50–500t: 6 Mon · >500t: 3 Mon
    // (halbiert sich mit Leckage-Erkennungssystem – hier ohne)
    function checkIntervalMonths(t) {
        if (t < 5) return null;      // keine gesetzliche Pflicht
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

    // Öffentliche API bereitstellen
    window.KTM_FGAS = { GWP, REFRIGERANTS, co2eq, checkIntervalMonths, intervalLabel, nextCheckDate };
})();

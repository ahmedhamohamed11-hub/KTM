// ============================================================================
// KTM – Hersteller-Katalog Import (Samsung, Daikin, LG, Hisense, Bosch)
// ============================================================================
// Fertige Geräte-Daten aus den Herstellerkatalogen. Werden per Knopf in den
// Materialkatalog importiert (Marke, Serie, Modell, Bauart, kW, Preis).
// Preise = Einzelpreis (Verkauf) laut Katalog, kann danach angepasst werden.
//
// Vollständigkeitsprüfung: Alle 149 Datensätze (Samsung, Daikin, LG, Hisense)
// wurden gegen die eingescannten Original-Herstellerkataloge in katalog.html
// (window.CATALOG, 14 Seiten) geprüft – Modell, kW, SEER/SCOP und Preise
// stimmen für alle 4 Marken 1:1 mit dem Original überein, keine Fehler,
// keine Dubletten. Die 4 Hisense-Außeneinheiten (AS25/35/50/70) haben
// bewusst sellingPrice 0, weil der Katalog dafür nur den Set-Preis
// (Innen+Außen) ausweist statt eines Einzelpreises – analog zur Bosch-
// Set-Logik unten wird kein erfundener Einzelpreis eingetragen.
// ============================================================================

window.KTM_KATALOG = [
    // ===== SAMSUNG WindFree Standard – Single-Split (S.60) =====
    { manufacturer: 'Samsung', series: 'WindFree Standard', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Samsung WindFree AR60 F09C1AWN/EU', articleNumber: 'AR60F09C1AWN/EU', size: '2,5', sellingPrice: 768, notes: 'Kühlen 2,5 / Heizen 3,2 kW · SEER 7,8 · R32 · 299x820x215' },
    { manufacturer: 'Samsung', series: 'WindFree Standard', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Samsung WindFree AR60 F09C1AWX/EU', articleNumber: 'AR60F09C1AWX/EU', size: '2,5', sellingPrice: 1332, notes: 'Außeneinheit · 540x710x220 · 24 kg' },
    { manufacturer: 'Samsung', series: 'WindFree Standard', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Samsung WindFree AR60 F12C1AWN/EU', articleNumber: 'AR60F12C1AWN/EU', size: '3,5', sellingPrice: 843, notes: 'Kühlen 3,5 / Heizen 3,8 kW · SEER 7,8 · R32' },
    { manufacturer: 'Samsung', series: 'WindFree Standard', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Samsung WindFree AR60 F12C1AWX/EU', articleNumber: 'AR60F12C1AWX/EU', size: '3,5', sellingPrice: 1439, notes: 'Außeneinheit · 540x710x220 · 24 kg' },
    { manufacturer: 'Samsung', series: 'WindFree Standard', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Samsung WindFree AR60 F18C1AWN/EU', articleNumber: 'AR60F18C1AWN/EU', size: '5,0', sellingPrice: 1210, notes: 'Kühlen 5,0 / Heizen 6,0 kW · SEER 7,2 · R32' },
    { manufacturer: 'Samsung', series: 'WindFree Standard', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Samsung WindFree AR60 F18C1AWX/EU', articleNumber: 'AR60F18C1AWX/EU', size: '5,0', sellingPrice: 1863, notes: 'Außeneinheit · 638x880x310 · 36,8 kg' },
    { manufacturer: 'Samsung', series: 'WindFree Standard', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Samsung WindFree AR60 F24C1AWN/EU', articleNumber: 'AR60F24C1AWN/EU', size: '6,5', sellingPrice: 1598, notes: 'Kühlen 6,5 / Heizen 7,4 kW · SEER 7,0 · R32' },
    { manufacturer: 'Samsung', series: 'WindFree Standard', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Samsung WindFree AR60 F24C1AWX/EU', articleNumber: 'AR60F24C1AWX/EU', size: '6,5', sellingPrice: 2271, notes: 'Außeneinheit · 638x880x310 · 38,8 kg' },

    // ===== SAMSUNG Airise Living – Single-Split (S.60) =====
    { manufacturer: 'Samsung', series: 'Airise Living', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Samsung Airise AR50 F09C1BHN/EU', articleNumber: 'AR50F09C1BHN/EU', size: '2,5', sellingPrice: 616, notes: 'Kühlen 2,5 / Heizen 3,2 kW · SEER 6,7 · R32' },
    { manufacturer: 'Samsung', series: 'Airise Living', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Samsung Airise AR50 F09C1BHX/EU', articleNumber: 'AR50F09C1BHX/EU', size: '2,5', sellingPrice: 984, notes: 'Außeneinheit · 540x710x220 · 22,6 kg' },
    { manufacturer: 'Samsung', series: 'Airise Living', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Samsung Airise AR50 F12C1BHN/EU', articleNumber: 'AR50F12C1BHN/EU', size: '3,5', sellingPrice: 673, notes: 'Kühlen 3,5 / Heizen 3,5 kW · SEER 6,5 · R32' },
    { manufacturer: 'Samsung', series: 'Airise Living', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Samsung Airise AR50 F12C1BHX/EU', articleNumber: 'AR50F12C1BHX/EU', size: '3,5', sellingPrice: 1019, notes: 'Außeneinheit · 540x710x220 · 22,6 kg' },
    { manufacturer: 'Samsung', series: 'Airise Living', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Samsung Airise AR50 F18C1BHN/EU', articleNumber: 'AR50F18C1BHN/EU', size: '5,0', sellingPrice: 1017, notes: 'Kühlen 5,0 / Heizen 6,0 kW · SEER 6,8 · R32' },
    { manufacturer: 'Samsung', series: 'Airise Living', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Samsung Airise AR50 F18C1BHX/EU', articleNumber: 'AR50F18C1BHX/EU', size: '5,0', sellingPrice: 1564, notes: 'Außeneinheit · 638x880x310 · 36,8 kg' },
    { manufacturer: 'Samsung', series: 'Airise Living', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Samsung Airise AR50 F24C1BHN/EU', articleNumber: 'AR50F24C1BHN/EU', size: '6,5', sellingPrice: 1335, notes: 'Kühlen 6,5 / Heizen 7,4 kW · SEER 6,4 · R32' },
    { manufacturer: 'Samsung', series: 'Airise Living', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Samsung Airise AR50 F24C1BHX/EU', articleNumber: 'AR50F24C1BHX/EU', size: '6,5', sellingPrice: 2056, notes: 'Außeneinheit · 638x880x310 · 38,8 kg' },

    // ===== SAMSUNG WindFree Standard – Multi-Split Innengeräte (S.64) =====
    { manufacturer: 'Samsung', series: 'WindFree Standard (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Samsung WindFree AR60F07C1AWN/EU', articleNumber: 'AR60F07C1AWN/EU', size: '2,0', sellingPrice: 681, notes: 'Multi-Split Innengerät · Kühlen 2,0 / Heizen 2,2 kW · R32' },
    { manufacturer: 'Samsung', series: 'WindFree Standard (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Samsung WindFree AR60F09C1AWN/EU', articleNumber: 'AR60F09C1AWN/EU (Multi)', size: '2,6', sellingPrice: 761, notes: 'Multi-Split Innengerät · Kühlen 2,6 / Heizen 3,2 kW · R32' },
    { manufacturer: 'Samsung', series: 'WindFree Standard (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Samsung WindFree AR60F12C1AWN/EU', articleNumber: 'AR60F12C1AWN/EU (Multi)', size: '3,5', sellingPrice: 843, notes: 'Multi-Split Innengerät · Kühlen 3,5 / Heizen 3,5 kW · R32' },
    { manufacturer: 'Samsung', series: 'WindFree Standard (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Samsung WindFree AR60F18C1AWN/EU', articleNumber: 'AR60F18C1AWN/EU (Multi)', size: '5,0', sellingPrice: 1210, notes: 'Multi-Split Innengerät · Kühlen 5,0 / Heizen 6,0 kW · R32' },

    // ===== SAMSUNG Airise Living – Multi-Split Innengeräte (S.64) =====
    { manufacturer: 'Samsung', series: 'Airise Living (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Samsung Airise AR50F07C1BHN/EU', articleNumber: 'AR50F07C1BHN/EU', size: '2,0', sellingPrice: 554, notes: 'Multi-Split Innengerät · Kühlen 2,0 / Heizen 2,2 kW · R32' },
    { manufacturer: 'Samsung', series: 'Airise Living (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Samsung Airise AR50F09C1BHN/EU', articleNumber: 'AR50F09C1BHN/EU (Multi)', size: '2,5', sellingPrice: 615, notes: 'Multi-Split Innengerät · Kühlen 2,5 / Heizen 3,0 kW · R32' },
    { manufacturer: 'Samsung', series: 'Airise Living (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Samsung Airise AR50F12C1BHN/EU', articleNumber: 'AR50F12C1BHN/EU (Multi)', size: '3,5', sellingPrice: 673, notes: 'Multi-Split Innengerät · Kühlen 3,5 / Heizen 4,0 kW · R32' },
    { manufacturer: 'Samsung', series: 'Airise Living (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Samsung Airise AR50F18C1BHN/EU', articleNumber: 'AR50F18C1BHN/EU (Multi)', size: '5,0', sellingPrice: 1070, notes: 'Multi-Split Innengerät · Kühlen 5,0 / Heizen 6,0 kW · R32' },

    // ===== SAMSUNG Zubehör (Fernbedienung/Interface) =====
    { manufacturer: 'Samsung', series: 'Zubehör', category: 'Zubehör', bauart: 'Zubehör', name: 'Samsung MIH-A00N Interface Kabelfernbedienung', articleNumber: 'MIH-A00N', size: '', sellingPrice: 77, notes: 'Interface für Anschluss einer Kabelfernbedienung' },
    { manufacturer: 'Samsung', series: 'Zubehör', category: 'Zubehör', bauart: 'Zubehör', name: 'Samsung HWR-SH11N Touch-Kabelfernbedienung', articleNumber: 'HWR-SH11N', size: '', sellingPrice: 294, notes: 'Touch-Kabelfernbedienung ohne Timer' },
    { manufacturer: 'Samsung', series: 'Zubehör', category: 'Zubehör', bauart: 'Zubehör', name: 'Samsung HWR-WG 01JN Touch-Kabelfernbedienung mit Timer', articleNumber: 'HWR-WG01JN', size: '', sellingPrice: 380, notes: 'mit Timer, Raumtemperaturfühler, Echtzeit-/Tages-/Wochentimer' },

    // ===== SAMSUNG Free Joint Multi – Außeneinheiten (S.65) =====
    { manufacturer: 'Samsung', series: 'Free Joint Multi', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Samsung AJ040TXJ2KG/EU (2 IE)', articleNumber: 'AJ040TXJ2KG/EU', size: '4,0', sellingPrice: 2347, notes: 'max 2 Innengeräte · 4,0/4,4 kW · A+++/A++ · 548x790x285 · R32' },
    { manufacturer: 'Samsung', series: 'Free Joint Multi', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Samsung AJ050TXJ2KG/EU (2 IE)', articleNumber: 'AJ050TXJ2KG/EU', size: '5,0', sellingPrice: 2706, notes: 'max 2 Innengeräte · 5,0/5,7 kW · A+++/A++ · R32' },
    { manufacturer: 'Samsung', series: 'Free Joint Multi', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Samsung AJ052TXJ3KG/EU (3 IE)', articleNumber: 'AJ052TXJ3KG/EU', size: '5,2', sellingPrice: 3061, notes: 'max 3 Innengeräte · 5,2/6,3 kW · 638x880x310 · R32' },
    { manufacturer: 'Samsung', series: 'Free Joint Multi', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Samsung AJ068TXJ3KG/EU (3 IE)', articleNumber: 'AJ068TXJ3KG/EU', size: '6,8', sellingPrice: 3548, notes: 'max 3 Innengeräte · 6,8/8,0 kW · 798x880x310 · R32' },
    { manufacturer: 'Samsung', series: 'Free Joint Multi', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Samsung AJ080TXJ4KG/EU (4 IE)', articleNumber: 'AJ080TXJ4KG/EU', size: '8,0', sellingPrice: 4494, notes: 'max 4 Innengeräte · 8,0/9,3 kW · 798x880x310 · R32' },
    { manufacturer: 'Samsung', series: 'Free Joint Multi', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Samsung AJ100TXJ5KG/EU (5 IE)', articleNumber: 'AJ100TXJ5KG/EU', size: '10,0', sellingPrice: 5533, notes: 'max 5 Innengeräte · 10,0/12,0 kW · 998x940x330 · R32' },
    { manufacturer: 'Samsung', series: 'Free Joint Multi', category: 'Zubehör', bauart: 'Zubehör', name: 'Samsung MIH-H04EN Smart Things WLAN-Steuerung', articleNumber: 'MIH-H04EN', size: '', sellingPrice: 461, notes: 'Smart Things WLAN-Steuerung' },

    // ===== DAIKIN Perfera – Multisplit Innengeräte (Wandgerät) =====
    { manufacturer: 'Daikin', series: 'Perfera', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Daikin Perfera CTXM15A', articleNumber: 'CTXM15A', size: '1,5', sellingPrice: 636, notes: 'Wandgerät · Kühlen 1,5 / Heizen 2,0 kW · 298x804x252' },
    { manufacturer: 'Daikin', series: 'Perfera', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Daikin Perfera FTXM20A', articleNumber: 'FTXM20A', size: '2,0', sellingPrice: 651, notes: 'Wandgerät · Kühlen 2,0 / Heizen 2,5 kW' },
    { manufacturer: 'Daikin', series: 'Perfera', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Daikin Perfera FTXM25A', articleNumber: 'FTXM25A', size: '2,5', sellingPrice: 709, notes: 'Wandgerät · Kühlen 2,5 / Heizen 2,8 kW' },
    { manufacturer: 'Daikin', series: 'Perfera', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Daikin Perfera FTXM35A', articleNumber: 'FTXM35A', size: '3,4', sellingPrice: 841, notes: 'Wandgerät · Kühlen 3,4 / Heizen 4,0 kW' },
    { manufacturer: 'Daikin', series: 'Perfera', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Daikin Perfera FTXM42A', articleNumber: 'FTXM42A', size: '4,2', sellingPrice: 977, notes: 'Wandgerät · Kühlen 4,2 / Heizen 5,4 kW' },
    { manufacturer: 'Daikin', series: 'Perfera', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Daikin Perfera FTXM50A', articleNumber: 'FTXM50A', size: '5,0', sellingPrice: 1101, notes: 'Wandgerät · Kühlen 5,0 / Heizen 5,8 kW' },
    { manufacturer: 'Daikin', series: 'Perfera', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Daikin Perfera FTXM60A', articleNumber: 'FTXM60A', size: '6,0', sellingPrice: 1281, notes: 'Wandgerät · Kühlen 6,0 / Heizen 7,0 kW · 299x998x292' },
    { manufacturer: 'Daikin', series: 'Perfera', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Daikin Perfera FTXM71A', articleNumber: 'FTXM71A', size: '7,1', sellingPrice: 1400, notes: 'Wandgerät · Kühlen 7,1 / Heizen 8,2 kW' },

    // ===== DAIKIN Perfera – Truhengerät =====
    { manufacturer: 'Daikin', series: 'Perfera Truhengerät', category: 'Klimageräte', bauart: 'Truhengerät', name: 'Daikin Perfera CVXM20B', articleNumber: 'CVXM20B', size: '2,0', sellingPrice: 1052, notes: 'Truhengerät · Kühlen 2,0 / Heizen 3,0 kW · 600x750x238' },
    { manufacturer: 'Daikin', series: 'Perfera Truhengerät', category: 'Klimageräte', bauart: 'Truhengerät', name: 'Daikin Perfera FVXM25B', articleNumber: 'FVXM25B', size: '2,4', sellingPrice: 1075, notes: 'Truhengerät · Kühlen 2,4 / Heizen 3,4 kW' },
    { manufacturer: 'Daikin', series: 'Perfera Truhengerät', category: 'Klimageräte', bauart: 'Truhengerät', name: 'Daikin Perfera FVXM35B', articleNumber: 'FVXM35B', size: '3,4', sellingPrice: 1076, notes: 'Truhengerät · Kühlen 3,4 / Heizen 4,5 kW' },
    { manufacturer: 'Daikin', series: 'Perfera Truhengerät', category: 'Klimageräte', bauart: 'Truhengerät', name: 'Daikin Perfera FVXM50B', articleNumber: 'FVXM50B', size: '5,0', sellingPrice: 1238, notes: 'Truhengerät · Kühlen 5,0 / Heizen 5,8 kW' },
    { manufacturer: 'Daikin', series: 'Perfera Truhengerät', category: 'Zubehör', bauart: 'Zubehör', name: 'Daikin EXFS21 Kabeladapter', articleNumber: 'EXFS21', size: '', sellingPrice: 0, notes: 'Kabeladapter (erforderlich für S21 Verbindung)' },

    // ===== DAIKIN Sensira – Single-Split (S.37) Innen + Außen =====
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Sensira FTXF20F', articleNumber: 'FTXF20F', size: '2,0', sellingPrice: 340, notes: 'Kühlen 2,0 / Heizen 2,4 kW · SEER 6,5 · R32 · Setpreis m. RXF20F 1.027,–' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Sensira RXF20F', articleNumber: 'RXF20F', size: '2,0', sellingPrice: 687, notes: 'Außeneinheit · 556x740x343 · 24 kg' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Sensira FTXF25F', articleNumber: 'FTXF25F', size: '2,5', sellingPrice: 374, notes: 'Kühlen 2,5 / Heizen 2,8 kW · R32 · Setpreis 1.130,–' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Sensira RXF25F', articleNumber: 'RXF25F', size: '2,5', sellingPrice: 756, notes: 'Außeneinheit · 556x740x343 · 24 kg' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Sensira FTXF35F', articleNumber: 'FTXF35F', size: '3,3', sellingPrice: 440, notes: 'Kühlen 3,3 / Heizen 3,5 kW · R32 · Setpreis 1.330,–' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Sensira RXF35F', articleNumber: 'RXF35F', size: '3,3', sellingPrice: 890, notes: 'Außeneinheit · 556x740x343 · 24 kg' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Sensira FTXF42F', articleNumber: 'FTXF42F', size: '4,2', sellingPrice: 528, notes: 'Kühlen 4,2 / Heizen 4,6 kW · R32 · Setpreis 1.595,–' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Sensira RXF42F', articleNumber: 'RXF42F', size: '4,2', sellingPrice: 1067, notes: 'Außeneinheit · 556x740x343 · 28 kg' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Sensira FTXF50F', articleNumber: 'FTXF50F', size: '5,0', sellingPrice: 573, notes: 'Kühlen 5,0 / Heizen 6,0 kW · R32 · Setpreis 1.712,–' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Sensira RXF50F', articleNumber: 'RXF50F', size: '5,0', sellingPrice: 1139, notes: 'Außeneinheit · 734x870x373 · 46 kg' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Sensira FTXF60F', articleNumber: 'FTXF60F', size: '6,0', sellingPrice: 721, notes: 'Kühlen 6,0 / Heizen 6,4 kW · R32 · Setpreis 2.151,–' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Sensira RXF60D9', articleNumber: 'RXF60D9', size: '6,0', sellingPrice: 1430, notes: 'Außeneinheit · 734x870x373 · 50 kg' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Sensira FTXF71F', articleNumber: 'FTXF71F', size: '7,1', sellingPrice: 867, notes: 'Kühlen 7,1 / Heizen 8,2 kW · R32 · Setpreis 2.582,–' },
    { manufacturer: 'Daikin', series: 'Sensira', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Sensira RXF71D9', articleNumber: 'RXF71D9', size: '7,1', sellingPrice: 1715, notes: 'Außeneinheit · 734x870x373 · 50 kg' },

    // ===== DAIKIN Comfora – Single-Split (S.36) Innen + Außen =====
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Comfora FTXP20N9', articleNumber: 'FTXP20N9', size: '2,0', sellingPrice: 340, notes: 'Kühlen 2,0 / Heizen 2,6 kW · R32 · Setpreis 1.028,–' },
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Comfora RXP20N9', articleNumber: 'RXP20N9', size: '2,0', sellingPrice: 688, notes: 'Außeneinheit · 556x740x343 · 24 kg' },
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Comfora FTXP25N9', articleNumber: 'FTXP25N9', size: '2,5', sellingPrice: 374, notes: 'Kühlen 2,5 / Heizen 3,0 kW · R32 · Setpreis 1.130,–' },
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Comfora RXP25N9', articleNumber: 'RXP25N9', size: '2,5', sellingPrice: 756, notes: 'Außeneinheit · 556x740x343 · 24 kg' },
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Comfora FTXP35N9', articleNumber: 'FTXP35N9', size: '3,5', sellingPrice: 440, notes: 'Kühlen 3,5 / Heizen 4,0 kW · R32 · Setpreis 1.330,–' },
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Comfora RXP35N9', articleNumber: 'RXP35N9', size: '3,5', sellingPrice: 890, notes: 'Außeneinheit · 556x740x343 · 24 kg' },
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Comfora FTXP50N9', articleNumber: 'FTXP50N9', size: '5,0', sellingPrice: 573, notes: 'Kühlen 5,0 / Heizen 6,0 kW · R32 · Setpreis 2.003,–' },
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Comfora RXP50N9', articleNumber: 'RXP50N9', size: '5,0', sellingPrice: 1430, notes: 'Außeneinheit · 610x923x367 · 40 kg' },
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Comfora FTXP60N9', articleNumber: 'FTXP60N9', size: '6,0', sellingPrice: 721, notes: 'Kühlen 6,0 / Heizen 7,0 kW · R32 · Setpreis 2.151,–' },
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Comfora RXP60N9', articleNumber: 'RXP60N9', size: '6,0', sellingPrice: 1430, notes: 'Außeneinheit · 734x954x401 · 46 kg' },
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Daikin Comfora FTXP71N', articleNumber: 'FTXP71N', size: '7,1', sellingPrice: 867, notes: 'Kühlen 7,1 / Heizen 8,2 kW · R32 · Setpreis 2.582,–' },
    { manufacturer: 'Daikin', series: 'Comfora', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin Comfora RXP71N', articleNumber: 'RXP71N', size: '7,1', sellingPrice: 1715, notes: 'Außeneinheit · 734x954x401 · 50 kg' },

    // ===== DAIKIN Perfera Truhengerät Single-Split (S.36) Innen + Außen =====
    { manufacturer: 'Daikin', series: 'Perfera Truhengerät', category: 'Klimageräte', bauart: 'Truhengerät', name: 'Daikin Perfera FVXM25B (Single)', articleNumber: 'FVXM25B-SS', size: '2,4', sellingPrice: 1075, notes: 'Truhengerät Single-Split · Kühlen 2,4 / Heizen 3,4 kW · Setpreis m. RXXM25B 1.763,–' },
    { manufacturer: 'Daikin', series: 'Perfera Truhengerät', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin RXXM25B', articleNumber: 'RXXM25B', size: '2,4', sellingPrice: 688, notes: 'Außeneinheit Truhengerät · 562x840x350 · 24 kg' },
    { manufacturer: 'Daikin', series: 'Perfera Truhengerät', category: 'Klimageräte', bauart: 'Truhengerät', name: 'Daikin Perfera FVXM35B (Single)', articleNumber: 'FVXM35B-SS', size: '3,4', sellingPrice: 1238, notes: 'Truhengerät Single-Split · Kühlen 3,4 / Heizen 4,5 kW · Setpreis 2.031,–' },
    { manufacturer: 'Daikin', series: 'Perfera Truhengerät', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin RXXM35B', articleNumber: 'RXXM35B', size: '3,4', sellingPrice: 793, notes: 'Außeneinheit Truhengerät · 562x840x350 · 25 kg' },
    { manufacturer: 'Daikin', series: 'Perfera Truhengerät', category: 'Klimageräte', bauart: 'Truhengerät', name: 'Daikin Perfera FVXM50B (Single)', articleNumber: 'FVXM50B-SS', size: '5,0', sellingPrice: 1680, notes: 'Truhengerät Single-Split · Kühlen 5,0 / Heizen 5,8 kW · Setpreis 2.585,–' },
    { manufacturer: 'Daikin', series: 'Perfera Truhengerät', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Daikin RXXM50B', articleNumber: 'RXXM50B', size: '5,0', sellingPrice: 1905, notes: 'Außeneinheit Truhengerät · 734x954x401 · 45 kg' },

    // ===== DAIKIN Multi-Split Außeneinheiten (S. MXM) =====
    { manufacturer: 'Daikin', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Daikin 2MXM40A9 (2 IE)', articleNumber: '2MXM40A9', size: '4,0', sellingPrice: 1864, notes: 'max 2 Innengeräte · 4,0/4,2 kW · 552x852x350 · R32' },
    { manufacturer: 'Daikin', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Daikin 2MXM50A8 (2 IE)', articleNumber: '2MXM50A8', size: '5,0', sellingPrice: 2282, notes: 'max 2 Innengeräte · 5,0/5,6 kW · 552x852x350 · R32' },
    { manufacturer: 'Daikin', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Daikin 2MXM68A8 (2 IE)', articleNumber: '2MXM68A8', size: '6,8', sellingPrice: 2931, notes: 'max 2 Innengeräte · 6,8/8,6 kW · 734x974x408 · R32' },
    { manufacturer: 'Daikin', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Daikin 3MXM40A8 (3 IE)', articleNumber: '3MXM40A8', size: '4,0', sellingPrice: 2185, notes: 'max 3 Innengeräte · 4,0/4,6 kW · 734x974x408 · R32' },
    { manufacturer: 'Daikin', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Daikin 3MXM52A8 (3 IE)', articleNumber: '3MXM52A8', size: '5,2', sellingPrice: 2427, notes: 'max 3 Innengeräte · 5,2/6,8 kW · 734x974x408 · R32' },
    { manufacturer: 'Daikin', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Daikin 3MXM68A8 (3 IE)', articleNumber: '3MXM68A8', size: '6,8', sellingPrice: 2989, notes: 'max 3 Innengeräte · 6,8/8,6 kW · 734x974x408 · R32' },
    { manufacturer: 'Daikin', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Daikin 4MXM68A8 (4 IE)', articleNumber: '4MXM68A8', size: '6,8', sellingPrice: 3173, notes: 'max 4 Innengeräte · 6,8/8,6 kW · 734x974x408 · R32' },
    { manufacturer: 'Daikin', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Daikin 4MXM80A8 (4 IE)', articleNumber: '4MXM80A8', size: '8,0', sellingPrice: 3729, notes: 'max 4 Innengeräte · 8,0/9,6 kW · 734x974x408 · R32' },
    { manufacturer: 'Daikin', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Daikin 5MXM90A8 (5 IE)', articleNumber: '5MXM90A8', size: '9,0', sellingPrice: 4106, notes: 'max 5 Innengeräte · 9,0/10,0 kW · 734x974x408 · R32' },

    // ===== LG Standard Plus – Multi-Split Innengeräte (S.22) =====
    { manufacturer: 'LG', series: 'Standard Plus', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'LG Standard Plus PM05SK.NSA', articleNumber: 'PM05SK.NSA', size: '1,5', sellingPrice: 506, notes: 'Multi Innengerät · 1,5/1,6 kW · R32 · ohne Plasmaster Ionizer' },
    { manufacturer: 'LG', series: 'Standard Plus', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'LG Standard Plus PM07SK.NSA', articleNumber: 'PM07SK.NSA', size: '2,1', sellingPrice: 556, notes: 'Multi Innengerät · 2,1/2,3 kW · R32' },
    { manufacturer: 'LG', series: 'Standard Plus', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'LG Standard Plus PZ09EYN.CSJI', articleNumber: 'PZ09EYN.CSJI', size: '2,5', sellingPrice: 597, notes: 'Multi Innengerät · 2,5/3,2 kW · R32' },
    { manufacturer: 'LG', series: 'Standard Plus', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'LG Standard Plus PZ12EYN.CSJI', articleNumber: 'PZ12EYN.CSJI', size: '3,5', sellingPrice: 639, notes: 'Multi Innengerät · 3,5/3,8 kW · R32' },
    { manufacturer: 'LG', series: 'Standard Plus', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'LG Standard Plus PM15SK.NSJ', articleNumber: 'PM15SK.NSJ', size: '4,2', sellingPrice: 669, notes: 'Multi Innengerät · 4,2/5,4 kW · R32' },
    { manufacturer: 'LG', series: 'Standard Plus', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'LG Standard Plus PZ18EYN.CSK1', articleNumber: 'PZ18EYN.CSK1', size: '5,0', sellingPrice: 700, notes: 'Multi Innengerät · 5,0/5,8 kW · R32' },
    { manufacturer: 'LG', series: 'Standard Plus', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'LG Standard Plus PZ24EYN.CSK1', articleNumber: 'PZ24EYN.CSK1', size: '6,6', sellingPrice: 797, notes: 'Multi Innengerät · 6,6/7,5 kW · R32' },

    // ===== LG Standard II – Multi-Split Innengeräte (S.22) =====
    { manufacturer: 'LG', series: 'Standard II', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'LG Standard II EZ09CYN.CSJI', articleNumber: 'EZ09CYN.CSJI', size: '2,5', sellingPrice: 436, notes: 'Multi Innengerät · 2,5/3,3 kW · R32' },
    { manufacturer: 'LG', series: 'Standard II', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'LG Standard II EZ12CYN.CSJI', articleNumber: 'EZ12CYN.CSJI', size: '3,5', sellingPrice: 479, notes: 'Multi Innengerät · 3,5/4,0 kW · R32' },
    { manufacturer: 'LG', series: 'Standard II', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'LG Standard II EZ18CYN.CSK1', articleNumber: 'EZ18CYN.CSK1', size: '5,0', sellingPrice: 589, notes: 'Multi Innengerät · 5,0/5,8 kW · R32' },
    { manufacturer: 'LG', series: 'Standard II', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'LG Standard II EZ24CYN.CSK1', articleNumber: 'EZ24CYN.CSK1', size: '6,6', sellingPrice: 700, notes: 'Multi Innengerät · 6,6/7,5 kW · R32' },

    // ===== LG Single-Split Sets (Standard Plus PZ...EYU / Standard II EZ...CYU) =====
    { manufacturer: 'LG', series: 'Standard Plus (Set)', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'LG Set PZ09EYN.CSJI Innen', articleNumber: 'PZ09EYN.CSJI-SET', size: '2,5', sellingPrice: 597, notes: 'Single-Set · 2,5/2,8 kW · Setpreis m. PZ09EYU.CA3I 1.448,–' },
    { manufacturer: 'LG', series: 'Standard Plus (Set)', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'LG PZ09EYU.CA3I Außen', articleNumber: 'PZ09EYU.CA3I', size: '2,5', sellingPrice: 852, notes: 'Außeneinheit · 495x717x230 · 25,1 kg' },
    { manufacturer: 'LG', series: 'Standard Plus (Set)', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'LG PZ12EYU.CA3I Außen', articleNumber: 'PZ12EYU.CA3I', size: '3,5', sellingPrice: 960, notes: 'Außeneinheit · 495x717x230 · 25,1 kg · Setpreis 1.599,–' },
    { manufacturer: 'LG', series: 'Standard Plus (Set)', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'LG PZ18EYU.CL2I Außen', articleNumber: 'PZ18EYU.CL2I', size: '5,0', sellingPrice: 1189, notes: 'Außeneinheit · 545x770x288 · Setpreis 1.888,–' },
    { manufacturer: 'LG', series: 'Standard Plus (Set)', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'LG PZ24EYU.C24I Außen', articleNumber: 'PZ24EYU.C24I', size: '6,6', sellingPrice: 1310, notes: 'Außeneinheit · 650x870x330 · Setpreis 2.107,–' },
    { manufacturer: 'LG', series: 'Standard II (Set)', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'LG EZ09CYU.CA3I Außen', articleNumber: 'EZ09CYU.CA3I', size: '2,5', sellingPrice: 755, notes: 'Außeneinheit · 495x717x230 · Setpreis 1.191,–' },
    { manufacturer: 'LG', series: 'Standard II (Set)', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'LG EZ12CYU.CA3I Außen', articleNumber: 'EZ12CYU.CA3I', size: '3,5', sellingPrice: 816, notes: 'Außeneinheit · 495x717x230 · Setpreis 1.295,–' },
    { manufacturer: 'LG', series: 'Standard II (Set)', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'LG EZ18CYU.CL2I Außen', articleNumber: 'EZ18CYU.CL2I', size: '5,0', sellingPrice: 943, notes: 'Außeneinheit · 545x770x288 · Setpreis 1.532,–' },
    { manufacturer: 'LG', series: 'Standard II (Set)', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'LG EZ24CYU.C24I Außen', articleNumber: 'EZ24CYU.C24I', size: '6,6', sellingPrice: 1134, notes: 'Außeneinheit · 650x870x330 · Setpreis 1.834,–' },

    // ===== LG Multi-Split Außeneinheiten mit Einzelverrohrung (R32) =====
    { manufacturer: 'LG', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'LG MU2R15.UL3 (2 IE)', articleNumber: 'MU2R15.UL3', size: '4,1', sellingPrice: 1900, notes: 'max 2 IE · 4,1/4,7 kW · A+++/A+ · 545x770x288 · R32' },
    { manufacturer: 'LG', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'LG MU2R17.UL3 (2 IE)', articleNumber: 'MU2R17.UL3', size: '4,7', sellingPrice: 2090, notes: 'max 2 IE · 4,7/5,3 kW · 545x770x288 · R32' },
    { manufacturer: 'LG', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'LG MU3R19.U23 (3 IE)', articleNumber: 'MU3R19.U23', size: '5,3', sellingPrice: 2231, notes: 'max 3 IE · 5,3/6,3 kW · 650x870x330 · R32' },
    { manufacturer: 'LG', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'LG MU3R21.U23 (3 IE)', articleNumber: 'MU3R21.U23', size: '6,2', sellingPrice: 2723, notes: 'max 3 IE · 6,2/7,0 kW · 650x870x330 · R32' },
    { manufacturer: 'LG', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'LG MU4R25.U22 (4 IE)', articleNumber: 'MU4R25.U22', size: '7,0', sellingPrice: 3338, notes: 'max 4 IE · 7,0/8,1 kW · 650x870x330 · R32' },
    { manufacturer: 'LG', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'LG MU5R30.U36A0 (5 IE)', articleNumber: 'MU5R30.U36A0', size: '8,8', sellingPrice: 3678, notes: 'max 5 IE · 8,8/10,1 kW · 834x950x330 · R32' },
    { manufacturer: 'LG', series: 'Multi Split', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'LG MU5R40.U36A0 (5 IE)', articleNumber: 'MU5R40.U36A0', size: '11,2', sellingPrice: 5882, notes: 'max 5 IE · 11,2/12,5 kW · 834x950x330 · R32' },

    // ===== LG Multi-Split Außeneinheiten mit Verteilerbox (R410A, FM-Serie) =====
    { manufacturer: 'LG', series: 'Multi Split FM', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'LG FM14AH.U5A (7 IE)', articleNumber: 'FM14AH.U5A', size: '12,3', sellingPrice: 6318, notes: 'max 7 IE · 12,3/13,5 kW · 1380x950x330 · R410A' },
    { manufacturer: 'LG', series: 'Multi Split FM', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'LG FM16AH.U5A (8 IE)', articleNumber: 'FM16AH.U5A', size: '14,1', sellingPrice: 8023, notes: 'max 8 IE · 14,1/16,0 kW · R410A' },
    { manufacturer: 'LG', series: 'Multi Split FM', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'LG FM57AH.U5A (9 IE)', articleNumber: 'FM57AH.U5A', size: '15,5', sellingPrice: 8885, notes: 'max 9 IE · 15,5/17,4 kW · R410A' },

    // ===== LG Verteilerboxen / Y-Verteiler (FM-Serie) =====
    { manufacturer: 'LG', series: 'Verteiler', category: 'Zubehör', bauart: 'Zubehör', name: 'LG PMBD3620 Verteilerbox 2 IE', articleNumber: 'PMBD3620', size: '', sellingPrice: 401, notes: 'Verteilung an 2 Innengeräte · Bördelanschlüsse · 143x302x252' },
    { manufacturer: 'LG', series: 'Verteiler', category: 'Zubehör', bauart: 'Zubehör', name: 'LG PMBD3630 Verteilerbox 3 IE', articleNumber: 'PMBD3630', size: '', sellingPrice: 494, notes: 'Verteilung an 3 Innengeräte · Bördelanschlüsse' },
    { manufacturer: 'LG', series: 'Verteiler', category: 'Zubehör', bauart: 'Zubehör', name: 'LG PMBD3640 Verteilerbox 4 IE', articleNumber: 'PMBD3640', size: '', sellingPrice: 583, notes: 'Verteilung an 4 Innengeräte · Bördelanschlüsse' },
    { manufacturer: 'LG', series: 'Verteiler', category: 'Zubehör', bauart: 'Zubehör', name: 'LG PMBL5620 Y-Verteiler 2 IE', articleNumber: 'PMBL5620', size: '', sellingPrice: 93, notes: 'Y-Verteiler für 2 Innengeräte' },

    // ===== LG Single-Split Zubehör =====
    { manufacturer: 'LG', series: 'Zubehör', category: 'Zubehör', bauart: 'Zubehör', name: 'LG PREMTA000 Fernbedienung', articleNumber: 'PREMTA000', size: '', sellingPrice: 0, notes: 'Zubehör Single-Split' },
    { manufacturer: 'LG', series: 'Zubehör', category: 'Zubehör', bauart: 'Zubehör', name: 'LG PREMTB100', articleNumber: 'PREMTB100', size: '', sellingPrice: 0, notes: 'Zubehör Single-Split' },
    { manufacturer: 'LG', series: 'Zubehör', category: 'Zubehör', bauart: 'Zubehör', name: 'LG PREMTBB10', articleNumber: 'PREMTBB10', size: '', sellingPrice: 0, notes: 'Zubehör Single-Split' },
    { manufacturer: 'LG', series: 'Zubehör', category: 'Zubehör', bauart: 'Zubehör', name: 'LG Papibox Unterputzbox', articleNumber: '106036', size: '', sellingPrice: 0, notes: 'Unterputzbox Papibox · abnehmbare Flüssigkeits-Installation' },
    { manufacturer: 'LG', series: 'Zubehör', category: 'Zubehör', bauart: 'Zubehör', name: 'LG PVC Kondensatschlauch 16/18', articleNumber: '118237', size: '16/18', sellingPrice: 0, notes: 'Weißer PVC-Kondensatschlauch, glatte Innenseite' },
    { manufacturer: 'LG', series: 'Zubehör', category: 'Zubehör', bauart: 'Zubehör', name: 'LG PVC Kondensatschlauch 18/20', articleNumber: '118238', size: '18/20', sellingPrice: 0, notes: 'Weißer PVC-Kondensatschlauch' },
    { manufacturer: 'LG', series: 'Zubehör', category: 'Zubehör', bauart: 'Zubehör', name: 'LG PVC Kondensatschlauch 20/22', articleNumber: '118239', size: '20/22', sellingPrice: 0, notes: 'Weißer PVC-Kondensatschlauch' },

    // ===== HISENSE Uni Pure – Single-Split (S.6) Innen + Außen =====
    { manufacturer: 'Hisense', series: 'Uni Pure', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Hisense Uni Pure H25SXV0A0G', articleNumber: 'H25SXV0A0G', size: '2,6', sellingPrice: 340, notes: 'Kühlen 2,6 / Heizen 3,0 kW · SEER 8,5 · R32 · Setpreis 1.180,–' },
    { manufacturer: 'Hisense', series: 'Uni Pure', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Hisense Uni Pure AS25SXV0EW', articleNumber: 'AS25SXV0EW', size: '2,6', sellingPrice: 0, notes: 'Außeneinheit · 9,5 kg' },
    { manufacturer: 'Hisense', series: 'Uni Pure', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Hisense Uni Pure H35SXV0A0G', articleNumber: 'H35SXV0A0G', size: '3,5', sellingPrice: 392, notes: 'Kühlen 3,5 / Heizen 3,8 kW · R32 · Setpreis 1.290,–' },
    { manufacturer: 'Hisense', series: 'Uni Pure', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Hisense Uni Pure AS35XV0EW', articleNumber: 'AS35XV0EW', size: '3,5', sellingPrice: 0, notes: 'Außeneinheit · 10 kg' },
    { manufacturer: 'Hisense', series: 'Uni Pure', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Hisense Uni Pure H50XP0A0G', articleNumber: 'H50XP0A0G', size: '5,0', sellingPrice: 568, notes: 'Kühlen 5,0 / Heizen 5,4 kW · R32 · Setpreis 1.802,–' },
    { manufacturer: 'Hisense', series: 'Uni Pure', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Hisense Uni Pure AS50XP0EW', articleNumber: 'AS50XP0EW', size: '5,0', sellingPrice: 0, notes: 'Außeneinheit · 12 kg' },
    { manufacturer: 'Hisense', series: 'Uni Pure', category: 'Klimageräte', bauart: 'Innengerät Single-Split', name: 'Hisense Uni Pure H70XW0A0G', articleNumber: 'H70XW0A0G', size: '7,0', sellingPrice: 698, notes: 'Kühlen 7,0 / Heizen 6,8 kW · R32 · Setpreis 1.998,–' },
    { manufacturer: 'Hisense', series: 'Uni Pure', category: 'Klimageräte', bauart: 'Außengerät Single-Split', name: 'Hisense Uni Pure AS70XW0EW', articleNumber: 'AS70XW0EW', size: '7,0', sellingPrice: 0, notes: 'Außeneinheit · 15 kg' },

    // ===== HISENSE Uni Pure – Multi-Split Innengeräte (S.7) =====
    { manufacturer: 'Hisense', series: 'Uni Pure (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Hisense HB25XU0AG', articleNumber: 'HB25XU0AG', size: '2,6', sellingPrice: 340, notes: 'Multi Innengerät · 2,6/3,0 kW · R32 · 291x880x220' },
    { manufacturer: 'Hisense', series: 'Uni Pure (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Hisense HB35XU0AG', articleNumber: 'HB35XU0AG', size: '3,5', sellingPrice: 382, notes: 'Multi Innengerät · 3,5/3,8 kW · R32' },
    { manufacturer: 'Hisense', series: 'Uni Pure (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Hisense HB50XP0AG', articleNumber: 'HB50XP0AG', size: '5,0', sellingPrice: 568, notes: 'Multi Innengerät · 5,0/5,4 kW · R32' },
    { manufacturer: 'Hisense', series: 'Uni Pure (Multi)', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Hisense HB70XW0AG', articleNumber: 'HB70XW0AG', size: '7,0', sellingPrice: 698, notes: 'Multi Innengerät · 7,0/6,8 kW · R32 · 327x1100x249' },

    // ===== HISENSE Freematch Multi-Split Außeneinheiten (S.7) =====
    { manufacturer: 'Hisense', series: 'Freematch', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Hisense 2AMW52U4RGC (2 IE)', articleNumber: '2AMW52U4RGC', size: '5,4', sellingPrice: 1930, notes: 'max 2 IE · 5,4/6,1 kW · 540x760x280 · R32' },
    { manufacturer: 'Hisense', series: 'Freematch', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Hisense 3AMW72U4RJC (3 IE)', articleNumber: '3AMW72U4RJC', size: '7,9', sellingPrice: 2380, notes: 'max 3 IE · 7,9/8,0 kW · 560x860x310 · R32' },
    { manufacturer: 'Hisense', series: 'Freematch', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Hisense 4AMW81U4RJC (4 IE)', articleNumber: '4AMW81U4RJC', size: '8,0', sellingPrice: 2850, notes: 'max 4 IE · 8,0/8,0 kW · 870x860x310 · R32' },
    { manufacturer: 'Hisense', series: 'Freematch', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Hisense 5AMW105U4RQC (5 IE)', articleNumber: '5AMW105U4RQC', size: '10,0', sellingPrice: 3490, notes: 'max 5 IE · 10,0/10,0 kW · 885x970x370 · R32' },

    // ===== SUMO Standfüße (Zubehör, S.37) =====
    { manufacturer: 'SUMO', series: 'LC Standfuß', category: 'Zubehör', bauart: 'Zubehör', name: 'SUMO LC Standfuß 450', articleNumber: '108333', size: '450 mm', sellingPrice: 25.05, notes: 'mit 40mm Alu-Profil · max 180 kg · 90x450x160 · inkl. Edelstahlschrauben + Wasserwaage' },
    { manufacturer: 'SUMO', series: 'LC Standfuß', category: 'Zubehör', bauart: 'Zubehör', name: 'SUMO LC Standfuß 600', articleNumber: '108334', size: '600 mm', sellingPrice: 38.29, notes: 'mit 40mm Alu-Profil · max 200 kg · 90x600x160' },
    { manufacturer: 'SUMO', series: 'LC Standfuß', category: 'Zubehör', bauart: 'Zubehör', name: 'SUMO LC Standfuß 1000', articleNumber: '108335', size: '1000 mm', sellingPrice: 46.69, notes: 'mit 40mm Alu-Profil · max 220 kg · 90x1000x160' },

    // ===== BOSCH Climate 3000i – komplette Single-Split-Sets (ESNO-Preisliste 2026) =====
    // Bosch verkauft Single-Split laut dieser Preisliste NUR als fertiges Set (1 Bestell-Nr.,
    // 1 Preis für Wandgerät+Außengerät+Fernbedienung) - ein separater Außengerät-Einzelpreis
    // wird vom Hersteller/Distributor nicht ausgewiesen. Um keine erfundenen Preise in die
    // Datenbank zu schreiben, bleibt das Set EIN Datensatz (bauart 'Klimaset', wie im Bosch-
    // Datenblatt selbst als "Bauform: Klimaset" bezeichnet) statt es künstlich in Innen-/
    // Außengerät aufzuteilen.
    { manufacturer: 'Bosch', series: 'Climate 3000i (Set)', category: 'Klimageräte', bauart: 'Klimaset', name: 'Bosch Climate 3000i Split-Set 2,6 kW (CL3000i)', articleNumber: 'A00.7029', size: '2,6', sellingPrice: 1228.92, notes: 'Komplett-Set: Wandgerät + Außengerät + Fernbedienung · Kühlen 2,60 / Heizen 2,90 kW · A++ (Kühlen) / A+ (Heizen) · R32 0,6 kg · max. Leitungslänge 25 m · Außeneinheit 790x495x270 mm 23,5 kg · Inneneinheit 729x292x200 mm 8,0 kg · Außengerät bei Bosch nicht separat erhältlich (nur im Set)' },
    { manufacturer: 'Bosch', series: 'Climate 3000i (Set)', category: 'Klimageräte', bauart: 'Klimaset', name: 'Bosch Climate 3000i Split-Set 3,5 kW (CL3000i)', articleNumber: 'A00.7030', size: '3,5', sellingPrice: 1451.16, notes: 'Komplett-Set: Wandgerät + Außengerät + Fernbedienung · Kühlen 3,50 / Heizen 3,80 kW · A++ (Kühlen) / A+ (Heizen) · R32 0,65 kg · max. Leitungslänge 25 m · Außeneinheit 790x495x270 mm 23,7 kg · Inneneinheit 802x295x200 mm 8,7 kg · Außengerät bei Bosch nicht separat erhältlich (nur im Set)' },
    { manufacturer: 'Bosch', series: 'Climate 3000i (Set)', category: 'Klimageräte', bauart: 'Klimaset', name: 'Bosch Climate 3000i Split-Set 5,3 kW (CL3000i)', articleNumber: 'A00.7031', size: '5,3', sellingPrice: 1857.12, notes: 'Komplett-Set: Wandgerät + Außengerät + Fernbedienung · Kühlen 5,30 / Heizen 5,60 kW · A++ (Kühlen) / A+ (Heizen) · R32 1,1 kg · max. Leitungslänge 30 m · Außeneinheit 874x554x330 mm 33,5 kg · Inneneinheit 971x321x228 mm 11,2 kg · Außengerät bei Bosch nicht separat erhältlich (nur im Set)' },

    // ===== BOSCH Climate 3000iU – Wandgeräte, standalone für Mono-/Multi-Außengeräte =====
    // Dieselbe physische Inneneinheit wie in den Sets oben, hier als eigenständiges Bosch-
    // Produkt (eigene Bestell-Nr., eigener Preis) zur freien Kombination mit einem Multi-
    // Außengerät (siehe unten) - deshalb bewusst bauart 'Innengerät Multi-Split', nicht als
    // Duplikat der Set-Zeile gedacht.
    { manufacturer: 'Bosch', series: 'Climate 3000iU', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Bosch Wandgerät CL3000iU W 26 E', articleNumber: '781.0002', size: '2,6', sellingPrice: 374.04, notes: 'Multi-Split-Innengerät (Wandgerät) · für Mono-/Multi-Außeneinheit · Kühlen 2,60 / Heizen 2,90 kW · A++/A+ · R32 · Schalldruck 20/22/37 dB(A) · 729x292x200 mm 8,0 kg' },
    { manufacturer: 'Bosch', series: 'Climate 3000iU', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Bosch Wandgerät CL3000iU W 35 E', articleNumber: '781.0004', size: '3,5', sellingPrice: 425.28, notes: 'Multi-Split-Innengerät (Wandgerät) · für Mono-/Multi-Außeneinheit · Kühlen 3,50 / Heizen 3,80 kW · A++/A+ · R32 · Schalldruck 21/22/37 dB(A) · 802x295x200 mm 8,7 kg' },
    { manufacturer: 'Bosch', series: 'Climate 3000iU', category: 'Klimageräte', bauart: 'Innengerät Multi-Split', name: 'Bosch Wandgerät CL3000iU W 53 E', articleNumber: '781.0006', size: '5,3', sellingPrice: 480.12, notes: 'Multi-Split-Innengerät (Wandgerät) · für Mono-/Multi-Außeneinheit · Kühlen 5,30 / Heizen 5,60 kW · A++/A+ · R32 · Schalldruck 20/31/41 dB(A) · 971x321x228 mm 11,2 kg' },

    // ===== BOSCH Climate 5000 M – Multi-Split-Außengeräte =====
    // "max. N IG" im Notiztext wird von der bestehenden Kombinations-Logik (calcPickOutdoor
    // in 03-pages.js, createOfferVariant in 07-extensions-init.js) bereits per Regex erkannt -
    // keine Code-Änderung nötig, rein durch korrekt formatierte Daten.
    { manufacturer: 'Bosch', series: 'Climate 5000 M', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Bosch Multi-Außengerät CL5000M 53/2 E', articleNumber: '781.3001', size: '5,3', sellingPrice: 1964.06, notes: 'Multi-Split-Außengerät · max. 2 IG (Innengeräte) · Kühlen 5,27 / Heizen 5,57 kW · SEER 6,9 · R32 · 805x554x330 mm 35,0 kg · Schallleistung 65 dB(A)' },
    { manufacturer: 'Bosch', series: 'Climate 5000 M', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Bosch Multi-Außengerät CL5000M 79/3 E', articleNumber: '781.3002', size: '7,9', sellingPrice: 2776.18, notes: 'Multi-Split-Außengerät · max. 3 IG (Innengeräte) · Kühlen 7,90 / Heizen 8,20 kW · SCOP 4,1 · SEER 6,6 · R32 · 890x673x342 mm 48,0 kg · Schallleistung 68 dB(A)' },
    { manufacturer: 'Bosch', series: 'Climate 5000 M', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Bosch Multi-Außengerät CL5000M 105/4 E', articleNumber: '781.3003', size: '10,5', sellingPrice: 3353.21, notes: 'Multi-Split-Außengerät · max. 4 IG (Innengeräte) · Kühlen 10,50 / Heizen 10,50 kW · SCOP 4,0 · SEER 6,5 · R32 · 946x810x410 mm 68,8 kg · Schallleistung 70 dB(A)' },
    { manufacturer: 'Bosch', series: 'Climate 5000 M', category: 'Klimageräte', bauart: 'Außengerät Multi-Split', name: 'Bosch Multi-Außengerät CL5000M 125/5 E', articleNumber: '781.3004', size: '12,3', sellingPrice: 3994.36, notes: 'Multi-Split-Außengerät · max. 5 IG (Innengeräte) · Kühlen 12,30 / Heizen 12,30 kW · SEER 7,0 · R32 · 946x810x410 mm 74,0 kg · Schallleistung 70 dB(A)' },

    // ===== BOSCH Zubehör =====
    { manufacturer: 'Bosch', series: 'Zubehör', category: 'Zubehör', bauart: 'Zubehör', name: 'Bosch Internet-Gateway WLAN Modul IP-Gateway G10-3', articleNumber: '781.5002', size: '', sellingPrice: 147.48, notes: 'WLAN-Modul für App-Steuerung (Bosch HomeCom Easy) der Wandgeräte CL3000i, Deckenkassetten 4CC (zusätzlich G10 CLC nötig) und Konsolengeräte CN · WLAN-Router mit Internetzugang erforderlich' },
];

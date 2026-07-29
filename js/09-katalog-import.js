// ============================================================================
// KTM – Hersteller-Katalog Import (Samsung, Daikin ...)
// ============================================================================
// Fertige Geräte-Daten aus den Herstellerkatalogen. Werden per Knopf in den
// Materialkatalog importiert (Marke, Serie, Modell, Bauart, kW, Preis).
// Preise = Einzelpreis (Verkauf) laut Katalog, kann danach angepasst werden.
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
];

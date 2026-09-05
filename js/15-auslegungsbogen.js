

        // ============================================================
        // ====== TECHNISCHER AUSLEGUNGSBOGEN (PDF) ===================
        // ============================================================
        // Das interne Gegenstueck zum Kundenangebot: enthaelt alles, was zur
        // Auslegung gehoert - auch das Unfertige. Jede Zahl steht mit ihrer
        // Herkunft da, jede Richtwert-Schaetzung wird aufgelistet, jede
        // Warnung uebernommen. Farben kommen wie ueberall aus der Farbwahl.

        Object.assign(app, {

            async exportAuslegungsbogen(projectId) {
                if (typeof window.jspdf === 'undefined') { showToast('PDF-Bibliothek konnte nicht geladen werden.', 'error'); return; }
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) { showToast('Kein Kälteprojekt.', 'error'); return; }
                const customer = project.customerId ? await db.get('customers', project.customerId) : null;

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const co = await pdfCompany();
                const pw = doc.internal.pageSize.getWidth();
                const ph = doc.internal.pageSize.getHeight();
                const mx = 16;

                const A = kaelteAuslegungsdaten(project);
                const a = kaelteAuslegung(project);
                const datum = new Date().toLocaleDateString('de-AT');

                const kopf = () => {
                    doc.setFillColor(...PDF_TEAL);
                    doc.rect(0, 0, pw, 3, 'F');
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...PDF_INK);
                    doc.text('TECHNISCHER AUSLEGUNGSBOGEN', mx, 13);
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...PDF_GRAY);
                    doc.text(datum, pw - mx, 13, { align: 'right' });
                    doc.setDrawColor(...PDF_LINE); doc.setLineWidth(0.2);
                    doc.line(mx, 17, pw - mx, 17);
                };
                const titel = (y, t) => {
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...PDF_TEAL);
                    doc.text(t.toUpperCase(), mx, y, { charSpace: 0.5 });
                    doc.setDrawColor(...PDF_TEAL); doc.setLineWidth(0.4);
                    doc.line(mx, y + 1.8, pw - mx, y + 1.8);
                    return y + 7;
                };
                const platz = (y, brauche) => {
                    if (y + brauche > ph - 20) { doc.addPage(); kopf(); return 26; }
                    return y;
                };
                const tabelle = (y, head, body, spalten, extra) => {
                    doc.autoTable({
                        startY: y, margin: { left: mx, right: mx, top: 26, bottom: 18 },
                        head: [head], body, theme: 'plain',
                        styles: { font: 'helvetica', fontSize: 8, cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 }, textColor: PDF_INK, lineColor: PDF_LINE, lineWidth: 0.1 },
                        headStyles: { fillColor: PDF_TEAL, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
                        columnStyles: spalten || {},
                        didDrawPage: () => { if (doc.internal.getCurrentPageInfo().pageNumber > 1) kopf(); },
                        ...(extra || {})
                    });
                    return doc.lastAutoTable.finalY + 8;
                };
                // Verhindert "verwaiste" Ueberschriften am Seitenende (Punkt 45):
                // reserviert etwas Platz fuer die naechste Tabelle, BEVOR eine
                // Ueberschrift gesetzt wird. Reicht der Rest der Seite nicht,
                // wird vorher umgebrochen statt die Ueberschrift alleine stehen
                // zu lassen.
                const titelMitTabelle = (yy, t, mindestZeilen) => {
                    const brauch = 14 + Math.max(1, mindestZeilen || 1) * 6;
                    yy = platz(yy, brauch);
                    return titel(yy, t);
                };

                kopf();
                let y = 26;

                // --- Projekt ---
                y = titel(y, 'Projekt');
                y = tabelle(y, ['Angabe', 'Wert'], [
                    ['Projekt', project.title || '–'],
                    ['Kunde', customer ? customerDisplayName(customer) : '–'],
                    ['Baustelle', project.siteAddress || project.kaelte.standort || '–'],
                    ['Bearbeiter', project.kaelte.bearbeiter || '–'],
                    ['Projektnummer', project.kaelte.projektnummer || '–'],
                    ['Anlagenart', (KAELTE_ANLAGENARTEN.find(x => x.key === project.kaelte.anlagenart) || {}).label || '–']
                ], { 0: { cellWidth: 46, fontStyle: 'bold' } });

                // --- Auslegungsbedingungen ---
                y = platz(y, 40);
                y = titel(y, 'Auslegungsbedingungen');
                y = tabelle(y, ['Angabe', 'Wert'], [
                    ['Kältemittel', `${A.kaeltemittel}${KAELTEMITTEL[A.kaeltemittel] && KAELTEMITTEL[A.kaeltemittel].blend ? ' (zeotropes Gemisch)' : ''}`],
                    ['Verflüssigungstemperatur', `${A.tVerfluessigung} °C`],
                    ['Sauggasüberhitzung', `${A.ueberhitzung} K`],
                    ['Unterkühlung', `${A.unterkuehlung} K`],
                    ['Umgebung für Dämmung', `${(project.kaelte.auslegung || {}).umgebungT ?? 25} °C / ${(project.kaelte.auslegung || {}).umgebungRH ?? 70} % rF`]
                ], { 0: { cellWidth: 46, fontStyle: 'bold' } });

                // --- Kältelast je Kühlstelle ---
                const alleSchaetzungen = [];
                const alleWarnungen = [];
                for (const e of a.ergebnisse) {
                    y = platz(y, 50);
                    y = titel(y, `Kältelast – ${e.ks.bezeichnung || 'Kühlstelle'}`);
                    if (!e.ergebnis.moeglich) {
                        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...PDF_GRAY);
                        doc.text('Nicht berechenbar – Raummaße, Raumtemperatur oder U-Wert fehlen.', mx, y);
                        y += 10;
                        continue;
                    }
                    const zeilen = e.ergebnis.teile.map(t => [t.name, `${Math.round(t.watt).toLocaleString('de-AT')} W`, t.formel]);
                    zeilen.push(['Zwischensumme', `${Math.round(e.ergebnis.nutzlast).toLocaleString('de-AT')} W`, '']);
                    zeilen.push([`Sicherheitszuschlag ${e.ergebnis.zuschlagProzent} %`, `${Math.round(e.ergebnis.zuschlagWatt).toLocaleString('de-AT')} W`, '']);
                    zeilen.push(['Gesamtkältelast', `${(e.ergebnis.gesamt / 1000).toFixed(2).replace('.', ',')} kW`, '']);
                    zeilen.push(['Erforderliche Anlagenleistung', `${(e.ergebnis.auslegung / 1000).toFixed(2).replace('.', ',')} kW`, `bei ${e.ergebnis.laufzeit} h Laufzeit/Tag`]);
                    y = tabelle(y, ['Lastanteil', 'Wert', 'Rechenweg'], zeilen,
                        { 0: { cellWidth: 48 }, 1: { cellWidth: 26, halign: 'right' }, 2: { fontSize: 7 } });

                    Object.entries(e.werte).forEach(([k, w]) => {
                        if (w.status === 'schaetzung') alleSchaetzungen.push([e.ks.bezeichnung || '–', k, String(w.wert), w.herkunft || '']);
                    });
                    (e.meldungen || []).forEach(m => { if (m.art !== 'pruefen') alleWarnungen.push([e.ks.bezeichnung || '–', m.art === 'fehler' ? 'Fehler' : 'Warnung', m.text]); });
                }

                // --- Kreisprozess und Rohrleitungen ---
                for (const e of a.ergebnisse) {
                    if (!e.ergebnis.moeglich) continue;
                    const tv = e.werte.verdampfungstemperatur.wert;
                    const kp = kaelteKreisprozess({ kaeltemittel: A.kaeltemittel, tVerdampfung: tv,
                        tVerfluessigung: A.tVerfluessigung, ueberhitzung: A.ueberhitzung,
                        unterkuehlung: A.unterkuehlung, kaelteleistungW: e.ergebnis.auslegung });
                    if (!kp.moeglich) continue;

                    y = platz(y, 45);
                    y = titel(y, `Kreisprozess und Leitungen – ${e.ks.bezeichnung || 'Kühlstelle'}`);
                    y = tabelle(y, ['Größe', 'Wert'], [
                        ['Verdampfungstemperatur', `${tv} °C`],
                        ['Verdampfungsdruck', `${kp.pVerdampfung.toFixed(2).replace('.', ',')} bar`],
                        ['Verflüssigungsdruck', `${kp.pVerfluessigung.toFixed(2).replace('.', ',')} bar`],
                        ['Druckverhältnis', kp.druckverhaeltnis.toFixed(2).replace('.', ',')],
                        ['Spez. Kälteleistung q₀', `${kp.q0.toFixed(1).replace('.', ',')} kJ/kg`],
                        ['Massenstrom', `${kp.mDotKgH.toFixed(1).replace('.', ',')} kg/h`]
                    ], { 0: { cellWidth: 52, fontStyle: 'bold' }, 1: { halign: 'right' } });

                    const rohrZeilen = [];
                    ROHR_ARTEN.forEach(art => {
                        const g = (e.ks.rohr || {})[art.key] || {};
                        if (!Number(g.laenge)) return;
                        const geo = { laenge: Number(g.laenge), hoehenunterschied: Number(g.hoehenunterschied) || 0,
                            formstuecke: Object.fromEntries(ROHR_FORMSTUECKE.map(([k]) => [k, Number(g[k]) || 0])) };
                        const aus = kaelteRohrAuswahl(art.key, kp, geo);
                        const z = aus.varianten.find(v => v.rohr.bez === g.gewaehlt) || aus.empfehlung;
                        if (!z) return;
                        rohrZeilen.push([
                            art.label, z.rohr.bez, `${geo.laenge} m`,
                            `${z.w.toFixed(2).replace('.', ',')} m/s`,
                            `${z.dpGesamtBar.toFixed(4).replace('.', ',')} bar`,
                            z.dTverlustK != null ? `${z.dTverlustK.toFixed(2).replace('.', ',')} K` : '–',
                            z.oel ? `${z.oel.wMin.toFixed(1).replace('.', ',')} m/s` : '–'
                        ]);
                    });
                    if (rohrZeilen.length) {
                        y = platz(y, 30);
                        y = tabelle(y, ['Leitung', 'Dimension', 'Länge', 'Strömung', 'Δp', 'ΔT', 'Öl min.'], rohrZeilen,
                            { 0: { cellWidth: 34 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } });
                    }
                }

                // --- Füllmenge ---
                const mat = kaelteMaterialListe(project);
                const km = mat.pos.find(p => p.schluessel === 'kaeltemittel');
                if (km) {
                    y = platz(y, 30);
                    y = titel(y, 'Kältemittelfüllmenge');
                    y = tabelle(y, ['Angabe', 'Wert'], [
                        ['Gesamtfüllmenge', `${String(km.menge).replace('.', ',')} kg ${A.kaeltemittel}`],
                        ['Aufschlüsselung', km.herkunft || '–'],
                        ['Hinweis', km.beschreibung || '–']
                    ], { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { fontSize: 7.5 } });
                }

                // --- Sammlergröße ---
                if (km && Number(km.menge) > 0) {
                    const sa = kaelteSammler({ kaeltemittel: A.kaeltemittel, fuellmengeKg: Number(km.menge),
                        tVerfluessigung: A.tVerfluessigung, tStillstand: A.tVerfluessigung + 10 });
                    if (sa.moeglich) {
                        y = platz(y, 30);
                        y = titel(y, 'Flüssigkeitssammler');
                        y = tabelle(y, ['Angabe', 'Wert'], [
                            ['Abzupumpende Menge', `${sa.abzupumpenKg.toFixed(2).replace('.', ',')} kg`],
                            ['Volumen bei Betriebstemperatur', `${sa.volBetriebL.toFixed(1).replace('.', ',')} l`],
                            ['Kriterium Aufnahme', `${sa.nachAufnahme.toFixed(1).replace('.', ',')} l`],
                            ['Kriterium Ausdehnung', `${sa.nachSicherheit.toFixed(1).replace('.', ',')} l`],
                            ['Erforderlich mindestens', `${sa.erforderlichL.toFixed(1).replace('.', ',')} l`],
                            ['Maßgebend', sa.massgebend]
                        ], { 0: { cellWidth: 58, fontStyle: 'bold' }, 1: { halign: 'right' } });
                    }
                }

                // --- Anlagenschema ---
                // Es wird DASSELBE Schema wie am Bildschirm eingebettet, nur
                // als Rasterbild. Dadurch kann der Plan im PDF nicht von dem
                // in der App abweichen. Die Farben werden vorher durch die
                // Werte der gewaehlten PDF-Palette ersetzt, weil ein aus dem
                // Dokument geloestes SVG keine CSS-Variablen aufloesen kann.
                const stellenPlan = a.ergebnisse.filter(e => e.ergebnis.moeglich);
                if (stellenPlan.length && typeof kaelteSchemaAlsBild === 'function') {
                    const hex = (rgb) => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
                    let bild = null;
                    try {
                        bild = await kaelteSchemaAlsBild(project, {
                            linie: hex(PDF_TEAL), kasten: hex(PDF_LIGHT), rand: hex(PDF_LINE),
                            text: hex(PDF_INK), klein: hex(PDF_GRAY)
                        }, 2400);
                    } catch (e) { console.error('Schema fürs PDF fehlgeschlagen:', e); }

                    if (bild) {
                        // Der Plan bekommt eine eigene Seite im Querformat-
                        // Verhaeltnis der Zeichnung, damit nichts winzig wird.
                        doc.addPage();
                        kopf();
                        let py = titel(26, 'Anlagenschema');
                        const maxB = pw - mx * 2;
                        const maxH = ph - py - 26;
                        let zb = maxB, zh = zb * bild.hoehe / bild.breite;
                        if (zh > maxH) { zh = maxH; zb = zh * bild.breite / bild.hoehe; }
                        doc.addImage(bild.dataUrl, 'PNG', mx + (maxB - zb) / 2, py, zb, zh);
                        py += zh + 6;
                        doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
                        doc.setTextColor(...PDF_GRAY);
                        doc.text('Die Positionsnummern im Schema entsprechen der Reihenfolge der Bauteile im Kältekreis. Betriebsdaten an den Leitungen stammen aus der Rohrberechnung dieses Bogens.', mx, py, { maxWidth: maxB });
                        doc.addPage();
                        kopf();
                        y = 26;
                    } else {
                        y = platz(y, 20);
                        y = titel(y, 'Anlagenschema');
                        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...PDF_GRAY);
                        doc.text('Das Schema konnte in diesem Browser nicht in das PDF übernommen werden. Es steht vollständig im Schritt „Anlage".', mx, y, { maxWidth: pw - mx * 2 });
                        y += 12;
                    }
                }

                // --- Komponenten ---
                // Quelle wird NICHT als lange URL im Text ausgegeben (Punkt 45):
                // eine vollstaendige Artikel-URL sprengt die Tabellenspalte und
                // zerreisst die Zeile. Stattdessen ein kurzes Label ("Quelle ↗"
                // bzw. der Domainname), das - wenn es eine echte URL ist - als
                // klickbarer Link im PDF hinterlegt wird.
                const kurzQuelle = (q) => {
                    if (!q) return { text: '— fehlt —', url: null };
                    const m = /^https?:\/\/([^\/]+)/.exec(q);
                    if (m) {
                        const rest = q.slice(m[0].length);
                        const zusatz = rest.includes('· Stand') ? ' · Stand' + rest.split('· Stand')[1] : '';
                        return { text: (m[1].replace(/^www\./, '') + ' ↗' + zusatz).slice(0, 34), url: q.split(' · ')[0] };
                    }
                    return { text: String(q).slice(0, 34), url: null };
                };
                const komp = project.kaelte.komponenten || [];
                if (komp.length) {
                    y = titelMitTabelle(y, 'Komponenten', komp.length);
                    const kompRows = komp.map(k => {
                        const q = kurzQuelle(k.quelle);
                        const row = [k.typ || '–', [k.hersteller, k.modell].filter(Boolean).join(' ') || '–',
                            k.artikelnummer || '–', k.leistungKW ? `${Number(k.leistungKW).toFixed(2).replace('.', ',')} kW` : '–',
                            q.text];
                        row._quelleUrl = q.url;
                        return row;
                    });
                    y = tabelle(y, ['Typ', 'Hersteller / Modell', 'Art.-Nr.', 'Leistung', 'Quelle'], kompRows,
                        { 3: { halign: 'right' }, 4: { fontSize: 7, textColor: PDF_TEAL } },
                        { didDrawCell: (data) => {
                            if (data.section !== 'body' || data.column.index !== 4) return;
                            const url = kompRows[data.row.index] && kompRows[data.row.index]._quelleUrl;
                            if (url) doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
                        } });
                }

                // --- Warnungen ---
                if (alleWarnungen.length) {
                    y = titelMitTabelle(y, 'Warnungen und Fehler', alleWarnungen.length);
                    y = tabelle(y, ['Kühlstelle', 'Art', 'Meldung'], alleWarnungen,
                        { 0: { cellWidth: 32 }, 1: { cellWidth: 20 }, 2: { fontSize: 7.5 } });
                }

                // --- Richtwert-Schätzungen: bewusst vollstaendig aufgelistet ---
                y = titelMitTabelle(y, 'Verwendete Richtwert-Schätzungen', alleSchaetzungen.length);
                if (alleSchaetzungen.length) {
                    y = tabelle(y, ['Kühlstelle', 'Größe', 'Wert', 'Herkunft'], alleSchaetzungen,
                        { 0: { cellWidth: 30 }, 1: { cellWidth: 38 }, 2: { cellWidth: 20 }, 3: { fontSize: 7 } });
                } else {
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...PDF_GRAY);
                    doc.text('Keine – alle Werte sind eingegeben oder berechnet.', mx, y); y += 10;
                }

                // --- F-Gase-Pflichten ---
                if (km && Number(km.menge) > 0 && typeof kaelteFGase === 'function') {
                    const fg = project.kaelte.fgase || {};
                    const r = kaelteFGase(A.kaeltemittel, Number(km.menge),
                        { hermetisch: !!fg.hermetisch, leckageErkennung: !!fg.les, wohngebaeude: !!fg.wohn });
                    if (r.moeglich) {
                        y = platz(y, 34);
                        y = titel(y, 'F-Gase-Pflichten nach (EU) 2024/573');
                        const zeilen = [
                            ['Kältemittel', A.kaeltemittel],
                            ['Füllmenge', `${Number(km.menge).toFixed(1).replace('.', ',')} kg`],
                            ['GWP (Anhang I prüfen)', String(r.gwp)],
                            ['CO₂-Äquivalent', `${r.co2e.toFixed(1).replace('.', ',')} t`],
                            ['Dichtheitskontrolle', r.intervallMonate ? `alle ${r.intervallMonate} Monate` : 'nicht prüfpflichtig'],
                            ['Leckage-Erkennungssystem', r.lesPflicht ? 'vorgeschrieben (ab 500 t)' : (fg.les ? 'vorhanden' : 'nicht vorgeschrieben')]
                        ];
                        r.pflichten.forEach((x, i) => zeilen.push([i === 0 ? 'Betreiberpflichten' : '', x]));
                        y = tabelle(y, ['Angabe', 'Wert'], zeilen, { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { fontSize: 7.5 } });
                    }
                }

                // --- Herangezogene Regelwerke ---
                const normen = project.kaelte.normen || [];
                if (normen.length) {
                    y = platz(y, 30);
                    y = titel(y, 'Herangezogene Normen und Regelwerke');
                    y = tabelle(y, ['Regelwerk', 'Fassung', 'Betrifft', 'Zuletzt geprüft'],
                        normen.map(n => [n.bezeichnung || '–', n.fassung || '— nicht angegeben —',
                            n.betrifft || '–', n.geprueftAm ? new Date(n.geprueftAm).toLocaleDateString('de-AT') : '— nicht geprüft —']),
                        { 0: { cellWidth: 44, fontStyle: 'bold' }, 1: { cellWidth: 32 }, 3: { cellWidth: 28 } });
                }

                // --- Datenquellen und Vorbehalt ---
                y = platz(y, 46);
                // --- Compliance-Zusammenfassung ---
                if (typeof kaelteComplianceAuswerten === 'function') {
                    const c = kaelteComplianceAuswerten(project);
                    y = titelMitTabelle(y, 'Compliance-Zusammenfassung', c.rules.length + 1);
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...PDF_INK);
                    doc.text(`Regelwerk-Version bei Prüfung: ${c.current_rule_set_version}${c.legal_status !== 'aktuell' ? ' · ' + (c.legal_status_note || '') : ' · unverändert seit Projekterstellung'}`, mx, y, { maxWidth: pw - mx * 2 });
                    y += 8;
                    y = tabelle(y, ['Rule ID', 'Titel', 'Status', 'Begründung'],
                        c.rules.map(r => [r.rule_id, r.title,
                            r.verification_status === 'VERIFIED' ? (COMPLIANCE_STATUS[r.status] || {}).label || r.status : 'nicht verifiziert',
                            r.reason || '']),
                        { 0: { cellWidth: 34, fontSize: 6.5 }, 1: { cellWidth: 46 }, 2: { cellWidth: 34 }, 3: { fontSize: 7 } });
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...PDF_GRAY);
                    const hinweisText = doc.splitTextToSize(c.note, pw - mx * 2);
                    y = platz(y, hinweisText.length * 3.6 + 4);
                    doc.text(hinweisText, mx, y); y += hinweisText.length * 3.6 + 6;
                }

                y = titel(y, 'Datenquellen und Vorbehalt');
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...PDF_INK);
                const quellen = [
                    'Kältemittel-Stoffdaten: CoolProp 8.0.0 (Helmholtz-Zustandsgleichungen), Gemische nach ASHRAE 34, geprüft gegen veröffentlichte Siedepunkte und Temperaturgleit.',
                    'Psychrometrie: Magnus-Formel für Sättigungsdruck, absolute Feuchte und Taupunkt.',
                    'Druckverlust: Darcy-Weisbach mit Rohrreibungszahl nach Colebrook-White, Formstücke als äquivalente Rohrlänge.',
                    'Öltransport: Froude-Kriterium, durchmesserabhängig, kalibriert auf die üblichen Nennwerte (Steigleitung 1500 fpm, waagrecht 700–800 fpm).',
                    'Isolierstärke: Oberflächentemperatur über Taupunkt, Wärmeleitfähigkeit als Katalogwert.',
                    'Richtwerte für Luftwechsel, Beleuchtung, Personenlast und Sicherheitszuschlag: Praxiswerte, im Abschnitt oben einzeln ausgewiesen.'
                ];
                quellen.forEach(q => {
                    const t = doc.splitTextToSize('· ' + q, pw - mx * 2);
                    y = platz(y, t.length * 4 + 3);
                    doc.text(t, mx, y); y += t.length * 4 + 1.6;
                });
                y = platz(y, 24);
                y += 4;
                doc.setFillColor(...PDF_LIGHT);
                const vorbehalt = doc.splitTextToSize('Dieser Bogen dokumentiert eine Vorauslegung. Er bestätigt NICHT, dass die Anlage normgerecht ist. Vor Bestellung und Ausführung sind die Herstellerdatenblätter und die gültigen Vorschriften heranzuziehen. Eine fachliche Prüfung durch den verantwortlichen Techniker ist erforderlich.', pw - mx * 2 - 10);
                doc.roundedRect(mx, y - 4, pw - mx * 2, vorbehalt.length * 4.2 + 9, 2.5, 2.5, 'F');
                doc.setTextColor(...PDF_INK); doc.setFontSize(8.5);
                doc.text(vorbehalt, mx + 5, y + 2);

                // Fußzeile
                const seiten = doc.internal.getNumberOfPages();
                for (let i = 1; i <= seiten; i++) {
                    doc.setPage(i);
                    doc.setDrawColor(...PDF_LINE); doc.setLineWidth(0.2);
                    doc.line(mx, ph - 13, pw - mx, ph - 13);
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...PDF_GRAY);
                    doc.text(`Auslegungsbogen · ${project.title || ''}`, mx, ph - 8.5);
                    doc.text(`Seite ${i} von ${seiten}`, pw - mx, ph - 8.5, { align: 'right' });
                }

                const datei = `Auslegungsbogen_${(project.title || 'Projekt').replace(/[^\wäöüÄÖÜß]+/g, '_')}.pdf`;
                const fenster = app.__bogenFenster;
                if (fenster && !fenster.closed) {
                    const url = URL.createObjectURL(doc.output('blob'));
                    fenster.location.href = url;
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                } else {
                    doc.save(datei);
                }
                app.__bogenFenster = null;
            }
        });

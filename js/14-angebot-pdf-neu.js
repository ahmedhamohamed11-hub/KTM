

        // ============================================================
        // ====== ANGEBOTS-PDF (Layout nach Referenzvorlage) ==========
        // ============================================================
        // Ersetzt die Darstellung, NICHT die Rechnung. Alle Betraege kommen
        // weiterhin aus recomputeOffer() - derselben Funktion wie Liste,
        // Gewinn-Diagnose und Rechnung. Es wird hier nichts nachgerechnet.
        //
        // Farben: ausschliesslich ueber die PDF_*-Konstanten, die aus der
        // Farbwahl in Einstellungen -> PDF gespeist werden. Kein Farbwert
        // steht in diesem Layout fest, damit die Farbanpassung erhalten bleibt.
        //
        // Aufbau:
        //   Seite 1  Kopf, KUNDE / PROJEKT, Anrede, Komponententabelle,
        //            Leistungsumfang
        //   Seite 2+ LEISTUNGS- & KOSTENAUFSTELLUNG, fortlaufend nummeriert
        //   Schluss  ANGEBOTSSUMME
        //
        // GRUNDSATZ: nichts erfinden. Komponenten und Leistungsumfang werden
        // ausschliesslich aus den tatsaechlich vorhandenen Positionen und
        // Projektdaten abgeleitet. Fehlt etwas, entfaellt die Zeile.

        // Ordnet eine Position einer der drei Angebots-Kategorien zu.
        function angPosKategorie(p) {
            if (typeof isLaborPos === 'function' && isLaborPos(p)) return 'ARBEIT';
            const c = (p.category || '').toLowerCase();
            // Name UND Beschreibung pruefen: die Bauteilart steht oft erst in
            // der Beschreibung ("PEGO ECP 300" + "Kühlstellenregler").
            const n = `${p.name || ''} ${p.description || ''}`.toLowerCase();
            const geraet = ['klimageräte', 'klimaanlagen', 'innengeräte', 'außengeräte', 'multisplit-systeme', 'komponente'];
            if (geraet.some(g => c.includes(g))) return 'GERÄT';
            if (/verflüssigungssatz|verdampfer|verdichter|aggregat|regler|regelung|expansionsventil|magnetventil|filtertrockner|schauglas|türkontakt|heizband|sensor|fühler|druckschalter|gaskühler|sammler|ölabscheider|kühlstellenregler|steuerung|thermostat/.test(n)) return 'GERÄT';
            return 'MATERIAL';
        }

        // Projekttyp aus den vorhandenen Daten ableiten - kein Raten.
        // Reihenfolge: ausdrueckliche Kaelteplanung > Raumdaten > Positionen.
        function angProjektTyp(project, offer) {
            if (project && project.kaelte) {
                const stellen = project.kaelte.kuehlstellen || [];
                const tiefkuehl = stellen.some(k => Number(k.raumtemperatur) < -5 || /tiefkühl/i.test(k.raumart || '') || /tiefkühl/i.test(k.bezeichnung || ''));
                if (stellen.length) return tiefkuehl
                    ? { titel: 'Tiefkühlraum – Montage & Inbetriebnahme', anlage: 'Tiefkühlanlage', typ: 'tk' }
                    : { titel: 'Kühlraum – Montage & Inbetriebnahme', anlage: 'Kälteanlage', typ: 'nk' };
            }
            const posText = ((offer.positions || []).map(p => `${p.name} ${p.description || ''}`).join(' ')).toLowerCase();
            if (/tiefkühl/.test(posText)) return { titel: 'Tiefkühlraum – Montage & Inbetriebnahme', anlage: 'Tiefkühlanlage', typ: 'tk' };
            if (/kühlraum|kühlzelle|verflüssigungssatz|verdampfer/.test(posText)) return { titel: 'Kühlraum – Montage & Inbetriebnahme', anlage: 'Kälteanlage', typ: 'nk' };
            if (/wärmepumpe/.test(posText)) return { titel: 'Wärmepumpe – Montage & Inbetriebnahme', anlage: 'Wärmepumpe', typ: 'wp' };
            if (/klima|innengerät|außengerät|split/.test(posText)) return { titel: 'Klimaanlage – Montage & Inbetriebnahme', anlage: 'Klimaanlage', typ: 'klima' };
            if (/reparatur|service|wartung/.test(posText)) return { titel: 'Service / Reparatur', anlage: 'Anlage', typ: 'service' };
            return { titel: (project && project.title) || 'Montage & Inbetriebnahme', anlage: 'Anlage', typ: 'sonstige' };
        }

        // Anrede aus den Kundendaten. Ohne Nachname keine erfundene Anrede.
        function angAnrede(customer) {
            if (!customer) return 'Sehr geehrte Damen und Herren,';
            const nach = (customer.lastName || '').trim();
            const s = (customer.salutation || '').trim();
            if (s === 'Herr' && nach) return `Sehr geehrter Herr ${nach},`;
            if (s === 'Frau' && nach) return `Sehr geehrte Frau ${nach},`;
            return 'Sehr geehrte Damen und Herren,';
        }

        // Komponentenübersicht: nur was wirklich in den Positionen steht.
        function angKomponenten(offer, project) {
            const zeilen = [];
            const gesehen = new Set();
            const muster = [
                [/verflüssigungssatz|verflüssigersatz/i, 'Verflüssigungssatz'],
                [/verdampfer/i, 'Verdampfer'],
                [/verdichter/i, 'Verdichter'],
                [/gaskühler/i, 'Gaskühler'],
                [/regler|regelung|steuerung/i, 'Regelung'],
                [/expansionsventil|einspritzventil/i, 'Expansion'],
                [/magnetventil/i, 'Magnetventil'],
                [/filtertrockner/i, 'Filtertrockner'],
                [/türkontakt/i, 'Türkontaktschalter'],
                [/heizband|heizkabel/i, 'Heizband']
            ];
            (offer.positions || []).forEach(p => {
                const text = `${p.name || ''} ${p.description || ''}`;
                for (const [re, label] of muster) {
                    if (re.test(text) && !gesehen.has(label)) {
                        gesehen.add(label);
                        // Modell/Spezifikation: der Positionsname ohne die
                        // Kategoriebezeichnung, sonst die Beschreibung.
                        zeilen.push([label, (p.name || '').trim() || (p.description || '').trim()]);
                        break;
                    }
                }
            });
            // Kältemittel: nur wenn im Projekt tatsächlich festgelegt
            const km = project && project.kaelte && project.kaelte.auslegung && project.kaelte.auslegung.kaeltemittel;
            if (km) zeilen.push(['Kältemittel', km]);
            else {
                const kmPos = (offer.positions || []).find(p => /kältemittel/i.test(p.name || ''));
                if (kmPos) {
                    const m = /R\d+[A-Za-z]?/.exec(kmPos.name + ' ' + (kmPos.description || ''));
                    if (m) zeilen.push(['Kältemittel', m[0]]);
                }
            }
            return zeilen;
        }

        // Leistungsumfang: wird aus dem abgeleitet, was tatsaechlich im
        // Angebot steht. Kein fester Textbaustein, der immer gleich ist.
        function angLeistungsumfang(offer, projektTyp) {
            const posText = ((offer.positions || []).map(p => `${p.name} ${p.description || ''} ${p.category || ''}`).join(' ')).toLowerCase();
            const hat = re => re.test(posText);
            const l = [];
            l.push('Lieferung der aufgeführten Geräte und Materialien');

            if (projektTyp.typ === 'klima') {
                l.push('Montage der Innen- und Außeneinheit inkl. Befestigung');
                if (hat(/kupferrohr|rohr/)) l.push('Verlegung und Anschluss der Kältemittelleitungen');
                if (hat(/isolierung|dämmung/)) l.push('Isolierung der Kältemittelleitungen');
                if (hat(/kondensat|ablauf/)) l.push('Verlegung der Kondensatleitung');
            } else {
                l.push(`Montage der ${projektTyp.anlage} inkl. Rohrleitungen und Regelung`);
                if (hat(/kupferrohr|rohr/)) l.push('Verlegung und Anschluss der Kältemittelleitungen');
                if (hat(/isolierung|dämmung/)) l.push('Isolierung der Kältemittelleitungen');
                if (hat(/ablauf|abfluss|heizband/)) l.push('Montage und Anschluss des Ablaufes');
            }
            if (hat(/formiergas|stickstoff/)) l.push('Spülen / Druckprobe mit Formiergas bzw. Stickstoff');
            else l.push('Dichtheitsprüfung der Kälteleitungen');
            if (hat(/elektro|kabel|leitung|regler|regelung/)) l.push('Anschluss und Prüfung der elektrischen Komponenten');
            if (hat(/kältemittel|r\d{3}/)) l.push('Evakuierung und Befüllung mit Kältemittel');
            l.push('Inbetriebnahme und Funktionsprüfung der Anlage');
            if (hat(/demontage|entsorgung|altgerät/)) l.push('Demontage und Entsorgung der alten Geräte');
            return l;
        }

        Object.assign(app, {

            async exportOfferPDFneu(offerId, share = false, withCustomer = true) {
                const offer = await db.get('offers', offerId);
                if (!offer) { showToast('Angebot nicht gefunden.', 'error'); return; }
                const customer = offer.customerId ? await db.get('customers', offer.customerId) : null;
                const project = offer.projectId ? await db.get('projects', offer.projectId) : null;

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const co = await pdfCompany();          // laedt auch die Farbwahl
                const pw = doc.internal.pageSize.getWidth();
                const mx = 16;

                const R = recomputeOffer(offer);
                const positionen = R.positions || offer.positions || [];
                const pTyp = angProjektTyp(project, offer);
                const nummer = offer.offerNumber || 'Angebot';
                const datum = formatDate(offer.createdAt);
                const kundeName = withCustomer && customer ? customerDisplayName(customer) : '';

                // --- Kopf- und Fusszeile je Seite ---
                const seitenRahmen = () => {
                    doc.setFillColor(...PDF_TEAL);
                    doc.rect(0, 0, pw, 3, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10.5);
                    doc.setTextColor(...PDF_INK);
                    doc.text(`ANGEBOT Nr. ${nummer}`, mx, 13);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8.5);
                    doc.setTextColor(...PDF_GRAY);
                    doc.text(`Datum: ${datum}`, pw - mx, 13, { align: 'right' });
                    doc.setDrawColor(...PDF_LINE);
                    doc.setLineWidth(0.2);
                    doc.line(mx, 17, pw - mx, 17);
                };

                const abschnitt = (y, titel) => {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(...PDF_TEAL);
                    doc.text(titel.toUpperCase(), mx, y, { charSpace: 0.5 });
                    doc.setDrawColor(...PDF_TEAL);
                    doc.setLineWidth(0.4);
                    doc.line(mx, y + 1.8, pw - mx, y + 1.8);
                    return y + 8;
                };

                // ================= SEITE 1 =================
                seitenRahmen();
                let y = 28;

                if (co.logo) {
                    try {
                        const ip = doc.getImageProperties(co.logo);
                        let h = 15, w = (ip.width / ip.height) * h;
                        if (w > 55) { w = 55; h = (ip.height / ip.width) * w; }
                        doc.addImage(co.logo, ip.fileType || 'PNG', pw - mx - w, y - 4, w, h);
                    } catch (e) { /* Logo optional */ }
                }

                // KUNDE / PROJEKT nebeneinander
                y = abschnitt(y, 'Kunde');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(...PDF_INK);
                doc.text(kundeName || 'Ohne Kundenangabe', mx, y);
                if (withCustomer && customer) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(...PDF_GRAY);
                    const adr = [customer.street, [customer.zip, customer.city].filter(Boolean).join(' ')].filter(Boolean);
                    let ay = y + 5;
                    adr.forEach(z => { doc.text(String(z), mx, ay); ay += 4.4; });
                    y = Math.max(y, ay - 4.4);
                }
                y += 11;

                y = abschnitt(y, 'Projekt / Baustelle');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(...PDF_INK);
                doc.text(pTyp.titel, mx, y, { maxWidth: pw - mx * 2 });
                if (project && project.siteAddress) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(...PDF_GRAY);
                    doc.text(String(project.siteAddress), mx, y + 5.2, { maxWidth: pw - mx * 2 });
                    y += 5.2;
                }
                y += 12;

                // PROJEKTÜBERSICHT & KOMPONENTEN
                y = abschnitt(y, 'Projektübersicht & Komponenten');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9.5);
                doc.setTextColor(...PDF_INK);
                doc.text(angAnrede(customer), mx, y);
                y += 6;
                const einleitung = `hiermit erhalten Sie mein Angebot für die fachgerechte Montage und Inbetriebnahme der ${pTyp.anlage}. Die nachfolgende Aufstellung enthält die vorgesehenen Geräte, Materialien und Arbeitsleistungen für die Ausführung des Projekts.`;
                const zeilen = doc.splitTextToSize(einleitung, pw - mx * 2);
                doc.text(zeilen, mx, y);
                y += zeilen.length * 4.7 + 6;

                const komponenten = angKomponenten(offer, project);
                if (komponenten.length) {
                    doc.autoTable({
                        startY: y, margin: { left: mx, right: mx },
                        head: [['KOMPONENTE', 'MODELL / SPEZIFIKATION']],
                        body: komponenten,
                        theme: 'plain',
                        styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 2.6, bottom: 2.6, left: 2, right: 2 }, textColor: PDF_INK, lineColor: PDF_LINE, lineWidth: 0.1 },
                        headStyles: { fillColor: PDF_TEAL, textColor: 255, fontStyle: 'bold', fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 } },
                        columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' } }
                    });
                    y = doc.lastAutoTable.finalY + 11;
                }

                // LEISTUNGSUMFANG
                const leistungen = angLeistungsumfang(offer, pTyp);
                y = abschnitt(y, 'Leistungsumfang');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9.5);
                leistungen.forEach(l => {
                    doc.setTextColor(...PDF_TEAL);
                    doc.text('\u2713', mx, y);
                    doc.setTextColor(...PDF_INK);
                    const t = doc.splitTextToSize(l, pw - mx * 2 - 7);
                    doc.text(t, mx + 6, y);
                    y += t.length * 4.7 + 1.8;
                });

                // ================= SEITE 2+ : Kostenaufstellung =================
                doc.addPage();
                seitenRahmen();
                let ky = abschnitt(28, 'Leistungs- & Kostenaufstellung');

                const koerper = positionen.map((p, i) => {
                    const einzel = (typeof posDisplayPrice === 'function') ? posDisplayPrice(p, offer) : (Number(p.price) || 0);
                    const menge = Number(p.quantity) || 0;
                    const rabatt = Number(p.discount) || 0;
                    const gesamt = einzel * menge * (1 - rabatt / 100);
                    const kat = angPosKategorie(p);
                    const zweite = [(p.description || '').trim(), `(${kat})`].filter(Boolean).join(' ');
                    return [
                        String(i + 1).padStart(2, '0'),
                        `${p.name || ''}\n${zweite}`,
                        String(menge).replace('.', ','),
                        p.unit || 'Stk',
                        formatCurrency(einzel),
                        formatCurrency(gesamt)
                    ];
                });

                doc.autoTable({
                    startY: ky, margin: { left: mx, right: mx, top: 28, bottom: 24 },
                    head: [['POS.', 'ARTIKELBESCHREIBUNG', 'MENGE', 'EINH.', 'EINZELPREIS', 'GESAMT']],
                    body: koerper,
                    theme: 'plain',
                    styles: { font: 'helvetica', fontSize: 8.6, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, textColor: PDF_INK, lineColor: PDF_LINE, lineWidth: 0.1, valign: 'middle' },
                    headStyles: { fillColor: PDF_TEAL, textColor: 255, fontStyle: 'bold', fontSize: 7.8 },
                    columnStyles: {
                        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
                        1: { cellWidth: 'auto' },
                        2: { cellWidth: 15, halign: 'center' },
                        3: { cellWidth: 13, halign: 'center' },
                        4: { cellWidth: 24, halign: 'right' },
                        5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
                    },
                    // Erste Zeile der Beschreibung fett, zweite klein und grau
                    didParseCell: (data) => {
                        if (data.section === 'body' && data.column.index === 1) {
                            data.cell.styles.cellPadding = { top: 3, bottom: 3, left: 2, right: 2 };
                        }
                    },
                    willDrawPage: () => { if (doc.internal.getCurrentPageInfo().pageNumber > 2) { seitenRahmen(); abschnitt(28, 'Leistungs- & Kostenaufstellung'); } }
                });

                // ANGEBOTSSUMME
                let sy = doc.lastAutoTable.finalY + 12;
                if (sy > doc.internal.pageSize.getHeight() - 45) { doc.addPage(); seitenRahmen(); sy = 34; }
                const bw = 96, bx = pw - mx - bw;
                doc.setFillColor(...PDF_TEAL);
                doc.roundedRect(bx, sy, bw, 24, 3, 3, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(...PDF_ONBAND);
                doc.text('ANGEBOTSSUMME', bx + bw - 6, sy + 8, { align: 'right', charSpace: 0.6 });
                doc.setFontSize(18);
                doc.setTextColor(255, 255, 255);
                doc.text(formatCurrency(R.total), bx + bw - 6, sy + 19, { align: 'right' });

                // Fusszeile auf allen Seiten, jetzt mit bekannter Gesamtzahl
                const seiten = doc.internal.getNumberOfPages();
                const ph = doc.internal.pageSize.getHeight();
                for (let i = 1; i <= seiten; i++) {
                    doc.setPage(i);
                    doc.setDrawColor(...PDF_LINE);
                    doc.setLineWidth(0.2);
                    doc.line(mx, ph - 14, pw - mx, ph - 14);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(...PDF_GRAY);
                    const links = [`Angebot Nr. ${nummer}`, kundeName].filter(Boolean).join(' | ');
                    doc.text(links, mx, ph - 9.5);
                    doc.text(`Seite ${i} von ${seiten}`, pw - mx, ph - 9.5, { align: 'right' });
                    if (co.name || co.address) {
                        doc.setFontSize(6.8);
                        doc.text([co.name, co.address, co.phone].filter(Boolean).join(' · '), pw / 2, ph - 5.5, { align: 'center' });
                    }
                }

                const datei = `Angebot_${nummer}${kundeName ? '_' + kundeName.replace(/[^\wäöüÄÖÜß]+/g, '_') : ''}.pdf`;
                if (share && navigator.share && navigator.canShare) {
                    try {
                        const blob = doc.output('blob');
                        const file = new File([blob], datei, { type: 'application/pdf' });
                        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: `Angebot ${nummer}` }); return; }
                    } catch (e) { /* Fallback: normaler Download */ }
                }
                doc.save(datei);
            }
        });

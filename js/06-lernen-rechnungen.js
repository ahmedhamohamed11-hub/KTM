


        // Firmen-Logo (Standard für PDFs, überschreibbar unter Logo & Bank)
        const KTM_LOGO_DEFAULT = 'data:image/jpeg;base64,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';
        // Kennung des vorherigen Standard-Logos (wird beim Start automatisch ersetzt)
        const KTM_LOGO_OLD_PREFIX = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBAUEBAYFBQUGBgYHCQ4JC';

        // ============================================================
        // ============ LERNENDE VORSCHLÄGE ===========================
        // ============================================================
        // Merkt sich häufige Eingaben (Rohrdimensionen, Hersteller, Orte, ...)
        // und bietet sie beim nächsten Mal an. Synchronisiert über settings.
        let _learned = null;
        async function loadLearned() {
            if (_learned) return _learned;
            try { _learned = JSON.parse(await getSetting('learnedValues', '{}')) || {}; }
            catch (e) { _learned = {}; }
            return _learned;
        }
        async function learnValues(pairs) {
            const data = await loadLearned();
            let changed = false;
            for (const [type, value] of pairs) {
                const v = String(value || '').trim();
                if (!v || v.length < 2) continue;
                data[type] = data[type] || {};
                data[type][v] = (data[type][v] || 0) + 1;
                const entries = Object.entries(data[type]).sort((a, b) => b[1] - a[1]).slice(0, 40);
                data[type] = Object.fromEntries(entries);
                changed = true;
            }
            if (changed) await setSetting('learnedValues', JSON.stringify(data));
        }
        async function learnValue(type, value) { return learnValues([[type, value]]); }
        function learnedList(type) {
            return Object.entries(_learned?.[type] || {}).sort((a, b) => b[1] - a[1]).map(([v]) => v);
        }
        function learnedDatalist(type, id) {
            const list = learnedList(type);
            return list.length ? `<datalist id="${id}">${list.map(v => `<option value="${escapeHtml(v)}">`).join('')}</datalist>` : `<datalist id="${id}"></datalist>`;
        }

        // ============================================================
        // ============ RECHNUNGEN ====================================
        // ============================================================
        const INVOICE_STATUSES = ['Offen', 'Teilbezahlt', 'Bezahlt', 'Überfällig', 'Storniert'];

        function invoicePaid(inv) { return (inv.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0); }
        function invoiceOpen(inv) { return Math.max(0, (Number(inv.totalPrice) || 0) - invoicePaid(inv)); }
        function invoiceStatus(inv) {
            if (inv.status === 'Storniert') return 'Storniert';
            const paid = invoicePaid(inv);
            const total = Number(inv.totalPrice) || 0;
            if (total > 0 && paid >= total - 0.005) return 'Bezahlt';
            if (paid > 0) return 'Teilbezahlt';
            if (inv.dueDate && inv.dueDate < toLocalDateString(new Date())) return 'Überfällig';
            return 'Offen';
        }
        function invoiceStatusClass(s) {
            return { 'Offen': 'status-offen', 'Teilbezahlt': 'status-aktiv', 'Bezahlt': 'status-fertig', 'Überfällig': 'status-danger', 'Storniert': 'status-danger' }[s] || 'status-offen';
        }
        async function nextInvoiceNumber() {
            const year = new Date().getFullYear();
            const invoices = await db.getAll('invoices');
            let max = 0;
            for (const inv of invoices) {
                const m = String(inv.invoiceNumber || '').match(new RegExp(`^R-${year}-(\\d+)$`));
                if (m) max = Math.max(max, parseInt(m[1], 10));
            }
            return `R-${year}-${String(max + 1).padStart(4, '0')}`;
        }
        // IBAN aus den Bank-Einstellungen ziehen (für EPC-QR)
        function extractIban(bankText) {
            const m = String(bankText || '').replace(/\s+/g, '').toUpperCase().match(/[A-Z]{2}\d{2}[A-Z0-9]{10,30}/);
            return m ? m[0] : '';
        }

        function renderInvoices() {
            (async () => {
                const invoices = await db.getAll('invoices');
                const customers = await db.getAll('customers');
                const projects = await db.getAll('projects');
                const q = (listFilters.invoices?.q || '').toLowerCase();
                const statusFilter = listFilters.invoices?.status || '';
                if (!listFilters.invoices) listFilters.invoices = { q: '', status: '' };

                const rows = invoices.map(inv => ({ inv, st: invoiceStatus(inv) }))
                    .filter(({ inv, st }) => {
                        const cust = customers.find(c => String(c.id) === String(inv.customerId));
                        const hay = `${inv.invoiceNumber || ''} ${cust ? cust.firstName + ' ' + cust.lastName : ''}`.toLowerCase();
                        if (q && !hay.includes(q)) return false;
                        if (statusFilter && st !== statusFilter) return false;
                        return true;
                    })
                    .sort((a, b) => (b.inv.date || '').localeCompare(a.inv.date || ''));

                const openSum = invoices.reduce((s, inv) => invoiceStatus(inv) === 'Storniert' ? s : s + invoiceOpen(inv), 0);

                contentArea.innerHTML = `
                    <div class="toolbar">
                        <div class="search-inline">
                            <span class="search-icon">${icon('search')}</span>
                            <input type="text" id="invSearch" placeholder="Suchen..." value="${escapeHtml(listFilters.invoices.q)}">
                        </div>
                        <select class="filter-select" id="invStatusFilter">
                            <option value="">Alle Status</option>
                            ${INVOICE_STATUSES.map(s => `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                        <div class="toolbar-spacer"></div>
                        <div class="survey-chip" style="border-color:var(--warning);"><span>Offen gesamt</span><strong style="color:var(--warning);">${formatCurrency(openSum)}</strong></div>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Nummer</th><th>Kunde</th><th>Datum</th><th>Fällig</th><th style="text-align:right;">Betrag</th><th style="text-align:right;">Offen</th><th>Status</th><th style="text-align:right;">Aktionen</th></tr></thead>
                            <tbody>
                                ${rows.map(({ inv, st }) => {
                                    const cust = customers.find(c => String(c.id) === String(inv.customerId));
                                    const proj = projects.find(p => String(p.id) === String(inv.projectId));
                                    const open = invoiceOpen(inv);
                                    return `<tr>
                                        <td><strong>${escapeHtml(inv.invoiceNumber || '')}</strong>${proj ? `<div style="font-size:12px;color:var(--text-muted);">${escapeHtml(proj.title || '')}</div>` : ''}</td>
                                        <td>${escapeHtml(cust ? `${cust.firstName} ${cust.lastName}` : '-')}</td>
                                        <td>${formatDate(inv.date)}</td>
                                        <td>${inv.dueDate ? formatDate(inv.dueDate) : '-'}</td>
                                        <td style="text-align:right;"><strong>${formatCurrency(inv.totalPrice || 0)}</strong></td>
                                        <td style="text-align:right;color:${open > 0 ? 'var(--danger)' : 'var(--success)'};font-weight:700;">${formatCurrency(open)}</td>
                                        <td><span class="status-badge ${invoiceStatusClass(st)}">${st}</span></td>
                                        <td style="text-align:right;white-space:nowrap;">
                                            ${st !== 'Bezahlt' && st !== 'Storniert' ? `<button class="btn btn-sm btn-primary" onclick="app.openPaymentModal(${idJS(inv.id)})">€ Zahlung</button>` : ''}
                                            ${st === 'Überfällig' ? `<button class="btn btn-sm btn-warning" onclick="app.exportInvoicePDF(${idJS(inv.id)}, true)">📨 Mahnung</button>` : ''}
                                            <button class="btn btn-sm btn-outline" onclick="app.exportInvoicePDF(${idJS(inv.id)})">${icon('pdf')} PDF</button>
                                            <button class="btn btn-sm btn-outline" onclick="app.exportEInvoice(${idJS(inv.id)})" title="XRechnung (EN 16931) für Behörden & Firmen">🧾 E-Rechnung</button>
                                            <button class="btn btn-sm btn-danger" onclick="app.deleteInvoice(${idJS(inv.id)})">${icon('trash')}</button>
                                        </td>
                                    </tr>`;
                                }).join('') || '<tr><td colspan="8" class="empty-note">Noch keine Rechnungen – erzeuge eine direkt aus einem Angebot (Angebote → „Rechnung").</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                `;
                const inp = document.getElementById('invSearch');
                inp.addEventListener('input', () => {
                    listFilters.invoices.q = inp.value;
                    clearTimeout(inp._t);
                    inp._t = setTimeout(() => { renderInvoices(); setTimeout(() => { const el = document.getElementById('invSearch'); el?.focus(); el?.setSelectionRange(el.value.length, el.value.length); }, 0); }, 250);
                });
                document.getElementById('invStatusFilter').addEventListener('change', (e) => {
                    listFilters.invoices.status = e.target.value;
                    renderInvoices();
                });
            })();
        }

        const invoiceExtensions = {
            // Rechnung automatisch aus Angebot erzeugen
            async createInvoiceFromOffer(offerId) {
                const offer = await db.get('offers', offerId);
                if (!offer) return;
                const existing = (await db.getAll('invoices')).find(i => String(i.offerId) === String(offerId) && invoiceStatus(i) !== 'Storniert');
                if (existing && !confirm(`Zu diesem Angebot existiert bereits ${existing.invoiceNumber}. Trotzdem eine weitere Rechnung erzeugen?`)) {
                    app.navigate('invoices');
                    return;
                }
                const today = toLocalDateString(new Date());
                const payDays = parseInt(await getSetting('paymentDays', '14'), 10) || 14;
                const due = new Date(); due.setDate(due.getDate() + payDays);
                const inv = {
                    invoiceNumber: await nextInvoiceNumber(),
                    offerId: offer.id,
                    projectId: offer.projectId ?? null,
                    customerId: offer.customerId ?? null,
                    date: today,
                    dueDate: toLocalDateString(due),
                    skontoRate: parseFloat(await getSetting('skontoRate', '0')) || 0,
                    skontoDays: parseInt(await getSetting('skontoDays', '7'), 10) || 7,
                    subtotal: offer.subtotal || 0,
                    vatRate: offer.vatRate || 0,
                    vatAmount: offer.vatAmount || 0,
                    totalPrice: offer.totalPrice || 0,
                    status: 'Offen',
                    payments: [],
                    notes: ''
                };
                await db.add('invoices', inv);
                // Projekt-Status automatisch weiterschalten
                if (inv.projectId) {
                    const p = await db.get('projects', inv.projectId);
                    if (p && !['Bezahlt', 'Archiviert', 'Archiv'].includes(p.status)) {
                        p.status = 'Rechnung erstellt';
                        await db.put('projects', p);
                    }
                }
                showToast(`Rechnung ${inv.invoiceNumber} erstellt (fällig ${formatDate(inv.dueDate)}).`, 'success');
                app.navigate('invoices');
            },

            async openPaymentModal(invoiceId) {
                const inv = await db.get('invoices', invoiceId);
                if (!inv) return;
                const open = invoiceOpen(inv);
                const today = toLocalDateString(new Date());
                showModal(
                    `Zahlung erfassen – ${escapeHtml(inv.invoiceNumber || '')}`,
                    `
                        <div class="survey-summary" style="margin-bottom:14px;">
                            <div class="survey-chip"><span>Rechnungsbetrag</span><strong>${formatCurrency(inv.totalPrice || 0)}</strong></div>
                            <div class="survey-chip"><span>Bereits bezahlt</span><strong>${formatCurrency(invoicePaid(inv))}</strong></div>
                            <div class="survey-chip" style="border-color:var(--warning);"><span>Offen</span><strong style="color:var(--warning);">${formatCurrency(open)}</strong></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Datum</label><input type="date" id="payDate" value="${today}"></div>
                            <div class="form-group"><label>Betrag (€) *</label><input type="number" inputmode="decimal" step="0.01" min="0" id="payAmount" value="${open.toFixed(2)}"></div>
                        </div>
                        ${(inv.payments || []).length ? `<div style="font-size:12.5px;color:var(--text-muted);">Bisherige Zahlungen:<br>${inv.payments.map(p => `• ${formatDate(p.date)} – ${formatCurrency(p.amount)}`).join('<br>')}</div>` : ''}
                    `,
                    async (overlay) => {
                        const amount = parseFloat(String(overlay.querySelector('#payAmount').value).replace(',', '.'));
                        if (isNaN(amount) || amount <= 0) { showToast('Bitte gültigen Betrag eingeben.', 'error'); return; }
                        inv.payments = [...(inv.payments || []), { date: overlay.querySelector('#payDate').value || today, amount }];
                        inv.status = invoiceStatus(inv);
                        await db.put('invoices', inv);
                        // Projekt auf Bezahlt schalten, wenn voll bezahlt
                        if (invoiceStatus(inv) === 'Bezahlt' && inv.projectId) {
                            const p = await db.get('projects', inv.projectId);
                            if (p && !['Archiviert', 'Archiv'].includes(p.status)) { p.status = 'Bezahlt'; await db.put('projects', p); }
                        }
                        overlay.remove();
                        showToast(invoiceStatus(inv) === 'Bezahlt' ? '✅ Rechnung vollständig bezahlt.' : 'Teilzahlung erfasst.', 'success');
                        app.navigate('invoices');
                    }
                );
            },

            async deleteInvoice(id) {
                if (!confirm('Diese Rechnung wirklich löschen?')) return;
                await db.delete('invoices', id);
                showToast('Rechnung gelöscht.', 'success');
                app.navigate('invoices');
            },

            // ============ RECHNUNGS-PDF mit EPC-QR-Code ============
            async exportInvoicePDF(invoiceId, asReminder = false) {
                if (typeof window.jspdf === 'undefined') { showToast('PDF-Bibliothek konnte nicht geladen werden.', 'error'); return; }
                const inv = await db.get('invoices', invoiceId);
                if (!inv) return;
                const offer = inv.offerId ? await db.get('offers', inv.offerId) : null;
                const project = inv.projectId ? await db.get('projects', inv.projectId) : null;
                const customer = inv.customerId ? await db.get('customers', inv.customerId) : null;
                const co = await pdfCompany();
                const st = invoiceStatus(inv);

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pw = doc.internal.pageSize.getWidth();
                const mx = 16;

                pdfWatermark(doc);
                let y = pdfHeader(doc, co, asReminder ? 'ZAHLUNGSERINNERUNG' : 'RECHNUNG', [
                    `zu Rechnung Nr. ${inv.invoiceNumber}  ·  ${formatDate(inv.date)}`,
                    asReminder ? `ursprünglich zahlbar bis ${formatDate(inv.dueDate)}` : `Zahlbar bis ${formatDate(inv.dueDate)}${inv.skontoRate > 0 ? `  ·  ${(inv.skontoRate * 100).toFixed(0)} % Skonto binnen ${inv.skontoDays} Tagen` : ''}`
                ]);

                const custLines = customer ? [
                    `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
                    customer.company || '',
                    [customer.street, customer.city].filter(Boolean).join(', ')
                ].filter(Boolean) : ['–'];
                const infoLines = [
                    project ? `Projekt: ${project.title || ''}` : '',
                    offer ? `Angebot: ${offer.offerNumber || ''}` : '',
                    st !== 'Offen' ? `Status: ${st}` : ''
                ].filter(Boolean);
                y = pdfInfoBoxes(doc, y, 'Rechnungsempfänger', custLines, 'Zuordnung', infoLines.length ? infoLines : ['–']);

                if (asReminder) {
                    const open = invoiceOpen(inv);
                    doc.setFillColor(255, 247, 237);
                    doc.setDrawColor(230, 160, 90);
                    const boxH = 26;
                    doc.roundedRect(mx, y, pw - mx * 2, boxH, 2, 2, 'FD');
                    doc.setFontSize(9.5); doc.setTextColor(120, 70, 20); doc.setFont(undefined, 'normal');
                    const txt = `Sehr geehrte Damen und Herren, unsere oben genannte Rechnung ist zwischenzeitlich fällig, ein Zahlungseingang liegt uns noch nicht vor. Wir bitten Sie höflich, den offenen Betrag von ${formatCurrency(open)} umgehend zu begleichen. Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben als gegenstandslos.`;
                    doc.text(doc.splitTextToSize(txt, pw - mx * 2 - 8), mx + 4, y + 6);
                    y += boxH + 6;
                    doc.setTextColor(0, 0, 0);
                }

                // Positionen (aus verknüpftem Angebot) oder Pauschalzeile
                const rows = (offer?.positions || []).map((p, i) => [
                    String(i + 1), p.name || '', String(p.quantity), p.unit || 'Stk', formatCurrency(p.price), formatCurrency(p.price * p.quantity)
                ]);
                if (rows.length === 0) rows.push(['1', project?.title ? `Leistungen lt. Auftrag – ${project.title}` : 'Leistungen lt. Auftrag', '1', 'Psch', formatCurrency(inv.subtotal || 0), formatCurrency(inv.subtotal || 0)]);

                doc.autoTable({
                    startY: y,
                    margin: { left: mx, right: mx, bottom: 26 },
                    head: [['Nr.', 'Leistung / Artikel', 'Menge', 'Einh.', 'Einzelpreis', 'Gesamt']],
                    body: rows,
                    ...PDF_TABLE_STYLES,
                    columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 13, halign: 'center' }, 4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' } },
                    willDrawPage: () => pdfWatermark(doc),
                    didDrawPage: () => pdfFooterOnce(doc, co)
                });

                let fy = doc.lastAutoTable.finalY + 8;
                fy = pdfNewPageIfNeeded(doc, fy, 70, co);

                // Summenblock rechts
                const boxW = 80, boxX = pw - mx - boxW;
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9.2); doc.setTextColor(...PDF_INK);
                const sums = [['Nettobetrag', formatCurrency(inv.subtotal || 0)]];
                if (inv.vatAmount > 0) sums.push([`MwSt. (${((inv.vatRate || 0) * 100).toFixed(0)}%)`, formatCurrency(inv.vatAmount || 0)]);
                const paid = invoicePaid(inv);
                sums.forEach(([l, v]) => { doc.text(l, boxX, fy); doc.text(v, pw - mx, fy, { align: 'right' }); fy += 5.8; });
                fy += 1.5;
                doc.setFillColor(...PDF_TEAL);
                doc.roundedRect(boxX, fy - 5.5, boxW, 12.5, 2.5, 2.5, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(255, 255, 255);
                doc.text('Rechnungsbetrag', boxX + 4, fy + 2.3);
                doc.text(formatCurrency(inv.totalPrice || 0), pw - mx - 4, fy + 2.3, { align: 'right' });
                fy += 13;
                if (paid > 0) {
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...PDF_INK);
                    doc.text('Bereits bezahlt', boxX, fy); doc.text(`- ${formatCurrency(paid)}`, pw - mx, fy, { align: 'right' }); fy += 5.5;
                    doc.setFont('helvetica', 'bold');
                    doc.text('Restbetrag', boxX, fy); doc.text(formatCurrency(invoiceOpen(inv)), pw - mx, fy, { align: 'right' }); fy += 7;
                }

                // EPC-QR-Code (Zahlung mit Banking-App scannen) – links neben dem Summenblock
                const iban = extractIban(co.bank);
                let qrY = doc.lastAutoTable.finalY + 8;
                if (iban && typeof window.qrcode === 'function' && invoiceOpen(inv) > 0) {
                    try {
                        const epc = ['BCD', '002', '1', 'SCT', '', (co.name || 'Firma').slice(0, 70), iban,
                            'EUR' + invoiceOpen(inv).toFixed(2), '', '', ('Rechnung ' + inv.invoiceNumber).slice(0, 140), ''].join('\n');
                        const qr = window.qrcode(0, 'M');
                        qr.addData(epc);
                        qr.make();
                        const qrUrl = qr.createDataURL(6, 2);
                        doc.addImage(qrUrl, 'GIF', mx, qrY, 32, 32);
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...PDF_TEAL);
                        doc.text('Bequem zahlen:', mx + 36, qrY + 7);
                        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...PDF_GRAY);
                        doc.text('QR-Code mit Ihrer Banking-App scannen –\nEmpfänger, IBAN und Betrag werden\nautomatisch übernommen.', mx + 36, qrY + 12);
                    } catch (e) { console.warn('QR-Code:', e); }
                }

                // Zahlungsbedingungen
                let ty = Math.max(fy, qrY + 38);
                ty = pdfNewPageIfNeeded(doc, ty, 20, co);
                doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...PDF_GRAY);
                const terms = [
                    `Zahlbar bis ${formatDate(inv.dueDate)} ohne Abzug auf das unten angeführte Konto.`,
                    inv.skontoRate > 0 ? `Bei Zahlung binnen ${inv.skontoDays} Tagen gewähren wir ${(inv.skontoRate * 100).toFixed(0)} % Skonto (${formatCurrency((inv.totalPrice || 0) * (1 - inv.skontoRate))}).` : '',
                    inv.notes || ''
                ].filter(Boolean).join('\n');
                doc.text(terms, mx, ty, { maxWidth: pw - mx * 2 });

                pdfFooterOnce(doc, co);
                doc.save(`${asReminder ? 'Mahnung_' : ''}${inv.invoiceNumber}_${customer?.lastName || 'Kunde'}.pdf`);
                showToast(asReminder ? 'Zahlungserinnerung als PDF erstellt.' : 'Rechnung als PDF exportiert.', 'success');
            },

            // ===== E-RECHNUNG (XRechnung / EN 16931, UBL 2.1) =====
            async exportEInvoice(invoiceId) {
                const inv = await db.get('invoices', invoiceId);
                if (!inv) return;
                const offer = inv.offerId ? await db.get('offers', inv.offerId) : null;
                const customer = inv.customerId ? await db.get('customers', inv.customerId) : null;
                const co = await pdfCompany();

                // Positionen aus dem Angebot (oder leer)
                const positions = (offer && Array.isArray(offer.positions)) ? offer.positions : [];
                const vatRate = (inv.vatRate || offer?.vatRate || 0.2);
                const net = inv.subtotal || offer?.subtotal || (inv.totalPrice / (1 + vatRate)) || 0;
                const vat = inv.vatAmount || (net * vatRate);
                const gross = inv.totalPrice || (net + vat);

                const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                const num = (n) => (Number(n) || 0).toFixed(2);
                const vatPct = Math.round(vatRate * 100);

                // Verkäufer-Adresse grob zerlegen
                const sellerAddr = (co.address || '').split(/,|\n/).map(s => s.trim()).filter(Boolean);
                const custName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Kunde';
                const custAddr = (customer?.address || customer?.street || '').split(/,|\n/).map(s => s.trim()).filter(Boolean);

                // UBL 2.1 Invoice (XRechnung-Profil, EN 16931)
                const lines = positions.map((p, i) => {
                    const qty = Number(p.quantity) || 1;
                    const price = Number(p.price) || 0;
                    const lineNet = qty * price;
                    return `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${num(qty)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${num(lineNet)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${esc(p.name || p.description || 'Position')}</cbc:Name>
      <cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${vatPct}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="EUR">${num(price)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`;
                }).join('\n');

                const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_2.3</cbc:CustomizationID>
  <cbc:ID>${esc(inv.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${esc(inv.date)}</cbc:IssueDate>
  <cbc:DueDate>${esc(inv.dueDate)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyName><cbc:Name>${esc(co.name)}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cbc:StreetName>${esc(sellerAddr[0] || '')}</cbc:StreetName><cbc:CityName>${esc(sellerAddr[1] || '')}</cbc:CityName><cac:Country><cbc:IdentificationCode>AT</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    ${co.uid ? `<cac:PartyTaxScheme><cbc:CompanyID>${esc(co.uid)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
    <cac:PartyLegalEntity><cbc:RegistrationName>${esc(co.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
    <cac:Contact><cbc:Telephone>${esc(co.phone)}</cbc:Telephone><cbc:ElectronicMail>${esc(co.email)}</cbc:ElectronicMail></cac:Contact>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyName><cbc:Name>${esc(custName)}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cbc:StreetName>${esc(custAddr[0] || '')}</cbc:StreetName><cbc:CityName>${esc(custAddr[1] || '')}</cbc:CityName><cac:Country><cbc:IdentificationCode>AT</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyLegalEntity><cbc:RegistrationName>${esc(custName)}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${num(vat)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${num(net)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${num(vat)}</cbc:TaxAmount>
      <cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${vatPct}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${num(net)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${num(net)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${num(gross)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${num(gross)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines || '  <!-- keine Positionen -->'}
</Invoice>`;

                // Download als .xml
                const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${inv.invoiceNumber || 'Rechnung'}_XRechnung.xml`;
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                showToast('E-Rechnung (XRechnung) erstellt.', 'success');
            }
        };

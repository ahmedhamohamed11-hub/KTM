

        // ============================================================
        // ====== BESTEHENDES ANGEBOT BEARBEITEN ======================
        // ============================================================
        // Bisher konnte ein einmal erstelltes Angebot nicht mehr geaendert
        // werden - createOffer() legt immer ein NEUES an. Dadurch musste fuer
        // jede Korrektur ein weiteres Angebot geschrieben werden.
        //
        // WICHTIG: Hier wird KEINE Preis-, Steuer- oder Rabattlogik neu
        // implementiert. Der Dialog aendert nur die Felder des Angebots und
        // laesst danach recomputeOffer() rechnen - dieselbe Funktion, die
        // auch Liste, Gewinn-Diagnose und PDF verwenden. Sonst wuerden die
        // Zahlen auseinanderlaufen.
        //
        // Konvention beibehalten: position.price ist ein ENDPREIS inkl. USt.,
        // wenn priceIncludesVat gesetzt ist. Das wird hier nicht umgerechnet,
        // nur angezeigt und uebernommen.

        Object.assign(app, {

            async openOfferEdit(offerId) {
                const offer = await db.get('offers', offerId);
                if (!offer) { showToast('Angebot nicht gefunden.', 'error'); return; }
                const customer = offer.customerId ? await db.get('customers', offer.customerId) : null;
                const project = offer.projectId ? await db.get('projects', offer.projectId) : null;

                // Auf einer Kopie arbeiten, damit ein Abbrechen wirklich nichts aendert.
                const entwurf = JSON.parse(JSON.stringify(offer));
                entwurf.positions = entwurf.positions || [];

                const zeichnen = () => {
                    const R = recomputeOffer(entwurf);
                    const box = document.querySelector('#aeInhalt');
                    if (!box) return;
                    box.innerHTML = `
                        <div class="ae-kopf">
                            <div><strong>${escapeHtml(entwurf.offerNumber || 'Angebot')}</strong>
                            <span style="color:var(--text-muted);"> · ${escapeHtml(customer ? customerDisplayName(customer) : 'kein Kunde')}${project ? ' · ' + escapeHtml(project.title || '') : ''}</span></div>
                        </div>

                        <div class="ae-tabelle">
                            ${entwurf.positions.length === 0 ? '<div class="empty-note" style="padding:12px;">Keine Position. Unten eine hinzufügen.</div>' : entwurf.positions.map((p, i) => `
                                <div class="ae-pos">
                                    <div class="ae-pos-kopf">
                                        <input type="text" class="ae-f" data-i="${i}" data-f="name" value="${escapeHtml(p.name || '')}" placeholder="Bezeichnung">
                                        <button class="btn btn-sm btn-danger" onclick="app.aeLoeschen(${i})" title="Position löschen">${icon('trash')}</button>
                                    </div>
                                    <input type="text" class="ae-f ae-beschr" data-i="${i}" data-f="description" value="${escapeHtml(p.description || '')}" placeholder="Beschreibung (erscheint im Angebot)">
                                    <div class="ae-pos-zahlen">
                                        <label>Menge<input type="text" inputmode="decimal" class="ae-f" data-i="${i}" data-f="quantity" value="${p.quantity ?? ''}"></label>
                                        <label>Einheit<input type="text" class="ae-f" data-i="${i}" data-f="unit" value="${escapeHtml(p.unit || 'Stk')}"></label>
                                        <label>Preis ${entwurf.netMode ? '(netto)' : '(inkl. USt.)'}<input type="text" inputmode="decimal" class="ae-f" data-i="${i}" data-f="price" value="${p.price ?? ''}"></label>
                                        <label>Rabatt %<input type="text" inputmode="decimal" class="ae-f" data-i="${i}" data-f="discount" value="${p.discount ?? 0}"></label>
                                        <label>EK netto<input type="text" inputmode="decimal" class="ae-f" data-i="${i}" data-f="purchasePriceNet" value="${p.purchasePriceNet ?? ''}" placeholder="–"></label>
                                    </div>
                                </div>`).join('')}
                        </div>

                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 16px;">
                            <button class="btn btn-sm btn-outline" onclick="app.aeNeuePosition()">${icon('plus')} Freie Position</button>
                            <button class="btn btn-sm btn-outline" onclick="app.aeAusKatalog()">${icon('plus')} Aus Katalog</button>
                        </div>

                        <div class="form-card">
                            <div class="form-card-title">Umsatzsteuer</div>
                            <div class="ae-modus">
                                <button type="button" class="ae-modus-btn ${!entwurf.netMode ? 'active' : ''}" onclick="app.aeSetzeModus(false)">
                                    <strong>Preise inklusive USt.</strong><span>Der Kunde zahlt den angezeigten Betrag. Übliche Einstellung für Privatkunden.</span>
                                </button>
                                <button type="button" class="ae-modus-btn ${entwurf.netMode ? 'active' : ''}" onclick="app.aeSetzeModus(true)">
                                    <strong>Angebot ohne USt.</strong><span>Alle Preise werden auf Nettobeträge umgerechnet, es wird keine Umsatzsteuer aufgeschlagen.</span>
                                </button>
                            </div>
                            ${entwurf.netMode ? '<div class="kl-hinweis kl-warnung" style="margin-top:8px;">⚠ Dieses Angebot enthält keine Umsatzsteuer. Ob das zulässig ist (z. B. Reverse Charge, Kleinunternehmer, Auslandskunde), musst du selbst prüfen – das Programm entscheidet das nicht.</div>' : ''}
                            <div class="form-group" style="max-width:200px;margin-top:10px;${entwurf.netMode ? 'display:none;' : ''}">
                                <label>USt-Satz auf Arbeitsleistung</label>
                                <select id="aeVatRate">
                                    ${[0.20, 0.13, 0.10, 0].map(r => `<option value="${r}" ${Math.abs((entwurf.vatRate ?? 0.20) - r) < 0.001 ? 'selected' : ''}>${(r * 100).toFixed(0)} %</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-card">
                            <div class="form-card-title">Rabatt</div>
                            <label class="ae-check"><input type="checkbox" id="aeDisc" ${entwurf.discountEnabled ? 'checked' : ''}> Gesamtrabatt gewähren</label>
                            <div class="form-group" style="max-width:200px;${entwurf.discountEnabled ? '' : 'display:none;'}" id="aeDiscBox">
                                <label>Rabatt in %</label>
                                <input type="text" inputmode="decimal" id="aeDiscRate" value="${((entwurf.discountRate ?? 0) * 100).toFixed(2).replace('.', ',')}">
                            </div>
                        </div>

                        <div class="form-group"><label>Anmerkung im Angebot</label><textarea id="aeNotes" rows="2">${escapeHtml(entwurf.notes || '')}</textarea></div>

                        <div class="ae-summe">
                            <div><span>Zwischensumme</span><strong>${formatCurrency(R.grossMaterial != null ? R.grossMaterial : R.net)}</strong></div>
                            ${R.globalDiscount > 0 ? `<div><span>Rabatt</span><strong>− ${formatCurrency(R.globalDiscount)}</strong></div>` : ''}
                            <div class="ae-summe-total"><span>Gesamtbetrag${entwurf.netMode ? ' (ohne USt.)' : ''}</span><strong>${formatCurrency(R.total)}</strong></div>
                            ${!entwurf.netMode ? `<div style="font-size:11px;color:var(--text-muted);"><span>darin enthaltene USt.</span><span>${formatCurrency(R.vatAmount)}</span></div>` : ''}
                        </div>
                    `;
                    binden();
                };

                const binden = () => {
                    document.querySelectorAll('.ae-f').forEach(el => {
                        el.addEventListener('change', () => {
                            const p = entwurf.positions[Number(el.dataset.i)];
                            if (!p) return;
                            const f = el.dataset.f;
                            const roh = el.value.trim();
                            if (['quantity', 'price', 'discount', 'purchasePriceNet'].includes(f)) {
                                if (roh === '') { if (f === 'purchasePriceNet') delete p[f]; else p[f] = 0; }
                                else {
                                    const n = parseFloat(roh.replace(',', '.'));
                                    if (!Number.isFinite(n)) { showToast('Bitte eine Zahl eingeben.', 'error'); return; }
                                    p[f] = n;
                                }
                            } else p[f] = el.value;
                            zeichnen();
                        });
                    });
                    const vat = document.querySelector('#aeVat');
                    if (vat) vat.addEventListener('change', () => { entwurf.vatEnabled = vat.checked; zeichnen(); });
                    const vr = document.querySelector('#aeVatRate');
                    if (vr) vr.addEventListener('change', () => { entwurf.vatRate = Number(vr.value); zeichnen(); });
                    const dc = document.querySelector('#aeDisc');
                    if (dc) dc.addEventListener('change', () => { entwurf.discountEnabled = dc.checked; zeichnen(); });
                    const dr = document.querySelector('#aeDiscRate');
                    if (dr) dr.addEventListener('change', () => {
                        const n = parseFloat(dr.value.replace(',', '.'));
                        if (!Number.isFinite(n) || n < 0 || n >= 100) { showToast('Rabatt muss zwischen 0 und 100 % liegen.', 'error'); return; }
                        entwurf.discountRate = n / 100; zeichnen();
                    });
                    const nt = document.querySelector('#aeNotes');
                    if (nt) nt.addEventListener('change', () => { entwurf.notes = nt.value; });
                };

                // Fuer die Knoepfe im gezeichneten HTML erreichbar machen
                app.__aeEntwurf = entwurf;
                app.__aeZeichnen = zeichnen;

                showModal(
                    'Angebot bearbeiten',
                    `<div id="aeInhalt"></div>`,
                    async (overlay) => {
                        if (!entwurf.positions.length) { showToast('Ein Angebot braucht mindestens eine Position.', 'error'); return; }
                        const nt = overlay.querySelector('#aeNotes');
                        if (nt) entwurf.notes = nt.value;
                        const R = recomputeOffer(entwurf);
                        Object.assign(entwurf, {
                            subtotal: R.net, netAfterDiscount: R.netAfter,
                            discountAmount: R.globalDiscount, vatAmount: R.vatAmount, totalPrice: R.total,
                            updatedAt: new Date().toISOString()
                        });
                        await db.put('offers', entwurf);
                        overlay.remove();
                        showToast(`${entwurf.offerNumber || 'Angebot'} aktualisiert – ${formatCurrency(R.total)}.`, 'success');
                        if (app.currentPage === 'offers') app.navigate('offers');
                    },
                    null, { wide: true }
                );
                setTimeout(zeichnen, 50);
            },

            // Schaltet das ganze Angebot zwischen "inklusive USt." und
            // "ohne USt." um. Die Positionspreise werden dabei EINMALIG
            // umgerechnet, damit die Summe tatsaechlich stimmt - genau das
            // hat vorher gefehlt: der Schalter aenderte nur das Etikett.
            aeSetzeModus(nettoModus) {
                const e = app.__aeEntwurf;
                if (!e || !!e.netMode === !!nettoModus) return;

                e.positions.forEach(p => {
                    const preis = Number(p.price) || 0;
                    if (nettoModus) {
                        // brutto -> netto. Mit dem Satz, der fuer DIESE Position
                        // bisher galt (Geraete 20 %, Arbeitsleistung nach Schalter).
                        if (p.priceIncludesVat) {
                            const satz = posVatRate(p, { ...e, netMode: false });
                            p.price = Math.round((preis / (1 + satz)) * 100) / 100;
                        }
                        p.priceIncludesVat = false;
                    } else {
                        // netto -> brutto zurueck
                        const satz = posVatRate(p, { ...e, netMode: false });
                        if (!p.priceIncludesVat) {
                            p.price = Math.round((preis * (1 + satz)) * 100) / 100;
                            p.priceIncludesVat = true;
                        }
                    }
                });
                e.netMode = !!nettoModus;
                app.__aeZeichnen();
            },

            aeLoeschen(i) {
                const e = app.__aeEntwurf;
                if (!e) return;
                e.positions.splice(i, 1);
                app.__aeZeichnen();
            },

            aeNeuePosition() {
                const e = app.__aeEntwurf;
                if (!e) return;
                // Neue Positionen folgen der App-Konvention: Endpreis inkl. USt.
                e.positions.push({ name: '', description: '', unit: 'Stk', quantity: 1, price: 0,
                    priceIncludesVat: true, discount: 0, category: 'Zubehör' });
                app.__aeZeichnen();
            },

            async aeAusKatalog() {
                const e = app.__aeEntwurf;
                if (!e) return;
                const materials = await db.getAll('materials');
                if (!materials.length) { showToast('Keine Materialien im Katalog.', 'info'); return; }
                showModal('Aus Katalog übernehmen', `
                    <div class="form-group"><label>Suchen</label><input type="text" id="akSuche" placeholder="Name oder Artikelnummer"></div>
                    <div id="akListe" class="ak-liste"></div>
                `, null);
                setTimeout(() => {
                    const liste = document.querySelector('#akListe');
                    const suche = document.querySelector('#akSuche');
                    const mal = () => {
                        const q = (suche.value || '').toLowerCase();
                        const treffer = materials.filter(m => !q ||
                            String(m.name || '').toLowerCase().includes(q) ||
                            String(m.articleNumber || '').toLowerCase().includes(q)).slice(0, 40);
                        liste.innerHTML = treffer.map(m => `<div class="ak-eintrag" data-id="${escapeHtml(String(m.id))}">
                            <div><strong>${escapeHtml(m.name || '')}</strong><br>
                            <span style="font-size:11px;color:var(--text-muted);">${escapeHtml([m.manufacturer, m.articleNumber, m.category].filter(Boolean).join(' · '))}</span></div>
                            <button class="btn btn-sm btn-primary">Übernehmen</button></div>`).join('') ||
                            '<div class="empty-note" style="padding:10px;">Nichts gefunden.</div>';
                        liste.querySelectorAll('.ak-eintrag').forEach(el => {
                            el.querySelector('button').addEventListener('click', () => {
                                const m = materials.find(x => String(x.id) === el.dataset.id);
                                if (!m) return;
                                // Preis aus dem Materialstamm uebernehmen, wie ihn die App
                                // sonst auch verwendet - keine eigene Preisrechnung hier.
                                const preis = (typeof matBrutto === 'function') ? matBrutto(m)
                                            : (Number(m.price) || 0);
                                e.positions.push({
                                    materialId: m.id, name: m.name || '',
                                    description: [m.manufacturer, m.articleNumber].filter(Boolean).join(' · '),
                                    unit: m.unit || 'Stk', quantity: 1,
                                    price: Math.round(preis * 100) / 100,
                                    priceIncludesVat: true, discount: 0,
                                    category: m.category || 'Zubehör'
                                });
                                document.querySelectorAll('.modal-overlay').forEach((o, i, arr) => { if (i === arr.length - 1) o.remove(); });
                                showToast('Position übernommen.', 'success');
                                app.__aeZeichnen();
                            });
                        });
                    };
                    suche.addEventListener('input', mal);
                    mal();
                }, 50);
            }
        });

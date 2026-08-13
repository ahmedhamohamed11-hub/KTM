

        // ============================================================
        // ============ DASHBOARD =====================================
        // ============================================================
        // ============================================================
        // SCHNELLRECHNER – Kühllast-Überschlag + Gerät aus Katalog + Richtpreis
        // ============================================================
        const CALC_STATE = window.__calcState || (window.__calcState = {
            rooms: [{ area: 30, windows: 4, dir: 'sued', shade: 'normal', persons: 2 }],
            building: 'normal', distance: 5, breakthrough: 1, ductLength: 4,
            outdoor: 'wand', demolish: false, scaffold: false, brand: '', showVat: true,
            // Direkt-Modus
            calcMode: 'direct',   // 'direct' | 'kuehlast'
            directKw: '2,5', directBrand: '', directLength: 5,
        });

        // Direkt-Modus: Konfiguration nach gewählter Leistung + Marke
        // Gibt Serien-Gruppen zurück (wie Katalog: pro Serie eine Tabelle)
        async function calcDirectCompute() {
            const S = CALC_STATE;
            const mats = await db.getAll('materials');
            const brand = S.directBrand || '';
            const len = Number(S.directLength) || 5;
            const norm = s => String(s||'').trim().toLowerCase();
            const kwOf = v => parseFloat(String(v||'').replace(',','.')) || 0;

            // Alle Single-Split Geräte (nach Marke gefiltert)
            const allSS = mats.filter(m => {
                const b = m.bauart||'';
                const isSS = b === 'Innengerät Single-Split' || b === 'Außengerät Single-Split' || b === 'Truhengerät' || b === 'Klimaset';
                return isSS && (!brand || norm(m.manufacturer) === norm(brand));
            });

            // Alle verfügbaren Marken (aus Single-Split Geräten)
            const availBrands = [...new Set(mats
                .filter(m => ['Innengerät Single-Split','Außengerät Single-Split','Truhengerät','Klimaset'].includes(m.bauart||''))
                .map(m => m.manufacturer).filter(Boolean)
            )].sort();

            // Alle verfügbaren Leistungen (aus gewählter Marke oder allen)
            const pool = brand ? allSS : mats.filter(m =>
                ['Innengerät Single-Split','Außengerät Single-Split','Truhengerät','Klimaset'].includes(m.bauart||''));
            const availKw = [...new Set(pool.map(m => m.size).filter(Boolean))]
                .sort((a,b) => kwOf(a) - kwOf(b));

            // Serien-Gruppen bauen (IG + AG zusammen, gruppiert nach series)
            // Für jede Leistungsstufe: alle IG finden, passendes AG suchen
            const igList = allSS.filter(m => m.bauart === 'Innengerät Single-Split');
            const agList = allSS.filter(m => m.bauart === 'Außengerät Single-Split');
            const truhenList = allSS.filter(m => m.bauart === 'Truhengerät' || m.bauart === 'Klimaset');

            // Serien aus IG ableiten
            const serienMap = {};
            igList.forEach(ig => {
                const serie = ig.series || ig.manufacturer || 'Unbekannt';
                const key = `${ig.manufacturer}|${serie}`;
                if (!serienMap[key]) serienMap[key] = { manufacturer: ig.manufacturer, serie, ig: [], ag: [] };
                serienMap[key].ig.push(ig);
            });
            // AG den Serien zuordnen (gleiche Serie oder gleiche Marke + ähnliche Leistung)
            agList.forEach(ag => {
                const serie = ag.series || ag.manufacturer || 'Unbekannt';
                const key = `${ag.manufacturer}|${serie}`;
                if (serienMap[key]) {
                    serienMap[key].ag.push(ag);
                } else {
                    // Zur Marken-Serien zuordnen wenn kein direkter Match
                    const mfrKey = Object.keys(serienMap).find(k => k.startsWith(ag.manufacturer + '|'));
                    if (mfrKey) serienMap[mfrKey].ag.push(ag);
                }
            });

            // Truhengeräte als eigene Serie
            if (truhenList.length) {
                const mfr = truhenList[0].manufacturer;
                const key = `${mfr}|Truhengerät`;
                serienMap[key] = { manufacturer: mfr, serie: 'Truhengerät', ig: truhenList, ag: [], isTruhe: true };
            }

            // Pro Serie: Zeilen bauen (IG + zugehöriges AG gleicher Leistung)
            const serien = Object.values(serienMap).map(s => {
                const zeilen = [];
                const usedAG = new Set();
                s.ig.forEach(ig => {
                    const ag = s.ag.find(a => !usedAG.has(a.id) && Math.abs(kwOf(a.size) - kwOf(ig.size)) < 0.35);
                    if (ag) usedAG.add(ag.id);
                    const igVK = Number(ig.sellingPrice) || 0;
                    const agVK = ag ? Number(ag.sellingPrice) || 0 : 0;
                    zeilen.push({ ig, ag: ag || null, igVK, agVK, setVK: igVK + agVK, kw: kwOf(ig.size) });
                });
                // AG ohne IG-Match anhängen
                s.ag.filter(a => !usedAG.has(a.id)).forEach(ag => {
                    zeilen.push({ ig: null, ag, igVK: 0, agVK: Number(ag.sellingPrice)||0, setVK: Number(ag.sellingPrice)||0, kw: kwOf(ag.size) });
                });
                zeilen.sort((a,b) => a.kw - b.kw);
                return { ...s, zeilen };
            }).filter(s => s.zeilen.length > 0)
              .sort((a,b) => a.manufacturer.localeCompare(b.manufacturer,'de') || a.serie.localeCompare(b.serie,'de'));

            // Montagepreise
            const montageBase      = Number(await getSetting('montageBase',       200)) || 200;
            const montagePerDevice = Number(await getSetting('montagePerDevice',  350)) || 350;
            const montagePerMeter  = Number(await getSetting('montagePerMeter',    25)) || 25;
            const nfMat = kw => mats.find(m => Number(m.sellingPrice) > 0 && norm(m.name).includes(kw));
            const kupferpreis = nfMat('kupfer')?.sellingPrice || 4.50;
            const kommupreis  = nfMat('kommunikation')?.sellingPrice || 1.20;
            const kondpreis   = nfMat('kondensat')?.sellingPrice || 1.80;
            const montage = montageBase + montagePerDevice + len * montagePerMeter;
            const leitungen = len * (kupferpreis + kommupreis + kondpreis);

            // Diagnose: warum ist die Liste leer? Zahlen aus den echten Daten,
            // damit im leeren Zustand nicht nur "nichts gefunden" dasteht.
            const KLIMA_B = ['Innengerät Single-Split','Außengerät Single-Split','Innengerät Multi-Split','Außengerät Multi-Split','Truhengerät','Klimaset'];
            const diag = {
                total: mats.length,
                mitBauart: mats.filter(m => KLIMA_B.includes(m.bauart || '')).length,
                ohneBauart: mats.filter(m => !m.bauart).length,
                klimaOhneBauart: mats.filter(m => !m.bauart && /klima/i.test(m.category || '')).length
            };

            return { serien, availBrands, availKw, brand, len, montage, leitungen, diag,
                     kupferpreis, kommupreis, kondpreis, montageBase, montagePerDevice, montagePerMeter };
        }

        function calcRoomLoad(r) {
            const bldFactor = { neu: 0.03, normal: 0.04, alt: 0.055 }[CALC_STATE.building] || 0.04;
            let base = (Number(r.area) || 0) * bldFactor;                 // Grundlast Gebäude (kW/m²)
            const dirF = { sued: 0.20, west: 0.16, ost: 0.12, nord: 0.05 }[r.dir] ?? 0.12;
            const shadeF = { keine: 1.0, normal: 0.6, stark: 0.35 }[r.shade] ?? 0.6;
            const sun = (Number(r.windows) || 0) * 0.09 * dirF / 0.15 * shadeF;   // Sonneneintrag über Glas
            const glass = (Number(r.windows) || 0) * 0.015;               // Transmission Fenster
            const persons = (Number(r.persons) || 0) * 0.09;             // 90 W je Person
            const sub = base + sun + glass + persons;
            const reserve = sub * 0.05;                                   // 5 % Reserve
            return {
                base: base, sun: sun, glass: glass, persons: persons, reserve: reserve,
                total: Math.round((sub + reserve) * 100) / 100
            };
        }

        // Nächstgrößeres Gerät aus dem eigenen Katalog (Innengerät) zur Last finden
        async function calcPickDevice(loadKw, brand) {
            const mats = await db.getAll('materials');
            const kwOf = v => parseFloat(String(v || '').replace(',', '.')) || 0;
            // WICHTIG (Datenqualitäts-Fund): früher wurden Innen-/Außengeräte NUR über
            // markenspezifische Namensmuster (MXM/AMW/RX../AS..EW) unterschieden. Das
            // gepflegte bauart-Feld ('Innengerät ...'/'Außengerät ...') wurde ignoriert -
            // dadurch galten z.B. sämtliche Samsung-, Daikin-Truhengerät-, LG-VRF- und
            // Hisense-Außengeräte fälschlich als "Innengerät" (keines der Muster passte),
            // und wurden dem Kunden im Schnellrechner als Innengerät vorgeschlagen. Das
            // bauart-Feld ist die zuverlässigste Quelle und hat jetzt Vorrang; die alten
            // Namensmuster bleiben nur als Fallback für Material ohne gepflegte Bauart.
            const isIndoor = m => {
                const bauart = (m.bauart || '').toLowerCase();
                if (bauart) return bauart.includes('innengerät');
                const nm = (m.name || '') + ' ' + (m.articleNumber || '');
                const notes = (m.notes || '').toLowerCase();
                if (/\b\d\s*(?:MXM|AMW)/i.test(nm) || /\bMU\s*\d\s*R/i.test(nm) || /\bR[XZ][A-Z]?\d/i.test(nm)) return false;
                return m.category === 'Innengeräte' || m.category === 'Klimageräte' || m.category === 'Klimaanlagen' || notes.includes('innengerät');
            };
            let pool = mats.filter(m => isIndoor(m) && kwOf(m.size) > 0 && Number(m.sellingPrice) > 0);
            if (brand) pool = pool.filter(m => (m.manufacturer || '') === brand);
            if (!pool.length) return null;
            const covering = pool.filter(m => kwOf(m.size) >= loadKw - 0.1).sort((a, b) => kwOf(a.size) - kwOf(b.size));
            return covering[0] || pool.sort((a, b) => kwOf(b.size) - kwOf(a.size))[0];
        }

        // Passendes AUSSENGERÄT: Single-Split (1 Raum) oder Multi-Split (mehrere Räume)
        async function calcPickOutdoor(igCount, totalLoad, brand) {
            const mats = await db.getAll('materials');
            const kwOf = v => parseFloat(String(v || '').replace(',', '.')) || 0;
            const maxIG = (m) => {
                const n = String(m.notes || ''); const mn = n.match(/max\.?\s*(\d+)\s*IG/i); if (mn) return parseInt(mn[1], 10);
                const nm = ((m.name || '') + ' ' + (m.articleNumber || '')).toUpperCase();
                const mm = nm.match(/\b(\d)\s*(?:MXM|AMW)/) || nm.match(/\bMU\s*(\d)\s*R/) || nm.match(/\bAJ\d+TXJ(\d)/);
                return mm ? parseInt(mm[1], 10) : 0;
            };
            // Wie bei isIndoor(): bauart-Feld hat Vorrang vor den brüchigen Namensmustern
            // (siehe Kommentar bei isIndoor oben - derselbe Datenqualitäts-Fund).
            const isOutdoor = (m) => {
                const bauart = (m.bauart || '').toLowerCase();
                if (bauart) return bauart.includes('außengerät') || bauart.includes('aussengerät');
                const nm = ((m.name || '') + ' ' + (m.articleNumber || '')).toUpperCase();
                const notes = (m.notes || '').toLowerCase();
                if (/\b\d\s*(?:MXM|AMW)/.test(nm) || /\bMU\s*\d\s*R/.test(nm) || /\bR[XZ][A-Z]?\d/.test(nm) || /\bAS\d.*EW\b/.test(nm) || /\bAJ\d+TXJ/.test(nm)) return true;
                if (notes.includes('außengerät') || notes.includes('aussengerät') || notes.includes('multi-split-ag')) return true;
                return m.category === 'Außengeräte' || m.category === 'Klimaanlagen';
            };
            let pool = mats.filter(m => isOutdoor(m) && Number(m.sellingPrice) > 0);
            if (brand) { const b = pool.filter(m => (m.manufacturer || '') === brand); if (b.length) pool = b; }
            if (!pool.length) return null;

            if (igCount <= 1) {
                // Single-Split-Außengerät, das die Last deckt
                const singles = pool.filter(m => maxIG(m) <= 1 && kwOf(m.size) > 0);
                const covering = singles.filter(m => kwOf(m.size) >= totalLoad - 0.3).sort((a, b) => kwOf(a.size) - kwOf(b.size));
                return covering[0] || singles.sort((a, b) => kwOf(b.size) - kwOf(a.size))[0] || null;
            }
            // Multi-Split: genug Anschlüsse UND genug Gesamtleistung, kleinstes passendes zuerst
            const multis = pool.filter(m => maxIG(m) >= igCount);
            const covering = multis.filter(m => kwOf(m.size) >= totalLoad - 0.5)
                .sort((a, b) => maxIG(a) - maxIG(b) || kwOf(a.size) - kwOf(b.size));
            return covering[0] || multis.sort((a, b) => maxIG(a) - maxIG(b) || kwOf(b.size) - kwOf(a.size))[0] || null;
        }

        // Montage-/Zusatzpauschalen aus den Einstellungen (mit Fallback-Richtwerten)
        async function calcRates() {
            const g = async (k, d) => parseFloat(String(await getSetting(k, d)).replace(',', '.')) || parseFloat(d);
            return {
                montageBase: await g('rateMontageBase', '380'),
                montagePerRoom: await g('rateMontagePerRoom', '180'),
                leitungPerM: await g('rateLeitungPerM', '22'),
                durchbruch: await g('rateDurchbruch', '90'),
                demontage: await g('rateDemontage', '120'),
                geruest: await g('rateGeruest', '140'),
                vat: (await g('rateVat', '20')) / 100
            };
        }

        async function calcCompute() {
            const RATES = await calcRates();
            const rooms = [];
            let sumLoad = 0;
            for (const r of CALC_STATE.rooms) {
                const load = calcRoomLoad(r);
                const dev = await calcPickDevice(load.total, CALC_STATE.brand);
                rooms.push({ r, load, dev });
                sumLoad += load.total;
            }
            const multi = rooms.length > 1;
            const outdoor = await calcPickOutdoor(rooms.length, sumLoad, CALC_STATE.brand);
            const geraeteSum = rooms.reduce((s, x) => s + (Number(x.dev?.sellingPrice) || 0), 0) + (Number(outdoor?.sellingPrice) || 0);
            const montage = RATES.montageBase + RATES.montagePerRoom * rooms.length;
            const leitungen = (Number(CALC_STATE.distance) || 0) * RATES.leitungPerM * rooms.length + (Number(CALC_STATE.ductLength) || 0) * 6;
            const durchbruch = (Number(CALC_STATE.breakthrough) || 0) * RATES.durchbruch;
            const extra = (CALC_STATE.demolish ? RATES.demontage : 0) + (CALC_STATE.scaffold ? RATES.geruest : 0);
            const net = geraeteSum + montage + leitungen + durchbruch + extra;
            const vat = net * RATES.vat;
            return {
                rooms, sumLoad: Math.round(sumLoad * 10) / 10, multi, outdoor,
                geraeteSum, montage, leitungen, durchbruch, extra, vatRate: RATES.vat, showVat: CALC_STATE.showVat !== false,
                net: Math.round(net), vat: Math.round(vat), brutto: Math.round(net + vat),
                low: Math.round((net + vat) * 0.92), high: Math.round((net + vat) * 1.12)
            };
        }

        function renderCalc() {
            (async () => {
                const S = CALC_STATE;
                const cur = v => formatCurrency(v);
                const allMats = await db.getAll('materials');

                // ── DIREKT-MODUS ─────────────────────────────────────────
                if (S.calcMode !== 'kuehlast') {
                    const D = await calcDirectCompute();
                    const kwOf = v => parseFloat(String(v||'').replace(',','.')) || 0;
                    // Falls keine Leistung gewählt → keine Filterung nötig (alle Serien zeigen)

                    // Serien-Tabellen wie im Katalog
                    const serienHtml = D.serien.length ? D.serien.map(serie => {
                        const sid = `${serie.manufacturer}_${serie.serie}`.replace(/\W/g,'_');
                        // Preise aus State (editierbar)
                        if (!S.directPrices) S.directPrices = {};
                        if (!S.directDiscount) S.directDiscount = {};
                        if (!S.directVat) S.directVat = {};

                        const tabellenZeilen = serie.zeilen.map((z, zi) => {
                            const rowId = `${sid}_${zi}`;
                            if (!S.directPrices[rowId]) S.directPrices[rowId] = {
                                igVK: z.igVK, agVK: z.agVK,
                                mo: +(D.montage).toFixed(2),
                                le: +(D.leitungen).toFixed(2)
                            };
                            if (!S.directDiscount[rowId]) S.directDiscount[rowId] = {pct:0};
                            if (!S.directVat[rowId]) S.directVat[rowId] = {on:true};
                            const P = S.directPrices[rowId];
                            const disc = (Number(S.directDiscount[rowId]?.pct)||0) / 100;
                            const vat  = S.directVat[rowId]?.on ? 0.20 : 0;
                            const igN  = P.igVK * (1-disc);
                            const agN  = P.agVK * (1-disc);
                            const setN = igN + agN;
                            const setB = setN * (1+vat);

                            const inp = (field, val, w='70px') =>
                                `<input type="number" step="0.01" min="0" value="${(Number(val)||0).toFixed(2)}"
                                 onchange="app.calcDirectSetPrice('${rowId}','${field}',this.value)"
                                 style="width:${w};text-align:right;font-size:12px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;background:var(--bg-tertiary);">`;

                            const igRow = z.ig ? `<tr class="cdc-row-ig">
                                <td>${escapeHtml(z.ig.articleNumber||'')}</td>
                                <td>Inneneinheit</td>
                                <td>${escapeHtml(z.ig.size||'')} kW</td>
                                <td class="num">${inp('igVK', P.igVK)}</td>
                                <td class="num" rowspan="2" style="vertical-align:middle;font-weight:700;color:var(--accent);font-size:14px;">
                                    ${vat > 0 ? formatCurrency(setB)+'<div style="font-size:10px;font-weight:400;color:var(--text-muted);">inkl. 20% MwSt</div>' : formatCurrency(setN)}
                                    <div style="margin-top:6px;">
                                        ${z.ig && z.ag ? `<button class="btn btn-primary btn-sm" style="font-size:11px;padding:4px 8px;" onclick="app.calcDirectToOffer('${z.ig.id}','${z.ag?.id||''}','${rowId}')">→ Übernehmen</button>` : ''}
                                    </div>
                                </td>
                            </tr>` : '';

                            const agRow = z.ag ? `<tr class="cdc-row-ag">
                                <td>${escapeHtml(z.ag.articleNumber||'')}</td>
                                <td>Außeneinheit</td>
                                <td>${escapeHtml(z.ag.size||'')} kW</td>
                                <td class="num">${inp('agVK', P.agVK)}</td>
                            </tr>` : '';

                            return igRow + agRow;
                        }).join(`<tr class="cdc-row-sep"><td colspan="5"></td></tr>`);

                        // Rabatt + MwSt für diese Serie (global)
                        const firstRowId = `${sid}_0`;
                        const serieDisc = S.directDiscount[firstRowId]?.pct || 0;
                        const serieVat  = S.directVat[firstRowId]?.on !== false;

                        return `<div class="cdc-serie">
                            <div class="cdc-serie-head">
                                <div>
                                    <span class="cdc-mfr">${escapeHtml(serie.manufacturer)}</span>
                                    <span class="cdc-serie-name">${escapeHtml(serie.isTruhe ? 'Truhengerät' : serie.serie)}</span>
                                </div>
                                <div class="cdc-serie-opts">
                                    <label style="font-size:12px;display:flex;align-items:center;gap:5px;">
                                        Rabatt <input type="number" min="0" max="100" step="1" value="${serieDisc}"
                                        onchange="app.calcDirectSetSerieDiscount('${sid}',${serie.zeilen.length},this.value)"
                                        style="width:44px;text-align:right;font-size:12px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;"> %
                                    </label>
                                    <label style="font-size:12px;display:flex;align-items:center;gap:5px;margin-left:10px;">
                                        <input type="checkbox" ${serieVat?'checked':''} onchange="app.calcDirectSetSerieVat('${sid}',${serie.zeilen.length},this.checked)">
                                        20% MwSt
                                    </label>
                                </div>
                            </div>
                            <div class="cdc-table-wrap">
                                <table class="cdc-table">
                                    <thead><tr>
                                        <th>Modell</th>
                                        <th>Art</th>
                                        <th>kW</th>
                                        <th class="num">Einzelpreis</th>
                                        <th class="num">Setpreis</th>
                                    </tr></thead>
                                    <tbody>${tabellenZeilen}</tbody>
                                </table>
                            </div>
                        </div>`;
                    }).join('') : (() => {
                        const d = D.diag || {};
                        if (!d.total) {
                            return `<div class="empty-state" style="padding:30px;">
                                Noch keine Materialien angelegt.<br>
                                <small style="color:var(--text-muted);">Menü → Katalog importieren.</small>
                            </div>`;
                        }
                        if (d.ohneBauart) {
                            return `<div class="empty-state" style="padding:24px;text-align:left;">
                                <div style="font-weight:600;margin-bottom:8px;">Kein passendes Gerät gefunden.</div>
                                <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">
                                    Du hast <strong>${d.total}</strong> Materialien.<br>
                                    Davon haben <strong>${d.mitBauart}</strong> eine Bauart (Innengerät / Außengerät / Set).<br>
                                    <strong>${d.ohneBauart}</strong> haben keine – die kann der Rechner nicht zuordnen.
                                </div>
                                <button type="button" class="btn btn-primary" style="margin-top:14px;width:100%;"
                                    onclick="app.repairBauart()">Bauart aus Katalog nachtragen</button>
                                <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">
                                    Ändert nur die Bauart. Preise, Bestand und Bilder bleiben unangetastet.
                                </div>
                            </div>`;
                        }
                        return `<div class="empty-state" style="padding:24px;text-align:left;">
                            <div style="font-weight:600;margin-bottom:8px;">Kein passendes Gerät gefunden.</div>
                            <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">
                                ${d.total} Materialien, davon ${d.mitBauart} mit Bauart – aber keine Single-Split-Serie
                                ${D.brand ? 'für ' + escapeHtml(D.brand) : ''} bildbar.
                            </div>
                        </div>`;
                    })();

                    contentArea.innerHTML = `<div class="calc-wrap">
                        <div class="calc-mode-tabs">
                            <button class="calc-mode-tab active" onclick="">⚡ Direkt-Konfiguration</button>
                            <button class="calc-mode-tab" onclick="app.calcSetGlobal('calcMode','kuehlast');renderCalc()">🏠 Kühllast-Rechner</button>
                        </div>
                        <div class="calc-direct-form">
                            <div class="form-row" style="gap:12px;flex-wrap:wrap;align-items:flex-end;">
                                <div class="form-group" style="min-width:160px;">
                                    <label>Marke</label>
                                    <select onchange="app.calcSetGlobal('directBrand',this.value);renderCalc()">
                                        <option value="">Alle Marken</option>
                                        ${D.availBrands.map(b => `<option value="${escapeHtml(b)}" ${b===S.directBrand?'selected':''}>${escapeHtml(b)}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group" style="min-width:120px;">
                                    <label>Leitungslänge (m)</label>
                                    <input type="number" min="1" max="50" value="${S.directLength}"
                                        onchange="app.calcSetGlobal('directLength',this.value);renderCalc()">
                                </div>
                            </div>
                            <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
                                Preise direkt in der Tabelle bearbeitbar · Rabatt und MwSt pro Serie einstellbar
                            </div>
                        </div>
                        <div class="cdc-serien">${serienHtml}</div>
                        <div class="calc-note" style="margin-top:12px;font-size:12px;color:var(--text-muted);">
                            Richtwerte – finaler Preis nach Besichtigung.
                        </div>
                    </div>`;
                    return;
                }

                // ── KÜHLLAST-MODUS (bestehend) ────────────────────────────
                const brands = [...new Set(allMats
                    .filter(m => (m.category === 'Klimageräte' || m.category === 'Klimaanlagen' || m.category === 'Innengeräte') && m.manufacturer).map(m => m.manufacturer))].sort();
                const res = await calcCompute();
                // S und cur bereits oben definiert

                const roomCard = (r, i) => `
                    <div class="calc-room">
                        <div class="calc-room-head">Raum ${i + 1}${S.rooms.length > 1 ? ` <button class="calc-x" onclick="app.calcDelRoom(${i})">✕</button>` : ''}</div>
                        <div class="form-row">
                            <div class="form-group"><label>Fläche (m²)</label><input type="number" min="1" value="${r.area}" onchange="app.calcSet(${i},'area',this.value)"></div>
                            <div class="form-group"><label>Fenster (Anzahl)</label><input type="number" min="0" value="${r.windows}" onchange="app.calcSet(${i},'windows',this.value)"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Fensterrichtung</label><select onchange="app.calcSet(${i},'dir',this.value)">
                                ${[['sued','Süd'],['west','West'],['ost','Ost'],['nord','Nord']].map(([v,l])=>`<option value="${v}" ${r.dir===v?'selected':''}>${l}</option>`).join('')}
                            </select></div>
                            <div class="form-group"><label>Verschattung</label><select onchange="app.calcSet(${i},'shade',this.value)">
                                ${[['keine','Keine'],['normal','Normal'],['stark','Stark (Rollläden)']].map(([v,l])=>`<option value="${v}" ${r.shade===v?'selected':''}>${l}</option>`).join('')}
                            </select></div>
                        </div>
                        <div class="form-group"><label>Personen</label><input type="number" min="0" value="${r.persons}" onchange="app.calcSet(${i},'persons',this.value)"></div>
                        <div class="calc-room-result">
                            Kühllast: <strong>${res.rooms[i].load.total.toFixed(1).replace('.', ',')} kW</strong>
                            ${res.rooms[i].dev ? ` → <span class="calc-dev">${escapeHtml(res.rooms[i].dev.name)} · ${escapeHtml(res.rooms[i].dev.size)} · ${cur(res.rooms[i].dev.sellingPrice)}</span>` : ' → <span style="color:var(--warning);">kein passendes Gerät im Katalog</span>'}
                        </div>
                    </div>`;

                contentArea.innerHTML = `
                    <div class="calc-wrap">
                        <div class="calc-mode-tabs">
                            <button class="calc-mode-tab" onclick="app.calcSetGlobal('calcMode','direct');renderCalc()">⚡ Direkt-Konfiguration</button>
                            <button class="calc-mode-tab active" onclick="">🏠 Kühllast-Rechner</button>
                        </div>
                        <div class="calc-form">
                            <div class="form-card">
                                <div class="form-card-title">🏠 Objekt</div>
                                <div class="form-row">
                                    <div class="form-group"><label>Gebäudezustand</label><select onchange="app.calcSetGlobal('building',this.value)">
                                        ${[['neu','Neubau / sehr gut'],['normal','Saniert / normal'],['alt','Altbau / unsaniert']].map(([v,l])=>`<option value="${v}" ${S.building===v?'selected':''}>${l}</option>`).join('')}
                                    </select></div>
                                    <div class="form-group"><label>Marke (optional)</label><select onchange="app.calcSetGlobal('brand',this.value)">
                                        <option value="">Beste aus Katalog</option>
                                        ${brands.map(b=>`<option value="${escapeHtml(b)}" ${S.brand===b?'selected':''}>${escapeHtml(b)}</option>`).join('')}
                                    </select></div>
                                </div>
                            </div>
                            ${S.rooms.map(roomCard).join('')}
                            <button class="btn btn-outline btn-sm" onclick="app.calcAddRoom()" style="margin-bottom:14px;">${icon('plus')} Weiterer Raum</button>
                            <div class="form-card">
                                <div class="form-card-title">🔧 Montage</div>
                                <div class="form-row">
                                    <div class="form-group"><label>Entfernung innen↔außen (m)</label><input type="number" min="0" value="${S.distance}" onchange="app.calcSetGlobal('distance',this.value)"></div>
                                    <div class="form-group"><label>Kabelkanal sichtbar (m)</label><input type="number" min="0" value="${S.ductLength}" onchange="app.calcSetGlobal('ductLength',this.value)"></div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group"><label>Wanddurchbrüche</label><input type="number" min="0" value="${S.breakthrough}" onchange="app.calcSetGlobal('breakthrough',this.value)"></div>
                                    <div class="form-group"><label>Außengerät</label><select onchange="app.calcSetGlobal('outdoor',this.value)">
                                        ${[['wand','Wandmontage'],['boden','Bodenaufstellung'],['balkon','Balkon / Terrasse'],['dach','Dach']].map(([v,l])=>`<option value="${v}" ${S.outdoor===v?'selected':''}>${l}</option>`).join('')}
                                    </select></div>
                                </div>
                                <label class="calc-check"><input type="checkbox" ${S.demolish?'checked':''} onchange="app.calcSetGlobal('demolish',this.checked)"> Altgerät demontieren & entsorgen</label>
                                <label class="calc-check"><input type="checkbox" ${S.scaffold?'checked':''} onchange="app.calcSetGlobal('scaffold',this.checked)"> Gerüst / Arbeit in Höhe nötig</label>
                                <label class="calc-check"><input type="checkbox" ${S.showVat?'checked':''} onchange="app.calcSetGlobal('showVat',this.checked)"> MwSt. anzeigen (Preis inkl. USt.)</label>
                            </div>
                        </div>

                        <div class="calc-result">
                            <div class="calc-headline">
                                <div class="calc-price-big">${cur(res.showVat ? res.brutto : res.net)}</div>
                                <div class="calc-price-range">${res.showVat ? `ca. ${cur(res.low)} bis ${cur(res.high)}` : 'zzgl. MwSt.'}</div>
                                <div class="calc-badges">
                                    <span class="calc-badge">Empfehlung: <strong>${res.multi ? 'Multi-Split' : 'Single-Split'}</strong></span>
                                    <span class="calc-badge">Raumlast gesamt: <strong>${res.sumLoad.toFixed(1).replace('.', ',')} kW</strong></span>
                                </div>
                            </div>
                            <div class="calc-lines">
                                <div class="calc-line"><span class="calc-line-label">Innengeräte (${res.rooms.length})</span><span class="calc-line-price">${cur(res.rooms.reduce((s, x) => s + (Number(x.dev?.sellingPrice) || 0), 0))}</span></div>
                                <div class="calc-line"><span class="calc-line-label">${res.multi ? 'Multi-Außengerät' : 'Außengerät'}${res.outdoor ? ' · ' + escapeHtml(res.outdoor.name) : ''}</span><span class="calc-line-price">${res.outdoor ? cur(res.outdoor.sellingPrice) : '<span style="color:var(--warning);">fehlt im Katalog</span>'}</span></div>
                                <div class="calc-line"><span class="calc-line-label">Montage & Inbetriebnahme</span><span class="calc-line-price">${cur(res.montage)}</span></div>
                                <div class="calc-line"><span class="calc-line-label">Leitungen & Kabelkanal</span><span class="calc-line-price">${cur(res.leitungen)}</span></div>
                                <div class="calc-line"><span class="calc-line-label">Wanddurchbruch</span><span class="calc-line-price">${cur(res.durchbruch)}</span></div>
                                ${res.extra ? `<div class="calc-line"><span class="calc-line-label">Zusatzleistungen</span><span class="calc-line-price">${cur(res.extra)}</span></div>` : ''}
                                <div class="calc-line calc-line-sum"><span class="calc-line-label">${res.showVat ? 'Richtpreis netto' : 'Unverbindlicher Richtpreis (netto)'}</span><span class="calc-line-price">${cur(res.net)}</span></div>
                                ${res.showVat ? `<div class="calc-line"><span class="calc-line-label">USt. ${Math.round((res.vatRate || 0.2) * 100)} %</span><span class="calc-line-price">${cur(res.vat)}</span></div>` : ''}
                                ${res.showVat ? `<div class="calc-line calc-line-total"><span class="calc-line-label">Unverbindlicher Richtpreis</span><span class="calc-line-price">${cur(res.brutto)}</span></div>` : ''}
                            </div>
                            <div class="calc-actions">
                                <button class="btn btn-primary" onclick="app.calcToOffer()">${icon('file')} Als Projekt übernehmen</button>
                                <button class="btn btn-outline" onclick="app.calcAiMaterials()">🧰 Materialliste</button>
                                <button class="btn btn-outline" onclick="app.calcCopy()">📋 Zusammenfassung kopieren</button>
                                <button class="btn btn-outline" onclick="app.calcReset()">Neu starten</button>
                            </div>
                            <div id="calcAiBox" class="calc-ai-box"></div>
                            <div class="calc-note">Der finale Preis wird nach Besichtigung bestätigt. Richtwerte für Kühllast, Montage und U-Wert. <span style="opacity:0.6;">· Build v90</span></div>
                        </div>
                    </div>`;
            })();
        }

        function renderDashboard() {
            (async () => {
                try {
                const customers = await db.getAll('customers');
                const projects = await db.getAll('projects');
                const offers = await db.getAll('offers');
                const orders = await db.getAll('orders');
                const events = await db.getAll('events');
                const invoices = await db.getAll('invoices');
                const materialsAll = await db.getAll('materials');
                const equipment = await db.getAll('equipment');
                const maintenance = await db.getAll('maintenance');

                const offeneProjekte = projects.filter(p => !['Fertig', 'Archiv'].includes(p.status)).length;
                const offeneAngebote = offers.filter(o => !['Auftrag erhalten', 'Abgelehnt'].includes(o.status)).length;
                const offeneBestellungen = orders.filter(o => !['Geliefert', 'Storniert'].includes(o.status)).length;
                const todayStr = toLocalDateString(new Date());
                const heutigeTermine = events.filter(ev => ev.date === todayStr).length;
                const umsatz = offers
                    .filter(o => ['Auftrag erhalten'].includes(o.status))
                    .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

                document.getElementById('customerCount').textContent = customers.length;
                document.getElementById('projectCount').textContent = projects.length;
                refreshBellDot(); refreshAvatar();

                // Nächste 7 Tage
                const in7 = new Date(); in7.setDate(in7.getDate() + 7);
                const in7Str = toLocalDateString(in7);
                const next7 = events
                    .filter(ev => ev.date >= todayStr && ev.date <= in7Str)
                    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
                    .slice(0, 6);

                // Kürzliche Aktivitäten
                const acts = [
                    ...customers.map(c => ({ t: 'Kunde', title: `${c.firstName || ''} ${c.lastName || ''}`.trim(), at: c.updatedAt || c.createdAt, link: 'customers', id: null })),
                    ...projects.map(p => ({ t: 'Projekt', title: p.title || 'Unbenannt', at: p.updatedAt || p.createdAt, link: 'projects', id: p.id })),
                    ...offers.map(o => ({ t: 'Angebot', title: o.offerNumber || 'Angebot', at: o.updatedAt || o.createdAt, link: 'offers', id: null })),
                    ...orders.map(o => ({ t: 'Bestellung', title: o.supplier || 'Bestellung', at: o.updatedAt || o.createdAt, link: 'orders', id: null }))
                ].filter(a => a.at).sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 6);

                const overdue = invoices.filter(inv => invoiceStatus(inv) === 'Überfällig');
                const overdueSum = overdue.reduce((s, inv) => s + invoiceOpen(inv), 0);

                // Fällige Wartungen (nächster Termin <= heute+30 Tage)
                const now = new Date();
                const in30 = new Date(); in30.setDate(in30.getDate() + 30);
                const mntDue = maintenance.filter(m => m.nextDue && new Date(m.nextDue) <= in30);
                const mntOver = mntDue.filter(m => new Date(m.nextDue) < now);

                // Überfällige/fällige F-Gase-Dichtheitsprüfungen
                const F = window.KTM_FGAS;
                let fgasDue = 0, fgasOver = 0;
                if (F) {
                    equipment.forEach(e => {
                        const t = F.co2eq(e.refrigerant, e.fillKg);
                        const due = F.nextCheckDate(e.lastLeakCheck, t);
                        if (due) {
                            if (due < now) fgasOver++;
                            else if (due <= in30) fgasDue++;
                        }
                    });
                }

                // Angebote ohne Antwort (verschickt vor > 7 Tagen, noch offen)
                const offenStatus = (s) => !['Auftrag erhalten', 'Abgelehnt', 'Storniert'].includes(s || 'Angebot offen');
                const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 7);
                const pendingOffers = offers.filter(o => offenStatus(o.status) && new Date(o.createdAt || 0) < sevenAgo);

                // Offene Anzahlungen / Restbeträge (vereinbart − Anzahlung > 0, wenn Anzahlung erfasst)
                const openDeposits = offers.filter(o => {
                    const dep = Number(o.depositAmount) || 0;
                    if (dep <= 0) return false;
                    const agreed = (o.agreedPrice != null && o.agreedPrice !== '') ? Number(o.agreedPrice) : Number(o.totalPrice || 0);
                    return (agreed - dep) > 0.5;
                });
                const openDepositsSum = openDeposits.reduce((s, o) => {
                    const dep = Number(o.depositAmount) || 0;
                    const agreed = (o.agreedPrice != null && o.agreedPrice !== '') ? Number(o.agreedPrice) : Number(o.totalPrice || 0);
                    return s + Math.max(0, agreed - dep);
                }, 0);

                // To-do-Zeilen zusammenstellen (nur was wirklich ansteht)
                const todos = [];
                if (overdue.length) todos.push({ cls: 'over', icon: '⚠️', title: `${overdue.length} überfällige Rechnung${overdue.length !== 1 ? 'en' : ''}`, sub: `offen ${formatCurrency(overdueSum)} · zum Mahnen tippen`, link: 'invoices' });
                if (pendingOffers.length) todos.push({ cls: 'soon', icon: '📨', title: `${pendingOffers.length} Angebot${pendingOffers.length !== 1 ? 'e' : ''} ohne Antwort`, sub: 'seit über 1 Woche verschickt · nachhaken', link: 'offers' });
                if (mntOver.length || mntDue.length) todos.push({ cls: mntOver.length ? 'over' : 'soon', icon: '🔧', title: mntOver.length ? `${mntOver.length} Wartung${mntOver.length !== 1 ? 'en' : ''} überfällig` : `${mntDue.length} Wartung${mntDue.length !== 1 ? 'en' : ''} fällig`, sub: 'zum Öffnen tippen', link: 'maintenance' });
                if (fgasOver || fgasDue) todos.push({ cls: fgasOver ? 'over' : 'soon', icon: '🧊', title: fgasOver ? `${fgasOver} F-Gase-Prüfung${fgasOver !== 1 ? 'en' : ''} überfällig` : `${fgasDue} F-Gase-Prüfung${fgasDue !== 1 ? 'en' : ''} bald fällig`, sub: 'Dichtheitsprüfung · tippen für Anlagen', link: 'equipment' });
                if (openDeposits.length) todos.push({ cls: 'info', icon: '💶', title: `${openDeposits.length} offene${openDeposits.length !== 1 ? '' : 'r'} Restbetrag${openDeposits.length !== 1 ? '¨e' : ''}`.replace('¨e', 'e'), sub: `noch ${formatCurrency(openDepositsSum)} ausständig · tippen`, link: 'offers' });

                contentArea.innerHTML = `
                    ${todos.length ? `<div class="todo-center">
                        <div class="todo-head">Das steht an</div>
                        ${todos.map(t => `<div class="todo-item ${t.cls}" onclick="app.navigate('${t.link}')">
                            <span class="todo-ico">${t.icon}</span>
                            <div class="todo-txt"><strong>${t.title}</strong><span>${t.sub}</span></div>
                            <span class="todo-arrow">›</span>
                        </div>`).join('')}
                    </div>` : `<div class="todo-center todo-clear">
                        <span class="todo-ico">✅</span>
                        <div class="todo-txt"><strong>Alles erledigt</strong><span>Keine offenen Rechnungen, Wartungen oder Angebote.</span></div>
                    </div>`}
                    <div class="stat-grid">
                        <div class="stat-card" onclick="app.navigate('customers')" style="cursor:pointer;">
                            <div class="stat-ico ico-teal">${icon('users')}</div>
                            <div class="stat-label">Kunden</div>
                            <div class="stat-value">${customers.length}</div>
                        </div>
                        <div class="stat-card" onclick="app.navigate('projects')" style="cursor:pointer;">
                            <div class="stat-ico ico-green">${icon('briefcase')}</div>
                            <div class="stat-label">Offene Projekte</div>
                            <div class="stat-value">${offeneProjekte}</div>
                        </div>
                        <div class="stat-card" onclick="app.navigate('offers')" style="cursor:pointer;">
                            <div class="stat-ico ico-amber">${icon('file')}</div>
                            <div class="stat-label">Offene Angebote</div>
                            <div class="stat-value">${offeneAngebote}</div>
                        </div>
                        <div class="stat-card" onclick="app.navigate('orders')" style="cursor:pointer;">
                            <div class="stat-ico ico-blue">${icon('cart')}</div>
                            <div class="stat-label">Offene Bestellungen</div>
                            <div class="stat-value">${offeneBestellungen}</div>
                        </div>
                        <div class="stat-card" onclick="app.navigate('equipment')" style="cursor:pointer;">
                            <div class="stat-ico ico-teal">🧊</div>
                            <div class="stat-label">Anlagen</div>
                            <div class="stat-value">${equipment.length}</div>
                        </div>
                        <div class="stat-card" onclick="app.navigate('calendar')" style="cursor:pointer;">
                            <div class="stat-ico ico-red">${icon('calendar')}</div>
                            <div class="stat-label">Heutige Termine</div>
                            <div class="stat-value">${heutigeTermine}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-ico ico-green">${icon('euro')}</div>
                            <div class="stat-label">Gesamtumsatz</div>
                            <div class="stat-value" style="font-size:20px;">${formatCurrency(umsatz)}</div>
                        </div>
                        <div class="stat-card" onclick="app.navigate('invoices')" style="cursor:pointer;">
                            <div class="stat-ico ico-amber">🧾</div>
                            <div class="stat-label">Offene Rechnungen</div>
                            <div class="stat-value" style="font-size:20px;">${formatCurrency(invoices.reduce((s, inv) => invoiceStatus(inv) === 'Storniert' ? s : s + invoiceOpen(inv), 0))}</div>
                        </div>
                    </div>
                    ${(() => {
                        const low = materialsAll.filter(m => m.minStock > 0 && (Number(m.stock) || 0) < Number(m.minStock));
                        return low.length ? `<div class="warn-banner" onclick="app.navigate('materials')">⚠ <strong>${low.length} Material${low.length > 1 ? 'ien' : ''} unter Mindestbestand:</strong> ${low.slice(0, 4).map(m => escapeHtml(m.name)).join(', ')}${low.length > 4 ? ' …' : ''} – jetzt nachbestellen</div>` : '';
                    })()}

                    <div class="panel-title">${icon('activity')} Schnellzugriff</div>
                    <div class="quick-grid">
                        <div class="quick-card" onclick="app.openCustomerModal()">
                            <div class="qc-title">Neuer Kunde</div>
                            <div class="qc-sub">Kundenprofil anlegen</div>
                        </div>
                        <div class="quick-card" onclick="app.openProjectModal()">
                            <div class="qc-title">Neues Projekt</div>
                            <div class="qc-sub">Auftrag erfassen</div>
                        </div>
                        <div class="quick-card" onclick="app.createOfferFlow()">
                            <div class="qc-title">Angebot erstellen</div>
                            <div class="qc-sub">Kostenvoranschlag</div>
                        </div>
                        <div class="quick-card" onclick="app.openOrderModal()">
                            <div class="qc-title">Material bestellen</div>
                            <div class="qc-sub">Teile ordern</div>
                        </div>
                    </div>

                    <div class="panel" style="margin-top:22px;">
                        <div class="panel-title">📊 Umsatz – letzte 6 Monate <span style="font-weight:500;color:var(--text-muted);font-size:12px;margin-left:6px;">bezahlte Rechnungen + erhaltene Aufträge</span></div>
                        ${(() => {
                            const now = new Date();
                            const months = [];
                            for (let i = 5; i >= 0; i--) {
                                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('de-DE', { month: 'short' }), sum: 0 });
                            }
                            const bucket = (dateStr, amount) => {
                                if (!dateStr || !amount) return;
                                const k = String(dateStr).slice(0, 7);
                                const m = months.find(x => x.key === k);
                                if (m) m.sum += Number(amount) || 0;
                            };
                            for (const inv of invoices) for (const p of (inv.payments || [])) bucket(p.date, p.amount);
                            for (const o of offers) if (o.status === 'Auftrag erhalten') bucket(o.createdAt, o.totalPrice);
                            const max = Math.max(...months.map(m => m.sum), 1);
                            const bw = 100 / 6;
                            return `<svg viewBox="0 0 100 46" style="width:100%;max-width:560px;height:auto;display:block;">
                                ${months.map((m, i) => {
                                    const h = Math.max((m.sum / max) * 32, m.sum > 0 ? 2 : 0.8);
                                    const x = i * bw + bw * 0.18;
                                    return `<rect x="${x.toFixed(1)}" y="${(38 - h).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${h.toFixed(1)}" rx="1.4" fill="${m.sum > 0 ? 'var(--accent)' : 'var(--border)'}"></rect>
                                        <text x="${(i * bw + bw / 2).toFixed(1)}" y="43.5" text-anchor="middle" style="font-size:3.4px;fill:var(--text-muted);font-weight:600;">${m.label}</text>
                                        ${m.sum > 0 ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${(36 - h).toFixed(1)}" text-anchor="middle" style="font-size:2.9px;fill:var(--text-secondary);font-weight:700;">${Math.round(m.sum) >= 1000 ? (m.sum / 1000).toFixed(1).replace('.', ',') + 'k' : Math.round(m.sum)}</text>` : ''}`;
                                }).join('')}
                            </svg>`;
                        })()}
                    </div>

                    <div class="dash-cols">
                        <div class="panel">
                            <div class="panel-title">${icon('clock')} Kürzliche Aktivitäten</div>
                            ${acts.length === 0 ? '<div class="empty-note">Keine Aktivitäten gefunden.</div>' : acts.map(a => `
                                <div class="event-list-item" style="cursor:pointer;" onclick="app.navigate('${a.link}'${a.id !== null && a.id !== undefined ? ', ' + idJS(a.id) : ''})">
                                    <div class="event-info">
                                        <div class="event-title">${escapeHtml(a.title)}</div>
                                        <div class="event-meta">${escapeHtml(a.t)} · ${formatDate(a.at)}</div>
                                    </div>
                                    <span class="status-badge status-neu">${escapeHtml(a.t)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="panel">
                            <div class="panel-title">${icon('calendar')} Nächste 7 Tage <span class="link-all" onclick="app.navigate('calendar')">Alle →</span></div>
                            ${next7.length === 0 ? '<div class="empty-note">Keine anstehenden Termine.</div>' : next7.map(ev => {
                                const d = new Date(ev.date);
                                return `
                                <div class="event-list-item" style="cursor:pointer;" onclick="app.openEventModal(${idJS(ev.id)})">
                                    <div class="event-date-box"><div class="ed-day">${d.getDate()}</div><div class="ed-month">${d.toLocaleDateString('de-DE',{month:'short'})}</div></div>
                                    <div class="event-info">
                                        <div class="event-title">${escapeHtml(ev.title)}</div>
                                        <div class="event-meta">${escapeHtml([ev.time, ev.type].filter(Boolean).join(' · '))}</div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                `;
                } catch (e) {
                    console.error('Dashboard-Render-Fehler:', e);
                    contentArea.innerHTML = `<div style="padding:20px;color:var(--danger);">Fehler beim Laden des Dashboards: ${escapeHtml(e.message)}</div>`;
                }
            })();
        }

        // ============================================================
        // ============ KUNDEN ========================================
        // ============================================================
        function renderCustomers() {
            (async () => {
                const customers = await db.getAll('customers');
                const projects = await db.getAll('projects');
                document.getElementById('customerCount').textContent = customers.length;

                const projCountByCust = {};
                for (const p of projects) {
                    if (p.customerId === undefined || p.customerId === null) continue;
                    const k = String(p.customerId);
                    projCountByCust[k] = (projCountByCust[k] || 0) + 1;
                }

                const q = listFilters.customers.q.toLowerCase();
                const filtered = customers.filter(c => {
                    if (!q) return true;
                    return `${c.firstName || ''} ${c.lastName || ''} ${c.company || ''} ${c.city || ''} ${c.phone || ''}`.toLowerCase().includes(q);
                });

                contentArea.innerHTML = `
                    <div class="toolbar">
                        <div class="search-inline">
                            <span class="search-icon">${icon('search')}</span>
                            <input type="text" id="custSearch" placeholder="Kunden suchen..." value="${escapeHtml(listFilters.customers.q)}">
                        </div>
                        <div class="toolbar-spacer"></div>
                        <button class="btn btn-primary" onclick="app.openCustomerModal()">${icon('plus')} Neuer Kunde</button>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Kunde</th><th>Kontakt</th><th>Standort</th><th>Projekte</th><th>Status</th><th style="text-align:right;">Aktionen</th></tr></thead>
                            <tbody>
                                ${filtered.map(c => `
                                    <tr>
                                        <td><strong>${escapeHtml(customerDisplayName(c))}</strong>${c.company && (c.firstName||c.lastName) ? `<div style="font-size:12px;color:var(--text-muted);">${escapeHtml(c.company)}</div>` : ''}</td>
                                        <td>${c.phone ? `<a href="tel:${escapeHtml(String(c.phone).replace(/\s+/g, ''))}" class="contact-link">📞 ${escapeHtml(c.phone)}</a>` : '-'}${c.email ? `<div><a href="mailto:${escapeHtml(c.email)}" class="contact-link" style="font-size:12px;">✉️ ${escapeHtml(c.email)}</a></div>` : ''}</td>
                                        <td>${[c.street, c.city].filter(Boolean).length ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([c.street, c.city].filter(Boolean).join(', '))}" target="_blank" rel="noopener" class="contact-link" title="Navigation starten">🧭 ${escapeHtml([c.street, c.city].filter(Boolean).join(', '))}</a>` : '-'}</td>
                                        <td>${projCountByCust[String(c.id)] || 0}</td>
                                        <td><span class="status-badge ${getStatusClass(c.status || 'Neu')}">${escapeHtml(c.status || 'Neu')}</span></td>
                                        <td style="text-align:right;white-space:nowrap;">
                                            <button class="btn btn-sm btn-outline" onclick="app.openCustomerModal(${idJS(c.id)})">${icon('edit')}</button>
                                            <button class="btn btn-sm btn-outline" title="Anlage für diesen Kunden anlegen" onclick="app.openEquipment(null, ${idJS(c.id)})">🧊</button>
                                            <button class="btn btn-sm btn-outline" onclick="app.duplicateCustomer(${idJS(c.id)})">${icon('copy')}</button>
                                            ${getCustomFields('customers').length ? `<button class="btn btn-sm btn-outline" title="Zusatzfelder" onclick="app.openCustomDataModal('customers', ${idJS(c.id)})">🔧</button>` : ''}
                                            <button class="btn btn-sm btn-danger" onclick="app.deleteCustomer(${idJS(c.id)})">${icon('trash')}</button>
                                        </td>
                                    </tr>
                                `).join('') || `<tr><td colspan="6" style="padding:0;">${filtered.length === 0 && !listFilters.customers.q ? `<div class="empty-state"><div style="font-size:40px;">👥</div><p>Noch keine Kunden.<br>Lege deinen ersten Kunden an – Name, Kontakt und Adresse genügen.</p><button class="btn btn-primary" onclick="app.openCustomerModal()">${icon('plus')} Ersten Kunden anlegen</button></div>` : '<div class="empty-note" style="padding:20px;">Keine Treffer für die Suche.</div>'}</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                `;
                const inp = document.getElementById('custSearch');
                inp.addEventListener('input', () => {
                    listFilters.customers.q = inp.value;
                    clearTimeout(inp._t);
                    inp._t = setTimeout(() => { renderCustomers(); setTimeout(() => { const el = document.getElementById('custSearch'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 0); }, 250);
                });
            })();
        }

        // ============================================================
        // ============ PROJEKTE (PIPELINE) ===========================
        // ============================================================
        // Professionelle Status inkl. Abrechnung (alte Status bleiben kompatibel)
        const PIPELINE_COLS = [
            { key: 'Besichtigung', label: 'Besichtigung', statuses: ['Besichtigung', 'Neu', 'Besichtigung offen', 'Besichtigt'] },
            { key: 'Angebot', label: 'Angebot', statuses: ['Angebot', 'Angebot offen', 'Angebot gesendet'] },
            { key: 'Vorbereitung', label: 'Vorbereitung', statuses: ['Geplant', 'Material bestellt', 'Wartet auf Material', 'Auftrag erhalten', 'Montage geplant'] },
            { key: 'InArbeit', label: 'In Arbeit', statuses: ['In Arbeit', 'Regiearbeit', 'Wartet auf Kunde', 'Montage läuft'] },
            { key: 'Abschluss', label: 'Abschluss', statuses: ['Fertig', 'Rechnung erstellt'] },
            { key: 'Bezahlt', label: 'Bezahlt / Archiv', statuses: ['Bezahlt', 'Archiviert', 'Archiv'] }
        ];
        // Auswahlliste: die 12 Profi-Status
        const PROJECT_STATUSES = ['Besichtigung', 'Angebot', 'Geplant', 'Material bestellt', 'Wartet auf Material', 'In Arbeit', 'Regiearbeit', 'Wartet auf Kunde', 'Fertig', 'Rechnung erstellt', 'Bezahlt', 'Archiviert'];
        const STATUS_PROGRESS = {
            'Neu': 5, 'Besichtigung offen': 5, 'Besichtigung': 10, 'Besichtigt': 15,
            'Angebot offen': 20, 'Angebot': 25, 'Angebot gesendet': 30,
            'Auftrag erhalten': 35, 'Geplant': 40, 'Material bestellt': 50, 'Wartet auf Material': 55, 'Montage geplant': 55,
            'In Arbeit': 70, 'Montage läuft': 70, 'Regiearbeit': 70, 'Wartet auf Kunde': 75,
            'Fertig': 85, 'Rechnung erstellt': 92, 'Bezahlt': 100, 'Archiviert': 100, 'Archiv': 100
        };
        function statusProgress(s) { return STATUS_PROGRESS[s] ?? 5; }
        function statusOptions(current) {
            const list = [...PROJECT_STATUSES];
            if (current && !list.includes(current)) list.unshift(current);
            return list;
        }

        function renderProjects(selectedProjectId = null) {
            (async () => {
                const projects = await db.getAll('projects');
                const customers = await db.getAll('customers');
                const allRooms = await db.getAll('rooms');
                const allPM = await db.getAll('projectMaterials');
                const materials = await db.getAll('materials');
                const roomCountByProject = {};
                for (const r of allRooms) {
                    if (r.projectId === undefined || r.projectId === null) continue;
                    const key = String(r.projectId);
                    roomCountByProject[key] = (roomCountByProject[key] || 0) + 1;
                }
                document.getElementById('projectCount').textContent = projects.length;

                let detailHtml = '';
                if (selectedProjectId) {
                    const project = await db.getProjectWithDetails(selectedProjectId);
                    if (project) {
                        const customer = customers.find(c => String(c.id) === String(project.customerId));
                        const cooling = calculateCoolingCapacity(project.rooms || []);
                        const pm = allPM.filter(x => String(x.projectId) === String(project.id));
                        const survey = project.survey || {};
                        const surveyFilled = Object.keys(survey).some(k => survey[k] !== '' && survey[k] !== null && survey[k] !== undefined && survey[k] !== false);
                        const projFieldDefs = getCustomFields('projects');
                        const cd = project.customData || {};
                        const summaryChips = await buildProjectSummaryChips(project.id);

                        detailHtml = `
                            <div class="panel" id="projectDetail" style="margin-top:20px;">
                                <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:14px;">
                                    <div>
                                        <h3 style="margin:0;">${escapeHtml(project.title || 'Unbenannt')}</h3>
                                        <div style="color:var(--text-muted);font-size:13px;">${customer ? `${escapeHtml(customer.firstName)} ${escapeHtml(customer.lastName)}${customer.phone ? ` · <a href="tel:${escapeHtml(String(customer.phone).replace(/\s+/g, ''))}" class="contact-link">📞 ${escapeHtml(customer.phone)}</a>` : ''}${[customer.street, customer.city].filter(Boolean).length ? ` · <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([customer.street, customer.city].filter(Boolean).join(', '))}" target="_blank" rel="noopener" class="contact-link">🧭 Route</a>` : ''}` : 'Kein Kunde zugewiesen'}</div>
                                        <div class="pc-progress" style="max-width:260px;margin-top:7px;"><div class="pc-progress-bar" style="width:${statusProgress(project.status || 'Besichtigung')}%;"></div></div>
                                        <div style="font-size:11.5px;color:var(--accent);font-weight:700;">${statusProgress(project.status || 'Besichtigung')} % · ${escapeHtml(project.status || 'Besichtigung')}</div>
                                    </div>
                                    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                                        <select class="filter-select" onchange="app.setProjectStatus(${idJS(project.id)}, this.value)">
                                            ${statusOptions(project.status).map(s => `<option value="${s}" ${project.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                                        </select>
                                        <button class="btn btn-sm btn-outline" onclick="app.openProjectModal(${idJS(project.id)})">${icon('edit')} Bearbeiten</button>
                                        <button class="btn btn-sm btn-primary" onclick="app.createOffer(${idJS(project.id)})">${icon('file')} Angebot</button>
                                        <button class="btn btn-sm btn-outline" onclick="app.exportProjectOverviewPDF(${idJS(project.id)})">${icon('pdf')} Übersicht-PDF</button>
                                        <button class="btn btn-sm btn-outline" onclick="app.openOrderModal(null, ${idJS(project.id)})">${icon('cart')} Bestellung</button>
                                        <button class="btn btn-sm btn-danger" onclick="app.deleteProject(${idJS(project.id)})">${icon('trash')}</button>
                                    </div>
                                </div>
                                ${project.notes ? `<p style="margin-bottom:14px;"><strong>Notizen:</strong> ${escapeHtml(project.notes)}</p>` : ''}

                                ${project.source === 'Schnellrechner' && project.calcData ? (() => {
                                    const cd = project.calcData;
                                    const bld = { neu: 'Neubau / sehr gut', normal: 'Saniert / normal', alt: 'Altbau / unsaniert' }[cd.building] || cd.building;
                                    const dirL = { sued: 'Süd', west: 'West', ost: 'Ost', nord: 'Nord' };
                                    const shadeL = { keine: 'keine', normal: 'normal', stark: 'stark' };
                                    return `<div class="calc-origin">
                                        <div class="calc-origin-head">📞 Aus telefonischer Schnellberechnung · Besichtigung ausständig</div>
                                        <div class="calc-origin-body">
                                            <div>Damals genannt: <strong>${formatCurrency(cd.brutto || 0)}</strong> · Gesamtlast <strong>${(cd.sumLoad || 0).toFixed(1).replace('.', ',')} kW</strong> · ${escapeHtml(bld)}</div>
                                            ${(cd.rooms || []).map((r, i) => `<div class="calc-origin-room">Raum ${i + 1}: ${r.area} m² · ${r.windows} Fenster ${dirL[r.dir] || r.dir} · Verschattung ${shadeL[r.shade] || r.shade} · ${r.persons} Pers. → ${(r.load || 0).toFixed(1).replace('.', ',')} kW${r.device ? ' · ' + escapeHtml(r.device) : ''}</div>`).join('')}
                                            <div class="calc-origin-note">Diese Angaben stammen aus dem Telefonat. Nach der Besichtigung kannst du alles anpassen – die ursprüngliche Berechnung bleibt hier erhalten.</div>
                                        </div>
                                    </div>`;
                                })() : ''}

                                <!-- ===== Live-Zusammenfassung ===== -->
                                <div class="agg-panel" style="margin-bottom:4px;">
                                    <div class="agg-title">📊 Projektzusammenfassung (live)</div>
                                    <div class="survey-summary" id="projSummary">${summaryChips}</div>
                                </div>

                                <!-- ===== Besichtigung ===== -->
                                <div class="detail-section">
                                    <div class="detail-section-head">
                                        <h4>📋 Besichtigung</h4>
                                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                            <button class="btn btn-sm btn-outline" onclick="app.openSurveyModal(${idJS(project.id)})">${icon('edit')} ${surveyFilled ? 'Bearbeiten' : 'Erfassen'}</button>
                                            ${(surveyFilled || (project.rooms||[]).length > 0) ? `<button class="btn btn-sm btn-primary" onclick="app.generateMaterialSuggestions(${idJS(project.id)})">${icon('box')} Material berechnen</button>` : ''}
                                        </div>
                                    </div>
                                    ${surveyFilled ? `<div class="survey-summary">${[
                                        ...SURVEY_FIELDS.filter(f => { const v = survey[f.key]; return v !== '' && v !== null && v !== undefined && v !== false && v !== 0; })
                                            .map(f => `<div class="survey-chip"><span>${escapeHtml(f.label)}</span><strong>${survey[f.key] === true ? 'Ja' : escapeHtml(String(survey[f.key]))}${f.unit && survey[f.key] !== true ? ' ' + f.unit : ''}</strong></div>`),
                                        ...Object.entries(LEGACY_SURVEY_LABELS).filter(([k]) => { const v = survey[k]; return v !== '' && v !== null && v !== undefined && v !== false && v !== 0; })
                                            .map(([k, label]) => `<div class="survey-chip" style="opacity:.65;"><span>${escapeHtml(label)}</span><strong>${survey[k] === true ? 'Ja' : escapeHtml(String(survey[k]))}</strong></div>`)
                                    ].join('') || '<span class="empty-note" style="padding:8px;">Keine Angaben</span>'}</div>`
                                    : '<div class="empty-note" style="padding:14px;">Noch keine Besichtigung erfasst – Termin, Kontakt, Objekt & Zugang. Technische Daten erfasst du je Raum.</div>'}
                                </div>

                                <!-- ===== Räume ===== -->
                                <div class="detail-section">
                                    <div class="detail-section-head">
                                        <h4>🚪 Räume (${(project.rooms||[]).length})</h4>
                                        <button class="btn btn-sm btn-primary" onclick="app.openRoomModal(${idJS(project.id)})">${icon('plus')} Raum</button>
                                    </div>
                                    <div class="table-container">
                                        <table>
                                            <thead><tr><th>Raum</th><th>L (m)</th><th>B (m)</th><th>H (m)</th><th>Fläche</th><th>Volumen</th><th>Empf. kW</th><th></th></tr></thead>
                                            <tbody>
                                                ${(project.rooms||[]).map(r => {
                                                    const area = ((r.length||0)*(r.width||0)).toFixed(1);
                                                    const volume = (area*(r.height||2.5)).toFixed(1);
                                                    const roomKW = ((area*80)/1000).toFixed(1);
                                                    const t = r.tech || {};
                                                    const techBits = [
                                                        t.devManufacturer ? `❄ ${t.devManufacturer}${t.devModel ? ' ' + t.devModel : ''}` : '',
                                                        (typeof t.pipeLength === 'number' && t.pipeLength > 0) ? `🧵 ${t.pipeLength} m` : '',
                                                        (typeof t.coreDrills === 'number' && t.coreDrills > 0) ? `🔩 ${t.coreDrills}× Bohrung` : ''
                                                    ].filter(Boolean).join(' · ');
                                                    return `<tr>
                                                        <td><strong>${escapeHtml(r.name||'Unbenannt')}</strong>${techBits ? `<div style="font-size:11.5px;color:var(--text-muted);">${escapeHtml(techBits)}</div>` : ''}</td>
                                                        <td>${r.length||0}</td><td>${r.width||0}</td><td>${r.height||2.5}</td>
                                                        <td>${area} m²</td><td>${volume} m³</td><td>${roomKW} kW</td>
                                                        <td style="white-space:nowrap;"><button class="btn btn-sm btn-outline" onclick="app.openRoomModal(${idJS(project.id)}, ${idJS(r.id)})">${icon('edit')}</button> <button class="btn btn-sm btn-danger" onclick="app.deleteRoom(${idJS(r.id)},${idJS(project.id)})">${icon('trash')}</button></td>
                                                    </tr>`;
                                                }).join('') || '<tr><td colspan="8" class="empty-note">Keine Räume</td></tr>'}
                                            </tbody>
                                        </table>
                                    </div>
                                    ${cooling.details.length > 0 ? `
                                    <div style="background:var(--accent-light);border-radius:var(--radius-sm);padding:12px 16px;margin-top:10px;font-size:13.5px;">
                                        <strong>❄ Kälteleistungs-Empfehlung:</strong> <span style="font-size:19px;font-weight:700;color:var(--accent);">${cooling.recommendation} kW</span>
                                        &nbsp;<small style="color:var(--text-muted);">(Gesamtlast ${cooling.totalKW} kW · Faustformel 80 W/m²)</small>
                                    </div>` : ''}
                                </div>

                                <!-- ===== Material ===== -->
                                <div class="detail-section">
                                    ${pm.length > 0 ? (() => {
                                        const agg = new Map();
                                        for (const x of pm) {
                                            const mat = materials.find(m => String(m.id) === String(x.materialId));
                                            const unit = x.unit || mat?.unit || 'Stk';
                                            const key = `${(mat?.name || x.name || 'Material')}|${unit}`;
                                            agg.set(key, (agg.get(key) || 0) + (Number(x.quantity) || 0));
                                        }
                                        const fq = q => (Math.round(q * 100) / 100).toString().replace('.', ',');
                                        return `<div class="agg-panel"><div class="agg-title">Σ Projekt gesamt</div><div class="survey-summary">${[...agg.entries()].map(([k, q]) => { const [n, u] = k.split('|'); return `<div class="survey-chip"><span>${escapeHtml(n)}</span><strong>${fq(q)} ${escapeHtml(u)}</strong></div>`; }).join('')}</div></div>`;
                                    })() : ''}
                                    <div class="detail-section-head">
                                        <h4>📦 Material aller Räume (${pm.length})</h4>
                                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                            <button class="btn btn-sm btn-primary" onclick="app.openProjectMaterialModal(null, ${idJS(project.id)})">${icon('plus')} Material</button>
                                            ${pm.length > 0 ? `<button class="btn btn-sm btn-outline" onclick="app.openMaterialSend(${idJS(project.id)})" title="Materialliste auswählen und an Händler oder Kunde senden">📤 Liste senden</button>` : ''}
                                            ${pm.length > 0 ? `<select class="filter-select" style="padding:6px 8px;" onchange="app.pmSetGroup(this.value)" title="Gruppieren nach">
                                                <option value="raum" ${(window.__pmView?.groupBy || 'raum') === 'raum' ? 'selected' : ''}>Gruppieren: Raum</option>
                                                <option value="material" ${window.__pmView?.groupBy === 'material' ? 'selected' : ''}>Gruppieren: Material</option>
                                                <option value="hersteller" ${window.__pmView?.groupBy === 'hersteller' ? 'selected' : ''}>Gruppieren: Hersteller</option>
                                                <option value="keine" ${window.__pmView?.groupBy === 'keine' ? 'selected' : ''}>Ohne Gruppierung</option>
                                            </select>
                                            <button class="btn btn-sm btn-outline" onclick="app.createOrderFromProject(${idJS(project.id)})">${icon('cart')} Bestellliste erstellen</button>
                                            <button class="btn btn-sm btn-primary" onclick="app.createOffer(${idJS(project.id)})">${icon('file')} Angebot erstellen</button>` : ''}
                                        </div>
                                    </div>
                                    <div class="table-container">
                                        <table>
                                            <thead><tr>${(() => {
                                                const V = window.__pmView = window.__pmView || { groupBy: 'raum', sort: '', dir: 1 };
                                                const th = (key, label, style = '') => `<th ${style ? `style="${style}"` : ''} class="pm-th" onclick="app.pmSort('${key}')">${label}${V.sort === key ? (V.dir === 1 ? ' ▲' : ' ▼') : ''}</th>`;
                                                return th('name', 'Material') + th('size', 'Größe') + th('quantity', 'Menge', 'width:96px;') + th('unit', 'Einheit', 'width:92px;') + th('room', 'Raum') + th('price', 'Preis/Einh.', 'width:104px;') + th('total', 'Gesamt', 'text-align:right;') + th('note', 'Bemerkung') + '<th></th>';
                                            })()}</tr></thead>
                                            <tbody>
                                                ${(() => {
                                                    const rowPrice = (x, mat) => x.price !== undefined && x.price !== null ? Number(x.price) : matUnitPrice(mat, x.unit || mat?.unit || 'Stk');
                                                    const renderRow = (x) => {
                                                        const mat = materials.find(m => String(m.id) === String(x.materialId));
                                                        const price = rowPrice(x, mat);
                                                        const lineTotal = (Number(x.quantity) || 0) * price;
                                                        return `<tr>
                                                        <td><strong class="pm-matlink" title="Im Katalog ansehen / Kategorie ändern" onclick="app.openMaterialDetail(${idJS(x.materialId)})">${escapeHtml(mat?.name || x.name || 'Material')}</strong>${mat?.category ? `<div class="pm-matcat">📂 ${escapeHtml(mat.category)}${mat.series ? ' › ' + escapeHtml(mat.series) : ''}</div>` : ''}</td>
                                                        <td>${escapeHtml(x.size || mat?.size || '-')}</td>
                                                        <td><input type="number" inputmode="decimal" step="any" min="0" value="${x.quantity ?? 0}" style="padding:6px 8px;text-align:center;" onchange="app.updateProjectMaterial(${idJS(x.id)}, 'quantity', this.value)"></td>
                                                        <td><select style="padding:6px 5px;" onchange="app.updateProjectMaterial(${idJS(x.id)}, 'unit', this.value)">${UNITS.map(u => `<option value="${u}" ${(x.unit || 'Stk') === u ? 'selected' : ''}>${u}</option>`).join('')}</select></td>
                                                        <td><select style="padding:6px 5px;" onchange="app.updateProjectMaterial(${idJS(x.id)}, 'roomId', this.value)"><option value="">–</option>${(project.rooms||[]).map(r => `<option value="${escapeHtml(String(r.id))}" ${String(x.roomId) === String(r.id) ? 'selected' : ''}>${escapeHtml(r.name || 'Raum')}</option>`).join('')}</select></td>
                                                        <td><input type="number" inputmode="decimal" step="any" min="0" value="${price}" style="padding:6px 8px;text-align:right;" onchange="app.updateProjectMaterial(${idJS(x.id)}, 'price', this.value)"></td>
                                                        <td style="text-align:right;font-weight:700;white-space:nowrap;">${formatCurrency(lineTotal)}</td>
                                                        <td><input type="text" value="${escapeHtml(x.note || '')}" placeholder="..." style="padding:6px 8px;min-width:100px;" onchange="app.updateProjectMaterial(${idJS(x.id)}, 'note', this.value)"></td>
                                                        <td><button class="btn btn-sm btn-danger" onclick="app.deleteProjectMaterial(${idJS(x.id)}, ${idJS(project.id)})">${icon('trash')}</button></td>
                                                    </tr>`;
                                                    };
                                                    // Gruppieren (Raum / Material / Hersteller / keine) + sortierbare Spalten
                                                    const V = window.__pmView = window.__pmView || { groupBy: 'raum', sort: '', dir: 1 };
                                                    const matOf = x => materials.find(m => String(m.id) === String(x.materialId));
                                                    const roomNameOf = x => (project.rooms || []).find(r => String(r.id) === String(x.roomId))?.name || '';
                                                    const sortVal = (x) => {
                                                        const m = matOf(x);
                                                        switch (V.sort) {
                                                            case 'size': return x.size || m?.size || '';
                                                            case 'quantity': return Number(x.quantity) || 0;
                                                            case 'unit': return x.unit || '';
                                                            case 'room': return roomNameOf(x);
                                                            case 'price': return rowPrice(x, m);
                                                            case 'total': return (Number(x.quantity) || 0) * rowPrice(x, m);
                                                            case 'note': return x.note || '';
                                                            default: return m?.name || x.name || '';
                                                        }
                                                    };
                                                    const cmp = (a, b) => {
                                                        const va = sortVal(a), vb = sortVal(b);
                                                        const r = (typeof va === 'number' && typeof vb === 'number') ? va - vb : String(va).localeCompare(String(vb), 'de', { numeric: true });
                                                        return r * V.dir;
                                                    };
                                                    const defaultCmp = (a, b) => (matOf(a)?.name || '').localeCompare(matOf(b)?.name || '');

                                                    let groupDefs = [];   // [{ label, list }]
                                                    if (V.groupBy === 'keine') {
                                                        groupDefs = [{ label: null, list: [...pm] }];
                                                    } else if (V.groupBy === 'material') {
                                                        const g = new Map();
                                                        for (const x of pm) { const k = matOf(x)?.name || x.name || 'Material'; (g.get(k) || g.set(k, []).get(k)).push(x); }
                                                        groupDefs = [...g.keys()].sort((a, b) => a.localeCompare(b)).map(k => ({ label: '📦 ' + escapeHtml(k), list: g.get(k) }));
                                                    } else if (V.groupBy === 'hersteller') {
                                                        const g = new Map();
                                                        for (const x of pm) { const k = matOf(x)?.manufacturer || 'Ohne Hersteller'; (g.get(k) || g.set(k, []).get(k)).push(x); }
                                                        groupDefs = [...g.keys()].sort((a, b) => a.localeCompare(b)).map(k => ({ label: '🏭 ' + escapeHtml(k), list: g.get(k) }));
                                                    } else {
                                                        const roomOrder = [...(project.rooms || []).map(r => String(r.id)), null];
                                                        const g = new Map();
                                                        for (const x of pm) {
                                                            const key = x.roomId != null && roomOrder.includes(String(x.roomId)) ? String(x.roomId) : null;
                                                            (g.get(key) || g.set(key, []).get(key)).push(x);
                                                        }
                                                        groupDefs = roomOrder.filter(k => g.has(k)).map(k => {
                                                            const room = (project.rooms || []).find(r => String(r.id) === k);
                                                            return {
                                                                label: room ? '🏠 ' + escapeHtml(room.name || 'Raum') : '📦 Projekt gesamt',
                                                                roomId: k,
                                                                list: g.get(k)
                                                            };
                                                        });
                                                    }

                                                    let out = '';
                                                    for (const grp of groupDefs) {
                                                        grp.list.sort(V.sort ? cmp : defaultCmp);
                                                        if (grp.label !== null) {
                                                            const sum = grp.list.reduce((s, x) => s + (Number(x.quantity) || 0) * rowPrice(x, matOf(x)), 0);
                                                            const addBtn = grp.roomId !== undefined
                                                                ? `<button class="pm-group-add" title="Material nur für diesen Raum hinzufügen" onclick="app.openProjectMaterialModal(null, ${idJS(project.id)}, ${grp.roomId ? idJS(grp.roomId) : 'null'})">${icon('plus')} Material</button>`
                                                                : '';
                                                            out += `<tr class="pm-group"><td colspan="6">${grp.label} <small>· ${grp.list.length} Position${grp.list.length !== 1 ? 'en' : ''}</small> ${addBtn}</td><td style="text-align:right;font-weight:800;">${formatCurrency(sum)}</td><td colspan="2"></td></tr>`;
                                                        }
                                                        out += grp.list.map(renderRow).join('');
                                                    }
                                                    return out;
                                                })() || '<tr><td colspan="9" class="empty-note">Die Materialliste entsteht automatisch aus den Räumen – lege Räume mit Leitungsdaten an oder klicke „Material berechnen".</td></tr>'}
                                            </tbody>
                                            ${pm.length ? `<tfoot><tr>
                                                <td colspan="6" style="text-align:right;font-weight:700;">Gesamtsumme</td>
                                                <td style="text-align:right;font-weight:800;color:var(--accent);white-space:nowrap;">${formatCurrency(pm.reduce((s, x) => {
                                                    const mat = materials.find(m => String(m.id) === String(x.materialId));
                                                    const price = x.price !== undefined && x.price !== null ? Number(x.price) : matUnitPrice(mat, x.unit || mat?.unit || 'Stk');
                                                    return s + (Number(x.quantity) || 0) * price;
                                                }, 0))}</td><td colspan="2"></td>
                                            </tr></tfoot>` : ''}
                                        </table>
                                    </div>
                                </div>

                                ${projFieldDefs.length > 0 ? `
                                <div class="detail-section">
                                    <div class="detail-section-head">
                                        <h4>🔧 Zusatzfelder</h4>
                                        <button class="btn btn-sm btn-outline" onclick="app.openCustomDataModal('projects', ${idJS(project.id)})">${icon('edit')} Bearbeiten</button>
                                    </div>
                                    <div class="survey-summary">
                                        ${projFieldDefs.map(f => {
                                            const v = cd[f.id];
                                            const disp = v === undefined || v === '' || v === null ? '–' : (v === true ? 'Ja' : v === false ? 'Nein' : Array.isArray(v) ? v.join(', ') : String(v));
                                            return `<div class="survey-chip"><span>${escapeHtml(f.label)}</span><strong>${escapeHtml(disp)}${f.unit && disp !== '–' ? ' ' + escapeHtml(f.unit) : ''}</strong></div>`;
                                        }).join('')}
                                    </div>
                                </div>` : ''}

                                <!-- ===== Bilder ===== -->
                                <div class="detail-section">
                                    <div class="detail-section-head">
                                        <h4>📷 Bilder (${(project.images||[]).length})</h4>
                                        <button class="btn btn-sm btn-primary" onclick="app.openImageModal(${idJS(project.id)})">${icon('plus')} Bild</button>
                                    </div>
                                    <div class="image-grid">
                                        ${(project.images||[]).map(img => `
                                            <div class="image-card" onclick="app.viewImage('${img.data}')">
                                                <img src="${img.data}" alt="${escapeHtml(img.category||'')}">
                                                <div class="img-overlay">${escapeHtml(img.category||'Sonstiges')} ${img.label ? '- '+escapeHtml(img.label) : ''}</div>
                                            </div>
                                        `).join('') || '<div class="empty-note" style="grid-column:1/-1;">Keine Bilder</div>'}
                                    </div>
                                </div>
                                <!-- ===== Planung / Grundriss ===== -->
                                <div class="detail-section">
                                    <div class="detail-section-head">
                                        <h4>📐 Planung / Grundriss</h4>
                                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                            <button class="btn btn-sm btn-outline" id="planUndo" title="Rückgängig">↶</button>
                                            <button class="btn btn-sm btn-outline" id="planRelayout">Räume anordnen</button>
                                            <button class="btn btn-sm btn-primary" id="planApplyNow">✓ In Material übernehmen</button>
                                        </div>
                                    </div>
                                    <div class="plan-wrap">
                                        <div class="plan-tools">
                                            <button class="plan-tool active" data-tool="select" title="Auswählen / Verschieben / Plan bewegen">🖐</button>
                                            <div class="plan-tools-sep"></div>
                                            ${Object.entries(PLAN_LINE_KINDS).map(([k, v]) => `<button class="plan-tool" data-tool="line:${k}" title="${v.label} zeichnen"><span style="border-bottom:3px solid ${v.color};padding-bottom:1px;">${v.emoji}</span></button>`).join('')}
                                            <div class="plan-tools-sep"></div>
                                            ${Object.entries(PLAN_SYMBOLS).map(([k, v]) => `<button class="plan-tool" data-tool="${k}" title="${v.label}">${v.emoji}</button>`).join('')}
                                        </div>
                                        <div class="plan-canvas-wrap">
                                            <svg id="planSvg" preserveAspectRatio="xMidYMid meet">
                                                <defs>
                                                    <pattern id="planGrid" width="${PLAN_SCALE}" height="${PLAN_SCALE}" patternUnits="userSpaceOnUse">
                                                        <path d="M ${PLAN_SCALE} 0 L 0 0 0 ${PLAN_SCALE}" fill="none" class="pl-grid"/>
                                                    </pattern>
                                                </defs>
                                                <rect x="-4000" y="-4000" width="9000" height="9000" fill="url(#planGrid)" pointer-events="none"></rect>
                                                <g id="planLayer"></g>
                                            </svg>
                                            <button class="btn btn-sm btn-primary plan-finish" id="planFinishLine">✔ Linie fertig</button>
                                            <div class="plan-status" id="planStatus"></div>
                                            <div class="plan-selbar" id="planSelBar">
                                                <button class="btn btn-sm btn-outline" id="planSelRotate" title="Drehen (45°)">⟳</button>
                                                <button class="btn btn-sm btn-outline" id="planSelScaleUp" title="Größer">＋</button>
                                                <button class="btn btn-sm btn-outline" id="planSelScaleDown" title="Kleiner">－</button>
                                                <button class="btn btn-sm btn-outline" id="planSelCopy" title="Kopieren">⧉</button>
                                                <button class="btn btn-sm btn-outline" id="planSelText" title="Text">✎</button>
                                                <button class="btn btn-sm btn-danger" id="planSelDelete" title="Löschen">🗑</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">Zeichnen mit Maus, Finger oder Stift · Linien rasten horizontal/vertikal/45° ein und schnappen an Geräte · Längen fließen automatisch in Räume, Material, Bestellung und PDF.</div>
                                </div>

                            </div>
                        `;
                    }
                }

                const colsHtml = PIPELINE_COLS.map(col => {
                    const colProjects = projects
                        .filter(p => col.statuses.includes(p.status || 'Neu'))
                        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
                    return `
                        <div class="pipe-col" data-status="${col.statuses[0]}"
                             ondragover="event.preventDefault(); this.classList.add('drag-over');"
                             ondragleave="this.classList.remove('drag-over');"
                             ondrop="this.classList.remove('drag-over'); app.dropProjectCard(event, '${col.statuses[0]}')">
                            <div class="pipe-head"><span>${col.label}</span><span class="pipe-count">${colProjects.length}</span></div>
                            ${colProjects.length === 0 ? '<div class="pipe-empty">Hierher ziehen</div>' : colProjects.map(p => {
                                const cust = customers.find(c => String(c.id) === String(p.customerId));
                                return `
                                    <div class="pipe-card" draggable="true"
                                         ondragstart="app.dragProjectCard(event, '${escapeHtml(String(p.id))}')"
                                         onclick="app.navigate('projects', ${idJS(p.id)})">
                                        <div class="pc-title">${escapeHtml(p.title || 'Unbenannt')}</div>
                                        <div class="pc-sub">${escapeHtml(cust ? `${cust.firstName} ${cust.lastName}` : 'Kein Kunde')}</div>
                                        <div class="pc-progress"><div class="pc-progress-bar" style="width:${statusProgress(p.status || 'Besichtigung')}%;"></div></div>
                                        <div class="pc-sub" style="margin-top:7px;display:flex;justify-content:space-between;align-items:center;gap:6px;">
                                            <select class="pc-status" onclick="event.stopPropagation()" onchange="event.stopPropagation(); app.setProjectStatus(${idJS(p.id)}, this.value)">
                                                ${statusOptions(p.status || 'Besichtigung').map(s => `<option value="${s}" ${(p.status || 'Besichtigung') === s ? 'selected' : ''}>${s}</option>`).join('')}
                                            </select>
                                            <span style="white-space:nowrap;">${roomCountByProject[String(p.id)] || 0} 🚪</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                }).join('');

                contentArea.innerHTML = `
                    <div class="page-head">
                        <div style="font-weight:700;font-size:16px;">Projekt-Pipeline <small style="color:var(--text-muted);font-weight:500;">– Karten per Drag & Drop verschieben</small></div>
                        <button class="btn btn-primary" onclick="app.openProjectModal()">${icon('plus')} Neues Projekt</button>
                    </div>
                    <div class="pipeline">${colsHtml}</div>
                    ${detailHtml}
                `;

                if (selectedProjectId) {
                    const proj2 = projects.find(p => String(p.id) === String(selectedProjectId));
                    const projRooms = allRooms.filter(r => String(r.projectId) === String(selectedProjectId));
                    setTimeout(() => {
                        try { if (proj2) initPlanEditor(proj2, projRooms); } catch (e) { console.warn('Plan-Editor:', e); }
                        // Scroll-Position halten (z.B. nach Preis-/Mengen-Eingabe in der Materialliste)
                        if (window.__ktmKeepScroll != null) {
                            // Position halten (Bearbeitung in der Liste) – NICHT nach oben springen
                            const sc = document.querySelector('.content-scroll') || contentArea;
                            const y = window.__ktmKeepScroll;
                            window.__ktmKeepScroll = null;
                            requestAnimationFrame(() => {
                                sc.scrollTop = y;
                                requestAnimationFrame(() => { sc.scrollTop = y; });   // nach Bild-/Plan-Layout nochmal
                            });
                        } else {
                            // Nur beim erstmaligen Öffnen eines Projekts nach oben scrollen
                            const d = document.getElementById('projectDetail');
                            if (d && typeof d.scrollIntoView === 'function') d.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 60);
                }
            })();
        }

        // ============================================================
        // ============ MATERIALIEN ===================================
        // ============================================================
        // Material-Katalog: Icons je Kategorie
        const MAT_CAT_ICONS = {
            // Neue Hauptkategorien
            'Klimageräte':           '🌡️',
            'Kupfer & Rohrsysteme':  '🔧',
            'Kältemittel':           '❄️',
            'Elektroinstallation':   '⚡',
            'Steuerung & Regelung':  '🎛️',
            'Kondensat':             '💧',
            'Befestigung & Montage': '🔩',
            'Kabelkanäle':           '📦',
            'Zubehör':               '🗂️',
            'Arbeitsleistung':       '⏱️',
            // Alte Namen (Rückwärtskompatibilität)
            'Klimaanlagen': '🌡️', 'Außengeräte': '🌡️', 'Innengeräte': '🌡️',
            'Multisplit-Systeme': '🔀', 'VRF-Systeme': '🏢',
            'Kupferrohr': '🔧', 'Kupferrohre': '🔧', 'Isolierung': '🧵',
            'Elektromaterial': '⚡', 'Kabel': '⚡',
            'Befestigung': '🔩', 'Montagematerial': '🔩', 'Montagezubehör': '🔩',
            'Werkzeug': '🛠️', 'Werkzeuge': '🛠️',
            'Steuerungen': '🎛️', 'Arbeitszeit': '⏱️',
            'Ersatzteile': '⚙️',
        };
        const matCatIcon = c => {
            if (typeof MAT_CAT_META !== 'undefined' && MAT_CAT_META[c]) return MAT_CAT_META[c].icon;
            return MAT_CAT_ICONS[c] || '📦';
        };

        // Einheiten-Preis: Rollen-/Bundware (z.B. Kupferrohr 50 m Bund) wird
        // bei Verwendung in Metern automatisch auf den METERPREIS umgerechnet.
        function matBundleLength(mat) {
            if (!mat) return 0;
            if (Number(mat.bundleLength) > 0) return Number(mat.bundleLength);
            const m = `${mat.notes || ''} ${mat.name || ''}`.match(/(\d+(?:[.,]\d+)?)\s*m\s*Bund/i);
            return m ? parseFloat(m[1].replace(',', '.')) : 0;
        }
        function matUnitPrice(mat, unit) {
            const base = Number(mat?.sellingPrice) || 0;
            // Rolle/Bund/Stange -> Verkaufspreis pro Meter/Einheit
            if (unit === 'm' && mat && ['Rolle', 'Bund', 'Stange'].includes(mat.unit || '')) {
                const bl = matBundleLength(mat);
                if (bl > 0) {
                    // Wenn ein Aufschlag (markup) hinterlegt ist: Verkaufspreis = EK/Meter × (1 + Aufschlag)
                    const markup = Number(mat.markup);
                    if (markup > 0) {
                        const ekRoll = (typeof effectivePurchasePrice === 'function') ? effectivePurchasePrice(mat, window.__ktmDealerDiscounts) : (Number(mat.purchasePrice) || 0);
                        if (ekRoll > 0) {
                            const ekPerM = ekRoll / bl;
                            return Math.round(ekPerM * (1 + markup / 100) * 100) / 100;
                        }
                    }
                    // sonst: Listenpreis der Rolle / Länge (bisheriges Verhalten)
                    return Math.round((base / bl) * 100) / 100;
                }
            }
            return base;
        }

        function matStockStatus(m) {
            const s = Number(m.stock) || 0;
            const bl = Number(m.bundleLength) || 0;
            const isRoll = ['Rolle', 'Bund', 'Stange'].includes(m.unit || '') && bl > 0;
            const open = Number(m.openMeters) || 0;
            // Bei Rollen: Bestand als Rollen + offener Rest, plus Gesamtmeter
            if (isRoll) {
                const totalM = s * bl + open;
                const uw = m.unit;
                if (totalM <= 0) return { label: 'Kein Bestand', cls: 'st-none' };
                const openTxt = open > 0.001 ? ` + ${open.toString().replace('.', ',')} m offen` : '';
                const lbl = `${s} ${uw}${openTxt} (${totalM.toString().replace('.', ',')} m)`;
                if (m.minStock > 0 && totalM < Number(m.minStock)) return { label: 'Nachbestellen · ' + lbl, cls: 'st-low' };
                return { label: lbl, cls: 'st-ok' };
            }
            if (m.minStock > 0 && s < Number(m.minStock)) return { label: 'Nachbestellen', cls: 'st-low' };
            if (s > 0) return { label: 'Auf Lager (' + s + ')', cls: 'st-ok' };
            return { label: 'Kein Bestand', cls: 'st-none' };
        }

        function renderMaterials() {
            (async () => {
                const materials = await db.getAll('materials');
                const F = listFilters.materials;
                if (F.level === undefined) Object.assign(F, { level: 'cats', cat: '', hersteller: '', splitType: '', leistung: '', serie: '', fav: false, stockF: '' });
                const q = (F.q || '').toLowerCase().trim();

                // --------- Basis-Filter (Favoriten / Bestand) ---------
                let pool = materials.filter(m => {
                    if (F.fav && m.favorite !== true) return false;
                    if (F.stockF === 'lager' && !(Number(m.stock) > 0)) return false;
                    if (F.stockF === 'min' && !(m.minStock > 0 && (Number(m.stock) || 0) < Number(m.minStock))) return false;
                    return true;
                });

                // --------- Intelligente Sofort-Suche: springt direkt zu Produkten ---------
                const searching = q.length >= 2;
                if (searching) {
                    pool = pool.filter(m => `${m.name || ''} ${m.manufacturer || ''} ${m.series || ''} ${m.articleNumber || ''} ${m.size || ''} ${m.category || ''} ${m.bauart || ''} ${m.notes || ''}`.toLowerCase().includes(q));
                }

                const inScope = pool.filter(m => {
                    if (F.cat && (m.category || 'Ohne Kategorie') !== F.cat) return false;
                    if (F.hersteller && (m.manufacturer || 'Ohne Hersteller') !== F.hersteller) return false;
                    if (F.serie && (m.series || 'Ohne Serie') !== F.serie) return false;
                    // splitType-Filter
                    if (F.splitType) {
                        const b = m.bauart || '';
                        const isSingle = b.includes('Single-Split') || b === 'Klimaset' || b === 'Truhengerät';
                        const isMulti  = b.includes('Multi-Split') || b.includes('Multi Split');
                        if (F.splitType === 'Single Split' && !isSingle) return false;
                        if (F.splitType === 'Multi Split'  && !isMulti)  return false;
                        if (F.splitType === 'Zubehör' && (isSingle || isMulti)) return false;
                    }
                    // Leistungs-Filter (kW) für Single-Split
                    if (F.leistung && (m.size || '') !== F.leistung) return false;
                    return true;
                });

                const level = searching ? 'produkte' : F.level;

                // --------- Breadcrumb (F.cat kann "Ordner/Unterordner" sein) ---------
                const catSegs = F.cat ? F.cat.split('/') : [];
                const crumbs = [`<button class="crumb ${level === 'cats' ? 'active' : ''}" onclick="app.matNav('cats')" ondragover="event.preventDefault();" ondrop="app.matDropOnCrumb(event, '')">${icon('box')} Material</button>`];
                catSegs.forEach((seg, i) => {
                    const partial = catSegs.slice(0, i + 1).join('/');
                    const isLastSeg = i === catSegs.length - 1;
                    crumbs.push(`<button class="crumb ${isLastSeg && level === 'hersteller' ? 'active' : ''}" onclick="app.matOpenCatPath('${escapeHtml(partial).replace(/'/g, "\\'")}')" ondragover="event.preventDefault();" ondrop="app.matDropOnCrumb(event, '${escapeHtml(partial).replace(/'/g, "\\'")}')">${i === 0 ? matCatIcon(partial) + ' ' : ''}${escapeHtml(seg)}</button>`);
                });
                if (F.hersteller) crumbs.push(`<button class="crumb ${level === 'splittype' ? 'active' : ''}" onclick="app.matNav('splittype')">${escapeHtml(F.hersteller)}</button>`);
                if (F.splitType) crumbs.push(`<button class="crumb ${level === 'leistung' ? 'active' : (level === 'serien' && !F.leistung ? 'active' : '')}" onclick="app.matNav('leistung')">${escapeHtml(F.splitType)}</button>`);
                if (F.leistung) crumbs.push(`<button class="crumb ${level === 'serien' ? 'active' : ''}" onclick="app.matNav('serien')">${escapeHtml(F.leistung)} kW</button>`);
                if (F.serie) crumbs.push(`<button class="crumb active">${escapeHtml(F.serie)}</button>`);

                // --------- Ebenen-Inhalt ---------
                let body = '';
                if (level === 'cats' || level === 'subcats') {
                    // Bei 'subcats' nur innerhalb von F.cat gruppieren (Unterordner-Ebene),
                    // bei 'cats' auf oberster Ebene (nur der erste Pfad-Abschnitt vor "/").
                    const prefix = level === 'subcats' ? F.cat + '/' : '';
                    const scopePool = level === 'subcats' ? pool.filter(m => { const c = m.category || 'Ohne Kategorie'; return c === F.cat || c.startsWith(prefix); }) : pool;
                    const groups = {};
                    let directCount = 0;
                    for (const m of scopePool) {
                        const c = m.category || 'Ohne Kategorie';
                        if (level === 'subcats' && c === F.cat) { directCount++; continue; }
                        const rest = level === 'subcats' ? c.slice(prefix.length) : c;
                        const seg = rest.split('/')[0];
                        (groups[seg] = groups[seg] || []).push(m);
                    }
                    const cats = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
                    const folderCard = (segLabel, fullPath, list) => {
                        const img = list.find(m => (m.images && m.images[0]) || m.image);
                        const imgSrc = img ? (img.images && img.images[0] ? img.images[0] : img.image) : null;
                        const upd = Math.max(...list.map(m => new Date(m.updatedAt || m.createdAt || 0).getTime() || 0));
                        const pathEsc = escapeHtml(fullPath).replace(/'/g, "\\'");
                        return `<div class="mat-card mat-cat" draggable="true" data-catpath="${escapeHtml(fullPath)}"
                                ondragstart="app.matCatDragStart(event, '${pathEsc}')" ondragover="event.preventDefault(); this.classList.add('drag-over');" ondragleave="this.classList.remove('drag-over');" ondrop="app.matCatDrop(event, '${pathEsc}')"
                                onclick="app.matOpenCatPath('${pathEsc}')">
                            <div class="mat-cat-ico">${imgSrc ? `<img src="${imgSrc}">` : matCatIcon(segLabel)}</div>
                            <div class="mat-card-body">
                                <div class="mat-card-title">${escapeHtml(segLabel)}</div>
                                <div class="mat-card-sub">${list.length} Produkt${list.length !== 1 ? 'e' : ''}${upd > 0 ? ' · Stand ' + formatDate(new Date(upd).toISOString()) : ''}</div>
                            </div>
                            <button class="mat-cat-edit" title="Ordner verwalten" onclick="event.stopPropagation(); app.openCategoryManageModal('${pathEsc}')">${icon('edit')}</button>
                            <div class="mat-card-arrow">›</div>
                        </div>`;
                    };
                    let cardsHtml = cats.map(c => folderCard(c, (prefix + c), groups[c])).join('');
                    if (level === 'subcats' && directCount > 0) {
                        const directList = scopePool.filter(m => (m.category || 'Ohne Kategorie') === F.cat);
                        cardsHtml += `<div class="mat-card mat-cat" onclick="app.matOpenCatPath('${escapeHtml(F.cat).replace(/'/g, "\\'")}')">
                            <div class="mat-cat-ico">📄</div>
                            <div class="mat-card-body"><div class="mat-card-title">Direkt in „${escapeHtml(F.cat.split('/').pop())}"</div><div class="mat-card-sub">${directList.length} Produkt${directList.length !== 1 ? 'e' : ''} ohne Unterordner</div></div>
                            <div class="mat-card-arrow">›</div>
                        </div>`;
                    }
                    body = (cats.length || directCount > 0) ? `<div class="mat-grid">${cardsHtml}</div>` : '<div class="empty-note" style="padding:30px;">Noch keine Materialien – lege welche an oder importiere den Katalog.</div>';
                } else if (level === 'hersteller') {
                    const groups = {};
                    for (const m of inScope) {
                        const h = m.manufacturer || 'Ohne Hersteller';
                        (groups[h] = groups[h] || []).push(m);
                    }
                    const hs = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
                    if (hs.length <= 1) { F.hersteller = hs[0] || ''; F.level = 'splittype'; renderMaterials(); return; }
                    body = `<div class="mat-grid">${hs.map(h => {
                        const list = groups[h];
                        const avail = list.filter(m => Number(m.stock) > 0).length;
                        return `<div class="mat-card mat-cat" onclick="app.matOpenHersteller('${escapeHtml(h).replace(/'/g, "\\'")}')">
                            <div class="mat-brand-logo">${escapeHtml((h || '?').slice(0, 2).toUpperCase())}</div>
                            <div class="mat-card-body">
                                <div class="mat-card-title">${escapeHtml(h)}</div>
                                <div class="mat-card-sub">${list.length} Produkte · ${avail} auf Lager</div>
                            </div>
                            <div class="mat-card-arrow">›</div>
                        </div>`;
                    }).join('')}</div>`;
                } else if (level === 'splittype') {
                    // Neue Ebene: Single Split / Multi Split / Zubehör
                    const isSingle = m => m.bauart?.includes('Single-Split') || m.bauart === 'Klimaset' || m.bauart === 'Truhengerät';
                    const isMulti  = m => m.bauart?.includes('Multi-Split') || m.bauart?.includes('Multi Split');
                    const isZub    = m => m.bauart === 'Zubehör' || (!isSingle(m) && !isMulti(m) && m.category === 'Klimaanlagen');
                    const singleList = inScope.filter(isSingle);
                    const multiList  = inScope.filter(isMulti);
                    const zubList    = inScope.filter(m => !isSingle(m) && !isMulti(m));
                    // Wenn nur eine Gruppe: direkt durchgehen
                    const groups = [];
                    if (singleList.length) groups.push({ key: 'Single Split', label: 'Single Split', icon: '❄️', list: singleList, desc: 'Ein Innen- + ein Außengerät' });
                    if (multiList.length)  groups.push({ key: 'Multi Split',  label: 'Multi Split',  icon: '🔀', list: multiList,  desc: 'Ein Außengerät für mehrere Innengeräte' });
                    if (zubList.length)    groups.push({ key: 'Zubehör',      label: 'Zubehör',      icon: '🔧', list: zubList,    desc: `${zubList.length} Zubehörartikel` });
                    if (groups.length <= 1) { F.splitType = groups[0]?.key || ''; F.level = 'serien'; renderMaterials(); return; }
                    body = `<div class="mat-grid">${groups.map(g => {
                        const avail = g.list.filter(m => Number(m.stock) > 0).length;
                        return `<div class="mat-card mat-cat" onclick="app.matOpenSplitType('${escapeHtml(g.key).replace(/'/g, "\\'")}')">
                            <div class="mat-cat-ico" style="font-size:28px;">${g.icon}</div>
                            <div class="mat-card-body">
                                <div class="mat-card-title">${escapeHtml(g.label)}</div>
                                <div class="mat-card-sub">${g.list.length} Produkte${avail ? ' · ' + avail + ' auf Lager' : ''} · ${escapeHtml(g.desc)}</div>
                            </div>
                            <div class="mat-card-arrow">›</div>
                        </div>`;
                    }).join('')}</div>`;
                } else if (level === 'leistung') {
                    // Leistungs-Ebene: kW-Gruppen als Kacheln (Single-Split)
                    const sizes = [...new Set(inScope.map(m => m.size || '').filter(Boolean))]
                        .sort((a, b) => (parseFloat(String(a).replace(',', '.')) || 0) - (parseFloat(String(b).replace(',', '.')) || 0));
                    const isSingle = F.splitType === 'Single Split';
                    if (sizes.length === 0) { body = '<div class="empty-state">Keine Geräte gefunden.</div>'; }
                    else body = `<div class="mat-grid">${sizes.map(sz => {
                        const inThisSize = inScope.filter(m => (m.size || '') === sz);
                        const hasIG = inThisSize.some(m => m.bauart?.includes('Innen'));
                        const hasAG = inThisSize.some(m => m.bauart?.includes('Außen'));
                        const pairOk = isSingle && hasIG && hasAG;
                        const pairHint = isSingle ? (pairOk ? '✅ Paar komplett' : (hasIG && !hasAG ? '⚠️ AG fehlt' : !hasIG && hasAG ? '⚠️ IG fehlt' : '')) : '';
                        const avail = inThisSize.filter(m => Number(m.stock) > 0).length;
                        return `<div class="mat-card mat-cat" onclick="app.matOpenLeistung('${escapeHtml(sz).replace(/'/g, "\\'")}')">
                            <div class="mat-cat-ico" style="font-size:26px;">⚡</div>
                            <div class="mat-card-body">
                                <div class="mat-card-title">${escapeHtml(sz)} kW</div>
                                <div class="mat-card-sub">${inThisSize.length} Gerät${inThisSize.length!==1?'e':''}${avail ? ' · ' + avail + ' auf Lager' : ''}${pairHint ? ' · ' + pairHint : ''}</div>
                            </div>
                            <div class="mat-card-arrow">›</div>
                        </div>`;
                    }).join('')}</div>`;
                } else if (level === 'serien') {
                    const groups = {};
                    for (const m of inScope) {
                        const s = m.series || 'Ohne Serie';
                        (groups[s] = groups[s] || []).push(m);
                    }
                    const ss = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
                    if (ss.length <= 1) { F.serie = ss[0] || ''; F.level = 'produkte'; renderMaterials(); return; }
                    body = `<div class="mat-grid">${ss.map(s => {
                        const list = groups[s];
                        const kws = list.map(m => parseFloat(String(m.size).replace(',', '.'))).filter(n => !isNaN(n));
                        const range = kws.length ? `${Math.min(...kws).toFixed(1).replace('.', ',')}–${Math.max(...kws).toFixed(1).replace('.', ',')} kW` : '';
                        return `<div class="mat-card mat-cat" onclick="app.matOpenSerie('${escapeHtml(s).replace(/'/g, "\\'")}')">
                            <div class="mat-cat-ico">${matCatIcon(F.cat)}</div>
                            <div class="mat-card-body">
                                <div class="mat-card-title">${escapeHtml(s)}</div>
                                <div class="mat-card-sub">${list.length} Modelle${range ? ' · ' + range : ''}</div>
                            </div>
                            <div class="mat-card-arrow">›</div>
                        </div>`;
                    }).join('')}</div>`;
                } else {
                    // --------- Ebene 4: Produktkarten ---------
                    const list = inScope.sort((a, b) => (parseFloat(String(a.size).replace(',', '.')) || 0) - (parseFloat(String(b.size).replace(',', '.')) || 0) || (a.name || '').localeCompare(b.name || ''));
                    const selectMode = !!F.selectMode;
                    const selected = F.selected || (F.selected = new Set());
                    const productCard = (m) => {
                        const st = matStockStatus(m);
                        const imgs = Array.isArray(m.images) && m.images.length ? m.images : (m.image ? [m.image] : []);
                        const isSel = selected.has(String(m.id));
                        const clickAction = selectMode ? `app.matToggleSelect(${idJS(m.id)})` : `app.openMaterialDetail(${idJS(m.id)})`;
                        return `<div class="mat-card mat-product ${selectMode ? 'mat-select-mode' : ''} ${isSel ? 'mat-selected' : ''}"
                                draggable="${selectMode ? 'false' : 'true'}" ondragstart="app.matProductDragStart(event, ${idJS(m.id)})"
                                onclick="${clickAction}">
                            ${selectMode ? `<div class="mat-select-cb ${isSel ? 'on' : ''}">${isSel ? '✓' : ''}</div>` : `<button class="mat-fav ${m.favorite ? 'on' : ''}" onclick="event.stopPropagation(); app.toggleFavorite(${idJS(m.id)})" title="Favorit">${m.favorite ? '★' : '☆'}</button>`}
                            <div class="mat-product-img">${imgs.length ? `<img src="${imgs[0]}">` : `<span>${matCatIcon(m.category)}</span>`}${imgs.length > 1 ? `<span class="mat-img-count">📷 ${imgs.length}</span>` : ''}</div>
                            <div class="mat-card-body">
                                <div class="mat-card-title">${escapeHtml(m.name)}</div>
                                <div class="mat-card-sub">${[m.manufacturer, m.series, m.size].filter(Boolean).map(escapeHtml).join(' · ') || '&nbsp;'}</div>
                                ${m.articleNumber ? `<div class="mat-card-art">Art. ${escapeHtml(m.articleNumber)}</div>` : ''}
                                <div class="mat-card-foot">
                                    <div class="mat-price">${formatCurrency(m.sellingPrice || 0)}<small> VK</small></div>
                                    <span class="mat-stock ${st.cls}">${st.label}</span>
                                </div>
                            </div>
                            ${!selectMode ? `<button class="btn btn-sm btn-primary mat-add" onclick="event.stopPropagation(); app.addMaterialToProject(${idJS(m.id)})">${icon('plus')} Zum Projekt</button>` : ''}
                        </div>`;
                    };

                    if (!list.length) {
                        body = `<div class="empty-note" style="padding:30px;">${searching ? 'Keine Treffer für „' + escapeHtml(q) + '".' : 'Keine Produkte in dieser Auswahl.'}</div>`;
                    } else if (list.some(m => m.bauart)) {
                        // Nach Bauart gruppieren (Innen/Außen, Single/Multi ...) – nur wenn gepflegt
                        const order = ['Innengerät Single-Split', 'Außengerät Single-Split', 'Innengerät Multi-Split', 'Außengerät Multi-Split', 'Innengerät VRF', 'Außengerät VRF', 'Wärmepumpe', 'Kanalgerät', 'Deckenkassette', 'Konsolengerät', 'Unterdeckengerät', 'Truhengerät', 'Klimaset', 'Zubehör'];
                        const groups = {};
                        list.forEach(m => { const b = m.bauart || 'Sonstige'; (groups[b] = groups[b] || []).push(m); });
                        const keys = Object.keys(groups).sort((a, b) => {
                            const ia = order.indexOf(a), ib = order.indexOf(b);
                            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                        });
                        body = keys.map(k => `
                            <div class="mat-bauart-group">
                                <div class="mat-bauart-head">${escapeHtml(k)} <span>(${groups[k].length})</span></div>
                                <div class="mat-grid mat-grid-products">${groups[k].map(productCard).join('')}</div>
                            </div>`).join('');
                    } else {
                        body = `<div class="mat-grid mat-grid-products">${list.map(productCard).join('')}</div>`;
                    }
                }

                contentArea.innerHTML = `
                    <div class="toolbar">
                        <div class="search-inline" style="flex:1;max-width:460px;">
                            <span class="search-icon">${icon('search')}</span>
                            <input type="text" id="matSearch" placeholder="Modell, Hersteller, Serie, Art.-Nr., Leistung..." value="${escapeHtml(F.q || '')}">
                        </div>
                        <button class="btn btn-sm ${F.fav ? 'btn-primary' : 'btn-outline'}" id="matFav">★ Favoriten</button>
                        <select class="filter-select" id="matStockF">
                            <option value="">Bestand: alle</option>
                            <option value="lager" ${F.stockF === 'lager' ? 'selected' : ''}>Auf Lager</option>
                            <option value="min" ${F.stockF === 'min' ? 'selected' : ''}>Unter Minimum</option>
                        </select>
                        <div class="toolbar-spacer"></div>
                        ${level === 'produkte' ? `<button class="btn btn-sm ${F.selectMode ? 'btn-primary' : 'btn-outline'}" id="matSelectToggle">${F.selectMode ? '✕ Auswahl beenden' : '☑ Mehrfachauswahl'}</button>` : ''}
                        <button class="btn btn-primary btn-sm" onclick="app.openDeviceConfigurator()">🔧 Geräte-Konfigurator</button>
                        <button class="btn btn-outline btn-sm" onclick="app.exportMaterialsExcel()">Excel Export</button>
                        <button class="btn btn-outline btn-sm" onclick="app.importMaterialsExcel()">Excel Import</button>
                    </div>
                    <div class="mat-crumbs">${crumbs.join('<span class="crumb-sep">›</span>')}
                        ${searching ? `<span class="crumb-hint">${inScope.length} Treffer</span>` : ''}
                    </div>
                    ${F.selectMode && level === 'produkte' && (F.selected && F.selected.size > 0) ? `
                        <div class="mat-bulk-bar">
                            <span><strong>${F.selected.size}</strong> ausgewählt</span>
                            <button class="btn btn-sm btn-outline" id="matBulkMove">📁 In Kategorie verschieben</button>
                            <button class="btn btn-sm btn-danger" id="matBulkDelete">${icon('trash')} Löschen</button>
                            <button class="btn btn-sm btn-outline" id="matBulkClear">Auswahl aufheben</button>
                        </div>` : ''}
                    ${body}
                    <button class="fab" onclick="app.openMaterialModal()" title="Neues Material">+</button>
                `;

                const inp = document.getElementById('matSearch');
                inp.addEventListener('input', () => {
                    F.q = inp.value;
                    clearTimeout(inp._t);
                    inp._t = setTimeout(() => { renderMaterials(); setTimeout(() => { const el = document.getElementById('matSearch'); el?.focus(); el?.setSelectionRange(el.value.length, el.value.length); }, 0); }, 220);
                });
                document.getElementById('matFav').addEventListener('click', () => { F.fav = !F.fav; renderMaterials(); });
                document.getElementById('matStockF').addEventListener('change', (e) => { F.stockF = e.target.value; renderMaterials(); });
                document.getElementById('matSelectToggle')?.addEventListener('click', () => {
                    F.selectMode = !F.selectMode;
                    if (!F.selectMode) F.selected = new Set();
                    renderMaterials();
                });
                document.getElementById('matBulkClear')?.addEventListener('click', () => { F.selected = new Set(); renderMaterials(); });
                document.getElementById('matBulkDelete')?.addEventListener('click', () => app.matBulkDelete());
                document.getElementById('matBulkMove')?.addEventListener('click', () => app.matBulkMove());
            })();
        }

        function renderOffers() {
            (async () => {
                const offers = await db.getAll('offers');
                const projects = await db.getAll('projects');
                const customers = await db.getAll('customers');
                const materials = await db.getAll('materials');
                const dealerDiscounts = (typeof getDealerDiscounts === 'function') ? await getDealerDiscounts() : {};
                // Marge-Schwellen (frei einstellbar via Settings, sonst Standard 10/20)
                let marginThresholds = { low: 10, high: 20 };
                try { const t = await getSetting('marginThresholds'); if (t) marginThresholds = JSON.parse(t); } catch (e) {}

                // Interner Gewinn eines (eingefrorenen) Angebots aus seinen Positionen
                // Einkaufspreis pro VERKAUFTER Einheit (rechnet Rolle/Bund/Stange -> Meter um).
                // Nutzt die EINE zentrale Funktion (01-core-db-sync.js) - keine eigene Kopie
                // mehr, damit ein hier behobener Bug nicht anderswo erneut auftaucht.
                const ekPerSalesUnit = (m) => window.ekPerSalesUnit(m, dealerDiscounts);

                // Zentrale Gewinnfunktion – nutzt recomputeOffer für alle Preisfelder,
                // damit PDF, Liste und Diagnose exakt dieselben Werte zeigen.
                // Gewinn = Endverkaufspreis (nach allen Rabatten) − Materialkosten − sonstige
                const offerProfit = (o) => {
                    const R = (typeof recomputeOffer === 'function') ? recomputeOffer(o) : null;
                    // Endverkaufspreis nach Positions- UND Gesamt-Rabatt, inkl. vereinbarten Preis
                    const salesGross     = R ? R.gross   : 0;   // Summe VK vor Positionsrabatt
                    const salesNet       = R ? R.net     : 0;   // nach Positionsrabatt
                    const globalDiscount = R ? R.globalDiscount : 0;  // Gesamt-Rabatt €
                    const salesAfter     = R ? R.netAfter : salesNet; // nach allem Rabatt (ohne MwSt)
                    // vereinbarter Preis überschreibt netAfter (Sonderpreis mit Kunde vereinbart)
                    const salesEffective = (o.agreedPrice != null && o.agreedPrice !== '')
                        ? Number(o.agreedPrice)
                        : salesAfter;

                    const isLabor = (it) => { const c = (it.category||'').toLowerCase(), n = (it.name||'').toLowerCase(); return c.includes('arbeit')||c.includes('anfahrt')||c.includes('montage')||c.includes('lohn')||n.includes('arbeitsleistung')||n.includes('montage')||n.includes('anfahrt')||n.includes('arbeitsstunde'); };
                    const positions = (o.positions || []).filter(it => it && (Number(it.quantity)||0) > 0 && (Number(it.price)||0) >= 0);
                    let materialCost = 0, laborSales = 0, missingCount = 0;
                    const lines = [];
                    positions.forEach(it => {
                        const qty  = Number(it.quantity) || 0;
                        const disc = Number(it.discount)  || 0;
                        const lineSales = (Number(it.price)||0) * qty * (1 - disc/100);
                        const labor = isLabor(it);
                        let lineCost = 0, ekKnown = true, ekUnit = 0;
                        if (labor) {
                            laborSales += lineSales;
                        } else {
                            const m = materials.find(mm => String(mm.id) === String(it.materialId));
                            const r = ekPerSalesUnit(m);
                            ekKnown = r.known;
                            ekUnit = r.ek;
                            if (ekKnown) lineCost = ekUnit * qty;
                            else missingCount++;
                        }
                        materialCost += lineCost;
                        lines.push({ name: it.name||'(ohne Namen)', qty, unit: it.unit||'Stk', sales: lineSales, cost: lineCost, ekUnit, labor, ekKnown, discount: disc });
                    });
                    const otherCost = 0;   // Platzhalter für spätere sonstige Kosten
                    const profit = salesEffective - materialCost - otherCost;
                    const margin = salesEffective > 0 ? (profit / salesEffective) * 100 : 0;
                    return {
                        profit, margin,
                        salesGross, salesNet, globalDiscount, salesAfter, salesEffective,
                        materialCost, laborSales, otherCost,
                        totalCost: materialCost + otherCost,
                        missingCount, complete: missingCount === 0,
                        hasData: positions.length > 0, lines,
                        discountRate: R ? R.rate : 0,
                        discountEnabled: R ? R.discountEnabled : false
                    };
                };
                const marginColor = (m) => m < marginThresholds.low ? 'mg-red' : (m < marginThresholds.high ? 'mg-yellow' : 'mg-green');

                const q = listFilters.offers.q.toLowerCase();
                const statusFilter = listFilters.offers.status;
                const statuses = [...new Set(offers.map(o => o.status || 'Angebot offen'))];

                const filtered = offers.filter(o => {
                    const proj = projects.find(p => String(p.id) === String(o.projectId));
                    const cust = proj ? customers.find(c => String(c.id) === String(proj.customerId)) : null;
                    const hay = `${o.offerNumber || ''} ${proj?.title || ''} ${cust ? cust.firstName + ' ' + cust.lastName : ''}`.toLowerCase();
                    if (q && !hay.includes(q)) return false;
                    if (statusFilter && (o.status || 'Angebot offen') !== statusFilter) return false;
                    return true;
                }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

                contentArea.innerHTML = `
                    <div class="toolbar">
                        <div class="search-inline">
                            <span class="search-icon">${icon('search')}</span>
                            <input type="text" id="offSearch" placeholder="Suchen..." value="${escapeHtml(listFilters.offers.q)}">
                        </div>
                        <select class="filter-select" id="offStatusFilter">
                            <option value="">Alle Status</option>
                            ${statuses.map(s => `<option value="${escapeHtml(s)}" ${statusFilter === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
                        </select>
                        <div class="toolbar-spacer"></div>
                        <button class="btn btn-outline btn-sm" onclick="app.exportOffersExcel()">Excel Export</button>
                        <button class="btn btn-primary" onclick="app.createOfferFlow()">${icon('plus')} Neues Angebot</button>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Nummer</th><th>Kunde / Projekt</th><th>Datum</th><th>Gesamtbetrag</th><th>🔒 Gewinn</th><th>Status</th><th style="text-align:right;">Aktionen</th></tr></thead>
                            <tbody>
                                ${filtered.map(o => {
                                    const proj = projects.find(p => String(p.id) === String(o.projectId));
                                    const cust = proj ? customers.find(c => String(c.id) === String(proj.customerId)) : null;
                                    const p = offerProfit(o);
                                    const profitCell = p.hasData
                                        ? `<td><div class="mg-badge ${p.complete ? marginColor(p.margin) : 'mg-yellow'}" onclick="event.stopPropagation(); app.showOfferDiagnosis(${idJS(o.id)})" title="Klick für Details">${p.profit >= 0 ? '+' : ''}${formatCurrency(p.profit)}<span class="mg-pct">${p.margin.toFixed(0)}%</span></div>${!p.complete ? `<div class="mg-note">⚠️ ${p.missingCount} × EK fehlt</div>` : ''}</td>`
                                        : `<td><span class="mg-na">–</span></td>`;
                                    return `<tr>
                                        <td><strong>${escapeHtml(o.offerNumber || 'Angebot')}</strong></td>
                                        <td>${escapeHtml(cust ? customerDisplayName(cust) : '-')}${proj ? `<div style="font-size:12px;color:var(--text-muted);">${escapeHtml(proj.title || '')}</div>` : ''}</td>
                                        <td>${formatDate(o.createdAt)}</td>
                                        <td><strong>${formatCurrency((o.agreedPrice != null && o.agreedPrice !== '') ? o.agreedPrice : (o.totalPrice || 0))}</strong>${(o.agreedPrice != null && o.agreedPrice !== '' && Number(o.agreedPrice) !== Number(o.totalPrice)) ? `<div style="font-size:11px;color:var(--text-muted);text-decoration:line-through;">${formatCurrency(o.totalPrice || 0)}</div>` : ''}${(Number(o.depositAmount) > 0) ? `<div style="font-size:11px;color:var(--success);">Anz. ${formatCurrency(o.depositAmount)} · Rest ${formatCurrency(Math.max(0, ((o.agreedPrice != null && o.agreedPrice !== '') ? Number(o.agreedPrice) : Number(o.totalPrice || 0)) - Number(o.depositAmount)))}</div>` : ''}</td>
                                        ${profitCell}
                                        <td><span class="status-badge ${getStatusClass(o.status || 'Angebot offen')}">${escapeHtml(o.status || 'Angebot offen')}</span></td>
                                        <td style="text-align:right;white-space:nowrap;">
                                            <button class="btn btn-sm btn-primary" onclick="app.promptExportOfferPDF(${idJS(o.id)})">${icon('pdf')} PDF</button>
                                            <button class="btn btn-sm btn-outline" onclick="app.promptExportOfferPDF(${idJS(o.id)})" title="Per WhatsApp, E-Mail o. Ä. teilen">📤 Teilen</button>
                                            <button class="btn btn-sm btn-outline" title="Variante mit anderer Klimamarke – alles andere bleibt gleich" onclick="app.createOfferVariant(${idJS(o.id)})">⇄ Variante</button>
                                            <button class="btn btn-sm btn-outline" title="Anzahlung & vereinbarter Preis" onclick="app.openOfferPayment(${idJS(o.id)})">💶 Zahlung</button>
                                            <button class="btn btn-sm btn-outline" title="Material aus diesem Angebot bestellen" onclick="app.createOrderFromOffer(${idJS(o.id)})">🛒 Bestellen</button>
                                            <button class="btn btn-sm btn-outline" title="Rechnung aus diesem Angebot erzeugen" onclick="app.createInvoiceFromOffer(${idJS(o.id)})">🧾 Rechnung</button>
                                            <button class="btn btn-sm btn-danger" onclick="app.deleteOffer(${idJS(o.id)})">${icon('trash')}</button>
                                        </td>
                                    </tr>`;
                                }).join('') || `<tr><td colspan="6" style="padding:0;"><div class="empty-state"><div style="font-size:40px;">📄</div><p>Noch keine Angebote.<br>Angebote erstellst du aus einem Projekt – oder direkt über den Schnellrechner.</p><button class="btn btn-primary" onclick="app.navigate('calc')">🔢 Zum Schnellrechner</button></div></td></tr>`}
                            </tbody>
                        </table>
                    </div>
                `;
                const inp = document.getElementById('offSearch');
                inp.addEventListener('input', () => {
                    listFilters.offers.q = inp.value;
                    clearTimeout(inp._t);
                    inp._t = setTimeout(() => { renderOffers(); setTimeout(() => { const el = document.getElementById('offSearch'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 0); }, 250);
                });
                document.getElementById('offStatusFilter').addEventListener('change', (e) => {
                    listFilters.offers.status = e.target.value;
                    renderOffers();
                });
            })();
        }

        // ============================================================
        // ============ BESTELLUNGEN (NEU) ============================
        // ============================================================
        const ORDER_STATUSES = ['Offen', 'Bestellt', 'Geliefert', 'Storniert'];

        function renderOrders() {
            (async () => {
                const orders = await db.getAll('orders');
                const projects = await db.getAll('projects');
                const customers = await db.getAll('customers');

                const q = listFilters.orders.q.toLowerCase();
                const statusFilter = listFilters.orders.status;

                const filtered = orders.filter(o => {
                    const proj = projects.find(p => String(p.id) === String(o.projectId));
                    const cust = proj ? customers.find(c => String(c.id) === String(proj.customerId)) : null;
                    const hay = `${o.supplier || ''} ${o.items || ''} ${proj?.title || ''} ${cust ? cust.firstName + ' ' + cust.lastName : ''}`.toLowerCase();
                    if (q && !hay.includes(q)) return false;
                    if (statusFilter && (o.status || 'Offen') !== statusFilter) return false;
                    return true;
                }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

                contentArea.innerHTML = `
                    <div class="toolbar">
                        <div class="search-inline">
                            <span class="search-icon">${icon('search')}</span>
                            <input type="text" id="ordSearch" placeholder="Suchen..." value="${escapeHtml(listFilters.orders.q)}">
                        </div>
                        <select class="filter-select" id="ordStatusFilter">
                            <option value="">Alle Status</option>
                            ${ORDER_STATUSES.map(s => `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                        <div class="toolbar-spacer"></div>
                        <button class="btn btn-primary" onclick="app.openOrderModal()">${icon('plus')} Neue Bestellung</button>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Projekt / Kunde</th><th>Lieferant</th><th>Datum</th><th>Artikel</th><th>Status</th><th style="text-align:right;">Aktionen</th></tr></thead>
                            <tbody>
                                ${filtered.map(o => {
                                    const proj = projects.find(p => String(p.id) === String(o.projectId));
                                    const cust = proj ? customers.find(c => String(c.id) === String(proj.customerId)) : null;
                                    return `<tr>
                                        <td>${proj ? `<strong>${escapeHtml(proj.title || 'Projekt')}</strong>` : '<span style="color:var(--text-muted);">Ohne Projekt</span>'}${cust ? `<div style="font-size:12px;color:var(--text-muted);">${escapeHtml(cust.firstName)} ${escapeHtml(cust.lastName)}</div>` : ''}</td>
                                        <td>${escapeHtml(o.supplier || '-')}</td>
                                        <td>${o.date ? formatDate(o.date) : formatDate(o.createdAt)}</td>
                                        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(o.items || '')}">${escapeHtml(o.items || '-')}</td>
                                        <td><span class="status-badge ${orderStatusClass(o.status || 'Offen')}">${escapeHtml(o.status || 'Offen')}</span></td>
                                        <td style="text-align:right;white-space:nowrap;">
                                            <button class="btn btn-sm btn-primary" onclick="app.exportOrderPDF(${idJS(o.id)})">${icon('pdf')} PDF</button>
                                            <button class="btn btn-sm btn-outline" onclick="app.openOrderModal(${idJS(o.id)})">${icon('edit')}</button>
                                            ${getCustomFields('orders').length ? `<button class="btn btn-sm btn-outline" title="Zusatzfelder" onclick="app.openCustomDataModal('orders', ${idJS(o.id)})">🔧</button>` : ''}
                                            <button class="btn btn-sm btn-danger" onclick="app.deleteOrder(${idJS(o.id)})">${icon('trash')}</button>
                                        </td>
                                    </tr>`;
                                }).join('') || `<tr><td colspan="6" style="padding:0;"><div class="empty-state"><div style="font-size:40px;">🛒</div><p>Noch keine Bestellungen.<br>Aus einem Projekt kannst du benötigtes Material direkt bestellen.</p></div></td></tr>`}
                            </tbody>
                        </table>
                    </div>
                `;
                const inp = document.getElementById('ordSearch');
                inp.addEventListener('input', () => {
                    listFilters.orders.q = inp.value;
                    clearTimeout(inp._t);
                    inp._t = setTimeout(() => { renderOrders(); setTimeout(() => { const el = document.getElementById('ordSearch'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 0); }, 250);
                });
                document.getElementById('ordStatusFilter').addEventListener('change', (e) => {
                    listFilters.orders.status = e.target.value;
                    renderOrders();
                });
            })();
        }

        // ============================================================
        // ============ EINSTELLUNGEN =================================
        // ============================================================
        function renderSettings() {
            (async () => {
                const companyName = await getSetting('companyName', '');
                const companyPhone = await getSetting('companyPhone', '');
                const companyEmail = await getSetting('companyEmail', '');
                const companyAddress = await getSetting('companyAddress', '');
                // Adresse in Bestandteile zerlegen (Format: "Straße 1, 1234 Ort")
                let street = '', plz = '', ort = '';
                if (companyAddress) {
                    const parts = companyAddress.split(',');
                    street = (parts[0] || '').trim();
                    const rest = (parts[1] || '').trim();
                    const m = rest.match(/^(\d{4,5})\s+(.*)$/);
                    if (m) { plz = m[1]; ort = m[2]; } else { ort = rest; }
                }

                contentArea.innerHTML = `
                    <div class="panel settings-form" style="margin-bottom:18px;">
                        <div class="panel-title">👤 Mein Konto</div>
                        <div class="account-box">
                            <div class="account-info">
                                <div class="account-email">${escapeHtml((window.__ktmAuth && window.__ktmAuth.email) || 'Angemeldet')}</div>
                                ${window.__ktmAuth && window.__ktmAuth.company ? `<div class="account-company">${escapeHtml(window.__ktmAuth.company)}</div>` : ''}
                            </div>
                            <button class="btn btn-outline" id="stgLogoutBtn">Abmelden</button>
                        </div>
                    </div>

                    <div class="panel settings-form" style="margin-bottom:18px;">
                        <div class="panel-title">Firmendaten</div>
                        <div class="form-group"><label>Firmenname</label><input type="text" id="stgName" value="${escapeHtml(companyName)}"></div>
                        <div class="form-row-3">
                            <div class="form-group"><label>Straße &amp; Hausnummer</label><input type="text" id="stgStreet" value="${escapeHtml(street)}"></div>
                            <div class="form-group"><label>PLZ</label><input type="text" id="stgPlz" value="${escapeHtml(plz)}"></div>
                            <div class="form-group"><label>Ort</label><input type="text" id="stgOrt" value="${escapeHtml(ort)}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Telefon</label><input type="text" id="stgPhone" value="${escapeHtml(companyPhone)}"></div>
                            <div class="form-group"><label>E-Mail</label><input type="email" id="stgEmail" value="${escapeHtml(companyEmail)}"></div>
                        </div>
                        <button class="btn btn-primary" id="stgSaveBtn">Firmendaten speichern</button>
                    </div>

                    <div class="panel settings-form" style="margin-bottom:18px;">
                        <div class="panel-title">🧮 Kalkulation (Schnellrechner & Angebote)</div>
                        <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Deine Montage-Richtwerte. Diese Preise verwendet der Schnellrechner für den Überschlag.</div>
                        <div class="form-row">
                            <div class="form-group"><label>Montage-Grundpauschale (€)</label><input type="number" min="0" id="rateMontageBase" value="${await getSetting('rateMontageBase', '380')}"></div>
                            <div class="form-group"><label>Montage je Raum (€)</label><input type="number" min="0" id="rateMontagePerRoom" value="${await getSetting('rateMontagePerRoom', '180')}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Leitung je Meter (€)</label><input type="number" min="0" step="any" id="rateLeitungPerM" value="${await getSetting('rateLeitungPerM', '22')}"></div>
                            <div class="form-group"><label>Wanddurchbruch je Stück (€)</label><input type="number" min="0" id="rateDurchbruch" value="${await getSetting('rateDurchbruch', '90')}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Altgerät-Demontage (€)</label><input type="number" min="0" id="rateDemontage" value="${await getSetting('rateDemontage', '120')}"></div>
                            <div class="form-group"><label>Gerüst / Höhenarbeit (€)</label><input type="number" min="0" id="rateGeruest" value="${await getSetting('rateGeruest', '140')}"></div>
                        </div>
                        <div class="form-group"><label>USt.-Satz (%)</label><input type="number" min="0" max="100" step="any" id="rateVat" value="${await getSetting('rateVat', '20')}"></div>
                        <button class="btn btn-primary" id="stgRatesSaveBtn">Kalkulation speichern</button>
                    </div>

                    <div class="card-grid" style="margin-bottom:18px;">
                        <div class="nav-card" onclick="app.openCompanySettings()">
                            <div class="card-icon blue">🏢</div>
                            <div><div class="card-title">Logo, Bank &amp; UID</div><div class="card-subtitle">Erweiterte Firmendaten für PDF</div></div>
                        </div>
                        <div class="nav-card" onclick="app.openPDFSettings()">
                            <div class="card-icon purple">📄</div>
                            <div><div class="card-title">PDF-Vorlage</div><div class="card-subtitle">Layout &amp; Texte anpassen</div></div>
                        </div>
                        <div class="nav-card" onclick="app.openFieldSettings()">
                            <div class="card-icon green">🔧</div>
                            <div><div class="card-title">Felder &amp; Kategorien</div><div class="card-subtitle">Anpassbare Felder</div></div>
                        </div>
                        <div class="nav-card" onclick="app.openDealerDiscounts()">
                            <div class="card-icon teal">🏷️</div>
                            <div><div class="card-title">Händlerrabatte</div><div class="card-subtitle">EK-Rabatt je Marke (LG, Daikin ...)</div></div>
                        </div>
                        <div class="nav-card" onclick="app.confirmImportKatalog()">
                            <div class="card-icon teal">📥</div>
                            <div><div class="card-title">Geräte-Katalog importieren</div><div class="card-subtitle">Samsung, Daikin, LG, Hisense, Bosch & Zubehör</div></div>
                        </div>
                        <div class="nav-card" onclick="app.navigate('backup')">
                            <div class="card-icon amber">💾</div>
                            <div><div class="card-title">Backup &amp; Export</div><div class="card-subtitle">Daten sichern / importieren</div></div>
                        </div>
                        <div class="nav-card" onclick="app.migrateMaterialCategories()">
                            <div class="card-icon" style="background:rgba(16,185,129,0.12);color:#059669;">🗂️</div>
                            <div><div class="card-title">Materialien neu zuordnen</div><div class="card-subtitle">Kategorien automatisch bereinigen</div></div>
                        </div>
                        <div class="nav-card" onclick="app.resetAllData()">
                            <div class="card-icon red">⚠️</div>
                            <div><div class="card-title">Alle Daten löschen</div><div class="card-subtitle">Zurücksetzen</div></div>
                        </div>
                    </div>

                    <div class="panel settings-form" style="margin-bottom:18px;">
                        <div class="panel-title">Sync-Diagnose</div>
                        <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Prüft die Verbindung zu Supabase und jede einzelne Tabelle – zeigt genau, wo es hakt.</div>
                        <button class="btn btn-outline" id="stgDiagBtn">Diagnose starten</button>
                        <div id="stgDiagResult" style="margin-top:12px;"></div>
                    </div>

                    <div class="panel settings-form">
                        <div class="panel-title">System</div>
                        <div style="font-size:13.5px;color:var(--text-muted);">Version 3.0 · Supabase-Sync <span id="stgSyncState"></span></div>
                    </div>
                `;

                document.getElementById('stgDiagBtn').addEventListener('click', () => {
                    runSyncDiagnosis(document.getElementById('stgDiagResult'));
                });

                document.getElementById('stgRatesSaveBtn')?.addEventListener('click', async () => {
                    const num = id => String(Math.max(0, parseFloat(String(document.getElementById(id).value).replace(',', '.')) || 0));
                    await setSetting('rateMontageBase', num('rateMontageBase'));
                    await setSetting('rateMontagePerRoom', num('rateMontagePerRoom'));
                    await setSetting('rateLeitungPerM', num('rateLeitungPerM'));
                    await setSetting('rateDurchbruch', num('rateDurchbruch'));
                    await setSetting('rateDemontage', num('rateDemontage'));
                    await setSetting('rateGeruest', num('rateGeruest'));
                    await setSetting('rateVat', num('rateVat'));
                    showToast('Kalkulation gespeichert – der Schnellrechner nutzt jetzt deine Preise.', 'success');
                });

                const st = document.getElementById('stgSyncState');
                if (st) st.textContent = supabaseAvailable ? (navigator.onLine ? '🟢 aktiv' : '🔴 offline') : '⚪ nicht verbunden';

                const logoutBtn = document.getElementById('stgLogoutBtn');
                if (logoutBtn) logoutBtn.addEventListener('click', () => {
                    showModal('Abmelden?',
                        '<div style="font-size:13.5px;line-height:1.5;">Möchtest du dich wirklich abmelden? Deine Daten bleiben sicher in der Cloud gespeichert und sind nach dem nächsten Login wieder da.</div>',
                        async () => {
                            if (window.__ktmAuth && window.__ktmAuth.signOut) {
                                await window.__ktmAuth.signOut();
                            } else {
                                window.location.reload();
                            }
                        },
                        'Abmelden'
                    );
                });

                document.getElementById('stgSaveBtn').addEventListener('click', async () => {
                    const name = document.getElementById('stgName').value.trim();
                    const address = [
                        document.getElementById('stgStreet').value.trim(),
                        [document.getElementById('stgPlz').value.trim(), document.getElementById('stgOrt').value.trim()].filter(Boolean).join(' ')
                    ].filter(Boolean).join(', ');
                    await setSetting('companyName', name);
                    await setSetting('companyAddress', address);
                    await setSetting('companyPhone', document.getElementById('stgPhone').value.trim());
                    await setSetting('companyEmail', document.getElementById('stgEmail').value.trim());
                    refreshAvatar();
                    showToast('Firmendaten gespeichert.', 'success');
                });
            })();
        }

        // ============================================================
        // ============ AUTO-REPARATUR: ALT-IDs -> UUID ===============
        // ============================================================
        // Supabase-Tabellen nutzen UUID-Spalten. Lokale Alt-Datensätze mit
        // Ganzzahl-IDs (aus der Zeit vor der UUID-Umstellung) können deshalb
        // nie gepusht werden ("invalid input syntax for type uuid"). Diese
        // Routine läuft bei jedem App-Start und stellt solche Datensätze
        // automatisch auf UUIDs um - inklusive der Verknüpfungen.
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        function isUuidId(v) { return typeof v === 'string' && UUID_RE.test(v); }

        async function repairLegacyIds() {
            const parentStores = ['customers', 'projects'];
            const childStores = ['rooms', 'images', 'materials', 'offers', 'orders', 'events'];
            const remap = { customers: new Map(), projects: new Map() };
            let repaired = 0, refsFixed = 0, refsCleared = 0;

            for (const store of [...parentStores, ...childStores]) {
                const rows = await db.getAll(store);
                for (const rec of rows) {
                    if (rec.id === undefined || rec.id === null) continue;
                    if (isUuidId(String(rec.id))) continue;
                    // Bereits erfolgreich synchronisierte Alt-Daten nicht anfassen
                    if (rec._synced === true) continue;
                    const oldId = rec.id;
                    const newId = generateUUID();
                    if (remap[store]) remap[store].set(String(oldId), newId);
                    await db.deleteLocalOnly(store, oldId);
                    rec.id = newId;
                    rec._synced = false;
                    await db.putLocalOnly(store, rec);
                    repaired++;
                }
            }

            // Verknüpfungen (projectId/customerId) unsynchronisierter Datensätze nachziehen
            const refFields = {
                projects: ['customerId'],
                rooms: ['projectId'],
                images: ['projectId'],
                offers: ['projectId'],
                orders: ['projectId'],
                events: ['projectId', 'customerId']
            };
            for (const [store, fields] of Object.entries(refFields)) {
                const rows = await db.getAll(store);
                for (const rec of rows) {
                    if (rec._synced === true) continue;
                    let changed = false;
                    for (const f of fields) {
                        const v = rec[f];
                        if (v === undefined || v === null || v === '') continue;
                        if (isUuidId(String(v))) continue;
                        const parent = f === 'customerId' ? 'customers' : 'projects';
                        const mapped = remap[parent].get(String(v));
                        if (mapped) { rec[f] = mapped; refsFixed++; }
                        else { rec[f] = null; refsCleared++; }
                        changed = true;
                    }
                    if (changed) { rec._synced = false; await db.putLocalOnly(store, rec); }
                }
            }

            // Lösch-Warteschlange von Alt-IDs säubern (UUID-Spalten können sie nie annehmen,
            // sonst bleiben sie ewig hängen und werfen bei jedem Sync Fehler)
            try {
                const pend = await getPendingDeletes();
                const cleaned = pend.filter(p => p.table === 'settings' || isUuidId(String(p.id)));
                if (cleaned.length !== pend.length) {
                    await db.putLocalOnly('settings', { key: PENDING_DELETES_KEY, value: JSON.stringify(cleaned) });
                    console.log(`ID-Reparatur: ${pend.length - cleaned.length} veraltete Einträge aus der Lösch-Warteschlange entfernt.`);
                }
            } catch (e) { /* ignorieren */ }

            if (repaired > 0 || refsFixed > 0 || refsCleared > 0) {
                console.log(`ID-Reparatur: ${repaired} Datensätze auf UUID umgestellt, ${refsFixed} Verknüpfungen aktualisiert, ${refsCleared} verwaiste Verknüpfungen entfernt.`);
                showToast(`${repaired} alte Datensätze für den Sync repariert.`, 'success');
            }
        }

        // ============================================================
        // ============ SYNC-DIAGNOSE =================================
        // ============================================================
        async function runSyncDiagnosis(resultEl) {
            resultEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">Prüfe Verbindung und Tabellen...</div>';
            const lines = [];
            const row = (ok, label, detail) => `
                <div style="display:flex;gap:9px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;">
                    <span>${ok ? '✅' : '❌'}</span>
                    <div><strong>${escapeHtml(label)}</strong>${detail ? `<div style="color:${ok ? 'var(--text-muted)' : 'var(--danger)'};font-size:12px;">${escapeHtml(detail)}</div>` : ''}</div>
                </div>`;

            // 1) Grundvoraussetzungen
            lines.push(row(navigator.onLine, 'Internetverbindung', navigator.onLine ? '' : 'Gerät ist offline.'));
            lines.push(row(supabaseAvailable, 'Supabase-SDK geladen', supabaseAvailable ? '' : 'CDN-Script konnte nicht geladen werden (Netzwerk/Adblocker?).'));

            if (!navigator.onLine || !supabaseAvailable) {
                resultEl.innerHTML = lines.join('');
                return;
            }

            // 2) Jede Tabelle einzeln testen
            const tables = ['customers','projects','rooms','images','materials','offers','orders','events','settings'];
            for (const t of tables) {
                try {
                    const { error } = await sb.from(sbTable(t)).select(t === 'settings' ? 'key' : 'id').limit(1);
                    if (error) {
                        let hint = error.message;
                        if (/does not exist|Could not find the table|schema cache/i.test(error.message)) hint = 'Tabelle fehlt in Supabase → SQL-Skript im Supabase SQL-Editor ausführen.';
                        else if (/bigint|invalid input syntax/i.test(error.message)) hint = 'ID-Typ passt nicht (bigint statt text/uuid) → Migrations-SQL nötig. Original: ' + error.message;
                        else if (/permission|policy|row-level/i.test(error.message)) hint = 'RLS-Policy blockiert Zugriff → Policy für diese Tabelle anlegen. Original: ' + error.message;
                        lines.push(row(false, 'Tabelle "' + t + '"', hint));
                    } else {
                        lines.push(row(true, 'Tabelle "' + t + '"', ''));
                    }
                } catch (e) {
                    lines.push(row(false, 'Tabelle "' + t + '"', e.message || String(e)));
                }
            }

            // 3) Alt-IDs, die nicht in UUID-Spalten passen
            try {
                let legacy = 0;
                for (const t of tables) {
                    if (t === 'settings') continue;
                    const rows = await db.getAll(t);
                    legacy += rows.filter(r => r.id !== undefined && r.id !== null && !isUuidId(String(r.id)) && r._synced !== true).length;
                }
                lines.push(row(legacy === 0, 'Alt-IDs (nicht UUID)', legacy === 0 ? '' : legacy + ' Datensätze mit alter Nummern-ID – App neu laden, dann werden sie automatisch repariert.'));
            } catch (e) { /* ignorieren */ }

            // 4) Lokale Warteschlangen
            try {
                const pending = await getPendingDeletes();
                lines.push(row(pending.length === 0, 'Offene Lösch-Warteschlange', pending.length === 0 ? '' : pending.length + ' Löschung(en) warten auf Sync.'));
            } catch (e) { /* ignorieren */ }
            try {
                let unsynced = 0;
                for (const t of tables) {
                    const rows = await db.getAll(t);
                    unsynced += rows.filter(r => !r._synced && !(t === 'settings' && typeof r.key === 'string' && r.key.startsWith('_'))).length;
                }
                lines.push(row(true, 'Noch nicht gepushte Datensätze', unsynced + ' lokal ausstehend' + (unsynced > 0 ? ' (werden beim nächsten Sync übertragen)' : '')));
            } catch (e) { /* ignorieren */ }

            resultEl.innerHTML = lines.join('');
        }

        // ============================================================
        // ============ BACKUP ========================================
        // ============================================================
        function renderBackup() {
            contentArea.innerHTML = `
                <div class="card-grid">
                    <div class="nav-card" onclick="app.createBackup()">
                        <div class="card-icon blue">💾</div>
                        <div><div class="card-title">Backup erstellen</div><div class="card-subtitle">Alle Daten als Datei speichern</div></div>
                    </div>
                    <div class="nav-card" onclick="app.restoreBackup()">
                        <div class="card-icon green">📥</div>
                        <div><div class="card-title">Backup wiederherstellen</div><div class="card-subtitle">Daten aus Datei laden</div></div>
                    </div>
                    <div class="nav-card" onclick="app.exportAllExcel()">
                        <div class="card-icon purple">📊</div>
                        <div><div class="card-title">Komplett-Export</div><div class="card-subtitle">Alle Daten als Excel</div></div>
                    </div>
                    <div class="nav-card" onclick="app.importAllExcel()">
                        <div class="card-icon amber">📤</div>
                        <div><div class="card-title">Komplett-Import</div><div class="card-subtitle">Daten aus Excel importieren</div></div>
                    </div>
                </div>
            `;
        }

        // ============================================================
        // ============================================================
        // ============ EINHEITEN & BESICHTIGUNG ======================
        // ============================================================
        const UNITS = ['Stk', 'm', 'm²', 'lfm', 'Rolle', 'Karton', 'Paket', 'l', 'kg', 'Paar', 'Set', 'Std', 'Pauschal'];

        // ============================================================
        // ============ ANLAGENVERWALTUNG (Equipment) =================
        // ============================================================
        // Anlagen mit Hersteller, Kältemittel, F-Gase-Protokoll, QR-Code.

        async function renderEquipment(customerFilter) {
            const all = await db.getAll('equipment');
            const customers = await db.getAll('customers');
            const custName = (id) => { const c = customers.find(x => String(x.id) === String(id)); return c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '–'; };
            const list = customerFilter ? all.filter(e => String(e.customerId) === String(customerFilter)) : all;

            const F = window.KTM_FGAS;
            const card = (e) => {
                const t = F ? F.co2eq(e.refrigerant, e.fillKg) : 0;
                const due = F ? F.nextCheckDate(e.lastLeakCheck, t) : null;
                const overdue = due && due < new Date();
                const soon = due && !overdue && (due - new Date()) < 30 * 864e5;
                const badge = t >= 5
                    ? `<span class="eq-fgas ${overdue ? 'eq-fgas-over' : soon ? 'eq-fgas-soon' : ''}">${overdue ? '⚠️ Prüfung überfällig' : soon ? '🔔 Prüfung bald fällig' : '🧊 F-Gase-pflichtig'}</span>`
                    : '';
                return `
                <div class="eq-card" onclick="app.openEquipment('${e.id}')">
                    <div class="eq-card-top">
                        <div class="eq-title">${escapeHtml(e.manufacturer || '')} ${escapeHtml(e.model || 'Anlage')}</div>
                        ${badge}
                    </div>
                    <div class="eq-meta">
                        ${e.refrigerant ? `<span>❄️ ${escapeHtml(e.refrigerant)}${e.fillKg ? ' · ' + e.fillKg + ' kg' : ''}</span>` : ''}
                        ${t ? `<span>${t.toFixed(1)} t CO₂e</span>` : ''}
                        ${e.location ? `<span>📍 ${escapeHtml(e.location)}</span>` : ''}
                    </div>
                    <div class="eq-cust">${escapeHtml(custName(e.customerId))}${e.serialNumber ? ' · SN ' + escapeHtml(e.serialNumber) : ''}</div>
                </div>`;
            };

            contentArea.innerHTML = `
                <div class="page-head">
                    <div>
                        <h2 style="margin:0;">Anlagen</h2>
                        <div class="page-sub">${list.length} Anlage${list.length !== 1 ? 'n' : ''}${customerFilter ? ' · gefiltert' : ''}</div>
                    </div>
                    <button class="btn btn-primary" onclick="app.openEquipment()">${icon('plus')} Neue Anlage</button>
                </div>
                ${list.length ? `<div class="eq-grid">${list.map(card).join('')}</div>`
                    : `<div class="empty-state"><div style="font-size:40px;">🧊</div><p>Noch keine Anlagen erfasst.<br>Lege die erste Anlage an – mit Kältemittel, Füllmenge und automatischem F-Gase-Protokoll.</p><button class="btn btn-primary" onclick="app.openEquipment()">${icon('plus')} Erste Anlage anlegen</button></div>`}
            `;
        }

        // ============================================================
        // ============ WARTUNG (Maintenance) =========================
        // ============================================================
        async function renderMaintenance() {
            const all = await db.getAll('maintenance');
            const equipment = await db.getAll('equipment');
            const customers = await db.getAll('customers');
            const eqName = (id) => { const e = equipment.find(x => String(x.id) === String(id)); return e ? `${e.manufacturer || ''} ${e.model || 'Anlage'}`.trim() : 'Anlage'; };
            const custName = (id) => { const c = customers.find(x => String(x.id) === String(id)); return c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : ''; };

            // Fällige Wartungen (nächster Termin <= heute+30 Tage)
            const now = new Date();
            const withDue = all.map(m => ({ ...m, dueDate: m.nextDue ? new Date(m.nextDue) : null }));
            const upcoming = withDue.filter(m => m.dueDate).sort((a, b) => a.dueDate - b.dueDate);
            const overdue = upcoming.filter(m => m.dueDate < now);
            const soon = upcoming.filter(m => m.dueDate >= now && (m.dueDate - now) < 30 * 864e5);

            const row = (m) => {
                const od = m.dueDate && m.dueDate < now;
                const sn = m.dueDate && !od && (m.dueDate - now) < 30 * 864e5;
                return `
                <div class="mnt-row" onclick="app.openMaintenance('${m.id}')">
                    <div class="mnt-status ${od ? 'over' : sn ? 'soon' : 'ok'}"></div>
                    <div class="mnt-body">
                        <div class="mnt-title">${escapeHtml(eqName(m.equipmentId))}</div>
                        <div class="mnt-sub">${escapeHtml(custName(m.customerId))}${m.interval ? ' · ' + escapeHtml(m.interval) : ''}</div>
                    </div>
                    <div class="mnt-due ${od ? 'over' : sn ? 'soon' : ''}">${m.dueDate ? m.dueDate.toLocaleDateString('de-AT') : '–'}</div>
                </div>`;
            };

            contentArea.innerHTML = `
                <div class="page-head">
                    <div><h2 style="margin:0;">Wartung</h2><div class="page-sub">${all.length} Wartungsplan${all.length !== 1 ? '·e' : ''}</div></div>
                    <button class="btn btn-primary" onclick="app.openMaintenance()">${icon('plus')} Wartungsplan</button>
                </div>
                ${overdue.length ? `<div class="mnt-banner over">⚠️ ${overdue.length} Wartung${overdue.length !== 1 ? 'en' : ''} überfällig</div>` : ''}
                ${soon.length ? `<div class="mnt-banner soon">🔔 ${soon.length} Wartung${soon.length !== 1 ? 'en' : ''} in den nächsten 30 Tagen</div>` : ''}
                ${all.length ? `<div class="mnt-list">${upcoming.map(row).join('')}</div>`
                    : `<div class="empty-state"><div style="font-size:40px;">🔧</div><p>Noch keine Wartungspläne.<br>Erstelle einen Plan mit Intervall – KTM erinnert dich automatisch an fällige Wartungen.</p><button class="btn btn-primary" onclick="app.openMaintenance()">${icon('plus')} Ersten Plan anlegen</button></div>`}
            `;
        }

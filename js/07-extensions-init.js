

        // ============================================================
        // ============ APP-ERWEITERUNGEN =============================
        // ============================================================
        const ktmV2Extensions = Object.assign({}, planApplyExtensions, invoiceExtensions, {
            // ---------- Bestellungen ----------
            async openOrderModal(id = null, presetProjectId = null, presetItems = '', presetLines = null) {
                const order = id ? await db.get('orders', id) : null;
                const projects = await db.getAll('projects');
                const materials = await db.getAll('materials');
                await loadLearned();
                const suppliers = [...new Set([...learnedList('supplier'), ...(await db.getAll('orders')).map(o => o.supplier).filter(Boolean)])];
                const todayStr = toLocalDateString(new Date());
                const selProj = order?.projectId ?? presetProjectId ?? '';

                const modal = showModal(
                    id ? 'Bestellung bearbeiten' : 'Neue Bestellung',
                    `
                        <div class="form-group"><label>Projekt (optional)</label>
                            <select id="ordProject">
                                <option value="">— Kein Projekt —</option>
                                ${projects.map(p => `<option value="${escapeHtml(String(p.id))}" ${String(selProj) === String(p.id) ? 'selected' : ''}>${escapeHtml(p.title || 'Unbenannt')}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Lieferant</label>
                                <input type="text" id="ordSupplier" list="ordSupplierList" value="${escapeHtml(order?.supplier || '')}" placeholder="z. B. Schiessl, Frigopol...">
                                <datalist id="ordSupplierList">${suppliers.map(s => `<option value="${escapeHtml(s)}">`).join('')}</datalist>
                            </div>
                            <div class="form-group"><label>Datum</label><input type="date" id="ordDate" value="${escapeHtml(order?.date || todayStr)}"></div>
                        </div>
                        <div id="ordProjectMats"></div>
                        <div class="form-group"><label id="ordItemsLabel">Artikel *</label>
                            <textarea id="ordItems" rows="5" placeholder="z. B. 18 m Kupferrohr 22 mm, 42 m Kabel 5×2,5 mm²...">${escapeHtml(order?.items || presetItems || '')}</textarea>
                            ${materials.length > 0 ? `<select id="ordMatPicker" style="margin-top:8px;"><option value="">+ Artikel aus Materialdatenbank einfügen...</option>${materials.map(m => `<option value="${escapeHtml(m.name)}${m.size ? ' ' + escapeHtml(m.size) : ''}${m.articleNumber ? ' (' + escapeHtml(m.articleNumber) + ')' : ''}">${escapeHtml(m.name)}${m.size ? ' ' + escapeHtml(m.size) : ''}</option>`).join('')}</select>` : ''}
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Status</label>
                                <select id="ordStatus">
                                    ${ORDER_STATUSES.map(s => `<option value="${s}" ${(order?.status || 'Offen') === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group"><label>Notizen</label><input type="text" id="ordNotes" value="${escapeHtml(order?.notes || '')}"></div>
                        </div>
                    `,
                    async (overlay) => {
                        const supplier = overlay.querySelector('#ordSupplier').value.trim();
                        const items = overlay.querySelector('#ordItems').value.trim();
                        if (!items) { showToast('Bitte mindestens einen Artikel angeben.', 'error'); return; }
                        const data = {
                            ...(order || {}),
                            projectId: overlay.querySelector('#ordProject').value ? parseId(overlay.querySelector('#ordProject').value) : null,
                            supplier,
                            date: overlay.querySelector('#ordDate').value || todayStr,
                            items,
                            status: overlay.querySelector('#ordStatus').value,
                            notes: overlay.querySelector('#ordNotes').value.trim()
                        };
                        if (id) { await db.put('orders', data); } else { await db.add('orders', data); }
                        if (supplier) learnValue('supplier', supplier).catch(() => {});
                        overlay.remove();
                        showToast(id ? 'Bestellung aktualisiert.' : 'Bestellung angelegt.', 'success');
                        if (app.currentPage === 'orders' || app.currentPage === 'dashboard' || app.currentPage === 'projects') app.navigate(app.currentPage, app.currentProjectId);
                        else app.navigate('orders');
                    }
                );

                modal.querySelector('#ordMatPicker')?.addEventListener('change', (e) => {
                    if (!e.target.value) return;
                    const ta = modal.querySelector('#ordItems');
                    ta.value = (ta.value ? ta.value.trimEnd() + '\n' : '') + '1 Stk ' + e.target.value;
                    e.target.value = '';
                });

                // Projekt-Material als anklickbare Häkchen-Liste. Angehakte Positionen
                // landen im Artikel-Feld – du wählst aus, was wirklich bestellt wird.
                const matBox = modal.querySelector('#ordProjectMats');
                // Rendert eine Häkchen-Liste aus {line, full}-Positionen (Projekt ODER Angebot)
                const renderChecklist = (lineList) => {
                    const lbl0 = modal.querySelector('#ordItemsLabel');
                    if (!lineList || lineList.length === 0) { matBox.innerHTML = ''; if (lbl0) lbl0.textContent = 'Artikel *'; return; }
                    const currentText = (modal.querySelector('#ordItems')?.value || '');
                    const currentLines = currentText.split('\n').map(l => l.trim()).filter(Boolean);
                    const isEditing = !!order || currentLines.length > 0;
                    const rows = lineList.map((p, idx) => {
                        const checked = isEditing ? currentLines.some(cl => cl === p.full || cl === p.line) : true;
                        const roomInfo = p.full.slice(p.line.length);
                        return `<label class="ord-mat-row">
                            <input type="checkbox" class="ord-mat-cb" ${checked ? 'checked' : ''} data-idx="${idx}">
                            <span class="ord-mat-line">${escapeHtml(p.line)}<span class="ord-mat-rooms">${escapeHtml(roomInfo)}</span></span>
                        </label>`;
                    }).join('');
                    matBox.innerHTML = `
                        <div class="form-group">
                            <label>Positionen auswählen, was bestellt wird</label>
                            <div class="ord-mat-head">
                                <span>Angehakte Positionen kommen in die Bestellung:</span>
                                <div class="ord-mat-tools">
                                    <button type="button" class="link-btn" id="ordMatAll">Alle</button>
                                    <button type="button" class="link-btn" id="ordMatNone">Keine</button>
                                </div>
                            </div>
                            <div class="ord-mat-list">${rows}</div>
                        </div>
                    `;
                    if (lbl0) lbl0.textContent = 'Weitere Artikel (frei, optional)';
                    const allFulls = lineList.map(p => p.full);
                    const applyChecked = () => {
                        const picked = [...matBox.querySelectorAll('.ord-mat-cb:checked')].map(cb => lineList[Number(cb.dataset.idx)].full);
                        const extra = (modal.querySelector('#ordItems').value || '').split('\n')
                            .map(l => l.trim()).filter(l => l && !allFulls.includes(l));
                        modal.querySelector('#ordItems').value = [...picked, ...extra].join('\n');
                    };
                    matBox.querySelector('#ordMatAll')?.addEventListener('click', () => { matBox.querySelectorAll('.ord-mat-cb').forEach(cb => cb.checked = true); applyChecked(); });
                    matBox.querySelector('#ordMatNone')?.addEventListener('click', () => { matBox.querySelectorAll('.ord-mat-cb').forEach(cb => cb.checked = false); applyChecked(); });
                    matBox.querySelectorAll('.ord-mat-cb').forEach(cb => cb.addEventListener('change', applyChecked));
                    if (!isEditing) applyChecked();
                };

                const buildProjectMats = async (projId) => {
                    // Wenn feste Positionen übergeben wurden (z. B. aus einem Angebot), diese nutzen
                    if (presetLines && presetLines.length) { renderChecklist(presetLines); return; }
                    const lbl0 = modal.querySelector('#ordItemsLabel');
                    if (!projId) { matBox.innerHTML = ''; if (lbl0) lbl0.textContent = 'Artikel *'; return; }
                    const pm = (await db.getByIndex('projectMaterials', 'projectId', parseId(projId))) || [];
                    if (pm.length === 0) { matBox.innerHTML = '<div style="font-size:12.5px;color:var(--text-muted);margin-bottom:8px;">Für dieses Projekt ist noch kein Material erfasst – trag die Artikel unten von Hand ein.</div>'; if (lbl0) lbl0.textContent = 'Artikel *'; return; }
                    const rooms = (await db.getByIndex('rooms', 'projectId', parseId(projId))) || [];
                    const agg = new Map();
                    for (const x of pm) {
                        const mat = materials.find(m => String(m.id) === String(x.materialId));
                        const size = x.size || mat?.size || '';
                        const unit = x.unit || mat?.unit || 'Stk';
                        const key = `${String(x.materialId)}|${size}|${unit}`;
                        if (!agg.has(key)) agg.set(key, { name: mat?.name || x.name || 'Material', size, unit, qty: 0, rooms: new Set() });
                        const a = agg.get(key);
                        a.qty += Number(x.quantity) || 0;
                        const room = rooms.find(r => String(r.id) === String(x.roomId));
                        if (room) a.rooms.add(room.name || 'Raum');
                    }
                    const fmtQty = q => (Math.round(q * 100) / 100).toString().replace('.', ',');
                    const projLineList = [...agg.values()].map(a => {
                        const line = `${fmtQty(a.qty)} ${a.unit} ${a.name}${a.size ? ' ' + a.size : ''}`;
                        const roomInfo = a.rooms.size ? ` [${[...a.rooms].join(', ')}]` : '';
                        return { line, full: line + roomInfo };
                    });
                    renderChecklist(projLineList);
                };
                // beim Öffnen, wenn schon ein Projekt gewählt ist
                if (presetLines && presetLines.length) buildProjectMats(selProj);
                else if (selProj) buildProjectMats(selProj);
                modal.querySelector('#ordProject')?.addEventListener('change', (e) => { if (!(presetLines && presetLines.length)) buildProjectMats(e.target.value); });
            },

            async deleteOrder(id) {
                if (!await showConfirm('Diese Bestellung wirklich löschen?')) return;
                await db.delete('orders', id);
                showToast('Bestellung gelöscht.', 'success');
                app.navigate('orders');
            },

            // Meter-Verbrauch buchen (Rolle/Bund/Stange) – bricht Rollen automatisch an
            async bookConsumption(id) {
                const m = await db.get('materials', id);
                if (!m) return;
                const bl = Number(m.bundleLength) || 0;
                const uw = m.unit;
                const rolls = Number(m.stock) || 0;
                const open = Number(m.openMeters) || 0;
                const totalM = rolls * bl + open;
                showModal('Verbrauch buchen', `
                    <div style="font-size:13.5px;color:var(--text-secondary);margin-bottom:10px;">
                        <strong>${escapeHtml(m.name)}</strong><br>
                        Bestand: ${rolls} ${escapeHtml(uw)}${open > 0.001 ? ` + ${String(open).replace('.', ',')} m offen` : ''} = <strong>${String(Math.round(totalM * 100) / 100).replace('.', ',')} m</strong>
                    </div>
                    <div class="form-group"><label>Verbrauchte Meter</label>
                        <input type="text" inputmode="decimal" id="consumeM" placeholder="z. B. 8,5" autofocus>
                    </div>
                    <div style="font-size:12px;color:var(--text-muted);">Die Meter werden vom offenen Rest abgezogen. Ist er leer, wird automatisch eine ${escapeHtml(uw)} angebrochen.</div>
                `, async (overlay) => {
                    const meters = parseFloat(String(overlay.querySelector('#consumeM').value).replace(',', '.')) || 0;
                    if (meters <= 0) { showToast('Bitte Meter eingeben.', 'error'); return; }
                    if (meters > totalM + 0.001) {
                        const ok = await showConfirm(`Es sind nur ${String(Math.round(totalM * 100) / 100).replace('.', ',')} m auf Lager. Trotzdem buchen (Bestand geht auf 0)?`, { okText: 'Trotzdem buchen', danger: false });
                        if (!ok) return;
                    }
                    const res = await bookMeterConsumption(id, meters);
                    overlay.remove();
                    if (res.ok || res.shortfall >= 0) {
                        let msg = `${String(meters).replace('.', '.')} m gebucht.`;
                        if (res.rollsUsed > 0) msg += ` ${res.rollsUsed} ${uw} angebrochen.`;
                        msg += ` Rest: ${res.remainingRolls} ${uw} + ${String(res.remainingOpen).replace('.', ',')} m.`;
                        showToast(msg, 'success');
                    }
                    this.navigate('materials');
                }, null, { okText: 'Buchen' });
            },

            // ---------- Materialbestand ----------
            async setStock(id, value) {
                const m = await db.get('materials', id);
                if (!m) return;
                const v = parseFloat(String(value).replace(',', '.'));
                m.stock = isNaN(v) || v < 0 ? 0 : v;
                await db.put('materials', m);
                showToast(`Bestand: ${m.stock}`, 'success');
            },
            async adjustStock(id, delta) { // Rückwärtskompatibilität
                const m = await db.get('materials', id);
                if (!m) return;
                m.stock = Math.max(0, (Number(m.stock) || 0) + delta);
                await db.put('materials', m);
                renderMaterials();
            },

            // ---------- Projekt-Material ----------
            async openProjectMaterialModal(id = null, projectId = null, presetRoomId = null) {
                const pm = id ? await db.get('projectMaterials', id) : null;
                const pid = pm?.projectId ?? projectId;
                const materials = (await db.getAll('materials')).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                const rooms = (await db.getByIndex('rooms', 'projectId', pid)) || [];

                if (materials.length === 0) {
                    showToast('Bitte lege zuerst Materialien in der Materialdatenbank an.', 'info');
                    this.openMaterialModal();
                    return;
                }

                const modal = showModal(
                    id ? 'Material bearbeiten' : 'Material zum Projekt hinzufügen',
                    `
                        <div class="form-group"><label>Material auswählen *</label>
                            <div id="pmStepPicker" class="step-picker"></div>
                            <input type="hidden" id="pmMaterial" value="${pm?.materialId != null ? escapeHtml(String(pm.materialId)) : ''}">
                            <div style="font-size:12px;color:var(--text-muted);margin-top:5px;">Fehlt etwas? <a href="#" id="pmNewMat" style="color:var(--accent);font-weight:600;">Neues Material anlegen</a></div>
                        </div>
                        <div class="form-row-3">
                            <div class="form-group"><label>Menge *</label><input type="number" inputmode="decimal" step="any" min="0" id="pmQty" value="${pm?.quantity ?? 1}"></div>
                            <div class="form-group"><label>Einheit</label><select id="pmUnit">${UNITS.map(u => `<option value="${u}" ${(pm?.unit || '') === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
                            <div class="form-group"><label>Größe (überschreiben)</label><input type="text" id="pmSize" value="${escapeHtml(pm?.size || '')}" placeholder="Standard aus Material"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Preis je Einheit (€)</label><input type="number" inputmode="decimal" step="any" min="0" id="pmPrice" value="${pm?.price ?? ''}" placeholder="Standard aus Katalog"></div>
                            <div class="form-group"><label>Bemerkung</label><input type="text" id="pmNote" value="${escapeHtml(pm?.note || '')}"></div>
                        </div>
                        <div id="pmEkInfo" class="pm-ek-info"></div>
                        <div class="form-card" style="margin-top:2px;">
                            <div class="form-card-title">🏠 ${id ? 'Raum' : 'Räume zuordnen'}</div>
                            ${id
                                ? `<div class="form-group"><select id="pmRoom"><option value="">— Ganzes Projekt —</option>${rooms.map(r => `<option value="${escapeHtml(String(r.id))}" ${String(pm?.roomId) === String(r.id) ? 'selected' : ''}>${escapeHtml(r.name || 'Raum')}</option>`).join('')}</select></div>`
                                : `<div style="font-size:12.5px;color:var(--text-muted);margin-bottom:9px;">Mehrere Räume wählbar – die Menge wird für <strong>jeden</strong> gewählten Raum angelegt. Ohne Auswahl landet das Material unter „Projekt gesamt".</div>
                                   <div class="offer-rooms-chips" id="pmRoomChips">
                                       ${rooms.map(r => `<button type="button" class="room-chip ${String(presetRoomId) === String(r.id) ? 'on' : ''}" data-room="${escapeHtml(String(r.id))}">${String(presetRoomId) === String(r.id) ? '✓' : '＋'} ${escapeHtml(r.name || 'Raum')}</button>`).join('')}
                                   </div>
                                   ${rooms.length > 1 ? '<button type="button" class="btn btn-sm btn-outline" id="pmAllRooms" style="margin-top:9px;">Alle Räume</button>' : ''}`
                            }
                        </div>
                    `,
                    async (overlay) => {
                        const matId = overlay.querySelector('#pmMaterial').value;
                        const qty = parseFloat(String(overlay.querySelector('#pmQty').value).replace(',', '.'));
                        if (!matId || isNaN(qty) || qty <= 0) { showToast('Material und Menge sind Pflichtfelder.', 'error'); return; }
                        const data = {
                            ...(pm || {}),
                            projectId: pid,
                            materialId: parseId(matId),
                            quantity: qty,
                            unit: overlay.querySelector('#pmUnit').value,
                            size: overlay.querySelector('#pmSize').value.trim(),
                            note: overlay.querySelector('#pmNote').value.trim()
                        };
                        const mat = materials.find(m => String(m.id) === String(matId));
                        const priceRaw = overlay.querySelector('#pmPrice')?.value;
                        const priceIn = priceRaw === '' || priceRaw === undefined ? null : parseFloat(String(priceRaw).replace(',', '.'));
                        data.price = (priceIn !== null && !isNaN(priceIn) && priceIn >= 0) ? priceIn : matUnitPrice(mat, data.unit);

                        // Preisänderung im Katalog merken (gleiche Einheit)
                        if (mat && priceIn !== null && !isNaN(priceIn) && priceIn > 0
                            && (mat.unit || 'Stk') === data.unit && Number(mat.sellingPrice) !== priceIn) {
                            const fresh = await db.get('materials', mat.id);
                            if (fresh) { fresh.sellingPrice = priceIn; if (!(Number(fresh.purchasePrice) > 0)) fresh.purchasePrice = priceIn; await db.put('materials', fresh); }
                        }

                        if (id) {
                            data.roomId = overlay.querySelector('#pmRoom').value ? parseId(overlay.querySelector('#pmRoom').value) : null;
                            await db.put('projectMaterials', data);
                            overlay.remove();
                            showToast('Material gespeichert.', 'success');
                        } else {
                            // MEHRFACH-ZUORDNUNG: je gewähltem Raum eine eigene Position
                            const chosen = [...overlay.querySelectorAll('#pmRoomChips .room-chip.on')].map(b => b.dataset.room);
                            const targets = chosen.length ? chosen : [null];
                            const existing = (await db.getByIndex('projectMaterials', 'projectId', pid)) || [];
                            let added = 0, merged = 0;
                            for (const rid of targets) {
                                const dup = existing.find(x => String(x.materialId) === String(data.materialId)
                                    && (x.unit || 'Stk') === data.unit
                                    && String(x.roomId ?? '') === String(rid ?? ''));
                                if (dup) {
                                    dup.quantity = (Number(dup.quantity) || 0) + qty;
                                    dup.price = data.price;
                                    await db.put('projectMaterials', dup);
                                    merged++;
                                } else {
                                    await db.add('projectMaterials', { ...data, roomId: rid ? parseId(rid) : null });
                                    added++;
                                }
                            }
                            overlay.remove();
                            const roomTxt = chosen.length ? `${chosen.length} Raum/Räume` : 'Projekt gesamt';
                            showToast(`${data.name || 'Material'} für ${roomTxt} gespeichert${merged ? ` (${merged} vorhandene Position(en) aufgestockt)` : ''}.`, 'success');
                        }
                        app.reloadProject(pid);
                    }
                );

                // Einheit + Preis aus Material vorbelegen
                const sel = modal.querySelector('#pmMaterial');

                // ===== Mehrstufige Materialauswahl (Kategorie → Marke → Serie → Modell) =====
                const stepBox = modal.querySelector('#pmStepPicker');
                if (stepBox) {
                    // Kategorien nach Bauart (mit sinnvoller Reihenfolge + Icon)
                    const catOrder = ['Innengerät Single-Split', 'Außengerät Single-Split', 'Innengerät Multi-Split', 'Außengerät Multi-Split', 'Innengerät VRF', 'Außengerät VRF', 'Wärmepumpe', 'Kanalgerät', 'Deckenkassette', 'Truhengerät', 'Zubehör'];
                    const catIcon = { 'Innengerät Single-Split': '🌡️', 'Außengerät Single-Split': '🔲', 'Innengerät Multi-Split': '🌡️', 'Außengerät Multi-Split': '🔲', 'Truhengerät': '📦', 'Zubehör': '🔧' };
                    const state = { cat: null, brand: null, series: null };

                    const catOf = m => m.bauart || m.category || 'Sonstiges';
                    const cats = [...new Set(materials.map(catOf))].sort((a, b) => {
                        const ia = catOrder.indexOf(a), ib = catOrder.indexOf(b);
                        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
                    });

                    const render = () => {
                        // aktueller Pfad als Chips + jeweilige Optionen
                        let html = '';
                        // Breadcrumb
                        const crumbs = [];
                        if (state.cat) crumbs.push(`<button type="button" class="sp-crumb" data-lvl="cat">${escapeHtml(state.cat)} ✕</button>`);
                        if (state.brand) crumbs.push(`<button type="button" class="sp-crumb" data-lvl="brand">${escapeHtml(state.brand)} ✕</button>`);
                        if (state.series) crumbs.push(`<button type="button" class="sp-crumb" data-lvl="series">${escapeHtml(state.series)} ✕</button>`);
                        if (crumbs.length) html += `<div class="sp-crumbs">${crumbs.join('')}</div>`;

                        if (!state.cat) {
                            html += `<div class="sp-label">1. Kategorie wählen</div><div class="sp-grid">`;
                            html += cats.map(c => `<button type="button" class="sp-btn" data-cat="${escapeHtml(c)}">${catIcon[c] || '•'} ${escapeHtml(c)}</button>`).join('');
                            html += `</div>`;
                        } else if (!state.brand) {
                            const brands = [...new Set(materials.filter(m => catOf(m) === state.cat).map(m => m.manufacturer).filter(Boolean))].sort();
                            html += `<div class="sp-label">2. Marke wählen</div><div class="sp-grid">`;
                            html += brands.map(b => `<button type="button" class="sp-btn" data-brand="${escapeHtml(b)}">${escapeHtml(b)}</button>`).join('');
                            if (brands.length === 0) html += `<div class="sp-empty">Keine Marken in dieser Kategorie.</div>`;
                            html += `</div>`;
                        } else {
                            const inBrand = materials.filter(m => catOf(m) === state.cat && m.manufacturer === state.brand);
                            const seriesList = [...new Set(inBrand.map(m => m.series).filter(Boolean))].sort();
                            if (seriesList.length > 1 && !state.series) {
                                html += `<div class="sp-label">3. Serie wählen</div><div class="sp-grid">`;
                                html += seriesList.map(s => `<button type="button" class="sp-btn" data-series="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('');
                                html += `</div>`;
                            } else {
                                const models = inBrand.filter(m => !state.series || m.series === state.series)
                                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                                html += `<div class="sp-label">${seriesList.length > 1 ? '4.' : '3.'} Modell wählen</div><div class="sp-models">`;
                                html += models.map(m => {
                                    const ek = Number(m.purchasePrice) > 0 ? ` · EK ${formatCurrency(m.purchasePrice)}` : '';
                                    const on = String(sel.value) === String(m.id);
                                    return `<button type="button" class="sp-model ${on ? 'on' : ''}" data-model="${escapeHtml(String(m.id))}">
                                        <span class="sp-model-name">${escapeHtml(m.name)}${m.size ? ' – ' + escapeHtml(m.size) : ''}</span>
                                        <span class="sp-model-meta">${escapeHtml(m.bauart || '')}${ek}</span>
                                    </button>`;
                                }).join('');
                                html += `</div>`;
                            }
                        }
                        stepBox.innerHTML = html;
                    };

                    stepBox.addEventListener('click', (e) => {
                        const b = e.target.closest('button'); if (!b) return;
                        e.preventDefault();
                        if (b.dataset.cat) { state.cat = b.dataset.cat; state.brand = null; state.series = null; render(); }
                        else if (b.dataset.brand) { state.brand = b.dataset.brand; state.series = null; render(); }
                        else if (b.dataset.series) { state.series = b.dataset.series; render(); }
                        else if (b.dataset.model) {
                            sel.value = b.dataset.model;
                            sel.dispatchEvent(new Event('change'));
                            render();
                        } else if (b.dataset.lvl) {
                            // Breadcrumb: eine Ebene zurück
                            if (b.dataset.lvl === 'cat') { state.cat = null; state.brand = null; state.series = null; }
                            else if (b.dataset.lvl === 'brand') { state.brand = null; state.series = null; }
                            else if (b.dataset.lvl === 'series') { state.series = null; }
                            render();
                        }
                    });

                    // Bei Bearbeiten: Pfad aus dem gewählten Material vorbelegen
                    if (pm?.materialId) {
                        const m = materials.find(x => String(x.id) === String(pm.materialId));
                        if (m) { state.cat = catOf(m); state.brand = m.manufacturer || null; state.series = m.series || null; }
                    }
                    render();
                }

                const applyUnit = () => {
                    if (pm) return;
                    const m = materials.find(x => String(x.id) === String(sel.value));
                    const unit = m?.unit || 'Stk';
                    modal.querySelector('#pmUnit').value = unit;
                    const pf = modal.querySelector('#pmPrice');
                    if (pf && m) pf.value = matUnitPrice(m, unit) || '';
                    updateEkInfo();
                };
                const updateEkInfo = () => {
                    const box = modal.querySelector('#pmEkInfo');
                    if (!box) return;
                    const m = materials.find(x => String(x.id) === String(sel.value));
                    const vk = parseFloat(modal.querySelector('#pmPrice')?.value) || 0;
                    const qty = parseFloat(String(modal.querySelector('#pmQty')?.value).replace(',', '.')) || 1;
                    // Zentrale Funktion statt rohem m.purchasePrice: rechnet Rolle/Bund/Stange
                    // auf den EK je Meter herunter und berücksichtigt den Händlerrabatt - vorher
                    // wurde hier bei Rollenware der EK der GANZEN Rolle mit der Meter-Menge
                    // multipliziert, was einen stark negativen "Gewinn" vortäuschte.
                    const ekInfo = window.ekPerSalesUnit ? window.ekPerSalesUnit(m) : { ek: Number(m?.purchasePrice) || 0, known: (Number(m?.purchasePrice) || 0) > 0 };
                    const ek = ekInfo.known ? ekInfo.ek : 0;
                    if (ek > 0) {
                        const profit = (vk - ek) * qty;
                        box.innerHTML = `<div class="pm-ek-in">
                            <span>Einkauf: <strong>${formatCurrency(ek)}</strong>${qty !== 1 ? ' × ' + qty : ''} = <strong>${formatCurrency(ek * qty)}</strong></span>
                            <span class="pm-ek-profit ${profit >= 0 ? 'pos' : 'neg'}">Gewinn: ${formatCurrency(profit)}</span>
                        </div>`;
                    } else {
                        box.innerHTML = `<div class="pm-ek-in"><span style="color:var(--text-muted);">Kein Einkaufspreis hinterlegt – trag ihn beim Material ein (Händlerrabatt), dann siehst du hier deinen Gewinn.</span></div>`;
                    }
                };
                sel.addEventListener('change', applyUnit);
                modal.querySelector('#pmUnit')?.addEventListener('change', () => {
                    if (pm) return;
                    const m = materials.find(x => String(x.id) === String(sel.value));
                    const pf = modal.querySelector('#pmPrice');
                    if (pf && m) pf.value = matUnitPrice(m, modal.querySelector('#pmUnit').value) || '';
                });
                if (!pm) applyUnit();
                modal.querySelector('#pmPrice')?.addEventListener('input', updateEkInfo);
                modal.querySelector('#pmQty')?.addEventListener('input', updateEkInfo);
                updateEkInfo();

                // Raum-Chips (Mehrfachauswahl)
                modal.querySelectorAll('#pmRoomChips .room-chip').forEach(b => b.addEventListener('click', () => {
                    b.classList.toggle('on');
                    const name = b.textContent.trim().replace(/^[✓＋]\s*/, '');
                    b.textContent = `${b.classList.contains('on') ? '✓' : '＋'} ${name}`;
                }));
                modal.querySelector('#pmAllRooms')?.addEventListener('click', () => {
                    const chips = [...modal.querySelectorAll('#pmRoomChips .room-chip')];
                    const allOn = chips.every(c => c.classList.contains('on'));
                    chips.forEach(c => {
                        const name = c.textContent.trim().replace(/^[✓＋]\s*/, '');
                        c.classList.toggle('on', !allOn);
                        c.textContent = `${!allOn ? '✓' : '＋'} ${name}`;
                    });
                    modal.querySelector('#pmAllRooms').textContent = allOn ? 'Alle Räume' : 'Keine Räume';
                });
                modal.querySelector('#pmNewMat')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    modal.closest('.modal-overlay')?.remove();
                    this.openMaterialModal();
                });
            },

            async updateProjectMaterial(id, field, value) {
                const pm = await db.get('projectMaterials', id);
                if (!pm) return;
                if (field === 'quantity' || field === 'price') {
                    const v = parseFloat(String(value).replace(',', '.'));
                    pm[field] = isNaN(v) || v < 0 ? 0 : v;
                } else if (field === 'roomId') {
                    pm.roomId = value ? parseId(value) : null;
                } else {
                    pm[field] = value;
                }
                await db.put('projectMaterials', pm);

                // PREIS-ÜBERNAHME: gleicher Preis für alle Positionen desselben Materials
                // (gleiche Einheit) im Projekt + Katalog-VK aktualisieren, wenn Einheit passt
                if (field === 'price') {
                    const siblings = ((await db.getByIndex('projectMaterials', 'projectId', pm.projectId)) || [])
                        .filter(x => String(x.id) !== String(pm.id)
                            && String(x.materialId) === String(pm.materialId)
                            && (x.unit || 'Stk') === (pm.unit || 'Stk'));
                    for (const s of siblings) { s.price = pm.price; await db.put('projectMaterials', s); }
                    const mat = await db.get('materials', pm.materialId);
                    if (mat && (mat.unit || 'Stk') === (pm.unit || 'Stk') && Number(mat.sellingPrice) !== pm.price) {
                        mat.sellingPrice = pm.price;
                        await db.put('materials', mat);
                    }
                    if (siblings.length) showToast(`Preis für ${siblings.length + 1} Position(en) übernommen.`, 'success');
                }

                // Neu rendern OHNE nach oben zu springen
                if (field === 'quantity' || field === 'price' || field === 'roomId') {
                    app.reloadProject(pm.projectId);
                }
            },

            async deleteProjectMaterial(id, projectId) {
                const rec = await db.get('projectMaterials', id);
                await db.delete('projectMaterials', id);
                app.reloadProject(projectId);
                if (rec) showUndoToast('Material gelöscht.', async () => {
                    const restore = { ...rec }; delete restore._synced;
                    await db.add('projectMaterials', restore);
                    app.reloadProject(projectId);
                    showToast('Material wiederhergestellt.', 'success');
                });
            },

            // Bestellliste aus Projekt-Material erzeugen
            // Bestellung aus einem Angebot – Positionen als Häkchen-Liste auswählbar
            async createOrderFromOffer(offerId) {
                const offer = await db.get('offers', offerId);
                if (!offer) { showToast('Angebot nicht gefunden.', 'error'); return; }
                const positions = offer.positions || [];
                if (positions.length === 0) { showToast('Dieses Angebot hat keine Positionen.', 'info'); return; }
                const fmtQty = q => (Math.round((Number(q) || 0) * 100) / 100).toString().replace('.', ',');
                // Nur echte Material-Positionen (Arbeit/Leistung überspringen wir für die Bestellung nicht zwingend – wir nehmen alle)
                const lines = positions.map(p => {
                    const qty = fmtQty(p.quantity);
                    const unit = p.unit || 'Stk';
                    const name = p.name || 'Position';
                    const size = p.size ? ' ' + p.size : '';
                    const line = `${qty} ${unit} ${name}${size}`.trim();
                    return { line, full: line };
                });
                const projId = offer.projectId || null;
                this.openOrderModal(null, projId, '', lines);
            },

            async createOrderFromProject(projectId) {
                const pm = (await db.getByIndex('projectMaterials', 'projectId', projectId)) || [];
                if (pm.length === 0) { showToast('Kein Material im Projekt.', 'info'); return; }
                const materials = await db.getAll('materials');
                const rooms = (await db.getByIndex('rooms', 'projectId', projectId)) || [];
                // Gleiche Materialien (Material + Größe + Einheit) zu einer Position zusammenfassen
                const agg = new Map();
                for (const x of pm) {
                    const mat = materials.find(m => String(m.id) === String(x.materialId));
                    const size = x.size || mat?.size || '';
                    const unit = x.unit || mat?.unit || 'Stk';
                    const key = `${String(x.materialId)}|${size}|${unit}`;
                    if (!agg.has(key)) agg.set(key, { name: mat?.name || x.name || 'Material', size, unit, qty: 0, rooms: new Set() });
                    const a = agg.get(key);
                    a.qty += Number(x.quantity) || 0;
                    const room = rooms.find(r => String(r.id) === String(x.roomId));
                    if (room) a.rooms.add(room.name || 'Raum');
                }
                const fmtQty = q => (Math.round(q * 100) / 100).toString().replace('.', ',');
                const lines = [...agg.values()].map(a =>
                    `${fmtQty(a.qty)} ${a.unit} ${a.name}${a.size ? ' ' + a.size : ''}${a.rooms.size ? ' [' + [...a.rooms].join(', ') + ']' : ''}`
                );
                // Kein vorbefüllter Textblock mehr – die Häkchen-Liste im
                // Bestell-Dialog übernimmt die Auswahl der Projekt-Materialien.
                this.openOrderModal(null, projectId, '');
            },

            // ---------- Projektstatus (Dropdown + Drag & Drop) ----------
            async setProjectStatus(id, status) {
                const p = await db.get('projects', id);
                if (!p) return;
                p.status = status;
                await db.put('projects', p);
                showToast(`Status: ${status}`, 'success');
                app.navigate('projects', app.currentProjectId);
            },
            dragProjectCard(ev, id) {
                ev.dataTransfer.setData('text/plain', String(id));
                ev.dataTransfer.effectAllowed = 'move';
            },
            dropProjectCard(ev, status) {
                ev.preventDefault();
                const id = ev.dataTransfer.getData('text/plain');
                if (!id) return;
                this.setProjectStatus(parseId(id), status);
            },

            // ---------- Besichtigung ----------
            async openSurveyModal(projectId) {
                const project = await db.get('projects', projectId);
                if (!project) return;
                const survey = project.survey || {};

                const groups = [...new Set(SURVEY_FIELDS.map(f => f.group))];
                const body = groups.map(g => `
                    <div class="form-card">
                        <div class="form-card-title">${SURVEY_GROUP_ICONS[g] || ''} ${g}</div>
                        <div class="survey-grid">
                            ${SURVEY_FIELDS.filter(f => f.group === g).map(f => techFieldInput(f, survey[f.key], 'sv_')).join('')}
                        </div>
                    </div>
                `).join('') + `
                    <div class="form-card" style="border-style:dashed;">
                        <div class="form-card-title">📷 Fotos</div>
                        <div style="font-size:13px;color:var(--text-muted);">Fotos der Besichtigung fügst du im Projekt unter <strong>Bilder</strong> hinzu – sie erscheinen automatisch in der Projektübersicht-PDF.</div>
                        <div style="font-size:12.5px;color:var(--accent);margin-top:8px;font-weight:600;">Technische Daten (Leitungen, Montage, Elektrik) erfasst du direkt beim jeweiligen Raum.</div>
                    </div>`;

                showModal(
                    `Besichtigung – ${escapeHtml(project.title || '')}`,
                    body,
                    async (overlay) => {
                        const data = { ...(project.survey || {}) }; // alte Werte nicht verlieren
                        for (const f of SURVEY_FIELDS) {
                            const v = techFieldRead(f, overlay, 'sv_');
                            if (v !== undefined) data[f.key] = v;
                        }
                        project.survey = data;
                        if (!project.status || ['Neu', 'Besichtigung offen', 'Besichtigung'].includes(project.status)) {
                            project.status = 'Angebot';
                        }
                        await db.put('projects', project);
                        showToast('Besichtigung gespeichert.', 'success');
                        app.reloadProject(projectId);
                    },
                    null,
                    { wide: true }
                );
            },

            // Material berechnen: führt die Technikdaten ALLER Räume zusammen
            async generateMaterialSuggestions(projectId) {
                const project = await db.get('projects', projectId);
                if (!project) return;
                const rooms = (await db.getByIndex('rooms', 'projectId', projectId)) || [];
                if (rooms.length === 0) { showToast('Bitte zuerst Räume anlegen – die Technik wird je Raum erfasst.', 'info'); return; }
                const materials = await db.getAll('materials');

                const num = v => (typeof v === 'number' && v > 0 ? v : 0);

                // 1) Je Raum: fehlende Positionen aus dessen Leitungsdaten ergänzen
                let addedRooms = 0;
                for (const r of rooms) {
                    addedRooms += await this._applyRoomAutoMaterials(projectId, r.id, r.name || 'Raum', r.tech || {}, new Set());
                }

                // 2) Projektweite Positionen aus den Summen aller Räume
                const totals = rooms.reduce((t, r) => {
                    const x = r.tech || {};
                    t.pipe += num(x.pipeLength);
                    t.duct += num(x.cableDuct) || num(x.pipeLength);
                    t.drills += num(x.coreDrills);
                    if (x.outdoorMounting === 'Big Foot' || x.bigFoot === true) t.bigFoot = true;
                    if (x.outdoorMounting === 'Wandkonsole' || x.wallBracket === true) t.bracket = true;
                    return t;
                }, { pipe: 0, duct: 0, drills: 0, bigFoot: false, bracket: false });

                const existing = (await db.getByIndex('projectMaterials', 'projectId', projectId)) || [];
                const hasByName = (n) => existing.some(x => {
                    const m = materials.find(mm => String(mm.id) === String(x.materialId));
                    return (m?.name || '').toLowerCase().includes(n.toLowerCase());
                });

                const wanted = [];
                if (!hasByName('Außengerät')) {
                    const cooling = calculateCoolingCapacity(rooms);
                    wanted.push({ name: 'Außengerät', size: cooling.recommendation ? `ca. ${cooling.recommendation} kW` : '', qty: 1, unit: 'Stk', category: 'Außengeräte', note: 'Auslegung prüfen' });
                }
                if (totals.pipe > 0) {
                    if (!hasByName('Kabelbinder')) wanted.push({ name: 'Kabelbinder', size: '', qty: Math.ceil(totals.pipe * 3), unit: 'Stk', category: 'Befestigung', note: '3 Stk je Meter Leitung' });
                    if (!hasByName('Rohrschellen')) wanted.push({ name: 'Rohrschellen', size: '', qty: Math.ceil(totals.pipe / 1.5), unit: 'Stk', category: 'Befestigung', note: 'alle 1,5 m' });
                    if (!hasByName('Dübel')) wanted.push({ name: 'Dübel', size: '', qty: Math.ceil(totals.duct * 1.5), unit: 'Stk', category: 'Befestigung', note: '1,5 Stk je Meter Kanal' });
                    if (!hasByName('Schrauben')) wanted.push({ name: 'Schrauben', size: '', qty: Math.ceil(totals.duct * 1.5), unit: 'Stk', category: 'Befestigung', note: '1,5 Stk je Meter Kanal' });
                    if (!hasByName('Kabelkanalbogen')) wanted.push({ name: 'Kabelkanalbogen', size: '', qty: Math.max(2, Math.ceil(totals.duct / 4)), unit: 'Stk', category: 'Elektromaterial', note: 'ca. 1 je 4 m' });
                    if (!hasByName('UV-Band')) wanted.push({ name: 'UV-Band', size: '', qty: 1, unit: 'Rolle', category: 'Isolierung', note: 'Außenbereich' });
                }
                if (totals.drills > 0 && !hasByName('Kernbohrung')) {
                    wanted.push({ name: 'Kernbohrung', size: '', qty: totals.drills, unit: 'Stk', category: 'Arbeitszeit' });
                }
                if (totals.bigFoot && !hasByName('Big Foot')) wanted.push({ name: 'Big Foot Konsole', size: '', qty: 1, unit: 'Set', category: 'Befestigung' });
                if (totals.bracket && !hasByName('Wandkonsole')) wanted.push({ name: 'Wandkonsole Außengerät', size: '', qty: 1, unit: 'Stk', category: 'Befestigung' });
                if ((totals.bigFoot || totals.bracket) && !hasByName('Schwingungsdämpfer') && !hasByName('Silentbl')) {
                    wanted.push({ name: 'Schwingungsdämpfer', size: '', qty: 1, unit: 'Set', category: 'Befestigung' });
                }

                let added = 0;
                for (const w of wanted) {
                    const mat = await this._ensureCatalogMaterial(w.name, w.size, w.category, w.unit);
                    await db.add('projectMaterials', { projectId, materialId: mat.id, roomId: null, quantity: w.qty, unit: w.unit, size: w.size || '', price: matUnitPrice(mat, w.unit), note: w.note || 'Automatisch berechnet' });
                    added++;
                }

                const total = addedRooms + added;
                if (total === 0) showToast('Materialliste ist bereits vollständig.', 'info');
                else showToast(`${total} Materialposition(en) automatisch berechnet (${addedRooms} raumbezogen, ${added} projektweit).`, 'success');
                app.reloadProject(projectId);
            },

            // ---------- Angebots-Variante: gleiche Positionen, andere Klimamarke ----------
            async createOfferVariant(offerId) {
                const offer = await db.get('offers', offerId);
                if (!offer) return;
                const mats = await db.getAll('materials');
                const DEV_CATS = ['Innengeräte', 'Außengeräte', 'Klimageräte', 'Multisplit-Systeme', 'Multi Split'];
                const isDevice = (p) => {
                    const m = mats.find(x => String(x.id) === String(p.materialId));
                    return DEV_CATS.includes(m?.category || p.category || '');
                };
                const devicePos = (offer.positions || []).filter(isDevice);
                if (devicePos.length === 0) { showToast('Dieses Angebot enthält keine Klimageräte zum Tauschen.', 'info'); return; }

                const kwOf = (v) => parseFloat(String(v || '').replace(',', '.')) || 0;
                const brands = [...new Set(mats.filter(m => DEV_CATS.includes(m.category) && m.manufacturer).map(m => m.manufacturer))].sort();

                // Multi-Split-Außengerät? -> maximale Anzahl Innengeräte (aus Notiz "max. 4 IG"
                // oder aus dem Modellnamen wie 4MXM68A8 / 4AMW81U4RJC / MU4R25.U22)
                const maxIG = (m) => {
                    if (!m) return 0;
                    const n = String(m.notes || '');
                    const mn = n.match(/max\.?\s*(\d+)\s*IG/i);
                    if (mn) return parseInt(mn[1], 10);
                    const nm = (String(m.name || '') + ' ' + String(m.articleNumber || '')).toUpperCase();
                    // Führende Zahl bei Multi-AG: 2MXM.., 4AMW.., 5AMW105U4ROC
                    const mm = nm.match(/\b(\d)\s*(?:MXM|AMW)/) || nm.match(/\bMU\s*(\d)\s*R/) || nm.match(/\bAJ\d+TXJ(\d)/);
                    return mm ? parseInt(mm[1], 10) : 0;
                };
                // Gerätetyp: Multi-AG / Single-AG / Innengerät – darf NIE gemischt werden.
                // WICHTIG: primär über den Modellnamen erkennen (Nomenklatur ist eindeutig),
                // weil die Kategorie im Katalog nicht immer sauber gepflegt ist
                // (z. B. Hisense-Außengeräte, die als "Klimagerät" importiert wurden).
                const devType = (m) => {
                    if (!m) return '?';
                    const nm = (String(m.name || '') + ' ' + String(m.articleNumber || '')).toUpperCase();
                    const notes = String(m.notes || '').toLowerCase();

                    // 1) Eindeutige AUSSENGERÄTE-Muster im Modellnamen
                    //    Multi-AG: 2MXM.., 4AMW.., MU4R.., 5AMW105U4ROC ...
                    if (/\b\d\s*(?:MXM|AMW)/.test(nm) || /\bMU\s*\d\s*R/.test(nm)) return 'MULTI-AG';
                    //    Single-AG: RXP.., RXM.., RXF.., RXA.., AS..EW (Hisense-Außen), AJ..TXJ (Samsung-Multi-AG)
                    if (/\bR[XZ][A-Z]?\d/.test(nm) || /\bAS\d.*EW\b/.test(nm)) return 'AG';
                    if (/\bAJ\d+TXJ/.test(nm)) return 'MULTI-AG';
                    //    aus der Notiz
                    if (notes.includes('multi-split-ag') || notes.includes('multi-split-außeng')) return 'MULTI-AG';
                    if (notes.includes('außengerät') || notes.includes('aussengerät')) return maxIG(m) >= 2 ? 'MULTI-AG' : 'AG';

                    // 2) Eindeutige INNENGERÄTE-Muster
                    //    Hisense Innen: HB..AG, Daikin Innen: FTX.., Samsung: AR..N/EU, LG: PC../PM../MJ../S..EC
                    if (/\bHB\d.*AG\b/.test(nm) || /\bFTX/.test(nm) || /\bCTX/.test(nm) || notes.includes('innengerät') || notes.includes('truhengerät')) return 'IG';

                    // 3) Fallback über Kategorie
                    const cat = m.category || '';
                    if (cat === 'Innengeräte' || cat === 'Truhengeräte') return 'IG';
                    if (cat === 'Außengeräte') return maxIG(m) >= 2 ? 'MULTI-AG' : 'AG';
                    return 'IG';   // im Zweifel als Innengerät behandeln (nie fälschlich als AG vorschlagen)
                };

                // Kandidaten der Zielmarke: gleicher Typ, bei Multi-AG auch gleiche IG-Anzahl,
                // dann nach kW-Nähe sortiert
                const candidatesFor = (p, brand) => {
                    const orig = mats.find(x => String(x.id) === String(p.materialId));
                    const type = devType(orig);
                    const need = maxIG(orig);
                    const kw = kwOf(orig?.size);
                    return mats
                        .filter(m => m.manufacturer === brand
                            && devType(m) === type                                     // IG bleibt IG, AG bleibt AG
                            && (type !== 'MULTI-AG' || maxIG(m) === need))             // 4 IG -> nur 4-IG-Geräte
                        .map(m => ({ m, kw: kwOf(m.size), diff: Math.abs(kwOf(m.size) - kw) }))
                        .sort((a, b) => a.diff - b.diff || a.kw - b.kw);
                };

                const modal = showModal(
                    `Variante von ${escapeHtml(offer.offerNumber || 'Angebot')}`,
                    `
                        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
                            Es entsteht ein <strong>zweites Angebot</strong> mit identischen Positionen –
                            nur die Klimageräte werden getauscht. Du wählst für jedes Gerät selbst das Modell.
                        </div>
                        <div class="form-group">
                            <label>Marke *</label>
                            <select id="varBrand">
                                <option value="">– Marke wählen –</option>
                                ${brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}
                            </select>
                        </div>
                        <div id="varDevices"></div>
                    `,
                    async (overlay) => {
                        const brand = overlay.querySelector('#varBrand').value;
                        if (!brand) { showToast('Bitte eine Marke wählen.', 'error'); return; }

                        const picks = new Map();   // Position-Index -> Material-ID ('' = unverändert)
                        overlay.querySelectorAll('.var-pick').forEach(sel => picks.set(sel.dataset.idx, sel.value));

                        const newPositions = [];
                        let swapped = 0;
                        (offer.positions || []).forEach((p, i) => {
                            const pick = picks.get(String(i));
                            if (!isDevice(p) || !pick) { newPositions.push({ ...p }); return; }
                            const repl = mats.find(m => String(m.id) === String(pick));
                            if (!repl) { newPositions.push({ ...p }); return; }
                            swapped++;
                            newPositions.push({
                                ...p,
                                materialId: repl.id,
                                name: repl.name,
                                manufacturer: repl.manufacturer || brand,
                                articleNumber: repl.articleNumber || '',
                                category: repl.category,
                                price: matUnitPrice(repl, p.unit || repl.unit || 'Stk'),
                                description: [repl.size, repl.series].filter(Boolean).join(' · ')
                            });
                        });
                        if (swapped === 0) { showToast('Kein Gerät ausgewählt – nichts zu tauschen.', 'info'); return; }

                        const net = newPositions.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0);
                        const dRate = (offer.discountRate || 0) > 1 ? (offer.discountRate || 0) / 100 : (offer.discountRate || 0);
                        const dAmount = offer.discountEnabled ? net * dRate : 0;
                        const netAfter = net - dAmount;
                        const vatRate = offer.vatRate ?? 0.2;
                        const vat = offer.vatEnabled === false ? 0 : netAfter * vatRate;

                        const num = await getNextAutoNumber();
                        const variant = {
                            ...offer,
                            offerNumber: num,
                            positions: newPositions,
                            subtotal: net,
                            netPrice: net,
                            discountAmount: dAmount,
                            netAfterDiscount: netAfter,
                            vatAmount: vat,
                            totalPrice: netAfter + vat,
                            status: 'Angebot offen',
                            variantOf: String(offer.offerNumber || ''),
                            notes: `${offer.notes || ''}${offer.notes ? '\n' : ''}Variante mit ${brand}-Klimageräten.`.trim()
                        };
                        delete variant.id; delete variant._synced; delete variant.createdAt; delete variant.updatedAt;
                        await db.add('offers', variant);
                        overlay.remove();
                        showToast(`Variante ${num}: ${swapped} Gerät(e) auf ${brand} umgestellt. Beide Angebote können jetzt gesendet werden.`, 'success');
                        renderOffers();
                    },
                    'Variante erstellen'
                );

                // Geräteliste mit Modell-Auswahl je Position
                const renderDevices = () => {
                    const brand = modal.querySelector('#varBrand').value;
                    const box = modal.querySelector('#varDevices');
                    if (!brand) { box.innerHTML = '<div class="empty-note" style="padding:14px;">Marke wählen, dann erscheinen die passenden Modelle.</div>'; return; }

                    box.innerHTML = (offer.positions || []).map((p, i) => {
                        if (!isDevice(p)) return '';
                        const old = mats.find(x => String(x.id) === String(p.materialId));
                        const kw = kwOf(old?.size);
                        const type = devType(old);
                        const need = maxIG(old);
                        const typeLabel = type === 'MULTI-AG' ? `Multi-Split-Außengerät für ${need} Innengeräte`
                            : type === 'AG' ? 'Außengerät (Single-Split)'
                            : type === 'IG' ? 'Innengerät' : escapeHtml(old?.category || '');
                        const cands = candidatesFor(p, brand);
                        if (!cands.length) {
                            return `<div class="form-card"><div class="form-card-title">${escapeHtml(p.name)} <span style="font-weight:600;color:var(--text-muted);">· ${typeLabel}</span></div>
                                <div style="font-size:12.5px;color:var(--warning);">${escapeHtml(brand)} hat kein passendes ${type === 'MULTI-AG' ? `Multi-Außengerät für ${need} Innengeräte` : 'Gerät dieser Bauart'} – Position bleibt unverändert.</div></div>`;
                        }
                        const exact = cands.filter(c => c.diff < 0.05);
                        const near = cands.filter(c => c.diff >= 0.05).slice(0, 6);
                        const opt = (c) => {
                            const tag = c.diff < 0.05 ? '✓ exakt' : (c.kw > kw ? '▲ eine Stufe höher' : '▼ eine Stufe niedriger');
                            const ig = maxIG(c.m) >= 2 ? ` · ${maxIG(c.m)} IG` : '';
                            return `<option value="${escapeHtml(String(c.m.id))}">${escapeHtml(c.m.name)} · ${escapeHtml(c.m.size || '')}${ig} · ${formatCurrency(matUnitPrice(c.m, p.unit || 'Stk'))} — ${tag}</option>`;
                        };
                        return `<div class="form-card">
                            <div class="form-card-title">${escapeHtml(p.name)} <span style="font-weight:600;color:var(--text-muted);">· ${typeLabel} · aktuell ${escapeHtml(old?.size || '')} · ${formatCurrency(p.price || 0)}</span></div>
                            <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:8px;">
                                ${exact.length
                                    ? `${escapeHtml(brand)} hat <strong style="color:var(--success);">${exact.length} passende(s) Modell(e) mit exakt ${escapeHtml(old?.size || '')}</strong>${type === 'MULTI-AG' ? ` und ${need} Innengeräte-Anschlüssen` : ''}.`
                                    : `${escapeHtml(brand)} hat kein Modell mit exakt ${escapeHtml(old?.size || '')}${type === 'MULTI-AG' ? ` bei ${need} Innengeräte-Anschlüssen` : ''} – nächstliegende Leistungen:`}
                            </div>
                            <select class="var-pick" data-idx="${i}">
                                ${exact.map(opt).join('')}
                                ${near.map(opt).join('')}
                                <option value="">— Gerät nicht tauschen (Original behalten) —</option>
                            </select>
                        </div>`;
                    }).join('');
                };
                modal.querySelector('#varBrand').addEventListener('change', renderDevices);
                renderDevices();
            },

            // Neu rendern OHNE Scroll-Sprung (Position wird gemerkt und wiederhergestellt)
            reloadProject(pid) {
                window.__ktmKeepScroll = (document.querySelector('.content-scroll') || contentArea)?.scrollTop ?? null;
                app.navigate('projects', pid);
            },

            // ---------- Materialliste: Sortierung & Gruppierung ----------
            pmSort(key) {
                const V = window.__pmView = window.__pmView || { groupBy: 'raum', sort: '', dir: 1 };
                if (V.sort === key) { V.dir = -V.dir; } else { V.sort = key; V.dir = 1; }
                app.reloadProject(app.currentProjectId);
            },
            pmSetGroup(v) {
                (window.__pmView = window.__pmView || { groupBy: 'raum', sort: '', dir: 1 }).groupBy = v;
                app.reloadProject(app.currentProjectId);
            },

            // ---------- Kategorie verwalten: umbenennen, verschieben, löschen ----------
            // Interne Gewinn-Diagnose eines Angebots: vollständige, nachvollziehbare
            // Aufschlüsselung + Position-für-Position, wo EK oder Rabatt fehlt.
            async showOfferDiagnosis(offerId) {
                const offer = await db.get('offers', offerId);
                if (!offer) { showToast('Angebot nicht gefunden.', 'error'); return; }
                const materials = await db.getAll('materials');
                const dealerDiscounts = (typeof getDealerDiscounts === 'function') ? await getDealerDiscounts() : {};

                const isLabor = (it) => { const c = (it.category || '').toLowerCase(); const n = (it.name || '').toLowerCase(); return c.includes('arbeit') || c.includes('anfahrt') || c.includes('montage') || c.includes('lohn') || n.includes('arbeitsleistung') || n.includes('montage') || n.includes('anfahrt') || n.includes('arbeitsstunde'); };
                // Zentrale Funktion (01-core-db-sync.js) statt eigener Kopie.
                const ekPerSalesUnit = (m) => window.ekPerSalesUnit(m, dealerDiscounts);

                const positions = (offer.positions || []).filter(it => it && (Number(it.quantity) || 0) > 0);
                let salesTotal = 0, materialCost = 0, laborSales = 0, missing = 0;
                const rows = positions.map(it => {
                    const qty = Number(it.quantity) || 0;
                    const disc = Number(it.discount) || 0;
                    const lineSales = (Number(it.price) || 0) * qty * (1 - disc / 100);
                    salesTotal += lineSales;
                    const labor = isLabor(it);
                    let cost = 0, known = true, ekUnit = 0, note = '';
                    if (labor) {
                        laborSales += lineSales;
                        note = 'Arbeit (kein Materialeinkauf)';
                    } else {
                        const m = materials.find(mm => String(mm.id) === String(it.materialId));
                        if (!m) { known = false; note = '⚠️ Material nicht mehr in Datenbank'; }
                        else {
                            const r = ekPerSalesUnit(m); known = r.known; ekUnit = r.ek;
                            if (known) { cost = ekUnit * qty; if (disc === 0 && !m.dealerDiscount && !(dealerDiscounts[(m.manufacturer||'').trim()])) note = 'kein Rabatt hinterlegt'; }
                            else note = '⚠️ Einkaufspreis fehlt';
                        }
                        if (!known) missing++;
                    }
                    const lineProfit = lineSales - cost;
                    return `<tr class="${!known && !labor ? 'diag-missing' : ''}">
                        <td>${escapeHtml(it.name || '(ohne Namen)')}<div style="font-size:11px;color:var(--text-muted);">${qty} ${escapeHtml(it.unit || 'Stk')}${disc > 0 ? ` · −${disc}%` : ''}${note ? ` · ${note}` : ''}</div></td>
                        <td style="text-align:right;">${formatCurrency(lineSales)}</td>
                        <td style="text-align:right;">${labor ? '—' : (known ? formatCurrency(cost) : '<span style="color:var(--danger);font-weight:600;">fehlt</span>')}</td>
                        <td style="text-align:right;font-weight:600;color:${lineProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">${known || labor ? formatCurrency(lineProfit) : '?'}</td>
                    </tr>`;
                }).join('');

                // Wie in offerProfit() (03-pages.js): nach Gesamtrabatt hinterlegten Netto-
                // Betrag nutzen, sonst wird ein Gesamtrabatt hier ignoriert und der Gewinn
                // zu hoch ausgewiesen.
                const salesEffective = (offer.agreedPrice != null && offer.agreedPrice !== '')
                    ? Number(offer.agreedPrice)
                    : ((Number(offer.netAfterDiscount) > 0) ? Number(offer.netAfterDiscount) : salesTotal);
                const totalCost = materialCost = positions.reduce((s, it) => {
                    if (isLabor(it)) return s;
                    const m = materials.find(mm => String(mm.id) === String(it.materialId));
                    const r = ekPerSalesUnit(m);
                    return s + (r.known ? r.ek * (Number(it.quantity) || 0) : 0);
                }, 0);
                const profit = salesEffective - totalCost;
                const margin = salesEffective > 0 ? (profit / salesEffective) * 100 : 0;
                const complete = missing === 0;

                showModal(`🔒 Gewinn-Diagnose – ${escapeHtml(offer.offerNumber || 'Angebot')}`, `
                    ${!complete ? `<div class="diag-warn">⚠️ Gewinn kann nicht vollständig berechnet werden, da bei ${missing} Position${missing > 1 ? 'en' : ''} der Einkaufspreis fehlt. Trag ihn beim Material nach, dann stimmt die Marge.</div>` : ''}
                    <div class="diag-summary">
                        <div class="diag-row"><span>Verkaufspreis${(offer.agreedPrice != null && offer.agreedPrice !== '') ? ' (vereinbart)' : ''}</span><strong>${formatCurrency(salesEffective)}</strong></div>
                        <div class="diag-row"><span>− Materialeinkauf</span><strong>${formatCurrency(totalCost)}</strong></div>
                        <div class="diag-row"><span>− Arbeitskosten</span><strong>0,00 € <span style="font-weight:400;color:var(--text-muted);font-size:11px;">(Arbeit ist Ertrag)</span></strong></div>
                        <div class="diag-row"><span>− Sonstige Kosten</span><strong>${formatCurrency(0)}</strong></div>
                        <div class="diag-row diag-total"><span>= Gewinn</span><strong style="color:${profit >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatCurrency(profit)}</strong></div>
                        <div class="diag-row"><span>Gewinnmarge</span><strong class="${complete ? (margin < 10 ? 'mg-red' : margin < 20 ? 'mg-yellow' : 'mg-green') : 'mg-yellow'}" style="padding:2px 8px;border-radius:12px;">${margin.toFixed(1)} %</strong></div>
                        <div class="diag-row" style="font-size:11.5px;color:var(--text-muted);"><span>davon Arbeitsanteil (Verkauf)</span><span>${formatCurrency(laborSales)}</span></div>
                    </div>
                    <div class="diag-detail-title">Positionen im Detail</div>
                    <div class="table-container"><table class="diag-table">
                        <thead><tr><th>Position</th><th style="text-align:right;">Verkauf</th><th style="text-align:right;">Einkauf</th><th style="text-align:right;">Gewinn</th></tr></thead>
                        <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:14px;">Keine Positionen.</td></tr>'}</tbody>
                    </table></div>
                    <div style="font-size:11.5px;color:var(--text-muted);margin-top:10px;">Nur für dich sichtbar – erscheint nie im Kundenangebot oder PDF.</div>
                `, null, null, { wide: true });
            },

            async openCategoryManageModal(cat) {
                const materials = await db.getAll('materials');
                const inCat = materials.filter(m => (m.category || 'Ohne Kategorie') === cat);
                const otherCats = [...new Set(materials.map(m => m.category || 'Ohne Kategorie'))].filter(c => c !== cat).sort();
                const known = ['Außengeräte', 'Innengeräte', 'Multisplit-Systeme', 'VRF-Systeme', 'Kupferrohr', 'Isolierung', 'Elektromaterial', 'Kabel', 'Kondensat', 'Befestigung', 'Montagematerial', 'Werkzeug', 'Kältemittel', 'Arbeitszeit', 'Ersatzteile', 'Steuerungen', 'Zubehör'];
                const targets = [...new Set([...otherCats, ...known.filter(k => k !== cat)])];

                const modal = showModal(
                    `Kategorie verwalten – ${escapeHtml(cat)}`,
                    `
                        <div class="form-card">
                            <div class="form-card-title">✏️ Umbenennen</div>
                            <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">Alle ${inCat.length} Produkte dieser Kategorie erhalten den neuen Namen.</div>
                            <div class="form-group"><label>Neuer Name</label><input type="text" id="catNewName" value="${escapeHtml(cat)}" list="dl_catNames"><datalist id="dl_catNames">${known.map(k => `<option value="${escapeHtml(k)}">`).join('')}</datalist></div>
                            <button class="btn btn-primary btn-sm" id="catRenameBtn">Umbenennen</button>
                        </div>
                        <div class="form-card">
                            <div class="form-card-title">📦 Alle Produkte verschieben</div>
                            <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">Falsch einsortiert? Verschiebe alle ${inCat.length} Produkte in eine andere Kategorie – diese Kategorie verschwindet danach.</div>
                            <div class="form-group"><label>Ziel-Kategorie</label>
                                <input type="text" id="catMoveTarget" list="dl_catTargets" placeholder="Bestehende wählen oder neue eintippen...">
                                <datalist id="dl_catTargets">${targets.map(t => `<option value="${escapeHtml(t)}">`).join('')}</datalist>
                            </div>
                            <button class="btn btn-outline btn-sm" id="catMoveBtn">Alle verschieben</button>
                        </div>
                        <div class="form-card" style="border-color:var(--danger);">
                            <div class="form-card-title">🗑 Kategorie löschen</div>
                            <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">Die ${inCat.length} Produkte werden dabei NICHT gelöscht, sondern nach „Zubehör" verschoben. Zum Löschen einzelner Produkte: Produkt öffnen → Löschen.</div>
                            <button class="btn btn-danger btn-sm" id="catDeleteBtn">Kategorie auflösen</button>
                        </div>
                    `,
                    null, null, { wide: true }
                );

                const bulkMove = async (target, msg) => {
                    for (const m of inCat) { m.category = target; await db.put('materials', m); }
                    modal.remove();
                    showToast(msg, 'success');
                    listFilters.materials.cat = ''; listFilters.materials.level = 'cats';
                    renderMaterials();
                };
                modal.querySelector('#catRenameBtn').addEventListener('click', async () => {
                    const name = modal.querySelector('#catNewName').value.trim();
                    if (!name || name === cat) { showToast('Bitte einen neuen Namen eingeben.', 'info'); return; }
                    await bulkMove(name, `Kategorie „${cat}" heißt jetzt „${name}" (${inCat.length} Produkte aktualisiert).`);
                });
                modal.querySelector('#catMoveBtn').addEventListener('click', async () => {
                    const target = modal.querySelector('#catMoveTarget').value.trim();
                    if (!target) { showToast('Bitte Ziel-Kategorie wählen.', 'info'); return; }
                    if (!(await showConfirm(`Alle ${inCat.length} Produkte von „${cat}" nach „${target}" verschieben?`))) return;
                    await bulkMove(target, `${inCat.length} Produkte nach „${target}" verschoben.`);
                });
                modal.querySelector('#catDeleteBtn').addEventListener('click', async () => {
                    if (!(await showConfirm(`Kategorie „${cat}" auflösen und alle ${inCat.length} Produkte nach „Zubehör" verschieben?`))) return;
                    await bulkMove('Zubehör', `Kategorie „${cat}" aufgelöst – ${inCat.length} Produkte liegen jetzt unter „Zubehör".`);
                });
            },

            // ---------- Schnellrechner ----------
            calcSet(i, key, val) {
                const r = CALC_STATE.rooms[i]; if (!r) return;
                r[key] = ['area', 'windows', 'persons'].includes(key) ? (parseFloat(String(val).replace(',', '.')) || 0) : val;
                renderCalc();
            },
            calcSetGlobal(key, val) {
                CALC_STATE[key] = (key === 'demolish' || key === 'scaffold' || key === 'showVat') ? !!val
                    : (['distance', 'breakthrough', 'ductLength'].includes(key) ? (parseFloat(String(val).replace(',', '.')) || 0) : val);
                renderCalc();
            },
            calcAddRoom() { CALC_STATE.rooms.push({ area: 25, windows: 2, dir: 'sued', shade: 'normal', persons: 2 }); renderCalc(); },
            calcDelRoom(i) { CALC_STATE.rooms.splice(i, 1); if (!CALC_STATE.rooms.length) CALC_STATE.rooms.push({ area: 25, windows: 2, dir: 'sued', shade: 'normal', persons: 2 }); renderCalc(); },
            calcReset() {
                window.__calcState = { rooms: [{ area: 30, windows: 4, dir: 'sued', shade: 'normal', persons: 2 }], building: 'normal', distance: 5, breakthrough: 1, ductLength: 4, outdoor: 'wand', demolish: false, scaffold: false, brand: '' };
                Object.assign(CALC_STATE, window.__calcState);
                renderCalc();
            },
            async calcCopy() {
                const res = await calcCompute();
                const lines = [
                    res.showVat
                        ? `Richtpreis: ${formatCurrency(res.brutto)} inkl. MwSt. (ca. ${formatCurrency(res.low)}–${formatCurrency(res.high)})`
                        : `Richtpreis: ${formatCurrency(res.net)} netto (zzgl. MwSt.)`,
                    `Empfehlung: ${res.multi ? 'Multi-Split' : 'Single-Split'}, Gesamtlast ${res.sumLoad.toFixed(1).replace('.', ',')} kW`,
                    ...res.rooms.map((x, i) => `Raum ${i + 1}: ${x.load.total.toFixed(1).replace('.', ',')} kW${x.dev ? ' → ' + x.dev.name + ' (' + formatCurrency(x.dev.sellingPrice) + ')' : ''}`),
                    res.showVat
                        ? `Netto ${formatCurrency(res.net)} + USt ${formatCurrency(res.vat)} = ${formatCurrency(res.brutto)}`
                        : `Netto ${formatCurrency(res.net)} (zzgl. MwSt.)`
                ];
                try { await navigator.clipboard.writeText(lines.join('\n')); showToast('Zusammenfassung kopiert.', 'success'); }
                catch (e) { showToast('Kopieren nicht möglich.', 'error'); }
            },
            async calcToOffer() {
                const res = await calcCompute();
                const modal = showModal('Als Projekt übernehmen', `
                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">Es wird ein <strong>Kunde</strong> und ein <strong>Projekt</strong> (Status „Besichtigung offen") mit den Rechner-Daten und Räumen angelegt. Nach der Besichtigung ergänzt du vor Ort die genauen Maße, Größen und Fotos – und erstellst dann daraus das Angebot.</div>
                    <div class="form-row">
                        <div class="form-group"><label>Vorname</label><input type="text" id="calcFirst"></div>
                        <div class="form-group"><label>Nachname *</label><input type="text" id="calcLast"></div>
                    </div>
                    <div class="form-group"><label>Telefon</label><input type="text" id="calcPhone"></div>
                    <div class="form-group"><label>Adresse / Baustelle</label><input type="text" id="calcAddr"></div>
                `, async (overlay) => {
                    const last = overlay.querySelector('#calcLast').value.trim();
                    if (!last) { showToast('Bitte mindestens den Nachnamen angeben.', 'error'); return; }
                    // Kunde anlegen
                    const custId = await db.add('customers', {
                        firstName: overlay.querySelector('#calcFirst').value.trim(),
                        lastName: last, phone: overlay.querySelector('#calcPhone').value.trim(),
                        street: overlay.querySelector('#calcAddr').value.trim(), status: 'Neu', source: 'Schnellrechner'
                    });
                    // Projekt anlegen – mit Herkunft und kompletten Schnellrechner-Rohdaten
                    const calcSnapshot = {
                        building: CALC_STATE.building, distance: CALC_STATE.distance,
                        breakthrough: CALC_STATE.breakthrough, ductLength: CALC_STATE.ductLength,
                        outdoor: CALC_STATE.outdoor, demolish: CALC_STATE.demolish, scaffold: CALC_STATE.scaffold,
                        brand: CALC_STATE.brand, sumLoad: res.sumLoad, brutto: res.brutto,
                        rooms: res.rooms.map((x, i) => ({
                            area: x.r.area, windows: x.r.windows, dir: x.r.dir, shade: x.r.shade, persons: x.r.persons,
                            load: x.load.total, device: x.dev ? x.dev.name : null
                        }))
                    };
                    const projId = await db.add('projects', {
                        title: `Klima ${last}`, customerId: custId,
                        status: 'Besichtigung offen',
                        coolingRecommendation: res.sumLoad,
                        source: 'Schnellrechner', calcData: calcSnapshot,
                        notes: 'Aus Schnellrechner – vor Ort Maße, Größen und Fotos ergänzen, dann Angebot erstellen.'
                    });
                    // Räume anlegen (Fläche als quadratische Näherung -> Länge/Breite), damit
                    // nach der Besichtigung nichts neu eingegeben werden muss
                    for (let i = 0; i < res.rooms.length; i++) {
                        const x = res.rooms[i];
                        const side = Math.max(1, Math.round(Math.sqrt(Number(x.r.area) || 0) * 10) / 10);
                        await db.add('rooms', {
                            projectId: projId, name: `Raum ${i + 1}`, length: side, width: side, height: 2.5,
                            tech: {
                                distance: CALC_STATE.distance, cableDuct: CALC_STATE.ductLength,
                                coreDrills: CALC_STATE.breakthrough, outdoorMounting: CALC_STATE.outdoor,
                                devManufacturer: x.dev?.manufacturer || '', devModel: x.dev?.name || '',
                                devCapacity: parseFloat(String(x.dev?.size || '').replace(',', '.')) || null,
                                calcArea: x.r.area, calcWindows: x.r.windows, calcDir: x.r.dir,
                                calcShade: x.r.shade, calcPersons: x.r.persons, calcLoad: x.load.total
                            }
                        });
                    }
                    // KEIN Angebot mehr automatisch erstellen: Erst Besichtigung
                    // (Maße, Größen, Fotos), dann Angebot aus dem Projekt heraus.
                    // Die Rechner-Positionen bleiben als Vorschlag im calcData erhalten.
                    overlay.remove();
                    showToast(`Kunde & Projekt angelegt – jetzt besichtigen, dann Angebot erstellen.`, 'success');
                    app.navigate('projects', projId);
                }, 'Als Projekt anlegen');
            },

            // ---------- Material-Katalog: Navigation ----------
            matNav(level) {
                const F = listFilters.materials;
                if (level === 'cats') { F.cat = ''; F.hersteller = ''; F.serie = ''; }
                if (level === 'hersteller') { F.hersteller = ''; F.serie = ''; }
                if (level === 'serien') { F.serie = ''; }
                F.level = level; F.q = '';
                renderMaterials();
            },
            matOpenCat(c) { const F = listFilters.materials; F.cat = c; F.hersteller = ''; F.serie = ''; F.level = 'hersteller'; renderMaterials(); },
            matOpenHersteller(h) { const F = listFilters.materials; F.hersteller = h; F.serie = ''; F.level = 'serien'; renderMaterials(); },
            matOpenSerie(s) { const F = listFilters.materials; F.serie = s === 'Ohne Serie' ? '' : s; F.level = 'produkte'; renderMaterials(); },

            async toggleFavorite(id) {
                const m = await db.get('materials', id);
                if (!m) return;
                m.favorite = m.favorite !== true;
                await db.put('materials', m);
                renderMaterials();
            },

            async duplicateMaterial(id) {
                const m = await db.get('materials', id);
                if (!m) return;
                const copy = { ...m };
                delete copy.id; delete copy._synced; delete copy.createdAt; delete copy.updatedAt;
                copy.name = (m.name || '') + ' (Kopie)';
                const newId = await db.add('materials', copy);
                showToast('Material dupliziert.', 'success');
                app.openMaterialModal(newId);
            },

            // ---------- Produktdetailseite ----------
            async openMaterialDetail(id) {
                const m = await db.get('materials', id);
                if (!m) return;
                const st = matStockStatus(m);
                // Effektiver EK (Händlerrabatt berücksichtigen) statt rohem purchasePrice -
                // sonst zeigt die Detailseite "EK 0,00 €" / volle Marge, obwohl über den
                // Markenrabatt längst ein Einkaufspreis errechnet wird.
                const ekEffective = (typeof effectivePurchasePrice === 'function') ? (Number(effectivePurchasePrice(m)) || 0) : (Number(m.purchasePrice) || 0);
                const marge = (Number(m.sellingPrice) || 0) - ekEffective;

                // QR-Code (Artikelnummer bzw. Modellname) für Lager-Etiketten
                let qrHtml = '';
                try {
                    if (typeof window.qrcode === 'function') {
                        const qr = window.qrcode(0, 'M');
                        qr.addData('KTM|' + (m.articleNumber || m.name || String(m.id)));
                        qr.make();
                        qrHtml = `<img src="${qr.createDataURL(4, 2)}" style="width:92px;height:92px;border-radius:8px;border:1px solid var(--border);" alt="QR">`;
                    }
                } catch (e) { /* optional */ }

                showModal(
                    escapeHtml(m.name || 'Material'),
                    `
                        <div class="mat-detail">
                            <div class="mat-detail-img">${(() => { const imgs = Array.isArray(m.images) && m.images.length ? m.images : (m.image ? [m.image] : []); return imgs.length ? `<img src="${imgs[0]}" onclick="app.viewImage('${imgs[0]}')">` : `<span>${matCatIcon(m.category)}</span>`; })()}</div>
                            <div class="mat-detail-info">
                                <div class="survey-summary">
                                    ${m.manufacturer ? `<div class="survey-chip"><span>Hersteller</span><strong>${escapeHtml(m.manufacturer)}</strong></div>` : ''}
                                    ${m.series ? `<div class="survey-chip"><span>Serie</span><strong>${escapeHtml(m.series)}</strong></div>` : ''}
                                    ${m.size ? `<div class="survey-chip"><span>Leistung / Größe</span><strong>${escapeHtml(m.size)}</strong></div>` : ''}
                                    ${m.articleNumber ? `<div class="survey-chip"><span>Artikelnummer</span><strong>${escapeHtml(m.articleNumber)}</strong></div>` : ''}
                                    <div class="survey-chip"><span>Kategorie</span><strong>${escapeHtml(m.category || '-')}</strong></div>
                                    <div class="survey-chip"><span>Einheit</span><strong>${escapeHtml(m.unit || 'Stk')}</strong></div>
                                    <div class="survey-chip"><span>EK-Preis</span><strong>${formatCurrency(ekEffective)}</strong>${(!(Number(m.purchasePrice) > 0) && ekEffective > 0) ? '<small style="display:block;color:var(--text-muted);font-weight:400;">via Händlerrabatt</small>' : ''}</div>
                                    <div class="survey-chip" style="border-color:var(--accent);"><span>VK-Preis</span><strong style="color:var(--accent);">${formatCurrency(m.sellingPrice || 0)}</strong></div>
                                    ${marge > 0 ? `<div class="survey-chip"><span>Marge</span><strong style="color:var(--success);">${formatCurrency(marge)}</strong></div>` : ''}
                                    <div class="survey-chip"><span>Lagerbestand</span><strong class="${st.cls === 'st-low' ? 'text-danger' : ''}">${m.stock ?? 0} ${escapeHtml(m.unit || 'Stk')}${m.minStock > 0 ? ' (min. ' + m.minStock + ')' : ''}</strong></div>
                                </div>
                                ${m.notes ? `<div style="margin-top:12px;font-size:13px;color:var(--text-secondary);"><strong>Technische Daten:</strong><br>${escapeHtml(m.notes)}</div>` : ''}
                                ${(() => { const imgs = Array.isArray(m.images) && m.images.length ? m.images : (m.image ? [m.image] : []); return imgs.length > 1 ? `<div class="mat-img-gallery" style="margin-top:12px;">${imgs.map(src => `<div class="mat-img-thumb"><img src="${src}" onclick="app.viewImage('${src}')"></div>`).join('')}</div>` : ''; })()}
                            </div>
                            <div class="mat-detail-side">
                                ${qrHtml}
                                <span class="mat-stock ${st.cls}" style="margin-top:8px;">${st.label}</span>
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
                            <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); app.addMaterialToProject(${idJS(m.id)})">${icon('plus')} Zum Projekt hinzufügen</button>
                            ${(['Rolle', 'Bund', 'Stange'].includes(m.unit || '') && Number(m.bundleLength) > 0) ? `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove(); app.bookConsumption(${idJS(m.id)})">📉 Verbrauch buchen (Meter)</button>` : ''}
                            <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove(); app.openMaterialModal(${idJS(m.id)})">${icon('edit')} Bearbeiten</button>
                            <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove(); app.duplicateMaterial(${idJS(m.id)})">⧉ Duplizieren</button>
                            <button class="btn btn-danger" onclick="this.closest('.modal-overlay').remove(); app.deleteMaterial(${idJS(m.id)})">${icon('trash')} Löschen</button>
                        </div>
                    `,
                    null, null, { wide: true }
                );
            },

            // ---------- "Zum Projekt hinzufügen" ----------
            async addMaterialToProject(materialId) {
                const m = await db.get('materials', materialId);
                if (!m) return;
                const projects = (await db.getAll('projects')).filter(p => !['Bezahlt', 'Archiviert', 'Archiv'].includes(p.status))
                    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                if (projects.length === 0) { showToast('Kein offenes Projekt vorhanden – lege zuerst ein Projekt an.', 'info'); return; }

                const modal = showModal(
                    `${escapeHtml(m.name)} zum Projekt hinzufügen`,
                    `
                        <div class="form-group"><label>Projekt *</label>
                            <select id="amp_project">${projects.map(p => `<option value="${escapeHtml(String(p.id))}">${escapeHtml(p.title || 'Projekt')}</option>`).join('')}</select>
                        </div>
                        <div class="form-group"><label>Raum (optional)</label><select id="amp_room"><option value="">Projekt gesamt</option></select></div>
                        <div class="form-row">
                            <div class="form-group"><label>Menge *</label><input type="number" id="amp_qty" inputmode="decimal" step="any" min="0" value="1"></div>
                            <div class="form-group"><label>Einheit</label><select id="amp_unit">${UNITS.map(u => `<option value="${u}" ${(m.unit || 'Stk') === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
                        </div>
                    `,
                    async (overlay) => {
                        const projectId = parseId(overlay.querySelector('#amp_project').value);
                        const roomId = overlay.querySelector('#amp_room').value || null;
                        const qty = parseFloat(String(overlay.querySelector('#amp_qty').value).replace(',', '.'));
                        if (!projectId || isNaN(qty) || qty <= 0) { showToast('Bitte Projekt und Menge angeben.', 'error'); return; }
                        await db.add('projectMaterials', {
                            projectId, materialId: m.id, roomId: roomId ? parseId(roomId) : null,
                            quantity: qty, unit: overlay.querySelector('#amp_unit').value,
                            size: m.size || '', price: matUnitPrice(m, overlay.querySelector('#amp_unit').value), note: 'Aus Katalog'
                        });
                        overlay.remove();
                        showToast(`${qty} ${overlay.querySelector('#amp_unit')?.value || ''} ${m.name} zum Projekt hinzugefügt.`.trim(), 'success');
                        // Set-Vorschlag: passendes Gegenstück (Innen<->Außen) anbieten
                        this._suggestSetPartner(m, projectId, roomId ? parseId(roomId) : null, qty);
                    }
                );
                // Räume des gewählten Projekts nachladen
                const loadRooms = async () => {
                    const pid = modal.querySelector('#amp_project').value;
                    const rooms = (await db.getByIndex('rooms', 'projectId', pid)) || [];
                    modal.querySelector('#amp_room').innerHTML = '<option value="">Projekt gesamt</option>' +
                        rooms.map(r => `<option value="${escapeHtml(String(r.id))}">${escapeHtml(r.name || 'Raum')}</option>`).join('');
                };
                modal.querySelector('#amp_project').addEventListener('change', loadRooms);
                loadRooms();
            },

            // ---------- Raum mit Material anlegen/bearbeiten ----------
            // Sucht das passende Innen-/Außengerät zum gerade hinzugefügten Split-Gerät.
            async _suggestSetPartner(m, projectId, roomId, qty) {
                const b = m.bauart || '';
                // Nur bei Single-Split-Geräten (ein Innen gehört zu genau einem Außen)
                const isInnen = b === 'Innengerät Single-Split';
                const isAussen = b === 'Außengerät Single-Split';
                if (!isInnen && !isAussen) return;

                const wantBauart = isInnen ? 'Außengerät Single-Split' : 'Innengerät Single-Split';
                const mats = await db.getAll('materials');
                // Match: gleiche Marke + gleiche Serie + gleiche Größe, passende Bauart
                const norm = s => String(s || '').trim().toLowerCase();
                let partners = mats.filter(x => x.bauart === wantBauart
                    && norm(x.manufacturer) === norm(m.manufacturer)
                    && norm(x.series) === norm(m.series)
                    && norm(x.size) === norm(m.size));
                // Wenn Größe nicht eindeutig, wenigstens Marke+Serie
                if (partners.length === 0) {
                    partners = mats.filter(x => x.bauart === wantBauart
                        && norm(x.manufacturer) === norm(m.manufacturer)
                        && norm(x.series) === norm(m.series)
                        && norm(x.size) === norm(m.size));
                }
                if (partners.length !== 1) return; // nur bei eindeutigem Treffer vorschlagen
                const partner = partners[0];

                // Schon im Projekt? Dann nicht nochmal fragen
                const existing = (await db.getByIndex('projectMaterials', 'projectId', projectId)) || [];
                if (existing.some(pm => String(pm.materialId) === String(partner.id) && String(pm.roomId || '') === String(roomId || ''))) return;

                const ok = await showConfirm(
                    `Dazu passt <strong>${escapeHtml(partner.name)}</strong> (${escapeHtml(wantBauart)}). Als Set gleich mit hinzufügen?`,
                    { title: 'Passendes Gerät gefunden', okText: 'Ja, hinzufügen', danger: false }
                );
                if (!ok) return;
                await db.add('projectMaterials', {
                    projectId, materialId: partner.id, roomId: roomId || null,
                    quantity: qty, unit: partner.unit || 'Stk',
                    size: partner.size || '', price: matUnitPrice(partner, partner.unit || 'Stk'), note: 'Set-Ergänzung'
                });
                showToast(`${partner.name} als Set ergänzt.`, 'success');
                if (this.currentPage === 'projects' && this.currentProjectId === projectId) this.navigate('projects', projectId);
            },

            async openRoomModal(projectId, roomId = null) {
                await loadLearned();
                const room = roomId ? await db.get('rooms', roomId) : null;
                const tech = room?.tech || {};
                const materials = (await db.getAll('materials')).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                const existingPm = roomId ? ((await db.getByIndex('projectMaterials', 'projectId', projectId)) || []).filter(x => String(x.roomId) === String(roomId)) : [];

                const matOptions = (sel) => materials.map(m => `<option value="${escapeHtml(String(m.id))}" data-unit="${escapeHtml(m.unit || 'Stk')}" ${String(sel) === String(m.id) ? 'selected' : ''}>${escapeHtml(m.name)}${m.size ? ' – ' + escapeHtml(m.size) : ''}</option>`).join('');
                const pmPrice = (x) => {
                    if (x && x.price !== undefined && x.price !== null) return Number(x.price);
                    const m = materials.find(mm => String(mm.id) === String(x?.materialId));
                    return m ? matUnitPrice(m, x?.unit || m.unit || 'Stk') : 0;
                };
                const pmRow = (x = null) => `
                    <div class="pm-row" data-pmid="${x ? escapeHtml(String(x.id)) : ''}">
                        <select class="pmr-mat">${matOptions(x?.materialId)}</select>
                        <input type="number" class="pmr-qty" inputmode="decimal" step="any" min="0" value="${x?.quantity ?? 1}" title="Menge">
                        <select class="pmr-unit">${UNITS.map(u => `<option value="${u}" ${(x?.unit || 'Stk') === u ? 'selected' : ''}>${u}</option>`).join('')}</select>
                        <input type="number" class="pmr-price" inputmode="decimal" step="any" min="0" value="${x ? pmPrice(x) : ''}" title="Preis je Einheit – Änderung wird im Katalog gemerkt" placeholder="€">
                        <button type="button" class="btn btn-sm btn-danger pmr-del">${icon('trash')}</button>
                    </div>`;

                const techGroups = [...new Set(ROOM_TECH_FIELDS.map(f => f.group))];
                const techCards = techGroups.map(g => `
                    <div class="form-card">
                        <div class="form-card-title">${ROOM_GROUP_ICONS[g] || ''} ${g}</div>
                        <div class="survey-grid">
                            ${ROOM_TECH_FIELDS.filter(f => f.group === g).map(f => techFieldInput(f, tech[f.key], 'rt_')).join('')}
                        </div>
                        ${g === 'Leitungen' ? '<div style="font-size:12px;color:var(--accent);font-weight:600;margin-top:6px;">💡 Aus der Rohrlänge wird beim Speichern automatisch passendes Material für diesen Raum vorgeschlagen.</div>' : ''}
                    </div>
                `).join('');

                const modal = showModal(
                    room ? `Raum bearbeiten – ${escapeHtml(room.name || '')}` : 'Neuer Raum',
                    `
                        <div class="form-card">
                            <div class="form-card-title">📐 Raumdaten</div>
                            <div class="form-group"><label>Raumname</label>
                                <input type="text" id="roomName" list="roomNameList" value="${escapeHtml(room?.name || '')}" placeholder="z. B. Wohnzimmer">
                                <datalist id="roomNameList">${[...new Set([...learnedList('roomName'), ...ROOM_NAMES])].map(n => `<option value="${escapeHtml(n)}">`).join('')}</datalist>
                            </div>
                            <div class="form-row-3">
                                <div class="form-group"><label>Länge (m) *</label><input type="number" id="roomLength" inputmode="decimal" step="0.1" min="0" value="${room?.length ?? ''}" placeholder="5.0"></div>
                                <div class="form-group"><label>Breite (m) *</label><input type="number" id="roomWidth" inputmode="decimal" step="0.1" min="0" value="${room?.width ?? ''}" placeholder="4.0"></div>
                                <div class="form-group"><label>Höhe (m)</label><input type="number" id="roomHeight" inputmode="decimal" step="0.1" min="0" value="${room?.height ?? 2.5}"></div>
                            </div>
                            <div class="room-calc" id="roomCalc"></div>
                        </div>

                        ${techCards}

                        <div class="form-card">
                            <div class="form-card-title">📦 Material für diesen Raum</div>
                            <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">Auswahl aus der Materialdatenbank – Menge und Einheit direkt eingeben.</div>
                            <div id="pmRows">${existingPm.map(x => pmRow(x)).join('')}</div>
                            <button type="button" class="btn btn-sm btn-outline" id="pmAddRow" style="margin-top:8px;">${icon('plus')} Material-Zeile</button>
                            ${materials.length === 0 ? '<div style="font-size:12px;color:var(--warning);margin-top:8px;">Materialdatenbank ist leer – beim Speichern werden vorgeschlagene Materialien automatisch angelegt.</div>' : ''}
                        </div>
                    `,
                    async (overlay) => {
                        const name = overlay.querySelector('#roomName').value.trim() || 'Unbenannt';
                        const length = parseFloat(String(overlay.querySelector('#roomLength').value).replace(',', '.')) || 0;
                        const width = parseFloat(String(overlay.querySelector('#roomWidth').value).replace(',', '.')) || 0;
                        const height = parseFloat(String(overlay.querySelector('#roomHeight').value).replace(',', '.')) || 2.5;
                        if (length <= 0 || width <= 0) { showToast('Länge und Breite müssen größer als 0 sein.', 'error'); return; }

                        // Technische Daten einsammeln
                        const techData = { ...(room?.tech || {}) };
                        for (const f of ROOM_TECH_FIELDS) {
                            const v = techFieldRead(f, overlay, 'rt_');
                            if (v !== undefined) techData[f.key] = v;
                        }

                        let rid = roomId;
                        if (room) {
                            await db.put('rooms', { ...room, name, length, width, height, tech: techData });
                        } else {
                            rid = await db.add('rooms', { projectId, name, length, width, height, tech: techData });
                        }
                        // Häufige Eingaben lernen – ein einziger Settings-Write
                        learnValues([['pipeDimension', techData.pipeDimension], ['insulation', techData.insulation], ['powerCable', techData.powerCable], ['commCable', techData.commCable], ['devModel', techData.devModel], ['devPosition', techData.devPosition], ['roomName', name]]).catch(() => {});

                        // Manuelle Material-Zeilen abgleichen
                        const rows = [...overlay.querySelectorAll('.pm-row')];
                        const keptIds = new Set();
                        const manualMatIds = new Set();
                        const priceLearned = [];
                        for (const r of rows) {
                            const matId = r.querySelector('.pmr-mat').value;
                            const qty = parseFloat(String(r.querySelector('.pmr-qty').value).replace(',', '.'));
                            if (!matId || isNaN(qty) || qty <= 0) continue;
                            manualMatIds.add(String(matId));
                            const unit = r.querySelector('.pmr-unit').value;
                            // Material IMMER frisch aus der DB (Modal-Scope kann veraltet sein)
                            const mat = (await db.get('materials', parseId(matId))) || materials.find(m => String(m.id) === String(matId));
                            const priceRaw = r.querySelector('.pmr-price')?.value;
                            const priceIn = priceRaw === '' || priceRaw === undefined ? null : parseFloat(String(priceRaw).replace(',', '.'));
                            const price = (priceIn !== null && !isNaN(priceIn) && priceIn >= 0) ? priceIn : matUnitPrice(mat, unit);

                            // PREIS MERKEN: geänderter Preis wandert direkt in den Katalog (gleiche Einheit)
                            if (mat && priceIn !== null && !isNaN(priceIn) && priceIn > 0
                                && (mat.unit || 'Stk') === unit && Number(mat.sellingPrice) !== priceIn) {
                                mat.sellingPrice = priceIn;
                                if (!(Number(mat.purchasePrice) > 0)) mat.purchasePrice = priceIn;
                                await db.put('materials', mat);
                                priceLearned.push(mat.name);
                            }

                            const pmid = r.dataset.pmid;
                            if (pmid) {
                                const rec = await db.get('projectMaterials', pmid);
                                if (rec) { rec.materialId = parseId(matId); rec.quantity = qty; rec.unit = unit; rec.price = price; await db.put('projectMaterials', rec); keptIds.add(String(pmid)); }
                            } else {
                                const newId = await db.add('projectMaterials', { projectId, materialId: parseId(matId), roomId: rid, quantity: qty, unit, size: mat?.size || '', price, note: name });
                                keptIds.add(String(newId));
                            }
                        }
                        if (room) {
                            for (const x of existingPm) {
                                if (!keptIds.has(String(x.id))) await db.delete('projectMaterials', x.id);
                            }
                        }

                        // AUTOMATISCHE VORSCHLÄGE aus den Leitungsdaten dieses Raums
                        const auto = await app._applyRoomAutoMaterials(projectId, rid, name, techData, manualMatIds);

                        overlay.remove();
                        showToast(`${room ? 'Raum aktualisiert' : 'Raum angelegt'}${auto > 0 ? ` – ${auto} Materialposition(en) automatisch ergänzt` : ''}.`, 'success');
                        if (priceLearned.length) {
                            showToast(`Neuer Preis im Katalog gemerkt: ${[...new Set(priceLearned)].join(', ')}`, 'success');
                        }
                        app.reloadProject(projectId);
                    },
                    null,
                    { wide: true }
                );

                // Live: Fläche, Volumen, empfohlene Kälteleistung
                const updCalc = () => {
                    const l = parseFloat(String(modal.querySelector('#roomLength').value).replace(',', '.')) || 0;
                    const w = parseFloat(String(modal.querySelector('#roomWidth').value).replace(',', '.')) || 0;
                    const h = parseFloat(String(modal.querySelector('#roomHeight').value).replace(',', '.')) || 2.5;
                    const el = modal.querySelector('#roomCalc');
                    if (l > 0 && w > 0) {
                        const area = l * w;
                        el.innerHTML = `
                            <div class="calc-chip"><span>Fläche</span><strong>${area.toFixed(1)} m²</strong></div>
                            <div class="calc-chip"><span>Volumen</span><strong>${(area * h).toFixed(1)} m³</strong></div>
                            <div class="calc-chip accent"><span>Empf. Kälteleistung</span><strong>${((area * 80) / 1000).toFixed(1)} kW</strong></div>`;
                    } else { el.innerHTML = ''; }
                };
                ['#roomLength', '#roomWidth', '#roomHeight'].forEach(s => modal.querySelector(s).addEventListener('input', updCalc));
                updCalc();

                // Material-Zeilen
                const bindRow = (r) => {
                    r.querySelector('.pmr-del').addEventListener('click', () => r.remove());
                    r.querySelector('.pmr-mat').addEventListener('change', (e) => {
                        r.querySelector('.pmr-unit').value = e.target.selectedOptions[0]?.dataset.unit || 'Stk';
                    });
                };
                modal.querySelectorAll('.pm-row').forEach(bindRow);
                // ---------- Live-Automatik im Formular ----------
                // Rohrlänge tippen -> Kommkabel/Kondensat/Kabelkanal/Stromkabel sofort
                // mitgefüllt (bleiben editierbar: eigene Eingabe stoppt die Automatik)
                const $f = (k) => modal.querySelector('#rt_' + k);
                const autoKeys = ['commCableLength', 'condensateLine', 'cableDuct', 'powerCableLength'];
                for (const k of autoKeys) {
                    const el = $f(k);
                    if (!el) continue;
                    el.dataset.auto = el.value === '' ? '1' : '0';
                    el.addEventListener('input', () => { el.dataset.auto = '0'; });
                }
                $f('pipeLength')?.addEventListener('input', () => {
                    const L = parseFloat(String($f('pipeLength').value).replace(',', '.'));
                    if (!(L > 0)) return;
                    const set = (k, val) => { const el = $f(k); if (el && el.dataset.auto !== '0') { el.value = val; el.dataset.auto = '1'; } };
                    set('commCableLength', L);      // gleiche Strecke bis zum Außengerät
                    set('condensateLine', L);       // Kondensat läuft mit zur Außeneinheit
                    set('cableDuct', L);            // Startwert, bei Bedarf anpassen
                    set('powerCableLength', L);     // gleiche Strecke wie das Rohr
                });
                // Geräte-kW -> Rohrdimensionen vorschlagen (nur wenn noch leer)
                $f('devCapacity')?.addEventListener('input', () => {
                    const kw = parseFloat(String($f('devCapacity').value).replace(',', '.'));
                    const a = modal.querySelector('#rt_pipeDimensionFluessig');
                    const b = modal.querySelector('#rt_pipeDimensionSaug');
                    if (!(kw > 0) || !a || !b || a.value || b.value) return;
                    const dims = kw <= 3.5 ? ['1/4', '3/8'] : kw <= 5.0 ? ['1/4', '1/2'] : kw <= 7.1 ? ['3/8', '5/8'] : ['3/8', '3/4'];
                    a.value = dims[0]; b.value = dims[1];
                });
                // Katalog-Anreicherung: eigene Kupferrohre mit Meterpreis in den Dropdowns markieren
                db.getAll('materials').then(mats => {
                    modal.querySelectorAll('.pipedim-sel option').forEach(opt => {
                        if (!opt.value) return;
                        const kat = app._findKupferrohr(mats, opt.value);
                        if (kat) {
                            const pm = matUnitPrice(kat, 'm');
                            opt.textContent = `${opt.value}  ✓ Lager${pm ? ' · ' + formatCurrency(pm) + '/m' : ''}`;
                        }
                    });
                }).catch(() => {});

                modal.querySelector('#pmAddRow').addEventListener('click', () => {
                    if (materials.length === 0) { showToast('Materialdatenbank ist leer – nutze die automatischen Vorschläge beim Speichern.', 'info'); return; }
                    const wrap = modal.querySelector('#pmRows');
                    const div = document.createElement('div');
                    div.innerHTML = pmRow();
                    const r = div.firstElementChild;
                    wrap.appendChild(r);
                    bindRow(r);
                    r.querySelector('.pmr-unit').value = r.querySelector('.pmr-mat').selectedOptions[0]?.dataset.unit || 'Stk';
                });
            },

            // Material im Katalog sicherstellen (legt fehlende automatisch an)
            // Sucht IMMER zuerst im eigenen Katalog (Stichwörter + Kategorie + Größe).
            // Nur wenn wirklich nichts passt, wird ein Platzhalter angelegt.
            async _ensureCatalogMaterial(name, size, category, unit, allMats = null) {
                const all = allMats || await db.getAll('materials');
                const norm = s => String(s || '').toLowerCase().replace(/[\s.,×x*"']/g, '');
                const n = norm(name), sz = norm(size);

                // Stichwörter je Materialtyp -> findet auch abweichende Schreibweisen
                const KEYS = [
                    { k: ['kommunikationskabel', 'kommkabel', 'steuerkabel', 'busleitung'], cat: ['Kabel', 'Elektromaterial'] },
                    { k: ['stromkabel', 'zuleitung', 'nym', 'speisekabel'], cat: ['Kabel', 'Elektromaterial'] },
                    { k: ['kondensatschlauch', 'kondensatleitung', 'ablaufschlauch'], cat: ['Kondensat', 'Kondensattechnik'] },
                    { k: ['kondensatpumpe', 'hebepumpe'], cat: ['Kondensat', 'Kondensattechnik'] },
                    { k: ['kabelkanalbogen', 'kanalbogen'], cat: ['Elektromaterial', 'Montagematerial'] },
                    { k: ['kabelkanal', 'installationskanal', 'leitungskanal'], cat: ['Elektromaterial', 'Montagematerial'], not: ['bogen'] },
                    { k: ['kupferrohr', 'curohr'], cat: ['Kupferrohr', 'Kupferrohre'] },
                    { k: ['arbeitsleistung', 'montage', 'arbeitszeit'], cat: ['Arbeitszeit'] },
                    { k: ['bigfoot', 'bodenkonsole'], cat: ['Befestigung', 'Montagematerial'] },
                    { k: ['wandkonsole', 'wandhalter'], cat: ['Befestigung', 'Montagematerial'] },
                    { k: ['schwingungsdämpfer', 'schwingungsdampfer', 'gummipuffer'], cat: ['Befestigung', 'Montagematerial'] }
                ];
                const entry = KEYS.find(e => e.k.some(k => n.includes(norm(k))));
                const score = (m) => {
                    const mn = norm(m.name), mc = m.category || '';
                    let s = 0;
                    if (entry) {
                        if (!entry.k.some(k => mn.includes(norm(k)))) return -1;             // falscher Typ
                        if (entry.not && entry.not.some(x => mn.includes(norm(x)))) return -1; // Ausschluss (z.B. Bogen)
                        if (entry.cat.includes(mc) || mc === category) s += 3;
                    } else {
                        if (mn === n) s += 5; else if (mn.includes(n) || n.includes(mn)) s += 2; else return -1;
                        if (mc === category) s += 2;
                    }
                    if (sz && norm(m.size) === sz) s += 4;                                    // exakte Größe (4x1,5)
                    else if (sz && norm(m.size).includes(sz)) s += 2;
                    if (Number(m.sellingPrice) > 0) s += 2;                                   // gepflegter Preis bevorzugt
                    if (Number(m.stock) > 0) s += 1;                                          // auf Lager bevorzugt
                    return s;
                };
                const ranked = all.map(m => ({ m, s: score(m) })).filter(x => x.s >= 0).sort((a, b) => b.s - a.s);
                if (ranked.length) return ranked[0].m;

                // Nichts Passendes im Katalog -> Platzhalter (klar gekennzeichnet)
                const id = await db.add('materials', { name, size: size || '', category, unit, manufacturer: '', articleNumber: '', purchasePrice: 0, sellingPrice: 0, stock: 0, notes: 'Automatisch angelegt – Preis bitte ergänzen' });
                return await db.get('materials', id);
            },

            // Automatische Raum-Materialvorschläge aus den Leitungsdaten (Rohrlänge 6 m ->
            // 6 m Kupferrohr, 6 m Isolierung, 6 m Kondensatschlauch, 7 m Strom-/Komm.-Kabel, 6 m Kanal)
            // Katalog-Kupferrohr zur Dimension finden (nutzt echte Artikel mit Bund-Meterpreis)
            _findKupferrohr(allMats, dim) {
                const d = String(dim).replace(/[^0-9/]/g, '');
                if (!d) return null;
                const cands = allMats.filter(m =>
                    `${m.category || ''} ${m.name || ''}`.toLowerCase().includes('kupferrohr') &&
                    `${m.size || ''} ${m.name || ''}`.includes(d));
                cands.sort((a, b) => {
                    const w = (m) => (`${m.size} ${m.name}`.includes('0.8') || `${m.size} ${m.name}`.includes('0,8') ? 2 : 0) + (Number(m.bundleLength) > 0 ? 1 : 0);
                    return w(b) - w(a);
                });
                return cands[0] || null;
            },

            async _applyRoomAutoMaterials(projectId, roomId, roomName, tech, manualMatIds = new Set()) {
                const num = v => (typeof v === 'number' && v > 0 ? v : 0);
                const L = num(tech.pipeLength);
                const allMats = await db.getAll('materials');
                const wanted = [];   // { mat | (name,size,category,unit), qty }

                if (L > 0) {
                    // Kupferrohr ISOLIERT je Dimension (1/4" + 3/8" = 2 Positionen) - Isolierung
                    // ist enthalten, KEINE separate Rohrisolierungs-Position mehr (Dubletten-Regel)
                    const dims = String(tech.pipeDimension || '').match(/\d\/\d/g) || [];
                    if (dims.length) {
                        for (const d of dims) {
                            const kat = this._findKupferrohr(allMats, d);
                            wanted.push(kat
                                ? { mat: kat, qty: L, unit: 'm' }
                                : { name: `Kupferrohr isoliert ${d}"`, size: d + '"', qty: L, unit: 'm', category: 'Kupferrohre' });
                        }
                    } else {
                        wanted.push({ name: 'Kupferrohr isoliert', size: tech.pipeDimension || '', qty: L, unit: 'm', category: 'Kupferrohre' });
                    }
                    // Automatische Längen: gleiche Strecke wie das Rohr, nur bei Abweichung ändern
                    wanted.push({ name: 'Kondensatschlauch', size: '', qty: num(tech.condensateLine) || L, unit: 'm', category: 'Kondensat' });
                    wanted.push({ name: 'Stromkabel', size: tech.powerCable || '3x1,5', qty: num(tech.powerCableLength) || L, unit: 'm', category: 'Kabel' });
                    wanted.push({ name: 'Kommunikationskabel', size: tech.commCable || '4x1,5', qty: num(tech.commCableLength) || L, unit: 'm', category: 'Kabel' });
                    wanted.push({ name: 'Kabelkanal', size: '', qty: num(tech.cableDuct) || L, unit: 'm', category: 'Elektromaterial' });
                    wanted.push({ name: 'Arbeitsleistung Montage', size: '', qty: 1, unit: 'Stk', category: 'Arbeitszeit' });
                }
                if (tech.condensatePump === true) wanted.push({ name: 'Kondensatpumpe', size: '', qty: 1, unit: 'Stk', category: 'Kondensat' });
                if (tech.devManufacturer) {
                    // Innengerät: zuerst echtes Katalog-Gerät suchen (Modell/Hersteller), sonst generisch
                    const model = String(tech.devModel || '').trim();
                    const dev = allMats.find(m => model && `${m.name || ''}`.toLowerCase().includes(model.toLowerCase()))
                        || allMats.find(m => (m.category === 'Innengeräte' || m.category === 'Klimageräte')
                            && (m.manufacturer || '').toLowerCase() === String(tech.devManufacturer).toLowerCase()
                            && num(tech.devCapacity) && parseFloat(String(m.size).replace(',', '.')) === num(tech.devCapacity));
                    wanted.push(dev
                        ? { mat: dev, qty: 1, unit: 'Stk' }
                        : { name: `Innengerät ${tech.devManufacturer}`, size: model || (num(tech.devCapacity) ? `${tech.devCapacity} kW` : ''), qty: 1, unit: 'Stk', category: 'Innengeräte' });
                }
                if (tech.bigFoot === true) wanted.push({ name: 'Big Foot Konsole', size: '', qty: 1, unit: 'Set', category: 'Befestigung' });
                if (tech.wallBracket === true) wanted.push({ name: 'Wandkonsole Außengerät', size: '', qty: 1, unit: 'Stk', category: 'Befestigung' });
                if (tech.vibrationDampers === true) wanted.push({ name: 'Schwingungsdämpfer', size: '', qty: 1, unit: 'Set', category: 'Befestigung' });
                if (wanted.length === 0) return 0;

                const existing = ((await db.getByIndex('projectMaterials', 'projectId', projectId)) || []).filter(x => String(x.roomId) === String(roomId));
                let added = 0, updated = 0;
                for (const w of wanted) {
                    const mat = w.mat || await this._ensureCatalogMaterial(w.name, w.size, w.category, w.unit, allMats);
                    if (manualMatIds.has(String(mat.id))) continue;   // manuell erfasst -> nicht anfassen
                    const dup = existing.find(x => String(x.materialId) === String(mat.id) && (x.unit || 'Stk') === w.unit);
                    if (dup) {
                        // DUBLETTEN-REGEL: existiert bereits -> Menge aktualisieren statt neu anlegen
                        if (Number(dup.quantity) !== w.qty && String(dup.note || '').includes('automatisch')) {
                            dup.quantity = w.qty;
                            dup.note = `${roomName} – automatisch`;
                            await db.put('projectMaterials', dup);
                            updated++;
                        }
                        continue;
                    }
                    await db.add('projectMaterials', { projectId, materialId: mat.id, roomId, quantity: w.qty, unit: w.unit, size: w.size || mat.size || '', price: matUnitPrice(mat, w.unit), note: `${roomName} – automatisch` });
                    added++;
                }
                return added + updated;
            },

            // ---------- Projekt-Modal: intelligente Titel + Datenschutz vor Überschreiben ----------
            async openProjectModal(id = null) {
                const project = id ? await db.get('projects', id) : null;
                const customers = await db.getAll('customers');
                const modal = showModal(
                    id ? 'Projekt bearbeiten' : 'Neues Projekt',
                    `
                        <div class="form-group"><label>Kunde</label>
                            <select id="projCustomer">
                                <option value="">-- Kunde auswählen --</option>
                                ${customers.map(c => `<option value="${escapeHtml(String(c.id))}" ${String(project?.customerId) === String(c.id) ? 'selected' : ''}>${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group"><label>Projekttitel *</label>
                            <input type="text" id="projTitle" list="projTitleList" value="${escapeHtml(project?.title || '')}" placeholder="Kunde wählen für Vorschläge...">
                            <datalist id="projTitleList"></datalist>
                        </div>
                        <div class="form-group"><label>Baustellenadresse (falls abweichend)</label><input type="text" id="projSiteAddress" value="${escapeHtml(project?.siteAddress || '')}" placeholder="Straße, PLZ Ort"></div>
                        <div class="form-group"><label>Status</label>
                            <select id="projStatus">${statusOptions(project?.status || 'Besichtigung').map(s => `<option value="${s}" ${(project?.status || 'Besichtigung') === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
                        </div>
                        <div class="form-group"><label>Notizen</label><textarea id="projNotes" rows="3">${escapeHtml(project?.notes || '')}</textarea></div>
                    `,
                    async (overlay) => {
                        const title = overlay.querySelector('#projTitle').value.trim();
                        if (!title) { showToast('Titel ist erforderlich.', 'error'); return; }
                        const data = {
                            ...(project || {}),   // WICHTIG: survey/customData/Termine-Verknüpfungen bleiben erhalten
                            title,
                            customerId: parseId(overlay.querySelector('#projCustomer').value),
                            siteAddress: overlay.querySelector('#projSiteAddress').value.trim(),
                            status: overlay.querySelector('#projStatus').value,
                            notes: overlay.querySelector('#projNotes').value.trim(),
                        };
                        let pid = id;
                        if (id) { await db.put('projects', data); }
                        else { pid = await db.add('projects', data); }
                        overlay.remove();
                        showToast(id ? 'Projekt aktualisiert.' : 'Projekt erstellt.', 'success');
                        app.reloadProject(pid);
                    }
                );

                // Titel-Vorschläge aus Kundennamen
                const custSel = modal.querySelector('#projCustomer');
                const titleList = modal.querySelector('#projTitleList');
                const updateTitles = () => {
                    const c = customers.find(x => String(x.id) === String(custSel.value));
                    const nm = c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '';
                    titleList.innerHTML = nm ? PROJECT_TITLE_TYPES.map(t => `<option value="${escapeHtml(t + ' ' + nm)}">`).join('') : '';
                    const inp = modal.querySelector('#projTitle');
                    inp.placeholder = nm ? `z. B. Klimaanlage ${nm}` : 'Kunde wählen für Vorschläge...';
                };
                custSel.addEventListener('change', updateTitles);
                updateTitles();
            },

            // ---------- Projekt löschen: ALLE zugehörigen Daten mitnehmen ----------
            async deleteProject(id) {
                if (!await showConfirm('Projekt und alle zugehörigen Räume, Bilder, Angebote, Materialien, Bestellungen und Termine wirklich löschen?')) return;
                try {
                    for (const r of (await db.getByIndex('rooms', 'projectId', id)) || []) await db.delete('rooms', r.id);
                    for (const i of (await db.getByIndex('images', 'projectId', id)) || []) await db.delete('images', i.id);
                    for (const o of (await db.getByIndex('offers', 'projectId', id)) || []) await db.delete('offers', o.id);
                    for (const x of (await db.getByIndex('projectMaterials', 'projectId', id)) || []) await db.delete('projectMaterials', x.id);
                    for (const b of (await db.getByIndex('orders', 'projectId', id)) || []) await db.delete('orders', b.id);
                    for (const ev of (await db.getByIndex('events', 'projectId', id)) || []) await db.delete('events', ev.id);
                    await db.delete('projects', id);
                    showToast('Projekt vollständig gelöscht.', 'info');
                    app.navigate('projects');
                } catch (e) {
                    showToast('Fehler beim Löschen: ' + e.message, 'error');
                }
            },

            // ---------- Zusatzfelder ----------
            async openFieldModal(entity, fieldId = null) {
                const f = fieldId ? (_ktmFields || []).find(x => x.id === fieldId) : null;
                showModal(
                    f ? 'Feld bearbeiten' : 'Neues Feld',
                    `
                        <div class="form-group"><label>Bezeichnung *</label><input type="text" id="cfLabel" value="${escapeHtml(f?.label || '')}" placeholder="z. B. Anlagentyp, Seriennummer, Garantie bis"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Typ</label><select id="cfType">${FIELD_TYPES.map(t => `<option value="${t.v}" ${f?.type === t.v ? 'selected' : ''}>${t.l}</option>`).join('')}</select></div>
                            <div class="form-group"><label>Maßeinheit (optional)</label><input type="text" id="cfUnit" value="${escapeHtml(f?.unit || '')}" placeholder="z. B. m, kW, kg"></div>
                        </div>
                        <div class="form-group" id="cfOptionsWrap" style="display:${f?.type === 'select' || f?.type === 'multiselect' ? 'block' : 'none'};">
                            <label>Optionen (mit Komma trennen)</label>
                            <input type="text" id="cfOptions" value="${escapeHtml((f?.options || []).join(', '))}" placeholder="z. B. Splitgerät, Multisplit, VRF">
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Standardwert (optional)</label><input type="text" id="cfDefault" value="${escapeHtml(f?.defaultValue !== undefined ? String(f.defaultValue) : '')}"></div>
                            <div class="form-group"><label>Pflichtfeld</label><select id="cfRequired"><option value="">Nein</option><option value="1" ${f?.required ? 'selected' : ''}>Ja</option></select></div>
                        </div>
                    `,
                    async (overlay) => {
                        const label = overlay.querySelector('#cfLabel').value.trim();
                        if (!label) { showToast('Bezeichnung ist ein Pflichtfeld.', 'error'); return; }
                        const type = overlay.querySelector('#cfType').value;
                        const all = _ktmFields || [];
                        const entityFields = all.filter(x => x.entity === entity);
                        const def = {
                            id: f?.id || generateUUID(),
                            entity, label, type,
                            unit: overlay.querySelector('#cfUnit').value.trim(),
                            options: (type === 'select' || type === 'multiselect') ? overlay.querySelector('#cfOptions').value.split(',').map(x => x.trim()).filter(Boolean) : [],
                            required: overlay.querySelector('#cfRequired').value === '1',
                            defaultValue: overlay.querySelector('#cfDefault').value.trim(),
                            order: f?.order ?? entityFields.length
                        };
                        const rest = all.filter(x => x.id !== def.id);
                        await saveCustomFields([...rest, def]);
                        overlay.remove();
                        showToast('Feld gespeichert.', 'success');
                        renderFields();
                    }
                ).querySelector('#cfType').addEventListener('change', (e) => {
                    document.getElementById('cfOptionsWrap').style.display = (e.target.value === 'select' || e.target.value === 'multiselect') ? 'block' : 'none';
                });
            },
            async deleteField(fieldId) {
                if (!confirm('Dieses Feld löschen? Bereits gespeicherte Werte bleiben in den Datensätzen erhalten.')) return;
                await saveCustomFields((_ktmFields || []).filter(x => x.id !== fieldId));
                renderFields();
            },
            async moveField(fieldId, dir) {
                const fields = getCustomFields(fieldsActiveEntity);
                const idx = fields.findIndex(f => f.id === fieldId);
                const target = idx + dir;
                if (idx < 0 || target < 0 || target >= fields.length) return;
                [fields[idx], fields[target]] = [fields[target], fields[idx]];
                fields.forEach((f, i) => f.order = i);
                const rest = (_ktmFields || []).filter(x => x.entity !== fieldsActiveEntity);
                await saveCustomFields([...rest, ...fields]);
                renderFields();
            },
            async reorderField(targetId) {
                if (!_dragFieldId || _dragFieldId === targetId) return;
                const fields = getCustomFields(fieldsActiveEntity);
                const from = fields.findIndex(f => f.id === _dragFieldId);
                const to = fields.findIndex(f => f.id === targetId);
                if (from < 0 || to < 0) return;
                const [moved] = fields.splice(from, 1);
                fields.splice(to, 0, moved);
                fields.forEach((f, i) => f.order = i);
                const rest = (_ktmFields || []).filter(x => x.entity !== fieldsActiveEntity);
                _dragFieldId = null;
                await saveCustomFields([...rest, ...fields]);
                renderFields();
            },

            // Zusatzfeld-Werte eines Datensatzes bearbeiten
            async openCustomDataModal(entity, id) {
                await loadCustomization();
                const defs = getCustomFields(entity);
                if (defs.length === 0) {
                    showToast('Für diesen Bereich sind keine Zusatzfelder definiert. Lege sie unter Einstellungen → Felder & Kategorien an.', 'info');
                    return;
                }
                const rec = await db.get(entity, id);
                if (!rec) return;
                const cd = rec.customData || {};
                showModal(
                    'Zusatzfelder',
                    defs.map(f => `<div class="form-group"><label>${escapeHtml(f.label)}${f.required ? ' *' : ''}</label>${customFieldInput(f, cd[f.id])}</div>`).join(''),
                    async (overlay) => {
                        const res = collectCustomFieldValues(overlay, defs);
                        if (res.error) { showToast(res.error, 'error'); return; }
                        rec.customData = { ...(rec.customData || {}), ...res.data };
                        await db.put(entity, rec);
                        overlay.remove();
                        showToast('Zusatzfelder gespeichert.', 'success');
                        app.navigate(app.currentPage, app.currentProjectId);
                    }
                );
            },

            openFieldSettings() { app.navigate('fields'); },

            // ---------- Angebots-Flow ----------
            async createOfferFlow() {
                const projects = await db.getAll('projects');
                if (projects.length === 0) {
                    showToast('Bitte lege zuerst ein Projekt an.', 'info');
                    this.openProjectModal();
                    return;
                }
                showModal(
                    'Angebot erstellen',
                    `
                        <div class="form-group"><label>Für welches Projekt?</label>
                            <select id="ofpProject">
                                ${projects.map(p => `<option value="${escapeHtml(String(p.id))}">${escapeHtml(p.title || 'Unbenannt')}</option>`).join('')}
                            </select>
                        </div>
                    `,
                    async (overlay) => {
                        const pid = parseId(overlay.querySelector('#ofpProject').value);
                        overlay.remove();
                        this.createOffer(pid);
                    }
                );
            },

            // ============================================================
            // ============ PDF: ANGEBOT (Redesign) =======================
            // ============================================================
            async exportOfferPDF(offerId, share = false) {
                if (typeof window.jspdf === 'undefined') { showToast('PDF-Bibliothek konnte nicht geladen werden.', 'error'); return; }
                const offer = await db.get('offers', offerId);
                if (!offer) { showToast('Angebot nicht gefunden.', 'error'); return; }
                const project = offer.projectId ? await db.get('projects', offer.projectId) : null;
                const customer = offer.customerId ? await db.get('customers', offer.customerId) : null;
                const co = await pdfCompany();

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pw = doc.internal.pageSize.getWidth();
                const mx = 16;

                pdfWatermark(doc);
                let y = pdfHeader(doc, co, 'ANGEBOT', [
                    `Nr. ${offer.offerNumber || offer.id}  ·  ${formatDate(offer.offerDate || offer.createdAt)}`,
                    offer.validUntilEnabled && offer.validUntil ? `Gültig bis ${formatDate(offer.validUntil)}` : ''
                ].filter(Boolean));

                const custLines = [];
                if (customer) {
                    const nm = (typeof customerDisplayName === 'function') ? customerDisplayName(customer) : `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                    if (nm && nm !== '–') custLines.push(nm);
                    if (customer.company && (customer.firstName || customer.lastName)) custLines.push(customer.company);
                    if (customer.street) custLines.push(`${customer.street}${customer.houseNumber ? ' ' + customer.houseNumber : ''}`);
                    if (customer.zip || customer.city) custLines.push(`${customer.zip || ''} ${customer.city || ''}`.trim());
                    if (customer.phone) custLines.push(customer.phone);
                }
                if (custLines.length === 0) custLines.push('–');
                const projLines = [];
                if (project?.title) projLines.push(project.title);
                if (offer.siteAddress) projLines.push(`Baustelle: ${offer.siteAddress}`);
                if (offer.contactPerson) projLines.push(`Ansprechpartner: ${offer.contactPerson}`);
                if (offer.contactPhone) projLines.push(offer.contactPhone);
                if (offer.contactEmail) projLines.push(offer.contactEmail);
                if (projLines.length === 0) projLines.push('–');
                y = pdfInfoBoxes(doc, y, 'Kunde', custLines, 'Projekt / Baustelle', projLines);

                const rows = (offer.positions || []).map((p, i) => {
                    const disc = Number(p.discount) || 0;
                    const lineTotal = p.price * p.quantity * (1 - disc / 100);
                    return [
                        String(i + 1),
                        p.name || '',
                        (p.description || (p.manufacturer ? `${p.manufacturer}${p.articleNumber ? ' · ' + p.articleNumber : ''}` : '')) + (disc > 0 ? ` (−${disc}% Rabatt)` : ''),
                        String(p.quantity),
                        p.unit || 'Stk',
                        formatCurrency(p.price),
                        formatCurrency(lineTotal)
                    ];
                });

                doc.autoTable({
                    startY: y,
                    margin: { left: mx, right: mx, bottom: 26 },
                    head: [['Nr.', 'Artikel', 'Beschreibung', 'Menge', 'Einh.', 'Einzelpreis', 'Gesamt']],
                    body: rows,
                    ...PDF_TABLE_STYLES,
                    columnStyles: {
                        0: { cellWidth: 12, halign: 'center' },
                        3: { cellWidth: 15, halign: 'center' },
                        4: { cellWidth: 13, halign: 'center' },
                        5: { cellWidth: 25, halign: 'right' },
                        6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
                    },
                    willDrawPage: () => pdfWatermark(doc),
                    didDrawPage: () => pdfFooterOnce(doc, co)
                });

                let fy = doc.lastAutoTable.finalY + 8;
                fy = pdfNewPageIfNeeded(doc, fy, 45, co);

                const boxW = 80;
                const boxX = pw - mx - boxW;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9.2);
                doc.setTextColor(...PDF_INK);
                const _R = recomputeOffer(offer);
                const summaryRows = [];
                if (_R.posDiscount > 0.005) {
                    summaryRows.push(['Zwischensumme', formatCurrency(_R.gross)]);
                    summaryRows.push(['Positions-Rabatte', `- ${formatCurrency(_R.posDiscount)}`]);
                }
                summaryRows.push(['Nettobetrag', formatCurrency(_R.net)]);
                if (_R.discountEnabled && _R.globalDiscount > 0) {
                    summaryRows.push([`Rabatt (${(_R.rate * 100).toFixed(1).replace('.', ',')} %)`, `- ${formatCurrency(_R.globalDiscount)}`]);
                }
                if (offer.vatEnabled) {
                    summaryRows.push([`MwSt. (${(_R.vatRate * 100).toFixed(0)}%)`, formatCurrency(_R.vatAmount)]);
                }
                summaryRows.forEach(([label, val]) => {
                    doc.text(label, boxX, fy);
                    doc.text(val, pw - mx, fy, { align: 'right' });
                    fy += 5.8;
                });
                fy += 1.5;
                doc.setFillColor(...PDF_TEAL);
                doc.roundedRect(boxX, fy - 5.5, boxW, 12.5, 2.5, 2.5, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11.5);
                doc.setTextColor(255, 255, 255);
                doc.text('Gesamtbetrag', boxX + 4, fy + 2.3);
                doc.text(formatCurrency(_R.total), pw - mx - 4, fy + 2.3, { align: 'right' });
                fy += 15;

                // Vereinbarter Preis (telefonisch abweichend vom Angebot)
                const _agreed = (offer.agreedPrice != null && offer.agreedPrice !== '') ? Number(offer.agreedPrice) : null;
                if (_agreed != null && Math.abs(_agreed - _R.total) > 0.005) {
                    doc.setFillColor(232, 245, 243);
                    doc.roundedRect(boxX, fy - 5.5, boxW, 12.5, 2.5, 2.5, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(...PDF_TEAL);
                    doc.text('Vereinbarter Preis', boxX + 4, fy + 2.3);
                    doc.text(formatCurrency(_agreed), pw - mx - 4, fy + 2.3, { align: 'right' });
                    fy += 15;
                    doc.setTextColor(0, 0, 0);
                }

                // Zahlungshinweis + Zusatzfelder des Projekts
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8.5);
                doc.setTextColor(...PDF_GRAY);
                doc.text(co.paymentTerms, mx, fy, { maxWidth: pw - mx * 2 });
                fy += 9;

                const projDefs = getCustomFields('projects');
                const cd = project?.customData || {};
                const cdRows = projDefs
                    .map(f => {
                        const v = cd[f.id];
                        if (v === undefined || v === '' || v === null || (Array.isArray(v) && v.length === 0)) return null;
                        const disp = v === true ? 'Ja' : v === false ? 'Nein' : Array.isArray(v) ? v.join(', ') : String(v);
                        return [f.label, disp + (f.unit ? ' ' + f.unit : '')];
                    })
                    .filter(Boolean);
                if (cdRows.length) {
                    fy = pdfNewPageIfNeeded(doc, fy, 12 + cdRows.length * 7, co);
                    doc.autoTable({
                        startY: fy,
                        margin: { left: mx, right: mx, bottom: 26 },
                        head: [['Weitere Angaben', '']],
                        body: cdRows,
                        ...PDF_TABLE_STYLES,
                        willDrawPage: () => pdfWatermark(doc),
                    didDrawPage: () => pdfFooterOnce(doc, co)
                    });
                }

                pdfFooterOnce(doc, co);
                const offerFileName = `${offer.offerNumber || ('Angebot_' + offer.id)}_${customer?.lastName || 'Kunde'}.pdf`;
                if (share) {
                    await sharePdfDoc(doc, offerFileName, 'Angebot ' + (offer.offerNumber || ''));
                } else {
                    this._showPdfPreview(doc, offerFileName, 'Angebot ' + (offer.offerNumber || ''));
                }
            },

            // Zeigt ein PDF an. Am Handy zuverlässig über einen neuen Tab
            // (iframe-PDF-Vorschau funktioniert auf Android/iOS oft nicht),
            // am Desktop als eingebettete Vorschau.
            _showPdfPreview(doc, fileName, title) {
                let blob, url;
                try { blob = doc.output('blob'); url = URL.createObjectURL(blob); }
                catch (e) { try { doc.save(fileName); } catch (e2) {} return; }

                const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
                if (isMobile) {
                    // Am Handy zuverlässig über einen echten Öffnen-Link (window.open
                    // wird nach dem PDF-Erzeugen meist blockiert).
                    this._pdfLinkFallback(url, doc, fileName, title);
                    return;
                }

                // Desktop: eingebettete Vorschau
                const overlay = document.createElement('div');
                overlay.className = 'pdf-preview-overlay';
                overlay.innerHTML = `
                    <div class="pdf-preview">
                        <div class="pdf-preview-bar">
                            <span class="pdf-preview-title">${escapeHtml(title || 'Vorschau')}</span>
                            <div class="pdf-preview-actions">
                                <button class="btn btn-sm btn-outline" data-act="open">↗ In neuem Tab</button>
                                <button class="btn btn-sm btn-outline" data-act="download">${icon('pdf')} Speichern</button>
                                <button class="btn btn-sm btn-outline" data-act="share">📤 Teilen</button>
                                <button class="btn btn-sm btn-danger" data-act="close">✕</button>
                            </div>
                        </div>
                        <iframe class="pdf-preview-frame" src="${url}" title="PDF-Vorschau"></iframe>
                    </div>`;
                document.body.appendChild(overlay);
                const close = () => { overlay.remove(); setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 500); };
                overlay.querySelector('[data-act="close"]').addEventListener('click', close);
                overlay.querySelector('[data-act="open"]').addEventListener('click', () => window.open(url, '_blank'));
                overlay.querySelector('[data-act="download"]').addEventListener('click', () => doc.save(fileName));
                overlay.querySelector('[data-act="share"]').addEventListener('click', () => sharePdfDoc(doc, fileName, title));
                overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            },

            // Fallback, wenn window.open blockiert wird: klarer Knopf zum Öffnen.
            _pdfLinkFallback(url, doc, fileName, title) {
                const overlay = document.createElement('div');
                overlay.className = 'pdf-preview-overlay';
                overlay.innerHTML = `
                    <div class="pdf-link-box">
                        <div class="pdf-link-title">${escapeHtml(title || 'Angebot')}</div>
                        <a class="btn btn-primary" href="${url}" target="_blank" rel="noopener" data-act="open" style="width:100%;justify-content:center;">📄 Angebot öffnen</a>
                        <button class="btn btn-outline" data-act="download" style="width:100%;justify-content:center;">${icon('pdf')} Als Datei speichern</button>
                        <button class="btn btn-outline" data-act="share" style="width:100%;justify-content:center;">📤 Teilen (WhatsApp, E-Mail)</button>
                        <button class="btn btn-outline" data-act="close" style="width:100%;justify-content:center;">Schließen</button>
                    </div>`;
                document.body.appendChild(overlay);
                const close = () => { overlay.remove(); setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000); };
                overlay.querySelector('[data-act="download"]').addEventListener('click', () => doc.save(fileName));
                overlay.querySelector('[data-act="share"]').addEventListener('click', () => sharePdfDoc(doc, fileName, title));
                overlay.querySelector('[data-act="close"]').addEventListener('click', close);
                overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            },

            // ============================================================
            // ============ PDF: MATERIALBESTELLUNG mit Skizze ============
            // ============================================================
            async exportOrderPDF(orderId) {
                const order = await db.get('orders', orderId);
                if (!order) { showToast('Bestellung nicht gefunden.', 'error'); return; }
                // Vorab fragen, was auf die Liste soll
                showModal('Bestellliste – was soll drauf?', `
                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">Wähle, was auf der Materialliste erscheinen soll:</div>
                    <label class="ord-opt-row"><input type="checkbox" id="optCustomer"> Kundenname & Adresse</label>
                    <label class="ord-opt-row"><input type="checkbox" id="optProject"> Projektname</label>
                    <label class="ord-opt-row"><input type="checkbox" id="optSupplier" checked> Lieferant</label>
                    <label class="ord-opt-row"><input type="checkbox" id="optRooms" checked> Raum / Bereich (Spalte)</label>
                `, async (overlay) => {
                    const opts = {
                        customer: overlay.querySelector('#optCustomer').checked,
                        project: overlay.querySelector('#optProject').checked,
                        supplier: overlay.querySelector('#optSupplier').checked,
                        rooms: overlay.querySelector('#optRooms').checked
                    };
                    overlay.remove();
                    await this._buildOrderPDF(orderId, opts);
                }, { okText: 'Liste erstellen' });
            },

            async _buildOrderPDF(orderId, opts = {}) {
                if (typeof window.jspdf === 'undefined') { showToast('PDF-Bibliothek konnte nicht geladen werden.', 'error'); return; }
                const order = await db.get('orders', orderId);
                if (!order) { showToast('Bestellung nicht gefunden.', 'error'); return; }
                const project = order.projectId ? await db.get('projects', order.projectId) : null;
                const customer = project?.customerId ? await db.get('customers', project.customerId) : null;
                const rooms = project ? ((await db.getByIndex('rooms', 'projectId', project.id)) || []) : [];
                const pm = project ? ((await db.getByIndex('projectMaterials', 'projectId', project.id)) || []) : [];
                const materials = await db.getAll('materials');
                const co = await pdfCompany();

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pw = doc.internal.pageSize.getWidth();
                const mx = 16;

                pdfWatermark(doc);
                let y = pdfHeader(doc, co, 'MATERIALBESTELLUNG', [
                    `${formatDate(order.date || order.createdAt)}  ·  Status: ${order.status || 'Offen'}`
                ]);

                // Info-Boxen nur zeigen, wenn gewünscht
                const custLines = (opts.customer && customer) ? [
                    (typeof customerDisplayName === 'function') ? customerDisplayName(customer) : `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
                    opts.customer && customer.company ? customer.company : '',
                    [customer.street, customer.city].filter(Boolean).join(', '),
                    customer.phone || ''
                ].filter(Boolean) : null;
                const infoLines = [
                    opts.project ? (project ? `Projekt: ${project.title || ''}` : 'Ohne Projekt') : '',
                    opts.supplier ? `Lieferant: ${order.supplier || '–'}` : '',
                    order.notes ? `Notiz: ${order.notes}` : ''
                ].filter(Boolean);
                if (custLines || infoLines.length) {
                    y = pdfInfoBoxes(doc, y, custLines ? 'Kunde' : '', custLines || [''], infoLines.length ? 'Bestellung' : '', infoLines.length ? infoLines : ['']);
                }

                // WICHTIG: die tatsächlich bestellten Artikel (deine Auswahl) nutzen,
                // nicht automatisch alle Projekt-Materialien.
                const orderedLines = String(order.items || '').split('\n').map(l => l.trim()).filter(Boolean);
                let head, body;
                if (orderedLines.length > 0) {
                    if (opts.rooms) {
                        head = [['Nr.', 'Artikel', 'Raum / Bereich']];
                        body = orderedLines.map((l, i) => {
                            // Raum aus [ ... ] am Ende herauslösen
                            const m = l.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
                            return m ? [String(i + 1), m[1].trim(), m[2].trim()] : [String(i + 1), l, ''];
                        });
                    } else {
                        head = [['Nr.', 'Artikel']];
                        body = orderedLines.map((l, i) => [String(i + 1), l.replace(/\s*\[[^\]]+\]\s*$/, '').trim()]);
                    }
                } else if (pm.length > 0) {
                    head = [['Nr.', 'Material', 'Größe', 'Menge', 'Einheit', 'Raum / Bereich', 'Bemerkung']];
                    body = pm.map((x, i) => {
                        const mat = materials.find(m => String(m.id) === String(x.materialId));
                        const room = rooms.find(r => String(r.id) === String(x.roomId));
                        return [String(i + 1), mat?.name || x.name || 'Material', x.size || mat?.size || '–', String(x.quantity ?? ''), x.unit || mat?.unit || 'Stk', room?.name || 'Gesamt', x.note || ''];
                    });
                } else {
                    head = [['Nr.', 'Artikel']];
                    body = [];
                }

                doc.autoTable({
                    startY: y,
                    margin: { left: mx, right: mx, bottom: 26 },
                    head, body,
                    ...PDF_TABLE_STYLES,
                    columnStyles: (head[0].length > 3) ? {
                        0: { cellWidth: 9, halign: 'center' },
                        3: { cellWidth: 15, halign: 'center' },
                        4: { cellWidth: 16, halign: 'center' }
                    } : { 0: { cellWidth: 10, halign: 'center' } },
                    willDrawPage: () => pdfWatermark(doc),
                    didDrawPage: () => pdfFooterOnce(doc, co)
                });

                let fy = doc.lastAutoTable.finalY + 10;

                // Aufstellungsplan / Projektskizze nur, wenn Räume gewünscht sind
                if (opts.rooms && rooms.length > 0) {
                    fy = pdfNewPageIfNeeded(doc, fy, 70, co);
                    fy = pdfRoomSketch(doc, rooms, mx, fy, pw - mx * 2);
                }

                pdfFooterOnce(doc, co);
                doc.save(`Bestellung_${(order.supplier || 'Lieferant').replace(/\s+/g, '_')}_${(order.date || '').replaceAll('-', '')}.pdf`);
                showToast('Bestellung als PDF exportiert.', 'success');
            },

            // ============================================================
            // ============ PDF: PROJEKTÜBERSICHT =========================
            // ============================================================
            async exportProjectOverviewPDF(projectId) {
                if (typeof window.jspdf === 'undefined') { showToast('PDF-Bibliothek konnte nicht geladen werden.', 'error'); return; }
                const project = await db.get('projects', projectId);
                if (!project) return;
                const customer = project.customerId ? await db.get('customers', project.customerId) : null;
                const rooms = (await db.getByIndex('rooms', 'projectId', projectId)) || [];
                const pm = (await db.getByIndex('projectMaterials', 'projectId', projectId)) || [];
                const images = (await db.getByIndex('images', 'projectId', projectId)) || [];
                const materials = await db.getAll('materials');
                const cooling = calculateCoolingCapacity(rooms);
                const s = project.survey || {};
                const co = await pdfCompany();

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pw = doc.internal.pageSize.getWidth();
                const ph = doc.internal.pageSize.getHeight();
                const mx = 16;

                const sectionTitle = (y, txt) => {
                    doc.setFillColor(...PDF_TEAL);
                    doc.roundedRect(mx, y, pw - mx * 2, 8.5, 1.8, 1.8, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(255, 255, 255);
                    doc.text(txt, mx + 4, y + 5.8);
                    return y + 12.5;
                };

                // ===================== DECKBLATT =====================
                pdfWatermark(doc);
                // Logo / Firmenname oben links, sauber ausgerichtet
                let topY = 22;
                if (co.logo) {
                    try {
                        const p = doc.getImageProperties(co.logo);
                        const h = 16, w = (p.width / p.height) * h;
                        doc.addImage(co.logo, p.fileType || 'PNG', mx, topY - 8, w, h);
                    } catch (e) { /* optional */ }
                } else if (co.name) {
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...PDF_INK);
                    doc.text(co.name, mx, topY);
                }
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...PDF_GRAY);
                [co.address, [co.phone, co.email].filter(Boolean).join('  ·  ')].filter(Boolean).forEach((l, i) => {
                    doc.text(l, pw - mx, 16 + i * 4.2, { align: 'right' });
                });

                // Titelblock mittig
                doc.setDrawColor(...PDF_TEAL); doc.setLineWidth(1);
                doc.line(mx, 66, pw - mx, 66);
                doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(...PDF_TEAL);
                doc.text('PROJEKTÜBERSICHT', mx, 80);
                doc.setFontSize(15); doc.setTextColor(...PDF_INK);
                doc.text(String(project.title || 'Projekt'), mx, 91, { maxWidth: pw - mx * 2 });
                doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...PDF_GRAY);
                doc.text(`Technische Dokumentation  ·  ${formatDate(new Date().toISOString())}  ·  Status: ${project.status || 'Neu'}`, mx, 100);
                doc.setDrawColor(...PDF_TEAL); doc.setLineWidth(0.4);
                doc.line(mx, 106, pw - mx, 106);

                // Eckdaten-Boxen
                let y = 116;
                const custLines = customer ? [
                    `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
                    customer.company || '',
                    [customer.street, customer.city].filter(Boolean).join(', '),
                    [customer.phone, customer.email].filter(Boolean).join('  ·  ')
                ].filter(Boolean) : ['–'];
                const totalMeters = pm.filter(x => (x.unit || '') === 'm').reduce((sum, x) => sum + (Number(x.quantity) || 0), 0);
                const totalCost = pm.reduce((sum, x) => {
                    const mat = materials.find(m => String(m.id) === String(x.materialId));
                    const price = x.price !== undefined && x.price !== null ? Number(x.price) : matUnitPrice(mat, x.unit || mat?.unit || 'Stk');
                    return sum + (Number(x.quantity) || 0) * price;
                }, 0);
                const keyLines = [
                    `Räume: ${rooms.length}   ·   Materialpositionen: ${pm.length}`,
                    cooling.details.length ? `Gesamtleistung (empf.): ${cooling.recommendation} kW  (Last ${cooling.totalKW} kW)` : '',
                    totalMeters > 0 ? `Gesamtlänge Leitungen/Kanäle: ${Math.round(totalMeters * 10) / 10} m` : '',
                    totalCost > 0 ? `Materialwert: ${formatCurrency(totalCost)}` : ''
                ].filter(Boolean);
                y = pdfInfoBoxes(doc, y, 'Kunde', custLines, 'Kennzahlen', keyLines);
                if (project.siteAddress) {
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...PDF_INK);
                    doc.text(`Baustelle: ${project.siteAddress}`, mx, y); y += 6;
                }
                // Deckblatt-Flocke unten dezent + Fußband
                doc.setFillColor(...PDF_TEAL);
                doc.rect(0, ph - 14, pw, 14, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
                doc.text((co.name || 'Kältetechnik Manager') + '  ·  Kälte- & Klimatechnik', mx, ph - 5.5);

                // ===================== INHALTSSEITEN =====================
                doc.addPage();
                pdfWatermark(doc);
                y = 18;

                // Räume
                if (rooms.length) {
                    y = sectionTitle(y, 'RAUMÜBERSICHT & KÄLTELEISTUNG');
                    doc.autoTable({
                        startY: y,
                        margin: { left: mx, right: mx, bottom: 26 },
                        head: [['Raum', 'L (m)', 'B (m)', 'H (m)', 'Fläche (m²)', 'Volumen (m³)', 'Empf. kW']],
                        body: rooms.map(r => {
                            const area = (r.length || 0) * (r.width || 0);
                            return [r.name || 'Raum', String(r.length || 0), String(r.width || 0), String(r.height || 2.5), area.toFixed(1), (area * (r.height || 2.5)).toFixed(1), ((area * 80) / 1000).toFixed(1)];
                        }),
                        foot: cooling.details.length ? [['Gesamt', '', '', '', '', '', `${cooling.recommendation} kW`]] : undefined,
                        footStyles: { fillColor: PDF_LIGHT, textColor: PDF_TEAL, fontStyle: 'bold' },
                        ...PDF_TABLE_STYLES,
                        willDrawPage: () => pdfWatermark(doc),
                        didDrawPage: () => pdfFooterOnce(doc, co)
                    });
                    y = doc.lastAutoTable.finalY + 9;
                }

                // Technische Daten je Raum (der Raum ist die technische Einheit)
                for (const r of rooms) {
                    const t = r.tech || {};
                    const rows = ROOM_TECH_FIELDS
                        .map(f => {
                            const v = t[f.key];
                            if (v === '' || v === null || v === undefined || v === false || v === 0) return null;
                            return [f.label, (v === true ? 'Ja' : String(v)) + (f.unit && v !== true ? ' ' + f.unit : '')];
                        })
                        .filter(Boolean);
                    if (!rows.length) continue;
                    y = pdfNewPageIfNeeded(doc, y, 26, co);
                    y = sectionTitle(y, `RAUM: ${String(r.name || 'RAUM').toUpperCase()}  ·  ${r.length}×${r.width}×${r.height || 2.5} m`);
                    doc.autoTable({
                        startY: y,
                        margin: { left: mx, right: mx, bottom: 26 },
                        body: rows,
                        ...PDF_TABLE_STYLES,
                        columnStyles: { 0: { cellWidth: 62, fontStyle: 'bold', textColor: PDF_TEAL } },
                        willDrawPage: () => pdfWatermark(doc),
                        didDrawPage: () => pdfFooterOnce(doc, co)
                    });
                    y = doc.lastAutoTable.finalY + 7;
                }

                // Besichtigung (allgemeine Projektdaten)
                const svRows = SURVEY_FIELDS
                    .map(f => {
                        const v = s[f.key];
                        if (v === '' || v === null || v === undefined || v === false || v === 0) return null;
                        return [f.label, (v === true ? 'Ja' : String(v)) + (f.unit && v !== true ? ' ' + f.unit : '')];
                    })
                    .filter(Boolean);
                if (svRows.length) {
                    y = pdfNewPageIfNeeded(doc, y, 24, co);
                    y = sectionTitle(y, 'BESICHTIGUNG – ALLGEMEIN');
                    doc.autoTable({
                        startY: y,
                        margin: { left: mx, right: mx, bottom: 26 },
                        body: svRows,
                        ...PDF_TABLE_STYLES,
                        columnStyles: { 0: { cellWidth: 62, fontStyle: 'bold', textColor: PDF_TEAL } },
                        willDrawPage: () => pdfWatermark(doc),
                        didDrawPage: () => pdfFooterOnce(doc, co)
                    });
                    y = doc.lastAutoTable.finalY + 9;
                }

                // Material inkl. Preise + Summe
                if (pm.length) {
                    y = pdfNewPageIfNeeded(doc, y, 24, co);
                    y = sectionTitle(y, 'MATERIALLISTE');
                    doc.autoTable({
                        startY: y,
                        margin: { left: mx, right: mx, bottom: 26 },
                        head: [['Material', 'Größe', 'Menge', 'Einh.', 'Raum', 'Preis', 'Gesamt']],
                        body: pm.map(x => {
                            const mat = materials.find(m => String(m.id) === String(x.materialId));
                            const room = rooms.find(r => String(r.id) === String(x.roomId));
                            const price = x.price !== undefined && x.price !== null ? Number(x.price) : matUnitPrice(mat, x.unit || mat?.unit || 'Stk');
                            return [mat?.name || x.name || 'Material', x.size || mat?.size || '–', String(x.quantity ?? ''), x.unit || 'Stk', room?.name || 'Gesamt', formatCurrency(price), formatCurrency((Number(x.quantity) || 0) * price)];
                        }),
                        foot: [['Gesamtsumme', '', '', '', '', '', formatCurrency(totalCost)]],
                        footStyles: { fillColor: PDF_TEAL, textColor: 255, fontStyle: 'bold' },
                        ...PDF_TABLE_STYLES,
                        columnStyles: { 2: { halign: 'center', cellWidth: 14 }, 3: { halign: 'center', cellWidth: 13 }, 5: { halign: 'right', cellWidth: 21 }, 6: { halign: 'right', cellWidth: 23, fontStyle: 'bold' } },
                        willDrawPage: () => pdfWatermark(doc),
                        didDrawPage: () => pdfFooterOnce(doc, co)
                    });
                    y = doc.lastAutoTable.finalY + 9;
                }

                // Zusatzfelder
                const projDefs = getCustomFields('projects');
                const cd = project.customData || {};
                const cdRows = projDefs
                    .map(f => {
                        const v = cd[f.id];
                        if (v === undefined || v === '' || v === null || (Array.isArray(v) && v.length === 0)) return null;
                        const disp = v === true ? 'Ja' : v === false ? 'Nein' : Array.isArray(v) ? v.join(', ') : String(v);
                        return [f.label, disp + (f.unit ? ' ' + f.unit : '')];
                    })
                    .filter(Boolean);
                if (cdRows.length) {
                    y = pdfNewPageIfNeeded(doc, y, 24, co);
                    y = sectionTitle(y, 'ZUSATZFELDER');
                    doc.autoTable({
                        startY: y,
                        margin: { left: mx, right: mx, bottom: 26 },
                        body: cdRows,
                        ...PDF_TABLE_STYLES,
                        columnStyles: { 0: { cellWidth: 62, fontStyle: 'bold', textColor: PDF_TEAL } },
                        willDrawPage: () => pdfWatermark(doc),
                        didDrawPage: () => pdfFooterOnce(doc, co)
                    });
                    y = doc.lastAutoTable.finalY + 9;
                }

                // Grundriss / Aufstellungsplan
                if (rooms.length) {
                    y = pdfNewPageIfNeeded(doc, y, 95, co);
                    const hasPlan = project.plan && Array.isArray(project.plan.items) && project.plan.items.length > 0;
                    y = sectionTitle(y, hasPlan ? 'GRUNDRISS / PLANUNG' : 'AUFSTELLUNGSPLAN (SCHEMATISCH)');
                    if (hasPlan) y = pdfPlanDrawing(doc, project.plan, rooms, mx, y, pw - mx * 2);
                    else y = pdfRoomSketch(doc, rooms, mx, y, pw - mx * 2, '');
                }

                // Bilder (max. 6, 2 pro Zeile)
                if (images.length) {
                    y = pdfNewPageIfNeeded(doc, y, 70, co);
                    y = sectionTitle(y, 'PROJEKTBILDER');
                    const imgW = (pw - mx * 2 - 6) / 2;
                    let col = 0;
                    for (const img of images.slice(0, 6)) {
                        try {
                            const p = doc.getImageProperties(img.data);
                            const h = Math.min((p.height / p.width) * imgW, 70);
                            y = pdfNewPageIfNeeded(doc, y, h + 10, co);
                            const x = mx + col * (imgW + 6);
                            doc.addImage(img.data, p.fileType || 'JPEG', x, y, imgW, h);
                            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...PDF_GRAY);
                            doc.text(`${img.category || 'Bild'}${img.label ? ' – ' + img.label : ''}`, x, y + h + 4);
                            col = 1 - col;
                            if (col === 0) y += h + 9;
                            else if (img === images.slice(0, 6)[images.slice(0, 6).length - 1]) y += h + 9;
                        } catch (e) { /* Bild überspringen */ }
                    }
                }

                pdfFooterOnce(doc, co);
                doc.save(`Projektuebersicht_${(project.title || 'Projekt').replace(/[^\wäöüÄÖÜß-]+/g, '_')}.pdf`);
                showToast('Projektübersicht als PDF exportiert.', 'success');
            }
        });

        const app = {
            currentPage: 'dashboard',
            currentProjectId: null,

            async init() {
                try {
                    await db.init();
                } catch (dbErr) {
                    // DB-Start fehlgeschlagen (z. B. blockiert/Zeitüberschreitung).
                    // App trotzdem starten - lieber eingeschränkt als gar nicht.
                    console.error('Datenbank-Start fehlgeschlagen, starte im Notbetrieb:', dbErr);
                    showToast('Datenbank konnte nicht vollständig geladen werden. Bitte App neu starten, falls Daten fehlen.', 'error');
                }

                try { this.setupNavigation(); } catch (e) { console.warn(e); }
                try { this.setupSearch(); } catch (e) { console.warn(e); }
                try { this.setupTheme(); } catch (e) { console.warn(e); }
                // QR-Code einer Anlage gescannt? -> direkt öffnen
                // Splash SOFORT ausblenden - egal was danach kommt, der Nutzer
                // sieht die App und bleibt nicht im Ladebildschirm hängen.
                this.hideSplash();

                try { this.setupResponsive(); } catch (e) { console.warn(e); }

                const anlageId = new URLSearchParams(window.location.search).get('anlage');
                try {
                    if (anlageId) {
                        this.navigate('equipment');
                        setTimeout(() => this.openEquipment(anlageId), 200);
                    } else {
                        this.navigate('dashboard');
                    }
                } catch (navErr) {
                    console.error('Seitenaufbau fehlgeschlagen:', navErr);
                }

                try { await repairLegacyIds(); } catch (e) { console.warn('ID-Reparatur fehlgeschlagen:', e); }
                try { await loadCustomization(); } catch (e) { console.warn('Anpassungen konnten nicht geladen werden:', e); }
                try {
                    const mats = await db.getAll('materials');
                    for (const m of mats) {
                        let changed = false;
                        if (!m.series && m.notes) {
                            const sm = String(m.notes).match(/Serie ([^·]+)/);
                            if (sm) { m.series = sm[1].trim(); changed = true; }
                        }
                        if (!(Number(m.bundleLength) > 0)) {
                            const bm = `${m.notes || ''} ${m.name || ''}`.match(/(\d+(?:[.,]\d+)?)\s*m\s*Bund/i);
                            if (bm) { m.bundleLength = parseFloat(bm[1].replace(',', '.')); changed = true; }
                        }
                        if (changed) await db.put('materials', m);
                    }
                } catch (e) { /* Migration optional */ }
                try {
                    for (const o of await db.getAll('offers')) {
                        if (typeof o.discountRate === 'number' && o.discountRate > 1) {
                            o.discountRate = Math.min(1, o.discountRate / 100);
                            await db.put('offers', o);
                        }
                    }
                } catch (e) { /* Reparatur optional */ }
                try { await loadLearned(); if (typeof KTM_LOGO_DEFAULT !== 'undefined') { const curLogo = await getSetting('companyLogo', ''); if (!curLogo || (typeof KTM_LOGO_OLD_PREFIX !== 'undefined' && curLogo.startsWith(KTM_LOGO_OLD_PREFIX))) { await setSetting('companyLogo', KTM_LOGO_DEFAULT); } } } catch (e) { /* optional */ }

                if (navigator.onLine) {
                    initialFullSync().then(initRealtime);
                } else {
                    updateSyncStatus('offline', '🔴 Offline');
                }
            },

            hideSplash() {
                const splash = document.getElementById('splash');
                if (splash) splash.style.display = 'none';
            },

            showSplashError(message) {
                const splash = document.getElementById('splash');
                const status = document.getElementById('splashStatus');
                if (!splash) return;
                splash.style.display = 'flex';
                if (status) status.textContent = 'Fehler beim Start';
                if (!splash.querySelector('.splash-error')) {
                    const errEl = document.createElement('div');
                    errEl.className = 'splash-error';
                    errEl.textContent = message;
                    splash.appendChild(errEl);
                    const retryBtn = document.createElement('button');
                    retryBtn.className = 'splash-retry';
                    retryBtn.textContent = 'Erneut versuchen';
                    retryBtn.onclick = () => window.location.reload();
                    splash.appendChild(retryBtn);
                }
            },

            setupNavigation() {
                document.querySelectorAll('.nav-item[data-page]').forEach(item => {
                    item.addEventListener('click', (e) => {
                        const page = item.dataset.page;
                        this.navigate(page);
                    });
                });

                // Menü-Gruppen auf-/zuklappen
                document.querySelectorAll('.nav-group-head').forEach(head => {
                    head.addEventListener('click', () => {
                        head.closest('.nav-group')?.classList.toggle('open');
                    });
                });

                document.getElementById('syncBtn').addEventListener('click', async () => {
                    if (!navigator.onLine) {
                        showToast('Keine Internetverbindung.', 'error');
                        return;
                    }
                    if (!supabaseAvailable) {
                        showToast('Supabase ist nicht verbunden.', 'error');
                        return;
                    }
                    showToast('Synchronisiere...', 'info');
                    await initialFullSync();
                    showToast('Synchronisierung abgeschlossen.', 'success');
                });
            },

            toggleSidebar(force) {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                if (!sidebar) return;
                const open = force === undefined ? !sidebar.classList.contains('open') : !!force;
                sidebar.classList.toggle('open', open);
                overlay?.classList.toggle('show', open);
            },

            navigate(page, param = null) {
                this.currentPage = page;
                this.currentProjectId = param;

                document.querySelectorAll('.nav-item[data-page]').forEach(item => {
                    item.classList.remove('active');
                    if (item.dataset.page === page) {
                        item.classList.add('active');
                        // Falls die aktive Seite in einer Gruppe liegt, Gruppe aufklappen
                        const grp = item.closest('.nav-group');
                        if (grp) grp.classList.add('open');
                    }
                });

                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('sidebarOverlay')?.classList.remove('show');
                setPageTitle(page);
                updateBottomNav(page);

                // Kurzer Lade-Platzhalter (Skeleton), damit keine leere Fläche blinkt
                const skeletonKind = { dashboard: 'cards', customers: 'list', projects: 'list', materials: 'list', offers: 'list', invoices: 'list', orders: 'list', equipment: 'cards', maintenance: 'list' }[page];
                if (skeletonKind && typeof showLoadingSkeleton === 'function') showLoadingSkeleton(skeletonKind);

                switch (page) {
                    case 'dashboard': renderDashboard(); break;
                    case 'calc': renderCalc(); break;
                    case 'customers': renderCustomers(); break;
                    case 'projects': renderProjects(param); break;
                    case 'calendar': renderCalendar(param); break;
                    case 'materials': renderMaterials(); break;
                    case 'offers': renderOffers(); break;
                    case 'orders': renderOrders(); break;
                    case 'equipment': renderEquipment(this.currentProjectId); break;
                    case 'maintenance': renderMaintenance(); break;
                    case 'katalog': this.renderKatalog(param); break;
                    case 'invoices': renderInvoices(); break;
                    case 'fields': renderFields(); break;
                    case 'settings': renderSettings(); break;
                    case 'backup': renderBackup(); break;
                    default: renderDashboard();
                }
            },

            setupSearch() {
                const searchInput = document.getElementById('globalSearch');
                searchInput.addEventListener('input', async (e) => {
                    const query = e.target.value.toLowerCase().trim();
                    if (query.length < 2 && query.length > 0) return;
                    if (query.length === 0) {
                        this.navigate(this.currentPage, this.currentProjectId);
                        return;
                    }

                    const customers = await db.getAll('customers');
                    const projects = await db.getAll('projects');
                    const materials = await db.getAll('materials');
                    const equipment = await db.getAll('equipment');
                    const offers = await db.getAll('offers');
                    const invoices = await db.getAll('invoices');

                    const results = [
                        ...customers.filter(c =>
                            (c.firstName + ' ' + c.lastName).toLowerCase().includes(query) ||
                            (c.phone || '').includes(query) ||
                            (c.city || '').toLowerCase().includes(query) ||
                            (c.street || '').toLowerCase().includes(query)
                        ).map(c => ({ type: 'Kunde', title: `${c.firstName} ${c.lastName}`, id: c.id, link: 'customers' })),
                        ...projects.filter(p =>
                            (p.title || '').toLowerCase().includes(query) ||
                            (p.status || '').toLowerCase().includes(query)
                        ).map(p => ({ type: 'Projekt', title: p.title, id: p.id, link: 'projects' })),
                        ...equipment.filter(e =>
                            `${e.manufacturer || ''} ${e.model || ''} ${e.serialNumber || ''} ${e.location || ''} ${e.refrigerant || ''}`.toLowerCase().includes(query)
                        ).map(e => ({ type: 'Anlage', title: `${e.manufacturer || ''} ${e.model || 'Anlage'}`.trim() + (e.serialNumber ? ' · SN ' + e.serialNumber : ''), id: e.id, link: 'equipment' })),
                        ...offers.filter(o =>
                            `${o.offerNumber || ''} ${o.title || ''} ${o.status || ''}`.toLowerCase().includes(query)
                        ).map(o => ({ type: 'Angebot', title: `${o.offerNumber || 'Angebot'}${o.title ? ' · ' + o.title : ''}`, id: o.id, link: 'offers' })),
                        ...invoices.filter(inv =>
                            `${inv.invoiceNumber || ''} ${inv.status || ''}`.toLowerCase().includes(query)
                        ).map(inv => ({ type: 'Rechnung', title: `${inv.invoiceNumber || 'Rechnung'}`, id: inv.id, link: 'invoices' })),
                        ...materials.filter(m =>
                            `${m.name || ''} ${m.manufacturer || ''} ${m.series || ''} ${m.articleNumber || ''}`.toLowerCase().includes(query)
                        ).map(m => ({ type: 'Material', title: m.name, id: m.id, link: 'materials' })),
                    ];

                    contentArea.innerHTML = `
                        <h1 class="page-title">Suchergebnisse für "${escapeHtml(query)}"</h1>
                        <div class="table-container">
                            <table>
                                <thead><tr><th>Typ</th><th>Name</th><th>Aktion</th></tr></thead>
                                <tbody>
                                    ${results.length > 0 ? results.map(r => `
                                        <tr>
                                            <td><span class="status-badge ${r.type === 'Kunde' ? 'status-neu' : r.type === 'Projekt' ? 'status-aktiv' : r.type === 'Anlage' ? 'status-offen' : r.type === 'Rechnung' ? 'status-bezahlt' : 'status-offen'}">${r.type}</span></td>
                                            <td><strong>${escapeHtml(r.title)}</strong></td>
                                            <td><button class="btn btn-sm btn-primary" onclick="app.navigate('${r.link}', ${idJS(r.id)})">Öffnen</button></td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">Keine Ergebnisse</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    `;
                });
            },

            setupTheme() {
                const toggle = document.getElementById('themeToggle');
                let saved = 'light';
                try { saved = localStorage.getItem('klima-theme') || 'light'; } catch (e) { /* Privater Modus o.ä. */ }
                document.body.dataset.theme = saved;
                toggle.innerHTML = saved === 'dark' ? '<span class="nav-icon">' + icon('sun') + '</span> Light Mode' : '<span class="nav-icon">' + icon('moon') + '</span> Dark Mode';

                toggle.addEventListener('click', () => {
                    const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
                    document.body.dataset.theme = newTheme;
                    try { localStorage.setItem('klima-theme', newTheme); } catch (e) { /* ignorieren */ }
                    toggle.innerHTML = newTheme === 'dark' ? '<span class="nav-icon">' + icon('sun') + '</span> Light Mode' : '<span class="nav-icon">' + icon('moon') + '</span> Dark Mode';
                });
            },

            setupResponsive() {
                const menuToggle = document.getElementById('menuToggle');
                const sidebar = document.getElementById('sidebar');
                const checkWidth = () => {
                    if (window.innerWidth <= 1024) {
                        menuToggle.style.display = 'flex';
                    } else {
                        menuToggle.style.display = 'none';
                        sidebar.classList.remove('open');
                    }
                };
                checkWidth();
                window.addEventListener('resize', checkWidth);
                menuToggle.addEventListener('click', () => {
                    const open = sidebar.classList.toggle('open');
                    document.getElementById('sidebarOverlay').classList.toggle('show', open);
                });
                document.getElementById('sidebarOverlay').addEventListener('click', () => {
                    sidebar.classList.remove('open');
                    document.getElementById('sidebarOverlay').classList.remove('show');
                });
                document.addEventListener('click', (e) => {
                    const bottomMenu = document.getElementById('bottomNavMenu');
                    if (window.innerWidth <= 1024 && !sidebar.contains(e.target) && e.target !== menuToggle && !menuToggle.contains(e.target) && !(bottomMenu && (e.target === bottomMenu || bottomMenu.contains(e.target)))) {
                        sidebar.classList.remove('open');
                        document.getElementById('sidebarOverlay').classList.remove('show');
                    }
                });
            },

            // ===== ANLAGEN =====
            async openEquipment(id = null, presetCustomerId = null) {
                const e = id ? await db.get('equipment', id) : null;
                const customers = await db.getAll('customers');
                const F = window.KTM_FGAS;
                const selCust = e ? e.customerId : presetCustomerId;
                const custOpts = customers.map(c => `<option value="${c.id}" ${String(selCust) === String(c.id) ? 'selected' : ''}>${escapeHtml((c.firstName || '') + ' ' + (c.lastName || ''))}</option>`).join('');
                const refOpts = (F ? F.REFRIGERANTS : []).map(r => `<option value="${r}" ${e && e.refrigerant === r ? 'selected' : ''}>${r} (GWP ${F.GWP[r]})</option>`).join('');

                const body = `
                    <div class="form-row">
                        <div class="form-group"><label>Hersteller</label><input type="text" id="eqManu" value="${escapeHtml(e?.manufacturer || '')}" placeholder="z. B. Daikin"></div>
                        <div class="form-group"><label>Modell</label><input type="text" id="eqModel" value="${escapeHtml(e?.model || '')}" placeholder="z. B. FTXM35R"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Seriennummer</label><input type="text" id="eqSerial" value="${escapeHtml(e?.serialNumber || '')}"></div>
                        <div class="form-group"><label>Baujahr</label><input type="number" id="eqYear" value="${escapeHtml(e?.year || '')}" placeholder="2024"></div>
                    </div>
                    <div class="form-group"><label>Kunde</label><select id="eqCust"><option value="">– kein Kunde –</option>${custOpts}</select></div>
                    <div class="form-group"><label>Standort / Aufstellort</label><input type="text" id="eqLoc" value="${escapeHtml(e?.location || '')}" placeholder="z. B. Serverraum EG"></div>
                    <div class="form-row">
                        <div class="form-group"><label>Kältemittel</label><select id="eqRef" onchange="app._eqUpdateFgas()"><option value="">–</option>${refOpts}</select></div>
                        <div class="form-group"><label>Füllmenge (kg)</label><input type="number" step="0.01" id="eqFill" value="${escapeHtml(e?.fillKg || '')}" oninput="app._eqUpdateFgas()"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Leistung (kW)</label><input type="number" step="0.1" id="eqPower" value="${escapeHtml(e?.power || '')}"></div>
                        <div class="form-group"><label>Letzte Dichtheitsprüfung</label><input type="date" id="eqLeak" value="${escapeHtml(e?.lastLeakCheck || '')}"></div>
                    </div>
                    <div id="eqFgasInfo" class="eq-fgas-info"></div>
                    <div class="form-group"><label>Garantie bis</label><input type="date" id="eqWarranty" value="${escapeHtml(e?.warrantyUntil || '')}"></div>
                    <div class="form-group"><label>Notizen</label><textarea id="eqNotes" rows="2">${escapeHtml(e?.notes || '')}</textarea></div>
                    ${id ? `<div class="form-group"><button type="button" class="btn btn-outline" style="width:100%;" onclick="app.openRefrigerantLog('${id}')">🧊 Kältemittelbuch öffnen</button></div>` : ''}
                    ${id ? `<div class="form-group"><label>Anlagen-QR-Code</label><div id="eqQr" class="eq-qr"></div><div style="font-size:12px;color:var(--text-muted);">Scannen öffnet diese Anlagenakte.</div></div>` : ''}
                `;

                const modal = showModal(id ? 'Anlage bearbeiten' : 'Neue Anlage', body, async (overlay) => {
                    const data = {
                        manufacturer: document.getElementById('eqManu').value.trim(),
                        model: document.getElementById('eqModel').value.trim(),
                        serialNumber: document.getElementById('eqSerial').value.trim(),
                        year: document.getElementById('eqYear').value.trim(),
                        customerId: document.getElementById('eqCust').value || null,
                        location: document.getElementById('eqLoc').value.trim(),
                        refrigerant: document.getElementById('eqRef').value || null,
                        fillKg: parseFloat(document.getElementById('eqFill').value) || null,
                        power: parseFloat(document.getElementById('eqPower').value) || null,
                        lastLeakCheck: document.getElementById('eqLeak').value || null,
                        warrantyUntil: document.getElementById('eqWarranty').value || null,
                        notes: document.getElementById('eqNotes').value.trim()
                    };
                    if (!data.manufacturer && !data.model) { showToast('Bitte Hersteller oder Modell angeben.', 'error'); return; }
                    if (id) { data.id = id; data.createdAt = e.createdAt; await db.put('equipment', data); }
                    else await db.add('equipment', data);
                    overlay.remove();
                    showToast('Anlage gespeichert.', 'success');
                    this.navigate('equipment');
                }, 'Speichern');

                setTimeout(() => { this._eqUpdateFgas(); if (id) this._eqRenderQr(id); }, 30);
            },

            _eqUpdateFgas() {
                const F = window.KTM_FGAS; if (!F) return;
                const ref = document.getElementById('eqRef')?.value;
                const fill = parseFloat(document.getElementById('eqFill')?.value) || 0;
                const box = document.getElementById('eqFgasInfo');
                if (!box) return;
                if (!ref || !fill) { box.innerHTML = ''; return; }
                const t = F.co2eq(ref, fill);
                const gwp = F.GWP[ref] || 0;
                const pflicht = t >= 5;
                box.innerHTML = `
                    <div class="fgas-line"><span>GWP ${ref}</span><strong>${gwp}</strong></div>
                    <div class="fgas-line"><span>CO₂-Äquivalent</span><strong>${t.toFixed(2)} t</strong></div>
                    <div class="fgas-line"><span>Dichtheitsprüfung</span><strong>${F.intervalLabel(t)}</strong></div>
                    ${pflicht ? '<div class="fgas-note">Diese Anlage ist nach F-Gase-VO prüf- und dokumentationspflichtig.</div>' : '<div class="fgas-note ok">Keine gesetzliche Prüfpflicht (unter 5 t CO₂e).</div>'}
                `;
            },

            _eqRenderQr(id) {
                const box = document.getElementById('eqQr');
                if (!box || typeof qrcode === 'undefined') return;
                try {
                    const url = window.location.origin + '/?anlage=' + id;
                    const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
                    box.innerHTML = qr.createImgTag(4, 8);
                } catch (e) { box.textContent = 'QR-Code konnte nicht erzeugt werden.'; }
            },

            // ===== KÄLTEMITTELBUCH (F-Gase-Nachweis) =====
            async openRefrigerantLog(equipmentId) {
                const eq = await db.get('equipment', equipmentId);
                if (!eq) return;
                const all = await db.getAll('refrigerantLog');
                const entries = all.filter(e => String(e.equipmentId) === String(equipmentId))
                    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

                // Bilanz: eingefüllt minus entnommen
                const filled = entries.filter(e => e.type === 'Einfüllung').reduce((s, e) => s + (Number(e.amountKg) || 0), 0);
                const removed = entries.filter(e => e.type === 'Entnahme').reduce((s, e) => s + (Number(e.amountKg) || 0), 0);
                const F = window.KTM_FGAS;

                const rows = entries.map(e => `
                    <div class="rl-row">
                        <div class="rl-type ${e.type === 'Einfüllung' ? 'in' : 'out'}">${e.type === 'Einfüllung' ? '➕' : '➖'}</div>
                        <div class="rl-body">
                            <div class="rl-main">${(Number(e.amountKg) || 0).toFixed(2)} kg ${escapeHtml(e.refrigerant || eq.refrigerant || '')}</div>
                            <div class="rl-sub">${e.date ? new Date(e.date).toLocaleDateString('de-AT') : ''}${e.technician ? ' · ' + escapeHtml(e.technician) : ''}${e.reason ? ' · ' + escapeHtml(e.reason) : ''}</div>
                        </div>
                        <button class="rl-del" onclick="app.deleteRefrigerantEntry('${e.id}','${equipmentId}')" title="Löschen">×</button>
                    </div>`).join('');

                showModal(`Kältemittelbuch – ${escapeHtml(eq.manufacturer || '')} ${escapeHtml(eq.model || '')}`, `
                    <div class="rl-balance">
                        <div class="rl-bal-item"><span>Eingefüllt</span><strong>${filled.toFixed(2)} kg</strong></div>
                        <div class="rl-bal-item"><span>Entnommen</span><strong>${removed.toFixed(2)} kg</strong></div>
                        <div class="rl-bal-item accent"><span>Aktuelle Füllung</span><strong>${(Number(eq.fillKg) || 0).toFixed(2)} kg</strong></div>
                    </div>
                    <div class="rl-add">
                        <div class="form-row">
                            <div class="form-group"><label>Vorgang</label><select id="rlType"><option value="Einfüllung">➕ Einfüllung / Nachfüllung</option><option value="Entnahme">➖ Entnahme / Absaugung</option></select></div>
                            <div class="form-group"><label>Menge (kg)</label><input type="number" step="0.01" id="rlAmount" placeholder="z. B. 0,80"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Datum</label><input type="date" id="rlDate" value="${new Date().toISOString().slice(0, 10)}"></div>
                            <div class="form-group"><label>Techniker</label><input type="text" id="rlTech" placeholder="Name"></div>
                        </div>
                        <div class="form-group"><label>Grund / Notiz</label><input type="text" id="rlReason" placeholder="z. B. Erstbefüllung, Leckage-Reparatur"></div>
                        <button class="btn btn-primary" onclick="app.addRefrigerantEntry('${equipmentId}')">${icon('plus')} Buchung hinzufügen</button>
                    </div>
                    <div class="rl-list-title">Buchungen (${entries.length})</div>
                    <div class="rl-list">${rows || '<div class="empty-note" style="padding:16px;">Noch keine Buchungen. Dokumentiere hier jede Ein- und Ausbuchung von Kältemittel (F-Gase-Nachweis).</div>'}</div>
                `, null, null);
            },

            async addRefrigerantEntry(equipmentId) {
                const type = document.getElementById('rlType').value;
                const amount = parseFloat(document.getElementById('rlAmount').value);
                if (!(amount > 0)) { showToast('Bitte eine Menge größer 0 eingeben.', 'error'); return; }
                const eq = await db.get('equipment', equipmentId);
                const entry = {
                    equipmentId,
                    type,
                    amountKg: amount,
                    refrigerant: eq?.refrigerant || '',
                    date: document.getElementById('rlDate').value || new Date().toISOString().slice(0, 10),
                    technician: document.getElementById('rlTech').value.trim(),
                    reason: document.getElementById('rlReason').value.trim()
                };
                await db.add('refrigerantLog', entry);

                // Füllmenge der Anlage automatisch anpassen
                if (eq) {
                    const delta = type === 'Einfüllung' ? amount : -amount;
                    eq.fillKg = Math.max(0, (Number(eq.fillKg) || 0) + delta);
                    await db.put('equipment', eq);
                }
                showToast('Buchung gespeichert.', 'success');
                document.querySelector('.modal-overlay')?.remove();
                this.openRefrigerantLog(equipmentId);
            },

            async deleteRefrigerantEntry(entryId, equipmentId) {
                const entry = await db.get('refrigerantLog', entryId);
                await db.delete('refrigerantLog', entryId);
                // Füllmenge zurückrechnen
                if (entry) {
                    const eq = await db.get('equipment', equipmentId);
                    if (eq) {
                        const delta = entry.type === 'Einfüllung' ? -(Number(entry.amountKg) || 0) : (Number(entry.amountKg) || 0);
                        eq.fillKg = Math.max(0, (Number(eq.fillKg) || 0) + delta);
                        await db.put('equipment', eq);
                    }
                }
                showToast('Buchung gelöscht.', 'info');
                document.querySelector('.modal-overlay')?.remove();
                this.openRefrigerantLog(equipmentId);
            },

            // ===== WARTUNG =====
            insertChecklistTemplate(type) {
                const templates = {
                    split: [
                        'Innengerät: Filter reinigen/tauschen',
                        'Verdampfer-Lamellen reinigen',
                        'Kondensatablauf und -wanne prüfen/reinigen',
                        'Kältemitteldruck / Betriebsdruck prüfen',
                        'Sichtprüfung auf Leckagen (Verschraubungen)',
                        'Außengerät: Verflüssiger reinigen',
                        'Lüfter/Ventilator prüfen',
                        'Elektrische Anschlüsse/Klemmen kontrollieren',
                        'Funktionstest Heizen/Kühlen',
                        'Temperaturen messen und protokollieren'
                    ],
                    vrf: [
                        'Alle Innengeräte: Filter reinigen',
                        'Kondensatpumpen/-ablauf je Gerät prüfen',
                        'Außeneinheit(en): Wärmetauscher reinigen',
                        'Kältemittelfüllung / Unterkühlung prüfen',
                        'Dichtheitsprüfung nach F-Gase-VO',
                        'Kommunikation/Adressierung der Geräte prüfen',
                        'Verdichter-Betriebsstunden auslesen',
                        'Fehlerspeicher auslesen',
                        'Elektrik und Absicherung kontrollieren',
                        'Funktionstest aller Zonen'
                    ],
                    waermepumpe: [
                        'Wärmequelle prüfen (Luft/Sole/Wasser)',
                        'Verdampfer/Verflüssiger reinigen',
                        'Kältemitteldruck und Unterkühlung prüfen',
                        'Heizungswasserdruck kontrollieren',
                        'Umwälzpumpen prüfen',
                        'Pufferspeicher / Warmwasser prüfen',
                        'Sicherheitsventil und Ausdehnungsgefäß prüfen',
                        'JAZ / Betriebsdaten auslesen',
                        'Elektrik und Reglereinstellungen prüfen',
                        'Dichtheitsprüfung nach F-Gase-VO'
                    ],
                    kaelte: [
                        'Verflüssiger und Verdampfer reinigen',
                        'Kältemittelfüllung / Schauglas prüfen',
                        'Verdichter: Öl, Druck, Betriebsstunden',
                        'Abtausystem prüfen (Funktion/Zeiten)',
                        'Dichtheitsprüfung nach F-Gase-VO (Protokoll!)',
                        'Temperaturen Kühlraum/Kühlmöbel messen',
                        'Türen/Dichtungen der Kühlstellen prüfen',
                        'Regelung und Alarme testen',
                        'Elektrik, Schütze, Klemmen prüfen',
                        'Ergebnisse dokumentieren'
                    ]
                };
                const list = templates[type];
                if (!list) return;
                const ta = document.getElementById('mntCheck');
                if (!ta) return;
                const text = list.map(x => '☐ ' + x).join('\n');
                ta.value = ta.value.trim() ? (ta.value.trim() + '\n' + text) : text;
                showToast('Vorlage eingefügt – du kannst sie anpassen.', 'success');
            },

            async openMaintenance(id = null) {
                const m = id ? await db.get('maintenance', id) : null;
                const equipment = await db.getAll('equipment');
                const customers = await db.getAll('customers');
                const eqOpts = equipment.map(e => `<option value="${e.id}" ${m && String(m.equipmentId) === String(e.id) ? 'selected' : ''}>${escapeHtml((e.manufacturer || '') + ' ' + (e.model || 'Anlage'))}</option>`).join('');
                const custOpts = customers.map(c => `<option value="${c.id}" ${m && String(m.customerId) === String(c.id) ? 'selected' : ''}>${escapeHtml((c.firstName || '') + ' ' + (c.lastName || ''))}</option>`).join('');
                const intervals = ['monatlich', 'vierteljährlich', 'halbjährlich', 'jährlich', '2-jährlich'];
                const intOpts = intervals.map(i => `<option value="${i}" ${m && m.interval === i ? 'selected' : ''}>${i}</option>`).join('');

                const body = `
                    <div class="form-group"><label>Anlage</label><select id="mntEq"><option value="">– Anlage wählen –</option>${eqOpts}</select></div>
                    <div class="form-group"><label>Kunde</label><select id="mntCust"><option value="">– kein Kunde –</option>${custOpts}</select></div>
                    <div class="form-row">
                        <div class="form-group"><label>Intervall</label><select id="mntInt">${intOpts}</select></div>
                        <div class="form-group"><label>Nächste Wartung</label><input type="date" id="mntNext" value="${escapeHtml(m?.nextDue || '')}"></div>
                    </div>
                    <div class="form-group"><label>Wartungs-Checkliste</label>
                        <div class="mnt-templates">
                            <span class="mnt-tpl-label">Vorlage einfügen:</span>
                            <button type="button" class="btn btn-sm btn-outline" onclick="app.insertChecklistTemplate('split')">Split-Klima</button>
                            <button type="button" class="btn btn-sm btn-outline" onclick="app.insertChecklistTemplate('vrf')">VRF / Multisplit</button>
                            <button type="button" class="btn btn-sm btn-outline" onclick="app.insertChecklistTemplate('waermepumpe')">Wärmepumpe</button>
                            <button type="button" class="btn btn-sm btn-outline" onclick="app.insertChecklistTemplate('kaelte')">Gewerbekälte</button>
                        </div>
                        <textarea id="mntCheck" rows="6" placeholder="Vorlage oben wählen oder eigene Punkte eingeben (eine Zeile pro Punkt)">${escapeHtml(m?.checklist || '')}</textarea>
                    </div>
                    <div class="form-group"><label>Notizen</label><textarea id="mntNotes" rows="2">${escapeHtml(m?.notes || '')}</textarea></div>
                `;

                showModal(id ? 'Wartungsplan bearbeiten' : 'Neuer Wartungsplan', body, async (overlay) => {
                    const data = {
                        equipmentId: document.getElementById('mntEq').value || null,
                        customerId: document.getElementById('mntCust').value || null,
                        interval: document.getElementById('mntInt').value,
                        nextDue: document.getElementById('mntNext').value || null,
                        checklist: document.getElementById('mntCheck').value.trim(),
                        notes: document.getElementById('mntNotes').value.trim()
                    };
                    if (!data.equipmentId && !data.customerId) { showToast('Bitte Anlage oder Kunde wählen.', 'error'); return; }
                    if (id) { data.id = id; data.createdAt = m.createdAt; await db.put('maintenance', data); }
                    else await db.add('maintenance', data);
                    overlay.remove();
                    showToast('Wartungsplan gespeichert.', 'success');
                    this.navigate('maintenance');
                }, 'Speichern');
            },

            // ===== Regelbasierte Materialliste im Schnellrechner (ohne KI, offline) =====
            async calcAiMaterials() {
                const box = document.getElementById('calcAiBox');
                if (!box) return;
                box.innerHTML = '<div class="calc-ai-loading">Stelle Materialliste zusammen…</div>';

                try {
                    const res = await calcCompute();
                    const mats = await db.getAll('materials');

                    // Katalog-Suche: findet den günstigsten passenden Artikel per Stichwörtern
                    const kwOf = v => parseFloat(String(v || '').replace(',', '.')) || 0;
                    const findCat = (keywords, category) => {
                        const kws = keywords.map(k => k.toLowerCase());
                        let pool = mats.filter(m => {
                            if (Number(m.sellingPrice) <= 0) return false;
                            const hay = ((m.name || '') + ' ' + (m.category || '') + ' ' + (m.notes || '')).toLowerCase();
                            if (category && m.category !== category) {
                                // Kategorie ist optional – wenn gesetzt, bevorzugen wir sie, erlauben aber Stichwort-Treffer
                            }
                            return kws.some(k => hay.includes(k));
                        });
                        if (category) {
                            const inCat = pool.filter(m => m.category === category);
                            if (inCat.length) pool = inCat;
                        }
                        if (!pool.length) return null;
                        // günstigsten nehmen (gepflegte Preise)
                        return pool.sort((a, b) => Number(a.sellingPrice) - Number(b.sellingPrice))[0];
                    };

                    const rooms = res.rooms.length || 1;
                    const dist = Number(CALC_STATE.distance) || 5;      // Leitungslänge je Raum (m)
                    const totalPipe = dist * rooms;
                    const duct = Number(CALC_STATE.ductLength) || 0;    // Kabelkanal (m)
                    const breaks = Number(CALC_STATE.breakthrough) || rooms; // Wanddurchbrüche

                    // Standard-Stückliste einer Split-Montage (Richtwerte, wenn Katalog-Preis fehlt)
                    const spec = [
                        { key: ['kältemittelleitung', 'kupferrohr', 'saugleitung', 'flüssigleitung', 'cu-rohr'], cat: 'Kupferrohr', label: 'Kältemittelleitung (Saug + Flüssig)', qty: totalPipe, unit: 'm', fallback: 14 },
                        { key: ['isolierung', 'armaflex', 'dämmung'], cat: null, label: 'Leitungsisolierung', qty: totalPipe, unit: 'm', fallback: 3.5 },
                        { key: ['kommunikationskabel', 'steuerkabel', 'kommkabel', 'ölflex', '4x0,75', '4x1,5'], cat: null, label: 'Kommunikationskabel', qty: totalPipe, unit: 'm', fallback: 2.2 },
                        { key: ['kondensat', 'ablaufschlauch', 'kondensatschlauch'], cat: null, label: 'Kondensatschlauch', qty: totalPipe, unit: 'm', fallback: 1.8 },
                        { key: ['stromkabel', 'netzkabel', 'nym', '3x1,5', '3x2,5'], cat: null, label: 'Stromzuleitung', qty: dist, unit: 'm', fallback: 2.5 },
                        { key: ['kabelkanal', 'brüstungskanal'], cat: null, label: 'Kabelkanal', qty: duct || totalPipe, unit: 'm', fallback: 9 },
                        { key: ['konsole', 'wandkonsole', 'wandhalter', 'halterung'], cat: null, label: 'Wandkonsole Außengerät', qty: res.outdoor ? 1 : 0, unit: 'Set', fallback: 38 },
                        { key: ['dübel', 'schellen', 'kleinmaterial', 'montagematerial'], cat: null, label: 'Kleinmaterial (Dübel, Schellen, Dichtband)', qty: 1, unit: 'Pauschal', fallback: 45 }
                    ];

                    const positions = [];
                    for (const s of spec) {
                        if (s.qty <= 0) continue;
                        const hit = findCat(s.key, s.cat);
                        const unitPrice = hit ? Number(hit.sellingPrice) : s.fallback;
                        positions.push({
                            name: hit ? hit.name : s.label,
                            menge: Math.round(s.qty * 10) / 10,
                            einheit: hit ? (hit.unit || s.unit) : s.unit,
                            preis: unitPrice,
                            ausKatalog: !!hit
                        });
                    }

                    const sum = positions.reduce((a, p) => a + p.preis * p.menge, 0);
                    // Positionen für den Kopieren-Knopf merken
                    this._lastMaterialList = { positions, sum };
                    box.innerHTML = `
                        <div class="calc-ai-head">🧰 Materialliste (circa)</div>
                        <div class="calc-lines">
                            ${positions.map(p => `<div class="calc-line">
                                <span class="calc-line-label">${escapeHtml(p.name)} · ${p.menge} ${escapeHtml(p.einheit)}${p.ausKatalog ? '' : ' <span class="calc-ai-est">Richtwert</span>'}</span>
                                <span class="calc-line-price">${formatCurrency(p.preis * p.menge)}</span>
                            </div>`).join('')}
                            <div class="calc-line calc-line-sum"><span class="calc-line-label">Material gesamt (circa)</span><span class="calc-line-price">${formatCurrency(sum)}</span></div>
                        </div>
                        <button class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="app.copyMaterialList()">📋 Materialliste kopieren</button>
                        <div class="calc-ai-note">Positionen mit „Richtwert" sind (noch) nicht in deinem Katalog – lege sie dort an, dann wird automatisch dein echter Preis verwendet. Mengen aus Leitungslänge (${dist} m) × ${rooms} Raum${rooms !== 1 ? '(e)' : ''}.</div>
                    `;
                } catch (e) {
                    box.innerHTML = `<div class="calc-ai-err">⚠️ Materialliste konnte nicht erstellt werden (${escapeHtml(String(e.message || e))}).</div>`;
                }
            },

            copyMaterialList() {
                const data = this._lastMaterialList;
                if (!data || !data.positions.length) { showToast('Keine Materialliste vorhanden.', 'error'); return; }
                const lines = data.positions.map(p => `${p.name} · ${p.menge} ${p.einheit} · ${formatCurrency(p.preis * p.menge)}`);
                lines.push(`Material gesamt (circa): ${formatCurrency(data.sum)}`);
                const text = 'Materialliste:\n' + lines.join('\n');
                const done = () => showToast('Materialliste kopiert – zum Einfügen ins Angebot bereit.', 'success');
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(done).catch(() => {
                        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
                        try { document.execCommand('copy'); done(); } catch (e) { showToast('Kopieren nicht möglich.', 'error'); }
                        ta.remove();
                    });
                } else {
                    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
                    try { document.execCommand('copy'); done(); } catch (e) { showToast('Kopieren nicht möglich.', 'error'); }
                    ta.remove();
                }
            },

            // ===== Materialliste auswählen & senden (Händler/Kunde) =====
            async openMaterialSend(projectId) {
                const project = await db.get('projects', projectId);
                const pm = (await db.getByIndex('projectMaterials', 'projectId', projectId)) || [];
                if (!pm.length) { showToast('Keine Materialien im Projekt.', 'info'); return; }
                const customer = project?.customerId ? await db.get('customers', project.customerId) : null;

                // Alle Positionen initial ausgewählt
                const state = {
                    selected: new Set(pm.map(p => p.id)),
                    showCustomer: true,
                    showPrices: true,
                    showModel: true,
                    discountMode: 'none', // none | percent | amount
                    discountValue: 0
                };
                this._matSendState = state;
                this._matSendData = { project, pm, customer };

                const rows = pm.map(p => `
                    <label class="ms-row">
                        <input type="checkbox" class="ms-check" data-id="${p.id}" checked>
                        <div class="ms-info">
                            <div class="ms-name">${escapeHtml(p.name)}</div>
                            <div class="ms-sub">${p.articleNumber ? 'Modell: ' + escapeHtml(p.articleNumber) + ' · ' : ''}${p.quantity || 1} ${escapeHtml(p.unit || 'Stk')}</div>
                        </div>
                        <div class="ms-price">${formatCurrency((Number(p.price) || 0) * (Number(p.quantity) || 1))}</div>
                    </label>`).join('');

                showModal('Materialliste senden', `
                    <div class="ms-options">
                        <div class="ms-opt-title">Optionen</div>
                        <label class="ms-toggle"><input type="checkbox" id="msCustomer" checked> Kundenname anzeigen</label>
                        <label class="ms-toggle"><input type="checkbox" id="msPrices" checked> Preise anzeigen <span style="color:var(--text-muted);font-size:11px;">(aus für Händler-Anfrage)</span></label>
                        <label class="ms-toggle"><input type="checkbox" id="msModel" checked> Modellnummern anzeigen</label>
                        <div class="ms-discount">
                            <label>Rabatt:</label>
                            <select id="msDiscMode">
                                <option value="none">kein Rabatt</option>
                                <option value="percent">Prozent (%)</option>
                                <option value="amount">Betrag (€)</option>
                            </select>
                            <input type="number" id="msDiscVal" step="0.01" placeholder="0" style="width:80px;" disabled>
                        </div>
                    </div>
                    <div class="ms-list-title">Positionen auswählen (${pm.length})</div>
                    <div class="ms-selectall"><button type="button" class="btn btn-sm btn-outline" id="msAll">Alle</button><button type="button" class="btn btn-sm btn-outline" id="msNone">Keine</button></div>
                    <div class="ms-list">${rows}</div>
                    <div class="ms-actions">
                        <button type="button" class="btn btn-primary" id="msPdf">${icon('pdf')} Als PDF</button>
                        <button type="button" class="btn btn-outline" id="msCopy">📋 Als Text kopieren</button>
                    </div>
                `, null, null);

                // Verdrahtung
                setTimeout(() => {
                    const q = (s) => document.querySelector(s);
                    q('#msDiscMode')?.addEventListener('change', (e) => { document.getElementById('msDiscVal').disabled = e.target.value === 'none'; });
                    q('#msAll')?.addEventListener('click', () => document.querySelectorAll('.ms-check').forEach(c => c.checked = true));
                    q('#msNone')?.addEventListener('click', () => document.querySelectorAll('.ms-check').forEach(c => c.checked = false));
                    q('#msPdf')?.addEventListener('click', () => this._matSendExport('pdf'));
                    q('#msCopy')?.addEventListener('click', () => this._matSendExport('text'));
                }, 30);
            },

            _matSendCollect() {
                const { pm } = this._matSendData;
                const selIds = new Set(Array.from(document.querySelectorAll('.ms-check')).filter(c => c.checked).map(c => c.dataset.id));
                const items = pm.filter(p => selIds.has(String(p.id)));
                const showCustomer = document.getElementById('msCustomer')?.checked;
                const showPrices = document.getElementById('msPrices')?.checked;
                const showModel = document.getElementById('msModel')?.checked;
                const discMode = document.getElementById('msDiscMode')?.value || 'none';
                const discVal = parseFloat(document.getElementById('msDiscVal')?.value) || 0;
                return { items, showCustomer, showPrices, showModel, discMode, discVal };
            },

            _matSendTotals(items, discMode, discVal) {
                const sub = items.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);
                let discount = 0;
                if (discMode === 'percent') discount = sub * (discVal / 100);
                else if (discMode === 'amount') discount = discVal;
                discount = Math.min(discount, sub);
                return { sub, discount, total: sub - discount };
            },

            _matSendExport(format) {
                const opt = this._matSendCollect();
                if (!opt.items.length) { showToast('Bitte mindestens eine Position auswählen.', 'error'); return; }
                const { project, customer } = this._matSendData;
                const t = this._matSendTotals(opt.items, opt.discMode, opt.discVal);

                if (format === 'text') {
                    const lines = [];
                    lines.push('Materialliste' + (project?.title ? ' – ' + project.title : ''));
                    if (opt.showCustomer && customer) lines.push('Kunde: ' + (customer.firstName || '') + ' ' + (customer.lastName || ''));
                    lines.push('');
                    opt.items.forEach(p => {
                        let line = `- ${p.name}`;
                        if (opt.showModel && p.articleNumber) line += ` (Modell ${p.articleNumber})`;
                        line += ` · ${p.quantity || 1} ${p.unit || 'Stk'}`;
                        if (opt.showPrices) line += ` · ${formatCurrency((Number(p.price) || 0) * (Number(p.quantity) || 1))}`;
                        lines.push(line);
                    });
                    if (opt.showPrices) {
                        lines.push('');
                        if (opt.discMode !== 'none' && t.discount > 0) {
                            lines.push('Zwischensumme: ' + formatCurrency(t.sub));
                            lines.push('Rabatt: -' + formatCurrency(t.discount));
                        }
                        lines.push('Gesamt: ' + formatCurrency(t.total));
                    }
                    const text = lines.join('\n');
                    const done = () => showToast('Materialliste kopiert.', 'success');
                    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => {
                        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove();
                    });
                    return;
                }

                // PDF
                if (typeof window.jspdf === 'undefined') { showToast('PDF-Bibliothek nicht geladen.', 'error'); return; }
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const mx = 15; let y = 20;
                doc.setFontSize(16); doc.setFont(undefined, 'bold');
                doc.text('Materialliste', mx, y); y += 7;
                doc.setFontSize(10); doc.setFont(undefined, 'normal');
                if (project?.title) { doc.text('Projekt: ' + project.title, mx, y); y += 5; }
                if (opt.showCustomer && customer) { doc.text('Kunde: ' + (customer.firstName || '') + ' ' + (customer.lastName || ''), mx, y); y += 5; }
                doc.text('Datum: ' + new Date().toLocaleDateString('de-AT'), mx, y); y += 8;

                const head = ['Pos', 'Bezeichnung'];
                if (opt.showModel) head.push('Modell');
                head.push('Menge');
                if (opt.showPrices) { head.push('Einzel'); head.push('Gesamt'); }
                const body = opt.items.map((p, i) => {
                    const row = [String(i + 1), p.name];
                    if (opt.showModel) row.push(p.articleNumber || '–');
                    row.push(`${p.quantity || 1} ${p.unit || 'Stk'}`);
                    if (opt.showPrices) { row.push(formatCurrency(Number(p.price) || 0)); row.push(formatCurrency((Number(p.price) || 0) * (Number(p.quantity) || 1))); }
                    return row;
                });
                doc.autoTable({ startY: y, head: [head], body, styles: { fontSize: 9 }, headStyles: { fillColor: [18, 128, 143] }, margin: { left: mx, right: mx } });
                let fy = doc.lastAutoTable.finalY + 8;
                if (opt.showPrices) {
                    doc.setFontSize(10);
                    if (opt.discMode !== 'none' && t.discount > 0) {
                        doc.text('Zwischensumme:', 130, fy); doc.text(formatCurrency(t.sub), 195, fy, { align: 'right' }); fy += 5;
                        doc.text('Rabatt:', 130, fy); doc.text('-' + formatCurrency(t.discount), 195, fy, { align: 'right' }); fy += 5;
                    }
                    doc.setFont(undefined, 'bold');
                    doc.text('Gesamt:', 130, fy); doc.text(formatCurrency(t.total), 195, fy, { align: 'right' });
                } else {
                    doc.setFontSize(9); doc.setTextColor(120);
                    doc.text('Bitte Preise eintragen und zurücksenden.', mx, fy);
                }
                const fname = 'Materialliste_' + (project?.title || 'Projekt').replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
                if (navigator.canShare) { sharePdfDoc(doc, fname, 'Materialliste'); }
                else { doc.save(fname); showToast('Materialliste als PDF erstellt.', 'success'); }
            },

            // ===== Digitaler Blätter-Katalog =====
            async renderKatalog(openBrand) {
                const area = document.getElementById('contentArea');
                // Der fertige, professionell gestaltete Katalog wird in einem Rahmen
                // (iframe) geöffnet. Er bringt seine eigenen Bilder und sein Design mit.
                area.innerHTML = `
                    <div class="katalog-frame-wrap">
                        <iframe src="katalog.html?v=44d" class="katalog-frame" title="Produktkatalog" loading="lazy"></iframe>
                    </div>`;
            },

            // Alte Upload-Katalog-Funktionen (eigene Seitenbilder) bleiben verfügbar,
            // werden aktuell aber nicht über das Menü aufgerufen.
            async renderKatalogUpload(openBrand) {
                const area = document.getElementById('contentArea');
                const pages = (await db.getAll('catalogPages')) || [];
                // nach Marke gruppieren, innerhalb nach Reihenfolge/Seitennummer
                const brands = {};
                pages.forEach(p => { const b = p.brand || 'Ohne Marke'; (brands[b] = brands[b] || []).push(p); });
                Object.values(brands).forEach(list => list.sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0)));
                const brandNames = Object.keys(brands).sort();

                area.innerHTML = `
                    <div class="toolbar" style="gap:8px;flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="app.katalogUpload()">${icon('plus')} Seiten hochladen</button>
                        ${pages.length ? `<button class="btn btn-outline" onclick="app.katalogExportPdf()">${icon('pdf')} Als PDF</button>` : ''}
                        <span style="flex:1;"></span>
                        <span style="font-size:13px;color:var(--text-muted);align-self:center;">${pages.length} Seite${pages.length !== 1 ? 'n' : ''}</span>
                    </div>
                    <input type="file" id="katalogFile" accept="image/*" multiple style="display:none;">
                    ${pages.length === 0 ? `
                        <div class="empty-note" style="padding:40px 20px;text-align:center;">
                            <div style="font-size:40px;margin-bottom:10px;">📖</div>
                            <div style="font-weight:600;margin-bottom:6px;">Noch keine Katalogseiten</div>
                            <div style="font-size:13px;color:var(--text-muted);max-width:340px;margin:0 auto;">Lade Fotos oder Scans deiner Katalogseiten hoch. Tipp: Mit einer Scanner-App (z. B. in Google Drive) werden die Seiten gerade und der Hintergrund weiß.</div>
                        </div>` : `
                        <div class="katalog-brands">
                            ${brandNames.map(b => `
                                <div class="katalog-brand">
                                    <div class="katalog-brand-head">${escapeHtml(b)} <span>(${brands[b].length})</span></div>
                                    <div class="katalog-thumbs">
                                        ${brands[b].map(p => `
                                            <div class="katalog-thumb" onclick="app.katalogOpen('${p.id}')">
                                                <img src="${p.image}" loading="lazy">
                                                <button class="katalog-thumb-del" onclick="event.stopPropagation(); app.katalogDelete('${p.id}')" title="Seite löschen">×</button>
                                            </div>`).join('')}
                                    </div>
                                </div>`).join('')}
                        </div>`}
                `;
                const fileInput = document.getElementById('katalogFile');
                if (fileInput) fileInput.addEventListener('change', (e) => this._katalogHandleFiles(e));
                // Falls direkt eine Marke geöffnet werden soll
                if (openBrand && brands[openBrand] && brands[openBrand][0]) this.katalogOpen(brands[openBrand][0].id);
            },

            katalogUpload() {
                const inp = document.getElementById('katalogFile');
                if (inp) inp.click();
            },

            async _katalogHandleFiles(e) {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                // Marke abfragen (einmal für alle hochgeladenen Seiten)
                const brand = await this._katalogAskBrand();
                if (brand === null) { e.target.value = ''; return; }
                showToast(`${files.length} Seite(n) werden verarbeitet…`, 'info');
                const existing = (await db.getAll('catalogPages')) || [];
                let maxOrder = existing.filter(p => p.brand === brand).reduce((m, p) => Math.max(m, p.order || 0), 0);
                for (const file of files) {
                    try {
                        // hohe Qualität, damit man zoomen kann (max 1600px, 82%)
                        const img = await compressImage(file, 1600, 0.82);
                        maxOrder += 1;
                        await db.add('catalogPages', { brand, image: img, order: maxOrder, createdAt: Date.now() });
                    } catch (err) { showToast('Eine Seite konnte nicht verarbeitet werden.', 'error'); }
                }
                e.target.value = '';
                showToast('Katalogseiten hinzugefügt.', 'success');
                this.renderKatalog();
            },

            _katalogAskBrand() {
                return new Promise((resolve) => {
                    const brands = ['Samsung', 'LG', 'Daikin', 'Hisense', 'Mitsubishi', 'Panasonic', 'Toshiba', 'Sonstige'];
                    const overlay = document.createElement('div');
                    overlay.className = 'modal-overlay';
                    overlay.innerHTML = `
                        <div class="modal" style="max-width:380px;">
                            <h3>Zu welcher Marke gehören die Seiten?</h3>
                            <div class="modal-body">
                                <div class="form-group"><label>Marke / Kategorie</label>
                                    <input type="text" id="katBrandInput" list="dl_katBrands" placeholder="z. B. Samsung" value="Samsung">
                                    <datalist id="dl_katBrands">${brands.map(b => `<option value="${b}">`).join('')}</datalist>
                                </div>
                            </div>
                            <div class="modal-actions">
                                <button class="btn btn-outline" id="katBrandCancel">Abbrechen</button>
                                <button class="btn btn-primary" id="katBrandOk">Weiter</button>
                            </div>
                        </div>`;
                    document.getElementById('modalContainer').appendChild(overlay);
                    const close = (val) => { overlay.remove(); resolve(val); };
                    overlay.querySelector('#katBrandCancel').addEventListener('click', () => close(null));
                    overlay.querySelector('#katBrandOk').addEventListener('click', () => {
                        const v = overlay.querySelector('#katBrandInput').value.trim();
                        close(v || 'Sonstige');
                    });
                    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(null); });
                });
            },

            async katalogOpen(pageId) {
                const pages = (await db.getAll('catalogPages')) || [];
                const page = pages.find(p => String(p.id) === String(pageId));
                if (!page) return;
                // Blätter-Reihenfolge: alle Seiten derselben Marke
                const brandPages = pages.filter(p => (p.brand || 'Ohne Marke') === (page.brand || 'Ohne Marke'))
                    .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0));
                let idx = brandPages.findIndex(p => String(p.id) === String(pageId));

                const overlay = document.createElement('div');
                overlay.className = 'katalog-viewer';
                const render = () => {
                    const p = brandPages[idx];
                    overlay.innerHTML = `
                        <div class="katalog-viewer-top">
                            <span>${escapeHtml(p.brand || '')} · Seite ${idx + 1}/${brandPages.length}</span>
                            <button class="katalog-viewer-close" title="Schließen">×</button>
                        </div>
                        <div class="katalog-viewer-img" id="katViewImg"><img src="${p.image}"></div>
                        <div class="katalog-viewer-nav">
                            <button class="katalog-nav-btn" id="katPrev" ${idx === 0 ? 'disabled' : ''}>‹ Zurück</button>
                            <button class="katalog-nav-btn" id="katNext" ${idx === brandPages.length - 1 ? 'disabled' : ''}>Weiter ›</button>
                        </div>`;
                    overlay.querySelector('.katalog-viewer-close').addEventListener('click', () => overlay.remove());
                    const prev = overlay.querySelector('#katPrev'), next = overlay.querySelector('#katNext');
                    if (prev) prev.addEventListener('click', () => { if (idx > 0) { idx--; render(); } });
                    if (next) next.addEventListener('click', () => { if (idx < brandPages.length - 1) { idx++; render(); } });
                    // Doppeltippen zoomt
                    const imgBox = overlay.querySelector('#katViewImg');
                    const imgEl = imgBox.querySelector('img');
                    imgEl.addEventListener('click', () => imgBox.classList.toggle('zoomed'));
                };
                render();

                // Wischgesten (links/rechts blättern)
                let startX = 0;
                overlay.addEventListener('touchstart', (ev) => { startX = ev.touches[0].clientX; }, { passive: true });
                overlay.addEventListener('touchend', (ev) => {
                    const dx = ev.changedTouches[0].clientX - startX;
                    if (Math.abs(dx) < 50) return;
                    if (dx < 0 && idx < brandPages.length - 1) { idx++; render(); }
                    else if (dx > 0 && idx > 0) { idx--; render(); }
                }, { passive: true });

                document.body.appendChild(overlay);
            },

            async katalogDelete(pageId) {
                const ok = await showConfirm('Diese Katalogseite löschen?');
                if (!ok) return;
                await db.deleteLocalOnly('catalogPages', parseId(pageId));
                showToast('Seite gelöscht.', 'info');
                this.renderKatalog();
            },

            async katalogExportPdf() {
                if (typeof window.jspdf === 'undefined') { showToast('PDF-Bibliothek nicht geladen.', 'error'); return; }
                const pages = (await db.getAll('catalogPages')) || [];
                if (!pages.length) { showToast('Keine Seiten vorhanden.', 'info'); return; }
                pages.sort((a, b) => (a.brand || '').localeCompare(b.brand || '') || (a.order || 0) - (b.order || 0));
                showToast('PDF wird erstellt…', 'info');
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pw = 210, ph = 297;
                for (let i = 0; i < pages.length; i++) {
                    if (i > 0) doc.addPage();
                    try {
                        const props = doc.getImageProperties(pages[i].image);
                        const ratio = Math.min((pw - 10) / props.width, (ph - 10) / props.height);
                        const w = props.width * ratio, h = props.height * ratio;
                        doc.addImage(pages[i].image, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
                    } catch (e) { /* Seite überspringen */ }
                }
                const fname = 'Produktkatalog.pdf';
                if (navigator.canShare) sharePdfDoc(doc, fname, 'Produktkatalog');
                else { doc.save(fname); showToast('Katalog als PDF erstellt.', 'success'); }
            },

            // ===== Hersteller-Katalog importieren (Samsung, Daikin ...) =====
            async confirmImportKatalog() {
                const count = (window.KTM_KATALOG || []).length;
                const ok = await showConfirm(`Es werden ${count} Geräte (Samsung, Daikin, LG, Hisense + Zubehör wie SUMO-Standfüße, Verteilerboxen) mit Modellnummern und Preisen in deinen Materialkatalog geladen. Bereits vorhandene werden übersprungen. Fortfahren?`, { title: 'Katalog importieren', okText: 'Importieren', danger: false });
                if (ok) this.importHerstellerKatalog();
            },

            async importHerstellerKatalog() {
                const katalog = window.KTM_KATALOG || [];
                if (!katalog.length) { showToast('Kein Katalog gefunden.', 'error'); return; }

                const existing = await db.getAll('materials');
                const existingKeys = new Set(existing.map(m => `${(m.manufacturer || '').toLowerCase()}|${(m.articleNumber || m.name || '').toLowerCase()}`));

                let added = 0, skipped = 0;
                for (const item of katalog) {
                    const key = `${(item.manufacturer || '').toLowerCase()}|${(item.articleNumber || item.name || '').toLowerCase()}`;
                    if (existingKeys.has(key)) { skipped++; continue; }
                    await db.add('materials', {
                        name: item.name,
                        manufacturer: item.manufacturer,
                        series: item.series,
                        category: item.category || 'Klimageräte',
                        bauart: item.bauart || '',
                        articleNumber: item.articleNumber || '',
                        size: item.size || '',
                        unit: 'Stk',
                        purchasePrice: 0,
                        sellingPrice: Number(item.sellingPrice) || 0,
                        notes: item.notes || '',
                        stock: 0,
                        images: []
                    });
                    existingKeys.add(key);
                    added++;
                }
                showToast(`Katalog importiert: ${added} neue Geräte${skipped ? ', ' + skipped + ' schon vorhanden' : ''}.`, 'success');
                this.navigate('materials');
            },

            // ===== Händlerrabatte je Marke =====
            async openDealerDiscounts() {
                const raw = await getSetting('dealerDiscounts', '');
                let map = {};
                try { map = raw ? JSON.parse(raw) : {}; } catch (e) { map = {}; }
                // Marken aus dem Materialkatalog sammeln + gängige vorschlagen
                const mats = await db.getAll('materials');
                const brands = [...new Set([...Object.keys(map), ...mats.map(m => m.manufacturer).filter(Boolean), 'LG', 'Daikin', 'Samsung', 'Hisense'])].sort();

                showModal('Händlerrabatte je Marke', `
                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
                        Trag hier ein, wie viel <strong>Rabatt auf den Listenpreis</strong> du bei welcher Marke bekommst. Die App rechnet daraus automatisch deinen <strong>Einkaufspreis</strong> und <strong>Gewinn</strong>.
                    </div>
                    <div class="dd-list">
                        ${brands.map(b => `
                            <div class="dd-row">
                                <label>${escapeHtml(b)}</label>
                                <div class="dd-input"><input type="number" min="0" max="100" step="1" data-brand="${escapeHtml(b)}" value="${map[b] != null ? map[b] : ''}" placeholder="0"> <span>%</span></div>
                            </div>`).join('')}
                    </div>
                    <div class="form-group" style="margin-top:12px;">
                        <label>Weitere Marke hinzufügen</label>
                        <input type="text" id="ddNewBrand" placeholder="Marke eingeben und speichern">
                    </div>
                `, async () => {
                    const newMap = {};
                    document.querySelectorAll('.dd-row input[data-brand]').forEach(inp => {
                        const v = parseFloat(inp.value);
                        if (v > 0) newMap[inp.dataset.brand] = v;
                    });
                    const nb = document.getElementById('ddNewBrand').value.trim();
                    if (nb && !(nb in newMap)) newMap[nb] = 0;
                    await setSetting('dealerDiscounts', JSON.stringify(newMap));
                    window.__ktmDealerDiscounts = newMap;
                    showToast('Händlerrabatte gespeichert.', 'success');
                });
            },

            async openCustomerModal(id = null) {
                const customer = id ? await db.get('customers', id) : null;
                const modal = showModal(
                    id ? 'Kunde bearbeiten' : 'Neuer Kunde',
                    `
                        <div class="form-row">
                            <div class="form-group"><label>Anrede</label>
                                <select id="custSalutation">
                                    ${['', 'Herr', 'Frau', 'Divers', 'Firma'].map(s => `<option value="${s}" ${(customer?.salutation || '') === s ? 'selected' : ''}>${s || '— keine —'}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group"><label>Titel (optional)</label><input type="text" id="custTitle" value="${escapeHtml(customer?.title || '')}" placeholder="z. B. Dr., Ing."></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Vorname</label><input type="text" id="custFirstName" value="${escapeHtml(customer?.firstName || '')}"></div>
                            <div class="form-group"><label>Nachname</label><input type="text" id="custLastName" value="${escapeHtml(customer?.lastName || '')}"></div>
                        </div>
                        <div class="form-group"><label>Firma (optional)</label><input type="text" id="custCompany" value="${escapeHtml(customer?.company || '')}"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Straße</label><input type="text" id="custStreet" value="${escapeHtml(customer?.street || '')}"></div>
                            <div class="form-group"><label>Hausnummer</label><input type="text" id="custHouseNumber" value="${escapeHtml(customer?.houseNumber || '')}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>PLZ</label><input type="text" id="custZip" value="${escapeHtml(customer?.zip || '')}"></div>
                            <div class="form-group"><label>Ort</label><input type="text" id="custCity" list="dl_city" value="${escapeHtml(customer?.city || '')}">${typeof learnedDatalist === 'function' ? learnedDatalist('city', 'dl_city') : ''}</div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Telefon</label><input type="text" id="custPhone" value="${escapeHtml(customer?.phone || '')}"></div>
                            <div class="form-group"><label>E-Mail</label><input type="email" id="custEmail" value="${escapeHtml(customer?.email || '')}"></div>
                        </div>
                        <div class="form-group"><label>Notizen</label><textarea id="custNotes" rows="2">${escapeHtml(customer?.notes || '')}</textarea></div>
                        <div class="form-group"><label>Status</label>
                            <select id="custStatus">
                                ${['Neu','Besichtigt','Angebot gesendet','Auftrag erhalten','Fertig'].map(s => `<option value="${s}" ${customer?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                    `,
                    async (overlay) => {
                        const data = {
                            salutation: overlay.querySelector('#custSalutation').value,
                            title: overlay.querySelector('#custTitle').value.trim(),
                            firstName: overlay.querySelector('#custFirstName').value.trim(),
                            lastName: overlay.querySelector('#custLastName').value.trim(),
                            company: overlay.querySelector('#custCompany').value.trim(),
                            street: overlay.querySelector('#custStreet').value.trim(),
                            houseNumber: overlay.querySelector('#custHouseNumber').value.trim(),
                            zip: overlay.querySelector('#custZip').value.trim(),
                            city: (() => { const v = overlay.querySelector('#custCity').value.trim(); if (v && typeof learnValue === 'function') learnValue('city', v).catch(() => {}); return v; })(),
                            phone: overlay.querySelector('#custPhone').value.trim(),
                            email: overlay.querySelector('#custEmail').value.trim(),
                            notes: overlay.querySelector('#custNotes').value.trim(),
                            status: overlay.querySelector('#custStatus').value,
                        };
                        // Nicht mehr alle Felder Pflicht – es muss nur irgendeine
                        // brauchbare Angabe da sein, damit kein leerer Kunde entsteht.
                        if (!data.firstName && !data.lastName && !data.company && !data.phone && !data.email) {
                            showToast('Bitte wenigstens Name, Firma oder Telefon angeben.', 'error');
                            return;
                        }
                        if (id) {
                            data.id = id;
                            data.createdAt = customer.createdAt;
                            await db.put('customers', data);
                        } else {
                            // Dubletten-Prüfung: ähnlicher Name ODER gleiche Telefonnummer/E-Mail
                            const norm = s => String(s || '').toLowerCase().replace(/[\s.\-]/g, '');
                            const nameKey = norm(data.firstName + data.lastName);
                            const phoneKey = norm(data.phone);
                            const mailKey = norm(data.email);
                            const all = await db.getAll('customers');
                            const dup = all.find(c => {
                                const cn = norm((c.firstName || '') + (c.lastName || ''));
                                if (nameKey && cn === nameKey) return true;
                                if (phoneKey && phoneKey.length >= 6 && norm(c.phone) === phoneKey) return true;
                                if (mailKey && mailKey.includes('@') && norm(c.email) === mailKey) return true;
                                return false;
                            });
                            if (dup && !overlay.dataset.dupConfirmed) {
                                const reason = norm((dup.firstName || '') + (dup.lastName || '')) === nameKey ? 'gleicher Name'
                                    : (phoneKey && norm(dup.phone) === phoneKey ? 'gleiche Telefonnummer' : 'gleiche E-Mail');
                                const info = [dup.firstName, dup.lastName, dup.city ? '· ' + dup.city : '', dup.phone ? '· ' + dup.phone : ''].filter(Boolean).join(' ');
                                overlay.dataset.dupConfirmed = '1';
                                showModal('Kunde existiert womöglich schon',
                                    `<div style="font-size:13.5px;line-height:1.55;">Es gibt bereits einen Kunden mit <strong>${reason}</strong>:<br><br>
                                     <div class="form-card" style="margin:0;"><strong>${escapeHtml(info)}</strong></div><br>
                                     Möchtest du trotzdem einen <strong>neuen</strong> Kunden anlegen?</div>`,
                                    async (ov2) => { ov2.remove(); overlay.querySelector('.save-btn')?.click(); },
                                    'Trotzdem neu anlegen'
                                );
                                return;
                            }
                            await db.add('customers', data);
                        }
                        overlay.remove();
                        showToast(id ? 'Kunde aktualisiert.' : 'Kunde angelegt.', 'success');
                        this.navigate('customers');
                    }
                );
            },

            async deleteCustomer(id) {
                if (!await showConfirm('Kunden wirklich löschen? Alle zugehörigen Projekte bleiben erhalten.')) return;
                const rec = await db.get('customers', id);
                await db.delete('customers', id);
                this.navigate('customers');
                if (rec) showUndoToast('Kunde gelöscht.', async () => {
                    const restore = { ...rec }; delete restore._synced;
                    await db.add('customers', restore);
                    app.navigate('customers');
                    showToast('Kunde wiederhergestellt.', 'success');
                });
            },

            async duplicateCustomer(id) {
                const original = await db.get('customers', id);
                if (!original) return;
                const copy = { ...original };
                delete copy.id;
                delete copy.createdAt;
                delete copy._synced;
                delete copy._remote;
                copy.firstName = copy.firstName + ' (Kopie)';
                await db.add('customers', copy);
                showToast('Kunde dupliziert.', 'success');
                this.navigate('customers');
            },

            async openProjectModal(id = null) {
                const project = id ? await db.get('projects', id) : null;
                const customers = await db.getAll('customers');
                const statusOptions = ['Neu','Besichtigung offen','Besichtigt','Angebot offen','Angebot gesendet','Auftrag erhalten','Material bestellt','Montage geplant','Montage läuft','Fertig','Archiv'];
                const modal = showModal(
                    id ? 'Projekt bearbeiten' : 'Neues Projekt',
                    `
                        <div class="form-group"><label>Projekttitel *</label><input type="text" id="projTitle" value="${escapeHtml(project?.title || '')}"></div>
                        <div class="form-group"><label>Kunde</label>
                            <select id="projCustomer">
                                <option value="">-- Kunde auswählen --</option>
                                ${customers.map(c => `<option value="${c.id}" ${project?.customerId === c.id ? 'selected' : ''}>${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group"><label>Baustellenadresse (falls abweichend)</label><input type="text" id="projSiteAddress" value="${escapeHtml(project?.siteAddress || '')}" placeholder="Straße, PLZ Ort"></div>
                        <div class="form-group"><label>Status</label>
                            <select id="projStatus">${statusOptions.map(s => `<option value="${s}" ${project?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
                        </div>
                        <div class="form-group"><label>Notizen</label><textarea id="projNotes" rows="3">${escapeHtml(project?.notes || '')}</textarea></div>
                    `,
                    async (overlay) => {
                        const data = {
                            title: overlay.querySelector('#projTitle').value.trim(),
                            customerId: parseId(overlay.querySelector('#projCustomer').value),
                            siteAddress: overlay.querySelector('#projSiteAddress').value.trim(),
                            status: overlay.querySelector('#projStatus').value,
                            notes: overlay.querySelector('#projNotes').value.trim(),
                        };
                        if (!data.title) { showToast('Titel ist erforderlich.', 'error'); return; }
                        if (id) {
                            data.id = id;
                            data.createdAt = project.createdAt;
                            await db.put('projects', data);
                        } else {
                            const newId = await db.add('projects', data);
                            data.id = newId;
                        }
                        overlay.remove();
                        showToast(id ? 'Projekt aktualisiert.' : 'Projekt erstellt.', 'success');
                        this.navigate('projects', data.id);
                    }
                );
            },

            async deleteProject(id) {
                if (!await showConfirm('Projekt und alle zugehörigen Räume, Bilder und Angebote wirklich löschen?')) return;
                try {
                    const rooms = await db.getByIndex('rooms', 'projectId', id);
                    const images = await db.getByIndex('images', 'projectId', id);
                    const offers = await db.getByIndex('offers', 'projectId', id);
                    for (const r of rooms) await db.delete('rooms', r.id);
                    for (const i of images) await db.delete('images', i.id);
                    for (const o of offers) await db.delete('offers', o.id);
                    await db.delete('projects', id);
                    showToast('Projekt gelöscht.', 'info');
                    this.navigate('projects');
                } catch(e) {
                    console.error('Löschen fehlgeschlagen:', e);
                    showToast('Fehler beim Löschen.', 'error');
                }
            },

            async openRoomModal(projectId) {
                const modal = showModal(
                    'Raum hinzufügen',
                    `
                        <div class="form-group"><label>Raumname</label><input type="text" id="roomName" placeholder="z.B. Wohnzimmer"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Länge (m) *</label><input type="number" id="roomLength" step="0.1" min="0" placeholder="5.0"></div>
                            <div class="form-group"><label>Breite (m) *</label><input type="number" id="roomWidth" step="0.1" min="0" placeholder="4.0"></div>
                            <div class="form-group"><label>Höhe (m)</label><input type="number" id="roomHeight" step="0.1" min="0" value="2.5" placeholder="2.5"></div>
                        </div>
                    `,
                    async (overlay) => {
                        const data = {
                            projectId,
                            name: overlay.querySelector('#roomName').value.trim() || 'Unbenannt',
                            length: parseFloat(overlay.querySelector('#roomLength').value) || 0,
                            width: parseFloat(overlay.querySelector('#roomWidth').value) || 0,
                            height: parseFloat(overlay.querySelector('#roomHeight').value) || 2.5,
                        };
                        if (data.length <= 0 || data.width <= 0) {
                            showToast('Länge und Breite müssen größer als 0 sein.', 'error');
                            return;
                        }
                        await db.add('rooms', data);
                        overlay.remove();
                        showToast('Raum hinzugefügt.', 'success');
                        this.navigate('projects', projectId);
                    }
                );
            },

            async deleteRoom(roomId, projectId) {
                if (!await showConfirm('Raum löschen?')) return;
                await db.delete('rooms', roomId);
                showToast('Raum gelöscht.', 'info');
                this.navigate('projects', projectId);
            },

            async openImageModal(projectId) {
                const modal = showModal(
                    'Bild hinzufügen',
                    `
                        <div class="form-group"><label>Bild auswählen *</label><input type="file" id="imgFile" accept="image/*" capture="environment"></div>
                        <div class="form-group"><label>Kategorie</label>
                            <select id="imgCategory">
                                ${['Bestandssituation','Außeneinheit','Innengerät','Elektroanschluss','Kondensatablauf','Rohrleitung','Wanddurchbruch','Sonstiges'].map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group"><label>Bezeichnung (optional)</label><input type="text" id="imgLabel" placeholder="z.B. Wohnzimmer Nordwand"></div>
                    `,
                    async (overlay) => {
                        const fileInput = overlay.querySelector('#imgFile');
                        const file = fileInput.files[0];
                        if (!file) { showToast('Bitte ein Bild auswählen.', 'error'); return; }

                        compressImage(file, 800, 0.7).then(async (compressedData) => {
                            const data = {
                                projectId,
                                data: compressedData,
                                category: overlay.querySelector('#imgCategory').value,
                                label: overlay.querySelector('#imgLabel').value.trim(),
                                createdAt: new Date().toISOString()
                            };
                            await db.add('images', data);
                            overlay.remove();
                            showToast('Bild gespeichert.', 'success');
                            this.navigate('projects', projectId);
                        }).catch(() => {
                            showToast('Fehler beim Komprimieren des Bildes.', 'error');
                        });
                    }
                );
            },

            viewImage(dataUrl) {
                const win = window.open('', '_blank');
                if (!win) { showToast('Popup wurde blockiert. Bitte Popups für diese Seite erlauben.', 'error'); return; }
                win.document.write(`<img src="${dataUrl}" style="max-width:100%;max-height:100vh;display:block;margin:auto;">`);
                win.document.title = 'Bildvorschau';
            },

            async openMaterialModal(id = null) {
                const mat = id ? await db.get('materials', id) : null;
                // Bilder als Array; alte Einzelbilder (mat.image) werden übernommen
                let images = Array.isArray(mat?.images) ? [...mat.images] : (mat?.image ? [mat.image] : []);
                const modal = showModal(
                    id ? 'Material bearbeiten' : 'Neues Material',
                    `
                        <div class="form-group"><label>Artikelname *</label><input type="text" id="matName" value="${escapeHtml(mat?.name || '')}"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Hersteller</label><input type="text" id="matManufacturer" list="dl_matHersteller" value="${escapeHtml(mat?.manufacturer || '')}" placeholder="z.B. Mitsubishi Electric">${typeof learnedDatalist === 'function' ? learnedDatalist('matHersteller', 'dl_matHersteller') : ''}</div>
                        <div class="form-group"><label>Serie / Baureihe</label><input type="text" id="matSeries" list="dl_matSerie" value="${escapeHtml(mat?.series || '')}" placeholder="z. B. Perfera, WindFree, Standard Plus">${typeof learnedDatalist === 'function' ? learnedDatalist('matSerie', 'dl_matSerie') : ''}</div>
                            <div class="form-group"><label>Artikelnummer</label><input type="text" id="matArticleNumber" value="${escapeHtml(mat?.articleNumber || '')}"></div>
                        </div>
                        <div class="form-group"><label>Größe / Durchmesser (optional)</label><input type="text" id="matSize" value="${escapeHtml(mat?.size || '')}" placeholder="z. B. 22 mm, 5×2,5 mm², 1/2 Zoll"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Bestand</label><input type="number" inputmode="decimal" step="any" min="0" id="matStock" value="${mat?.stock ?? 0}"></div>
                            <div class="form-group"><label>Mindestbestand (Warnung bei Unterschreitung)</label><input type="number" inputmode="decimal" step="any" min="0" id="matMinStock" value="${mat?.minStock ?? ''}" placeholder="z. B. 10"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Verpackungseinheit</label>
                                <select id="matPackUnit">
                                    ${['Stück', 'Rolle', 'Bund', 'Stange'].map(u => { const cur = mat?.unit === 'Rolle' || mat?.unit === 'Bund' || mat?.unit === 'Stange' ? mat.unit : 'Stück'; return `<option value="${u}" ${cur === u ? 'selected' : ''}>${u}</option>`; }).join('')}
                                </select>
                                <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">Rolle/Bund/Stange = wird pro Meter verkauft.</div>
                            </div>
                            <div class="form-group"><label>Länge je Rolle/Bund/Stange (m)</label><input type="number" inputmode="decimal" step="any" min="0" id="matBundle" value="${mat?.bundleLength ?? ''}" placeholder="z. B. 50"></div>
                        </div>
                        <div class="form-group" id="matMarkupRow" style="display:none;"><label>Aufschlag auf Einkaufspreis (%) <small>– bestimmt den Meter-Verkaufspreis</small></label><input type="number" inputmode="decimal" step="any" min="0" id="matMarkup" value="${mat?.markup ?? ''}" placeholder="z. B. 60"></div>
                        <div id="matRollCalc" class="mat-roll-calc" style="display:none;"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Kategorie</label>
                                <input type="text" id="matCategory" value="${escapeHtml(mat?.category || '')}" list="dl_matCats" placeholder="z. B. Kältemittel, Kupferrohr, Werkzeug ...">
                                <datalist id="dl_matCats">${getMaterialCategories().map(c => `<option value="${escapeHtml(c.name)}">`).join('')}</datalist>
                                <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">Frei wählbar – vorhandene Gruppe wählen oder neue eintippen.</div>
                            </div>
                            <div class="form-group"><label>Einheit</label><input type="text" id="matUnit" value="${escapeHtml(mat?.unit || 'Stk')}"></div>
                        </div>
                        <div class="form-group"><label>Bauart (optional – für Sortierung Innen/Außen, Single/Multi)</label>
                            <select id="matBauart">
                                ${['', 'Innengerät Single-Split', 'Außengerät Single-Split', 'Innengerät Multi-Split', 'Außengerät Multi-Split', 'Innengerät VRF', 'Außengerät VRF', 'Wärmepumpe', 'Kanalgerät', 'Deckenkassette', 'Truhengerät', 'Zubehör'].map(b => `<option value="${b}" ${(mat?.bauart || '') === b ? 'selected' : ''}>${b || '– keine –'}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Listenpreis / Verkaufspreis (€)</label><input type="number" id="matSellingPrice" step="0.01" value="${mat?.sellingPrice || 0}"><div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">Der Preis, den der Kunde zahlt. Der Einkaufspreis wird daraus per Rabatt berechnet.</div></div>
                            <div class="form-group"><label>Händlerrabatt (%)</label><input type="number" id="matDiscount" step="1" min="0" max="100" value="${mat?.dealerDiscount != null ? mat.dealerDiscount : ''}" placeholder="auto"></div>
                        </div>
                        <div class="form-group"><label>Einkaufspreis (€)</label><input type="number" id="matPurchasePrice" step="0.01" value="${mat?.purchasePrice || 0}">
                            <div id="matProfitBox" class="mat-profit"></div>
                        </div>
                        <div class="form-group"><label>Beschreibung (erscheint im Angebot)</label><textarea id="matDescription" rows="2">${escapeHtml(mat?.description || '')}</textarea></div>
                        <div class="form-group"><label>Produktbilder (aus Galerie, mehrere möglich)</label>
                            <input type="file" id="matImage" accept="image/*" multiple>
                            <div id="matImgPreview" class="mat-img-gallery"></div>
                        </div>
                        <div class="form-group"><label>Notizen</label><textarea id="matNotes" rows="2">${escapeHtml(mat?.notes || '')}</textarea></div>
                    `,
                    async (overlay) => {
                        const data = {
                            name: overlay.querySelector('#matName').value.trim(),
                            manufacturer: (() => { const v = overlay.querySelector('#matManufacturer').value.trim(); if (v && typeof learnValue === 'function') learnValue('matHersteller', v).catch(() => {}); return v; })(),
                            series: (() => { const v = overlay.querySelector('#matSeries').value.trim(); if (v && typeof learnValue === 'function') learnValue('matSerie', v).catch(() => {}); return v; })(),
                            articleNumber: overlay.querySelector('#matArticleNumber').value.trim(),
                            size: overlay.querySelector('#matSize').value.trim(),
                            stock: parseFloat(String(overlay.querySelector('#matStock').value).replace(',', '.')) || 0,
                            minStock: parseFloat(String(overlay.querySelector('#matMinStock').value).replace(',', '.')) || 0,
                            bundleLength: parseFloat(String(overlay.querySelector('#matBundle').value).replace(',', '.')) || 0,
                            markup: overlay.querySelector('#matMarkup')?.value.trim() === '' ? null : (parseFloat(String(overlay.querySelector('#matMarkup').value).replace(',', '.')) || 0),
                            openMeters: mat?.openMeters ?? 0,
                            category: overlay.querySelector('#matCategory').value.trim() || 'Zubehör',
                            bauart: overlay.querySelector('#matBauart')?.value || '',
                            unit: (() => { const pu = overlay.querySelector('#matPackUnit')?.value; return (pu && pu !== 'Stück') ? pu : (overlay.querySelector('#matUnit').value.trim() || 'Stk'); })(),
                            purchasePrice: parseFloat(overlay.querySelector('#matPurchasePrice').value) || 0,
                            sellingPrice: parseFloat(overlay.querySelector('#matSellingPrice').value) || 0,
                            dealerDiscount: overlay.querySelector('#matDiscount').value.trim() === '' ? null : (parseFloat(overlay.querySelector('#matDiscount').value) || 0),
                            description: overlay.querySelector('#matDescription').value.trim(),
                            notes: overlay.querySelector('#matNotes').value.trim(),
                            images: images,
                            image: images[0] || '',
                        };
                        if (!data.name) { showToast('Artikelname ist erforderlich.', 'error'); return; }
                        if (id) {
                            data.id = id;
                            data.createdAt = mat.createdAt;
                            await db.put('materials', data);
                        } else {
                            await db.add('materials', data);
                        }
                        overlay.remove();
                        showToast(id ? 'Material aktualisiert.' : 'Material angelegt.', 'success');
                        this.navigate('materials');
                    }
                );
                // Galerie-Vorschau rendern (mit Löschen-Knopf je Bild)
                const renderGallery = () => {
                    const box = modal.querySelector('#matImgPreview');
                    if (!box) return;
                    box.innerHTML = images.map((src, i) =>
                        `<div class="mat-img-thumb"><img src="${src}"><button type="button" class="mat-img-del" data-i="${i}" title="Bild entfernen">×</button></div>`
                    ).join('');
                    box.querySelectorAll('.mat-img-del').forEach(btn => {
                        btn.addEventListener('click', () => {
                            images.splice(parseInt(btn.dataset.i), 1);
                            renderGallery();
                        });
                    });
                };
                renderGallery();
                // Händlerrabatt -> Einkaufspreis + Gewinn automatisch
                (async () => {
                    const discounts = await getDealerDiscounts();
                    const sellEl = modal.querySelector('#matSellingPrice');
                    const discEl = modal.querySelector('#matDiscount');
                    const purchEl = modal.querySelector('#matPurchasePrice');
                    const box = modal.querySelector('#matProfitBox');
                    const brandOf = () => (modal.querySelector('#matManufacturer')?.value || mat?.manufacturer || '').trim();
                    const effectiveDiscount = () => {
                        const manual = discEl.value.trim();
                        if (manual !== '') return parseFloat(manual) || 0;
                        const b = brandOf();
                        return discounts[b] != null ? discounts[b] : null; // null = kein Marken-Rabatt hinterlegt
                    };
                    const recalc = (fromDiscount) => {
                        const sell = parseFloat(sellEl.value) || 0;
                        const disc = effectiveDiscount();
                        // Wenn ein Rabatt greift, EK automatisch berechnen
                        if (fromDiscount && disc != null) {
                            purchEl.value = (sell * (1 - disc / 100)).toFixed(2);
                        }
                        const purch = parseFloat(purchEl.value) || 0;
                        const profit = sell - purch;
                        const marginPct = sell > 0 ? (profit / sell * 100) : 0;
                        const hasIndividual = discEl.value.trim() !== '';
                        const b = brandOf();
                        const brandRate = discounts[b];
                        let discInfo;
                        if (hasIndividual) {
                            discInfo = `Individueller Rabatt ${parseFloat(discEl.value) || 0}%` + (brandRate != null ? ` <a href="#" id="matDiscReset" style="color:var(--accent);font-weight:600;">↺ auf Marke ${escapeHtml(b)} (${brandRate}%)</a>` : '');
                        } else if (disc != null) {
                            discInfo = `Rabatt ${disc}% (aus Marke ${escapeHtml(b)})`;
                        } else {
                            discInfo = 'kein Rabatt hinterlegt';
                        }
                        const ekCalc = (sell > 0 && disc != null) ? `<span style="color:var(--text-muted);font-size:11.5px;">${formatCurrency(sell)} − ${disc}% = EK ${formatCurrency(sell * (1 - disc / 100))}</span>` : '';
                        box.innerHTML = `<div class="mat-profit-in">
                            <span>${discInfo}</span>
                            <span class="mat-profit-val ${profit >= 0 ? 'pos' : 'neg'}">Gewinn: ${formatCurrency(profit)} (${marginPct.toFixed(0)}%)</span>
                        </div>${ekCalc ? `<div style="margin-top:3px;">${ekCalc}</div>` : ''}`;
                        // Reset-Link verdrahten
                        const resetLink = box.querySelector('#matDiscReset');
                        if (resetLink) resetLink.addEventListener('click', (e) => { e.preventDefault(); discEl.value = ''; recalc(true); });
                    };
                    // Auto-EK beim Öffnen, wenn Rabatt greift und noch kein EK gesetzt
                    if ((!mat || !(Number(mat.purchasePrice) > 0)) && effectiveDiscount() != null) recalc(true);
                    else recalc(false);
                    sellEl.addEventListener('input', () => recalc(true));
                    discEl.addEventListener('input', () => recalc(true));
                    purchEl.addEventListener('input', () => recalc(false));
                    modal.querySelector('#matManufacturer')?.addEventListener('input', () => recalc(true));

                    // ===== Rolle/Bund/Stange: EK/VK pro Meter live berechnen =====
                    const packEl = modal.querySelector('#matPackUnit');
                    const bundleEl = modal.querySelector('#matBundle');
                    const markupEl = modal.querySelector('#matMarkup');
                    const markupRow = modal.querySelector('#matMarkupRow');
                    const rollBox = modal.querySelector('#matRollCalc');
                    const recalcRoll = () => {
                        const isRoll = packEl && ['Rolle', 'Bund', 'Stange'].includes(packEl.value);
                        if (markupRow) markupRow.style.display = isRoll ? '' : 'none';
                        if (rollBox) rollBox.style.display = isRoll ? '' : 'none';
                        if (!isRoll || !rollBox) return;
                        const bl = parseFloat(String(bundleEl.value).replace(',', '.')) || 0;
                        const list = parseFloat(sellEl.value) || 0;      // Listenpreis pro Rolle
                        const disc = effectiveDiscount();                 // % Händlerrabatt
                        const ekRoll = disc != null ? list * (1 - disc / 100) : (parseFloat(purchEl.value) || 0);
                        const markup = parseFloat(String(markupEl.value).replace(',', '.')) || 0;
                        if (bl <= 0) { rollBox.innerHTML = '<div class="mat-roll-hint">Länge je Rolle/Bund/Stange eintragen, dann rechnet die App den Meterpreis.</div>'; return; }
                        const ekPerM = ekRoll / bl;
                        const vkPerM = markup > 0 ? ekPerM * (1 + markup / 100) : (list / bl);
                        const vkRoll = vkPerM * bl;
                        const unitWord = packEl.value;
                        rollBox.innerHTML = `
                            <div class="mat-roll-title">📏 Umrechnung pro Meter</div>
                            <div class="mat-roll-grid">
                                <span>Listenpreis / ${unitWord}</span><strong>${formatCurrency(list)}</strong>
                                <span>Einkauf / ${unitWord}${disc != null ? ` (−${disc}%)` : ''}</span><strong>${formatCurrency(ekRoll)}</strong>
                                <span>Einkauf / Meter</span><strong>${formatCurrency(ekPerM)}</strong>
                                <span>Verkauf / Meter${markup > 0 ? ` (+${markup}%)` : ''}</span><strong class="hl">${formatCurrency(vkPerM)}</strong>
                                <span>Verkauf / ${unitWord}</span><strong>${formatCurrency(vkRoll)}</strong>
                            </div>
                            <div class="mat-roll-hint">Im Angebot zahlt der Kunde <strong>${formatCurrency(vkPerM)}/m</strong> – die Rolle sieht er nie.</div>`;
                    };
                    packEl?.addEventListener('change', recalcRoll);
                    bundleEl?.addEventListener('input', recalcRoll);
                    markupEl?.addEventListener('input', recalcRoll);
                    sellEl.addEventListener('input', recalcRoll);
                    discEl.addEventListener('input', recalcRoll);
                    purchEl.addEventListener('input', recalcRoll);
                    recalcRoll();
                })();
                modal.querySelector('#matImage').addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    for (const file of files) {
                        try {
                            const compressed = await compressImage(file, 600, 0.65);
                            images.push(compressed);
                        } catch (err) { showToast('Ein Bild konnte nicht verarbeitet werden.', 'error'); }
                    }
                    renderGallery();
                    e.target.value = ''; // erlaubt erneutes Wählen derselben Datei
                });
            },

            viewImage(src) {
                if (!src) return;
                const ov = document.createElement('div');
                ov.className = 'img-viewer';
                ov.innerHTML = `<img src="${src}"><button class="img-viewer-close" title="Schließen">×</button>`;
                ov.addEventListener('click', () => ov.remove());
                document.body.appendChild(ov);
            },

            async deleteMaterial(id) {
                if (!await showConfirm('Material löschen?')) return;
                await db.delete('materials', id);
                showToast('Material gelöscht.', 'info');
                this.navigate('materials');
            },

            calendarShiftMonth(delta) {
                calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + delta, 1);
                renderCalendar();
            },

            calendarGoToday() {
                calendarViewDate = new Date();
                renderCalendar();
            },

            async openEventModal(id = null, prefillDate = null) {
                const ev = id ? await db.get('events', id) : null;
                const projects = await db.getAll('projects');
                const customers = await db.getAll('customers');
                const types = ['Besichtigung', 'Montage', 'Wartung', 'Sonstiges'];
                if (prefillDate) calendarViewDate = new Date(prefillDate);
                const modal = showModal(
                    id ? 'Termin bearbeiten' : 'Neuer Termin',
                    `
                        <div class="form-group"><label>Titel *</label><input type="text" id="evTitle" value="${escapeHtml(ev?.title || '')}" placeholder="z.B. Besichtigung Familie Huber"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Datum *</label><input type="date" id="evDate" value="${ev?.date || prefillDate || toLocalDateString(new Date())}"></div>
                            <div class="form-group"><label>Uhrzeit</label><input type="time" id="evTime" value="${ev?.time || ''}"></div>
                        </div>
                        <div class="form-group"><label>Typ</label>
                            <select id="evType">${types.map(t => `<option value="${t}" ${ev?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
                        </div>
                        <div class="form-group"><label>Projekt (optional)</label>
                            <select id="evProject">
                                <option value="">-- kein Projekt --</option>
                                ${projects.map(p => `<option value="${escapeHtml(String(p.id))}" ${ev?.projectId === p.id ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group"><label>Kunde (optional)</label>
                            <select id="evCustomer">
                                <option value="">-- kein Kunde --</option>
                                ${customers.map(c => `<option value="${escapeHtml(String(c.id))}" ${ev?.customerId === c.id ? 'selected' : ''}>${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group"><label>Notizen</label><textarea id="evNotes" rows="2">${escapeHtml(ev?.notes || '')}</textarea></div>
                    `,
                    async (overlay) => {
                        const data = {
                            title: overlay.querySelector('#evTitle').value.trim(),
                            date: overlay.querySelector('#evDate').value,
                            time: overlay.querySelector('#evTime').value,
                            type: overlay.querySelector('#evType').value,
                            projectId: parseId(overlay.querySelector('#evProject').value),
                            customerId: parseId(overlay.querySelector('#evCustomer').value),
                            notes: overlay.querySelector('#evNotes').value.trim(),
                        };
                        if (!data.title || !data.date) {
                            showToast('Titel und Datum sind Pflichtfelder.', 'error');
                            return;
                        }
                        if (id) {
                            data.id = id;
                            data.createdAt = ev.createdAt;
                            await db.put('events', data);
                        } else {
                            await db.add('events', data);
                        }
                        overlay.remove();
                        showToast(id ? 'Termin aktualisiert.' : 'Termin angelegt.', 'success');
                        this.navigate('calendar');
                    }
                );
            },

            async deleteEvent(id) {
                if (!await showConfirm('Termin wirklich löschen?')) return;
                await db.delete('events', id);
                showToast('Termin gelöscht.', 'info');
                this.navigate('calendar');
            },

      async createOffer(projectId) {
    const project = await db.getProjectWithDetails(projectId);
    if (!project) { showToast('Projekt nicht gefunden.', 'error'); return; }
    const customer = project.customerId ? await db.get('customers', project.customerId) : null;
    if (!customer) { showToast('Kein Kunde zugewiesen.', 'error'); return; }

    const materials = await db.getAll('materials');
    const dealerDiscounts = await getDealerDiscounts();
    const cooling = calculateCoolingCapacity(project.rooms || []);
    const manufacturers = [...new Set(materials.map(m => m.manufacturer).filter(Boolean))];
    const defaults = await loadOfferDefaults();

    let selected = [];
    let activeFilter = 'Alle';

    // --- Räume für das Angebot: standardmäßig ALLE aktiv ---
    const offerRooms = (project.rooms || []).map(r => String(r.id));
    let activeRooms = new Set([...offerRooms, '__none__']);   // '__none__' = Positionen ohne Raum

    // --- Projekt-Materialien als Angebotspositionen (aktuelle Preise) ---
    async function buildPositionsFromProject() {
        const pms = (await db.getByIndex('projectMaterials', 'projectId', projectId)) || [];
        const freshMats = await db.getAll('materials');   // immer AKTUELLE Katalogpreise ziehen
        const rooms = project.rooms || [];
        const roomName = (rid) => rooms.find(r => String(r.id) === String(rid))?.name || '';
        // Gleiches Material + Einheit + Preis über Räume hinweg zusammenfassen,
        // Räume in der Bemerkung sammeln
        const agg = new Map();
        for (const x of pms) {
            // Nur Positionen aus den ausgewählten Räumen übernehmen
            const rkey = x.roomId != null && offerRooms.includes(String(x.roomId)) ? String(x.roomId) : '__none__';
            if (!activeRooms.has(rkey)) continue;
            const mat = freshMats.find(m => String(m.id) === String(x.materialId));
            const unit = x.unit || mat?.unit || 'Stk';
            const price = (x.price !== undefined && x.price !== null) ? Number(x.price) : matUnitPrice(mat, unit);
            const key = `${String(x.materialId)}|${unit}|${price}`;
            if (!agg.has(key)) agg.set(key, {
                materialId: mat?.id, name: mat?.name || x.name || 'Material',
                unit, price, quantity: 0, manufacturer: mat?.manufacturer || '',
                articleNumber: mat?.articleNumber || '', category: mat?.category || '',
                size: x.size || mat?.size || '', rooms: new Set()
            });
            const a = agg.get(key);
            a.quantity += Number(x.quantity) || 0;
            const rn = roomName(x.roomId); if (rn) a.rooms.add(rn);
        }
        return [...agg.values()].map(a => ({
            materialId: a.materialId, name: a.name, unit: a.unit, price: a.price,
            quantity: Math.round(a.quantity * 100) / 100 || 1,
            manufacturer: a.manufacturer, articleNumber: a.articleNumber, category: a.category,
            description: (a.size ? a.size + (a.rooms.size ? ' · ' : '') : '') + [...a.rooms].join(', '),
            image: ''
        }));
    }

    let offerSettings = {
        offerNumber: defaults.autoNumber ? await getNextAutoNumber() : '',
        autoNumber: defaults.autoNumber,
        offerDate: toLocalDateString(new Date()),
        validUntilEnabled: defaults.validUntilEnabled,
        validUntil: toLocalDateString(new Date(Date.now() + defaults.defaultValidDays * 86400000)),
        vatEnabled: defaults.vatEnabled,
        vatRate: defaults.defaultVatRate,
        discountEnabled: defaults.defaultDiscount > 0,
        discountRate: defaults.defaultDiscount,
    };

    const siteAddress = project.siteAddress || `${customer.street || ''} ${customer.houseNumber || ''}, ${customer.zip || ''} ${customer.city || ''}`.trim();

    const modal = showModal(
        'Angebot erstellen',
        `
        <div style="background:var(--bg-tertiary);border-radius:var(--radius-md);padding:16px;margin-bottom:18px;">
            <div style="font-weight:700;margin-bottom:12px;color:var(--text-primary);">📋 Kopfdaten</div>
            <div class="form-row">
                <div class="form-group">
                    <label>Angebotsnummer</label>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input type="text" id="offerNumberInput" value="${escapeHtml(offerSettings.offerNumber)}" style="flex:1;">
                        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;">
                            <input type="checkbox" id="offerAutoNumber" ${offerSettings.autoNumber ? 'checked' : ''}> Auto
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label>Angebotsdatum</label>
                    <input type="date" id="offerDateInput" value="${offerSettings.offerDate}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label style="display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" id="offerValidUntilToggle" ${offerSettings.validUntilEnabled ? 'checked' : ''}> Gültig bis anzeigen
                    </label>
                    <input type="date" id="offerValidUntilInput" value="${offerSettings.validUntil}" ${offerSettings.validUntilEnabled ? '' : 'disabled'}>
                </div>
                <div class="form-group">
                    <label style="display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" id="offerVatToggle" ${offerSettings.vatEnabled ? 'checked' : ''}> Mehrwertsteuer berechnen
                    </label>
                    <select id="offerVatRate" ${offerSettings.vatEnabled ? '' : 'disabled'}>
                        <option value="0.20" ${offerSettings.vatRate === 0.20 ? 'selected' : ''}>20 % (Standard)</option>
                        <option value="0.10" ${offerSettings.vatRate === 0.10 ? 'selected' : ''}>10 % (ermäßigt)</option>
                        <option value="0.13" ${offerSettings.vatRate === 0.13 ? 'selected' : ''}>13 % (ermäßigt)</option>
                        <option value="0" ${offerSettings.vatRate === 0 ? 'selected' : ''}>0 % (steuerfrei)</option>
                        <option value="custom" ${![0.20,0.10,0.13,0].includes(offerSettings.vatRate) ? 'selected' : ''}>Benutzerdefiniert...</option>
                    </select>
                    <input type="number" id="offerVatCustom" placeholder="z.B. 19" step="0.1" min="0" max="100" style="margin-top:6px;display:${![0.20,0.10,0.13,0].includes(offerSettings.vatRate) ? 'block' : 'none'};" value="${offerSettings.vatRate !== 0.20 && offerSettings.vatRate !== 0.10 && offerSettings.vatRate !== 0.13 && offerSettings.vatRate !== 0 ? (offerSettings.vatRate*100) : ''}">
                </div>
            </div>
            <div class="form-group">
                <label style="display:flex;align-items:center;gap:6px;">
                    <input type="checkbox" id="offerDiscountToggle" ${offerSettings.discountEnabled ? 'checked' : ''}> Rabatt
                </label>
                <input type="number" id="offerDiscountRate" value="${Math.min(100, Math.max(0, offerSettings.discountRate))}" step="0.5" min="0" max="100" ${offerSettings.discountEnabled ? '' : 'disabled'}>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group"><label>Ansprechpartner</label><input type="text" id="offerContact" value="${escapeHtml(customer.firstName + ' ' + customer.lastName)}"></div>
            <div class="form-group"><label>Telefon</label><input type="text" id="offerPhone" value="${escapeHtml(customer.phone || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>E-Mail</label><input type="email" id="offerEmail" value="${escapeHtml(customer.email || '')}"></div>
        </div>
        <div class="form-group"><label>Baustellenadresse</label><input type="text" id="offerSiteAddress" value="${escapeHtml(siteAddress)}"></div>

        <div class="offer-builder">
            <div>
                <label style="font-size:13px;font-weight:600;color:var(--text-secondary);">Material suchen</label>
                <div class="offer-search-wrap">
                    <span class="search-ic">🔍</span>
                    <input type="text" id="offerMatSearch" placeholder="z.B. Mitsu, Kupferrohr, Klima...">
                    <div class="autocomplete-list" id="offerAutocomplete"></div>
                </div>
                <div class="filter-chips" id="offerFilterChips">
                    <div class="chip active" data-filter="Alle">Alle</div>
                    ${manufacturers.map(m => `<div class="chip" data-filter="${escapeHtml(m)}">${escapeHtml(m)}</div>`).join('')}
                    <div class="chip" data-filter="cat:Zubehör">Zubehör</div>
                    <div class="chip" data-filter="cat:Arbeitszeit">Arbeitszeit</div>
                </div>
                <div id="offerQuickResults" class="table-container" style="max-height:220px;overflow-y:auto;">
                    <table><tbody id="offerQuickResultsBody"></tbody></table>
                </div>
            </div>
            <div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <label style="font-size:13px;font-weight:600;color:var(--text-secondary);">Ausgewählte Positionen</label>
                    <button type="button" class="btn btn-sm btn-outline" id="offerReloadProject" title="Alle Projekt-Materialien mit aktuellen Preisen laden">↻ Projekt-Material</button>
                </div>
                <div class="offer-rooms" id="offerRoomPicker"></div>
                <div class="offer-pos-list" id="offerPosList"></div>
                <div class="offer-summary-box" id="offerSummaryBox"></div>
                <div class="offer-calc-box" id="offerCalcBox"></div>
            </div>
        </div>
        `,
        async (overlay) => {
            if (selected.length === 0) { showToast('Bitte mindestens eine Position wählen.', 'error'); return; }

            const autoNumber = overlay.querySelector('#offerAutoNumber').checked;
            const offerNumber = overlay.querySelector('#offerNumberInput').value.trim();

            if (!offerNumber) {
                showToast('Bitte eine Angebotsnummer eingeben.', 'error');
                return;
            }

            if (!(await isOfferNumberUnique(offerNumber))) {
                showToast('Diese Angebotsnummer existiert bereits!', 'error');
                return;
            }

            const offerDate = overlay.querySelector('#offerDateInput').value;
            const validUntilEnabled = overlay.querySelector('#offerValidUntilToggle').checked;
            const validUntil = overlay.querySelector('#offerValidUntilInput').value;
            const vatEnabled = overlay.querySelector('#offerVatToggle').checked;

            let vatRate = parseFloat(overlay.querySelector('#offerVatRate').value);
            if (overlay.querySelector('#offerVatRate').value === 'custom') {
                vatRate = (parseFloat(overlay.querySelector('#offerVatCustom').value) || 0) / 100;
            }

            const discountEnabled = overlay.querySelector('#offerDiscountToggle').checked;
            // Eingabe ist PROZENT (0-100) - hart begrenzen, damit keine 3000 % entstehen
            const discountRate = discountEnabled ? Math.min(100, Math.max(0, parseFloat(overlay.querySelector('#offerDiscountRate').value) || 0)) : 0;

            await saveOfferDefault('autoNumber', autoNumber);
            await saveOfferDefault('vatEnabled', vatEnabled);
            await saveOfferDefault('vatRate', vatRate);
            await saveOfferDefault('validUntilEnabled', validUntilEnabled);
            await saveOfferDefault('defaultDiscount', discountRate);

            const calc = computeOfferTotals();

            const offerData = {
                projectId,
                customerId: project.customerId,
                offerNumber,
                offerDate,
                validUntilEnabled,
                validUntil: validUntilEnabled ? validUntil : null,
                vatEnabled,
                vatRate,
                discountEnabled,
                discountRate: discountRate / 100,   // am Datensatz IMMER als Bruch (0,30 = 30 %)
                contactPerson: overlay.querySelector('#offerContact').value.trim(),
                contactPhone: overlay.querySelector('#offerPhone').value.trim(),
                contactEmail: overlay.querySelector('#offerEmail').value.trim(),
                siteAddress: overlay.querySelector('#offerSiteAddress').value.trim(),
                positions: selected.map(s => ({ ...s })),
                subtotal: calc.subtotal,
                discountAmount: calc.discountAmount,
                netAfterDiscount: calc.netAfterDiscount,
                vatAmount: calc.vatAmount,
                totalPrice: calc.total,
                coolingRecommendation: cooling.recommendation,
                coolingDetails: cooling.details,
                status: 'Angebot offen',
                createdAt: new Date().toISOString(),
            };

            await db.add('offers', offerData);
            project.status = 'Angebot offen';
            await db.put('projects', project);

            overlay.remove();
            showToast('Angebot erstellt.', 'success');
            this.navigate('offers');
        },
        null,
        { wide: true }
    );

    function computeOfferTotals() {
        // Bruttosumme der Positionen OHNE jeden Rabatt (nur zur Info)
        const grossSubtotal = selected.reduce((s, it) => s + it.price * it.quantity, 0);
        // Nettobetrag = Summe der Positionen NACH Positions-Rabatt.
        // Das ist genau die Summe der "Gesamt"-Spalte im PDF -> keine Widersprüche.
        const subtotal = selected.reduce((s, it) => s + it.price * it.quantity * (1 - (Number(it.discount) || 0) / 100), 0);
        const posDiscountAmount = grossSubtotal - subtotal;
        // danach optionaler Gesamt-Rabatt auf den Nettobetrag
        const discountRateVal = offerSettings.discountEnabled ? (offerSettings.discountRate / 100) : 0;
        const globalDiscountAmount = subtotal * discountRateVal;
        const netAfterDiscount = subtotal - globalDiscountAmount;
        const discountAmount = globalDiscountAmount;   // der ausgewiesene "Rabatt (x%)" bezieht sich auf den Nettobetrag
        const vatAmount = offerSettings.vatEnabled ? netAfterDiscount * offerSettings.vatRate : 0;
        const total = netAfterDiscount + vatAmount;
        return { grossSubtotal, subtotal, posDiscountAmount, discountRate: discountRateVal, globalDiscountAmount, discountAmount, netAfterDiscount, vatAmount, total };
    }

    function updateSettingsFromUI() {
        const autoNumCheckbox = modal.querySelector('#offerAutoNumber');
        const numInput = modal.querySelector('#offerNumberInput');
        const validUntilToggle = modal.querySelector('#offerValidUntilToggle');
        const validUntilInput = modal.querySelector('#offerValidUntilInput');
        const vatToggle = modal.querySelector('#offerVatToggle');
        const vatSelect = modal.querySelector('#offerVatRate');
        const vatCustom = modal.querySelector('#offerVatCustom');
        const discountToggle = modal.querySelector('#offerDiscountToggle');
        const discountInput = modal.querySelector('#offerDiscountRate');

        offerSettings.autoNumber = autoNumCheckbox.checked;
        offerSettings.offerNumber = numInput.value.trim();
        offerSettings.offerDate = modal.querySelector('#offerDateInput').value;
        offerSettings.validUntilEnabled = validUntilToggle.checked;
        offerSettings.validUntil = validUntilInput.value;
        offerSettings.vatEnabled = vatToggle.checked;

        if (vatSelect.value === 'custom') {
            offerSettings.vatRate = (parseFloat(vatCustom.value) || 0) / 100;
        } else {
            offerSettings.vatRate = parseFloat(vatSelect.value);
        }

        offerSettings.discountEnabled = discountToggle.checked;
        offerSettings.discountRate = discountToggle.checked ? (parseFloat(discountInput.value) || 0) : 0;
    }

    modal.querySelector('#offerAutoNumber').addEventListener('change', async function() {
        updateSettingsFromUI();
        if (this.checked) {
            const newNum = await getNextAutoNumber();
            modal.querySelector('#offerNumberInput').value = newNum;
            offerSettings.offerNumber = newNum;
        }
        renderSummary();
    });

    modal.querySelector('#offerNumberInput').addEventListener('input', function() {
        updateSettingsFromUI();
        renderSummary();
    });

    modal.querySelector('#offerDateInput').addEventListener('change', function() {
        updateSettingsFromUI();
        renderSummary();
    });

    modal.querySelector('#offerValidUntilToggle').addEventListener('change', function() {
        updateSettingsFromUI();
        modal.querySelector('#offerValidUntilInput').disabled = !this.checked;
        renderSummary();
    });

    modal.querySelector('#offerValidUntilInput').addEventListener('change', function() {
        updateSettingsFromUI();
        renderSummary();
    });

    modal.querySelector('#offerVatToggle').addEventListener('change', function() {
        updateSettingsFromUI();
        modal.querySelector('#offerVatRate').disabled = !this.checked;
        modal.querySelector('#offerVatCustom').disabled = !this.checked;
        renderSummary();
    });

    modal.querySelector('#offerVatRate').addEventListener('change', function() {
        const customInput = modal.querySelector('#offerVatCustom');
        if (this.value === 'custom') {
            customInput.style.display = 'block';
            customInput.disabled = false;
        } else {
            customInput.style.display = 'none';
            customInput.disabled = true;
        }
        updateSettingsFromUI();
        renderSummary();
    });

    modal.querySelector('#offerVatCustom').addEventListener('input', function() {
        updateSettingsFromUI();
        renderSummary();
    });

    modal.querySelector('#offerDiscountToggle').addEventListener('change', function() {
        updateSettingsFromUI();
        modal.querySelector('#offerDiscountRate').disabled = !this.checked;
        renderSummary();
    });

    modal.querySelector('#offerDiscountRate').addEventListener('input', function() {
        updateSettingsFromUI();
        renderSummary();
    });

    function renderPosList() {
        const list = modal.querySelector('#offerPosList');
        list.innerHTML = selected.map((s, idx) => {
            const lineNet = s.price * s.quantity;
            const disc = Number(s.discount) || 0;
            const lineAfter = lineNet * (1 - disc / 100);
            return `
            <div class="offer-pos-item">
                <div>
                    <div class="pos-name">${escapeHtml(s.name)}</div>
                    <div class="pos-meta">${escapeHtml(s.manufacturer || '')} ${s.articleNumber ? '· ' + escapeHtml(s.articleNumber) : ''}</div>
                </div>
                <div class="offer-pos-price"><input type="number" min="0" step="0.01" value="${s.price}" data-price="${idx}" class="offer-price-input" title="Verkaufspreis je Einheit">€</div>
                <input type="number" min="1" value="${s.quantity}" data-idx="${idx}" class="offer-qty-input" title="Menge">
                <div class="offer-pos-disc"><input type="number" min="0" max="100" step="1" value="${disc || ''}" placeholder="0" data-disc="${idx}" class="offer-disc-input" title="Rabatt auf diese Position in %"><span>%</span></div>
                <div style="text-align:right;font-weight:600;">${formatCurrency(lineAfter)}${disc > 0 ? `<div style="font-size:10px;color:var(--text-muted);text-decoration:line-through;">${formatCurrency(lineNet)}</div>` : ''}</div>
                <button class="btn btn-sm btn-danger" data-remove="${idx}" style="padding:4px 8px;">✕</button>
            </div>
        `;
        }).join('') || '<div style="color:var(--text-muted);font-size:13px;padding:12px;text-align:center;">Noch keine Positionen ausgewählt.</div>';

        list.querySelectorAll('.offer-disc-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.disc);
                let v = parseFloat(e.target.value);
                if (isNaN(v) || v < 0) v = 0; if (v > 100) v = 100;
                selected[idx].discount = v;
                updateSettingsFromUI();
                renderSummary();
                // Zeilensumme live aktualisieren ohne Neuaufbau (Fokus behalten)
                const cell = e.target.closest('.offer-pos-item').querySelector('div[style*="text-align:right"]');
                const lineNet = selected[idx].price * selected[idx].quantity;
                const lineAfter = lineNet * (1 - v / 100);
                if (cell) cell.innerHTML = `${formatCurrency(lineAfter)}${v > 0 ? `<div style="font-size:10px;color:var(--text-muted);text-decoration:line-through;">${formatCurrency(lineNet)}</div>` : ''}`;
            });
        });

        list.querySelectorAll('.offer-price-input').forEach(inp => {
            // live: Preis der Position aktualisieren
            inp.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.price);
                selected[idx].price = parseFloat(e.target.value) || 0;
                updateSettingsFromUI();
                renderSummary();
                const cell = e.target.closest('.offer-pos-item').querySelector('div[style*="text-align:right"]');
                const d = Number(selected[idx].discount) || 0;
                const lineNet = selected[idx].price * selected[idx].quantity;
                const lineAfter = lineNet * (1 - d / 100);
                if (cell) cell.innerHTML = `${formatCurrency(lineAfter)}${d > 0 ? `<div style="font-size:10px;color:var(--text-muted);text-decoration:line-through;">${formatCurrency(lineNet)}</div>` : ''}`;
            });
            // beim Verlassen: fragen, ob dauerhaft in die Materialdatenbank
            inp.addEventListener('change', async (e) => {
                const idx = parseInt(e.target.dataset.price);
                const pos = selected[idx];
                const newPrice = parseFloat(e.target.value) || 0;
                if (!pos.materialId) return;   // freie Position ohne Material – nichts zu speichern
                const m = materials.find(mm => String(mm.id) === String(pos.materialId));
                if (!m) return;
                const oldPrice = Number(m.sellingPrice) || 0;
                if (Math.abs(newPrice - oldPrice) < 0.005) return;   // keine echte Änderung
                const choice = await showPriceSaveDialog(m.name, oldPrice, newPrice);
                if (choice === 'permanent') {
                    m.sellingPrice = newPrice;
                    await db.put('materials', { ...m, sellingPrice: newPrice });
                    showToast(`Preis für „${m.name}" dauerhaft gespeichert.`, 'success');
                }
                // bei 'once' bleibt der Preis nur in diesem Angebot (schon in selected gesetzt)
                // bei 'cancel' zurücksetzen
                if (choice === 'cancel') {
                    pos.price = oldPrice;
                    renderPosList();
                    updateSettingsFromUI();
                    renderSummary();
                }
            });
        });

        list.querySelectorAll('.offer-qty-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                selected[idx].quantity = parseInt(e.target.value) || 1;
                renderPosList();
                updateSettingsFromUI();
                renderSummary();
            });
        });
        list.querySelectorAll('[data-remove]').forEach(btn => {
            btn.addEventListener('click', () => {
                selected.splice(parseInt(btn.dataset.remove), 1);
                renderPosList();
                updateSettingsFromUI();
                renderSummary();
            });
        });
    }

    function renderSummary() {
        updateSettingsFromUI();
        const calc = computeOfferTotals();
        let html = '';
        if (calc.posDiscountAmount > 0.001) {
            // Es gibt Positions-Rabatte -> transparent aufschlüsseln
            html += `<div class="offer-summary-row"><span>Zwischensumme</span><span>${formatCurrency(calc.grossSubtotal)}</span></div>`;
            html += `<div class="offer-summary-row"><span>Positions-Rabatte</span><span>- ${formatCurrency(calc.posDiscountAmount)}</span></div>`;
            html += `<div class="offer-summary-row"><span>Nettobetrag</span><span>${formatCurrency(calc.subtotal)}</span></div>`;
        } else {
            html += `<div class="offer-summary-row"><span>Nettobetrag</span><span>${formatCurrency(calc.subtotal)}</span></div>`;
        }
        if (offerSettings.discountEnabled && calc.globalDiscountAmount > 0) {
            html += `<div class="offer-summary-row"><span>Rabatt (${(calc.discountRate*100).toFixed(1)}%)</span><span>- ${formatCurrency(calc.globalDiscountAmount)}</span></div>`;
        }
        if (offerSettings.vatEnabled) {
            html += `<div class="offer-summary-row"><span>MwSt. (${(offerSettings.vatRate*100).toFixed(0)}%)</span><span>${formatCurrency(calc.vatAmount)}</span></div>`;
        }
        html += `<div class="offer-summary-row total"><span>Gesamtbetrag</span><span>${formatCurrency(calc.total)}</span></div>`;
        modal.querySelector('#offerSummaryBox').innerHTML = html;
        renderInternalCalc();
    }

    // Ist eine Position Arbeitszeit/Anfahrt (zählt zu Arbeitskosten, nicht Material)?
    function isLabor(it) {
        const c = (it.category || '').toLowerCase();
        const n = (it.name || '').toLowerCase();
        return c.includes('arbeit') || c.includes('anfahrt') || c.includes('montage') || n.includes('arbeitsleistung') || n.includes('montage') || n.includes('anfahrt');
    }

    // Einkaufspreis je VERKAUFTER Einheit für eine Position – nutzt die zentrale
    // Logik (individueller Rabatt → Markenrabatt → fester EK, inkl. Rolle/Bund/
    // Stange -> Meter-Umrechnung). Vorher wurde hier bei Rollenware der EK der
    // GANZEN Rolle mit der Meter-Menge multipliziert -> massiv negativer Gewinn
    // in der Live-Kalkulation beim Angebot-Erstellen, obwohl die Angebotsliste
    // (offerProfit) bereits korrekt rechnete. Jetzt dieselbe zentrale Funktion.
    function purchaseUnitFor(it) {
        const m = materials.find(mm => String(mm.id) === String(it.materialId));
        if (m) {
            const r = window.ekPerSalesUnit(m, dealerDiscounts);
            if (r.known && r.ek > 0) return r.ek;
        }
        // Fallback: Markenrabatt direkt auf den Positionspreis (kein Material verknüpft)
        const brand = (it.manufacturer || m?.manufacturer || '').trim();
        const disc = dealerDiscounts && brand ? Number(dealerDiscounts[brand]) : 0;
        if (disc > 0) {
            const rate = disc > 1 ? disc / 100 : disc;
            return (Number(it.price) || 0) * (1 - rate);
        }
        return 0;
    }

    // Interne Kalkulation – NUR für dich, kommt nie ins PDF/Angebot.
    function renderInternalCalc() {
        const box = modal.querySelector('#offerCalcBox');
        if (!box) return;
        let materialEK = 0, materialVK = 0, laborVK = 0, unknownEK = 0;
        const warnRows = [];
        selected.forEach(it => {
            const qty = Number(it.quantity) || 0;
            const vkLine = (Number(it.price) || 0) * qty * (1 - (Number(it.discount) || 0) / 100);
            if (isLabor(it)) { laborVK += vkLine; return; }
            materialVK += vkLine;
            const ekUnit = purchaseUnitFor(it);
            if (ekUnit > 0) {
                const ekLine = ekUnit * qty;
                materialEK += ekLine;
                const profit = vkLine - ekLine;
                const margin = vkLine > 0 ? (profit / vkLine) * 100 : 0;
                if (vkLine < ekLine) warnRows.push(`⚠️ <strong>${escapeHtml(it.name)}</strong> wird UNTER Einkauf verkauft (${formatCurrency(vkLine)} < ${formatCurrency(ekLine)})`);
                else if (margin < 10) warnRows.push(`⚠️ <strong>${escapeHtml(it.name)}</strong>: nur ${margin.toFixed(1)}% Marge`);
            } else {
                unknownEK += vkLine;
            }
        });
        const totalVK = materialVK + laborVK;
        const materialProfit = materialVK - materialEK;
        // Gesamtrabatt (auf das ganze Angebot, separat von Positions-Rabatten) muss hier
        // ebenfalls abgezogen werden - sonst zeigt die Live-Kalkulation einen höheren
        // Gewinn als tatsächlich beim Speichern als netAfterDiscount herauskommt.
        const globalDiscRate = (offerSettings && offerSettings.discountEnabled) ? (Math.min(100, Math.max(0, Number(offerSettings.discountRate) || 0)) / 100) : 0;
        const totalVKAfterDiscount = totalVK * (1 - globalDiscRate);
        const totalProfit = totalVKAfterDiscount - materialEK; // Arbeit = reiner Ertrag (kein EK)
        const margin = totalVKAfterDiscount > 0 ? (totalProfit / totalVKAfterDiscount) * 100 : 0;
        const row = (label, val, cls = '') => `<div class="calc-row ${cls}"><span>${label}</span><span>${val}</span></div>`;
        let html = `<div class="calc-head">🔒 Interne Kalkulation <span>nur für dich – nicht im Angebot/PDF</span></div>`;
        html += row('Materialkosten (EK)', formatCurrency(materialEK));
        html += row('Materialverkauf (VK)', formatCurrency(materialVK));
        html += row('Materialgewinn', formatCurrency(materialProfit), materialProfit < 0 ? 'neg' : 'pos');
        if (globalDiscRate > 0) html += row(`Gesamtrabatt (${(globalDiscRate * 100).toFixed(1)}%)`, '- ' + formatCurrency(totalVK - totalVKAfterDiscount));
        html += row('Arbeitskosten (VK)', formatCurrency(laborVK));
        html += row('Reingewinn gesamt', formatCurrency(totalProfit), totalProfit < 0 ? 'neg' : 'pos');
        html += row('Gewinnmarge', `${margin.toFixed(1)} %`, margin < 10 ? 'neg' : 'pos');
        if (unknownEK > 0.005) html += `<div class="calc-note">Für ${formatCurrency(unknownEK)} Verkauf ist kein Einkaufspreis hinterlegt – trag ihn beim Material ein (Händlerrabatt), dann wird der Gewinn genauer.</div>`;
        if (warnRows.length) html += `<div class="calc-warn">${warnRows.join('<br>')}</div>`;
        box.innerHTML = html;
    }

    function matchesFilter(m) {
        if (activeFilter === 'Alle') return true;
        if (activeFilter.startsWith('cat:')) return m.category === activeFilter.slice(4);
        return m.manufacturer === activeFilter;
    }

    function renderQuickResults(query = '') {
        const q = query.toLowerCase().trim();
        const results = materials.filter(m => matchesFilter(m) && (!q || (m.name||'').toLowerCase().includes(q) || (m.manufacturer||'').toLowerCase().includes(q) || (m.category||'').toLowerCase().includes(q))).slice(0, 30);
        modal.querySelector('#offerQuickResultsBody').innerHTML = results.map(m => `
            <tr style="cursor:pointer;" data-add="${m.id}">
                <td>${m.image ? `<img src="${m.image}" style="width:28px;height:28px;object-fit:cover;border-radius:6px;">` : ''}</td>
                <td><strong>${escapeHtml(m.name)}</strong><div class="pos-meta" style="color:var(--text-muted);font-size:11px;">${escapeHtml(m.manufacturer||'')} ${escapeHtml(m.category||'')}</div></td>
                <td style="text-align:right;color:var(--accent);font-weight:700;">${formatCurrency(m.sellingPrice||0)}</td>
                <td><button class="btn btn-sm btn-primary" data-add-btn="${m.id}">+</button></td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:14px;">Keine Treffer</td></tr>';

        modal.querySelectorAll('[data-add-btn]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                addMaterial(parseId(btn.dataset.addBtn));
            });
        });
        modal.querySelectorAll('[data-add]').forEach(row => {
            row.addEventListener('click', () => addMaterial(parseId(row.dataset.add)));
        });
    }

    function addMaterial(materialId) {
        const m = materials.find(mm => mm.id === materialId);
        if (!m) return;
        const existing = selected.find(s => s.materialId === materialId);
        if (existing) { existing.quantity += 1; }
        else {
            // Rolle/Bund/Stange wird laut Materialstammdaten "pro Meter verkauft" - die
            // Position bekommt deshalb sofort den Meter-Verkaufspreis (wie im Projekt-
            // Material-Dialog via matUnitPrice), statt des vollen Rollen-Listenpreises.
            // Sonst startet die Position mit VK = Rollenpreis, während der EK bereits
            // pro Meter gerechnet wird -> Gewinn/Marge in der Live-Kalkulation viel zu hoch.
            const isRollGoods = ['Rolle', 'Bund', 'Stange'].includes(m.unit || '') && Number(m.bundleLength) > 0;
            const unit = isRollGoods ? 'm' : (m.unit || 'Stk');
            const price = isRollGoods ? (matUnitPrice(m, 'm') || 0) : (Number(m.sellingPrice) || 0);
            selected.push({
                materialId: m.id, name: m.name, unit, price,
                quantity: 1, manufacturer: m.manufacturer || '', articleNumber: m.articleNumber || '',
                category: m.category || '', description: m.description || '', image: m.image || ''
            });
        }
        renderPosList();
        updateSettingsFromUI();
        renderSummary();
        modal.querySelector('#offerMatSearch').value = '';
        modal.querySelector('#offerAutocomplete').style.display = 'none';
    }

    const searchInput = modal.querySelector('#offerMatSearch');
    const acList = modal.querySelector('#offerAutocomplete');
    searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        renderQuickResults(q);
        if (!q) { acList.style.display = 'none'; return; }
        const matches = materials.filter(m => matchesFilter(m) && (m.name||'').toLowerCase().includes(q)).slice(0, 8);
        if (matches.length === 0) { acList.style.display = 'none'; return; }
        acList.innerHTML = matches.map(m => `
            <div class="autocomplete-item" data-ac="${m.id}">
                <div><div class="ac-name">${escapeHtml(m.name)}</div><div class="ac-meta">${escapeHtml(m.manufacturer||'')} ${escapeHtml(m.category||'')}</div></div>
                <div class="ac-price">${formatCurrency(m.sellingPrice||0)}</div>
            </div>
        `).join('');
        acList.style.display = 'block';
        acList.querySelectorAll('[data-ac]').forEach(el => {
            el.addEventListener('click', () => addMaterial(parseId(el.dataset.ac)));
        });
    });
    modal.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !acList.contains(e.target)) acList.style.display = 'none';
    });

    modal.querySelectorAll('#offerFilterChips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            modal.querySelectorAll('#offerFilterChips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.filter;
            renderQuickResults(searchInput.value);
        });
    });

    // --- Raum-Auswahl: welche Räume kommen ins Angebot? ---
    async function reloadFromRooms(toast = true) {
        const pos = await buildPositionsFromProject();
        selected = pos;
        renderPosList();
        updateSettingsFromUI();
        renderSummary();
        renderRoomPicker();
        if (toast) showToast(pos.length ? `${pos.length} Position(en) aus ${activeRooms.size - (activeRooms.has('__none__') ? 1 : 0)} Raum/Räumen geladen.` : 'Keine Positionen in der Auswahl.', pos.length ? 'success' : 'info');
    }
    function renderRoomPicker() {
        const box = modal.querySelector('#offerRoomPicker');
        if (!box) return;
        const rooms = project.rooms || [];
        if (!rooms.length) { box.innerHTML = ''; return; }
        const allOn = rooms.every(r => activeRooms.has(String(r.id)));
        box.innerHTML = `
            <div class="offer-rooms-head">
                <span>Räume im Angebot</span>
                <button type="button" class="btn btn-sm btn-outline" id="offerRoomsAll">${allOn ? 'Alle abwählen' : 'Alle auswählen'}</button>
            </div>
            <div class="offer-rooms-chips">
                ${rooms.map(r => `<button type="button" class="room-chip ${activeRooms.has(String(r.id)) ? 'on' : ''}" data-room="${escapeHtml(String(r.id))}">
                    ${activeRooms.has(String(r.id)) ? '✓' : '＋'} ${escapeHtml(r.name || 'Raum')}
                </button>`).join('')}
                <button type="button" class="room-chip ${activeRooms.has('__none__') ? 'on' : ''}" data-room="__none__" title="Positionen ohne Raumzuordnung (z. B. Außengerät, Kleinmaterial)">
                    ${activeRooms.has('__none__') ? '✓' : '＋'} Projekt gesamt
                </button>
            </div>`;
        box.querySelectorAll('.room-chip').forEach(b => b.addEventListener('click', async () => {
            const k = b.dataset.room;
            if (activeRooms.has(k)) activeRooms.delete(k); else activeRooms.add(k);
            await reloadFromRooms(false);
        }));
        box.querySelector('#offerRoomsAll')?.addEventListener('click', async () => {
            if (allOn) { activeRooms = new Set(activeRooms.has('__none__') ? ['__none__'] : []); }
            else { activeRooms = new Set([...rooms.map(r => String(r.id)), ...(activeRooms.has('__none__') ? ['__none__'] : [])]); }
            await reloadFromRooms(false);
        });
    }

    modal.querySelector('#offerReloadProject')?.addEventListener('click', async () => {
        const pos = await buildPositionsFromProject();
        if (!pos.length) { showToast('Keine Materialien in der Raum-Auswahl gefunden.', 'info'); return; }
        selected = pos;
        renderPosList();
        updateSettingsFromUI();
        renderSummary();
        showToast(`${pos.length} Position(en) mit aktuellen Preisen neu geladen.`, 'success');
    });
    renderRoomPicker();
    // Positionen aus dem Projekt automatisch vorladen (aktuelle Preise)
    buildPositionsFromProject().then(pos => {
        if (pos.length && selected.length === 0) {
            selected = pos;
            renderPosList();
            updateSettingsFromUI();
            renderSummary();
            showToast(`${pos.length} Position(en) aus dem Projekt mit aktuellen Preisen geladen.`, 'success');
        }
    });
    renderQuickResults();
    renderPosList();
    renderSummary();
},

async exportOfferPDF(offerId) {
    if (typeof window.jspdf === 'undefined') {
        showToast('PDF-Bibliothek konnte nicht geladen werden.', 'error');
        return;
    }
    const offer = await db.get('offers', offerId);
    if (!offer) { showToast('Angebot nicht gefunden.', 'error'); return; }
    const project = await db.get('projects', offer.projectId);
    const customer = offer.customerId ? await db.get('customers', offer.customerId) : null;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 16;
    const accentColor = [37, 99, 235];
    const grayColor = [90, 95, 107];
    const lightGray = [238, 241, 245];

    const companyLogo = await getSetting('companyLogo', '');
    const companyPhone = await getSetting('companyPhone', '');
    const companyEmail = await getSetting('companyEmail', '');
    const companyWebsite = await getSetting('companyWebsite', '');
    const companyAddress = await getSetting('companyAddress', '');
    const companyUID = await getSetting('companyUID', '');
    const companyFirmenbuch = await getSetting('companyFirmenbuch', '');
    const companyBank = await getSetting('companyBank', '');
    const paymentTerms = await getSetting('paymentTerms', 'Zahlbar innerhalb 14 Tagen ohne Abzug.');

    let y = 18;

    if (companyLogo) {
        try {
            const imgProps = doc.getImageProperties(companyLogo);
            const logoH = 16;
            const logoW = (imgProps.width / imgProps.height) * logoH;
            doc.addImage(companyLogo, imgProps.fileType || 'PNG', marginX, y - 4, logoW, logoH);
        } catch(e) { console.warn('Logo-Fehler', e); }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    const contactLines = [companyPhone, companyEmail, companyWebsite, companyAddress].filter(Boolean);
    let cy = y - 4;
    contactLines.forEach(line => { doc.text(line, pageWidth - marginX, cy, { align: 'right' }); cy += 4.5; });

    y = Math.max(y + 18, cy + 4);
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.6);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 33, 35);
    doc.text('ANGEBOT', marginX, y);
    y += 9;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`Angebotsnummer: ${offer.offerNumber || offer.id}`, marginX, y); y += 5;
    doc.text(`Angebotsdatum: ${formatDate(offer.offerDate || offer.createdAt)}`, marginX, y); y += 5;

    if (offer.validUntilEnabled && offer.validUntil) {
        doc.text(`Gültig bis: ${formatDate(offer.validUntil)}`, marginX, y); y += 5;
    }
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 33, 35);
    doc.text('Kunde', marginX, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 64, 72);
    const custLines = [];
    if (customer) {
        custLines.push(`${customer.firstName || ''} ${customer.lastName || ''}`.trim());
        if (customer.company) custLines.push(customer.company);
    }
    if (project?.title) custLines.push(`Projekt: ${project.title}`);
    if (offer.siteAddress) custLines.push(`Baustelle: ${offer.siteAddress}`);
    if (offer.contactPerson) custLines.push(`Ansprechpartner: ${offer.contactPerson}`);
    if (offer.contactPhone) custLines.push(`Telefon: ${offer.contactPhone}`);
    if (offer.contactEmail) custLines.push(`E-Mail: ${offer.contactEmail}`);
    custLines.forEach(line => { doc.text(line, marginX, y); y += 4.8; });
    y += 6;

    const rows = (offer.positions || []).map((p, i) => {
        const disc = Number(p.discount) || 0;
        const lineTotal = p.price * p.quantity * (1 - disc / 100);
        return [
            String(i + 1),
            p.name || '',
            (p.description || (p.manufacturer ? `${p.manufacturer}${p.articleNumber ? ' · ' + p.articleNumber : ''}` : '')) + (disc > 0 ? ` (−${disc}% Rabatt)` : ''),
            String(p.quantity),
            p.unit || 'Stk',
            formatCurrency(p.price),
            formatCurrency(lineTotal)
        ];
    });

    doc.autoTable({
        startY: y,
        margin: { left: marginX, right: marginX },
        head: [['Pos', 'Artikel', 'Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']],
        body: rows,
        styles: { font: 'helvetica', fontSize: 8.8, cellPadding: 3, textColor: [40,44,50], lineColor: lightGray, lineWidth: 0.2 },
        headStyles: { fillColor: [26,29,35], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            3: { cellWidth: 16, halign: 'center' },
            4: { cellWidth: 16, halign: 'center' },
            5: { cellWidth: 26, halign: 'right' },
            6: { cellWidth: 26, halign: 'right' },
        },
        didDrawPage: () => drawFooter(),
    });

    let finalY = doc.lastAutoTable.finalY + 8;
    if (finalY > 250) { doc.addPage(); finalY = 20; }

    const boxW = 78;
    const boxX = pageWidth - marginX - boxW;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 64, 72);

    const _R2 = recomputeOffer(offer);
    const summaryRows = [];
    if (_R2.posDiscount > 0.005) {
        summaryRows.push(['Zwischensumme', formatCurrency(_R2.gross)]);
        summaryRows.push(['Positions-Rabatte', `- ${formatCurrency(_R2.posDiscount)}`]);
    }
    summaryRows.push(['Nettobetrag', formatCurrency(_R2.net)]);

    if (_R2.discountEnabled && _R2.globalDiscount > 0) {
        summaryRows.push([`Rabatt (${(_R2.rate*100).toFixed(1)}%)`, `- ${formatCurrency(_R2.globalDiscount)}`]);
    }
    if (offer.vatEnabled) {
        summaryRows.push([`MwSt. (${(_R2.vatRate*100).toFixed(0)}%)`, formatCurrency(_R2.vatAmount)]);
    }

    summaryRows.forEach(([label, val]) => {
        doc.text(label, boxX, finalY);
        doc.text(val, pageWidth - marginX, finalY, { align: 'right' });
        finalY += 6;
    });

    finalY += 2;
    doc.setFillColor(...accentColor);
    doc.roundedRect(boxX, finalY - 6, boxW, 13, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('Gesamtbetrag', boxX + 4, finalY + 2);
    doc.text(formatCurrency(_R2.total), pageWidth - marginX - 4, finalY + 2, { align: 'right' });
    finalY += 15;

    // Vereinbarter Preis (telefonisch abweichend vom Angebot)
    const _agreed2 = (offer.agreedPrice != null && offer.agreedPrice !== '') ? Number(offer.agreedPrice) : null;
    if (_agreed2 != null && Math.abs(_agreed2 - _R2.total) > 0.005) {
        doc.setFillColor(232, 245, 243);
        doc.roundedRect(boxX, finalY - 6, boxW, 13, 2.5, 2.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(...accentColor);
        doc.text('Vereinbarter Preis', boxX + 4, finalY + 2);
        doc.text(formatCurrency(_agreed2), pageWidth - marginX - 4, finalY + 2, { align: 'right' });
        doc.setTextColor(0, 0, 0);
    }

    function drawFooter() {
        const ph = doc.internal.pageSize.getHeight();
        const fy = ph - 20;
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.4);
        doc.line(marginX, fy, pageWidth - marginX, fy);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...grayColor);
        const left = [companyAddress, [companyPhone, companyEmail].filter(Boolean).join('  ·  '), companyWebsite].filter(Boolean).join('   |   ');
        const right = [companyUID ? `UID: ${companyUID}` : '', companyFirmenbuch ? `FB-Nr.: ${companyFirmenbuch}` : '', companyBank].filter(Boolean).join('   |   ');
        doc.text(left, marginX, fy + 5);
        doc.text(right, marginX, fy + 9.5);
        doc.text(paymentTerms, pageWidth - marginX, fy + 5, { align: 'right' });
    }
    drawFooter();

    doc.save(`${offer.offerNumber || ('Angebot_' + offer.id)}_${customer?.lastName || 'Kunde'}.pdf`);
    showToast('PDF exportiert.', 'success');
},

            async deleteOffer(id) {
                if (!await showConfirm('Angebot löschen?')) return;
                await db.delete('offers', id);
                showToast('Angebot gelöscht.', 'info');
                this.navigate('offers');
            },

            async exportMaterialsExcel() {
                if (typeof XLSX === 'undefined') { showToast('Excel-Bibliothek nicht verfügbar.', 'error'); return; }
                const materials = await db.getAll('materials');
                const wsData = [['Artikelname', 'Hersteller', 'Artikelnummer', 'Kategorie', 'Einheit', 'Einkaufspreis', 'Verkaufspreis', 'Notizen']];
                for (const m of materials) {
                    wsData.push([m.name, m.manufacturer, m.articleNumber, m.category, m.unit, m.purchasePrice, m.sellingPrice, m.notes]);
                }
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Materialien');
                XLSX.writeFile(wb, 'KTM_Materialliste.xlsx');
                showToast('Material-Excel exportiert.', 'success');
            },

            async importMaterialsExcel() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx,.xls';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const data = await file.arrayBuffer();
                    const wb = XLSX.read(data);
                    const sheetName = wb.SheetNames.find(n => /material/i.test(n)) || wb.SheetNames[0];
                    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

                    const existing = await db.getAll('materials');
                    const existingNames = new Set(existing.map(m => m.name));
                    let imported = 0, skipped = 0;

                    for (let i = 1; i < rows.length; i++) {
                        let name, manufacturer, articleNumber, category, unit, purchasePrice, sellingPrice, notes;
                        name = rows[i][0]; manufacturer = rows[i][1]; articleNumber = rows[i][2]; category = rows[i][3]; unit = rows[i][4]; purchasePrice = rows[i][5]; sellingPrice = rows[i][6]; notes = rows[i][7];

                        if (name) {
                            if (existingNames.has(name.toString())) { skipped++; continue; }
                            await db.add('materials', {
                                name: String(name),
                                manufacturer: String(manufacturer || ''),
                                articleNumber: String(articleNumber || ''),
                                category: String(category || ''),
                                unit: String(unit || 'Stk'),
                                purchasePrice: parseFloat(purchasePrice) || 0,
                                sellingPrice: parseFloat(sellingPrice) || 0,
                                notes: String(notes || ''),
                                createdAt: new Date().toISOString(),
                            });
                            existingNames.add(String(name));
                            imported++;
                        }
                    }
                    showToast(`${imported} Artikel importiert${skipped ? `, ${skipped} übersprungen` : ''}`, 'success');
                    this.navigate('materials');
                };
                input.click();
            },

            async exportOffersExcel() {
                if (typeof XLSX === 'undefined') { showToast('Excel-Bibliothek nicht verfügbar.', 'error'); return; }
                const offers = await db.getAll('offers');
                const wsData = [['Angebotsnummer', 'Projekt', 'Summe', 'Status', 'Datum']];
                for (const o of offers) {
                    const proj = await db.get('projects', o.projectId);
                    wsData.push([o.offerNumber || o.id, proj?.title || '', o.totalPrice, o.status, formatDate(o.createdAt)]);
                }
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Angebote');
                XLSX.writeFile(wb, 'KTM_Angebote.xlsx');
                showToast('Angebote exportiert.', 'success');
            },

            async exportAllExcel() {
                if (typeof XLSX === 'undefined') { showToast('Excel-Bibliothek nicht verfügbar.', 'error'); return; }
                const data = await db.exportAllData();
                const wb = XLSX.utils.book_new();

                const custData = [['ID','Vorname','Nachname','Firma','Straße','PLZ','Ort','Telefon','Status']];
                for (const c of data.customers) custData.push([c.id,c.firstName,c.lastName,c.company,c.street,c.zip,c.city,c.phone,c.status]);
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(custData), 'Kunden');

                const projData = [['ID','Titel','Kunden-ID','Status','Notizen','Datum']];
                for (const p of data.projects) projData.push([p.id,p.title,p.customerId,p.status,p.notes,formatDate(p.createdAt)]);
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projData), 'Projekte');

                const matData = [['ID','Name','Hersteller','Artikelnummer','Kategorie','Einheit','Einkaufspreis','Verkaufspreis']];
                for (const m of data.materials) matData.push([m.id,m.name,m.manufacturer,m.articleNumber,m.category,m.unit,m.purchasePrice,m.sellingPrice]);
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matData), 'Materialien');

                XLSX.writeFile(wb, 'KTM_KomplettExport.xlsx');
                showToast('Komplett-Export erstellt.', 'success');
            },

            async importAllExcel() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx,.xls';
                input.onchange = async (e) => {
                    if (!confirm('Achtung: Alle vorhandenen Daten werden überschrieben! Fortfahren?')) return;
                    const file = e.target.files[0];
                    if (!file) return;
                    const data = await file.arrayBuffer();
                    const wb = XLSX.read(data);
                    const importData = { customers: [], projects: [], materials: [] };

                    if (wb.SheetNames.includes('Kunden')) {
                        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Kunden'], { header: 1 });
                        for (let i = 1; i < rows.length; i++) {
                            const [id, firstName, lastName, company, street, zip, city, phone, status] = rows[i];
                            importData.customers.push({ id, firstName, lastName, company, street, zip, city, phone, status, createdAt: new Date().toISOString() });
                        }
                    }
                    if (wb.SheetNames.includes('Materialien')) {
                        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Materialien'], { header: 1 });
                        for (let i = 1; i < rows.length; i++) {
                            const [id, name, manufacturer, articleNumber, category, unit, purchasePrice, sellingPrice] = rows[i];
                            importData.materials.push({ name, manufacturer, articleNumber, category, unit, purchasePrice: parseFloat(purchasePrice)||0, sellingPrice: parseFloat(sellingPrice)||0, createdAt: new Date().toISOString() });
                        }
                    }
                    await db.clear('customers');
                    await db.clear('materials');
                    for (const c of importData.customers) await db.add('customers', c);
                    for (const m of importData.materials) await db.add('materials', m);
                    showToast('Daten importiert.', 'success');
                    this.navigate('dashboard');
                };
                input.click();
            },

            async createBackup() {
                const data = await db.exportAllData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `KTM_Backup_${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Backup erstellt.', 'success');
            },

            async restoreBackup() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    if (!confirm('Achtung: Alle vorhandenen Daten werden überschrieben! Fortfahren?')) return;
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        await db.importAllData(data);
                        showToast('Backup wiederhergestellt.', 'success');
                        this.navigate('dashboard');
                    } catch (err) {
                        console.error('Backup-Wiederherstellung fehlgeschlagen:', err);
                        showToast('Ungültige Backup-Datei.', 'error');
                    }
                };
                input.click();
            },

            async openCompanySettings() {
                const companyName = await getSetting('companyName');
                const companyLogo = await getSetting('companyLogo');
                const companyPhone = await getSetting('companyPhone');
                const companyEmail = await getSetting('companyEmail');
                const companyWebsite = await getSetting('companyWebsite');
                const companyAddress = await getSetting('companyAddress');
                const companyUID = await getSetting('companyUID');
                const companyFirmenbuch = await getSetting('companyFirmenbuch');
                const companyBank = await getSetting('companyBank');
                let logoData = companyLogo;

                const modal = showModal(
                    'Firmendaten',
                    `
                        <div class="form-group"><label>Firmenlogo (für PDF-Kopfbereich)</label>
                            <input type="file" id="setLogo" accept="image/*">
                            <div id="setLogoPreview" style="margin-top:8px;">${logoData ? `<img src="${logoData}" style="max-height:50px;">` : ''}</div>
                        </div>
                        <div class="form-group"><label>Firmenname (intern, erscheint nicht groß im PDF)</label><input type="text" id="setCompanyName" value="${escapeHtml(companyName)}"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Telefon</label><input type="text" id="setPhone" value="${escapeHtml(companyPhone)}"></div>
                            <div class="form-group"><label>E-Mail</label><input type="email" id="setEmail" value="${escapeHtml(companyEmail)}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Website</label><input type="text" id="setWebsite" value="${escapeHtml(companyWebsite)}"></div>
                            <div class="form-group"><label>UID-Nummer</label><input type="text" id="setUID" value="${escapeHtml(companyUID)}"></div>
                        </div>
                        <div class="form-group"><label>Adresse (für PDF)</label><textarea id="setCompanyAddress" rows="2">${escapeHtml(companyAddress)}</textarea></div>
                        <div class="form-row">
                            <div class="form-group"><label>Firmenbuchnummer</label><input type="text" id="setFirmenbuch" value="${escapeHtml(companyFirmenbuch)}"></div>
                            <div class="form-group"><label>Bankverbindung (IBAN/BIC)</label><input type="text" id="setBank" value="${escapeHtml(companyBank)}"></div>
                        </div>
                    `,
                    async (overlay) => {
                        await setSetting('companyLogo', logoData || '');
                        await setSetting('companyName', overlay.querySelector('#setCompanyName').value.trim());
                        await setSetting('companyPhone', overlay.querySelector('#setPhone').value.trim());
                        await setSetting('companyEmail', overlay.querySelector('#setEmail').value.trim());
                        await setSetting('companyWebsite', overlay.querySelector('#setWebsite').value.trim());
                        await setSetting('companyUID', overlay.querySelector('#setUID').value.trim());
                        await setSetting('companyAddress', overlay.querySelector('#setCompanyAddress').value.trim());
                        await setSetting('companyFirmenbuch', overlay.querySelector('#setFirmenbuch').value.trim());
                        await setSetting('companyBank', overlay.querySelector('#setBank').value.trim());
                        overlay.remove();
                        showToast('Firmendaten gespeichert.', 'success');
                    }
                );
                modal.querySelector('#setLogo').addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        logoData = ev.target.result;
                        modal.querySelector('#setLogoPreview').innerHTML = `<img src="${logoData}" style="max-height:50px;">`;
                    };
                    reader.readAsDataURL(file);
                });
            },

            async openPDFSettings() {
                const paymentTerms = await getSetting('paymentTerms', 'Zahlbar innerhalb 14 Tagen ohne Abzug.');
                const modal = showModal(
                    'PDF-Einstellungen',
                    `
                        <div class="form-group"><label>Zahlungsbedingungen (Footer)</label><textarea id="setPaymentTerms" rows="3">${escapeHtml(paymentTerms)}</textarea></div>
                    `,
                    async (overlay) => {
                        await setSetting('paymentTerms', overlay.querySelector('#setPaymentTerms').value.trim());
                        overlay.remove();
                        showToast('PDF-Einstellungen gespeichert.', 'success');
                    }
                );
            },

            async openFieldSettings() {
                showToast('Felder können im Code erweitert werden. Dies ist ein Profi-Feature.', 'info');
            },

            async resetAllData() {
                if (!confirm('ALLE DATEN UNWIDERRUFLICH LÖSCHEN? Dies kann nicht rückgängig gemacht werden!')) return;
                if (!confirm('Wirklich ALLES löschen?')) return;
                const stores = ['customers', 'projects', 'rooms', 'images', 'materials', 'offers', 'orders', 'projectMaterials', 'invoices', 'events', 'settings'];
                for (const store of stores) await db.clear(store);
                showToast('Alle Daten gelöscht.', 'info');
                this.navigate('dashboard');
            }
        };

        async function generateOfferNumber() {
            const year = new Date().getFullYear();
            const counterKey = `offerCounter_${year}`;
            let counter = parseInt(await getSetting(counterKey, '0')) || 0;
            counter += 1;
            await setSetting(counterKey, String(counter));
            return `A-${year}-${String(counter).padStart(4, '0')}`;
        }

        let appStarted = false;
        let startupWatchdog = null;

        // Die App startet NICHT mehr automatisch beim Laden, sondern erst wenn
        // das Auth-Modul (js/00-auth.js) einen angemeldeten Benutzer bestätigt.
        // Es ruft dann window.__ktmStartApp() auf.
        window.__ktmStartApp = function () {
            if (window.__ktmAppBooted) return; // nur einmal starten
            window.__ktmAppBooted = true;
            // Watchdog erst jetzt starten (nicht während der Anmeldung)
            startupWatchdog = setTimeout(() => {
                if (!appStarted) {
                    app.showSplashError('Der Start dauert ungewöhnlich lange. Möglicherweise ist die Datenbank blockiert oder es liegt ein Verbindungsproblem vor.');
                }
            }, 8000);
            Object.assign(app, ktmV2Extensions);
            app.init().then(() => {
                appStarted = true;
                clearTimeout(startupWatchdog);
            }).catch((err) => {
                appStarted = true;
                clearTimeout(startupWatchdog);
                console.error('Initialisierung fehlgeschlagen:', err);
                app.showSplashError(err && err.message ? err.message : 'Unbekannter Fehler beim Start der Anwendung.');
            });
        };

        if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').catch((err) => {
                    console.warn('Service Worker konnte nicht registriert werden:', err);
                });
            });
        }

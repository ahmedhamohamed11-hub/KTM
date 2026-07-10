

        // Besichtigung: NUR allgemeine Projektdaten (raumbezogene Technik ist beim Raum!)
        const SURVEY_FIELDS = [
            { key: 'appointment', label: 'Termin', type: 'date', group: 'Termin & Kontakt' },
            { key: 'contactPerson', label: 'Ansprechpartner', type: 'text', placeholder: 'Name vor Ort', group: 'Termin & Kontakt' },
            { key: 'contactPhone', label: 'Telefonnummer', type: 'text', placeholder: '+43 ...', group: 'Termin & Kontakt' },
            { key: 'objectType', label: 'Objektart', type: 'select', options: ['Einfamilienhaus', 'Wohnung', 'Mehrfamilienhaus', 'Büro', 'Geschäft', 'Restaurant', 'Praxis', 'Halle / Gewerbe', 'Serverraum', 'Sonstiges'], group: 'Objekt & Zugang' },
            { key: 'arrival', label: 'Anfahrt', type: 'text', placeholder: 'z. B. 25 min, Innenhof', group: 'Objekt & Zugang' },
            { key: 'parking', label: 'Parkmöglichkeit', type: 'text', placeholder: 'z. B. Kurzparkzone, Hof', group: 'Objekt & Zugang' },
            { key: 'access', label: 'Zugang', type: 'text', placeholder: 'z. B. Schlüssel bei Hausmeister, Lift vorhanden', group: 'Objekt & Zugang' },
            { key: 'specialFeatures', label: 'Besonderheiten', type: 'textarea', group: 'Hinweise' },
            { key: 'remarks', label: 'Allgemeine Notizen', type: 'textarea', group: 'Hinweise' }
        ];
        const SURVEY_GROUP_ICONS = { 'Termin & Kontakt': '📅', 'Objekt & Zugang': '🏠', 'Hinweise': '📝' };

        // Technische Daten JE RAUM - der Raum ist die vollständige technische Einheit
        const ROOM_TECH_FIELDS = [
            // Innengerät
            { key: 'devManufacturer', label: 'Hersteller', type: 'select', options: ['Daikin', 'Mitsubishi', 'Panasonic', 'LG', 'Samsung', 'Toshiba', 'Fujitsu', 'Gree', 'Midea', 'Haier', 'Sonstige'], group: 'Innengerät' },
            { key: 'devModel', label: 'Modell', type: 'text', learn: 'devModel', placeholder: 'z. B. FTXM25R', group: 'Innengerät' },
            { key: 'devCapacity', label: 'Leistung', type: 'number', unit: 'kW', group: 'Innengerät' },
            { key: 'devWallMount', label: 'Wandmontage', type: 'bool', group: 'Innengerät' },
            { key: 'devCeilingMount', label: 'Deckenmontage', type: 'bool', group: 'Innengerät' },
            { key: 'devPosition', label: 'Position', type: 'text', learn: 'devPosition', placeholder: 'z. B. über Tür, Südwand', group: 'Innengerät' },
            // Leitungen
            { key: 'pipeLength', label: 'Rohrlänge', type: 'number', unit: 'm', group: 'Leitungen' },
            { key: 'pipeDimension', label: 'Rohrdimension', type: 'text', learn: 'pipeDimension', placeholder: 'z. B. 1/4"+1/2"', group: 'Leitungen' },
            { key: 'insulation', label: 'Isolierung', type: 'text', learn: 'insulation', placeholder: 'z. B. 9 mm', group: 'Leitungen' },
            { key: 'cableDuct', label: 'Kabelkanal', type: 'number', unit: 'm', group: 'Leitungen' },
            { key: 'powerCable', label: 'Stromkabel Typ', type: 'text', learn: 'powerCable', placeholder: 'z. B. NYM 5×2,5', group: 'Leitungen' },
            { key: 'powerCableLength', label: 'Stromkabellänge', type: 'number', unit: 'm', group: 'Leitungen' },
            { key: 'commCable', label: 'Kommunikationskabel Typ', type: 'text', learn: 'commCable', placeholder: 'z. B. 4×0,75 mm²', group: 'Leitungen' },
            { key: 'commCableLength', label: 'Kommunikationskabellänge', type: 'number', unit: 'm', group: 'Leitungen' },
            { key: 'condensateLine', label: 'Kondensatleitung', type: 'number', unit: 'm', group: 'Leitungen' },
            { key: 'condensatePump', label: 'Kondensatpumpe', type: 'bool', group: 'Leitungen' },
            // Montage
            { key: 'coreDrills', label: 'Kernbohrungen', type: 'number', unit: 'Stk', group: 'Montage' },
            { key: 'wallMaterial', label: 'Wandmaterial', type: 'select', options: ['Ziegel', 'Beton', 'Holz', 'Rigips', 'Vollwärmeschutz', 'Sonstiges'], group: 'Montage' },
            { key: 'outdoorMounting', label: 'Außengerät-Aufstellung', type: 'select', options: ['Big Foot', 'Wandkonsole', 'Fundament', 'Balkon', 'Dach', 'Garten', 'Sonstiges'], group: 'Montage' },
            { key: 'scaffold', label: 'Gerüst notwendig', type: 'bool', group: 'Montage' },
            { key: 'liftPlatform', label: 'Hebebühne notwendig', type: 'bool', group: 'Montage' },
            { key: 'roofMounting', label: 'Dachmontage', type: 'bool', group: 'Montage' },
            { key: 'climbingAid', label: 'Steighilfe', type: 'bool', group: 'Montage' },
            { key: 'wallBracket', label: 'Wandkonsole', type: 'bool', group: 'Montage' },
            { key: 'bigFoot', label: 'Big Foot', type: 'bool', group: 'Montage' },
            { key: 'vibrationDampers', label: 'Schwingungsdämpfer', type: 'bool', group: 'Montage' },
            // Elektrik
            { key: 'fiProtection', label: 'FI vorhanden', type: 'bool', group: 'Elektrik' },
            { key: 'fuse', label: 'Absicherung', type: 'text', placeholder: 'z. B. 16 A', group: 'Elektrik' },
            { key: 'powerSupply', label: 'Spannungsversorgung', type: 'select', options: ['230 V', '400 V'], group: 'Elektrik' },
            { key: 'socketAvailable', label: 'Steckdose vorhanden', type: 'bool', group: 'Elektrik' },
            { key: 'supplyLineNeeded', label: 'Zuleitung notwendig', type: 'bool', group: 'Elektrik' },
            // Hinweise
            { key: 'remarks', label: 'Bemerkungen zu diesem Raum', type: 'textarea', group: 'Hinweise' }
        ];
        const ROOM_GROUP_ICONS = { 'Innengerät': '❄', 'Leitungen': '🧵', 'Montage': '🔩', 'Elektrik': '⚡', 'Hinweise': '📝' };

        // Anzeige alter Projekt-Besichtigungsdaten (vor der Umstellung erfasst)
        const LEGACY_SURVEY_LABELS = { pipeLength: 'Rohrlänge (alt)', pipeDimension: 'Rohrdimension (alt)', insulation: 'Isolierung (alt)', cableDuct: 'Kabelkanal (alt)', powerCable: 'Stromkabel (alt)', powerCableLength: 'Stromkabellänge (alt)', commCable: 'Komm.-Kabel (alt)', commCableLength: 'Komm.-Kabellänge (alt)', condensateLine: 'Kondensatleitung (alt)', condensatePump: 'Kondensatpumpe (alt)', coreDrills: 'Kernbohrungen (alt)', wallMaterial: 'Wandmaterial (alt)', outdoorMounting: 'Außengerät (alt)', fiProtection: 'FI (alt)', fuse: 'Absicherung (alt)', scaffold: 'Gerüst (alt)', liftPlatform: 'Hebebühne (alt)', roofMounting: 'Dachmontage (alt)', climbingAid: 'Steighilfe (alt)', powerSupply: 'Spannung (alt)', socketAvailable: 'Steckdose (alt)', supplyLineNeeded: 'Zuleitung (alt)' };

        // Generischer Feld-Renderer für Technik-/Besichtigungsfelder
        function techFieldInput(f, v, prefix) {
            const id = prefix + f.key;
            if (f.type === 'bool') {
                return `<label class="switch-row"><span>${escapeHtml(f.label)}</span><span class="switch"><input type="checkbox" id="${id}" ${v === true ? 'checked' : ''}><span class="slider"></span></span></label>`;
            }
            if (f.type === 'select') {
                return `<div class="form-group"><label>${escapeHtml(f.label)}</label><select id="${id}"><option value="">–</option>${f.options.map(o => `<option value="${escapeHtml(o)}" ${v === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}</select></div>`;
            }
            if (f.type === 'textarea') {
                return `<div class="form-group" style="grid-column:1/-1;"><label>${escapeHtml(f.label)}</label><textarea id="${id}" rows="3">${escapeHtml(v || '')}</textarea></div>`;
            }
            if (f.type === 'number') {
                return `<div class="form-group"><label>${escapeHtml(f.label)}${f.unit ? ' <small>(' + f.unit + ')</small>' : ''}</label><input type="number" inputmode="decimal" step="any" min="0" id="${id}" value="${v ?? ''}"></div>`;
            }
            if (f.type === 'date') {
                return `<div class="form-group"><label>${escapeHtml(f.label)}</label><input type="date" id="${id}" value="${escapeHtml(v || '')}"></div>`;
            }
            const listAttr = f.learn ? ` list="dl_${f.learn}"` : '';
            const dl = f.learn ? learnedDatalist(f.learn, 'dl_' + f.learn) : '';
            return `<div class="form-group"><label>${escapeHtml(f.label)}</label><input type="text" id="${id}"${listAttr} value="${escapeHtml(v || '')}" placeholder="${escapeHtml(f.placeholder || '')}">${dl}</div>`;
        }
        function techFieldRead(f, overlay, prefix) {
            const el = overlay.querySelector('#' + prefix + f.key);
            if (!el) return undefined;
            if (f.type === 'bool') return el.checked;
            let v = el.value;
            if (f.type === 'number') v = v === '' ? '' : parseFloat(String(v).replace(',', '.'));
            return v;
        }

        // Raumnamen-Vorschläge (Autovervollständigung, eigene Namen weiter möglich)
        const ROOM_NAMES = ['Wohnzimmer','Schlafzimmer','Kinderzimmer','Küche','Esszimmer','Büro','Arbeitszimmer','Wintergarten','Keller','Garage','Dachboden','Flur','Bad','WC','Gästezimmer','Serverraum','Lager','Werkstatt','Geschäft','Restaurant','Praxis','Technikraum','Besprechungsraum','Verkaufsraum','Kühlraum','Tiefkühlraum'];
        // Innengeräte-Marken
        const BRANDS = ['Daikin','Mitsubishi','Panasonic','LG','Samsung','Toshiba','Fujitsu','Gree','Midea','Haier','Sonstige'];
        // Projekttitel-Vorschläge (werden mit Kundennamen kombiniert)
        const PROJECT_TITLE_TYPES = ['Klimaanlage','Single-Split','Multi-Split','Dual-Split','VRF-Anlage','Wärmepumpe','Lüftungsanlage','Kühlraum','Service','Wartung','Reparatur','Besichtigung','Angebot'
        ];

        // ============================================================
        // ============ ANPASSUNGEN (Kategorien, Felder, Vorlagen) ====
        // ============================================================
        const CAT_PALETTE = ['#12808f', '#178a62', '#c07b2f', '#5b63d3', '#c24747', '#7a5cc4', '#2b8a9e', '#8a6d3b', '#3d7a4f', '#a05276', '#4a6fa5', '#767676', '#b3541e', '#1f7a8c'];
        let _ktmCats = null, _ktmFields = null, _ktmTemplates = null;

        async function loadCustomization() {
            try {
                const catsRaw = await getSetting('materialCategories', '');
                _ktmCats = catsRaw ? JSON.parse(catsRaw) : null;
            } catch (e) { _ktmCats = null; }
            try {
                const fieldsRaw = await getSetting('customFields', '');
                _ktmFields = fieldsRaw ? JSON.parse(fieldsRaw) : [];
            } catch (e) { _ktmFields = []; }
            try {
                const tplRaw = await getSetting('fieldTemplates', '');
                _ktmTemplates = tplRaw ? JSON.parse(tplRaw) : [];
            } catch (e) { _ktmTemplates = []; }
        }

        function getMaterialCategories() {
            if (_ktmCats && Array.isArray(_ktmCats) && _ktmCats.length) return _ktmCats;
            const base = (typeof MATERIAL_CATEGORIES !== 'undefined' ? MATERIAL_CATEGORIES : ['Sonstiges']);
            return base.map((name, i) => ({ name, color: CAT_PALETTE[i % CAT_PALETTE.length] }));
        }
        function catColor(name) {
            const c = getMaterialCategories().find(x => x.name === name);
            return c?.color || '#767676';
        }
        async function saveMaterialCategories(cats) {
            _ktmCats = cats;
            await setSetting('materialCategories', JSON.stringify(cats));
        }
        function getCustomFields(entity) {
            return (_ktmFields || []).filter(f => f.entity === entity).sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        async function saveCustomFields(fields) {
            _ktmFields = fields;
            await setSetting('customFields', JSON.stringify(fields));
        }
        async function saveFieldTemplates(tpls) {
            _ktmTemplates = tpls;
            await setSetting('fieldTemplates', JSON.stringify(tpls));
        }

        const FIELD_TYPES = [
            { v: 'text', l: 'Text' }, { v: 'number', l: 'Zahl' }, { v: 'date', l: 'Datum' },
            { v: 'select', l: 'Dropdown' }, { v: 'multiselect', l: 'Mehrfachauswahl' }, { v: 'boolean', l: 'Ja / Nein' }
        ];
        const FIELD_ENTITIES = [
            { v: 'projects', l: 'Projekte' }, { v: 'customers', l: 'Kunden' },
            { v: 'materials', l: 'Materialien' }, { v: 'orders', l: 'Bestellungen' }
        ];
        let fieldsActiveEntity = 'projects';
        let _dragFieldId = null;

        // ============================================================
        // ============ SEITE: FELDER & KATEGORIEN ====================
        // ============================================================
        function renderFields() {
            (async () => {
                await loadCustomization();
                const cats = getMaterialCategories();
                const fields = getCustomFields(fieldsActiveEntity);
                const tpls = (_ktmTemplates || []).filter(t => t.entity === fieldsActiveEntity);

                contentArea.innerHTML = `
                    <div class="panel" style="margin-bottom:18px;">
                        <div class="panel-title">🎨 Materialkategorien</div>
                        <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Eigene Kategorien mit Farbe – werden in Materialliste und Auswahlfeldern verwendet und auf alle Geräte synchronisiert.</div>
                        <div id="catList">
                            ${cats.map((c, i) => `
                                <div class="field-row" data-cat="${i}">
                                    <input type="color" value="${escapeHtml(c.color || '#12808f')}" class="cat-color" style="width:42px;height:36px;padding:2px;cursor:pointer;">
                                    <input type="text" value="${escapeHtml(c.name)}" class="cat-name" style="flex:1;">
                                    <button class="btn btn-sm btn-danger cat-del">${icon('trash')}</button>
                                </div>
                            `).join('')}
                        </div>
                        <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
                            <button class="btn btn-outline btn-sm" id="catAdd">${icon('plus')} Kategorie</button>
                            <button class="btn btn-primary btn-sm" id="catSave">Kategorien speichern</button>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="panel-title">🔧 Zusatzfelder</div>
                        <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Eigene Felder pro Bereich – mit Typ, Einheit, Pflichtfeld und Standardwert. Reihenfolge per Ziehen oder Pfeilen ändern. Die Werte werden pro Datensatz gespeichert und vollständig synchronisiert.</div>
                        <div class="fields-tabs">
                            ${FIELD_ENTITIES.map(e => `<button class="tab-btn ${fieldsActiveEntity === e.v ? 'active' : ''}" data-ent="${e.v}">${e.l}</button>`).join('')}
                        </div>
                        <div id="fieldList" style="margin-top:14px;">
                            ${fields.length === 0 ? '<div class="empty-note">Noch keine Felder für diesen Bereich.</div>' : fields.map(f => `
                                <div class="field-row" draggable="true" data-fid="${escapeHtml(f.id)}"
                                     ondragstart="_dragFieldId='${escapeHtml(f.id)}'"
                                     ondragover="event.preventDefault();this.classList.add('drag-over')"
                                     ondragleave="this.classList.remove('drag-over')"
                                     ondrop="this.classList.remove('drag-over');app.reorderField('${escapeHtml(f.id)}')">
                                    <span class="drag-handle" title="Ziehen zum Sortieren">⋮⋮</span>
                                    <div style="flex:1;min-width:0;">
                                        <strong>${escapeHtml(f.label)}</strong>${f.required ? ' <span style="color:var(--danger);">*</span>' : ''}
                                        <div style="font-size:12px;color:var(--text-muted);">${FIELD_TYPES.find(t => t.v === f.type)?.l || f.type}${f.unit ? ' · ' + escapeHtml(f.unit) : ''}${f.options?.length ? ' · ' + escapeHtml(f.options.join(', ')) : ''}${f.defaultValue !== undefined && f.defaultValue !== '' ? ' · Standard: ' + escapeHtml(String(f.defaultValue)) : ''}</div>
                                    </div>
                                    <button class="btn btn-sm btn-outline" onclick="app.moveField('${escapeHtml(f.id)}', -1)">↑</button>
                                    <button class="btn btn-sm btn-outline" onclick="app.moveField('${escapeHtml(f.id)}', 1)">↓</button>
                                    <button class="btn btn-sm btn-outline" onclick="app.openFieldModal('${fieldsActiveEntity}', '${escapeHtml(f.id)}')">${icon('edit')}</button>
                                    <button class="btn btn-sm btn-danger" onclick="app.deleteField('${escapeHtml(f.id)}')">${icon('trash')}</button>
                                </div>
                            `).join('')}
                        </div>
                        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;align-items:center;">
                            <button class="btn btn-primary btn-sm" onclick="app.openFieldModal('${fieldsActiveEntity}')">${icon('plus')} Feld</button>
                            <div class="toolbar-spacer"></div>
                            ${tpls.length ? `<select class="filter-select" id="tplSelect"><option value="">Vorlage wählen...</option>${tpls.map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`).join('')}</select>
                            <button class="btn btn-outline btn-sm" id="tplApply">Anwenden</button>
                            <button class="btn btn-outline btn-sm" id="tplDelete">Vorlage löschen</button>` : ''}
                            <button class="btn btn-outline btn-sm" id="tplSave">Als Vorlage speichern</button>
                        </div>
                    </div>
                `;

                // Tabs
                contentArea.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => {
                    fieldsActiveEntity = b.dataset.ent;
                    renderFields();
                }));

                // Kategorien
                document.getElementById('catAdd').addEventListener('click', () => {
                    const list = document.getElementById('catList');
                    const div = document.createElement('div');
                    div.className = 'field-row';
                    div.innerHTML = `<input type="color" value="${CAT_PALETTE[list.children.length % CAT_PALETTE.length]}" class="cat-color" style="width:42px;height:36px;padding:2px;cursor:pointer;">
                        <input type="text" value="" placeholder="Neue Kategorie" class="cat-name" style="flex:1;">
                        <button class="btn btn-sm btn-danger cat-del">${icon('trash')}</button>`;
                    list.appendChild(div);
                    div.querySelector('.cat-del').addEventListener('click', () => div.remove());
                    div.querySelector('.cat-name').focus();
                });
                contentArea.querySelectorAll('.cat-del').forEach(b => b.addEventListener('click', () => b.closest('.field-row').remove()));
                document.getElementById('catSave').addEventListener('click', async () => {
                    const cats2 = [...document.querySelectorAll('#catList .field-row')].map(r => ({
                        name: r.querySelector('.cat-name').value.trim(),
                        color: r.querySelector('.cat-color').value
                    })).filter(c => c.name);
                    if (cats2.length === 0) { showToast('Mindestens eine Kategorie behalten.', 'error'); return; }
                    await saveMaterialCategories(cats2);
                    showToast('Kategorien gespeichert.', 'success');
                    renderFields();
                });

                // Vorlagen
                document.getElementById('tplSave').addEventListener('click', async () => {
                    const name = prompt('Name der Vorlage (z. B. "Splitklima", "Kühlraum", "Wärmepumpe"):');
                    if (!name) return;
                    const tpls2 = (_ktmTemplates || []).filter(t => !(t.entity === fieldsActiveEntity && t.name === name));
                    tpls2.push({ name, entity: fieldsActiveEntity, fields: getCustomFields(fieldsActiveEntity).map(f => ({ ...f })) });
                    await saveFieldTemplates(tpls2);
                    showToast(`Vorlage "${name}" gespeichert.`, 'success');
                    renderFields();
                });
                document.getElementById('tplApply')?.addEventListener('click', async () => {
                    const name = document.getElementById('tplSelect').value;
                    if (!name) return;
                    const tpl = (_ktmTemplates || []).find(t => t.entity === fieldsActiveEntity && t.name === name);
                    if (!tpl) return;
                    const others = (_ktmFields || []).filter(f => f.entity !== fieldsActiveEntity);
                    const applied = tpl.fields.map((f, i) => ({ ...f, id: f.id || generateUUID(), entity: fieldsActiveEntity, order: i }));
                    await saveCustomFields([...others, ...applied]);
                    showToast(`Vorlage "${name}" angewendet.`, 'success');
                    renderFields();
                });
                document.getElementById('tplDelete')?.addEventListener('click', async () => {
                    const name = document.getElementById('tplSelect').value;
                    if (!name) return;
                    if (!confirm(`Vorlage "${name}" löschen?`)) return;
                    await saveFieldTemplates((_ktmTemplates || []).filter(t => !(t.entity === fieldsActiveEntity && t.name === name)));
                    renderFields();
                });
            })();
        }

        // Eingabe-Element für ein Zusatzfeld erzeugen
        function customFieldInput(f, value) {
            const val = value !== undefined && value !== null ? value : (f.defaultValue !== undefined ? f.defaultValue : '');
            const req = f.required ? 'data-required="1"' : '';
            const unitSuffix = f.unit ? `<span style="align-self:center;color:var(--text-muted);font-size:13px;white-space:nowrap;">${escapeHtml(f.unit)}</span>` : '';
            switch (f.type) {
                case 'number':
                    return `<div style="display:flex;gap:8px;"><input type="number" inputmode="decimal" step="any" class="cf-input" data-cf="${escapeHtml(f.id)}" ${req} value="${escapeHtml(String(val))}">${unitSuffix}</div>`;
                case 'date':
                    return `<input type="date" class="cf-input" data-cf="${escapeHtml(f.id)}" ${req} value="${escapeHtml(String(val))}">`;
                case 'select':
                    return `<select class="cf-input" data-cf="${escapeHtml(f.id)}" ${req}><option value="">– bitte wählen –</option>${(f.options || []).map(o => `<option value="${escapeHtml(o)}" ${String(val) === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}</select>`;
                case 'multiselect': {
                    const arr = Array.isArray(val) ? val : (val ? [val] : []);
                    return `<div class="cf-multi" data-cf="${escapeHtml(f.id)}" ${req}>${(f.options || []).map(o => `<label style="display:inline-flex;align-items:center;gap:6px;margin:3px 12px 3px 0;font-size:13.5px;font-weight:500;"><input type="checkbox" style="width:auto;" value="${escapeHtml(o)}" ${arr.includes(o) ? 'checked' : ''}> ${escapeHtml(o)}</label>`).join('')}</div>`;
                }
                case 'boolean':
                    return `<select class="cf-input" data-cf="${escapeHtml(f.id)}" ${req}><option value="">–</option><option value="true" ${val === true || val === 'true' ? 'selected' : ''}>Ja</option><option value="false" ${val === false || val === 'false' ? 'selected' : ''}>Nein</option></select>`;
                default:
                    return `<div style="display:flex;gap:8px;"><input type="text" class="cf-input" data-cf="${escapeHtml(f.id)}" ${req} value="${escapeHtml(String(val))}" placeholder="${escapeHtml(f.placeholder || '')}">${unitSuffix}</div>`;
            }
        }
        // Werte aus einem Modal einsammeln (mit Pflichtfeld-Prüfung)
        function collectCustomFieldValues(overlay, defs) {
            const data = {};
            for (const f of defs) {
                if (f.type === 'multiselect') {
                    const wrap = overlay.querySelector(`.cf-multi[data-cf="${f.id}"]`);
                    const vals = [...wrap.querySelectorAll('input:checked')].map(i => i.value);
                    if (f.required && vals.length === 0) return { error: `"${f.label}" ist ein Pflichtfeld.` };
                    data[f.id] = vals;
                } else {
                    const el = overlay.querySelector(`.cf-input[data-cf="${f.id}"]`);
                    let v = el.value;
                    if (f.type === 'number') v = v === '' ? '' : Number(v);
                    if (f.type === 'boolean') v = v === '' ? '' : v === 'true';
                    if (f.required && (v === '' || v === null || v === undefined)) return { error: `"${f.label}" ist ein Pflichtfeld.` };
                    data[f.id] = v;
                }
            }
            return { data };
        }
        // ============================================================
        // ============ PDF-SUITE (professionelles Design) ============
        // ============================================================
        const PDF_TEAL = [18, 128, 143];
        const PDF_TEAL_DARK = [10, 95, 107];
        const PDF_INK = [23, 49, 60];
        const PDF_GRAY = [96, 116, 126];
        const PDF_LIGHT = [237, 243, 245];

        function pdfSnowflake(doc, cx, cy, r, color, lineW) {
            doc.setDrawColor(...color);
            doc.setLineWidth(lineW);
            doc.setLineCap('round');
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i;
                const dx = Math.cos(a), dy = Math.sin(a);
                const ex = cx + dx * r, ey = cy + dy * r;
                doc.line(cx, cy, ex, ey);
                // Seitenzweige bei 55% und 80% des Astes
                for (const t of [0.55, 0.8]) {
                    const bx = cx + dx * r * t, by = cy + dy * r * t;
                    const tl = r * (t === 0.55 ? 0.24 : 0.16);
                    for (const s of [1, -1]) {
                        const ba = a + s * Math.PI / 5;
                        doc.line(bx, by, bx + Math.cos(ba) * tl, by + Math.sin(ba) * tl);
                    }
                }
                // kleiner Innenkreis-Akzent
            }
            doc.circle(cx, cy, r * 0.09, 'S');
        }

        function pdfWatermark(doc) {
            try {
                // Nur 1x pro Seite (Header/autoTable/Manuell rufen mehrfach)
                const pg = doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : doc.internal.getNumberOfPages();
                doc.__wmPages = doc.__wmPages || new Set();
                if (doc.__wmPages.has(pg)) return;
                doc.__wmPages.add(pg);

                const pw = doc.internal.pageSize.getWidth();
                const ph = doc.internal.pageSize.getHeight();
                // WICHTIG: Die Flocke besteht aus LINIEN -> 'stroke-opacity' nötig,
                // 'opacity' allein wirkt nur auf Füllungen (deshalb war sie vorher deckend).
                let done = false;
                try {
                    if (doc.GState && doc.setGState && doc.saveGraphicsState && doc.restoreGraphicsState) {
                        doc.saveGraphicsState();
                        doc.setGState(new doc.GState({ opacity: 0.06, 'stroke-opacity': 0.06 }));
                        pdfSnowflake(doc, pw / 2, ph / 2 + 8, 58, PDF_TEAL, 1.5);
                        doc.restoreGraphicsState();
                        done = true;
                    }
                } catch (e) { /* Fallback unten */ }
                if (!done) {
                    // Fallback ohne Transparenz: sehr helle Farbe, stört nie
                    pdfSnowflake(doc, pw / 2, ph / 2 + 8, 58, [228, 239, 241], 1.3);
                }
            } catch (e) { /* Wasserzeichen ist optional */ }
        }
        function pdfFooterOnce(doc, co) {
            const pg = doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : doc.internal.getNumberOfPages();
            doc.__ftPages = doc.__ftPages || new Set();
            if (doc.__ftPages.has(pg)) return;
            doc.__ftPages.add(pg);
            pdfFooter(doc, co);
        }

        async function pdfCompany() {
            return {
                name: await getSetting('companyName', ''),
                logo: await getSetting('companyLogo', ''),
                phone: await getSetting('companyPhone', ''),
                email: await getSetting('companyEmail', ''),
                website: await getSetting('companyWebsite', ''),
                address: await getSetting('companyAddress', ''),
                uid: await getSetting('companyUID', ''),
                fb: await getSetting('companyFirmenbuch', ''),
                bank: await getSetting('companyBank', ''),
                paymentTerms: await getSetting('paymentTerms', 'Zahlbar innerhalb 14 Tagen ohne Abzug.')
            };
        }

        // Kopfbereich: weiße Zeile mit Logo/Kontakt + Teal-Band mit Titel & Schneeflocke
        function pdfHeader(doc, co, title, metaLines) {
            const pw = doc.internal.pageSize.getWidth();
            const mx = 16;
            let topY = 12;

            if (co.logo) {
                try {
                    const imgProps = doc.getImageProperties(co.logo);
                    const logoH = 13;
                    const logoW = (imgProps.width / imgProps.height) * logoH;
                    doc.addImage(co.logo, imgProps.fileType || 'PNG', mx, topY - 3, logoW, logoH);
                } catch (e) { /* Logo optional */ }
            } else if (co.name) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.setTextColor(...PDF_INK);
                doc.text(co.name, mx, topY + 4);
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...PDF_GRAY);
            const contact = [co.address, [co.phone, co.email].filter(Boolean).join('  ·  '), co.website].filter(Boolean);
            let cy = topY;
            contact.forEach(line => { doc.text(line, pw - mx, cy, { align: 'right' }); cy += 4; });

            // Teal-Band
            const bandY = Math.max(topY + 14, cy + 3);
            const bandH = 24;
            doc.setFillColor(...PDF_TEAL);
            doc.rect(0, bandY, pw, bandH, 'F');
            // dunkler Akzentstreifen unten am Band
            doc.setFillColor(...PDF_TEAL_DARK);
            doc.rect(0, bandY + bandH, pw, 1.2, 'F');
            // dezente Schneeflocken im Band
            try {
                let bandDone = false;
                try {
                    if (doc.GState && doc.setGState && doc.saveGraphicsState) {
                        doc.saveGraphicsState();
                        doc.setGState(new doc.GState({ opacity: 0.2, 'stroke-opacity': 0.2 }));
                        pdfSnowflake(doc, pw - 30, bandY + bandH / 2, 13, [255, 255, 255], 0.7);
                        pdfSnowflake(doc, pw - 56, bandY + bandH - 4, 6, [255, 255, 255], 0.45);
                        doc.restoreGraphicsState();
                        bandDone = true;
                    }
                } catch (e) { /* Fallback */ }
                if (!bandDone) {
                    // gedeckte, hellere Teal-Töne statt Transparenz
                    pdfSnowflake(doc, pw - 30, bandY + bandH / 2, 13, [78, 158, 170], 0.7);
                    pdfSnowflake(doc, pw - 56, bandY + bandH - 4, 6, [78, 158, 170], 0.45);
                }
            } catch (e) { /* optional */ }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(19);
            doc.setTextColor(255, 255, 255);
            doc.text(title, mx, bandY + 10.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(224, 240, 243);
            let my = bandY + 16.5;
            (metaLines || []).slice(0, 2).forEach(l => { doc.text(l, mx, my); my += 4.2; });

            return bandY + bandH + 10;
        }

        function pdfFooter(doc, co) {
            const pw = doc.internal.pageSize.getWidth();
            const ph = doc.internal.pageSize.getHeight();
            const mx = 16;
            const fy = ph - 18;
            doc.setDrawColor(...PDF_TEAL);
            doc.setLineWidth(0.5);
            doc.line(mx, fy, pw - mx, fy);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(...PDF_GRAY);
            const left = [co.address, [co.phone, co.email].filter(Boolean).join('  ·  ')].filter(Boolean).join('   |   ');
            const right = [co.uid ? `UID: ${co.uid}` : '', co.fb ? `FB-Nr.: ${co.fb}` : '', co.bank].filter(Boolean).join('   |   ');
            doc.text(left, mx, fy + 4.5);
            if (right) doc.text(right, mx, fy + 8.5);
            const pageInfo = `Seite ${doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : doc.internal.getNumberOfPages()}`;
            doc.text(pageInfo, pw - mx, fy + 4.5, { align: 'right' });
        }

        // Zwei Info-Boxen nebeneinander (z. B. Kunde | Projekt)
        function pdfInfoBoxes(doc, y, leftTitle, leftLines, rightTitle, rightLines) {
            const pw = doc.internal.pageSize.getWidth();
            const mx = 16;
            const gap = 6;
            const boxW = (pw - mx * 2 - gap) / 2;
            const lineH = 4.6;
            const boxH = Math.max(leftLines.length, rightLines.length) * lineH + 13;
            [[mx, leftTitle, leftLines], [mx + boxW + gap, rightTitle, rightLines]].forEach(([bx, title, lines]) => {
                doc.setFillColor(...PDF_LIGHT);
                doc.roundedRect(bx, y, boxW, boxH, 2.5, 2.5, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(...PDF_TEAL);
                doc.text(String(title).toUpperCase(), bx + 5, y + 6.5);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(...PDF_INK);
                let ly = y + 12.5;
                lines.forEach(l => { doc.text(String(l), bx + 5, ly, { maxWidth: boxW - 10 }); ly += lineH; });
            });
            return y + boxH + 8;
        }

        // Aufstellungsplan: Räume maßstäblich als Skizze
        function pdfRoomSketch(doc, rooms, x, y, maxW, title = 'Aufstellungsplan (schematisch)') {
            const valid = (rooms || []).filter(r => (r.length || 0) > 0 && (r.width || 0) > 0);
            if (valid.length === 0) return y;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(...PDF_INK);
            doc.text(title, x, y);
            y += 5;

            // Layout: Räume nebeneinander, umbrechen wenn zu breit. Maßstab so,
            // dass der größte Raum max. 55 mm breit ist.
            const maxRoomM = Math.max(...valid.map(r => Math.max(r.length, r.width)));
            const scale = Math.min(55 / maxRoomM, 9); // mm pro Meter, gedeckelt
            const pad = 6;
            let cx = x, cy = y, rowH = 0;

            valid.forEach(r => {
                const w = Math.max(r.length * scale, 20);
                const h = Math.max(r.width * scale, 14);
                if (cx + w > x + maxW) { cx = x; cy += rowH + pad; rowH = 0; }
                // Raum-Rechteck
                doc.setFillColor(240, 247, 249);
                doc.setDrawColor(...PDF_TEAL);
                doc.setLineWidth(0.5);
                doc.roundedRect(cx, cy, w, h, 1.5, 1.5, 'FD');
                // Beschriftung
                const area = (r.length * r.width).toFixed(1);
                const kw = ((r.length * r.width * 80) / 1000).toFixed(1);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(...PDF_INK);
                doc.text(String(r.name || 'Raum'), cx + w / 2, cy + h / 2 - 2.5, { align: 'center', maxWidth: w - 3 });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.6);
                doc.setTextColor(...PDF_GRAY);
                doc.text(`${r.length} × ${r.width} m · ${area} m²`, cx + w / 2, cy + h / 2 + 1.5, { align: 'center', maxWidth: w - 2 });
                doc.setTextColor(...PDF_TEAL);
                doc.text(`${kw} kW`, cx + w / 2, cy + h / 2 + 5, { align: 'center' });
                // Maßangaben außen
                doc.setFontSize(6);
                doc.setTextColor(...PDF_GRAY);
                doc.text(`${r.length} m`, cx + w / 2, cy - 1, { align: 'center' });
                doc.text(`${r.width} m`, cx - 1, cy + h / 2, { align: 'right' });
                cx += w + pad;
                rowH = Math.max(rowH, h);
            });
            return cy + rowH + 8;
        }

        function pdfNewPageIfNeeded(doc, y, needed, co) {
            const ph = doc.internal.pageSize.getHeight();
            if (y + needed > ph - 26) {
                pdfFooterOnce(doc, co);
                doc.addPage();
                pdfWatermark(doc);
                return 18;
            }
            return y;
        }

        const PDF_TABLE_STYLES = {
            styles: { font: 'helvetica', fontSize: 8.6, cellPadding: 2.8, textColor: PDF_INK, lineColor: [214, 226, 230], lineWidth: 0.15 },
            headStyles: { fillColor: PDF_TEAL, textColor: 255, fontStyle: 'bold', fontSize: 8.3 },
            alternateRowStyles: { fillColor: [246, 250, 251] }
        };

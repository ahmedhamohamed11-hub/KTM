

        // ============================================================
        // ============ KÄLTEANLAGEN-AUSLEGUNG =========================
        // ============================================================
        // Phase 2 (Stand 2026-09): Seite + Projekt + Kühlstellen-Erfassung.
        // BEWUSST NOCH OHNE: Kältelastberechnung, Rohrauslegung, Komponenten-
        // auswahl, KI. Diese Phasen kommen erst, wenn ihre Grundlagen (echte
        // Formeln bzw. echte Herstellerdaten) stehen - siehe die Platzhalter-
        // Tabs weiter unten. Kein Mockup: alles hier gezeigte wird wirklich
        // gespeichert und beim Neuladen wieder korrekt angezeigt.
        //
        // Datenmodell: KEIN neuer IndexedDB/Supabase-Store. Die komplette
        // Kälteplanung haengt als project.kaelte = {...} am bestehenden
        // 'projects'-Store (gleiches Prinzip wie project.customData oder
        // room.tech). Dadurch laeuft das sofort, ohne dass in Supabase etwas
        // manuell angelegt werden muss.

        const KAELTE_ANLAGENARTEN = [
            { key: 'einzel', label: 'Einzelanlage / Einzelaggregat', desc: 'Ein Verdichter, ein Verbraucher.' },
            { key: 'verbund', label: 'Normale Verbundanlage', desc: 'Mehrere Verbraucher an einer gemeinsamen Sauggruppe.' },
            { key: 'hdmd', label: 'Hochdruck-/Mitteldruck-Verbundsystem', desc: 'Transkritisches System mit mehreren Druckstufen (z. B. CO₂).' },
            { key: 'custom', label: 'Benutzerdefinierte Anlage', desc: 'Freie Konfiguration ohne festes Schema.' }
        ];

        // 10 Schritte wie gewünscht. 'fertig' markiert, was in dieser Phase
        // bereits echt funktioniert - der Rest zeigt ehrlich "noch nicht
        // umgesetzt" statt erfundener Werte.
        const KAELTE_STEPS = [
            { key: 'projekt', label: 'Projekt', fertig: true },
            { key: 'kuehlstellen', label: 'Kühlstellen', fertig: true },
            { key: 'kaeltelast', label: 'Kältelast', fertig: true },
            { key: 'anlage', label: 'Anlage', fertig: true },
            { key: 'komponenten', label: 'Komponenten', fertig: true },
            { key: 'rohrleitungen', label: 'Rohrleitungen', fertig: true },
            { key: 'verbund', label: 'Verbund', fertig: true },
            { key: 'material', label: 'Material', fertig: true },
            { key: 'pruefung', label: 'Prüfung', fertig: true },
            { key: 'angebot', label: 'Angebot', fertig: true }
        ];

        const KUEHLSTELLE_RAUMARTEN = ['Kühlraum', 'Tiefkühlraum', 'Kühlzelle', 'Tiefkühlzelle', 'Kühlmöbel', 'Tiefkühlmöbel', 'Kühltheke', 'Prozesskühlung', 'Sonstiger Verbraucher'];
        const KUEHLSTELLE_ABTAUARTEN = ['Elektrisch', 'Heißgas', 'Naturumlauf (Off-Cycle)', 'Wasser', 'Sonstige'];
        const KUEHLSTELLE_KAELTEMITTEL = ['R744 (CO₂)', 'R404A', 'R448A', 'R449A', 'R452A', 'R507A', 'R290 (Propan)', 'R600a (Isobutan)', 'R1270 (Propen)', 'R134a', 'R32'];

        const KUEHLSTELLE_GROUP_ICONS = { 'Raumdaten': '📐', 'Temperaturen': '🌡️', 'Produkt & Betrieb': '📦', 'Nutzung & Lasten': '👥', 'Bauphysik': '🧱', 'Kältetechnik': '❄' };

        // Gleiches {key,label,type,unit,group,options}-Schema wie ROOM_TECH_FIELDS -
        // dadurch funktionieren techFieldInput()/techFieldRead() unveraendert.
        const KUEHLSTELLE_FIELDS = [
            { key: 'raumart', label: 'Raumart', type: 'select', options: KUEHLSTELLE_RAUMARTEN, group: 'Raumdaten' },
            { key: 'laenge', label: 'Länge', type: 'number', unit: 'm', group: 'Raumdaten' },
            { key: 'breite', label: 'Breite', type: 'number', unit: 'm', group: 'Raumdaten' },
            { key: 'hoehe', label: 'Höhe', type: 'number', unit: 'm', group: 'Raumdaten' },
            { key: 'volumen', label: 'Volumen (falls abweichend von L×B×H)', type: 'number', unit: 'm³', group: 'Raumdaten' },

            { key: 'raumtemperatur', label: 'Raumtemperatur', type: 'number', unit: '°C', group: 'Temperaturen' },
            { key: 'produktTemperaturZiel', label: 'gewünschte Produkttemperatur', type: 'number', unit: '°C', group: 'Temperaturen' },
            { key: 'produktEintrittstemperatur', label: 'Produkt-Eintrittstemperatur', type: 'number', unit: '°C', group: 'Temperaturen' },
            { key: 'verdampfungstemperatur', label: 'gewünschte Verdampfungstemperatur', type: 'number', unit: '°C', group: 'Temperaturen' },
            { key: 'aussentemperatur', label: 'Auslegung Außentemperatur', type: 'number', unit: '°C', group: 'Temperaturen' },

            { key: 'produktmenge', label: 'Produktmenge', type: 'number', unit: 'kg', group: 'Produkt & Betrieb' },
            { key: 'abkuehlzeit', label: 'gewünschte Abkühlzeit', type: 'number', unit: 'h', group: 'Produkt & Betrieb' },
            { key: 'betriebszeit', label: 'Betriebszeit', type: 'number', unit: 'h/Tag', group: 'Produkt & Betrieb' },

            { key: 'tuergroesse', label: 'Türgröße', type: 'text', placeholder: 'z. B. 1,0 × 2,0 m', group: 'Nutzung & Lasten' },
            { key: 'tueroeffnungen', label: 'Türöffnungen', type: 'number', unit: '/h', group: 'Nutzung & Lasten' },
            { key: 'personen', label: 'Personen', type: 'number', group: 'Nutzung & Lasten' },
            { key: 'beleuchtung', label: 'Beleuchtung', type: 'number', unit: 'W', group: 'Nutzung & Lasten' },
            { key: 'ventilatorleistung', label: 'Ventilatorleistung', type: 'number', unit: 'W', group: 'Nutzung & Lasten' },
            { key: 'sonstigeWaerme', label: 'sonstige Wärmequellen', type: 'number', unit: 'W', group: 'Nutzung & Lasten' },

            { key: 'wandaufbau', label: 'Wandaufbau', type: 'text', group: 'Bauphysik' },
            { key: 'deckenaufbau', label: 'Deckenaufbau', type: 'text', group: 'Bauphysik' },
            { key: 'bodenaufbau', label: 'Bodenaufbau', type: 'text', group: 'Bauphysik' },
            { key: 'daemmstaerke', label: 'Dämmstärke', type: 'number', unit: 'mm', group: 'Bauphysik' },
            { key: 'uWert', label: 'U-Wert (falls bekannt)', type: 'number', unit: 'W/m²K', group: 'Bauphysik' },

            { key: 'abtauart', label: 'Abtauart', type: 'select', options: KUEHLSTELLE_ABTAUARTEN, group: 'Kältetechnik' },
            { key: 'kaeltemittel', label: 'Kältemittel', type: 'select', options: KUEHLSTELLE_KAELTEMITTEL, group: 'Kältetechnik' }
        ];

        // Nur Projekte, die tatsaechlich eine Kaelteplanung haben - normale
        // Klima-/Serviceprojekte bleiben unberuehrt und tauchen hier nicht auf.
        function kaelteProjekte(projects) { return (projects || []).filter(p => p && p.kaelte); }

        function kuehlstelleLeer() {
            return { id: 'ks_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), bezeichnung: '' };
        }

        // Aktiver Tab in der Detailansicht - reines UI-State, kein DB-Feld,
        // gleiches Prinzip wie CALC_STATE beim Schnellrechner.
        const KAELTE_STATE = window.__kaelteState || (window.__kaelteState = { tab: 'projekt' });

        function renderKaelte(param) {
            if (param) renderKaelteDetail(param);
            else renderKaelteListe();
        }

        function renderKaelteListe() {
            (async () => {
                const projects = await db.getAll('projects');
                const customers = await db.getAll('customers');
                const liste = kaelteProjekte(projects).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

                const anlagenartLabel = key => (KAELTE_ANLAGENARTEN.find(a => a.key === key) || {}).label || '–';

                contentArea.innerHTML = `
                    <div class="toolbar">
                        <div style="font-size:13px;color:var(--text-secondary);">Eigenständiger Bereich für Kälteanlagen-Planung - getrennt von den normalen Klimaprojekten.</div>
                        <div class="toolbar-spacer"></div>
                        <button class="btn btn-primary" onclick="app.openNeuesKaelteprojekt()">${icon('plus')} Neues Kälteprojekt</button>
                    </div>
                    ${liste.length === 0 ? `
                        <div class="empty-state">
                            <div style="font-size:40px;">❄</div>
                            <p>Noch kein Kälteprojekt angelegt.<br>Projekt anlegen, Anlagenart wählen, Kühlstellen erfassen.</p>
                            <button class="btn btn-primary" onclick="app.openNeuesKaelteprojekt()">${icon('plus')} Erstes Kälteprojekt anlegen</button>
                        </div>
                    ` : `
                        <div class="table-container">
                            <table>
                                <thead><tr><th>Projekt</th><th>Kunde</th><th>Anlagenart</th><th>Kühlstellen</th><th>Angelegt</th><th style="text-align:right;">Aktionen</th></tr></thead>
                                <tbody>
                                    ${liste.map(p => {
                                        const c = customers.find(x => String(x.id) === String(p.customerId));
                                        return `<tr style="cursor:pointer;" onclick="app.navigate('kaelte', ${idJS(p.id)})">
                                            <td><strong>${escapeHtml(p.title || 'Unbenannt')}</strong></td>
                                            <td>${c ? escapeHtml(customerDisplayName(c)) : '<span style="color:var(--text-muted);">–</span>'}</td>
                                            <td>${escapeHtml(anlagenartLabel(p.kaelte.anlagenart))}</td>
                                            <td>${(p.kaelte.kuehlstellen || []).length}</td>
                                            <td>${formatDate(p.createdAt)}</td>
                                            <td style="text-align:right;" onclick="event.stopPropagation();"><button class="btn btn-sm btn-outline" onclick="app.navigate('kaelte', ${idJS(p.id)})">${icon('edit')} Öffnen</button></td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                `;
            })().catch(e => {
                console.error('Fehler beim Aufbau der Ansicht:', e);
                if (typeof contentArea !== 'undefined' && contentArea) {
                    contentArea.innerHTML = `<div class="empty-note" style="padding:30px;">
                        <strong>Diese Ansicht konnte nicht geladen werden.</strong><br>
                        <span style="font-size:12px;color:var(--text-muted);">${(e && e.message) ? String(e.message).slice(0, 200) : 'Unbekannter Fehler'}</span><br>
                        <button class="btn btn-sm btn-primary" style="margin-top:12px;" onclick="app.navigate('kaelte')">Erneut versuchen</button>
                    </div>`;
                }
                if (typeof showToast === 'function') showToast('Ansicht konnte nicht geladen werden.', 'error');
            });
        }

        function renderKaelteDetail(projectId) {
            (async () => {
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) {
                    showToast('Kälteprojekt nicht gefunden.', 'error');
                    app.navigate('kaelte');
                    return;
                }
                const customer = project.customerId ? await db.get('customers', project.customerId) : null;
                const k = project.kaelte;
                const tab = KAELTE_STATE.tab;

                const stepsHtml = `
                    <div class="kaelte-steps">
                        ${KAELTE_STEPS.map((s, i) => `
                            <button type="button" class="kaelte-step ${tab === s.key ? 'active' : ''} ${!s.fertig ? 'is-todo' : ''}" onclick="app.kaelteSetTab(${idJS(projectId)}, '${s.key}')">
                                <span class="kaelte-step-num">${i + 1}</span>${escapeHtml(s.label)}${!s.fertig ? ' 🚧' : ''}
                            </button>
                        `).join('')}
                    </div>`;

                let tabHtml = '';
                if (tab === 'projekt') tabHtml = renderKaelteTabProjekt(project, customer);
                else if (tab === 'kuehlstellen') tabHtml = renderKaelteTabKuehlstellen(project);
                else if (tab === 'kaeltelast') tabHtml = renderKaelteTabKaeltelast(project);
                else if (tab === 'anlage') tabHtml = renderKaelteTabAnlage(project);
                else if (tab === 'rohrleitungen') tabHtml = renderKaelteTabRohr(project);
                else if (tab === 'komponenten') tabHtml = renderKaelteTabKomponenten(project);
                else if (tab === 'verbund') tabHtml = renderKaelteTabVerbund(project);
                else if (tab === 'material') tabHtml = renderKaelteTabMaterial(project);
                else if (tab === 'pruefung') tabHtml = renderKaelteTabPruefung(project);
                else if (tab === 'angebot') tabHtml = renderKaelteTabAngebot(project);
                else tabHtml = renderKaelteTabPlatzhalter(KAELTE_STEPS.find(s => s.key === tab));

                // "Weiter"-Leiste: fuehrt durch die Schritte, ohne dass oben
                // in der Leiste gesucht werden muss.
                const stepIdx = KAELTE_STEPS.findIndex(s => s.key === tab);
                const vor = KAELTE_STEPS[stepIdx - 1], nach = KAELTE_STEPS[stepIdx + 1];
                const frei = kaelteSchrittStatus(project, tab);
                tabHtml += `<div class="kaelte-freigabe kaelte-freigabe-${frei.status}">
                        <span class="kaelte-freigabe-ikon">${frei.status === 'ok' ? '✓' : frei.status === 'warnung' ? '⚠' : '✕'}</span>
                        <div><strong>${frei.status === 'ok' ? 'Dieser Schritt passt.' : frei.status === 'warnung' ? 'Weitergehen möglich, aber:' : 'Hier stimmt noch etwas nicht.'}</strong><br>${escapeHtml(frei.text)}</div>
                    </div>
                    <div class="kaelte-weiter">
                    ${vor ? `<button class="btn btn-outline" onclick="app.kaelteSetTab(${idJS(projectId)}, '${vor.key}')">← ${escapeHtml(vor.label)}</button>` : '<span></span>'}
                    ${nach ? `<button class="btn ${frei.status === 'fehler' ? 'btn-outline' : 'btn-primary'}" onclick="app.kaelteSetTab(${idJS(projectId)}, '${nach.key}')">Weiter: ${escapeHtml(nach.label)} →</button>` : '<span></span>'}
                </div>`;

                contentArea.innerHTML = `
                    <div class="toolbar">
                        <button class="btn btn-sm btn-outline" onclick="app.navigate('kaelte')">← Kälteprojekte</button>
                        <div class="toolbar-spacer"></div>
                        <button class="btn btn-sm btn-danger" onclick="app.entferneKaelteplanung(${idJS(projectId)})">Kälteplanung entfernen</button>
                    </div>
                    <div class="panel" style="margin-top:14px;">
                        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:6px;">
                            <div>
                                <h3 style="margin:0;">❄ ${escapeHtml(project.title || 'Unbenannt')}</h3>
                                <div style="color:var(--text-muted);font-size:13px;">${customer ? escapeHtml(customerDisplayName(customer)) : 'Kein Kunde zugewiesen'}</div>
                            </div>
                            <button class="btn btn-sm btn-outline" onclick="app.openProjectModal(${idJS(projectId)})">${icon('edit')} Projekt/Kunde bearbeiten</button>
                        </div>
                        ${stepsHtml}
                        ${tabHtml}
                    </div>
                `;

                // Kältelast-Felder anbinden. Leeres Feld = Vorschlag wieder
                // aktivieren, deshalb wird der Schlüssel dann geloescht.
                // Auslegungsbedingungen (Anlage-Tab) - liegen am Projekt.
                contentArea.querySelectorAll('.ka-in').forEach(el => {
                    el.addEventListener('change', async () => {
                        const p = await db.get('projects', projectId);
                        p.kaelte.auslegung = p.kaelte.auslegung || {};
                        const roh = el.value.trim();
                        if (el.dataset.feld === 'kaeltemittel') p.kaelte.auslegung.kaeltemittel = roh;
                        else {
                            const n = parseFloat(roh.replace(',', '.'));
                            if (!Number.isFinite(n)) { showToast('Bitte eine Zahl eingeben.', 'error'); return; }
                            p.kaelte.auslegung[el.dataset.feld] = n;
                        }
                        await db.put('projects', p);
                        renderKaelteDetail(projectId);
                    });
                });

                // Materialliste: Mengen und Preise ueberschreiben. Wird je
                // Schluessel gespeichert, damit es eine Neuberechnung ueberlebt.
                contentArea.querySelectorAll('.ma-in').forEach(el => {
                    el.addEventListener('change', async () => {
                        const p = await db.get('projects', projectId);
                        const key = el.dataset.key;
                        const roh = el.value.trim();
                        if (key.startsWith('zusatz_')) {
                            const i = Number(key.slice(7));
                            const z = (p.kaelte.materialZusatz || [])[i];
                            if (!z) return;
                            if (roh === '') delete z[el.dataset.feld];
                            else { const n = parseFloat(roh.replace(',', '.')); if (!Number.isFinite(n)) { showToast('Bitte eine Zahl eingeben.', 'error'); return; } z[el.dataset.feld] = n; }
                        } else {
                            p.kaelte.materialEigen = p.kaelte.materialEigen || {};
                            const o = p.kaelte.materialEigen[key] = p.kaelte.materialEigen[key] || {};
                            if (roh === '') delete o[el.dataset.feld];
                            else { const n = parseFloat(roh.replace(',', '.')); if (!Number.isFinite(n)) { showToast('Bitte eine Zahl eingeben.', 'error'); return; } o[el.dataset.feld] = n; }
                            if (!Object.keys(o).length) delete p.kaelte.materialEigen[key];
                        }
                        await db.put('projects', p);
                        renderKaelteDetail(projectId);
                    });
                });

                // Arbeitsleistung und Umgebungsbedingungen
                contentArea.querySelectorAll('.ar-in, .au-in').forEach(el => {
                    el.addEventListener('change', async () => {
                        const p = await db.get('projects', projectId);
                        const ziel = el.classList.contains('ar-in')
                            ? (p.kaelte.arbeit = p.kaelte.arbeit || {})
                            : (p.kaelte.auslegung = p.kaelte.auslegung || {});
                        const f = el.dataset.feld;
                        const roh = el.value.trim();
                        if (f === 'pauschal') ziel.pauschal = roh === '1';
                        else if (f === 'pauschalText') ziel.pauschalText = roh;
                        else {
                            if (roh === '') delete ziel[f];
                            else { const n = parseFloat(roh.replace(',', '.')); if (!Number.isFinite(n)) { showToast('Bitte eine Zahl eingeben.', 'error'); return; } ziel[f] = n; }
                        }
                        await db.put('projects', p);
                        renderKaelteDetail(projectId);
                    });
                });

                // Verbund: Sauggruppen-Zuordnung und Gleichzeitigkeitsfaktor
                contentArea.querySelectorAll('.vb-in').forEach(el => {
                    el.addEventListener('change', async () => {
                        const p = await db.get('projects', projectId);
                        const ks = (p.kaelte.kuehlstellen || []).find(x => x.id === el.dataset.ks);
                        if (!ks) return;
                        ks.sauggruppe = el.value;
                        await db.put('projects', p);
                        renderKaelteDetail(projectId);
                    });
                });
                contentArea.querySelectorAll('.vb-gz').forEach(el => {
                    el.addEventListener('change', async () => {
                        const n = parseFloat(el.value.replace(',', '.'));
                        if (!Number.isFinite(n) || n <= 0 || n > 1) { showToast('Gleichzeitigkeitsfaktor muss zwischen 0 und 1 liegen.', 'error'); return; }
                        const p = await db.get('projects', projectId);
                        p.kaelte.gleichzeitigkeit = p.kaelte.gleichzeitigkeit || {};
                        p.kaelte.gleichzeitigkeit[el.dataset.gruppe] = n;
                        await db.put('projects', p);
                        renderKaelteDetail(projectId);
                    });
                });

                // Rohrleitungs-Eingaben - liegen je Kuehlstelle unter ks.rohr[art].
                contentArea.querySelectorAll('.ro-in').forEach(el => {
                    el.addEventListener('change', async () => {
                        const p = await db.get('projects', projectId);
                        const ks = (p.kaelte.kuehlstellen || []).find(x => x.id === el.dataset.ks);
                        if (!ks) return;
                        ks.rohr = ks.rohr || {};
                        ks.rohr[el.dataset.art] = ks.rohr[el.dataset.art] || {};
                        const ziel = ks.rohr[el.dataset.art];
                        const roh = el.value.trim();
                        if (roh === '') delete ziel[el.dataset.feld];
                        else if (el.dataset.feld === 'gewaehlt') ziel.gewaehlt = roh;
                        else {
                            const n = parseFloat(roh.replace(',', '.'));
                            if (!Number.isFinite(n)) { showToast('Bitte eine Zahl eingeben.', 'error'); return; }
                            ziel[el.dataset.feld] = n;
                        }
                        await db.put('projects', p);
                        renderKaelteDetail(projectId);
                    });
                });

                if (tab === 'kaeltelast') {
                    contentArea.querySelectorAll('.kl-input, .kl-select').forEach(el => {
                        el.addEventListener('change', async () => {
                            const p = await db.get('projects', projectId);
                            const ks = (p.kaelte.kuehlstellen || []).find(x => x.id === el.dataset.ks);
                            if (!ks) return;
                            const roh = el.value.trim();
                            if (roh === '') delete ks[el.dataset.feld];
                            else if (el.classList.contains('kl-select')) ks[el.dataset.feld] = roh;
                            else {
                                const n = parseFloat(roh.replace(',', '.'));
                                if (!Number.isFinite(n)) { showToast('Bitte eine Zahl eingeben.', 'error'); return; }
                                ks[el.dataset.feld] = n;
                            }
                            await db.put('projects', p);
                            renderKaelteDetail(projectId);
                        });
                    });
                }
            })().catch(e => {
                console.error('Fehler beim Aufbau der Ansicht:', e);
                if (typeof contentArea !== 'undefined' && contentArea) {
                    contentArea.innerHTML = `<div class="empty-note" style="padding:30px;">
                        <strong>Diese Ansicht konnte nicht geladen werden.</strong><br>
                        <span style="font-size:12px;color:var(--text-muted);">${(e && e.message) ? String(e.message).slice(0, 200) : 'Unbekannter Fehler'}</span><br>
                        <button class="btn btn-sm btn-primary" style="margin-top:12px;" onclick="app.navigate('kaelte', ${idJS(projectId)})">Erneut versuchen</button>
                    </div>`;
                }
                if (typeof showToast === 'function') showToast('Ansicht konnte nicht geladen werden.', 'error');
            });
        }

        function renderKaelteTabProjekt(project, customer) {
            const k = project.kaelte;
            return `
                <div class="form-card">
                    <div class="form-card-title">Anlagenart</div>
                    <div class="anlagenart-grid">
                        ${KAELTE_ANLAGENARTEN.map(a => `
                            <button type="button" class="anlagenart-card ${k.anlagenart === a.key ? 'active' : ''}" onclick="app.kaelteSetAnlagenart(${idJS(project.id)}, '${a.key}')">
                                <strong>${escapeHtml(a.label)}</strong>
                                <span>${escapeHtml(a.desc)}</span>
                            </button>
                        `).join('')}
                    </div>
                    <div style="font-size:11.5px;color:var(--text-muted);margin-top:8px;">Kann jederzeit gewechselt werden - bereits erfasste Kühlstellen bleiben erhalten.</div>
                </div>

                <div class="form-card">
                    <div class="form-card-title">Projektangaben</div>
                    <div class="survey-summary">
                        <div class="survey-chip"><span>Baustelle / Standort</span><strong>${escapeHtml(project.siteAddress || k.standort || '–')}</strong></div>
                        <div class="survey-chip"><span>Bearbeiter</span><strong>${escapeHtml(k.bearbeiter || '–')}</strong></div>
                        <div class="survey-chip"><span>Projektnummer</span><strong>${escapeHtml(k.projektnummer || '–')}</strong></div>
                        <div class="survey-chip"><span>Datum</span><strong>${k.datum ? formatDate(k.datum) : '–'}</strong></div>
                        <div class="survey-chip"><span>Ansprechpartner</span><strong>${escapeHtml(k.ansprechpartner || '–')}</strong></div>
                    </div>
                    ${k.notizen ? `<p style="margin-top:12px;font-size:13px;"><strong>Notizen:</strong> ${escapeHtml(k.notizen)}</p>` : ''}
                    <button class="btn btn-sm btn-outline" style="margin-top:10px;" onclick="app.openKaelteProjektFelder(${idJS(project.id)})">${icon('edit')} Angaben bearbeiten</button>
                </div>
            `;
        }

        function renderKaelteTabKuehlstellen(project) {
            const liste = project.kaelte.kuehlstellen || [];
            return `
                <div class="detail-section-head" style="margin-top:4px;">
                    <h4>🧊 Kühlstellen (${liste.length})</h4>
                    <button class="btn btn-sm btn-primary" onclick="app.openKuehlstelleModal(${idJS(project.id)})">${icon('plus')} Kühlstelle</button>
                </div>
                ${liste.length === 0 ? '<div class="empty-note" style="padding:14px;">Noch keine Kühlstelle erfasst.</div>' : `
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Bezeichnung</th><th>Raumart</th><th>L×B×H</th><th>Raumtemp.</th><th>Zieltemp.</th><th style="text-align:right;">Aktionen</th></tr></thead>
                            <tbody>
                                ${liste.map(ksItem => `
                                    <tr>
                                        <td><strong>${escapeHtml(ksItem.bezeichnung || 'Unbenannt')}</strong></td>
                                        <td>${escapeHtml(ksItem.raumart || '–')}</td>
                                        <td>${[ksItem.laenge, ksItem.breite, ksItem.hoehe].filter(v => v !== undefined && v !== '' && v !== null).length ? `${ksItem.laenge ?? '–'} × ${ksItem.breite ?? '–'} × ${ksItem.hoehe ?? '–'} m` : '–'}</td>
                                        <td>${ksItem.raumtemperatur !== undefined && ksItem.raumtemperatur !== '' ? ksItem.raumtemperatur + ' °C' : '–'}</td>
                                        <td>${ksItem.produktTemperaturZiel !== undefined && ksItem.produktTemperaturZiel !== '' ? ksItem.produktTemperaturZiel + ' °C' : '–'}</td>
                                        <td style="text-align:right;white-space:nowrap;">
                                            <button class="btn btn-sm btn-outline" onclick="app.openKuehlstelleModal(${idJS(project.id)}, '${ksItem.id}')">${icon('edit')}</button>
                                            <button class="btn btn-sm btn-danger" onclick="app.deleteKuehlstelle(${idJS(project.id)}, '${ksItem.id}')">${icon('trash')}</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            `;
        }

        // ---- Kältelast-Tab: zeigt für jede Kühlstelle die aufgeschlüsselte
        // Berechnung. Jeder Wert zeigt seinen Status; überschriebene Werte
        // landen als echte Eingabe an der Kühlstelle und lösen eine komplette
        // Neuberechnung aus (die Engine rechnet ohnehin immer frisch durch).
        function renderKaelteTabKaeltelast(project) {
            const a = kaelteAuslegung(project);
            if (a.anzahlGesamt === 0) {
                return `<div class="empty-state"><div style="font-size:40px;">🧊</div>
                    <p>Noch keine Kühlstelle erfasst.<br>Die Kältelast wird je Kühlstelle berechnet.</p>
                    <button class="btn btn-primary" onclick="app.kaelteSetTab(${idJS(project.id)}, 'kuehlstellen')">Zu den Kühlstellen</button></div>`;
            }

            const statusChip = (st) => {
                const s = KAELTE_STATUS[st] || KAELTE_STATUS.schaetzung;
                return `<span class="kl-status kl-status-${st}" title="${escapeHtml(s.label)}">${s.icon}</span>`;
            };

            // Werte, die der Techniker sinnvoll überschreiben können muss.
            const editierbar = [
                ['daemmstaerke', 'Dämmstärke', 'mm'], ['uWert', 'U-Wert', 'W/m²K'],
                ['aussentemperatur', 'Außentemperatur', '°C'], ['aussenfeuchte', 'Außenluftfeuchte', '%'],
                ['raumfeuchte', 'Raumfeuchte', '%'], ['tueroeffnungen', 'Türöffnungen', '/h'],
                ['luftwechsel', 'Luftwechsel', '1/h'], ['personen', 'Personen', ''],
                ['personenStunden', 'Aufenthalt', 'h/Tag'], ['beleuchtung', 'Beleuchtung', 'W'],
                ['beleuchtungStunden', 'Brenndauer', 'h/Tag'], ['ventilatorleistung', 'Ventilatorleistung', 'W'],
                ['sonstigeWaerme', 'Sonstige Verbraucher', 'W'], ['produktmenge', 'Produktmenge', 'kg/Tag'],
                ['produktEintrittstemperatur', 'Produkt-Eintritt', '°C'], ['produktTemperaturZiel', 'Zieltemperatur', '°C'],
                ['abkuehlzeit', 'Abkühlzeit', 'h'], ['sicherheitszuschlag', 'Sicherheitszuschlag', '%'],
                ['laufzeit', 'Verdichterlaufzeit', 'h/Tag'], ['verdampfungstemperatur', 'Verdampfungstemperatur', '°C']
            ];

            const bloecke = a.ergebnisse.map(({ ks, werte, ergebnis, meldungen }) => {
                const w = key => werte[key];
                const eingabeZeilen = editierbar.map(([key, label, unit]) => {
                    const e = w(key);
                    if (!e) return '';
                    return `<tr>
                        <td>${statusChip(e.status)} ${escapeHtml(label)}</td>
                        <td style="width:110px;"><input type="text" inputmode="decimal" value="${e.wert ?? ''}" data-ks="${ks.id}" data-feld="${key}" class="kl-input" placeholder="–"></td>
                        <td style="width:60px;color:var(--text-muted);font-size:11.5px;">${escapeHtml(unit)}</td>
                        <td style="font-size:11.5px;color:var(--text-muted);">${escapeHtml(e.herkunft || '')}</td>
                    </tr>`;
                }).join('');

                const produktartSelect = `
                    <div class="form-group" style="margin-bottom:10px;"><label>Produktart ${statusChip(w('produktart').status)}</label>
                        <select class="kl-select" data-ks="${ks.id}" data-feld="produktart">
                            ${Object.keys(KAELTE_RICHTWERTE.produkte).map(p => `<option value="${escapeHtml(p)}" ${w('produktart').wert === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:10px;"><label>Nutzungsgrad (steuert Beleuchtung & Türöffnungen)</label>
                        <select class="kl-select" data-ks="${ks.id}" data-feld="nutzungsgrad">
                            ${['niedrig', 'normal', 'hoch'].map(n => `<option value="${n}" ${(ks.nutzungsgrad || 'normal') === n ? 'selected' : ''}>${n}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:2px;"><label>Abtauart ${statusChip(w('abtauart').status)}</label>
                        <select class="kl-select" data-ks="${ks.id}" data-feld="abtauart">
                            ${KUEHLSTELLE_ABTAUARTEN.map(x => `<option value="${escapeHtml(x)}" ${w('abtauart').wert === x ? 'selected' : ''}>${escapeHtml(x)}</option>`).join('')}
                        </select>
                    </div>`;

                const ergebnisHtml = !ergebnis.moeglich
                    ? `<div class="empty-note" style="padding:12px;">${escapeHtml(ergebnis.hinweise[0] || 'Berechnung nicht möglich.')}</div>`
                    : `
                        <table class="kl-ergebnis">
                            <tbody>
                                ${ergebnis.teile.map(t => `<tr><td>${escapeHtml(t.name)}</td><td class="kl-w">${Math.round(t.watt).toLocaleString('de-AT')} W</td></tr>
                                    <tr class="kl-formel"><td colspan="2">${escapeHtml(t.formel)}</td></tr>`).join('')}
                                <tr class="kl-sum"><td>Zwischensumme</td><td class="kl-w">${Math.round(ergebnis.nutzlast).toLocaleString('de-AT')} W</td></tr>
                                <tr><td>Sicherheitszuschlag ${ergebnis.zuschlagProzent} %</td><td class="kl-w">${Math.round(ergebnis.zuschlagWatt).toLocaleString('de-AT')} W</td></tr>
                                <tr class="kl-sum"><td>Gesamtkältelast</td><td class="kl-w">${(ergebnis.gesamt / 1000).toFixed(2).replace('.', ',')} kW</td></tr>
                                <tr class="kl-total"><td>Erforderliche Anlagenleistung<br><small>bei ${ergebnis.laufzeit} h Laufzeit/Tag</small></td><td class="kl-w">${(ergebnis.auslegung / 1000).toFixed(2).replace('.', ',')} kW</td></tr>
                                ${ergebnis.abtauheizung ? `<tr><td>${KAELTE_STATUS.pruefen.icon} Abtauheizung (Richtwert)</td><td class="kl-w">${(ergebnis.abtauheizung / 1000).toFixed(2).replace('.', ',')} kW</td></tr>
                                    <tr class="kl-formel"><td colspan="2">Grober Richtwert – verbindlich ist der Wert aus dem Verdampfer-Datenblatt.</td></tr>` : ''}
                            </tbody>
                        </table>
                        ${(ergebnis.hinweise || []).map(h => `<div class="kl-hinweis kl-${h.art}">${escapeHtml(h.text)}</div>`).join('')}
                    `;

                const meldungenHtml = meldungen.map(m => `<div class="kl-hinweis kl-${m.art}">${m.art === 'fehler' ? '✕' : m.art === 'warnung' ? '⚠' : '🔴'} ${escapeHtml(m.text)}</div>`).join('');

                return `
                    <div class="form-card">
                        <div class="form-card-title">🧊 ${escapeHtml(ks.bezeichnung || 'Unbenannt')}</div>
                        <div class="kl-spalten">
                            <div>
                                <div class="kl-untertitel">Eingaben &amp; Vorschläge</div>
                                ${produktartSelect}
                                <table class="kl-eingaben"><tbody>${eingabeZeilen}</tbody></table>
                                <div style="font-size:11.5px;color:var(--text-muted);margin-top:8px;">Feld leeren = wieder automatischer Vorschlag. Jede Änderung rechnet alles Abhängige neu durch.</div>
                            </div>
                            <div>
                                <div class="kl-untertitel">Ergebnis</div>
                                ${ergebnisHtml}
                                ${meldungenHtml}
                            </div>
                        </div>
                    </div>`;
            }).join('');

            const legende = Object.entries(KAELTE_STATUS).map(([k, s]) => `<span>${s.icon} ${escapeHtml(s.label)}</span>`).join('');

            return `
                <div class="kl-legende">${legende}</div>
                ${a.anzahlRechenbar > 1 ? `
                    <div class="form-card kl-gesamt">
                        <div class="form-card-title">Summe über alle Kühlstellen</div>
                        <div style="display:flex;gap:22px;flex-wrap:wrap;">
                            <div><div class="kl-gross">${(a.summeGesamt / 1000).toFixed(2).replace('.', ',')} kW</div><div class="kl-klein">Gesamtkältelast</div></div>
                            <div><div class="kl-gross">${(a.summeAuslegung / 1000).toFixed(2).replace('.', ',')} kW</div><div class="kl-klein">erforderliche Anlagenleistung</div></div>
                            <div><div class="kl-gross">${a.anzahlRechenbar} / ${a.anzahlGesamt}</div><div class="kl-klein">Kühlstellen berechenbar</div></div>
                        </div>
                        <div class="kl-hinweis kl-pruefen" style="margin-top:10px;">🔴 Das ist die einfache Summe. Gleichzeitigkeitsfaktoren für Verbundanlagen kommen in der Verbund-Phase – vorher darf diese Zahl nicht als Verdichterleistung verwendet werden.</div>
                    </div>` : ''}
                ${bloecke}
            `;
        }


        // ---- Anlage-Tab: Auslegungsbedingungen + Kreisprozess je Kühlstelle.
        // Die Auslegungsbedingungen (Kältemittel, Verflüssigung, Überhitzung,
        // Unterkühlung) gelten für die ganze Anlage und liegen deshalb am
        // Projekt. Die Verdampfungstemperatur kommt je Kühlstelle aus der
        // Kältelast-Ebene.
        function kaelteAuslegungsdaten(project) {
            const a = project.kaelte.auslegung || {};
            return {
                kaeltemittel: a.kaeltemittel || 'R290',
                tVerfluessigung: a.tVerfluessigung != null ? Number(a.tVerfluessigung) : 40,
                ueberhitzung: a.ueberhitzung != null ? Number(a.ueberhitzung) : 8,
                unterkuehlung: a.unterkuehlung != null ? Number(a.unterkuehlung) : 4
            };
        }

        function renderKaelteTabAnlage(project) {
            const A = kaelteAuslegungsdaten(project);
            const a = kaelteAuslegung(project);
            const km = kmListe();

            const kopf = `
                <div class="form-card">
                    <div class="form-card-title">Auslegungsbedingungen (gelten für die ganze Anlage)</div>
                    <div class="survey-grid">
                        <div class="form-group"><label>Kältemittel</label>
                            <select class="ka-in" data-feld="kaeltemittel">
                                ${km.map(k => `<option value="${k.key}" ${A.kaeltemittel === k.key ? 'selected' : ''}>${escapeHtml(k.key)} – ${escapeHtml(k.label)}${k.blend ? ' (Blend)' : ''}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group"><label>Verflüssigungstemperatur <small>(°C)</small></label><input type="text" inputmode="decimal" class="ka-in" data-feld="tVerfluessigung" value="${A.tVerfluessigung}"></div>
                        <div class="form-group"><label>Sauggasüberhitzung <small>(K)</small></label><input type="text" inputmode="decimal" class="ka-in" data-feld="ueberhitzung" value="${A.ueberhitzung}"></div>
                        <div class="form-group"><label>Unterkühlung <small>(K)</small></label><input type="text" inputmode="decimal" class="ka-in" data-feld="unterkuehlung" value="${A.unterkuehlung}"></div>
                    </div>
                    ${km.find(k => k.key === A.kaeltemittel && k.blend) ? '<div class="kl-hinweis kl-pruefen">🔴 Gemisch (Blend): Stoffdaten aus einem Gemischmodell, Temperaturgleit nicht berücksichtigt. Für die endgültige Auslegung das Herstellerdatenblatt verwenden.</div>' : ''}
                </div>`;

            if (a.anzahlGesamt === 0) return kopf + `<div class="empty-note" style="padding:14px;">Noch keine Kühlstelle erfasst – ohne Kältelast kein Kreisprozess.</div>`;

            const bloecke = a.ergebnisse.map(({ ks, werte, ergebnis }) => {
                if (!ergebnis.moeglich) return `<div class="form-card"><div class="form-card-title">🧊 ${escapeHtml(ks.bezeichnung || 'Unbenannt')}</div><div class="empty-note" style="padding:10px;">Kältelast noch nicht berechenbar.</div></div>`;
                const tVerd = werte.verdampfungstemperatur ? werte.verdampfungstemperatur.wert : null;
                const kp = kaelteKreisprozess({
                    kaeltemittel: A.kaeltemittel, tVerdampfung: tVerd, tVerfluessigung: A.tVerfluessigung,
                    ueberhitzung: A.ueberhitzung, unterkuehlung: A.unterkuehlung, kaelteleistungW: ergebnis.auslegung
                });
                if (!kp.moeglich) return `<div class="form-card"><div class="form-card-title">🧊 ${escapeHtml(ks.bezeichnung || 'Unbenannt')}</div><div class="kl-hinweis kl-fehler">✕ ${escapeHtml(kp.hinweise[0])}</div></div>`;
                return `
                    <div class="form-card">
                        <div class="form-card-title">🧊 ${escapeHtml(ks.bezeichnung || 'Unbenannt')}</div>
                        <table class="kl-ergebnis"><tbody>
                            <tr><td>Kälteleistung (aus Kältelast)</td><td class="kl-w">${(ergebnis.auslegung / 1000).toFixed(2).replace('.', ',')} kW</td></tr>
                            <tr><td>Verdampfungstemperatur</td><td class="kl-w">${tVerd} °C</td></tr>
                            <tr><td>Verdampfungsdruck</td><td class="kl-w">${kp.pVerdampfung.toFixed(2).replace('.', ',')} bar</td></tr>
                            <tr><td>Verflüssigungsdruck</td><td class="kl-w">${kp.pVerfluessigung.toFixed(2).replace('.', ',')} bar</td></tr>
                            <tr><td>Druckverhältnis</td><td class="kl-w">${kp.druckverhaeltnis.toFixed(2).replace('.', ',')}</td></tr>
                            <tr><td>spez. Kälteleistung q₀</td><td class="kl-w">${kp.q0.toFixed(1).replace('.', ',')} kJ/kg</td></tr>
                            <tr class="kl-sum"><td>Massenstrom</td><td class="kl-w">${kp.mDotKgH.toFixed(1).replace('.', ',')} kg/h</td></tr>
                            <tr class="kl-formel"><td colspan="2">ṁ = Q̇₀ / q₀ · q₀ = h₁(überhitzt) − h₃(unterkühlt)</td></tr>
                            <tr><td>Volumenstrom Saugleitung</td><td class="kl-w">${kp.volumenstromSaug.toFixed(1).replace('.', ',')} m³/h</td></tr>
                            <tr><td>Volumenstrom Flüssigkeitsleitung</td><td class="kl-w">${kp.volumenstromFluessig.toFixed(2).replace('.', ',')} m³/h</td></tr>
                            <tr><td>Volumenstrom Druckleitung</td><td class="kl-w">${kp.volumenstromHeissgas.toFixed(1).replace('.', ',')} m³/h</td></tr>
                            <tr class="kl-formel"><td colspan="2">Dichten: Sauggas ${kp.rhoSaug.toFixed(2)} · flüssig ${kp.rhoFluessig.toFixed(0)} · Heißgas ${kp.rhoHeissgas.toFixed(2)} kg/m³ – je Leitung eigene Dichte</td></tr>
                        </tbody></table>
                        ${(kp.hinweise || []).map(h => `<div class="kl-hinweis kl-${h.art}">${escapeHtml(h.text)}</div>`).join('')}
                    </div>`;
            }).join('');
            return kopf + bloecke;
        }

        // ---- Rohrleitungen-Tab
        const ROHR_ARTEN = [
            { key: 'saug', label: 'Saugleitung' },
            { key: 'fluessig', label: 'Flüssigkeitsleitung' },
            { key: 'heissgas', label: 'Druck-/Heißgasleitung' }
        ];
        const ROHR_FORMSTUECKE = [
            ['bogen90', 'Bögen 90°'], ['bogen45', 'Bögen 45°'],
            ['tStueckDurchgang', 'T-Stück Durchgang'], ['tStueckAbzweig', 'T-Stück Abzweig'],
            ['ventil', 'Ventile'], ['magnetventil', 'Magnetventile'],
            ['filtertrockner', 'Filtertrockner'], ['schauglas', 'Schaugläser'], ['rueckschlagventil', 'Rückschlagventile']
        ];

        function renderKaelteTabRohr(project) {
            const A = kaelteAuslegungsdaten(project);
            const a = kaelteAuslegung(project);
            if (a.anzahlGesamt === 0) return `<div class="empty-note" style="padding:14px;">Noch keine Kühlstelle erfasst.</div>`;

            const bloecke = a.ergebnisse.map(({ ks, werte, ergebnis }) => {
                if (!ergebnis.moeglich) return '';
                const tVerd = werte.verdampfungstemperatur ? werte.verdampfungstemperatur.wert : null;
                const kp = kaelteKreisprozess({
                    kaeltemittel: A.kaeltemittel, tVerdampfung: tVerd, tVerfluessigung: A.tVerfluessigung,
                    ueberhitzung: A.ueberhitzung, unterkuehlung: A.unterkuehlung, kaelteleistungW: ergebnis.auslegung
                });
                if (!kp.moeglich) return `<div class="form-card"><div class="form-card-title">🧊 ${escapeHtml(ks.bezeichnung)}</div><div class="kl-hinweis kl-fehler">✕ ${escapeHtml(kp.hinweise[0])}</div></div>`;

                const rohrDaten = ks.rohr || {};
                const artBloecke = ROHR_ARTEN.map(art => {
                    const g = rohrDaten[art.key] || {};
                    const geo = {
                        laenge: Number(g.laenge) || 0,
                        hoehenunterschied: Number(g.hoehenunterschied) || 0,
                        formstuecke: Object.fromEntries(ROHR_FORMSTUECKE.map(([k]) => [k, Number(g[k]) || 0]))
                    };
                    const aus = kaelteRohrAuswahl(art.key, kp, geo);
                    const emp = aus.empfehlung;
                    const gewaehlt = g.gewaehlt || (emp ? emp.rohr.bez : null);
                    const zeile = aus.varianten.find(v => v.rohr.bez === gewaehlt) || emp;

                    return `
                        <div class="rohr-block">
                            <div class="rohr-kopf">${escapeHtml(art.label)}${geo.hoehenunterschied > 0.5 ? ' <span class="rohr-tag">Steigleitung</span>' : ''}</div>
                            <div class="rohr-eingaben">
                                <label>Länge (m)<input type="text" inputmode="decimal" class="ro-in" data-ks="${ks.id}" data-art="${art.key}" data-feld="laenge" value="${g.laenge ?? ''}"></label>
                                <label>Höhenunterschied (m)<input type="text" inputmode="decimal" class="ro-in" data-ks="${ks.id}" data-art="${art.key}" data-feld="hoehenunterschied" value="${g.hoehenunterschied ?? ''}"></label>
                                ${ROHR_FORMSTUECKE.map(([k, l]) => `<label>${escapeHtml(l)}<input type="text" inputmode="decimal" class="ro-in" data-ks="${ks.id}" data-art="${art.key}" data-feld="${k}" value="${g[k] ?? ''}"></label>`).join('')}
                            </div>
                            ${!geo.laenge ? '<div class="empty-note" style="padding:8px;font-size:12px;">Länge eintragen, dann wird dimensioniert.</div>' : !emp ? '<div class="kl-hinweis kl-fehler">✕ Keine der verfügbaren Kupferdimensionen erfüllt alle Kriterien. Massenstrom, Leitungsführung oder Auslegungsbedingungen prüfen.</div>' : `
                                <div class="rohr-empfehlung">Empfehlung: <strong>${escapeHtml(emp.rohr.bez)}</strong> · ${emp.w.toFixed(1).replace('.', ',')} m/s · Δp ${emp.dpGesamtBar.toFixed(3).replace('.', ',')} bar · äquiv. Länge ${emp.lGesamt.toFixed(1).replace('.', ',')} m</div>
                                <div class="form-group" style="margin:8px 0 6px;"><label>Gewählte Dimension</label>
                                    <select class="ro-in" data-ks="${ks.id}" data-art="${art.key}" data-feld="gewaehlt">
                                        ${aus.varianten.map(v => `<option value="${escapeHtml(v.rohr.bez)}" ${gewaehlt === v.rohr.bez ? 'selected' : ''}>${escapeHtml(v.rohr.bez)} — ${v.w.toFixed(1)} m/s, Δp ${v.dpGesamtBar.toFixed(3)} bar${v.ok ? '' : ' ⚠ ungeeignet'}</option>`).join('')}
                                    </select>
                                </div>
                                ${zeile ? `
                                <table class="kl-ergebnis"><tbody>
                                    <tr><td>Innendurchmesser</td><td class="kl-w">${zeile.rohr.di.toFixed(1).replace('.', ',')} mm</td></tr>
                                    <tr><td>Strömungsgeschwindigkeit</td><td class="kl-w">${zeile.w.toFixed(2).replace('.', ',')} m/s</td></tr>
                                    <tr><td>Reynoldszahl</td><td class="kl-w">${Math.round(zeile.re).toLocaleString('de-AT')}</td></tr>
                                    <tr><td>Formstücke als äquiv. Länge</td><td class="kl-w">${zeile.aeqLaenge.toFixed(1).replace('.', ',')} m</td></tr>
                                    <tr class="kl-formel"><td colspan="2">${escapeHtml(zeile.aeqDetail.join(' · ') || 'keine Formstücke')}</td></tr>
                                    <tr><td>Δp Rohrreibung</td><td class="kl-w">${zeile.dpReibungBar.toFixed(4).replace('.', ',')} bar</td></tr>
                                    <tr><td>Δp Höhenunterschied</td><td class="kl-w">${zeile.dpHoeheBar.toFixed(4).replace('.', ',')} bar</td></tr>
                                    <tr class="kl-sum"><td>Δp gesamt</td><td class="kl-w">${zeile.dpGesamtBar.toFixed(4).replace('.', ',')} bar</td></tr>
                                    <tr class="kl-formel"><td colspan="2">Darcy-Weisbach, Rohrreibungszahl nach Colebrook-White (λ = ${zeile.f.toFixed(4)})</td></tr>
                                </tbody></table>
                                ${zeile.bewertung.map(b => `<div class="kl-hinweis kl-${b.art}">${b.art === 'fehler' ? '✕' : '⚠'} ${escapeHtml(b.text)}</div>`).join('')}` : ''}
                            `}
                        </div>`;
                }).join('');

                return `<div class="form-card">
                    <div class="form-card-title">🧊 ${escapeHtml(ks.bezeichnung || 'Unbenannt')} · ${(ergebnis.auslegung / 1000).toFixed(2).replace('.', ',')} kW · ${kp.mDotKgH.toFixed(1).replace('.', ',')} kg/h</div>
                    ${artBloecke}
                </div>`;
            }).join('');

            return `<div class="kl-hinweis kl-pruefen" style="margin-bottom:12px;">🔴 Mindestgeschwindigkeit für den Öltransport wird bei Steigleitungen strenger geprüft. Teillastbetrieb ist damit noch NICHT abgedeckt – bei geregelten Anlagen gesondert prüfen.</div>${bloecke}`;
        }


        // ---- Komponenten: EINGABEMASKE, kein Herstellerkatalog.
        // Bewusste Entscheidung: echte Verdichter-, Verdampfer- und Ventil-
        // daten kann diese App nicht erfinden. Der Techniker traegt sein
        // Geraet mit den Daten aus dem Datenblatt ein, das Programm prueft
        // die Leistung gegen den berechneten Betriebspunkt und uebernimmt
        // die Position spaeter in Material und Angebot.
        const KOMPONENTEN_VORLAGE = {
            einzel:  ['Verflüssigungssatz', 'Verdampfer', 'Expansionsventil', 'Magnetventil', 'Filtertrockner', 'Schauglas', 'Druckschalter', 'Temperaturfühler', 'Regelung'],
            verbund: ['Verdichter', 'Verflüssiger', 'Flüssigkeitssammler', 'Ölabscheider', 'Ölmanagement', 'Verdampfer', 'Expansionsventil', 'Magnetventil', 'Filtertrockner', 'Schauglas', 'Druckschalter', 'Sicherheitsventil', 'Regelung'],
            hdmd:    ['Verdichter MT', 'Verdichter LT', 'Parallelverdichter', 'Gaskühler', 'Hochdruckventil', 'Flashgas-Ventil', 'Mitteldrucksammler', 'Verdampfer', 'Expansionsventil', 'Ölmanagement', 'Drucksensorik', 'Sicherheitsventil', 'Regelung'],
            custom:  ['Verdichter', 'Verflüssiger/Gaskühler', 'Verdampfer', 'Expansionsventil', 'Sammler', 'Regelung']
        };

        // ---- Anforderungsprofil je Komponente.
        // Das Programm rechnet aus, WAS gebraucht wird. Das konkrete Geraet
        // traegt der Techniker ein - und es wandert dabei in die eigene
        // Geraetedatenbank, damit es beim naechsten Projekt vorgeschlagen wird.
        //
        // Verfluessigerleistung: Qc = Q0 + Verdichterleistung. Ohne Verdichter-
        // datenblatt ist die Verdichterleistung nicht exakt bestimmbar, deshalb
        // ein klar gekennzeichneter Richtwertfaktor nach Temperaturbereich.
        // Sobald ein Verdichter mit Leistungsaufnahme eingetragen ist, wird
        // damit gerechnet statt mit dem Richtwert.
        function kaelteKomponentenBedarf(project) {
            const A = kaelteAuslegungsdaten(project);
            const a = kaelteAuslegung(project);
            const art = project.kaelte.anlagenart || 'einzel';
            const q0KW = a.summeAuslegung / 1000;
            if (!q0KW) return { moeglich: false, slots: [] };

            // Massgebende (tiefste) Verdampfungstemperatur
            const tVerd = Math.min(...a.ergebnisse.filter(e => e.ergebnis.moeglich)
                .map(e => e.werte.verdampfungstemperatur.wert));
            const kp = kaelteKreisprozess({ kaeltemittel: A.kaeltemittel, tVerdampfung: tVerd,
                tVerfluessigung: A.tVerfluessigung, ueberhitzung: A.ueberhitzung,
                unterkuehlung: A.unterkuehlung, kaelteleistungW: a.summeAuslegung });

            const betrieb = `${A.kaeltemittel} · t₀ ${tVerd} °C · tc ${A.tVerfluessigung} °C · ΔtÜH ${A.ueberhitzung} K · Δtuk ${A.unterkuehlung} K`;
            const komp = project.kaelte.komponenten || [];
            const verdichter = komp.find(c => /verdichter|verflüssigungssatz|aggregat/i.test(c.typ || '') && Number(c.leistungsaufnahmeKW) > 0);

            let qcKW, qcQuelle, qcStatus;
            if (verdichter) {
                qcKW = q0KW + Number(verdichter.leistungsaufnahmeKW);
                qcQuelle = `Q₀ ${q0KW.toFixed(2)} kW + Leistungsaufnahme ${Number(verdichter.leistungsaufnahmeKW).toFixed(2)} kW aus "${verdichter.typ}"`;
                qcStatus = 'berechnet';
            } else {
                const faktor = tVerd < -15 ? 1.5 : 1.3;
                qcKW = q0KW * faktor;
                qcQuelle = `Q₀ × ${faktor.toFixed(2).replace('.', ',')} – Richtwert für ${tVerd < -15 ? 'Tiefkühlung' : 'Normalkühlung'}. Sobald ein Verdichter mit Leistungsaufnahme eingetragen ist, wird exakt gerechnet.`;
                qcStatus = 'schaetzung';
            }

            const slots = [];
            const add = (typ, kw, einheit, quelle, status, extra) => slots.push({ typ, kw, einheit: einheit || 'kW', quelle, status: status || 'berechnet', extra: extra || betrieb });

            if (art === 'einzel') {
                add('Verflüssigungssatz', q0KW, 'kW Kälteleistung', `aus der Kältelastberechnung`, 'berechnet');
                add('Verflüssiger', qcKW, 'kW Wärmeabfuhr', qcQuelle, qcStatus);
            } else {
                add('Verdichter', q0KW, 'kW Kälteleistung', `Summe der Sauggruppen`, 'berechnet');
                add(art === 'hdmd' ? 'Gaskühler' : 'Verflüssiger', qcKW, 'kW Wärmeabfuhr', qcQuelle, qcStatus);
                add('Flüssigkeitssammler', 0, '', 'Volumen nach Füllmenge und Betriebszustand – Herstellervorgabe erforderlich', 'pruefen');
                add('Ölabscheider', 0, '', 'nach Verdichtergröße – Herstellervorgabe', 'pruefen');
            }
            add('Verdampfer', q0KW, 'kW Kälteleistung', 'je Kühlstelle einzeln auszulegen, Summe hier', 'berechnet');
            add('Expansionsventil', q0KW, 'kW Ventilkapazität',
                kp.moeglich ? `bei Δp ${(kp.pVerfluessigung - kp.pVerdampfung).toFixed(2).replace('.', ',')} bar und Massenstrom ${kp.mDotKgH.toFixed(1).replace('.', ',')} kg/h – Ventilkapazität ist bei DIESEN Bedingungen zu prüfen, nicht nur nach kW` : 'Betriebspunkt noch nicht berechenbar', 'berechnet');
            add('Filtertrockner', 0, '', kp.moeglich ? `für ${kp.mDotKgH.toFixed(1).replace('.', ',')} kg/h Massenstrom` : '', 'berechnet');
            add('Magnetventil', 0, '', 'Flüssigkeitsleitung, Nennweite nach gewählter Rohrdimension', 'berechnet');
            add('Schauglas', 0, '', 'Flüssigkeitsleitung', 'berechnet');

            return { moeglich: true, slots, q0KW, qcKW, tVerd, betrieb, kp, A };
        }

        function renderKaelteTabKomponenten(project) {
            const bedarf = kaelteKomponentenBedarf(project);
            const liste = project.kaelte.komponenten || [];

            if (!bedarf.moeglich) {
                return `<div class="empty-note" style="padding:14px;">Erst die Kältelast berechnen – dann steht hier, welche Leistung jede Komponente haben muss.</div>`;
            }

            const anfSlots = bedarf.slots.map((sl, i) => {
                const eingetragen = liste.filter(k => (k.typ || '').toLowerCase() === sl.typ.toLowerCase());
                const st = KAELTE_STATUS[sl.status] || KAELTE_STATUS.berechnet;
                return `
                    <div class="komp-slot">
                        <div class="komp-anf">
                            <div class="komp-anf-kopf">${escapeHtml(sl.typ)}
                                ${sl.kw > 0 ? `<span class="komp-kw">${st.icon} ${sl.kw.toFixed(2).replace('.', ',')} ${escapeHtml(sl.einheit)}</span>` : ''}
                            </div>
                            <div class="komp-anf-text">${escapeHtml(sl.quelle)}</div>
                            <div class="komp-anf-betrieb">${escapeHtml(sl.extra)}</div>
                        </div>
                        ${eingetragen.length ? eingetragen.map(k => {
                            const idx = liste.indexOf(k);
                            const leistung = Number(k.leistungKW) || 0;
                            let urteil = '';
                            if (leistung > 0 && sl.kw > 0) {
                                if (leistung < sl.kw * 0.98) urteil = `<span class="komp-urteil komp-schlecht">✕ ${leistung.toFixed(2).replace('.', ',')} kW &lt; Bedarf</span>`;
                                else if (leistung > sl.kw * 1.6) urteil = `<span class="komp-urteil komp-warn">⚠ ${leistung.toFixed(2).replace('.', ',')} kW – über 60 % Reserve</span>`;
                                else urteil = `<span class="komp-urteil komp-gut">✓ ${leistung.toFixed(2).replace('.', ',')} kW passt</span>`;
                            }
                            return `<div class="komp-geraet">
                                <div><strong>${escapeHtml([k.hersteller, k.modell].filter(Boolean).join(' ') || 'ohne Bezeichnung')}</strong>
                                ${k.artikelnummer ? `<span style="color:var(--text-muted);font-size:11px;"> · ${escapeHtml(k.artikelnummer)}</span>` : ''}
                                ${urteil}
                                <div style="font-size:11px;color:var(--text-muted);">${k.menge || 1} ${escapeHtml(k.einheit || 'Stk')}${k.ekPreis ? ' · EK ' + formatCurrency(Number(k.ekPreis)) : ''}${k.vkPreis ? ' · VK ' + formatCurrency(Number(k.vkPreis)) : ''}${k.quelle ? ' · ' + escapeHtml(k.quelle) : ''}</div></div>
                                <div style="white-space:nowrap;">
                                    <button class="btn btn-sm btn-outline" onclick="app.openKomponenteModal(${idJS(project.id)}, ${idx})">${icon('edit')}</button>
                                    <button class="btn btn-sm btn-danger" onclick="app.deleteKomponente(${idJS(project.id)}, ${idx})">${icon('trash')}</button>
                                </div>
                            </div>`;
                        }).join('') : ''}
                        <button class="btn btn-sm ${eingetragen.length ? 'btn-outline' : 'btn-primary'}" onclick="app.openKomponenteModal(${idJS(project.id)}, null, ${idJS(sl.typ)}, ${sl.kw})">${icon('plus')} ${eingetragen.length ? 'Weiteres Gerät' : 'Gerät eintragen'}</button>
                    </div>`;
            }).join('');

            const sonstige = liste.filter(k => !bedarf.slots.some(sl => sl.typ.toLowerCase() === (k.typ || '').toLowerCase()));

            return `
                <div class="kl-hinweis kl-info">Das Programm rechnet aus, <strong>welche Leistung</strong> jede Komponente braucht. Das konkrete Gerät suchst du beim Hersteller oder Lieferanten und trägst es hier ein – mit „In Gerätedatenbank speichern" steht es beim nächsten Projekt automatisch zur Auswahl.</div>
                <div class="form-card">
                    <div class="form-card-title">Betriebspunkt der Anlage</div>
                    <div class="survey-summary">
                        <div class="survey-chip"><span>Kälteleistung</span><strong>${bedarf.q0KW.toFixed(2).replace('.', ',')} kW</strong></div>
                        <div class="survey-chip"><span>Verdampfung (maßgebend)</span><strong>${bedarf.tVerd} °C</strong></div>
                        <div class="survey-chip"><span>Verflüssigung</span><strong>${bedarf.A.tVerfluessigung} °C</strong></div>
                        <div class="survey-chip"><span>Kältemittel</span><strong>${escapeHtml(bedarf.A.kaeltemittel)}</strong></div>
                        ${bedarf.kp.moeglich ? `<div class="survey-chip"><span>Massenstrom</span><strong>${bedarf.kp.mDotKgH.toFixed(1).replace('.', ',')} kg/h</strong></div>` : ''}
                    </div>
                </div>
                ${anfSlots}
                ${sonstige.length ? `<div class="form-card"><div class="form-card-title">Weitere Komponenten</div>
                    ${sonstige.map(k => `<div class="komp-geraet"><div><strong>${escapeHtml(k.typ)}</strong> ${escapeHtml([k.hersteller, k.modell].filter(Boolean).join(' '))}</div>
                        <div style="white-space:nowrap;"><button class="btn btn-sm btn-outline" onclick="app.openKomponenteModal(${idJS(project.id)}, ${liste.indexOf(k)})">${icon('edit')}</button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteKomponente(${idJS(project.id)}, ${liste.indexOf(k)})">${icon('trash')}</button></div></div>`).join('')}
                </div>` : ''}
                <div style="text-align:center;margin-top:12px;"><button class="btn btn-sm btn-outline" onclick="app.openKomponenteModal(${idJS(project.id)})">${icon('plus')} Freie Komponente hinzufügen</button></div>`;
        }

        // ---- Verbund: Sauggruppen und Gleichzeitigkeitsfaktoren.
        function renderKaelteTabVerbund(project) {
            const art = project.kaelte.anlagenart || 'einzel';
            const a = kaelteAuslegung(project);
            if (art === 'einzel') {
                return `<div class="empty-state"><div style="font-size:40px;">ℹ</div>
                    <p>Die Anlagenart ist <strong>Einzelanlage</strong> – da gibt es keine Sauggruppen.<br>
                    Für Verbundbetrieb im Schritt „Projekt" die Anlagenart umstellen; die Kühlstellen bleiben erhalten.</p></div>`;
            }
            if (a.anzahlRechenbar === 0) return '<div class="empty-note" style="padding:14px;">Noch keine berechenbare Kühlstelle.</div>';

            const gruppen = {};
            a.ergebnisse.forEach(e => {
                if (!e.ergebnis.moeglich) return;
                const tv = e.werte.verdampfungstemperatur ? e.werte.verdampfungstemperatur.wert : 0;
                const g = e.ks.sauggruppe || (tv < -15 ? 'LT' : 'MT');
                (gruppen[g] = gruppen[g] || []).push(e);
            });

            const gz = project.kaelte.gleichzeitigkeit || {};
            const bloecke = Object.entries(gruppen).map(([name, mitglieder]) => {
                const summe = mitglieder.reduce((s, e) => s + e.ergebnis.auslegung, 0);
                const faktor = gz[name] != null ? Number(gz[name]) : 1.0;
                const tvMin = Math.min(...mitglieder.map(e => e.werte.verdampfungstemperatur.wert));
                return `
                    <div class="form-card">
                        <div class="form-card-title">Sauggruppe ${escapeHtml(name)} · ${mitglieder.length} Verbraucher</div>
                        <table class="kl-ergebnis"><tbody>
                            ${mitglieder.map(e => `<tr><td>${escapeHtml(e.ks.bezeichnung)} <span style="color:var(--text-muted);font-size:11px;">(t₀ ${e.werte.verdampfungstemperatur.wert} °C)</span>
                                <select class="vb-in" data-ks="${e.ks.id}" data-feld="sauggruppe" style="margin-left:8px;padding:2px 5px;font-size:11px;width:auto;display:inline-block;">
                                    ${['MT', 'LT'].concat(Object.keys(gruppen).filter(x => x !== 'MT' && x !== 'LT')).map(x => `<option value="${escapeHtml(x)}" ${(e.ks.sauggruppe || (e.werte.verdampfungstemperatur.wert < -15 ? 'LT' : 'MT')) === x ? 'selected' : ''}>${escapeHtml(x)}</option>`).join('')}
                                </select></td>
                                <td class="kl-w">${(e.ergebnis.auslegung / 1000).toFixed(2).replace('.', ',')} kW</td></tr>`).join('')}
                            <tr class="kl-sum"><td>Summe der Einzellasten</td><td class="kl-w">${(summe / 1000).toFixed(2).replace('.', ',')} kW</td></tr>
                            <tr><td>Gleichzeitigkeitsfaktor<br><small style="color:var(--text-muted);">1,00 = keine Reduktion</small></td>
                                <td class="kl-w"><input type="text" inputmode="decimal" class="vb-gz" data-gruppe="${escapeHtml(name)}" value="${faktor}" style="width:75px;text-align:right;padding:4px 6px;"></td></tr>
                            <tr class="kl-total"><td>Auslegungsleistung Gruppe<br><small>maßgebende Verdampfung ${tvMin} °C</small></td><td class="kl-w">${(summe * faktor / 1000).toFixed(2).replace('.', ',')} kW</td></tr>
                        </tbody></table>
                    </div>`;
            }).join('');

            return `
                <div class="kl-hinweis kl-pruefen">🔴 Der Gleichzeitigkeitsfaktor steht bewusst auf 1,00 (volle Summe). Einen kleineren Wert darf nur setzen, wer das Lastprofil der Anlage kennt – ein geschätzter Faktor unterdimensioniert die Anlage. Diese App schlägt hier absichtlich keinen Wert vor.</div>
                ${bloecke}`;
        }

        // ---- Technische Prüfung: sammelt alles Offene an einer Stelle.
        function renderKaelteTabPruefung(project) {
            const A = kaelteAuslegungsdaten(project);
            const a = kaelteAuslegung(project);
            const punkte = [];

            punkte.push({ art: a.anzahlGesamt > 0 ? 'ok' : 'fehler', text: a.anzahlGesamt > 0 ? `${a.anzahlGesamt} Kühlstelle(n) erfasst, davon ${a.anzahlRechenbar} berechenbar.` : 'Keine Kühlstelle erfasst.' });
            if (a.anzahlGesamt !== a.anzahlRechenbar) punkte.push({ art: 'fehler', text: `${a.anzahlGesamt - a.anzahlRechenbar} Kühlstelle(n) sind nicht berechenbar – Raummaße, Raumtemperatur oder U-Wert fehlen.` });

            // Alle Schaetzungen sichtbar machen - nichts verstecken.
            const schaetzungen = [];
            a.ergebnisse.forEach(e => {
                Object.entries(e.werte).forEach(([k, w]) => {
                    if (w.status === 'schaetzung') schaetzungen.push(`${e.ks.bezeichnung}: ${k} = ${w.wert} (${w.herkunft})`);
                });
                (e.meldungen || []).forEach(m => { if (m.art === 'fehler' || m.art === 'warnung') punkte.push({ art: m.art, text: `${e.ks.bezeichnung}: ${m.text}` }); });
            });

            const komp = project.kaelte.komponenten || [];
            punkte.push({ art: komp.length ? 'ok' : 'warnung', text: komp.length ? `${komp.length} Komponente(n) eingetragen.` : 'Keine Komponenten eingetragen – ohne Herstellerdaten ist die Auslegung nicht abgeschlossen.' });
            const ohneQuelle = komp.filter(k => !k.quelle && !k.artikelnummer).length;
            if (ohneQuelle) punkte.push({ art: 'warnung', text: `${ohneQuelle} Komponente(n) ohne Artikelnummer oder Quelle.` });

            const mitRohr = a.ergebnisse.filter(e => e.ks.rohr && Object.values(e.ks.rohr).some(r => Number(r.laenge) > 0)).length;
            punkte.push({ art: mitRohr ? 'ok' : 'warnung', text: mitRohr ? `Rohrleitungen für ${mitRohr} Kühlstelle(n) dimensioniert.` : 'Noch keine Rohrleitung dimensioniert.' });

            if (KAELTEMITTEL[A.kaeltemittel] && KAELTEMITTEL[A.kaeltemittel].blend) punkte.push({ art: 'warnung', text: `${A.kaeltemittel} ist ein Gemisch – Stoffdaten aus Gemischmodell, Temperaturgleit nicht berücksichtigt.` });

            const ikon = { ok: '✓', warnung: '⚠', fehler: '✕' };
            return `
                <div class="form-card">
                    <div class="form-card-title">Technische Prüfung</div>
                    ${punkte.map(p => `<div class="kl-hinweis kl-${p.art === 'ok' ? 'info' : p.art}">${ikon[p.art]} ${escapeHtml(p.text)}</div>`).join('')}
                </div>
                <div class="form-card">
                    <div class="form-card-title">Verwendete Richtwert-Schätzungen (${schaetzungen.length})</div>
                    ${schaetzungen.length ? `<ul style="font-size:12px;line-height:1.6;margin:0;padding-left:18px;">${schaetzungen.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : '<div class="empty-note" style="padding:10px;">Keine – alle Werte sind eingegeben oder berechnet.</div>'}
                </div>
                <div class="kl-hinweis kl-pruefen">🔴 Diese Auslegung ist eine Vorauslegung. Das Programm kann und darf nicht bestätigen, dass die Anlage normgerecht ist. Vor Bestellung und Ausführung ist eine fachliche Prüfung anhand der gültigen Vorschriften und der Herstellerdatenblätter erforderlich.</div>`;
        }

        // Prueft je Schritt, ob weitergegangen werden kann. Gibt bewusst
        // KEINE Freigabe, wenn etwas fehlt - lieber einmal zu oft stoppen.
        function kaelteSchrittStatus(project, tab) {
            const k = project.kaelte;
            const stellen = k.kuehlstellen || [];
            const a = (tab === 'projekt') ? null : kaelteAuslegung(project);

            if (tab === 'projekt') {
                if (!k.anlagenart) return { status: 'fehler', text: 'Anlagenart noch nicht gewählt.' };
                return { status: 'ok', text: 'Anlagenart gewählt. Weiter zu den Kühlstellen.' };
            }
            if (tab === 'kuehlstellen') {
                if (!stellen.length) return { status: 'fehler', text: 'Noch keine Kühlstelle angelegt – ohne Kühlstelle kann nichts berechnet werden.' };
                const ohneMasse = stellen.filter(x => !(x.laenge && x.breite && x.hoehe) && !x.volumen);
                const ohneTemp = stellen.filter(x => x.raumtemperatur === undefined || x.raumtemperatur === '');
                if (ohneMasse.length || ohneTemp.length) return { status: 'fehler', text: `${[ohneMasse.length ? ohneMasse.length + '× ohne Raummaße' : '', ohneTemp.length ? ohneTemp.length + '× ohne Raumtemperatur' : ''].filter(Boolean).join(', ')}. Diese Angaben sind Pflicht.` };
                return { status: 'ok', text: `${stellen.length} Kühlstelle(n) vollständig genug für die Kältelast.` };
            }
            if (tab === 'kaeltelast') {
                if (!a.anzahlRechenbar) return { status: 'fehler', text: 'Keine Kühlstelle berechenbar.' };
                const fehler = a.ergebnisse.flatMap(e => (e.meldungen || []).filter(m => m.art === 'fehler'));
                if (fehler.length) return { status: 'fehler', text: `${fehler.length} unplausible Eingabe(n): ${fehler[0].text}` };
                const warn = a.ergebnisse.flatMap(e => (e.meldungen || []).filter(m => m.art === 'warnung'));
                const schaetz = a.ergebnisse.reduce((n, e) => n + Object.values(e.werte).filter(w => w.status === 'schaetzung').length, 0);
                if (warn.length) return { status: 'warnung', text: `${warn.length} Warnung(en), ${schaetz} Richtwert-Schätzungen. Ergebnis: ${(a.summeAuslegung / 1000).toFixed(2).replace('.', ',')} kW.` };
                return { status: 'ok', text: `Kältelast berechnet: ${(a.summeAuslegung / 1000).toFixed(2).replace('.', ',')} kW über ${a.anzahlRechenbar} Kühlstelle(n). ${schaetz} Werte sind Richtwert-Schätzungen – im Schritt Prüfung einsehbar.` };
            }
            if (tab === 'anlage') {
                const A = kaelteAuslegungsdaten(project);
                const kaputt = a.ergebnisse.filter(e => {
                    if (!e.ergebnis.moeglich) return false;
                    const kp = kaelteKreisprozess({ kaeltemittel: A.kaeltemittel, tVerdampfung: e.werte.verdampfungstemperatur && e.werte.verdampfungstemperatur.wert, tVerfluessigung: A.tVerfluessigung, ueberhitzung: A.ueberhitzung, unterkuehlung: A.unterkuehlung, kaelteleistungW: e.ergebnis.auslegung });
                    return !kp.moeglich;
                });
                if (kaputt.length) return { status: 'fehler', text: `Für ${kaputt.length} Kühlstelle(n) liegen mit ${A.kaeltemittel} bei ${A.tVerfluessigung} °C keine Stoffdaten vor (z. B. CO₂ transkritisch).` };
                return { status: 'ok', text: `Kreisprozess mit ${A.kaeltemittel} gerechnet. Massenströme stehen – weiter zu den Komponenten oder Rohrleitungen.` };
            }
            if (tab === 'komponenten') {
                const komp = k.komponenten || [];
                if (!komp.length) return { status: 'warnung', text: 'Noch keine Komponente eingetragen. Weitergehen geht, aber ohne Geräte gibt es später keine vollständige Materialliste.' };
                const zuKlein = komp.filter(c => Number(c.leistungKW) > 0 && Number(c.leistungKW) < a.summeAuslegung / 1000 * 0.98 && /verdichter|verflüssigungssatz|verdampfer|aggregat/i.test(c.typ || ''));
                if (zuKlein.length) return { status: 'fehler', text: `${zuKlein.length} Gerät(e) liegen unter dem berechneten Bedarf von ${(a.summeAuslegung / 1000).toFixed(2).replace('.', ',')} kW.` };
                const ohneQuelle = komp.filter(c => !c.quelle && !c.artikelnummer).length;
                if (ohneQuelle) return { status: 'warnung', text: `${ohneQuelle} Komponente(n) ohne Artikelnummer oder Quelle – für die Bestellung noch nachtragen.` };
                return { status: 'ok', text: `${komp.length} Komponente(n) eingetragen und zur Leistung passend.` };
            }
            if (tab === 'rohrleitungen') {
                const mitRohr = a.ergebnisse.filter(e => e.ks.rohr && Object.values(e.ks.rohr).some(r => Number(r.laenge) > 0));
                if (!mitRohr.length) return { status: 'warnung', text: 'Noch keine Leitungslänge eingetragen. Ohne Längen gibt es keine Dimension und kein Rohrmaterial.' };
                return { status: 'ok', text: `Rohrleitungen für ${mitRohr.length} Kühlstelle(n) dimensioniert. Warnungen zu Öltransport und Teillast stehen direkt bei der jeweiligen Leitung.` };
            }
            if (tab === 'verbund') {
                if ((k.anlagenart || 'einzel') === 'einzel') return { status: 'ok', text: 'Einzelanlage – kein Verbund erforderlich.' };
                return { status: 'warnung', text: 'Gleichzeitigkeitsfaktoren prüfen. Solange sie auf 1,00 stehen, wird die volle Summe ausgelegt – das ist sicher, aber möglicherweise zu groß.' };
            }
            if (tab === 'pruefung') return { status: 'warnung', text: 'Fachliche Prüfung anhand der Herstellerdatenblätter und der gültigen Vorschriften bleibt erforderlich – das kann das Programm nicht ersetzen.' };
            return { status: 'warnung', text: 'Dieser Schritt ist noch nicht umgesetzt.' };
        }

        // ---- Materialliste: wird aus der Auslegung ABGELEITET, nicht geraten.
        // Rohrmeter und Formstuecke kommen aus den Eingaben im Rohr-Schritt,
        // Isolierung aus der Rohrlaenge, Schellen aus einem Verlegeabstand.
        // Alles ist danach frei editierbar (Menge, EK, VK) und Eigenposten
        // koennen ergaenzt werden.
        const MAT_SCHELLENABSTAND_M = 1.5;   // üblicher Abstand Rohrschellen
        const MAT_VERSCHNITT = 1.05;         // 5 % Verschnitt auf Rohr und Isolierung

        function kaelteMaterialListe(project) {
            const A = kaelteAuslegungsdaten(project);
            const a = kaelteAuslegung(project);
            const pos = [];
            const eigen = project.kaelte.materialEigen || {};   // Überschreibungen je Schlüssel
            // Umgebungsbedingungen am Montageort - bestimmen Taupunkt und
            // damit die Daemmstaerke. Aenderbar unter Auslegungsbedingungen.
            const umgebungT = Number((project.kaelte.auslegung || {}).umgebungT) || 25;
            const umgebungRH = Number((project.kaelte.auslegung || {}).umgebungRH) || 70;
            const leitungenFuerFuellmenge = [];

            const add = (schluessel, kategorie, name, beschreibung, menge, einheit, herkunft) => {
                const o = eigen[schluessel] || {};
                pos.push({
                    schluessel, kategorie, name, beschreibung, einheit,
                    menge: o.menge != null ? Number(o.menge) : menge,
                    ekPreis: o.ekPreis != null ? Number(o.ekPreis) : null,
                    vkPreis: o.vkPreis != null ? Number(o.vkPreis) : null,
                    herkunft, geaendert: o.menge != null
                });
            };

            // 1) Komponenten aus Schritt 5
            (project.kaelte.komponenten || []).forEach((k, i) => {
                const sl = `komp_${i}`;
                const o = eigen[sl] || {};
                pos.push({
                    schluessel: sl, kategorie: 'Komponente',
                    name: [k.hersteller, k.modell].filter(Boolean).join(' ') || k.typ,
                    beschreibung: [k.typ, k.artikelnummer, k.leistungKW ? Number(k.leistungKW).toFixed(2).replace('.', ',') + ' kW' : '', k.anschluss].filter(Boolean).join(' · '),
                    einheit: k.einheit || 'Stk',
                    menge: o.menge != null ? Number(o.menge) : (Number(k.menge) || 1),
                    ekPreis: o.ekPreis != null ? Number(o.ekPreis) : (k.ekPreis != null ? Number(k.ekPreis) : null),
                    vkPreis: o.vkPreis != null ? Number(o.vkPreis) : (k.vkPreis != null ? Number(k.vkPreis) : null),
                    herkunft: 'aus Schritt Komponenten', geaendert: o.menge != null
                });
            });

            // 2) Rohr, Isolierung, Formstücke je Kühlstelle und Leitung
            a.ergebnisse.forEach(e => {
                const rohr = e.ks.rohr || {};
                const tVerd = e.werte.verdampfungstemperatur ? e.werte.verdampfungstemperatur.wert : null;
                ROHR_ARTEN.forEach(art => {
                    const g = rohr[art.key] || {};
                    const laenge = Number(g.laenge) || 0;
                    if (!laenge) return;
                    const dim = g.gewaehlt || '(Dimension noch offen)';
                    const pre = `${e.ks.id}_${art.key}`;
                    const kurz = `${e.ks.bezeichnung} · ${art.label}`;

                    add(`${pre}_rohr`, 'Rohr', `Kupferrohr ${dim}`, `${kurz}`,
                        Math.ceil(laenge * MAT_VERSCHNITT), 'm', `${laenge} m + 5 % Verschnitt`);

                    // Fuer die Fuellmengenberechnung merken (Innendurchmesser
                    // aus der gewaehlten Dimension "Ø 35 × 1.5 mm").
                    const mm = /([\d.,]+)\s*[×x]\s*([\d.,]+)/.exec(String(dim));
                    if (mm) {
                        const da = parseFloat(mm[1].replace(',', '.'));
                        const wand = parseFloat(mm[2].replace(',', '.'));
                        if (da && wand) leitungenFuerFuellmenge.push({ art: art.key, diMm: da - 2 * wand, laenge, bez: dim });
                    }

                    // Isolierung nur bei kalten Leitungen - Heissgas wird nicht
                    // gegen Kondensat gedaemmt, hoechstens als Beruehrschutz.
                    if (art.key !== 'heissgas') {
                        // Daemmstaerke gegen Kondensat rechnen statt "prüfen"
                        // zu schreiben. Rohraussendurchmesser aus der gewaehlten
                        // Dimension, Rohrtemperatur = Verdampfung (Saugleitung)
                        // bzw. Fluessigkeitstemperatur.
                        const daMm = parseFloat(String(dim).replace(/[^0-9.,]/, '').replace(',', '.')) || 0;
                        const tRohr = art.key === 'saug' ? tVerd : Math.min(tVerd != null ? tVerd + 10 : 5, 15);
                        let isoText = kurz, isoBez = `Isolierung für ${dim}`;
                        if (daMm && tRohr != null) {
                            const iso = kaelteIsolierung({ rohrAussenMm: daMm, tRohr,
                                tUmgebung: umgebungT, rhUmgebung: umgebungRH });
                            if (iso.empfehlung) {
                                isoBez = `Isolierung ${iso.empfehlung.staerke} mm für ${dim}`;
                                isoText = `${kurz} · Oberfläche ${iso.empfehlung.oberflaeche.toFixed(1).replace('.', ',')} °C bei Taupunkt ${iso.taupunkt.toFixed(1).replace('.', ',')} °C`;
                            } else {
                                isoText = `${kurz} · ⚠ keine Standardstärke reicht bei ${umgebungT} °C / ${umgebungRH} %`;
                            }
                        }
                        add(`${pre}_iso`, 'Isolierung', isoBez, isoText,
                            Math.ceil(laenge * MAT_VERSCHNITT), 'm', `${laenge} m + 5 % Verschnitt · Dämmstärke gegen Taupunkt berechnet`);
                    }

                    add(`${pre}_schellen`, 'Befestigung', `Rohrschellen ${dim}`, kurz,
                        Math.max(2, Math.ceil(laenge / MAT_SCHELLENABSTAND_M)), 'Stk',
                        `${laenge} m ÷ ${MAT_SCHELLENABSTAND_M.toFixed(1).replace('.', ',')} m Abstand`);

                    const boegen = (Number(g.bogen90) || 0) + (Number(g.bogen45) || 0);
                    if (boegen) add(`${pre}_boegen`, 'Formstück', `Bögen ${dim}`, kurz, boegen, 'Stk', 'aus der Rohrberechnung');
                    const tst = (Number(g.tStueckDurchgang) || 0) + (Number(g.tStueckAbzweig) || 0);
                    if (tst) add(`${pre}_t`, 'Formstück', `T-Stücke ${dim}`, kurz, tst, 'Stk', 'aus der Rohrberechnung');

                    // Lötstellen: je Bogen/T-Stück zwei, plus je 3 m eine Verbindung
                    const loetstellen = boegen * 2 + tst * 3 + Math.ceil(laenge / 3);
                    add(`${pre}_loet`, 'Verbrauchsmaterial', `Hartlot / Lötstellen ${dim}`, kurz, loetstellen, 'Stk',
                        `${boegen} Bögen × 2 + ${tst} T-Stücke × 3 + ${Math.ceil(laenge / 3)} Verbindungen`);
                });
            });

            // 3) Anlagenweite Verbrauchsmaterialien
            if (pos.length) {
                // Fuellmenge aus der tatsaechlichen Geometrie. Bauteilvolumina
                // kommen aus den eingetragenen Komponenten, sofern vorhanden.
                let fmMenge = 0, fmHerkunft = 'Leitungslängen fehlen', fmText = '';
                const erste = a.ergebnisse.find(e => e.ergebnis.moeglich);
                if (erste && leitungenFuerFuellmenge.length) {
                    const kp = kaelteKreisprozess({
                        kaeltemittel: A.kaeltemittel,
                        tVerdampfung: erste.werte.verdampfungstemperatur.wert,
                        tVerfluessigung: A.tVerfluessigung, ueberhitzung: A.ueberhitzung,
                        unterkuehlung: A.unterkuehlung, kaelteleistungW: erste.ergebnis.auslegung
                    });
                    if (kp.moeglich) {
                        const bv = project.kaelte.bauteilVolumen || {};
                        const fm = kaelteFuellmenge(leitungenFuerFuellmenge, kp, bv);
                        fmMenge = Math.ceil(fm.gesamt * 10) / 10;
                        fmHerkunft = fm.teile.map(t => `${t.name} ${t.kg.toFixed(2).replace('.', ',')} kg`).join(' · ');
                        fmText = fm.sicher ? 'aus Leitungs- und Bauteilvolumen berechnet'
                                           : `⚠ unvollständig: ${fm.offen.join(', ')} ohne Innenvolumen`;
                    }
                }
                add('kaeltemittel', 'Verbrauchsmaterial', `Kältemittel ${A.kaeltemittel}`,
                    fmText || 'Menge selbst eintragen', fmMenge, 'kg', fmHerkunft);
                add('stickstoff', 'Verbrauchsmaterial', 'Formiergas / Stickstoff', 'Spülen und Druckprobe', 1, 'Fl', 'Erfahrungswert');

                // --- Elektro: Laengen aus den Rohrwegen abgeleitet, weil
                // Steuer- und Versorgungsleitungen denselben Weg nehmen.
                const rohrweg = leitungenFuerFuellmenge.reduce((m, l) => Math.max(m, l.laenge), 0);
                const leistungKW = a.summeAuslegung / 1000;
                const querschnitt = leistungKW <= 3 ? '3 × 1,5 mm²' : leistungKW <= 6 ? '5 × 2,5 mm²' : leistungKW <= 12 ? '5 × 4 mm²' : '5 × 6 mm²';
                if (rohrweg > 0) {
                    add('el_zuleitung', 'Elektro', `Zuleitung ${querschnitt}`,
                        `Versorgung Aggregat · Querschnitt nach ${leistungKW.toFixed(1).replace('.', ',')} kW Kälteleistung`,
                        Math.ceil(rohrweg * 1.2), 'm', `${rohrweg} m Rohrweg + 20 % Zuschlag – Querschnitt vor Ausführung elektrotechnisch prüfen`);
                    add('el_steuer', 'Elektro', 'Steuerleitung 5 × 1,5 mm²', 'Verdampfer, Regelung, Fühler',
                        Math.ceil(rohrweg * 1.2), 'm', `${rohrweg} m Rohrweg + 20 % Zuschlag`);
                    add('el_kanal', 'Elektro', 'Kabelkanal', 'Verlegung entlang der Leitungsführung',
                        Math.ceil(rohrweg), 'm', `entspricht dem Rohrweg`);
                    add('el_klein', 'Elektro', 'Elektroinstallationsmaterial', 'Dosen, Klemmen, Verschraubungen, Befestigung',
                        1, 'Pausch', 'Erfahrungswert');
                }
            }

            // 4) Arbeitsleistung. Entweder als Pauschale oder als einzelne
            // Positionen mit Richtwert-Stunden, die sich an der Anlagengroesse
            // orientieren. Beides jederzeit ueberschreibbar.
            const arbeit = project.kaelte.arbeit || {};
            if (pos.length) {
                const stundensatz = Number(arbeit.stundensatz) || 75;
                if (arbeit.pauschal) {
                    const o = eigen['arbeit_pauschal'] || {};
                    pos.push({
                        schluessel: 'arbeit_pauschal', kategorie: 'Arbeit',
                        name: 'Arbeitsleistung',
                        beschreibung: arbeit.pauschalText || 'Montage, Inbetriebnahme und Entsorgung Altgeräte',
                        einheit: 'Pausch',
                        menge: o.menge != null ? Number(o.menge) : 1,
                        ekPreis: o.ekPreis != null ? Number(o.ekPreis) : null,
                        vkPreis: o.vkPreis != null ? Number(o.vkPreis) : (Number(arbeit.pauschalPreis) || null),
                        herkunft: 'Pauschalpreis', arbeitPauschal: true
                    });
                } else {
                    // Richtwert-Stunden: Grundaufwand plus Anteile nach
                    // Anlagengroesse und Rohrweg. Praxis-Erfahrungswerte.
                    const kw = a.summeAuslegung / 1000;
                    const rohrweg = leitungenFuerFuellmenge.reduce((sm, l) => sm + l.laenge, 0);
                    const stellen = Math.max(1, (project.kaelte.kuehlstellen || []).length);
                    const aufgaben = [
                        ['montage', 'Montage der Anlage', 'Aufstellung und Befestigung der Geräte', 4 + kw * 0.4],
                        ['rohr', 'Rohrleitungsverlegung', 'Verlegen, Löten und Anschluss der Kältemittelleitungen', 0.35 * rohrweg + 2],
                        ['iso', 'Isolierarbeiten', 'Dämmung der Kältemittelleitungen', 0.1 * rohrweg],
                        ['elektro', 'Elektroinstallation', 'Verdrahtung, Regelung, Fühler', 3 + stellen * 1.5],
                        ['dicht', 'Dichtheitsprüfung und Evakuierung', 'Druckprobe, Vakuum, Kältemittelfüllung', 3],
                        ['ibn', 'Inbetriebnahme', 'Einstellen, Messen, Funktionsprüfung, Protokoll', 3 + stellen * 0.5]
                    ];
                    aufgaben.forEach(([key, name, beschr, std]) => {
                        const sl = `arbeit_${key}`;
                        const o = eigen[sl] || {};
                        const stunden = o.menge != null ? Number(o.menge) : Math.round(std * 2) / 2;
                        if (stunden <= 0) return;
                        pos.push({
                            schluessel: sl, kategorie: 'Arbeit', name, beschreibung: beschr, einheit: 'h',
                            menge: stunden,
                            ekPreis: o.ekPreis != null ? Number(o.ekPreis) : null,
                            vkPreis: o.vkPreis != null ? Number(o.vkPreis) : stundensatz,
                            herkunft: `Richtwert aus ${kw.toFixed(1).replace('.', ',')} kW, ${rohrweg} m Rohrweg, ${stellen} Kühlstelle(n)`,
                            geaendert: o.menge != null
                        });
                    });
                }
            }

            // 5) Frei ergänzte Eigenposten
            (project.kaelte.materialZusatz || []).forEach((z, i) => {
                pos.push({ schluessel: `zusatz_${i}`, kategorie: z.kategorie || 'Sonstiges', name: z.name,
                    beschreibung: z.beschreibung || '', einheit: z.einheit || 'Stk',
                    menge: Number(z.menge) || 0, ekPreis: z.ekPreis != null ? Number(z.ekPreis) : null,
                    vkPreis: z.vkPreis != null ? Number(z.vkPreis) : null, herkunft: 'selbst ergänzt', zusatz: i });
            });

            const summeEK = pos.reduce((s, p) => s + (p.ekPreis || 0) * p.menge, 0);
            const summeVK = pos.reduce((s, p) => s + (p.vkPreis || 0) * p.menge, 0);
            const ohnePreis = pos.filter(p => p.vkPreis == null && p.menge > 0).length;
            return { pos, summeEK, summeVK, ohnePreis };
        }

        function renderKaelteTabMaterial(project) {
            const m = kaelteMaterialListe(project);
            const arb = project.kaelte.arbeit || {};
            const aus = project.kaelte.auslegung || {};
            if (!m.pos.length) return `<div class="empty-note" style="padding:14px;">Noch nichts abzuleiten – erst Komponenten eintragen oder Rohrleitungen dimensionieren.</div>`;

            const zeilen = m.pos.map(p => `
                <tr>
                    <td><span class="mat-kat">${escapeHtml(p.kategorie)}</span></td>
                    <td><strong>${escapeHtml(p.name)}</strong><br><span style="font-size:11px;color:var(--text-muted);">${escapeHtml(p.beschreibung)}</span>
                        <br><span style="font-size:10.5px;color:var(--text-muted);">↳ ${escapeHtml(p.herkunft)}${p.geaendert ? ' · <strong>von dir geändert</strong>' : ''}</span></td>
                    <td style="width:78px;"><input type="text" inputmode="decimal" class="ma-in" data-key="${escapeHtml(p.schluessel)}" data-feld="menge" value="${p.menge}"></td>
                    <td style="width:46px;font-size:11.5px;color:var(--text-muted);">${escapeHtml(p.einheit)}</td>
                    <td style="width:88px;"><input type="text" inputmode="decimal" class="ma-in" data-key="${escapeHtml(p.schluessel)}" data-feld="ekPreis" value="${p.ekPreis ?? ''}" placeholder="EK"></td>
                    <td style="width:88px;"><input type="text" inputmode="decimal" class="ma-in" data-key="${escapeHtml(p.schluessel)}" data-feld="vkPreis" value="${p.vkPreis ?? ''}" placeholder="VK"></td>
                    <td class="kl-w">${p.vkPreis != null ? formatCurrency(p.vkPreis * p.menge) : '–'}</td>
                    <td style="text-align:right;">${p.zusatz != null ? `<button class="btn btn-sm btn-danger" onclick="app.deleteMaterialZusatz(${idJS(project.id)}, ${p.zusatz})">${icon('trash')}</button>` : ''}</td>
                </tr>`).join('');

            const gewinn = m.summeVK - m.summeEK;
            const marge = m.summeVK > 0 ? (gewinn / m.summeVK * 100) : 0;

            return `
                <div class="kl-hinweis kl-info">Mengen sind aus deinen Eingaben abgeleitet (Rohrlängen, Formstücke, Verlegeabstand, 5 % Verschnitt). Alles ist überschreibbar – geänderte Zeilen bleiben gespeichert, auch wenn du oben weiterrechnest.</div>
                ${m.ohnePreis ? `<div class="kl-hinweis kl-warnung">⚠ ${m.ohnePreis} Position(en) ohne Verkaufspreis. Die fehlen dann im Angebot.</div>` : ''}
                <div class="form-card">
                    <div class="form-card-title">Arbeitsleistung &amp; Umgebung</div>
                    <div class="survey-grid">
                        <div class="form-group"><label>Abrechnung</label>
                            <select class="ar-in" data-feld="pauschal">
                                <option value="0" ${!arb.pauschal ? 'selected' : ''}>Einzelne Positionen nach Stunden</option>
                                <option value="1" ${arb.pauschal ? 'selected' : ''}>Pauschalpreis</option>
                            </select>
                        </div>
                        ${arb.pauschal ? `
                            <div class="form-group"><label>Pauschalpreis (€)</label><input type="text" inputmode="decimal" class="ar-in" data-feld="pauschalPreis" value="${arb.pauschalPreis ?? ''}"></div>
                            <div class="form-group" style="grid-column:1/-1;"><label>Text der Pauschale</label><input type="text" class="ar-in" data-feld="pauschalText" value="${escapeHtml(arb.pauschalText || 'Montage, Inbetriebnahme und Entsorgung Altgeräte')}"></div>
                        ` : `
                            <div class="form-group"><label>Stundensatz (€)</label><input type="text" inputmode="decimal" class="ar-in" data-feld="stundensatz" value="${arb.stundensatz ?? 75}"></div>
                        `}
                        <div class="form-group"><label>Umgebungstemperatur (°C) <small>– für die Dämmstärke</small></label><input type="text" inputmode="decimal" class="au-in" data-feld="umgebungT" value="${aus.umgebungT ?? 25}"></div>
                        <div class="form-group"><label>rel. Luftfeuchte (%)</label><input type="text" inputmode="decimal" class="au-in" data-feld="umgebungRH" value="${aus.umgebungRH ?? 70}"></div>
                    </div>
                    <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">Die Dämmstärke wird aus Umgebungstemperatur und Feuchte gegen den Taupunkt gerechnet. Feuchtere Umgebung heißt dickere Dämmung.</div>
                </div>
                <div class="form-card">
                    <div class="detail-section-head" style="margin-top:0;">
                        <h4>Materialliste (${m.pos.length} Positionen)</h4>
                        <button class="btn btn-sm btn-outline" onclick="app.openMaterialZusatz(${idJS(project.id)})">${icon('plus')} Position ergänzen</button>
                    </div>
                    <div class="table-container"><table class="mat-tabelle">
                        <thead><tr><th>Kategorie</th><th>Bezeichnung</th><th>Menge</th><th></th><th>EK</th><th>VK</th><th>Gesamt</th><th></th></tr></thead>
                        <tbody>${zeilen}</tbody>
                    </table></div>
                    <div class="survey-summary" style="margin-top:12px;">
                        <div class="survey-chip"><span>Einkauf gesamt</span><strong>${formatCurrency(m.summeEK)}</strong></div>
                        <div class="survey-chip"><span>Verkauf gesamt</span><strong>${formatCurrency(m.summeVK)}</strong></div>
                        <div class="survey-chip"><span>Rohertrag</span><strong>${formatCurrency(gewinn)}</strong></div>
                        <div class="survey-chip"><span>Marge</span><strong>${marge.toFixed(1).replace('.', ',')} %</strong></div>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Diese Auswertung ist nur für dich – im Kundenangebot steht sie nicht.</div>
                </div>`;
        }

        // ---- Angebot: Übernahme in das bestehende Angebotsmodul.
        function renderKaelteTabAngebot(project) {
            const m = kaelteMaterialListe(project);
            const uebernehmbar = m.pos.filter(p => p.vkPreis != null && p.menge > 0);
            const a = kaelteAuslegung(project);
            const A = kaelteAuslegungsdaten(project);

            return `
                <div class="form-card">
                    <div class="form-card-title">Übernahme ins Angebot</div>
                    ${!uebernehmbar.length ? '<div class="kl-hinweis kl-fehler">✕ Keine Position mit Verkaufspreis und Menge. Im Schritt Material die Preise eintragen.</div>' : `
                        <table class="kl-ergebnis"><tbody>
                            <tr><td>Positionen mit Preis</td><td class="kl-w">${uebernehmbar.length} von ${m.pos.length}</td></tr>
                            <tr><td>Kunde</td><td class="kl-w">${project.customerId ? 'zugewiesen' : '<span style="color:#d24545;">fehlt</span>'}</td></tr>
                            <tr class="kl-total"><td>Angebotssumme</td><td class="kl-w">${formatCurrency(uebernehmbar.reduce((s, p) => s + p.vkPreis * p.menge, 0))}</td></tr>
                        </tbody></table>
                        ${m.ohnePreis ? `<div class="kl-hinweis kl-warnung">⚠ ${m.ohnePreis} Position(en) ohne Preis werden NICHT übernommen.</div>` : ''}
                        ${!project.customerId ? '<div class="kl-hinweis kl-fehler">✕ Dem Projekt ist kein Kunde zugewiesen – im Schritt Projekt nachtragen.</div>' : ''}
                        <button class="btn btn-primary" style="margin-top:12px;" ${!project.customerId ? 'disabled' : ''} onclick="app.kaelteInsAngebot(${idJS(project.id)})">Ins Angebot übernehmen</button>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:8px;">Es wird ein neues Angebot zu diesem Projekt angelegt. Preis-, Steuer- und Rabattlogik sowie der PDF-Export bleiben unverändert – die Positionen laufen durch dieselbe Berechnung wie jedes andere Angebot.</div>
                    `}
                </div>
                <div class="form-card">
                    <div class="form-card-title">Technische Beschreibung fürs Angebot</div>
                    <div style="font-size:12.5px;line-height:1.6;background:var(--bg-secondary);padding:11px 13px;border-radius:7px;white-space:pre-wrap;">${escapeHtml(kaelteAngebotstext(project, a, A))}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:7px;">Wird als Notiz ins Angebot übernommen.</div>
                </div>`;
        }

        function kaelteAngebotstext(project, a, A) {
            const z = [];
            z.push(`Kälteanlage – ${(KAELTE_ANLAGENARTEN.find(x => x.key === project.kaelte.anlagenart) || {}).label || 'Anlage'}`);
            z.push(`Kältemittel: ${A.kaeltemittel} · Verflüssigung ${A.tVerfluessigung} °C`);
            a.ergebnisse.forEach(e => {
                if (!e.ergebnis.moeglich) return;
                z.push(`${e.ks.bezeichnung}: ${(e.ergebnis.auslegung / 1000).toFixed(2).replace('.', ',')} kW bei ${e.werte.raumtemperatur.wert} °C Raumtemperatur, Verdampfung ${e.werte.verdampfungstemperatur.wert} °C`);
            });
            z.push('');
            z.push('Vorauslegung auf Basis der übermittelten Angaben. Endgültige Ausführung nach technischer Prüfung.');
            return z.join('\n');
        }

        function renderKaelteTabPlatzhalter(step) {
            return `
                <div class="empty-state">
                    <div style="font-size:40px;">🚧</div>
                    <p><strong>${escapeHtml(step ? step.label : 'Dieser Schritt')}</strong> ist noch nicht umgesetzt.<br>
                    Das kommt in einer der nächsten Phasen, sobald die dafür nötigen echten Berechnungsgrundlagen bzw. Herstellerdaten stehen - hier wird nichts erfunden vorgezeigt.</p>
                </div>
            `;
        }

        // ---------- app.-Methoden: erst NACH der app-Definition anhaengen,
        // damit "const app = {...}" in 07-extensions-init.js bereits existiert.
        Object.assign(app, {
            async openNeuesKaelteprojekt() {
                const customers = await db.getAll('customers');
                const modal = showModal(
                    'Neues Kälteprojekt',
                    `
                        <div class="form-group"><label>Kunde</label>
                            <select id="kpCustomer">
                                <option value="">-- Kunde auswählen (optional) --</option>
                                ${customers.map(c => `<option value="${escapeHtml(String(c.id))}">${escapeHtml(customerDisplayName(c))}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group"><label>Projektname *</label><input type="text" id="kpTitle" placeholder="z. B. Kühlraum Metzgerei Muster"></div>
                        <div class="form-group"><label>Anlagenart</label>
                            <select id="kpAnlagenart">${KAELTE_ANLAGENARTEN.map(a => `<option value="${a.key}">${escapeHtml(a.label)}</option>`).join('')}</select>
                        </div>
                    `,
                    async (overlay) => {
                        const title = overlay.querySelector('#kpTitle').value.trim();
                        if (!title) { showToast('Projektname ist erforderlich.', 'error'); return; }
                        const pid = await db.add('projects', {
                            title,
                            customerId: parseId(overlay.querySelector('#kpCustomer').value),
                            status: 'Besichtigung',
                            createdAt: new Date().toISOString(),
                            kaelte: {
                                anlagenart: overlay.querySelector('#kpAnlagenart').value,
                                bearbeiter: '', projektnummer: '', datum: '', ansprechpartner: '', standort: '', notizen: '',
                                kuehlstellen: []
                            }
                        });
                        overlay.remove();
                        showToast('Kälteprojekt angelegt.', 'success');
                        app.navigate('kaelte', pid);
                    }
                );
            },

            kaelteSetTab(projectId, tab) {
                KAELTE_STATE.tab = tab;
                renderKaelteDetail(projectId);
            },

            async kaelteSetAnlagenart(projectId, key) {
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                project.kaelte.anlagenart = key;
                await db.put('projects', project);
                renderKaelteDetail(projectId);
            },

            async openKaelteProjektFelder(projectId) {
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                const k = project.kaelte;
                showModal(
                    'Projektangaben (Kälteplanung)',
                    `
                        <div class="form-row">
                            <div class="form-group"><label>Bearbeiter</label><input type="text" id="kfBearbeiter" value="${escapeHtml(k.bearbeiter || '')}"></div>
                            <div class="form-group"><label>Projektnummer</label><input type="text" id="kfProjektnummer" value="${escapeHtml(k.projektnummer || '')}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Datum</label><input type="date" id="kfDatum" value="${escapeHtml(k.datum || '')}"></div>
                            <div class="form-group"><label>Ansprechpartner</label><input type="text" id="kfAnsprechpartner" value="${escapeHtml(k.ansprechpartner || '')}"></div>
                        </div>
                        <div class="form-group"><label>Standort (falls abweichend von der Baustellenadresse)</label><input type="text" id="kfStandort" value="${escapeHtml(k.standort || '')}"></div>
                        <div class="form-group"><label>Notizen</label><textarea id="kfNotizen" rows="3">${escapeHtml(k.notizen || '')}</textarea></div>
                    `,
                    async (overlay) => {
                        Object.assign(k, {
                            bearbeiter: overlay.querySelector('#kfBearbeiter').value.trim(),
                            projektnummer: overlay.querySelector('#kfProjektnummer').value.trim(),
                            datum: overlay.querySelector('#kfDatum').value,
                            ansprechpartner: overlay.querySelector('#kfAnsprechpartner').value.trim(),
                            standort: overlay.querySelector('#kfStandort').value.trim(),
                            notizen: overlay.querySelector('#kfNotizen').value.trim()
                        });
                        await db.put('projects', project);
                        overlay.remove();
                        showToast('Angaben gespeichert.', 'success');
                        renderKaelteDetail(projectId);
                    }
                );
            },

            async openKuehlstelleModal(projectId, kuehlstelleId = null) {
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                const bestehend = kuehlstelleId ? (project.kaelte.kuehlstellen || []).find(x => x.id === kuehlstelleId) : null;
                const ks = bestehend || kuehlstelleLeer();

                const groups = [...new Set(KUEHLSTELLE_FIELDS.map(f => f.group))];
                const groupCards = groups.map(g => `
                    <div class="form-card">
                        <div class="form-card-title">${KUEHLSTELLE_GROUP_ICONS[g] || ''} ${g}</div>
                        <div class="survey-grid">
                            ${KUEHLSTELLE_FIELDS.filter(f => f.group === g).map(f => techFieldInput(f, ks[f.key], 'ks_')).join('')}
                        </div>
                    </div>
                `).join('');

                const modal = showModal(
                    bestehend ? `Kühlstelle bearbeiten – ${escapeHtml(ks.bezeichnung || '')}` : 'Neue Kühlstelle',
                    `
                        <div class="form-card">
                            <div class="form-group"><label>Bezeichnung *</label><input type="text" id="ksBezeichnung" value="${escapeHtml(ks.bezeichnung || '')}" placeholder="z. B. Kühlraum 1"></div>
                        </div>
                        ${groupCards}
                    `,
                    async (overlay) => {
                        const bezeichnung = overlay.querySelector('#ksBezeichnung').value.trim();
                        if (!bezeichnung) { showToast('Bezeichnung ist erforderlich.', 'error'); return; }
                        const neu = { ...ks, bezeichnung };
                        for (const f of KUEHLSTELLE_FIELDS) {
                            const v = techFieldRead(f, overlay, 'ks_');
                            if (v !== undefined) neu[f.key] = v;
                        }
                        const arr = project.kaelte.kuehlstellen || (project.kaelte.kuehlstellen = []);
                        const idx = arr.findIndex(x => x.id === neu.id);
                        if (idx >= 0) arr[idx] = neu; else arr.push(neu);
                        await db.put('projects', project);
                        overlay.remove();
                        showToast(bestehend ? 'Kühlstelle aktualisiert.' : 'Kühlstelle angelegt.', 'success');
                        renderKaelteDetail(projectId);
                    },
                    null, { wide: true }
                );
            },

            async openKomponenteModal(projectId, index = null, vorgabeTyp = '', bedarfKW = 0) {
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                const liste = project.kaelte.komponenten || (project.kaelte.komponenten = []);
                const k = (index != null && liste[index]) ? liste[index] : { typ: vorgabeTyp };
                const art = project.kaelte.anlagenart || 'einzel';
                const vorlage = KOMPONENTEN_VORLAGE[art] || KOMPONENTEN_VORLAGE.custom;

                // Eigene Geraetedatenbank: alles, was frueher eingetragen wurde.
                const gdb = await getSetting('kaelteGeraete', []);
                const passend = (Array.isArray(gdb) ? gdb : []).filter(g =>
                    !k.typ || (g.typ || '').toLowerCase() === String(k.typ).toLowerCase());

                showModal(
                    index != null ? 'Komponente bearbeiten' : (vorgabeTyp ? `${vorgabeTyp} eintragen` : 'Komponente hinzufügen'),
                    `
                        ${bedarfKW > 0 ? `<div class="kl-hinweis kl-info" style="margin-bottom:12px;">Benötigt werden mindestens <strong>${bedarfKW.toFixed(2).replace('.', ',')} kW</strong>. Trage das Gerät ein, das du beim Hersteller oder Lieferanten gefunden hast.</div>` : ''}
                        ${passend.length ? `
                        <div class="form-group"><label>Aus deiner Gerätedatenbank übernehmen (${passend.length})</label>
                            <select id="koDb">
                                <option value="">-- neues Gerät eintragen --</option>
                                ${passend.map((g, i) => `<option value="${i}">${escapeHtml([g.hersteller, g.modell, g.artikelnummer].filter(Boolean).join(' · '))}${g.leistungKW ? ' — ' + Number(g.leistungKW).toFixed(2).replace('.', ',') + ' kW' : ''}</option>`).join('')}
                            </select>
                        </div>` : ''}
                        <div class="form-group"><label>Typ / Bauteil *</label>
                            <input list="kompTypen" id="koTyp" value="${escapeHtml(k.typ || '')}" placeholder="z. B. Verdichter">
                            <datalist id="kompTypen">${vorlage.map(v => `<option value="${escapeHtml(v)}">`).join('')}</datalist>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Hersteller</label><input type="text" id="koHersteller" value="${escapeHtml(k.hersteller || '')}"></div>
                            <div class="form-group"><label>Modell</label><input type="text" id="koModell" value="${escapeHtml(k.modell || '')}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Artikelnummer</label><input type="text" id="koArt" value="${escapeHtml(k.artikelnummer || '')}"></div>
                            <div class="form-group"><label>Leistung im Betriebspunkt (kW)</label><input type="text" inputmode="decimal" id="koLeistung" value="${k.leistungKW ?? ''}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Leistungsaufnahme (kW) <small>– für die Verflüssigerleistung</small></label><input type="text" inputmode="decimal" id="koPauf" value="${k.leistungsaufnahmeKW ?? ''}"></div>
                            <div class="form-group"><label>Anschlüsse</label><input type="text" id="koAnschluss" value="${escapeHtml(k.anschluss || '')}" placeholder="z. B. 22 / 12 mm"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Menge</label><input type="text" inputmode="decimal" id="koMenge" value="${k.menge ?? 1}"></div>
                            <div class="form-group"><label>Einheit</label><input type="text" id="koEinheit" value="${escapeHtml(k.einheit || 'Stk')}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Einkaufspreis netto (€)</label><input type="text" inputmode="decimal" id="koEk" value="${k.ekPreis ?? ''}"></div>
                            <div class="form-group"><label>Verkaufspreis (€)</label><input type="text" inputmode="decimal" id="koVk" value="${k.vkPreis ?? ''}"></div>
                        </div>
                        <div class="form-group"><label>Lieferant</label><input type="text" id="koLieferant" value="${escapeHtml(k.lieferant || '')}"></div>
                        <div class="form-group"><label>Quelle / Link <small>– woher stammen die Daten?</small></label><input type="text" id="koQuelle" value="${escapeHtml(k.quelle || '')}" placeholder="z. B. Datenblatt 03/2026 oder Link"></div>
                        <div class="form-group"><label>Technische Daten / Notiz</label><textarea id="koNotiz" rows="2">${escapeHtml(k.notiz || '')}</textarea></div>
                        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-top:6px;">
                            <input type="checkbox" id="koSpeichern" checked style="width:auto;"> In Gerätedatenbank speichern (steht dann bei jedem Projekt zur Auswahl)
                        </label>
                    `,
                    async (overlay) => {
                        const zahl = id => { const v = overlay.querySelector(id).value.trim(); if (v === '') return null; const n = parseFloat(v.replace(',', '.')); return Number.isFinite(n) ? n : null; };
                        const typ = overlay.querySelector('#koTyp').value.trim();
                        if (!typ) { showToast('Typ ist erforderlich.', 'error'); return; }
                        const neu = {
                            typ, hersteller: overlay.querySelector('#koHersteller').value.trim(),
                            modell: overlay.querySelector('#koModell').value.trim(),
                            artikelnummer: overlay.querySelector('#koArt').value.trim(),
                            leistungKW: zahl('#koLeistung'), leistungsaufnahmeKW: zahl('#koPauf'),
                            anschluss: overlay.querySelector('#koAnschluss').value.trim(),
                            menge: zahl('#koMenge') ?? 1,
                            einheit: overlay.querySelector('#koEinheit').value.trim() || 'Stk',
                            ekPreis: zahl('#koEk'), vkPreis: zahl('#koVk'),
                            lieferant: overlay.querySelector('#koLieferant').value.trim(),
                            quelle: overlay.querySelector('#koQuelle').value.trim(),
                            notiz: overlay.querySelector('#koNotiz').value.trim()
                        };
                        if (index != null) liste[index] = neu; else liste.push(neu);
                        await db.put('projects', project);

                        // In die eigene Geraetedatenbank uebernehmen. Gleiches
                        // Geraet (Typ + Hersteller + Modell + Art.-Nr.) wird
                        // aktualisiert statt doppelt angelegt.
                        if (overlay.querySelector('#koSpeichern').checked && (neu.hersteller || neu.modell || neu.artikelnummer)) {
                            const alt = await getSetting('kaelteGeraete', []);
                            const arr = Array.isArray(alt) ? alt : [];
                            const schluessel = g => [g.typ, g.hersteller, g.modell, g.artikelnummer].map(x => String(x || '').toLowerCase()).join('|');
                            const i = arr.findIndex(g => schluessel(g) === schluessel(neu));
                            const eintrag = { ...neu, menge: undefined, gespeichertAm: new Date().toISOString() };
                            if (i >= 0) arr[i] = eintrag; else arr.push(eintrag);
                            await setSetting('kaelteGeraete', arr);
                        }
                        overlay.remove();
                        showToast('Komponente gespeichert.', 'success');
                        renderKaelteDetail(projectId);
                    }
                );

                // Auswahl aus der Datenbank fuellt die Felder vor.
                setTimeout(() => {
                    const sel = document.querySelector('#koDb');
                    if (!sel) return;
                    sel.addEventListener('change', () => {
                        const g = passend[Number(sel.value)];
                        if (!g) return;
                        const setz = (id, v) => { const el = document.querySelector(id); if (el) el.value = v ?? ''; };
                        setz('#koTyp', g.typ); setz('#koHersteller', g.hersteller); setz('#koModell', g.modell);
                        setz('#koArt', g.artikelnummer); setz('#koLeistung', g.leistungKW);
                        setz('#koPauf', g.leistungsaufnahmeKW); setz('#koAnschluss', g.anschluss);
                        setz('#koEinheit', g.einheit); setz('#koEk', g.ekPreis); setz('#koVk', g.vkPreis);
                        setz('#koLieferant', g.lieferant); setz('#koQuelle', g.quelle); setz('#koNotiz', g.notiz);
                    });
                }, 60);
            },

            async openMaterialZusatz(projectId) {
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                showModal('Position ergänzen', `
                    <div class="form-group"><label>Bezeichnung *</label><input type="text" id="mzName"></div>
                    <div class="form-group"><label>Beschreibung</label><input type="text" id="mzBeschr"></div>
                    <div class="form-row">
                        <div class="form-group"><label>Kategorie</label><input type="text" id="mzKat" value="Sonstiges"></div>
                        <div class="form-group"><label>Einheit</label><input type="text" id="mzEinheit" value="Stk"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Menge</label><input type="text" inputmode="decimal" id="mzMenge" value="1"></div>
                        <div class="form-group"><label>Einkaufspreis (€)</label><input type="text" inputmode="decimal" id="mzEk"></div>
                    </div>
                    <div class="form-group"><label>Verkaufspreis (€)</label><input type="text" inputmode="decimal" id="mzVk"></div>
                `, async (overlay) => {
                    const zahl = id => { const v = overlay.querySelector(id).value.trim(); if (v === '') return null; const n = parseFloat(v.replace(',', '.')); return Number.isFinite(n) ? n : null; };
                    const name = overlay.querySelector('#mzName').value.trim();
                    if (!name) { showToast('Bezeichnung ist erforderlich.', 'error'); return; }
                    project.kaelte.materialZusatz = project.kaelte.materialZusatz || [];
                    project.kaelte.materialZusatz.push({
                        name, beschreibung: overlay.querySelector('#mzBeschr').value.trim(),
                        kategorie: overlay.querySelector('#mzKat').value.trim() || 'Sonstiges',
                        einheit: overlay.querySelector('#mzEinheit').value.trim() || 'Stk',
                        menge: zahl('#mzMenge') ?? 1, ekPreis: zahl('#mzEk'), vkPreis: zahl('#mzVk')
                    });
                    await db.put('projects', project);
                    overlay.remove();
                    showToast('Position ergänzt.', 'success');
                    renderKaelteDetail(projectId);
                });
            },

            async deleteMaterialZusatz(projectId, index) {
                if (!await showConfirm('Diese Position wirklich löschen?')) return;
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                (project.kaelte.materialZusatz || []).splice(index, 1);
                await db.put('projects', project);
                renderKaelteDetail(projectId);
            },

            // Uebernahme ins bestehende Angebotsmodul. Es wird NICHTS an der
            // Preis-/Steuerlogik geaendert: die Positionen werden genauso
            // aufgebaut wie beim Schnell-Angebot und danach durch das normale
            // recomputeOffer() gerechnet.
            async kaelteInsAngebot(projectId) {
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                if (!project.customerId) { showToast('Dem Projekt ist kein Kunde zugewiesen.', 'error'); return; }
                const m = kaelteMaterialListe(project);
                const uebernehmbar = m.pos.filter(p => p.vkPreis != null && p.menge > 0);
                if (!uebernehmbar.length) { showToast('Keine Position mit Verkaufspreis.', 'error'); return; }
                if (!await showConfirm(`${uebernehmbar.length} Position(en) als neues Angebot anlegen?`)) return;

                const MWST = (typeof MAT_VAT === 'number') ? MAT_VAT : 0.20;
                const positions = uebernehmbar.map(p => ({
                    materialId: null,
                    name: p.name,
                    description: p.beschreibung || '',
                    unit: p.einheit || 'Stk',
                    quantity: p.menge,
                    // Positionspreise sind Endpreise inkl. USt. - wie ueberall in der App
                    price: Math.round(p.vkPreis * (1 + MWST) * 100) / 100,
                    priceIncludesVat: true,
                    discount: 0,
                    category: p.kategorie === 'Komponente' ? 'Klimageräte' : 'Zubehör',
                    ...(p.ekPreis > 0 ? { purchasePriceNet: Math.round(p.ekPreis * 100) / 100 } : {})
                }));

                const a = kaelteAuslegung(project);
                const entwurf = {
                    offerNumber: await getNextAutoNumber(),
                    projectId, customerId: project.customerId,
                    positions,
                    vatEnabled: true, vatRate: MWST,
                    discountEnabled: false, discountRate: 0,
                    status: 'Angebot offen',
                    createdAt: new Date().toISOString(),
                    notes: kaelteAngebotstext(project, a, kaelteAuslegungsdaten(project))
                };
                const R = recomputeOffer(entwurf);
                Object.assign(entwurf, {
                    subtotal: R.net, netAfterDiscount: R.netAfter,
                    discountAmount: R.globalDiscount, vatAmount: R.vatAmount, totalPrice: R.total
                });
                await db.add('offers', entwurf);
                showToast(`Angebot ${entwurf.offerNumber} erstellt – ${formatCurrency(R.total)}.`, 'success');
                app.navigate('offers');
            },

            async deleteKomponente(projectId, index) {
                if (!await showConfirm('Diese Komponente wirklich löschen?')) return;
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                (project.kaelte.komponenten || []).splice(index, 1);
                await db.put('projects', project);
                showToast('Komponente gelöscht.', 'info');
                renderKaelteDetail(projectId);
            },

            async deleteKuehlstelle(projectId, kuehlstelleId) {
                if (!await showConfirm('Diese Kühlstelle wirklich löschen?')) return;
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                project.kaelte.kuehlstellen = (project.kaelte.kuehlstellen || []).filter(x => x.id !== kuehlstelleId);
                await db.put('projects', project);
                showToast('Kühlstelle gelöscht.', 'info');
                renderKaelteDetail(projectId);
            },

            // Entfernt NUR die Kaelteplanung vom Projekt - das Projekt selbst
            // (Kunde, evtl. schon vorhandene Angebote etc.) bleibt bestehen.
            // Fuer eine komplette Projektloeschung gibt es bereits app.deleteProject.
            async entferneKaelteplanung(projectId) {
                if (!await showConfirm('Kälteplanung (Anlagenart, Kühlstellen, alle Angaben) von diesem Projekt entfernen? Das Projekt selbst bleibt erhalten.')) return;
                const project = await db.get('projects', projectId);
                if (!project) return;
                delete project.kaelte;
                await db.put('projects', project);
                showToast('Kälteplanung entfernt.', 'info');
                app.navigate('kaelte');
            }
        });

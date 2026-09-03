

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
            { key: 'anlage', label: 'Anlage', fertig: false },
            { key: 'komponenten', label: 'Komponenten', fertig: false },
            { key: 'rohrleitungen', label: 'Rohrleitungen', fertig: false },
            { key: 'verbund', label: 'Verbund', fertig: false },
            { key: 'material', label: 'Material', fertig: false },
            { key: 'pruefung', label: 'Prüfung', fertig: false },
            { key: 'angebot', label: 'Angebot', fertig: false }
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
                else tabHtml = renderKaelteTabPlatzhalter(KAELTE_STEPS.find(s => s.key === tab));

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

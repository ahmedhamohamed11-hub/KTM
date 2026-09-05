

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
                // Gepflegte Preise einmal laden, damit die Katalogvorschlaege
                // den aktuellen Stand zeigen statt des Auslieferungspreises.
                try { window.__kaeltePreise = await getSetting('kaeltePreise', {}) || {}; } catch (e) { window.__kaeltePreise = {}; }
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

                // Assistent: prueft bei jedem Aufruf den aktuellen Stand
                const ass = kaelteAssistent(project);
                const assIkon = { fehlt: '📋', problem: '✕', erkannt: '💡', naechster: '→' };
                const assHtml = ass.hinweise.length ? `
                    <div class="assistent">
                        <div class="assistent-kopf">
                            <span>Assistent</span>
                            <div class="assistent-balken"><i style="width:${ass.fortschritt}%"></i></div>
                            <span class="assistent-prozent">${ass.fortschritt} %</span>
                        </div>
                        ${ass.hinweise.slice(0, 6).map(h => `
                            <div class="assistent-zeile assistent-${h.art}" ${h.ziel ? `onclick="app.kaelteSetTab(${idJS(projectId)}, '${h.ziel}')" style="cursor:pointer;"` : ''}>
                                <span class="assistent-ikon">${assIkon[h.art] || '·'}</span>
                                <span>${escapeHtml(h.text)}</span>
                            </div>`).join('')}
                        ${ass.hinweise.length > 6 ? `<div class="assistent-mehr">+ ${ass.hinweise.length - 6} weitere Hinweise</div>` : ''}
                    </div>` : '';
                const assistentHtml = assHtml;

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
                        ${assistentHtml}
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

                // Expansionsventil-Eingaben
                contentArea.querySelectorAll('.exv-in').forEach(el => {
                    el.addEventListener('change', async () => {
                        const p = await db.get('projects', projectId);
                        p.kaelte.exv = p.kaelte.exv || {};
                        const roh = el.value.trim();
                        if (roh === '') delete p.kaelte.exv[el.dataset.feld];
                        else { const n = parseFloat(roh.replace(',', '.')); if (!Number.isFinite(n) || n < 0) { showToast('Bitte eine Zahl eingeben.', 'error'); return; } p.kaelte.exv[el.dataset.feld] = n; }
                        await db.put('projects', p);
                        renderKaelteDetail(projectId);
                    });
                });

                // F-Gase-Optionen
                contentArea.querySelectorAll('.fg-in').forEach(el => {
                    el.addEventListener('change', async () => {
                        const p = await db.get('projects', projectId);
                        p.kaelte.fgase = p.kaelte.fgase || {};
                        p.kaelte.fgase[el.dataset.feld] = el.checked;
                        await db.put('projects', p);
                        renderKaelteDetail(projectId);
                    });
                });

                // Interner Wärmetauscher – wird nur gezeichnet, wenn es ihn gibt
                contentArea.querySelectorAll('.wt-in').forEach(el => {
                    el.addEventListener('change', async () => {
                        const p = await db.get('projects', projectId);
                        p.kaelte.internerWT = el.checked;
                        await db.put('projects', p);
                        renderKaelteDetail(projectId);
                    });
                });

                // Innenvolumen der Bauteile (Füllmenge)
                contentArea.querySelectorAll('.bv-in').forEach(el => {
                    el.addEventListener('change', async () => {
                        const p = await db.get('projects', projectId);
                        p.kaelte.bauteilVolumen = p.kaelte.bauteilVolumen || {};
                        const roh = el.value.trim();
                        if (roh === '') delete p.kaelte.bauteilVolumen[el.dataset.feld];
                        else {
                            const n = parseFloat(roh.replace(',', '.'));
                            if (!Number.isFinite(n) || n <= 0) { showToast('Bitte ein Volumen in Litern eingeben.', 'error'); return; }
                            p.kaelte.bauteilVolumen[el.dataset.feld] = n;
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
                    // Temperaturfelder brauchen den Vorzeichen-Knopf, weil die
                    // Ziffern-Tastatur auf Android kein Minus anbietet.
                    const negMoeglich = unit === '°C' || unit === 'K';
                    return `<tr>
                        <td>${statusChip(e.status)} ${escapeHtml(label)}</td>
                        <td style="width:110px;">${negMoeglich
                            ? `<div class="vz-feld"><input type="text" inputmode="decimal" value="${e.wert ?? ''}" data-ks="${ks.id}" data-feld="${key}" class="kl-input" placeholder="–"><button type="button" class="vz-knopf" title="Vorzeichen wechseln">±</button></div>`
                            : `<input type="text" inputmode="decimal" value="${e.wert ?? ''}" data-ks="${ks.id}" data-feld="${key}" class="kl-input" placeholder="–">`}</td>
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
            const dEinheit = (project.kaelte.auslegung || {}).druckEinheit || 'bar';
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
                        <div class="form-group"><label>${A.kaeltemittel === 'R744' ? 'Gaskühleraustritt' : 'Verflüssigungstemperatur'} <small>(°C)</small></label>
                            <div class="vz-feld"><input type="text" inputmode="decimal" class="ka-in" data-feld="tVerfluessigung" value="${A.tVerfluessigung}"><button type="button" class="vz-knopf" title="Vorzeichen wechseln">±</button></div></div>
                        <div class="form-group"><label>Sauggasüberhitzung <small>(K)</small></label><input type="text" inputmode="decimal" class="ka-in" data-feld="ueberhitzung" value="${A.ueberhitzung}"></div>
                        <div class="form-group"><label>Unterkühlung <small>(K)</small></label><input type="text" inputmode="decimal" class="ka-in" data-feld="unterkuehlung" value="${A.unterkuehlung}"></div>
                        <div class="form-group"><label>Druckeinheit <small>– nur die Anzeige, gerechnet wird immer in bar</small></label>
                            <select class="ka-in" data-feld="druckEinheit">
                                ${Object.keys(DRUCK_EINHEITEN).map(e => `<option value="${e}" ${dEinheit === e ? 'selected' : ''}>${e}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    ${km.find(k => k.key === A.kaeltemittel && k.blend) ? '<div class="kl-hinweis kl-pruefen">🔴 Gemisch (Blend): Stoffdaten aus einem Gemischmodell, Temperaturgleit nicht berücksichtigt. Für die endgültige Auslegung das Herstellerdatenblatt verwenden.</div>' : ''}
                </div>`;

                            const bv = project.kaelte.bauteilVolumen || {};
                const volumenKarte = `
                    <div class="form-card">
                        <div class="form-card-title">Innenvolumen der Bauteile <small style="font-weight:400;color:var(--text-muted);">– für die Kältemittelfüllmenge</small></div>
                        <div class="survey-grid">
                            ${[['verdampfer', 'Verdampfer'], ['verfluessiger', 'Verflüssiger / Gaskühler'], ['sammler', 'Flüssigkeitssammler'], ['sonstige', 'Sonstige Bauteile']]
                                .map(([k, l]) => `<div class="form-group"><label>${escapeHtml(l)} <small>(Liter)</small></label><input type="text" inputmode="decimal" class="bv-in" data-feld="${k}" value="${bv[k] ?? ''}" placeholder="aus Datenblatt"></div>`).join('')}
                        </div>
                        <label class="ae-check" style="margin-top:10px;"><input type="checkbox" class="wt-in" ${project.kaelte.internerWT ? 'checked' : ''}> Interner Wärmetauscher vorhanden</label>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">Diese Werte stehen im Herstellerdatenblatt. Was hier leer bleibt, fehlt in der Füllmenge – es wird nichts geschätzt.</div>
                        ${(() => {
                            // Erforderliche Sammlergroesse aus der berechneten Fuellmenge
                            const mm = kaelteMaterialListe(project);
                            const kmPos = mm.pos.find(x => x.schluessel === 'kaeltemittel');
                            if (!kmPos || !(Number(kmPos.menge) > 0)) return '';
                            const sa = kaelteSammler({ kaeltemittel: A.kaeltemittel, fuellmengeKg: Number(kmPos.menge),
                                tVerfluessigung: A.tVerfluessigung, tStillstand: A.tVerfluessigung + 10 });
                            if (!sa.moeglich) return '';
                            const eingetragen = Number(bv.sammler) || 0;
                            const passt = eingetragen >= sa.erforderlichL;
                            return `<div class="kl-hinweis ${eingetragen ? (passt ? 'kl-info' : 'kl-fehler') : 'kl-warnung'}" style="margin-top:10px;">
                                ${eingetragen ? (passt ? '✓' : '✕') : '⚠'} <strong>Sammler mindestens ${sa.erforderlichL.toFixed(1).replace('.', ',')} l</strong> – ${escapeHtml(sa.hinweis)}
                                ${eingetragen ? `<br>Eingetragen sind ${eingetragen.toFixed(1).replace('.', ',')} l.` : ''}
                            </div>`;
                        })()}
                    </div>`;

                if (a.anzahlGesamt === 0) return kopf + volumenKarte + `<div class="empty-note" style="padding:14px;">Noch keine Kühlstelle erfasst – ohne Kältelast kein Kreisprozess.</div>`;

            const bloecke = a.ergebnisse.map(({ ks, werte, ergebnis }) => {
                if (!ergebnis.moeglich) return `<div class="form-card"><div class="form-card-title">🧊 ${escapeHtml(ks.bezeichnung || 'Unbenannt')}</div><div class="empty-note" style="padding:10px;">Kältelast noch nicht berechenbar.</div></div>`;
                const tVerd = werte.verdampfungstemperatur ? werte.verdampfungstemperatur.wert : null;
                // CO2 oberhalb der kritischen Temperatur: eigener Rechenweg.
                // Die Saettigungstabelle waere hier physikalisch falsch.
                const co2 = (A.kaeltemittel === 'R744' && typeof kaelteCO2Kreisprozess === 'function' && A.tVerfluessigung >= 26)
                    ? kaelteCO2Kreisprozess({ tVerdampfung: tVerd, tGaskuehler: A.tVerfluessigung, kaelteleistungW: ergebnis.auslegung })
                    : null;
                if (co2) {
                    if (!co2.moeglich) return `<div class="form-card"><div class="form-card-title">🧊 ${escapeHtml(ks.bezeichnung || 'Unbenannt')}</div><div class="kl-hinweis kl-fehler">✕ ${escapeHtml(co2.hinweise[0])}</div></div>`;
                    return `
                        <div class="form-card">
                            <div class="form-card-title">🧊 ${escapeHtml(ks.bezeichnung || 'Unbenannt')} ${co2.ueberkritisch ? '<span class="rohr-tag">transkritisch</span>' : ''}</div>
                            <table class="kl-ergebnis"><tbody>
                                <tr><td>Kälteleistung</td><td class="kl-w">${(ergebnis.auslegung / 1000).toFixed(2).replace('.', ',')} kW</td></tr>
                                <tr><td>Verdampfungstemperatur</td><td class="kl-w">${tVerd} °C</td></tr>
                                <tr><td>Verdampfungsdruck</td><td class="kl-w">${fmtDruck(co2.pVerdampfung, dEinheit)}</td></tr>
                                <tr class="kl-sum"><td>Optimaler Hochdruck</td><td class="kl-w">${fmtDruck(co2.hochdruckBar, dEinheit)}</td></tr>
                                <tr class="kl-formel"><td colspan="2">Hochdruck ist bei CO₂ Regelgröße – dieser Wert ergibt die beste Leistungszahl, vorgerechnet über den gesamten Druckbereich</td></tr>
                                <tr><td>Druckverhältnis</td><td class="kl-w">${co2.druckverhaeltnis.toFixed(2).replace('.', ',')}</td></tr>
                                <tr><td>spez. Kälteleistung q₀</td><td class="kl-w">${co2.q0.toFixed(1).replace('.', ',')} kJ/kg</td></tr>
                                <tr><td>Leistungszahl COP</td><td class="kl-w">${co2.cop.toFixed(2).replace('.', ',')}</td></tr>
                                <tr><td>Verdichterleistung</td><td class="kl-w">${co2.verdichterleistungKW.toFixed(2).replace('.', ',')} kW</td></tr>
                                <tr class="kl-sum"><td>Massenstrom</td><td class="kl-w">${co2.mDotKgH.toFixed(1).replace('.', ',')} kg/h</td></tr>
                            </tbody></table>
                            ${co2.hinweise.map(h => `<div class="kl-hinweis kl-${h.art}">${h.art === 'pruefen' ? '🔴' : 'ℹ'} ${escapeHtml(h.text)}</div>`).join('')}
                        </div>`;
                }
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
                            <tr><td>Verdampfungsdruck</td><td class="kl-w">${fmtDruck(kp.pVerdampfung, dEinheit)}</td></tr>
                            <tr><td>Verflüssigungsdruck</td><td class="kl-w">${fmtDruck(kp.pVerfluessigung, dEinheit)}</td></tr>
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
            const schema = kaelteSchemaSvg(project);
            const schemaKarte = schema ? `
                <div class="form-card">
                    <div class="form-card-title">Anlagenschema</div>
                    <div class="schema-flaeche">${schema}</div>
                    <div style="font-size:11.5px;color:var(--text-muted);margin-top:8px;">Wird aus der gewählten Anlagenart und den tatsächlich eingetragenen Leitungen gezeichnet. Durchgezogen = Flüssigkeit und Heißgas, gestrichelt = Sauggas. Ändert sich eine Dimension, ändert sich das Schema mit.</div>
                </div>` : '';
            return kopf + volumenKarte + schemaKarte + bloecke;
        }



        // ---- Assistent. Läuft komplett im Programm, ohne Online-Dienst und
        // ohne API. Kein Sprachmodell, sondern Regeln über die tatsächlich
        // vorhandenen Daten: er sagt im Klartext, was fehlt, was nicht
        // zusammenpasst und was der sinnvolle nächste Schritt ist.
        // Erfindet nichts - jeder Hinweis nennt den Wert, auf dem er beruht.
        function kaelteAssistent(project) {
            const k = project.kaelte;
            const A = kaelteAuslegungsdaten(project);
            const a = kaelteAuslegung(project);
            const stellen = k.kuehlstellen || [];
            const hinweise = [];
            const sag = (art, text, ziel) => hinweise.push({ art, text, ziel });

            // --- Was fehlt, um überhaupt weiterzukommen ---
            if (!stellen.length) {
                sag('fehlt', 'Es ist noch keine Kühlstelle angelegt. Ohne Raummaße und Raumtemperatur kann nichts berechnet werden.', 'kuehlstellen');
                return { hinweise, fortschritt: 0 };
            }
            stellen.forEach(x => {
                const fehlt = [];
                if (!(x.laenge && x.breite && x.hoehe) && !x.volumen) fehlt.push('Raummaße');
                if (x.raumtemperatur === undefined || x.raumtemperatur === '') fehlt.push('Raumtemperatur');
                if (fehlt.length) sag('fehlt', `${x.bezeichnung || 'Kühlstelle'}: ${fehlt.join(' und ')} fehlen.`, 'kuehlstellen');
            });

            // --- Was rechnerisch nicht zusammenpasst ---
            a.ergebnisse.forEach(e => {
                (e.meldungen || []).forEach(m => {
                    if (m.art === 'fehler') sag('problem', `${e.ks.bezeichnung}: ${m.text}`, 'kaeltelast');
                });
                if (!e.ergebnis.moeglich) return;

                // Produktlast dominiert -> das ist eine Gefrieranlage, keine Lagerung
                const prod = (e.ergebnis.teile || []).find(t => t.name === 'Produktlast');
                if (prod && prod.watt > e.ergebnis.nutzlast * 0.6) {
                    sag('erkannt', `${e.ks.bezeichnung}: ${Math.round(prod.watt / e.ergebnis.nutzlast * 100)} % der Last kommt vom Produkt. Das ist keine Lagerung, sondern eine Gefrier- bzw. Abkühlanlage – Verdampfer und Luftführung entsprechend auslegen.`, 'kaeltelast');
                }
                // Sehr hohe latente Last -> Türen prüfen
                const lat = (e.ergebnis.teile || []).find(t => t.name && t.name.includes('latent'));
                const sen = (e.ergebnis.teile || []).find(t => t.name && t.name.includes('sensibel'));
                if (lat && sen && lat.watt > sen.watt * 1.4) {
                    sag('erkannt', `${e.ks.bezeichnung}: der Feuchteeintrag über die Tür ist größer als der Wärmeeintrag. Türluftschleier oder Schnelllauftor sparen hier spürbar Leistung.`, 'kaeltelast');
                }
            });

            // --- Nächster sinnvoller Schritt ---
            const rechenbar = a.anzahlRechenbar > 0;
            const hatRohr = a.ergebnisse.some(e => e.ks.rohr && Object.values(e.ks.rohr).some(r => Number(r.laenge) > 0));
            const komp = (k.komponenten || []).length;
            const bv = k.bauteilVolumen || {};
            const hatVolumen = ['verdampfer', 'verfluessiger', 'sammler'].some(x => Number(bv[x]) > 0);

            if (rechenbar && !hatRohr) sag('naechster', `Die Kältelast steht (${(a.summeAuslegung / 1000).toFixed(2).replace('.', ',')} kW). Als Nächstes die Leitungslängen eintragen – daraus kommen Dimension, Druckverlust, Isolierung und das Rohrmaterial.`, 'rohrleitungen');
            else if (rechenbar && hatRohr && !komp) sag('naechster', 'Die Leitungen sind dimensioniert. Jetzt fehlen noch die Geräte – trage ein, was du beim Hersteller gefunden hast, dann prüft das Programm die Leistung gegen den Betriebspunkt.', 'komponenten');
            else if (komp && !hatVolumen) sag('naechster', 'Für die Kältemittelfüllmenge fehlen die Innenvolumen von Verdampfer, Verflüssiger und Sammler. Die stehen im Datenblatt – ohne sie bleibt die Füllmenge unvollständig.', 'anlage');
            else if (komp && hatVolumen) sag('naechster', 'Alles Wesentliche steht. Im Schritt Material die Preise ergänzen, dann kann das Angebot erzeugt werden.', 'material');

            // --- Betriebspunkt-Prüfungen ---
            if (rechenbar) {
                const tiefste = Math.min(...a.ergebnisse.filter(e => e.ergebnis.moeglich).map(e => e.werte.verdampfungstemperatur.wert));
                const st = kmStoff(A.kaeltemittel, tiefste);
                if (!st) sag('problem', `${A.kaeltemittel} liefert bei ${tiefste} °C keine Stoffdaten. Bei CO₂ über 31 °C Verflüssigung ist der Prozess transkritisch und braucht eine andere Rechnung.`, 'anlage');
                else if (st.p < 1.013) sag('erkannt', `Bei ${tiefste} °C liegt der Verdampfungsdruck mit ${st.p.toFixed(2).replace('.', ',')} bar unter dem Luftdruck. Eine Undichtheit zieht dann Luft und Feuchte in die Anlage – Dichtheit besonders sorgfältig prüfen.`, 'anlage');

                if (KAELTEMITTEL[A.kaeltemittel] && KAELTEMITTEL[A.kaeltemittel].blend) {
                    const gl = kaelteGlideK(A.kaeltemittel, tiefste);
                    if (gl != null && gl > 3) sag('erkannt', `${A.kaeltemittel} hat bei ${tiefste} °C rund ${gl.toFixed(1).replace('.', ',')} K Temperaturgleit. Die Überhitzung ist auf den Taupunkt zu beziehen, sonst wird der Verdampfer zu klein ausgelegt.`, 'anlage');
                }
                const spanne = A.tVerfluessigung - tiefste;
                if (spanne > 70) sag('erkannt', `Zwischen Verdampfung (${tiefste} °C) und Verflüssigung (${A.tVerfluessigung} °C) liegen ${spanne.toFixed(0)} K. Das ist für einen einstufigen Verdichter viel – zweistufige Verdichtung oder Zwischeneinspritzung prüfen.`, 'anlage');
            }

            // --- Verbund: Gruppen mit sehr unterschiedlicher Verdampfung ---
            if ((k.anlagenart || 'einzel') !== 'einzel' && a.anzahlRechenbar > 1) {
                const tvs = a.ergebnisse.filter(e => e.ergebnis.moeglich).map(e => e.werte.verdampfungstemperatur.wert);
                const spanneG = Math.max(...tvs) - Math.min(...tvs);
                if (spanneG > 12) sag('erkannt', `Die Verdampfungstemperaturen liegen ${spanneG.toFixed(0)} K auseinander. Auf einer gemeinsamen Sauggruppe zwingt das alle Stellen auf die tiefste Temperatur – zwei Gruppen (MT und LT) sind hier meist wirtschaftlicher.`, 'verbund');
            }

            // --- Welche Bauteile fehlen noch fürs Angebot? ---
            // Kommt aus dem Anforderungsprofil der Anlagenart, nicht aus einer
            // festen Liste - bei einer Einzelanlage wird kein Ölabscheider
            // verlangt, bei einem Verbund schon.
            if (rechenbar && typeof kaelteKomponentenBedarf === 'function') {
                try {
                    const bedarf = kaelteKomponentenBedarf(project);
                    if (bedarf.moeglich) {
                        const vorhanden = (k.komponenten || []).map(c => String(c.typ || '').toLowerCase());
                        const fehlend = bedarf.slots
                            .map(sl => sl.typ)
                            .filter(t => !vorhanden.some(v => v === t.toLowerCase() || v.includes(t.toLowerCase()) || t.toLowerCase().includes(v)));
                        if (fehlend.length) {
                            sag('fehlt', `Für das Angebot fehlen noch: ${fehlend.join(', ')}. Im Schritt Komponenten eintragen oder aus dem Katalog übernehmen – sonst stehen sie später nicht in der Materialliste.`, 'komponenten');
                        } else if (komp) {
                            sag('erkannt', `Alle für eine ${(KAELTE_ANLAGENARTEN.find(x => x.key === (k.anlagenart || 'einzel')) || {}).label || 'Anlage'} üblichen Bauteile sind eingetragen.`, 'komponenten');
                        }
                    }
                } catch (e) { /* Checkliste optional */ }
            }

            const schritteFertig = [stellen.length > 0, rechenbar, hatRohr, komp > 0, hatVolumen].filter(Boolean).length;
            // Nach Wichtigkeit sortieren (Punkt 40): 'problem' und 'fehlt'
            // zuerst, damit sie bei der Begrenzung auf 6 Zeilen in der
            // Anzeige nicht von 'erkannt'/'naechster'-Hinweisen verdraengt
            // werden.
            const ASS_RANG = { problem: 0, fehlt: 1, naechster: 2, erkannt: 3 };
            hinweise.sort((a, b) => (ASS_RANG[a.art] ?? 9) - (ASS_RANG[b.art] ?? 9));
            return { hinweise, fortschritt: Math.round(schritteFertig / 5 * 100) };
        }



        // ---- Normen und technische Regeln.
        // BEWUSST als reine Verwaltung gebaut: das Programm hinterlegt KEINE
        // Norminhalte und prueft nicht gegen sie. Es kann und darf nicht
        // behaupten, eine Anlage sei normgerecht. Was es kann: festhalten,
        // welche Regelwerke in welcher Fassung herangezogen wurden, wer das
        // geprueft hat und wann - und daran erinnern, wenn eine Fassung alt
        // ist. Die inhaltliche Prüfung bleibt beim Techniker.
        function renderKaelteNormen(project) {
            const normen = project.kaelte.normen || [];
            const heute = new Date();
            const zeilen = normen.map((n, i) => {
                let stand = '';
                if (n.geprueftAm) {
                    const tage = Math.floor((heute - new Date(n.geprueftAm)) / 86400000);
                    stand = tage > 365
                        ? `<span style="color:#c98a12;font-weight:600;">vor ${Math.floor(tage / 365)} Jahr(en) geprüft – Fassung nachsehen</span>`
                        : `vor ${tage} Tag(en) geprüft`;
                } else stand = '<span style="color:#d24545;font-weight:600;">noch nicht geprüft</span>';
                return `<tr>
                    <td><strong>${escapeHtml(n.bezeichnung)}</strong>${n.fassung ? `<br><span style="font-size:11px;color:var(--text-muted);">Fassung ${escapeHtml(n.fassung)}</span>` : ''}</td>
                    <td style="font-size:11.5px;">${escapeHtml(n.betrifft || '–')}</td>
                    <td style="font-size:11.5px;">${escapeHtml(n.quelle || '–')}</td>
                    <td style="font-size:11.5px;">${stand}</td>
                    <td style="text-align:right;white-space:nowrap;">
                        <button class="btn btn-sm btn-outline" onclick="app.openNormModal(${idJS(project.id)}, ${i})">${icon('edit')}</button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteNorm(${idJS(project.id)}, ${i})">${icon('trash')}</button>
                    </td></tr>`;
            }).join('');

            return `
                <div class="form-card">
                    <div class="detail-section-head" style="margin-top:0;">
                        <h4>Herangezogene Normen und Regelwerke (${normen.length})</h4>
                        <button class="btn btn-sm btn-outline" onclick="app.openNormModal(${idJS(project.id)})">${icon('plus')} Regelwerk</button>
                    </div>
                    ${normen.length ? `<div class="table-container"><table>
                        <thead><tr><th>Regelwerk</th><th>Betrifft</th><th>Quelle</th><th>Stand</th><th></th></tr></thead>
                        <tbody>${zeilen}</tbody></table></div>`
                        : '<div class="empty-note" style="padding:12px;">Noch kein Regelwerk hinterlegt.</div>'}
                    <div class="kl-hinweis kl-pruefen" style="margin-top:10px;">🔴 Das Programm hinterlegt keine Norminhalte und prüft nicht gegen sie. Diese Liste hält nur fest, was du herangezogen hast, in welcher Fassung und wann du es zuletzt geprüft hast. Ob die Anlage den geltenden Vorschriften entspricht, kann nur die fachliche Prüfung feststellen.</div>
                </div>`;
        }

        // ---- Varianten und Was-wäre-wenn.
        // Eine Variante ist ein vollstaendiger Schnappschuss der Kaelteplanung.
        // Beim Vergleich wird die gespeicherte Variante mit denselben
        // Funktionen neu durchgerechnet wie das aktuelle Projekt - es werden
        // keine alten Ergebnisse aufbewahrt, sondern die alten EINGABEN.
        // Dadurch bleibt ein Vergleich auch nach einer Formelkorrektur gueltig.
        function kaelteVariantenKennzahlen(kaelteStand) {
            const schein = { id: 'vergleich', kaelte: kaelteStand };
            const a = kaelteAuslegung(schein);
            const A = kaelteAuslegungsdaten(schein);
            const werte = {
                kaeltelast: a.summeGesamt / 1000,
                auslegung: a.summeAuslegung / 1000,
                kaeltemittel: A.kaeltemittel,
                stellen: (kaelteStand.kuehlstellen || []).length,
                massenstrom: null, rohr: {}, fuellmenge: null, materialVK: null
            };
            const erste = a.ergebnisse.find(e => e.ergebnis.moeglich);
            if (erste) {
                const kp = kaelteKreisprozess({ kaeltemittel: A.kaeltemittel,
                    tVerdampfung: erste.werte.verdampfungstemperatur.wert,
                    tVerfluessigung: A.tVerfluessigung, ueberhitzung: A.ueberhitzung,
                    unterkuehlung: A.unterkuehlung, kaelteleistungW: a.summeAuslegung });
                if (kp.moeglich) {
                    werte.massenstrom = kp.mDotKgH;
                    ROHR_ARTEN.forEach(art => {
                        const g = (erste.ks.rohr || {})[art.key] || {};
                        if (!Number(g.laenge)) return;
                        const geo = { laenge: Number(g.laenge), hoehenunterschied: Number(g.hoehenunterschied) || 0,
                            formstuecke: Object.fromEntries(ROHR_FORMSTUECKE.map(([kk]) => [kk, Number(g[kk]) || 0])) };
                        const aus = kaelteRohrAuswahl(art.key, kp, geo);
                        if (aus.empfehlung) werte.rohr[art.key] = `${aus.empfehlung.rohr.bez} (${aus.empfehlung.w.toFixed(1).replace('.', ',')} m/s)`;
                    });
                }
            }
            try {
                const m = kaelteMaterialListe(schein);
                werte.materialVK = m.summeVK;
                const km = m.pos.find(x => x.schluessel === 'kaeltemittel');
                if (km) werte.fuellmenge = Number(km.menge) || 0;
            } catch (e) { /* Material optional */ }
            return werte;
        }

        function renderKaelteVarianten(project) {
            const varianten = project.kaelte.varianten || [];
            const jetzt = kaelteVariantenKennzahlen(project.kaelte);
            const zahl = (v, e = 2) => v == null ? '–' : Number(v).toFixed(e).replace('.', ',');

            const vergleich = varianten.map((v, i) => {
                const k = kaelteVariantenKennzahlen(v.stand);
                const diff = (neu, alt, e = 2) => {
                    if (neu == null || alt == null) return '<span style="color:var(--text-muted);">–</span>';
                    const d = neu - alt;
                    if (Math.abs(d) < Math.pow(10, -e) / 2) return '<span style="color:var(--text-muted);">gleich</span>';
                    const proz = alt !== 0 ? ` (${d > 0 ? '+' : ''}${(d / alt * 100).toFixed(0)} %)` : '';
                    return `<span style="color:${d > 0 ? '#c98a12' : '#2a9d5c'};font-weight:600;">${d > 0 ? '+' : ''}${zahl(d, e)}${proz}</span>`;
                };
                return `
                    <div class="form-card">
                        <div class="detail-section-head" style="margin-top:0;">
                            <h4>${escapeHtml(v.name)} <span style="font-weight:400;color:var(--text-muted);font-size:12px;">· ${formatDate(v.datum)}</span></h4>
                            <div style="white-space:nowrap;">
                                <button class="btn btn-sm btn-outline" onclick="app.kaelteVarianteLaden(${idJS(project.id)}, ${i})">Zurückladen</button>
                                <button class="btn btn-sm btn-danger" onclick="app.kaelteVarianteLoeschen(${idJS(project.id)}, ${i})">${icon('trash')}</button>
                            </div>
                        </div>
                        <div class="table-container"><table>
                            <thead><tr><th>Kennzahl</th><th>${escapeHtml(v.name)}</th><th>Aktuell</th><th>Unterschied</th></tr></thead>
                            <tbody>
                                <tr><td>Gesamtkältelast</td><td class="kl-w">${zahl(k.kaeltelast)} kW</td><td class="kl-w">${zahl(jetzt.kaeltelast)} kW</td><td class="kl-w">${diff(jetzt.kaeltelast, k.kaeltelast)}</td></tr>
                                <tr><td>Anlagenleistung</td><td class="kl-w">${zahl(k.auslegung)} kW</td><td class="kl-w">${zahl(jetzt.auslegung)} kW</td><td class="kl-w">${diff(jetzt.auslegung, k.auslegung)}</td></tr>
                                <tr><td>Massenstrom</td><td class="kl-w">${zahl(k.massenstrom, 1)} kg/h</td><td class="kl-w">${zahl(jetzt.massenstrom, 1)} kg/h</td><td class="kl-w">${diff(jetzt.massenstrom, k.massenstrom, 1)}</td></tr>
                                <tr><td>Kältemittel</td><td>${escapeHtml(k.kaeltemittel)}</td><td>${escapeHtml(jetzt.kaeltemittel)}</td><td>${k.kaeltemittel === jetzt.kaeltemittel ? '<span style="color:var(--text-muted);">gleich</span>' : '<strong>geändert</strong>'}</td></tr>
                                ${ROHR_ARTEN.map(art => (k.rohr[art.key] || jetzt.rohr[art.key]) ? `
                                    <tr><td>${escapeHtml(art.label)}</td><td>${escapeHtml(k.rohr[art.key] || '–')}</td><td>${escapeHtml(jetzt.rohr[art.key] || '–')}</td>
                                    <td>${(k.rohr[art.key] || '') === (jetzt.rohr[art.key] || '') ? '<span style="color:var(--text-muted);">gleich</span>' : '<strong>andere Dimension</strong>'}</td></tr>` : '').join('')}
                                <tr><td>Füllmenge</td><td class="kl-w">${zahl(k.fuellmenge, 1)} kg</td><td class="kl-w">${zahl(jetzt.fuellmenge, 1)} kg</td><td class="kl-w">${diff(jetzt.fuellmenge, k.fuellmenge, 1)}</td></tr>
                                <tr><td>Materialsumme VK</td><td class="kl-w">${k.materialVK != null ? formatCurrency(k.materialVK) : '–'}</td><td class="kl-w">${jetzt.materialVK != null ? formatCurrency(jetzt.materialVK) : '–'}</td><td class="kl-w">${diff(jetzt.materialVK, k.materialVK)}</td></tr>
                            </tbody>
                        </table></div>
                        ${v.notiz ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:8px;">${escapeHtml(v.notiz)}</div>` : ''}
                    </div>`;
            }).join('');

            return `
                <div class="form-card">
                    <div class="detail-section-head" style="margin-top:0;">
                        <h4>Varianten (${varianten.length})</h4>
                        <button class="btn btn-sm btn-primary" onclick="app.kaelteVarianteSpeichern(${idJS(project.id)})">${icon('plus')} Aktuellen Stand sichern</button>
                    </div>
                    <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;">
                        Sichere den jetzigen Stand, ändere dann etwas – Paneelstärke, Türöffnungen, Außentemperatur, Rohrlänge, Kältemittel –
                        und du siehst hier sofort, was das an Kältelast, Leistung, Massenstrom, Rohrdimension, Füllmenge und Materialkosten ausmacht.
                        Gespeichert werden die Eingaben, nicht die Ergebnisse: der Vergleich rechnet beide Stände frisch durch.
                    </div>
                </div>
                ${vergleich}`;
        }

        // ---- Anlagenschema.
        // Wird vollstaendig aus der Konfiguration erzeugt: Anlagenart bestimmt
        // den Aufbau, die Leitungen tragen die real berechneten Betriebsdaten,
        // jedes Bauteil bekommt eine Positionsnummer. Das Layout waechst mit
        // der Anzahl der Kuehlstellen mit - es bricht nicht ab.
        //
        // Bei Hochdruck-/Mitteldruck-Anlagen wird ein EIGENES Schema
        // gezeichnet, nicht das der normalen Verbundanlage. Diese Systeme
        // haben eine Mitteldruckebene, ein Hochdruckventil und ein
        // Flashgas-Management - das darf nicht unterschlagen werden.

        const SCHEMA_F = {
            linie: 'var(--accent)', kasten: 'var(--bg-secondary)', rand: 'var(--border)',
            text: 'var(--text-primary)', klein: 'var(--text-muted)'
        };

        // Symbolbibliothek nach der ueblichen Kaeltetechnik-Darstellung.
        // Alle Symbole sind an ihrem Mittelpunkt ausgerichtet.
        const SCHEMA_SYM = (() => {
            const F = SCHEMA_F;
            const doppeldreieck = (x, y) => `M ${x - 6} ${y - 5} L ${x - 6} ${y + 5} L ${x} ${y} Z M ${x + 6} ${y - 5} L ${x + 6} ${y + 5} L ${x} ${y} Z`;
            const bez = (x, y, t) => t ? `<text x="${x}" y="${y}" text-anchor="middle" font-size="7" fill="${F.klein}">${escapeHtml(t)}</text>` : '';
            return {
                absperr: (x, y, t) => `<g><path d="${doppeldreieck(x, y)}" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.4"/>
                    <line x1="${x}" y1="${y - 5}" x2="${x}" y2="${y - 9}" stroke="${F.linie}" stroke-width="1.4"/>
                    <line x1="${x - 4}" y1="${y - 9}" x2="${x + 4}" y2="${y - 9}" stroke="${F.linie}" stroke-width="1.4"/>${bez(x, y + 15, t)}</g>`,
                magnet: (x, y, t) => `<g><path d="${doppeldreieck(x, y)}" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.4"/>
                    <rect x="${x - 4}" y="${y - 14}" width="8" height="7" fill="${F.linie}"/>
                    <line x1="${x}" y1="${y - 7}" x2="${x}" y2="${y - 5}" stroke="${F.linie}" stroke-width="1.4"/>${bez(x, y + 15, t)}</g>`,
                exv: (x, y, t) => `<g><path d="${doppeldreieck(x, y)}" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.4"/>
                    <line x1="${x - 8}" y1="${y + 9}" x2="${x + 8}" y2="${y - 11}" stroke="${F.linie}" stroke-width="1.4"/>
                    <path d="M ${x + 8} ${y - 11} l -4 1 l 2 3 z" fill="${F.linie}"/>${bez(x, y + 16, t)}</g>`,
                rueck: (x, y, t) => `<g><circle cx="${x - 2}" cy="${y}" r="3.5" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.3"/>
                    <line x1="${x + 2}" y1="${y - 5}" x2="${x + 2}" y2="${y + 5}" stroke="${F.linie}" stroke-width="1.6"/>${bez(x, y + 15, t)}</g>`,
                sicherheit: (x, y, t) => `<g><path d="${doppeldreieck(x, y)}" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.4"/>
                    <path d="M ${x} ${y - 5} l 0 -6 l -5 0 l 5 -5 l 5 5 l -5 0" fill="none" stroke="${F.linie}" stroke-width="1.3"/>${bez(x, y + 15, t)}</g>`,
                schauglas: (x, y, t) => `<g><circle cx="${x}" cy="${y}" r="6" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.4"/>
                    <circle cx="${x}" cy="${y}" r="2" fill="${F.linie}"/>${bez(x, y + 16, t)}</g>`,
                filter: (x, y, t) => `<g><rect x="${x - 8}" y="${y - 5}" width="16" height="10" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.4"/>
                    <line x1="${x - 8}" y1="${y + 5}" x2="${x + 8}" y2="${y - 5}" stroke="${F.linie}" stroke-width="1.2"/>${bez(x, y + 16, t)}</g>`,
                sensor: (x, y, b, t) => `<g><circle cx="${x}" cy="${y}" r="6.5" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.3"/>
                    <text x="${x}" y="${y + 3}" text-anchor="middle" font-size="8" font-weight="700" fill="${F.linie}">${escapeHtml(b)}</text>${bez(x, y + 16, t)}</g>`,
                behaelter: (x, y, t, w = 34) => `<g><rect x="${x - w / 2}" y="${y - 8}" width="${w}" height="16" rx="8" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.5"/>
                    <line x1="${x - w / 2 + 6}" y1="${y + 2}" x2="${x + w / 2 - 6}" y2="${y + 2}" stroke="${F.linie}" stroke-width="1"/>${bez(x, y + 19, t)}</g>`,
                // Ölabscheider: stehender Behälter mit Ölstand und Rückführung
                oel: (x, y, t) => `<g><rect x="${x - 9}" y="${y - 12}" width="18" height="24" rx="4" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.4"/>
                    <line x1="${x - 9}" y1="${y + 5}" x2="${x + 9}" y2="${y + 5}" stroke="${F.linie}" stroke-width="1"/>
                    <text x="${x}" y="${y + 11}" text-anchor="middle" font-size="6" fill="${F.linie}">ÖL</text>${bez(x, y + 22, t)}</g>`,
                // Verteiler / Düsenstock: Aufteilung auf mehrere Kreise
                verteiler: (x, y, t) => `<g><path d="M ${x - 7} ${y} L ${x + 5} ${y - 7} L ${x + 5} ${y + 7} Z" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.3"/>
                    <line x1="${x + 5}" y1="${y - 4}" x2="${x + 11}" y2="${y - 7}" stroke="${F.linie}" stroke-width="1.1"/>
                    <line x1="${x + 5}" y1="${y}" x2="${x + 11}" y2="${y}" stroke="${F.linie}" stroke-width="1.1"/>
                    <line x1="${x + 5}" y1="${y + 4}" x2="${x + 11}" y2="${y + 7}" stroke="${F.linie}" stroke-width="1.1"/>${bez(x, y + 17, t)}</g>`,
                // Interner Wärmetauscher: gekreuzte Ströme im Rechteck
                wt: (x, y, t) => `<g><rect x="${x - 11}" y="${y - 8}" width="22" height="16" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.4"/>
                    <line x1="${x - 11}" y1="${y - 8}" x2="${x + 11}" y2="${y + 8}" stroke="${F.linie}" stroke-width="1.1"/>
                    <line x1="${x - 11}" y1="${y + 8}" x2="${x + 11}" y2="${y - 8}" stroke="${F.linie}" stroke-width="1.1"/>${bez(x, y + 19, t)}</g>`
            };
        })();

        // farbenOverride: fuer das PDF werden die CSS-Variablen durch feste
        // Farbwerte ersetzt. Ein aus dem Dokument geloestes SVG kann
        // var(--accent) nicht mehr aufloesen - es waere sonst schwarz.
        function kaelteSchemaSvg(project, farbenOverride) {
            const farbenVorher = { ...SCHEMA_F };
            if (farbenOverride) Object.assign(SCHEMA_F, farbenOverride);
            try {
                return kaelteSchemaSvgIntern(project);
            } finally {
                Object.assign(SCHEMA_F, farbenVorher);
            }
        }

        function kaelteSchemaSvgIntern(project) {
            const A = kaelteAuslegungsdaten(project);
            const a = kaelteAuslegung(project);
            const art = project.kaelte.anlagenart || 'einzel';
            const stellen = a.ergebnisse.filter(e => e.ergebnis.moeglich);
            if (!stellen.length) return '';

            const F = SCHEMA_F, S = SCHEMA_SYM;
            const teile = [];
            let pos = 0;
            const nr = () => String(++pos).padStart(2, '0');

            // Bauteilkasten mit Positionsnummer
            const kasten = (x, y, w, h, titel, unter) => {
                const n = nr();
                teile.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${F.kasten}" stroke="${F.linie}" stroke-width="1.6"/>
                    <circle cx="${x + 9}" cy="${y + 9}" r="7" fill="${F.linie}"/>
                    <text x="${x + 9}" y="${y + 12}" text-anchor="middle" font-size="8" font-weight="700" fill="#fff">${n}</text>
                    <text x="${x + w / 2}" y="${y + (unter ? h / 2 : h / 2 + 4)}" text-anchor="middle" font-size="10.5" font-weight="600" fill="${F.text}">${escapeHtml(titel)}</text>
                    ${unter ? `<text x="${x + w / 2}" y="${y + h / 2 + 11}" text-anchor="middle" font-size="8" fill="${F.klein}">${escapeHtml(unter)}</text>` : ''}`);
                return n;
            };
            // Symbol mit Positionsnummer
            const sym = (svg, x, y) => {
                const n = nr();
                teile.push(svg);
                teile.push(`<circle cx="${x + 10}" cy="${y - 10}" r="5.5" fill="${F.linie}"/>
                    <text x="${x + 10}" y="${y - 7.5}" text-anchor="middle" font-size="6.5" font-weight="700" fill="#fff">${n}</text>`);
                return n;
            };
            const linie = (x1, y1, x2, y2, gestrichelt, pfeil) =>
                teile.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${F.linie}" stroke-width="2"${gestrichelt ? ' stroke-dasharray="6 3"' : ''}${pfeil ? ' marker-end="url(#kpfeil)"' : ''}/>`);
            const weg = (d, gestrichelt, pfeil) =>
                teile.push(`<path d="${d}" fill="none" stroke="${F.linie}" stroke-width="2"${gestrichelt ? ' stroke-dasharray="6 3"' : ''}${pfeil ? ' marker-end="url(#kpfeil)"' : ''}/>`);
            const text = (x, y, zeilen, anker = 'start', groesse = 8) =>
                (Array.isArray(zeilen) ? zeilen : [zeilen]).forEach((z, i) =>
                    teile.push(`<text x="${x}" y="${y + i * 9.5}" text-anchor="${anker}" font-size="${groesse}" fill="${F.klein}">${escapeHtml(z)}</text>`));

            // Betriebsdaten einer Leitung: Dimension, Länge, Massenstrom,
            // Strömung und Druckverlust - alles aus der echten Berechnung.
            const leitungsdaten = (ks, artKey, kp) => {
                const g = (ks.rohr || {})[artKey] || {};
                if (!Number(g.laenge)) return null;
                const zeilen = [];
                if (g.gewaehlt) zeilen.push(g.gewaehlt);
                zeilen.push(`L = ${g.laenge} m`);
                if (kp && kp.moeglich) {
                    try {
                        const geo = { laenge: Number(g.laenge), hoehenunterschied: Number(g.hoehenunterschied) || 0,
                            formstuecke: Object.fromEntries(ROHR_FORMSTUECKE.map(([k]) => [k, Number(g[k]) || 0])) };
                        const aus = kaelteRohrAuswahl(artKey, kp, geo);
                        const z = aus.varianten.find(v => v.rohr.bez === g.gewaehlt) || aus.empfehlung;
                        if (z) {
                            zeilen.push(`w = ${z.w.toFixed(1).replace('.', ',')} m/s`);
                            zeilen.push(`Δp = ${z.dpGesamtBar.toFixed(3).replace('.', ',')} bar`);
                        }
                        zeilen.push(`ṁ = ${kp.mDotKgH.toFixed(0)} kg/h`);
                    } catch (e) { /* Betriebsdaten optional */ }
                }
                return zeilen;
            };

            // Kreisprozess der maßgebenden (tiefsten) Kühlstelle
            const tiefste = Math.min(...stellen.map(e => e.werte.verdampfungstemperatur.wert));
            let kp = null;
            try {
                kp = (A.kaeltemittel === 'R744' && A.tVerfluessigung >= 26 && typeof kaelteCO2Kreisprozess === 'function')
                    ? kaelteCO2Kreisprozess({ tVerdampfung: tiefste, tGaskuehler: A.tVerfluessigung, kaelteleistungW: a.summeAuslegung })
                    : kaelteKreisprozess({ kaeltemittel: A.kaeltemittel, tVerdampfung: tiefste,
                        tVerfluessigung: A.tVerfluessigung, ueberhitzung: A.ueberhitzung,
                        unterkuehlung: A.unterkuehlung, kaelteleistungW: a.summeAuslegung });
            } catch (e) { kp = null; }

            // ---------- Layout ----------
            // Feste Spalten statt gedehnter Breite: der Abzweig zu den
            // Verdampfern liegt genau ueber der ersten Verdampferspalte,
            // dadurch entfaellt die Schleife, die entstand, wenn die
            // Fluessigkeitsleitung erst nach links und dann wieder nach
            // rechts lief.
            const kb = 118, kh = 34;
            const proReihe = Math.min(stellen.length, 4);
            const reihen = Math.ceil(stellen.length / 4);
            const spaltenBreite = 200;
            const xVerdichter = 40;
            const xAbzweig = 210;                       // Abzweig = erste Verdampferspalte
            const B = Math.max(900, xAbzweig + (proReihe - 1) * spaltenBreite + 260);
            const rechteSpalte = B - 40 - kb;
            const hdmd = art === 'hdmd';

            let y = 26;
            const vdMitte = xVerdichter + kb / 2, vdY = y + kh / 2;

            // --- Verdichterebene ---
            kasten(xVerdichter, y, kb, kh, art === 'einzel' ? 'Verflüssigungssatz' : (hdmd ? 'Verdichter MT' : 'Verdichterverbund'),
                `${(a.summeAuslegung / 1000).toFixed(2).replace('.', ',')} kW · ${A.kaeltemittel}`);
            if (hdmd) {
                kasten(xVerdichter, y + 52, kb, kh, 'Verdichter LT', `t₀ ${tiefste} °C`);
                kasten(xVerdichter, y + 104, kb, kh, 'Parallelverdichter', 'Flashgas');
            }

            // --- Druckleitung: Verdichter -> Verflüssiger, Pfeil nach rechts
            const dlY = vdY;
            linie(xVerdichter + kb, dlY, rechteSpalte, dlY, false, true);
            const dlPlatz = rechteSpalte - (xVerdichter + kb);
            sym(S.absperr(xVerdichter + kb + 30, dlY, 'Absperr'), xVerdichter + kb + 30, dlY);
            if (art !== 'einzel') {
                sym(S.rueck(xVerdichter + kb + 76, dlY, 'Rückschlag'), xVerdichter + kb + 76, dlY);
                const xOel = xVerdichter + kb + 130;
                sym(S.oel(xOel, dlY, 'Ölabscheider'), xOel, dlY);
                // Ölrückführung: eigener Weg unterhalb, mit Pfeil zum Verdichter
                weg(`M ${xOel} ${dlY + 12} L ${xOel} ${dlY + 34} L ${vdMitte + 26} ${dlY + 34} L ${vdMitte + 26} ${dlY + kh / 2 + 1}`, true, true);
                text(xOel - 60, dlY + 46, ['Ölrückführung']);
            }
            // Sicherheitsventil und Hochdruckfühler getrennt platzieren,
            // damit sich die Beschriftungen nicht überlagern.
            sym(S.sicherheit(rechteSpalte - 150, dlY - 30, 'Sicherheitsventil'), rechteSpalte - 150, dlY - 30);
            linie(rechteSpalte - 150, dlY - 23, rechteSpalte - 150, dlY);
            sym(S.sensor(rechteSpalte - 60, dlY - 30, 'P', 'Hochdruck'), rechteSpalte - 60, dlY - 30);
            linie(rechteSpalte - 60, dlY - 23, rechteSpalte - 60, dlY);
            text((xVerdichter + kb + rechteSpalte) / 2, dlY - 9, ['Druckleitung'], 'middle');

            kasten(rechteSpalte, y, kb, kh, hdmd ? 'Gaskühler' : 'Verflüssiger',
                hdmd ? `Austritt ${A.tVerfluessigung} °C` : `tc ${A.tVerfluessigung} °C`);

            // --- Sammler bzw. Mitteldruckebene ---
            let flY = y + 84;
            if (hdmd) {
                sym(S.exv(rechteSpalte + kb / 2, y + kh + 18, 'Hochdruckventil'), rechteSpalte + kb / 2, y + kh + 18);
                linie(rechteSpalte + kb / 2, y + kh, rechteSpalte + kb / 2, y + kh + 12, false, true);
                flY = y + 114;
                kasten(rechteSpalte - 26, flY - kh / 2, kb + 26, kh, 'Mitteldrucksammler', 'Flashgas-Abscheidung');
                linie(rechteSpalte + kb / 2, y + kh + 26, rechteSpalte + kb / 2, flY - kh / 2, false, true);
                const xFg = rechteSpalte - 62;
                weg(`M ${rechteSpalte - 26} ${flY - 9} L ${xFg} ${flY - 9} L ${xFg} ${y + 121} L ${xVerdichter + kb} ${y + 121}`, true, true);
                sym(S.magnet(xFg, flY - 34, 'Flashgas-Ventil'), xFg, flY - 34);
                text(xVerdichter + kb + 12, y + 117, ['Flashgas zum Parallelverdichter']);
            } else {
                sym(S.behaelter(rechteSpalte + kb / 2, flY, 'Sammler'), rechteSpalte + kb / 2, flY);
                linie(rechteSpalte + kb / 2, y + kh, rechteSpalte + kb / 2, flY - 9, false, true);
            }

            // --- Flüssigkeitsleitung nach links, Pfeil in Fließrichtung ---
            const flVon = hdmd ? rechteSpalte - 26 : rechteSpalte + kb / 2 - 17;
            linie(flVon, flY, xAbzweig, flY, false, true);
            // Armaturen gleichmäßig verteilen, Reihenfolge in Fließrichtung:
            // Absperr, Filtertrockner, Schauglas, Magnetventil (und int. WT)
            const wtAn = !!(project.kaelte.internerWT);
            const armaturen = [['absperr', 'Absperr'], ['filter', 'Filtertrockner'], ['schauglas', 'Schauglas'], ['magnet', 'Magnetventil']];
            if (wtAn) armaturen.push(['wt', 'int. Wärmetauscher']);
            const strecke = flVon - xAbzweig;
            armaturen.forEach((ar, i) => {
                const ax = flVon - strecke * ((i + 1) / (armaturen.length + 1));
                sym(S[ar[0]](ax, flY, ar[1]), ax, flY);
            });
            text((flVon + xAbzweig) / 2, flY - 13, ['Flüssigkeitsleitung'], 'middle');

            // --- Verteilerschiene: liegt genau über der ersten Spalte ---
            const busY = flY + 44;
            linie(xAbzweig, flY, xAbzweig, busY, false, true);
            const letzteX = xAbzweig + (proReihe - 1) * spaltenBreite;
            if (proReihe > 1) linie(xAbzweig, busY, letzteX, busY);

            const saugBusY = busY + 58 + (reihen - 1) * 150 + 96;
            stellen.forEach((e, i) => {
                const reihe = Math.floor(i / 4), spalte = i % 4;
                const x = xAbzweig + spalte * spaltenBreite;
                const yy = busY + 58 + reihe * 150;
                const ks = e.ks;
                const tv = e.werte.verdampfungstemperatur.wert;

                // Durchgehende Linie vom Bus bis zum Verdampfer - EXV (und
                // ggf. Verteiler) werden darauf gezeichnet, nicht durch eine
                // Luecke "ausgespart". So entsteht kein freischwebendes Stueck.
                linie(x, busY, x, yy, false, true);
                sym(S.exv(x, yy - 28, ''), x, yy - 28);
                text(x - 12, yy - 8, ['EXV'], 'end', 7.5);
                const dpVert = Number((project.kaelte.exv || {}).dpVerteiler) || 0;
                if (dpVert > 0) { sym(S.verteiler(x, yy - 10, ''), x, yy - 10); text(x - 12, yy + 2, ['Verteiler'], 'end', 7.5); }
                kasten(x - kb / 2, yy, kb, kh, 'Verdampfer',
                    `${String(ks.bezeichnung || '').slice(0, 20)} · ${(e.ergebnis.auslegung / 1000).toFixed(2).replace('.', ',')} kW`);
                text(x, yy + kh + 13, [`t₀ ${tv} °C · Raum ${e.werte.raumtemperatur.wert} °C`], 'middle', 7.5);

                const fd = leitungsdaten(ks, 'fluessig', kp);
                if (fd) text(x + 14, yy - 48, fd, 'start', 7);

                // Saugleitung nach unten, Pfeil zeigt weg vom Verdampfer
                sym(S.sensor(x, yy + kh + 26, 'T', ''), x, yy + kh + 26);
                weg(`M ${x} ${yy + kh + 33} L ${x} ${saugBusY}`, true, false);
                const sd = leitungsdaten(ks, 'saug', kp);
                if (sd) text(x + 14, yy + kh + 40, sd, 'start', 7);
            });

            // --- Saugsammelschiene zurück zum Verdichter, mit Richtungspfeil
            weg(`M ${letzteX} ${saugBusY} L ${vdMitte} ${saugBusY} L ${vdMitte} ${vdY + kh / 2 + 1}`, true, true);
            sym(S.absperr(vdMitte, saugBusY - 40, 'Saugabsperr'), vdMitte, saugBusY - 40);
            sym(S.sensor(vdMitte, saugBusY - 84, 'P', 'Niederdruck'), vdMitte, saugBusY - 84);
            text(vdMitte + 60, saugBusY - 9, ['Saugleitung']);

            // --- Legende ---
            const legY = saugBusY + 40;
            teile.push(`<line x1="40" y1="${legY - 14}" x2="${B - 40}" y2="${legY - 14}" stroke="${F.rand}" stroke-width="1"/>`);
            teile.push(`<text x="40" y="${legY}" font-size="9" font-weight="700" fill="${F.text}">LEGENDE</text>`);
            const legende = [
                ['linie', 'Hochdruck / Flüssigkeit'], ['gestrichelt', 'Sauggas / Flashgas / Öl'],
                ['absperr', 'Absperrventil'], ['magnet', 'Magnetventil'], ['exv', 'Expansionsventil'],
                ['filter', 'Filtertrockner'], ['schauglas', 'Schauglas'], ['sicherheit', 'Sicherheitsventil'],
                ['sensorP', 'Druckfühler'], ['sensorT', 'Temperaturfühler']
            ];
            legende.forEach((l, i) => {
                const lx = 50 + (i % 5) * ((B - 100) / 5), ly = legY + 22 + Math.floor(i / 5) * 30;
                if (l[0] === 'linie') teile.push(`<line x1="${lx - 8}" y1="${ly}" x2="${lx + 8}" y2="${ly}" stroke="${F.linie}" stroke-width="2"/>`);
                else if (l[0] === 'gestrichelt') teile.push(`<line x1="${lx - 8}" y1="${ly}" x2="${lx + 8}" y2="${ly}" stroke="${F.linie}" stroke-width="2" stroke-dasharray="5 3"/>`);
                else if (l[0] === 'sensorP') teile.push(S.sensor(lx, ly, 'P', ''));
                else if (l[0] === 'sensorT') teile.push(S.sensor(lx, ly, 'T', ''));
                else teile.push(S[l[0]](lx, ly, ''));
                teile.push(`<text x="${lx + 18}" y="${ly + 3}" font-size="8" fill="${F.klein}">${escapeHtml(l[1])}</text>`);
            });
            const hoehe = legY + 22 + Math.ceil(legende.length / 5) * 30 + 16;

            return `
                <svg viewBox="0 0 ${B} ${hoehe}" style="width:100%;height:auto;" xmlns="http://www.w3.org/2000/svg">
                    <defs><marker id="kpfeil" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L7,3 z" fill="${F.linie}"/></marker></defs>
                    ${teile.join('\n')}
                </svg>`;
        }

        // Wandelt das Schema in ein Rasterbild fuer das PDF um.
        // Bewusst derselbe Generator wie am Bildschirm - dadurch koennen
        // Plan im PDF und Plan in der App nicht auseinanderlaufen.
        function kaelteSchemaAlsBild(project, farben, breitePx = 2000) {
            return new Promise((aufloesen, ablehnen) => {
                const svg = kaelteSchemaSvg(project, farben);
                if (!svg) { aufloesen(null); return; }
                const vb = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
                if (!vb) { aufloesen(null); return; }
                const bV = parseFloat(vb[1]), hV = parseFloat(vb[2]);
                const hPx = Math.round(breitePx * hV / bV);
                const bild = new Image();
                const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                bild.onload = () => {
                    try {
                        const c = document.createElement('canvas');
                        c.width = breitePx; c.height = hPx;
                        const ctx = c.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, breitePx, hPx);
                        ctx.drawImage(bild, 0, 0, breitePx, hPx);
                        URL.revokeObjectURL(url);
                        aufloesen({ dataUrl: c.toDataURL('image/png'), breite: bV, hoehe: hV });
                    } catch (e) { URL.revokeObjectURL(url); ablehnen(e); }
                };
                bild.onerror = (e) => { URL.revokeObjectURL(url); ablehnen(e); };
                bild.src = url;
            });
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
                                <label>Höhenunterschied (m)<div class="vz-feld"><input type="text" inputmode="decimal" class="ro-in" data-ks="${ks.id}" data-art="${art.key}" data-feld="hoehenunterschied" value="${g.hoehenunterschied ?? ''}"><button type="button" class="vz-knopf" title="Vorzeichen wechseln – minus für fallende Leitung">±</button></div></label>
                                ${ROHR_FORMSTUECKE.map(([k, l]) => `<label>${escapeHtml(l)}<input type="text" inputmode="decimal" class="ro-in" data-ks="${ks.id}" data-art="${art.key}" data-feld="${k}" value="${g[k] ?? ''}"></label>`).join('')}
                            </div>
                            ${!geo.laenge ? '<div class="empty-note" style="padding:8px;font-size:12px;">Länge eintragen, dann wird dimensioniert.</div>' : !emp ? `
                                <div class="kl-hinweis kl-fehler">✕ Keine der verfügbaren Kupferdimensionen erfüllt alle Kriterien.</div>
                                <table class="kl-ergebnis" style="margin-top:6px;"><tbody>
                                    ${aus.varianten.slice(0, 6).map(v => `
                                        <tr><td>${escapeHtml(v.rohr.bez)}</td><td style="font-size:11px;">${
                                            v.bewertung.filter(b => b.art === 'fehler').length
                                                ? v.bewertung.filter(b => b.art === 'fehler').map(b => '✗ ' + escapeHtml(b.text.split(' – ')[0].split(':')[0])).join('<br>')
                                                : '✓ alle Kriterien erfüllt außer Grenzfall'
                                        }</td></tr>`).join('')}
                                </tbody></table>
                                <div class="kl-hinweis kl-pruefen" style="margin-top:6px;">🔴 Kein Rohr aus der Datenbank erfüllt gleichzeitig Geschwindigkeit, Druckverlust und – bei dieser Leitung – die Unterkühlungsreserve. Möglichkeiten: Unterkühlung erhöhen (Flüssigkeitsunterkühler), Leitungsweg oder Höhenunterschied verringern, oder mit dem Restrisiko bewusst planen (z. B. Flüssigkeitsleitung isolieren und kurz halten).</div>
                            ` : `
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
                                    <tr><td>Δp Rohrreibung (reines Rohr)</td><td class="kl-w">${zeile.dpReibungRohrBar.toFixed(4).replace('.', ',')} bar</td></tr>
                                    <tr><td>Δp Formstücke</td><td class="kl-w">${zeile.dpReibungFormBar.toFixed(4).replace('.', ',')} bar</td></tr>
                                    <tr><td>Δp Höhenunterschied</td><td class="kl-w">${zeile.dpHoeheBar.toFixed(4).replace('.', ',')} bar</td></tr>
                                    <tr class="kl-sum"><td>Δp gesamt</td><td class="kl-w">${zeile.dpGesamtBar.toFixed(4).replace('.', ',')} bar</td></tr>
                                    <tr class="kl-formel"><td colspan="2">Darcy-Weisbach, Rohrreibungszahl nach Colebrook-White (λ = ${zeile.f.toFixed(4)}) – Formstücke als äquivalente Rohrlänge mit derselben Reibungszahl</td></tr>
                                </tbody></table>
                                ${zeile.bewertung.map(b => `<div class="kl-hinweis kl-${b.art}">${b.art === 'fehler' ? '✕' : b.art === 'warnung' ? '⚠' : 'ℹ'} ${escapeHtml(b.text)}</div>`).join('')}
                                ${art.key !== 'heissgas' && tVerd != null ? (() => {
                                    // Daemmstaerke fuer genau diese Leitung, mit den
                                    // Umgebungsbedingungen aus den Auslegungsdaten.
                                    const tRohr = art.key === 'saug' ? tVerd : Math.min(tVerd + 10, 15);
                                    const uT = Number((project.kaelte.auslegung || {}).umgebungT) || 25;
                                    const uRH = Number((project.kaelte.auslegung || {}).umgebungRH) || 70;
                                    const iso = kaelteIsolierung({ rohrAussenMm: zeile.rohr.da, tRohr, tUmgebung: uT, rhUmgebung: uRH });
                                    if (!iso.empfehlung) return `<div class="kl-hinweis kl-fehler">✕ ${escapeHtml(iso.hinweis)}</div>`;
                                    return `<div class="iso-block">
                                        <div class="iso-kopf">Isolierung: <strong>${iso.empfehlung.staerke} mm</strong> <span style="color:var(--text-muted);font-weight:400;">bei ${uT} °C / ${uRH} % · Rohr ${tRohr} °C</span></div>
                                        <div class="iso-text">${escapeHtml(iso.hinweis)}</div>
                                        <div class="iso-varianten">${iso.varianten.slice(0, 6).map(v => `<span class="iso-var ${v.trocken ? 'ok' : 'nein'}">${v.staerke} mm · ${v.oberflaeche.toFixed(1).replace('.', ',')} °C</span>`).join('')}</div>
                                    </div>`;
                                })() : ''}` : ''}
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
            const dEinheitK = (project.kaelte.auslegung || {}).druckEinheit || 'bar';
            const preise = window.__kaeltePreise || {};
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
                                else urteil = `<span class="komp-urteil komp-gut">✓ ${leistung.toFixed(2).replace('.', ',')} kW rechnerisch ausreichend</span>`;
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
                        ${(() => {
                            // Katalogvorschlaege: nur echte Haendlerartikel,
                            // bewertet gegen den berechneten Bedarf.
                            if (typeof kaelteKatalogSuche !== 'function' || !sl.kw) return '';
                            const tRaum = (project.kaelte.kuehlstellen || [])[0];
                            const treffer = kaelteKatalogSuche(sl.typ, sl.kw, {
                                kaeltemittel: bedarf.A.kaeltemittel,
                                raumtemperatur: tRaum ? Number(tRaum.raumtemperatur) : null
                            }).filter(t => t.geeignet !== false).slice(0, 3);
                            if (!treffer.length) return '';
                            return `<div class="kat-vorschlag">
                                <div class="kat-titel">Aus dem Händlerkatalog</div>
                                ${treffer.map(t => `
                                    <div class="kat-zeile">
                                        <div>
                                            <strong>${escapeHtml(t.artikel.name || '')}</strong>
                                            ${t.geeignet === true ? '<span class="komp-urteil komp-gut">✓ Leistung ausreichend (Katalog)</span>' : '<span class="komp-urteil komp-warn">⚠ Leistung aus Datenblatt prüfen</span>'}
                                            ${(() => {
                                                const st = kaeltePreisStand(t.artikel, preise);
                                                const lk = kaeltePreisLink(t.artikel);
                                                return `<div class="kat-detail">${escapeHtml([t.artikel.hersteller, t.artikel.artikelnummer].filter(Boolean).join(' · '))}
                                                    ${st.ekNetto != null ? ' · EK ' + formatCurrency(st.ekNetto) : ' · <strong>kein Preis</strong>'}
                                                    ${st.tage != null ? ` · <span class="${st.veraltet ? 'preis-alt' : ''}">Stand ${escapeHtml(st.datum)}${st.veraltet ? ` (${Math.floor(st.tage / 30)} Monate alt)` : ''}</span>` : ''}
                                                    ${st.herkunft === 'selbst gepflegt' ? ' · selbst gepflegt' : ''}
                                                    </div>
                                                    <div class="kat-detail">
                                                        ${lk ? `<a href="${escapeHtml(lk.url)}" target="_blank" rel="noopener">${escapeHtml(lk.text)} ↗</a> · ` : ''}
                                                        <a href="#" onclick="event.preventDefault();app.openPreisModal(${idJS(project.id)}, ${idJS(t.artikel.id)})">Preis eintragen</a>
                                                    </div>`;
                                            })()}
                                            <div class="kat-detail">${escapeHtml(t.gruende.join(' · '))} · Katalogtreffer ist kein Herstellernachweis für diesen Betriebspunkt.</div>
                                        </div>
                                        <button class="btn btn-sm btn-outline" onclick="app.katalogUebernehmen(${idJS(project.id)}, ${idJS(t.artikel.id)}, ${idJS(sl.typ)})">Übernehmen</button>
                                    </div>`).join('')}
                            </div>`;
                        })()}
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
                ${(() => {
                    // Expansionsventil-Auslegung nach Ventilkapazitaet
                    if (typeof kaelteExpansionsventil !== 'function' || !bedarf.kp.moeglich) return '';
                    const e = project.kaelte.exv || {};
                    const r = kaelteExpansionsventil({
                        kaeltemittel: bedarf.A.kaeltemittel, tVerdampfung: bedarf.tVerd,
                        tVerfluessigung: bedarf.A.tVerfluessigung, ueberhitzung: bedarf.A.ueberhitzung,
                        unterkuehlung: bedarf.A.unterkuehlung, kaelteleistungW: bedarf.q0KW * 1000,
                        dpLeitungBar: Number(e.dpLeitung) || 0, dpVerteilerBar: Number(e.dpVerteiler) || 0,
                        nennkapazitaetKW: Number(e.nennkapazitaet) || null
                    });
                    if (!r.moeglich) return `<div class="form-card"><div class="form-card-title">Expansionsventil</div><div class="kl-hinweis kl-fehler">✕ ${escapeHtml(r.hinweis)}</div></div>`;
                    return `
                    <div class="form-card">
                        <div class="form-card-title">Expansionsventil – Auslegung nach Ventilkapazität</div>
                        <div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:10px;line-height:1.5;">Ein Expansionsventil wird nicht nach der kW-Zahl der Anlage gewählt, sondern nach der Kapazität der Düse bei den tatsächlichen Bedingungen. Trage die Nennkapazität aus dem Datenblatt ein, dann rechnet das Programm sie auf deinen Betriebspunkt um.</div>
                        <div class="survey-grid">
                            <div class="form-group"><label>Δp Flüssigkeitsleitung <small>(bar)</small></label><input type="text" inputmode="decimal" class="exv-in" data-feld="dpLeitung" value="${e.dpLeitung ?? ''}" placeholder="0"></div>
                            <div class="form-group"><label>Δp Verteiler / Düsenstock <small>(bar)</small></label><input type="text" inputmode="decimal" class="exv-in" data-feld="dpVerteiler" value="${e.dpVerteiler ?? ''}" placeholder="0"></div>
                            <div class="form-group"><label>Nennkapazität aus dem Datenblatt <small>(kW)</small></label><input type="text" inputmode="decimal" class="exv-in" data-feld="nennkapazitaet" value="${e.nennkapazitaet ?? ''}" placeholder="–"></div>
                        </div>
                        <table class="kl-ergebnis"><tbody>
                            <tr><td>Druckdifferenz gesamt</td><td class="kl-w">${fmtDruck(r.dpGesamt, dEinheitK, true)}</td></tr>
                            <tr><td>davon am Ventil verfügbar</td><td class="kl-w">${fmtDruck(r.dpVentil, dEinheitK, true)}</td></tr>
                            <tr><td>Massenstrom</td><td class="kl-w">${r.mDotKgH.toFixed(1).replace('.', ',')} kg/h</td></tr>
                            <tr><td>Umrechnung Nenn → Betrieb</td><td class="kl-w">Faktor ${r.faktor != null ? r.faktor.toFixed(3).replace('.', ',') : '–'}</td></tr>
                            <tr class="kl-total"><td>Gesuchte Nennkapazität<br><small>bei ${r.referenz.tVerdampfung} °C / ${r.referenz.tVerfluessigung} °C, ${r.referenz.unterkuehlung} K Unterkühlung</small></td><td class="kl-w">${r.gesuchteNennkapazitaetKW != null ? r.gesuchteNennkapazitaetKW.toFixed(2).replace('.', ',') + ' kW' : '–'}</td></tr>
                            ${r.kapazitaetBetriebKW != null ? `<tr class="kl-sum"><td>Dein Ventil leistet im Betrieb</td><td class="kl-w">${r.kapazitaetBetriebKW.toFixed(2).replace('.', ',')} kW</td></tr>` : ''}
                        </tbody></table>
                        ${r.bewertung ? `<div class="kl-hinweis kl-${r.bewertung.art === 'ok' ? 'info' : r.bewertung.art}">${r.bewertung.art === 'ok' ? '✓' : r.bewertung.art === 'fehler' ? '✕' : '⚠'} ${escapeHtml(r.bewertung.text)}</div>` : ''}
                        ${r.hinweise.map(h => `<div class="kl-hinweis kl-${h.art}">${h.art === 'pruefen' ? '🔴' : '⚠'} ${escapeHtml(h.text)}</div>`).join('')}
                    </div>`;
                })()}
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

            // Verdichterkombinationen fuer die groesste Sauggruppe
            const groesste = Object.entries(gruppen).map(([name, mit]) => ({
                name, kw: mit.reduce((sm, e) => sm + e.ergebnis.auslegung, 0) / 1000 * (gz[name] != null ? Number(gz[name]) : 1)
            })).sort((x, y) => y.kw - x.kw)[0];
            let kombiKarte = '';
            if (groesste && groesste.kw > 0) {
                const vk = kaelteVerdichterKombinationen(groesste.kw);
                kombiKarte = `
                    <div class="form-card">
                        <div class="form-card-title">Verdichterkombinationen – Gruppe ${escapeHtml(groesste.name)} (${groesste.kw.toFixed(2).replace('.', ',')} kW)</div>
                        <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:10px;">Verglichen wird die Stufigkeit, nicht ein konkretes Fabrikat. Ziel inkl. 10 % Reserve: ${vk.ziel.toFixed(2).replace('.', ',')} kW.</div>
                        <div class="table-container"><table>
                            <thead><tr><th>Aufbau</th><th>kleinste Stufe</th><th>Regelbereich</th><th>Auslastung</th><th>Reserve</th></tr></thead>
                            <tbody>${vk.varianten.slice(0, 6).map((v, i) => `
                                <tr${i === 0 ? ' style="background:var(--accent-light);"' : ''}>
                                    <td>${i === 0 ? '<strong>★ ' + escapeHtml(v.beschreibung) + '</strong>' : escapeHtml(v.beschreibung)}</td>
                                    <td class="kl-w">${v.minStufe.toFixed(2).replace('.', ',')} kW</td>
                                    <td class="kl-w">${v.regelbereich.toFixed(0)} %</td>
                                    <td class="kl-w">${v.auslastung.toFixed(0)} %</td>
                                    <td class="kl-w">${v.reserveKW.toFixed(2).replace('.', ',')} kW</td>
                                </tr>`).join('')}</tbody>
                        </table></div>
                        ${(vk.empfehlung.bewertung || []).map(b => `<div class="kl-hinweis kl-${b.art}">${b.art === 'fehler' ? '✕' : b.art === 'warnung' ? '⚠' : 'ℹ'} ${escapeHtml(b.text)}</div>`).join('')}
                        <div class="kl-hinweis kl-pruefen">🔴 Die Bewertung betrifft nur Stufigkeit und Reserve. Ob ein Verdichter im gewählten Betriebspunkt zugelassen ist, steht ausschließlich im Herstellerdatenblatt.</div>
                    </div>`;
            }

            return `
                <div class="kl-hinweis kl-pruefen">🔴 Der Gleichzeitigkeitsfaktor steht bewusst auf 1,00 (volle Summe). Einen kleineren Wert darf nur setzen, wer das Lastprofil der Anlage kennt – ein geschätzter Faktor unterdimensioniert die Anlage. Diese App schlägt hier absichtlich keinen Wert vor.</div>
                ${bloecke}
                ${kombiKarte}`;
        }

        // ---- Technische Prüfung: sammelt alles Offene an einer Stelle.
        function renderKaelteTabPruefung(project) {
            const A = kaelteAuslegungsdaten(project);
            const a = kaelteAuslegung(project);

            // Gruppierte Uebersicht (Punkt 42): jede Gruppe bekommt ihren
            // eigenen, ECHT geprueften Status statt einer allgemeinen Liste.
            // "OK" heisst hier: tatsaechlich ohne offenes 🔴 in dieser Gruppe -
            // nicht nur "irgendetwas wurde eingetragen".
            const gruppen = [];
            const ikon = { ok: '✓', warnung: '⚠', fehler: '✕', pruefen: '🔴' };

            // --- Kältelast ---
            const kaeltelastZeilen = [];
            if (a.anzahlGesamt === 0) kaeltelastZeilen.push({ art: 'fehler', text: 'Keine Kühlstelle erfasst.' });
            else {
                kaeltelastZeilen.push({ art: a.anzahlRechenbar === a.anzahlGesamt ? 'ok' : 'fehler',
                    text: `${a.anzahlRechenbar} von ${a.anzahlGesamt} Kühlstelle(n) berechenbar.` });
                a.ergebnisse.forEach(e => (e.meldungen || []).forEach(m => {
                    if (m.art === 'fehler') kaeltelastZeilen.push({ art: 'fehler', text: `${e.ks.bezeichnung}: ${m.text}` });
                }));
            }
            gruppen.push({ titel: 'Kältelast', zeilen: kaeltelastZeilen });

            // --- Kältemittel ---
            const kmZeilen = [{ art: 'ok', text: A.kaeltemittel }];
            if (KAELTEMITTEL[A.kaeltemittel] && KAELTEMITTEL[A.kaeltemittel].blend) {
                kmZeilen.push({ art: 'pruefen', text: 'Zeotropes Gemisch – Taupunkt für Überhitzung, Blasenpunkt für Unterkühlung werden intern unterschieden (siehe Kreisprozess).' });
            }
            gruppen.push({ titel: 'Kältemittel', zeilen: kmZeilen });

            // --- Rohrleitungen + Öltransport: ECHTE Pruefung je Leitung,
            // nicht nur "ist eine Laenge eingetragen". Fasst genau die Logik,
            // die auch die Weiter-Ampel verwendet.
            const rohrZeilen = [], oelZeilen = [];
            a.ergebnisse.forEach(e => {
                if (!e.ergebnis.moeglich) return;
                const tv = e.werte.verdampfungstemperatur.wert;
                let kp2;
                try {
                    kp2 = (A.kaeltemittel === 'R744' && A.tVerfluessigung >= 26 && typeof kaelteCO2Kreisprozess === 'function')
                        ? kaelteCO2Kreisprozess({ tVerdampfung: tv, tGaskuehler: A.tVerfluessigung, kaelteleistungW: e.ergebnis.auslegung })
                        : kaelteKreisprozess({ kaeltemittel: A.kaeltemittel, tVerdampfung: tv, tVerfluessigung: A.tVerfluessigung,
                            ueberhitzung: A.ueberhitzung, unterkuehlung: A.unterkuehlung, kaelteleistungW: e.ergebnis.auslegung });
                } catch (err) { kp2 = null; }
                if (!kp2 || !kp2.moeglich) return;
                ROHR_ARTEN.forEach(art => {
                    const g = (e.ks.rohr || {})[art.key] || {};
                    if (!Number(g.laenge)) return;
                    const geo = { laenge: Number(g.laenge), hoehenunterschied: Number(g.hoehenunterschied) || 0,
                        formstuecke: Object.fromEntries(ROHR_FORMSTUECKE.map(([k]) => [k, Number(g[k]) || 0])) };
                    try {
                        const aus = kaelteRohrAuswahl(art.key, kp2, geo);
                        const z = aus.varianten.find(v => v.rohr.bez === g.gewaehlt) || aus.empfehlung;
                        const label = `${e.ks.bezeichnung} – ${art.label}`;
                        if (!z) rohrZeilen.push({ art: 'fehler', text: `${label}: keine Dimension erfüllt die Kriterien.` });
                        else if (!z.ok) {
                            const fehlerTexte = z.bewertung.filter(b => b.art === 'fehler').map(b => b.text);
                            rohrZeilen.push({ art: 'fehler', text: `${label} (${z.rohr.bez}): ${fehlerTexte[0] || 'Kriterium nicht erfüllt'}` });
                        } else rohrZeilen.push({ art: 'ok', text: `${label}: ${z.rohr.bez}` });
                        // Oeltransport separat herausziehen (nur Gasleitungen)
                        if (art.key !== 'fluessig' && z && z.oel) {
                            const knapp = z.bewertung.find(b => /Mindestgeschwindigkeit|Teillast/.test(b.text));
                            if (knapp) oelZeilen.push({ art: knapp.art, text: `${label}: ${knapp.text}` });
                            else oelZeilen.push({ art: 'ok', text: `${label}: Öltransport bei Volllast und 50 % Teillast gesichert.` });
                        }
                    } catch (err) { /* optional */ }
                });
            });
            if (!rohrZeilen.length) rohrZeilen.push({ art: 'warnung', text: 'Noch keine Rohrleitung dimensioniert.' });
            if (!oelZeilen.length) oelZeilen.push({ art: 'warnung', text: 'Noch keine Saug- oder Druckleitung zum Prüfen vorhanden.' });
            gruppen.push({ titel: 'Rohrleitungen', zeilen: rohrZeilen });
            gruppen.push({ titel: 'Öltransport', zeilen: oelZeilen });

            // --- Komponenten: Luecken gegen das Anforderungsprofil der
            // Anlagenart, nicht nur "ist ueberhaupt etwas eingetragen".
            const komp = project.kaelte.komponenten || [];
            const kompZeilen = [];
            if (a.anzahlRechenbar && typeof kaelteKomponentenBedarf === 'function') {
                try {
                    const bedarf = kaelteKomponentenBedarf(project);
                    if (bedarf.moeglich) {
                        const vorhanden = komp.map(c => String(c.typ || '').toLowerCase());
                        bedarf.slots.forEach(sl => {
                            const da = vorhanden.some(v => v === sl.typ.toLowerCase() || v.includes(sl.typ.toLowerCase()) || sl.typ.toLowerCase().includes(v));
                            kompZeilen.push({ art: da ? 'ok' : 'fehler', text: da ? sl.typ : `${sl.typ} fehlt` });
                        });
                    }
                } catch (err) { /* optional */ }
            }
            komp.forEach(k => {
                if (!k.quelle && !k.artikelnummer) kompZeilen.push({ art: 'warnung', text: `${k.typ || k.modell}: Herstellerleistung/Quelle nicht dokumentiert – vor Bestellung prüfen.` });
            });
            if (!kompZeilen.length) kompZeilen.push({ art: 'warnung', text: 'Noch keine Komponenten eingetragen.' });
            gruppen.push({ titel: 'Komponenten', zeilen: kompZeilen });

            // --- Füllmenge ---
            const mm = kaelteMaterialListe(project);
            const kmPos = mm.pos.find(x => x.schluessel === 'kaeltemittel');
            const fuellZeilen = [];
            if (!kmPos || !(kmPos.menge > 0)) fuellZeilen.push({ art: 'pruefen', text: kmPos ? kmPos.beschreibung : 'Noch keine Leitungen für die Füllmengenberechnung.' });
            else fuellZeilen.push({ art: 'ok', text: `${kmPos.menge} kg ${A.kaeltemittel} – ${kmPos.beschreibung}` });
            gruppen.push({ titel: 'Füllmenge', zeilen: fuellZeilen });

            // --- Angebot: Materialliste tatsaechlich vollstaendig genug? ---
            const angebotZeilen = [];
            const ohnePreis = mm.pos.filter(p => p.menge > 0 && p.vkPreis == null).length;
            if (!mm.pos.length) angebotZeilen.push({ art: 'fehler', text: 'Materialliste ist leer.' });
            else if (ohnePreis) angebotZeilen.push({ art: 'warnung', text: `Materialliste unvollständig – ${ohnePreis} Position(en) ohne Verkaufspreis.` });
            else angebotZeilen.push({ art: 'ok', text: `Materialliste vollständig – ${mm.pos.length} Positionen mit Preis.` });
            gruppen.push({ titel: 'Angebot', zeilen: angebotZeilen });

            // Richtwert-Schaetzungen weiterhin vollstaendig auflisten - nichts verstecken.
            const schaetzungen = [];
            a.ergebnisse.forEach(e => Object.entries(e.werte).forEach(([k, w]) => {
                if (w.status === 'schaetzung') schaetzungen.push(`${e.ks.bezeichnung}: ${k} = ${w.wert} (${w.herkunft})`);
            }));

            // Reihenfolge nach Wichtigkeit statt nach Einfuegereihenfolge
            // (Punkt 40): 🔴 kritisch/pruefen und ✕ zuerst, dann ⚠ Warnung,
            // zuletzt ✓ OK - wer die Seite ueberfliegt, sieht das Wichtigste
            // zuerst statt es zwischen erledigten Punkten suchen zu muessen.
            const RANG = { fehler: 0, pruefen: 1, warnung: 2, ok: 3 };
            gruppen.forEach(g => { g.zeilen = [...g.zeilen].sort((a, b) => (RANG[a.art] ?? 9) - (RANG[b.art] ?? 9)); });

            return `
                <div class="form-card comp-dashboard">
                    <div class="form-card-title">Compliance</div>
                    ${(() => {
                        if (typeof kaelteComplianceAuswerten !== 'function') return '';
                        const c = kaelteComplianceAuswerten(project);
                        const st = COMPLIANCE_STATUS[c.overall_status] || { icon: 'ℹ', label: c.overall_status };
                        const reihen = ['PASS', 'PASS_WITH_WARNINGS', 'WARNING', 'FAIL', 'DATA_MISSING', 'NOT_EVALUABLE',
                            'SOURCE_MISSING', 'MANUFACTURER_CHECK_REQUIRED', 'EXPERT_REVIEW_REQUIRED', 'NOT_APPLICABLE'];
                        return `
                            <div class="comp-gesamt">${st.icon} Gesamtstatus: <strong>${escapeHtml(st.label)}</strong></div>
                            ${c.legal_status !== 'aktuell' ? `<div class="comp-rechtsstand comp-rechtsstand-${c.legal_status}">
                                ${c.legal_status === 'geaendert' ? '📅' : 'ℹ'} <strong>${c.legal_status === 'geaendert' ? 'Rechtsstand geändert' : 'Rechtsstand unbekannt'}:</strong> ${escapeHtml(c.legal_status_note || '')}
                            </div>` : `<div style="font-size:10.5px;color:var(--text-muted);margin-bottom:10px;">Regelwerk-Version ${escapeHtml(c.current_rule_set_version)} · unverändert seit Projekterstellung</div>`}
                            <div class="comp-zaehler">
                                ${reihen.filter(s => c.counts[s]).map(s => `<span>${(COMPLIANCE_STATUS[s] || {}).icon || ''} ${c.counts[s]} ${escapeHtml((COMPLIANCE_STATUS[s] || {}).label || s)}</span>`).join('')}
                            </div>
                            <div class="comp-regeln">
                                ${c.rules.map(r => `
                                    <div class="comp-karte comp-${r.status.toLowerCase()}">
                                        <div class="comp-karte-kopf">
                                            <span class="comp-karte-ikon">${(COMPLIANCE_STATUS[r.status] || {}).icon || ''}</span>
                                            <span class="comp-karte-titel">${escapeHtml(r.title)}</span>
                                            <span class="comp-karte-id">${escapeHtml(r.rule_id)}</span>
                                        </div>
                                        <div class="comp-karte-text">${escapeHtml(r.reason || '')}</div>
                                        <div class="comp-karte-quelle">${escapeHtml(r.source_name || '')}${r.article ? ', ' + escapeHtml(r.article) : ''} · ${r.verification_status === 'VERIFIED' ? 'verifiziert' : 'nicht verifiziert (Platzhalter)'}</div>
                                    </div>`).join('')}
                            </div>
                            <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">${escapeHtml(c.note)}</div>`;
                    })()}
                </div>
                <div class="form-card">
                    <div class="form-card-title">Technische Prüfung</div>
                    ${gruppen.map(g => `
                        <div class="pruef-gruppe">
                            <div class="pruef-gruppe-titel">${escapeHtml(g.titel.toUpperCase())}</div>
                            ${g.zeilen.map(p => `<div class="kl-hinweis kl-${p.art === 'ok' ? 'info' : p.art}" style="margin-top:3px;">${ikon[p.art]} ${escapeHtml(p.text)}</div>`).join('')}
                        </div>`).join('')}
                </div>
                <div class="form-card">
                    <div class="form-card-title">Verwendete Richtwert-Schätzungen (${schaetzungen.length})</div>
                    ${schaetzungen.length ? `<ul style="font-size:12px;line-height:1.6;margin:0;padding-left:18px;">${schaetzungen.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : '<div class="empty-note" style="padding:10px;">Keine – alle Werte sind eingegeben oder berechnet.</div>'}
                </div>
                ${(() => {
                    // F-Gase-Pflichten aus der berechneten Fuellmenge
                    if (typeof kaelteFGase !== 'function') return '';
                    const menge = kmPos ? Number(kmPos.menge) || 0 : 0;
                    if (!menge) return `<div class="form-card"><div class="form-card-title">F-Gase-Pflichten</div>
                        <div class="empty-note" style="padding:12px;">Erst die Füllmenge berechnen – dann steht hier, ob und wie oft die Anlage auf Dichtheit zu prüfen ist.</div></div>`;
                    const fg = project.kaelte.fgase || {};
                    const r = kaelteFGase(A.kaeltemittel, menge, { hermetisch: !!fg.hermetisch, leckageErkennung: !!fg.les, wohngebaeude: !!fg.wohn });
                    if (!r.moeglich) return `<div class="form-card"><div class="kl-hinweis kl-warnung">⚠ ${escapeHtml(r.hinweis)}</div></div>`;
                    return `<div class="form-card">
                        <div class="form-card-title">F-Gase-Pflichten nach (EU) 2024/573</div>
                        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px;">
                            <label class="ae-check"><input type="checkbox" class="fg-in" data-feld="hermetisch" ${fg.hermetisch ? 'checked' : ''}> hermetisch geschlossen</label>
                            <label class="ae-check"><input type="checkbox" class="fg-in" data-feld="les" ${fg.les ? 'checked' : ''}> Leckage-Erkennungssystem</label>
                            <label class="ae-check"><input type="checkbox" class="fg-in" data-feld="wohn" ${fg.wohn ? 'checked' : ''}> in einem Wohngebäude</label>
                        </div>
                        <table class="kl-ergebnis"><tbody>
                            <tr><td>Kältemittel und Füllmenge</td><td class="kl-w">${escapeHtml(A.kaeltemittel)} · ${menge.toFixed(1).replace('.', ',')} kg</td></tr>
                            <tr><td>GWP</td><td class="kl-w">${r.gwp}</td></tr>
                            <tr class="kl-sum"><td>CO₂-Äquivalent</td><td class="kl-w">${r.co2e.toFixed(1).replace('.', ',')} t</td></tr>
                            ${r.intervallMonate ? `<tr class="kl-total"><td>Dichtheitskontrolle</td><td class="kl-w">alle ${r.intervallMonate} Monate</td></tr>` : ''}
                        </tbody></table>
                        <div class="kl-hinweis ${r.pflichtig ? 'kl-warnung' : 'kl-info'}">${r.pflichtig ? '⚠' : 'ℹ'} ${escapeHtml(r.hinweis)}</div>
                        ${r.pflichten.length ? `<ul style="font-size:12px;line-height:1.6;margin:8px 0 0;padding-left:18px;">${r.pflichten.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}
                        <div class="kl-hinweis kl-pruefen">🔴 Maßgebend für den GWP-Wert ist Anhang I der Verordnung. Die hier hinterlegten Werte dienen der Vorabschätzung und sind vor einer verbindlichen Aussage dagegen zu prüfen.</div>
                    </div>`;
                })()}
                ${(() => {
                    if (typeof kaeltePreisPruefliste !== 'function') return '';
                    const liste = kaeltePreisPruefliste(window.__kaeltePreise || {});
                    if (!liste.length) return '';
                    return `<div class="form-card">
                        <div class="form-card-title">Preise prüfen (${liste.length})</div>
                        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;line-height:1.5;">Diese Katalogartikel haben keinen Preis oder einer, der älter als ein halbes Jahr ist. Preise werden bewusst nicht automatisch abgerufen – ein Klick führt zur Artikelseite, den Preis trägst du selbst ein.</div>
                        ${liste.slice(0, 8).map(x => {
                            const lk = kaeltePreisLink(x.artikel);
                            return `<div class="kat-zeile">
                                <div><strong>${escapeHtml(String(x.artikel.name || '').slice(0, 60))}</strong>
                                <div class="kat-detail">${x.stand.ekNetto == null ? 'kein Preis hinterlegt' : `${formatCurrency(x.stand.ekNetto)} · <span class="preis-alt">${Math.floor(x.stand.tage / 30)} Monate alt</span>`}</div></div>
                                <div style="white-space:nowrap;">
                                    ${lk ? `<a class="btn btn-sm btn-outline" href="${escapeHtml(lk.url)}" target="_blank" rel="noopener">↗</a>` : ''}
                                    <button class="btn btn-sm btn-primary" onclick="app.openPreisModal(${idJS(project.id)}, ${idJS(x.artikel.id)})">Preis</button>
                                </div></div>`;
                        }).join('')}
                        ${liste.length > 8 ? `<div style="font-size:11px;color:var(--text-muted);padding-top:8px;">+ ${liste.length - 8} weitere</div>` : ''}
                    </div>`;
                })()}
                ${renderKaelteNormen(project)}
                ${renderKaelteVarianten(project)}
                <div class="form-card">
                    <div class="form-card-title">Technischer Auslegungsbogen</div>
                    <div style="font-size:12.5px;line-height:1.5;margin-bottom:10px;">Enthält alle Berechnungen mit Rechenweg, die verwendeten Richtwert-Schätzungen, Warnungen, Komponenten mit Quelle, Rohrleitungen mit Strömung und Druckverlust, Füllmenge und die Datenquellen.</div>
                    <button class="btn btn-primary" onclick="app.oeffneAuslegungsbogen(${idJS(project.id)})">📄 Auslegungsbogen ansehen</button>
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
                // Echte Pruefung statt Pauschal-OK: fuer jede eingetragene Leitung
                // nachrechnen, ob die gewaehlte bzw. empfohlene Dimension
                // tatsaechlich ohne Fehler dasteht (Oeltransport, Druckverlust,
                // Unterkuehlungsreserve/Flashgas). Ein "passt" darf nicht
                // erscheinen, wenn dort noch ein 🔴 steht.
                const A2 = kaelteAuslegungsdaten(project);
                let fehlerhaft = 0, geprueft = 0;
                mitRohr.forEach(e => {
                    const tv = e.werte.verdampfungstemperatur.wert;
                    let kp2;
                    try {
                        kp2 = (A2.kaeltemittel === 'R744' && A2.tVerfluessigung >= 26 && typeof kaelteCO2Kreisprozess === 'function')
                            ? kaelteCO2Kreisprozess({ tVerdampfung: tv, tGaskuehler: A2.tVerfluessigung, kaelteleistungW: e.ergebnis.auslegung })
                            : kaelteKreisprozess({ kaeltemittel: A2.kaeltemittel, tVerdampfung: tv, tVerfluessigung: A2.tVerfluessigung,
                                ueberhitzung: A2.ueberhitzung, unterkuehlung: A2.unterkuehlung, kaelteleistungW: e.ergebnis.auslegung });
                    } catch (err) { kp2 = null; }
                    if (!kp2 || !kp2.moeglich) return;
                    ROHR_ARTEN.forEach(art => {
                        const g = (e.ks.rohr || {})[art.key] || {};
                        if (!Number(g.laenge)) return;
                        geprueft++;
                        const geo = { laenge: Number(g.laenge), hoehenunterschied: Number(g.hoehenunterschied) || 0,
                            formstuecke: Object.fromEntries(ROHR_FORMSTUECKE.map(([k]) => [k, Number(g[k]) || 0])) };
                        try {
                            const aus = kaelteRohrAuswahl(art.key, kp2, geo);
                            const z = aus.varianten.find(v => v.rohr.bez === g.gewaehlt) || aus.empfehlung;
                            if (!z || !z.ok) fehlerhaft++;
                        } catch (err) { /* Bewertung optional */ }
                    });
                });
                if (fehlerhaft > 0) return { status: 'fehler', text: `${fehlerhaft} von ${geprueft} dimensionierten Leitungen haben ein ungelöstes 🔴 (Öltransport, Druckverlust oder Unterkühlungsreserve). Das gilt technisch nicht als abgeschlossen – siehe die jeweilige Leitung.` };
                return { status: 'ok', text: `Rohrleitungen für ${mitRohr.length} Kühlstelle(n) dimensioniert, alle geprüften Kriterien erfüllt.` };
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
                    // Fehlende Artikelnummer bzw. fehlender Preis werden explizit
                    // benannt statt stillschweigend mit 0 weiterzurechnen (Punkt 26/27).
                    herkunft: ['aus Schritt Komponenten',
                        !k.artikelnummer ? '⚠ Artikelnummer fehlt' : '',
                        (k.ekPreis == null && o.ekPreis == null) ? '⚠ Einkaufspreis fehlt' : ''
                    ].filter(Boolean).join(' · '),
                    geaendert: o.menge != null
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

                    // KORREKTUR (2026-09): Ventile, Magnetventile, Filtertrockner,
                    // Schaugläser und Rückschlagventile wurden im Rohrleitungen-
                    // Schritt zwar für die äquivalente Länge/den Druckverlust
                    // gezählt, tauchten aber NICHT als Materialposition auf -
                    // sie fehlten dann in der Angebotssumme, obwohl der Techniker
                    // sie extra eingetragen hatte.
                    [['ventil', 'Ventile'], ['magnetventil', 'Magnetventile'], ['filtertrockner', 'Filtertrockner'],
                     ['schauglas', 'Schaugläser'], ['rueckschlagventil', 'Rückschlagventile']].forEach(([feld, label]) => {
                        const anz = Number(g[feld]) || 0;
                        if (anz) add(`${pre}_${feld}`, 'Formstück', `${label} ${dim}`, kurz, anz, 'Stk', 'aus der Rohrberechnung');
                    });

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
                // KORREKTUR (2026-09): Vorher wurde hier IMMER eine praezise
                // Zahl (z. B. "6,0 kg") als Fuellmenge angezeigt, auch wenn
                // Verdampfer-, Verfluessiger- oder Sammler-Innenvolumen
                // fehlten - der angezeigte Wert war dann nur die Summe der
                // Leitungsanteile, sah aber wie eine vollstaendige Gesamt-
                // fuellmenge aus. Das ist Scheinpraezision und wird jetzt so
                // NICHT mehr angezeigt: ohne alle Bauteilvolumina bleibt die
                // Menge in dieser Position auf 0 (fliesst dann auch nicht mit
                // einem falschen Wert ins Angebot), und der Text sagt
                // ausdruecklich "nicht vollstaendig bestimmbar" - die bekannten
                // Teilmengen stehen trotzdem in der Herkunftszeile, nichts wird
                // versteckt.
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
                        const bekannt = fm.teile.map(t => `${t.name} ${t.kg.toFixed(2).replace('.', ',')} kg`).join(' · ');
                        const fehlend = fm.offen.map(n => `${n}: Daten fehlen`).join(' · ');
                        fmHerkunft = [bekannt, fehlend].filter(Boolean).join(' · ');
                        if (fm.sicher) {
                            fmMenge = Math.ceil(fm.gesamt * 10) / 10;
                            fmText = 'aus Leitungs- und Bauteilvolumen berechnet';
                        } else {
                            fmMenge = 0;   // bewusst 0, keine Scheinpraezision
                            fmText = `Gesamtfüllmenge nicht vollständig bestimmbar – Innenvolumen fehlt bei: ${fm.offen.join(', ')}. Bekannte Anteile: ${bekannt || '–'}.`;
                        }
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
                                kuehlstellen: [],
                                // Wird EINMALIG hier gesetzt und danach nie wieder
                                // veraendert (Phase B: historischer Rechtsstand).
                                // Nicht die Auswertungsergebnisse selbst - die
                                // werden weiterhin nie gespeichert, immer live
                                // mit der jeweils aktuellen Version berechnet.
                                complianceRuleSetVersionAtCreation: (typeof COMPLIANCE_RULE_SET_VERSION !== 'undefined') ? COMPLIANCE_RULE_SET_VERSION : null
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
                        // Duplikat-Pruefung: dieselbe Komponente (Typ + Hersteller +
                        // Modell + Art.-Nr.) nicht versehentlich zweimal anlegen.
                        // Die Entscheidung bleibt beim Benutzer (Punkt 25) - es
                        // wird nichts automatisch verhindert oder zusammengefuehrt.
                        if (index == null) {
                            const schluessel = x => [x.typ, x.hersteller, x.modell, x.artikelnummer].map(v => String(v || '').toLowerCase().trim()).join('|');
                            const dupIdx = liste.findIndex(x => schluessel(x) === schluessel(neu));
                            if (dupIdx >= 0) {
                                const weiter = await showConfirm(`"${neu.modell || neu.typ}" ist bereits als Komponente vorhanden (${liste[dupIdx].menge || 1} ${liste[dupIdx].einheit || 'Stk'}). Trotzdem als weitere Position hinzufügen?`);
                                if (!weiter) return;
                            }
                        }
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

            // Fenster synchron im Klick oeffnen, sonst blockiert der Browser es
            // nach dem await beim PDF-Bauen.
            async openNormModal(projectId, index = null) {
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                const liste = project.kaelte.normen || (project.kaelte.normen = []);
                const n = (index != null && liste[index]) ? liste[index] : {};
                // Vorschlagsliste: nur Bezeichnungen, KEINE Inhalte und keine
                // Fassungen - die traegt der Techniker aus der Quelle ein.
                const gaengig = ['EN 378', 'EN 14276', 'Druckgeräterichtlinie 2014/68/EU', 'F-Gase-Verordnung (EU) 517/2014',
                    'ÖNORM', 'VDMA 24243', 'Herstellerdokumentation', 'Betriebsanleitung Verdichter'];
                showModal(index != null ? 'Regelwerk bearbeiten' : 'Regelwerk hinzufügen', `
                    <div class="form-group"><label>Bezeichnung *</label>
                        <input list="normListe" id="noBez" value="${escapeHtml(n.bezeichnung || '')}" placeholder="z. B. EN 378">
                        <datalist id="normListe">${gaengig.map(x => `<option value="${escapeHtml(x)}">`).join('')}</datalist>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Fassung / Ausgabe</label><input type="text" id="noFassung" value="${escapeHtml(n.fassung || '')}" placeholder="z. B. 2016+A1:2020"></div>
                        <div class="form-group"><label>Zuletzt geprüft am</label><input type="date" id="noDatum" value="${escapeHtml(n.geprueftAm || '')}"></div>
                    </div>
                    <div class="form-group"><label>Betrifft</label><input type="text" id="noBetrifft" value="${escapeHtml(n.betrifft || '')}" placeholder="z. B. Aufstellung, Füllmengengrenze, Sicherheitseinrichtungen"></div>
                    <div class="form-group"><label>Quelle</label><input type="text" id="noQuelle" value="${escapeHtml(n.quelle || '')}" placeholder="Bezugsstelle oder Link"></div>
                    <div class="form-group"><label>Notiz</label><textarea id="noNotiz" rows="2">${escapeHtml(n.notiz || '')}</textarea></div>
                `, async (overlay) => {
                    const bez = overlay.querySelector('#noBez').value.trim();
                    if (!bez) { showToast('Bezeichnung ist erforderlich.', 'error'); return; }
                    const eintrag = { bezeichnung: bez,
                        fassung: overlay.querySelector('#noFassung').value.trim(),
                        geprueftAm: overlay.querySelector('#noDatum').value,
                        betrifft: overlay.querySelector('#noBetrifft').value.trim(),
                        quelle: overlay.querySelector('#noQuelle').value.trim(),
                        notiz: overlay.querySelector('#noNotiz').value.trim() };
                    if (index != null) liste[index] = eintrag; else liste.push(eintrag);
                    await db.put('projects', project);
                    overlay.remove();
                    showToast('Regelwerk gespeichert.', 'success');
                    renderKaelteDetail(projectId);
                });
            },

            async deleteNorm(projectId, index) {
                if (!await showConfirm('Diesen Eintrag wirklich löschen?')) return;
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                (project.kaelte.normen || []).splice(index, 1);
                await db.put('projects', project);
                renderKaelteDetail(projectId);
            },

            async kaelteVarianteSpeichern(projectId) {
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                const nr = (project.kaelte.varianten || []).length + 1;
                showModal('Variante sichern', `
                    <div class="form-group"><label>Name *</label><input type="text" id="vaName" value="Variante ${nr}"></div>
                    <div class="form-group"><label>Was ist an dieser Variante anders?</label><textarea id="vaNotiz" rows="2" placeholder="z. B. 100 mm Paneel statt 120 mm"></textarea></div>
                    <div style="font-size:11.5px;color:var(--text-muted);">Gesichert wird der komplette Stand der Kälteplanung: Kühlstellen, Auslegungsbedingungen, Rohrleitungen, Komponenten, Volumen und Materialanpassungen.</div>
                `, async (overlay) => {
                    const name = overlay.querySelector('#vaName').value.trim();
                    if (!name) { showToast('Name ist erforderlich.', 'error'); return; }
                    // Varianten duerfen sich nicht gegenseitig enthalten, sonst
                    // waechst der Datensatz bei jeder Sicherung exponentiell.
                    const stand = JSON.parse(JSON.stringify(project.kaelte));
                    delete stand.varianten;
                    project.kaelte.varianten = project.kaelte.varianten || [];
                    project.kaelte.varianten.push({ name, notiz: overlay.querySelector('#vaNotiz').value.trim(),
                        datum: new Date().toISOString(), stand });
                    await db.put('projects', project);
                    overlay.remove();
                    showToast('Variante gesichert.', 'success');
                    renderKaelteDetail(projectId);
                });
            },

            async kaelteVarianteLaden(projectId, index) {
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                const v = (project.kaelte.varianten || [])[index];
                if (!v) return;
                if (!await showConfirm(`"${v.name}" zurückladen? Der aktuelle Stand wird dabei überschrieben – sichere ihn vorher, wenn du ihn behalten willst.`)) return;
                const varianten = project.kaelte.varianten;
                project.kaelte = JSON.parse(JSON.stringify(v.stand));
                project.kaelte.varianten = varianten;   // Variantenliste bleibt erhalten
                await db.put('projects', project);
                showToast(`"${v.name}" zurückgeladen.`, 'success');
                renderKaelteDetail(projectId);
            },

            async kaelteVarianteLoeschen(projectId, index) {
                if (!await showConfirm('Diese Variante wirklich löschen?')) return;
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                (project.kaelte.varianten || []).splice(index, 1);
                await db.put('projects', project);
                renderKaelteDetail(projectId);
            },

            oeffneAuslegungsbogen(projectId) {
                app.__bogenFenster = window.open('', '_blank');
                if (app.__bogenFenster) {
                    try { app.__bogenFenster.document.write('<title>Auslegungsbogen…</title><p style="font-family:sans-serif;padding:24px;color:#555;">Auslegungsbogen wird erstellt…</p>'); } catch (e) { /* egal */ }
                }
                app.exportAuslegungsbogen(projectId).catch(e => {
                    console.error('Auslegungsbogen fehlgeschlagen:', e);
                    if (app.__bogenFenster) { app.__bogenFenster.close(); app.__bogenFenster = null; }
                    showToast('Auslegungsbogen konnte nicht erstellt werden.', 'error');
                });
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

            // Katalogartikel als Komponente uebernehmen. Es werden nur Werte
            // uebernommen, die im Katalog wirklich stehen - fehlende Felder
            // bleiben leer statt mit Annahmen gefuellt zu werden.
            async openPreisModal(projectId, artikelId) {
                const a = KAELTE_KATALOG.find(x => x.id === artikelId);
                if (!a) return;
                const preise = await getSetting('kaeltePreise', {});
                const alt = (preise && preise[artikelId]) || {};
                const st = kaeltePreisStand(a, preise);
                const lk = kaeltePreisLink(a);
                const heute = new Date().toISOString().slice(0, 10);
                showModal(`Preis pflegen – ${escapeHtml(a.name || '')}`, `
                    <div class="kl-hinweis kl-info">Preise werden nicht automatisch abgerufen. Öffne die Artikelseite, lies den aktuellen Preis ab und trag ihn hier ein – so steht immer ein belegter Preis in der App, nie ein geschätzter.</div>
                    ${lk ? `<p style="margin:10px 0;"><a class="btn btn-outline" href="${escapeHtml(lk.url)}" target="_blank" rel="noopener">${escapeHtml(lk.text)} ↗</a></p>` : ''}
                    <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">
                        Bisher: ${st.ekNetto != null ? formatCurrency(st.ekNetto) + ' netto' : 'kein Preis'}${st.datum ? ` · Stand ${escapeHtml(st.datum)}` : ''} · Quelle: ${escapeHtml(st.herkunft)}
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Einkaufspreis netto (€) *</label><input type="text" inputmode="decimal" id="prEk" value="${alt.ekNetto ?? st.ekNetto ?? ''}"></div>
                        <div class="form-group"><label>Verkaufspreis netto (€)</label><input type="text" inputmode="decimal" id="prVk" value="${alt.vkNetto ?? a.vkNetto ?? ''}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Preis vom</label><input type="date" id="prDatum" value="${escapeHtml(alt.datum || heute)}"></div>
                        <div class="form-group"><label>Quelle</label><input type="text" id="prQuelle" value="${escapeHtml(alt.quelle || '')}" placeholder="Shop, Angebot, Preisliste"></div>
                    </div>
                `, async (overlay) => {
                    const zahl = id => { const v = overlay.querySelector(id).value.trim(); if (v === '') return null; const n = parseFloat(v.replace(',', '.')); return Number.isFinite(n) ? n : null; };
                    const ek = zahl('#prEk');
                    if (ek == null || ek <= 0) { showToast('Bitte einen gültigen Einkaufspreis eintragen.', 'error'); return; }
                    const gespeichert = await getSetting('kaeltePreise', {});
                    const neu = (gespeichert && typeof gespeichert === 'object') ? gespeichert : {};
                    neu[artikelId] = { ekNetto: ek, vkNetto: zahl('#prVk'),
                        datum: overlay.querySelector('#prDatum').value || heute,
                        quelle: overlay.querySelector('#prQuelle').value.trim() };
                    await setSetting('kaeltePreise', neu);
                    window.__kaeltePreise = neu;
                    overlay.remove();
                    showToast('Preis gespeichert.', 'success');
                    renderKaelteDetail(projectId);
                });
            },

            async katalogUebernehmen(projectId, artikelId, typ) {
                const project = await db.get('projects', projectId);
                if (!project || !project.kaelte) return;
                const a = KAELTE_KATALOG.find(x => x.id === artikelId);
                if (!a) { showToast('Artikel nicht gefunden.', 'error'); return; }
                project.kaelte.komponenten = project.kaelte.komponenten || [];
                project.kaelte.komponenten.push({
                    typ: typ || a.typ,
                    hersteller: a.hersteller || '',
                    modell: a.name || '',
                    artikelnummer: a.artikelnummer || '',
                    leistungKW: a.leistungKW != null ? a.leistungKW : null,
                    anschluss: a.anschluss || '',
                    menge: 1, einheit: 'Stk',
                    // Gepflegter Preis hat Vorrang vor dem Katalogpreis
                    ekPreis: (() => { const st = kaeltePreisStand(a, window.__kaeltePreise || {}); return st.ekNetto != null ? st.ekNetto : null; })(),
                    // Verkaufspreis nur uebernehmen, wenn er im Katalog steht
                    // (eigene Preisliste). Bei Haendlerartikeln bleibt er leer -
                    // dort ist nur der Einkauf bekannt.
                    vkPreis: a.vkNetto != null ? a.vkNetto : null,
                    volumenL: a.volumenL != null ? a.volumenL : null,
                    lieferant: a.haendler || '',
                    quelle: [a.quelle, a.datenstand ? 'Stand ' + a.datenstand : ''].filter(Boolean).join(' · '),
                    notiz: [a.temperaturbereich ? 'Temperaturbereich ' + a.temperaturbereich : '',
                            a.kaeltemittel ? 'Kältemittel ' + a.kaeltemittel : '',
                            a.abtauung ? 'Abtauung ' + a.abtauung : '',
                            a.merkmale || ''].filter(Boolean).join(' · ')
                });
                await db.put('projects', project);
                showToast(`${a.name || 'Artikel'} übernommen – Verkaufspreis noch eintragen.`, 'success');
                renderKaelteDetail(projectId);
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

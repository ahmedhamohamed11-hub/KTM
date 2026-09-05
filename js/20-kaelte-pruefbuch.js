
        // ============================================================
        // ====== PRÜFBUCH / ANLAGENBUCH (Phase E) =====================
        // ============================================================
        // WICHTIG - Selbsteinschränkung, nicht verstecken: Dieses Modul ist
        // eine STRUKTURIERTE GRUNDLAGE (Stammdaten + Prüfhistorie), KEIN
        // automatisch vollstaendiges, gesetzeskonformes Pruefbuch. Ob es den
        // Anforderungen der Kaelteanlagenverordnung oder anderer Vorschriften
        // an ein Pruefbuch genuegt, ist fachlich zu pruefen - das behauptet
        // dieses Modul an keiner Stelle.
        //
        // ARCHITEKTUR-ENTSCHEIDUNG (siehe Phase-A-Analyse): Der Sync arbeitet
        // pro Store mit FESTEN Spalten - ein neues Feld auf dem bestehenden
        // 'equipment'-Store ohne passende Supabase-Spalte wuerde bei jedem
        // Push automatisch wieder entfernt (Selbstheilungs-Mechanismus in
        // js/01-core-db-sync.js sucht "Could not find the 'x' column" und
        // loescht das Feld vor dem naechsten Versuch - siehe dortigen
        // Kommentar). Deshalb liegt das Pruefbuch NICHT im equipment-Store,
        // sondern in project.kaelte.pruefbuch - dort liegt in Supabase
        // ohnehin nur EINE JSONB-Spalte fuer das komplette 'kaelte'-Objekt,
        // beliebige Unterstruktur braucht keine Schemaanpassung.
        //
        // EINSCHRAENKUNG dieser Entscheidung, ehrlich benannt: das Pruefbuch
        // haengt damit an einem Kaelteanlagen-Auslegung-PROJEKT, nicht an
        // einem eigenstaendigen Anlagenregister wie der bestehende
        // 'equipment'-Store (der z. B. auch Anlagen ohne zugehoeriges
        // Auslegung-Projekt fuehren kann). Eine Verschmelzung beider waere
        // eine groessere Datenmodell-Entscheidung, die hier nicht getroffen
        // wird.
        //
        // "Pruefungen duerfen historisch nicht ueberschrieben werden":
        // umgesetzt als ADD-ONLY-Historie (kaeltePruefbuchEintragHinzufuegen
        // haengt nur an, es gibt bewusst KEINE Funktion zum Bearbeiten eines
        // bestehenden Eintrags). Eine Korrektur erfolgt durch einen NEUEN
        // Eintrag, der den alten fachlich ersetzt - nicht durch Ueberschreiben.
        // Einschraenkung: das greift nur, solange ausschliesslich diese
        // Funktion verwendet wird: project.kaelte bleibt technisch ein
        // normales JS-Array, das theoretisch direkt manipuliert werden
        // koennte. Und wie bei jedem Feld in project.kaelte gilt das in
        // Phase A beschriebene Sync-Verhalten: bei ECHT gleichzeitiger
        // Offline-Bearbeitung desselben Projekts auf zwei Geraeten kann das
        // komplette kaelte-Objekt einer Seite verloren gehen (flaches Merge,
        // kein feldweises Zusammenfuehren) - das ist keine neue Schwaeche
        // dieses Moduls, sondern eine bereits bestehende Eigenschaft der
        // gesamten App, die hier lediglich nicht verschwiegen wird.

        // Stammdaten: verknuepft Felder, die schon anderswo berechnet werden
        // (Kaeltemittel, Fuellmenge, Anlagentyp), mit den zusaetzlichen
        // Feldern aus der Vorgabe, die es noch nicht gibt. Kaeltemittel und
        // Fuellmenge werden NICHT hier gespeichert - sie werden live von der
        // Kaelteauslegung uebernommen (keine zweite Datenquelle fuer
        // denselben Wert).
        function kaeltePruefbuchStamm(project) {
            const k = project.kaelte || {};
            const stamm = k.anlagenstamm || {};
            const A = kaelteAuslegungsdaten(project);
            const mm = (typeof kaelteMaterialListe === 'function') ? kaelteMaterialListe(project) : { pos: [] };
            const kmPos = mm.pos.find(p => p.schluessel === 'kaeltemittel');
            return {
                anlagenkennung: stamm.anlagenkennung || `ANL-${project.id}`,
                projektId: project.id, projektTitel: project.title || '',
                betreiber: stamm.betreiber || '', standort: k.standort || project.siteAddress || '',
                bundesland: stamm.bundesland || '',
                hersteller: stamm.hersteller || '', modell: stamm.modell || '',
                seriennummer: stamm.seriennummer || '', baujahr: stamm.baujahr || '',
                inbetriebnahme: stamm.inbetriebnahme || '',
                anlagentyp: (KAELTE_ANLAGENARTEN.find(a => a.key === (k.anlagenart || 'einzel')) || {}).label || k.anlagenart || '',
                // Live uebernommen, nicht redundant gespeichert:
                kaeltemittel: A.kaeltemittel || '',
                fuellmengeKg: kmPos ? Number(kmPos.menge) || null : null,
                fuellmengeQuelle: kmPos && kmPos.menge > 0 ? 'aus Kälteauslegung übernommen' : 'noch nicht berechnet'
            };
        }

        const BUNDESLAENDER_AT = ['Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich',
            'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg', 'Wien'];

        // Historie: NUR Anhaengen. Jeder Eintrag bekommt einen Zeitstempel und
        // eine laufende Nummer - beides wird beim Anhaengen fest vergeben und
        // danach nie mehr veraendert.
        function kaeltePruefbuchEintragHinzufuegen(project, eintrag) {
            project.kaelte.pruefbuch = project.kaelte.pruefbuch || { eintraege: [] };
            const liste = project.kaelte.pruefbuch.eintraege = project.kaelte.pruefbuch.eintraege || [];
            liste.push({
                nr: liste.length + 1,
                erfasstAm: new Date().toISOString(),
                datum: eintrag.datum || null,
                pruefart: eintrag.pruefart || '',
                pruefer: eintrag.pruefer || '',
                ergebnis: eintrag.ergebnis || '',
                maengel: eintrag.maengel || '',
                massnahmen: eintrag.massnahmen || '',
                behebungBis: eintrag.behebungBis || null,
                nachweis: eintrag.nachweis || ''     // Freitext-Referenz (Dokumentname/-nummer) -
                                                       // eine vollstaendige Evidence-Struktur ist Phase D, dort blockiert
            });
            return liste[liste.length - 1];
        }

        // Naechste Faelligkeit: NUR ausgeben, wenn sie aus einer tatsaechlich
        // verifizierten Regel folgt (aktuell: F-Gase). Fuer alles andere
        // (KAV § 22 usw.) ausdruecklich "nicht bestimmbar" statt zu raten -
        // dieselbe Regel wie beim Rest der Compliance-Engine.
        function kaeltePruefbuchNaechstePruefung(project) {
            const stamm = kaeltePruefbuchStamm(project);
            const eintraege = ((project.kaelte || {}).pruefbuch || {}).eintraege || [];
            const letzte = eintraege.filter(e => e.datum).sort((a, b) => new Date(b.datum) - new Date(a.datum))[0];
            const ergebnisse = [];

            if (typeof kaelteFGase === 'function' && stamm.fuellmengeKg) {
                const fg = project.kaelte.fgase || {};
                const r = kaelteFGase(stamm.kaeltemittel, stamm.fuellmengeKg, { hermetisch: !!fg.hermetisch, leckageErkennung: !!fg.les, wohngebaeude: !!fg.wohn });
                if (r.moeglich && r.pflichtig) {
                    let naechste = null;
                    if (letzte) { naechste = new Date(letzte.datum); naechste.setMonth(naechste.getMonth() + r.intervallMonate); }
                    ergebnisse.push({
                        quelle: 'F-Gase-Dichtheitskontrolle (RULE-FGAS-2024-001)',
                        intervallMonate: r.intervallMonate,
                        naechsteFaelligkeit: naechste ? naechste.toISOString().slice(0, 10) : null,
                        hinweis: letzte ? null : 'Noch keine Prüfung erfasst – Fälligkeit erst nach dem ersten Eintrag berechenbar.'
                    });
                }
            }
            ergebnisse.push({
                quelle: 'Kälteanlagenverordnung §22 (RULE-KAV-022)',
                intervallMonate: null, naechsteFaelligkeit: null,
                hinweis: 'Nicht bestimmbar – diese Regel ist noch nicht mit einer verifizierten Quelle hinterlegt (siehe Compliance-Bereich).'
            });
            return { letztePruefung: letzte ? letzte.datum : null, faelligkeiten: ergebnisse };
        }

        // ---- UI: Pruefbuch-Karte im Pruefung-Schritt ----
        function renderKaeltePruefbuch(project) {
            const stamm = kaeltePruefbuchStamm(project);
            const eintraege = ((project.kaelte || {}).pruefbuch || {}).eintraege || [];
            const faellig = kaeltePruefbuchNaechstePruefung(project);

            return `
                <div class="form-card">
                    <div class="form-card-title">Prüfbuch / Anlagenbuch</div>
                    <div class="kl-hinweis kl-pruefen">🔴 KTM erzeugt hier eine strukturierte Grundlage – Anlagenstammdaten und Prüfhistorie. Das ist keine automatische Bestätigung eines vollständigen, gesetzeskonformen Prüfbuchs; ob die Anforderungen der Kälteanlagenverordnung damit erfüllt sind, ist fachlich zu prüfen.</div>

                    <div class="pb-stamm-grid" data-projekt="${idJS(project.id)}">
                        <div class="form-group"><label>Anlagenkennung</label><input type="text" class="pb-in" data-feld="anlagenkennung" value="${escapeHtml(stamm.anlagenkennung)}"></div>
                        <div class="form-group"><label>Betreiber</label><input type="text" class="pb-in" data-feld="betreiber" value="${escapeHtml(stamm.betreiber)}"></div>
                        <div class="form-group"><label>Bundesland</label>
                            <select class="pb-in" data-feld="bundesland">
                                <option value="">– auswählen –</option>
                                ${BUNDESLAENDER_AT.map(b => `<option value="${b}" ${stamm.bundesland === b ? 'selected' : ''}>${b}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group"><label>Hersteller</label><input type="text" class="pb-in" data-feld="hersteller" value="${escapeHtml(stamm.hersteller)}"></div>
                        <div class="form-group"><label>Modell</label><input type="text" class="pb-in" data-feld="modell" value="${escapeHtml(stamm.modell)}"></div>
                        <div class="form-group"><label>Seriennummer</label><input type="text" class="pb-in" data-feld="seriennummer" value="${escapeHtml(stamm.seriennummer)}"></div>
                        <div class="form-group"><label>Baujahr</label><input type="text" class="pb-in" data-feld="baujahr" value="${escapeHtml(stamm.baujahr)}"></div>
                        <div class="form-group"><label>Inbetriebnahme</label><input type="date" class="pb-in" data-feld="inbetriebnahme" value="${escapeHtml(stamm.inbetriebnahme)}"></div>
                    </div>
                    <table class="kl-ergebnis" style="margin-top:10px;"><tbody>
                        <tr><td>Anlagentyp</td><td class="kl-w">${escapeHtml(stamm.anlagentyp)}</td></tr>
                        <tr><td>Kältemittel</td><td class="kl-w">${escapeHtml(stamm.kaeltemittel || '–')}</td></tr>
                        <tr><td>Füllmenge</td><td class="kl-w">${stamm.fuellmengeKg != null ? stamm.fuellmengeKg.toFixed(1).replace('.', ',') + ' kg' : '–'} <span style="font-weight:400;color:var(--text-muted);">(${escapeHtml(stamm.fuellmengeQuelle)})</span></td></tr>
                    </table>

                    <div class="pb-faellig">
                        ${faellig.faelligkeiten.map(f => `<div class="kl-hinweis ${f.naechsteFaelligkeit ? 'kl-info' : 'kl-pruefen'}" style="margin-top:6px;">
                            ${f.naechsteFaelligkeit ? '📅' : '🔴'} <strong>${escapeHtml(f.quelle)}</strong>: ${f.naechsteFaelligkeit ? 'nächste Fälligkeit ' + escapeHtml(f.naechsteFaelligkeit) : escapeHtml(f.hinweis)}
                        </div>`).join('')}
                    </div>

                    <div class="detail-section-head" style="margin-top:14px;">
                        <h4>Prüfhistorie (${eintraege.length})</h4>
                        <button class="btn btn-sm btn-primary" onclick="app.openPruefbuchEintragModal(${idJS(project.id)})">${icon('plus')} Prüfung erfassen</button>
                    </div>
                    ${eintraege.length ? `<div class="table-container"><table>
                        <thead><tr><th>Nr.</th><th>Datum</th><th>Art</th><th>Prüfer</th><th>Ergebnis</th><th>Mängel</th></tr></thead>
                        <tbody>${[...eintraege].reverse().map(e => `<tr>
                            <td>${e.nr}</td><td>${escapeHtml(e.datum || '–')}</td><td>${escapeHtml(e.pruefart || '–')}</td>
                            <td>${escapeHtml(e.pruefer || '–')}</td><td>${escapeHtml(e.ergebnis || '–')}</td><td>${escapeHtml(e.maengel || '–')}</td>
                        </tr>`).join('')}</tbody>
                    </table></div>
                    <div style="font-size:10.5px;color:var(--text-muted);margin-top:6px;">Einträge sind historisch – eine Korrektur erfolgt durch einen neuen Eintrag, nicht durch Bearbeiten eines bestehenden.</div>`
                    : '<div class="empty-note" style="padding:10px;">Noch keine Prüfung erfasst.</div>'}
                </div>`;
        }

        // ---- UI: Was-waere-wenn-Simulation im Pruefung-Schritt ----
        function renderKaelteWasWaereWenn(project) {
            const A = kaelteAuslegungsdaten(project);
            const sim = project.kaelte.wwwSim || {};
            const kaeltemittelListe = Object.keys(typeof KAELTEMITTEL_GWP !== 'undefined' ? KAELTEMITTEL_GWP : { [A.kaeltemittel]: 1 });

            let ergebnisHtml = '';
            if (sim.aktiv) {
                const r = kaelteComplianceSimulieren(project, sim.kaeltemittel, Number(sim.fuellmenge) || 0, { les: !!sim.les });
                ergebnisHtml = `
                    <div class="table-container" style="margin-top:10px;"><table>
                        <thead><tr><th>Regel</th><th>Original (${escapeHtml(r.original.kaeltemittel)}, ${r.original.fuellmengeKg.toFixed(1).replace('.', ',')} kg)</th><th>Simulation (${escapeHtml(r.simulation.kaeltemittel)}, ${r.simulation.fuellmengeKg.toFixed(1).replace('.', ',')} kg)</th></tr></thead>
                        <tbody>${r.geaendert.map(g => `<tr${g.aendertSich ? ' style="background:var(--accent-light);"' : ''}>
                            <td>${escapeHtml(g.title)}</td>
                            <td>${(COMPLIANCE_STATUS[g.von] || {}).icon || ''} ${escapeHtml((COMPLIANCE_STATUS[g.von] || {}).label || g.von)}</td>
                            <td>${(COMPLIANCE_STATUS[g.nach] || {}).icon || ''} <strong>${escapeHtml((COMPLIANCE_STATUS[g.nach] || {}).label || g.nach)}</strong>${g.aendertSich ? ' ← ändert sich' : ''}</td>
                        </tr>`).join('')}</tbody>
                    </table></div>
                    <div style="font-size:10.5px;color:var(--text-muted);margin-top:6px;">${escapeHtml(r.hinweis)}</div>`;
            }

            return `
                <div class="form-card">
                    <div class="form-card-title">Was-wäre-wenn</div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">Prüft, wie sich ein anderes Kältemittel oder eine andere Füllmenge auf die F-Gase-Pflichten auswirken würde – rein rechnerisch, deine Projektdaten bleiben unverändert.</div>
                    <div class="survey-grid">
                        <div class="form-group"><label>Kältemittel (Simulation)</label>
                            <select class="www-in" data-feld="kaeltemittel">${kaeltemittelListe.map(k => `<option value="${k}" ${sim.kaeltemittel === k ? 'selected' : ''}>${k}</option>`).join('')}</select>
                        </div>
                        <div class="form-group"><label>Füllmenge (Simulation, kg)</label><input type="text" inputmode="decimal" class="www-in" data-feld="fuellmenge" value="${sim.fuellmenge ?? ''}"></div>
                        <label class="ae-check" style="align-self:end;"><input type="checkbox" class="www-in" data-feld="les" ${sim.les ? 'checked' : ''}> Leckage-Erkennungssystem</label>
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="app.kaelteWwwAusloesen(${idJS(project.id)})">Simulieren</button>
                    ${ergebnisHtml}
                </div>`;
        }

        Object.assign(app, {
            // Stammdaten-Felder speichern
            async openPruefbuchEintragModal(projectId) {
                showModal('Prüfung erfassen', `
                    <div class="form-row">
                        <div class="form-group"><label>Datum *</label><input type="date" id="pbDatum" value="${new Date().toISOString().slice(0, 10)}"></div>
                        <div class="form-group"><label>Prüfart</label><input type="text" id="pbArt" placeholder="z. B. Dichtheitskontrolle"></div>
                    </div>
                    <div class="form-group"><label>Prüfer</label><input type="text" id="pbPruefer"></div>
                    <div class="form-group"><label>Ergebnis</label><input type="text" id="pbErgebnis" placeholder="z. B. i.O., Mängel siehe unten"></div>
                    <div class="form-group"><label>Mängel</label><textarea id="pbMaengel" rows="2"></textarea></div>
                    <div class="form-group"><label>Maßnahmen</label><textarea id="pbMassnahmen" rows="2"></textarea></div>
                    <div class="form-row">
                        <div class="form-group"><label>Behebung bis</label><input type="date" id="pbBehebung"></div>
                        <div class="form-group"><label>Nachweis (Referenz)</label><input type="text" id="pbNachweis" placeholder="z. B. Prüfprotokoll Nr. 2026-014"></div>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);">Dieser Eintrag wird der Prüfhistorie hinzugefügt und danach nicht mehr bearbeitbar sein – eine spätere Korrektur erfolgt über einen neuen Eintrag.</div>
                `, async (overlay) => {
                    const datum = overlay.querySelector('#pbDatum').value;
                    if (!datum) { showToast('Datum ist erforderlich.', 'error'); return; }
                    const project = await db.get('projects', projectId);
                    if (!project.kaelte) { showToast('Kein Kälteprojekt.', 'error'); return; }
                    kaeltePruefbuchEintragHinzufuegen(project, {
                        datum, pruefart: overlay.querySelector('#pbArt').value.trim(),
                        pruefer: overlay.querySelector('#pbPruefer').value.trim(),
                        ergebnis: overlay.querySelector('#pbErgebnis').value.trim(),
                        maengel: overlay.querySelector('#pbMaengel').value.trim(),
                        massnahmen: overlay.querySelector('#pbMassnahmen').value.trim(),
                        behebungBis: overlay.querySelector('#pbBehebung').value || null,
                        nachweis: overlay.querySelector('#pbNachweis').value.trim()
                    });
                    await db.put('projects', project);
                    overlay.remove();
                    showToast('Prüfung erfasst.', 'success');
                    renderKaelteDetail(projectId);
                });
            },

            async kaelteWwwAusloesen(projectId) {
                const project = await db.get('projects', projectId);
                if (!project.kaelte) return;
                const km = document.querySelector('.www-in[data-feld="kaeltemittel"]')?.value;
                const menge = document.querySelector('.www-in[data-feld="fuellmenge"]')?.value;
                const les = document.querySelector('.www-in[data-feld="les"]')?.checked;
                if (!menge || isNaN(parseFloat(menge.replace(',', '.')))) { showToast('Bitte eine Füllmenge für die Simulation eingeben.', 'error'); return; }
                // Wird bewusst NUR in einem Ad-hoc-Feld gehalten (Anzeigezustand
                // des Formulars), nicht als dauerhafter Projektbestandteil -
                // die Simulation selbst schreibt project.kaelte nie um.
                project.kaelte.wwwSim = { aktiv: true, kaeltemittel: km, fuellmenge: parseFloat(menge.replace(',', '.')), les };
                await db.put('projects', project);
                renderKaelteDetail(projectId);
            }
        });

        // Stammdaten-Felder speichern (delegiert, da dynamisch erzeugt).
        // projectId kommt aus dem data-projekt-Attribut des umschliessenden
        // Grids - es gibt in KAELTE_STATE kein Feld fuer die aktuell
        // geoeffnete Projekt-ID, das haette ich nicht annehmen duerfen.
        document.addEventListener('change', async (ev) => {
            const el = ev.target.closest && ev.target.closest('.pb-in');
            if (!el) return;
            const grid = el.closest('[data-projekt]');
            const projectId = grid ? parseId(grid.dataset.projekt) : null;
            if (!projectId) return;
            const project = await db.get('projects', projectId);
            if (!project || !project.kaelte) return;
            project.kaelte.anlagenstamm = project.kaelte.anlagenstamm || {};
            project.kaelte.anlagenstamm[el.dataset.feld] = el.value;
            await db.put('projects', project);
        });

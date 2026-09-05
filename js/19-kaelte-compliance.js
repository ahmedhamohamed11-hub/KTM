

        // ============================================================
        // ====== COMPLIANCE-ENGINE (Phase 1) ==========================
        // ============================================================
        // GRUNDSATZ dieser Datei: sie erfindet keine Rechtswerte. Jede Regel
        // hier ist entweder (a) mit einer echten, in diesem Projekt bereits
        // recherchierten Quelle hinterlegt und darf PASS/WARNING/FAIL liefern,
        // oder (b) als Platzhalter angelegt und liefert IMMER SOURCE_MISSING -
        // sie tut nur so lange nichts, bis jemand die Regel mit einer echten
        // Quelle befuellt. Ein Platzhalter darf niemals PASS liefern.
        //
        // Diese Engine BERECHNET NICHTS SELBST. Sie ruft ausschliesslich die
        // bereits vorhandenen, getesteten Funktionen auf (kaelteFGase,
        // kaelteAuslegung, kaelteKreisprozess, ...) und bewertet deren
        // Ergebnis gegen eine Regel. Keine zweite Kaelteengine, keine zweite
        // F-Gase-Rechnung - das waere genau die Dopplung, die es zu vermeiden
        // gilt.

        const COMPLIANCE_STATUS = {
            PASS: { icon: '✅', label: 'Erfüllt' },
            PASS_WITH_WARNINGS: { icon: '⚠️', label: 'Erfüllt mit Warnung' },
            WARNING: { icon: '⚠', label: 'Warnung' },
            FAIL: { icon: '❌', label: 'Nicht erfüllt' },
            NOT_APPLICABLE: { icon: 'ℹ', label: 'Nicht anwendbar' },
            NOT_EVALUABLE: { icon: '⏳', label: 'Nicht belastbar bewertbar' },
            DATA_MISSING: { icon: '⏳', label: 'Daten fehlen' },
            SOURCE_MISSING: { icon: '📚', label: 'Regel noch nicht verifiziert' },
            MANUFACTURER_CHECK_REQUIRED: { icon: '🏭', label: 'Herstellerprüfung erforderlich' },
            EXPERT_REVIEW_REQUIRED: { icon: '👷', label: 'Fachlich zu prüfen' },
            INFORMATION: { icon: 'ℹ', label: 'Information' }
        };

        // Rangfolge fuer die Zusammenfassung (Punkt 58). FAIL schlaegt alles,
        // danach fehlende Daten/Pruefungen, dann Warnungen, zuletzt PASS.
        const COMPLIANCE_RANG = {
            FAIL: 0, EXPERT_REVIEW_REQUIRED: 1, MANUFACTURER_CHECK_REQUIRED: 2,
            DATA_MISSING: 3, NOT_EVALUABLE: 3, SOURCE_MISSING: 4,
            WARNING: 5, PASS_WITH_WARNINGS: 5, PASS: 6, NOT_APPLICABLE: 6, INFORMATION: 6
        };

        // ---------- Rule Registry ----------
        // Jede Regel: siehe COMPLIANCE-Feldliste im Auftrag. calculate() bekommt
        // den Projekt-Kontext und liefert { status, calculated, reason, evidence }.
        // Regeln mit verification_status 'DRAFT' UND ohne calculate-Funktion
        // sind reine Platzhalter (source_status: 'SOURCE_MISSING' erzwungen).
        const COMPLIANCE_RULES = [];

        function registerComplianceRule(regel) {
            if (COMPLIANCE_RULES.some(r => r.rule_id === regel.rule_id)) {
                throw new Error(`Doppelte Rule ID: ${regel.rule_id}`);
            }
            COMPLIANCE_RULES.push(regel);
        }

        // ---- RULE-FGAS-2024-001: Dichtheitskontrollpflicht und Intervall ----
        // Quelle: Verordnung (EU) 2024/573, Art. 5, Art. 6. In diesem Projekt
        // bereits recherchiert und in kaelteFGase() implementiert (Build v198,
        // Web-Recherche gegen mehrere Quellen abgeglichen). Diese Regel
        // dupliziert die Rechnung NICHT, sie ruft kaelteFGase() auf und
        // verpackt das Ergebnis im Compliance-Format.
        registerComplianceRule({
            rule_id: 'RULE-FGAS-2024-001',
            title: 'F-Gase Dichtheitskontrollpflicht und Prüfintervall',
            jurisdiction: 'EU',
            legal_type: 'Verordnung',
            source_name: 'Verordnung (EU) 2024/573',
            source_number: '2024/573',
            version: '1.0', article: 'Art. 5', paragraph: null, annex: null, section: null,
            effective_from: '2024-03-11', effective_to: null,
            scope: 'Ortsfeste Kälte-, Klima- und Wärmepumpenanlagen mit fluorierten Treibhausgasen',
            required_inputs: ['kaeltemittel', 'fuellmengeKg'],
            severity: 'legal_requirement',
            verification_status: 'VERIFIED',
            last_verified: '2026-09-05',
            evaluate(project) {
                const A = kaelteAuslegungsdaten(project);
                const mm = kaelteMaterialListe(project);
                const kmPos = mm.pos.find(x => x.schluessel === 'kaeltemittel');
                const menge = kmPos ? Number(kmPos.menge) || 0 : 0;
                if (!menge) return { status: 'DATA_MISSING', reason: 'Füllmenge noch nicht berechnet – Leitungen und Bauteilvolumina im Schritt Anlage eintragen.', calculated: {} };
                const fg = project.kaelte.fgase || {};
                const r = kaelteFGase(A.kaeltemittel, menge, { hermetisch: !!fg.hermetisch, leckageErkennung: !!fg.les, wohngebaeude: !!fg.wohn });
                if (!r.moeglich) return { status: 'SOURCE_MISSING', reason: r.hinweis, calculated: {} };
                return {
                    status: r.pflichtig ? (r.intervallMonate <= 6 ? 'WARNING' : 'PASS_WITH_WARNINGS') : 'PASS',
                    reason: r.hinweis,
                    calculated: { charge_kg: menge, gwp: r.gwp, co2e_t: Math.round(r.co2e * 1000) / 1000, interval_months: r.intervallMonate },
                    evidence: r.pflichten || []
                };
            }
        });

        // ---- RULE-FGAS-2024-002: Leckage-Erkennungssystem ab 500 t CO2e ----
        registerComplianceRule({
            rule_id: 'RULE-FGAS-2024-002',
            title: 'Pflicht zum Leckage-Erkennungssystem',
            jurisdiction: 'EU', legal_type: 'Verordnung',
            source_name: 'Verordnung (EU) 2024/573', source_number: '2024/573',
            version: '1.0', article: 'Art. 6', paragraph: null, annex: null, section: null,
            effective_from: '2024-03-11', effective_to: null,
            scope: 'Anlagen ab 500 t CO₂-Äquivalent Füllmenge',
            required_inputs: ['kaeltemittel', 'fuellmengeKg'],
            severity: 'legal_requirement',
            verification_status: 'VERIFIED',
            last_verified: '2026-09-05',
            evaluate(project) {
                const A = kaelteAuslegungsdaten(project);
                const mm = kaelteMaterialListe(project);
                const kmPos = mm.pos.find(x => x.schluessel === 'kaeltemittel');
                const menge = kmPos ? Number(kmPos.menge) || 0 : 0;
                if (!menge) return { status: 'DATA_MISSING', reason: 'Füllmenge noch nicht berechnet.', calculated: {} };
                const fg = project.kaelte.fgase || {};
                const r = kaelteFGase(A.kaeltemittel, menge, { hermetisch: !!fg.hermetisch, leckageErkennung: !!fg.les, wohngebaeude: !!fg.wohn });
                if (!r.moeglich) return { status: 'NOT_APPLICABLE', reason: r.hinweis, calculated: {} };
                if (!r.lesPflicht) return { status: 'NOT_APPLICABLE', reason: `${r.co2e.toFixed(1)} t CO₂e liegen unter der 500-t-Grenze.`, calculated: { co2e_t: r.co2e } };
                return {
                    status: fg.les ? 'PASS' : 'FAIL',
                    reason: fg.les ? 'Leckage-Erkennungssystem ist eingetragen.' : `Ab 500 t CO₂-Äquivalent ist ein automatisches Leckage-Erkennungssystem vorgeschrieben (${r.co2e.toFixed(1)} t vorhanden), im Projekt aber nicht als vorhanden markiert.`,
                    calculated: { co2e_t: r.co2e }
                };
            }
        });

        // ---- Platzhalter-Regeln (Punkt 66-71): STRUKTUR angelegt, damit die
        // Engine und das Datenmodell fuer diese Domaenen bereitstehen - aber
        // OHNE erfundenen Regelinhalt. Jede liefert immer SOURCE_MISSING mit
        // einer ehrlichen Begruendung, welche Quelle noch zu verifizieren ist.
        // verification_status: 'DRAFT' - darf laut Vorgabe (Punkt 30) NIEMALS
        // PASS liefern.
        const COMPLIANCE_PLATZHALTER = [
            { rule_id: 'RULE-KAV-022', title: 'Kälteanlagenverordnung §22 – Überprüfung/Betriebssicherheit',
              source_name: 'Kälteanlagenverordnung (Österreich)', jurisdiction: 'AT', quelle_hinweis: 'RIS Österreich – Paragraphentext noch nicht verifiziert eingebunden.' },
            { rule_id: 'RULE-KAV-023', title: 'Kälteanlagenverordnung §23 – Prüfbuch',
              source_name: 'Kälteanlagenverordnung (Österreich)', jurisdiction: 'AT', quelle_hinweis: 'RIS Österreich – Paragraphentext noch nicht verifiziert eingebunden.' },
            { rule_id: 'RULE-PED-001', title: 'Druckgeräterichtlinie – Einstufung',
              source_name: 'Richtlinie 2014/68/EU', jurisdiction: 'EU', quelle_hinweis: 'Einstufung nach PS/V/Fluidgruppe braucht Herstellerdaten je Bauteil – noch nicht angebunden.' },
            { rule_id: 'RULE-DGUWV-001', title: 'Druckgeräteüberwachungsverordnung',
              source_name: 'DGÜW-V (Österreich)', jurisdiction: 'AT', quelle_hinweis: 'Noch nicht verifiziert eingebunden.' },
            { rule_id: 'RULE-A3-ROOM-001', title: 'Brennbare Kältemittel (A3) – Aufstellungsraum',
              source_name: 'EN 378 / ISO 5149', jurisdiction: 'EU', quelle_hinweis: 'Erfordert Raumvolumen, Leckageszenario, Lüftung, Zündquellen – Bewertungslogik noch nicht verifiziert. Niemals automatisch als ATEX-relevant einstufen.' },
            { rule_id: 'RULE-CO2-SAFETY-001', title: 'CO₂ – Erstickungs-/Druckrisiko im Aufstellungsraum',
              source_name: 'EN 378 / ISO 5149', jurisdiction: 'EU', quelle_hinweis: 'Erfordert Raumvolumen, Detektion, Lüftung – noch nicht verifiziert eingebunden.' },
            { rule_id: 'RULE-OIB-001', title: 'Brandschutz / Aufstellungsbedingungen',
              source_name: 'OIB-Richtlinie 2 + Landesrecht', jurisdiction: 'AT', quelle_hinweis: 'Verbindlichkeit hängt vom Bundesland ab, das im Projekt noch nicht erfasst wird.' },
            { rule_id: 'RULE-SOUND-001', title: 'Schallabschätzung',
              source_name: 'ÖNORM S 5004 / Herstellerangaben', jurisdiction: 'AT', quelle_hinweis: 'Nur als vorläufige technische Abschätzung zulässig, keine vollständige Schallimmissionsprognose. Noch nicht implementiert.' },
            { rule_id: 'RULE-MAINT-001', title: 'Herstellerwartungsintervalle',
              source_name: 'Herstellerdokumentation je Komponente', jurisdiction: 'Hersteller', quelle_hinweis: 'Abhängig vom konkreten Gerät – noch nicht angebunden.' }
        ];
        COMPLIANCE_PLATZHALTER.forEach(p => registerComplianceRule({
            ...p, legal_type: 'Platzhalter', version: null, article: null, paragraph: null, annex: null, section: null,
            effective_from: null, effective_to: null, scope: null, required_inputs: [],
            severity: 'unbekannt', verification_status: 'DRAFT', last_verified: null,
            evaluate() { return { status: 'SOURCE_MISSING', reason: p.quelle_hinweis, calculated: {} }; }
        }));

        // ---------- Zentrale Auswertung ----------
        // Wertet ALLE registrierten Regeln fuer ein Projekt aus und baut die
        // in project.kaelte.compliance vorgesehene Struktur.
        function kaelteComplianceAuswerten(project) {
            const results = COMPLIANCE_RULES.map(regel => {
                let out;
                try { out = regel.evaluate(project); }
                catch (e) { out = { status: 'NOT_EVALUABLE', reason: `Interner Fehler bei der Auswertung: ${e.message}`, calculated: {} }; }
                // Punkt 30: eine DRAFT-Regel darf niemals PASS liefern.
                if (regel.verification_status === 'DRAFT' && (out.status === 'PASS' || out.status === 'PASS_WITH_WARNINGS')) {
                    out = { status: 'SOURCE_MISSING', reason: 'Regel ist nicht verifiziert (DRAFT) und darf keinen PASS liefern.', calculated: {} };
                }
                return {
                    rule_id: regel.rule_id, title: regel.title, jurisdiction: regel.jurisdiction,
                    source_name: regel.source_name, article: regel.article, severity: regel.severity,
                    verification_status: regel.verification_status, last_verified: regel.last_verified,
                    status: out.status, reason: out.reason, calculated: out.calculated || {}, evidence: out.evidence || []
                };
            });

            const zaehler = {};
            results.forEach(r => { zaehler[r.status] = (zaehler[r.status] || 0) + 1; });

            // Gesamtstatus nach der Regel aus Punkt 58.
            let overall = 'PASS';
            if (zaehler.FAIL > 0) overall = 'FAIL';
            else if (zaehler.EXPERT_REVIEW_REQUIRED > 0) overall = 'EXPERT_REVIEW_REQUIRED';
            else if (zaehler.MANUFACTURER_CHECK_REQUIRED > 0) overall = 'MANUFACTURER_CHECK_REQUIRED';
            else if ((zaehler.DATA_MISSING || 0) + (zaehler.NOT_EVALUABLE || 0) > 0) overall = 'DATA_MISSING';
            else if ((zaehler.WARNING || 0) + (zaehler.PASS_WITH_WARNINGS || 0) > 0) overall = 'PASS_WITH_WARNINGS';

            return {
                current_rule_set_version: '1.0',
                checked_at: new Date().toISOString(),
                overall_status: overall,
                counts: zaehler,
                rules: results.sort((a, b) => (COMPLIANCE_RANG[a.status] ?? 9) - (COMPLIANCE_RANG[b.status] ?? 9)),
                note: 'Technische Vorprüfung anhand hinterlegter Regeln. Keine behördliche Genehmigung, keine Aussage zur vollständigen Rechtssicherheit. Regeln mit Status "Regel noch nicht verifiziert" sind Platzhalter ohne Rechtsinhalt.'
            };
        }

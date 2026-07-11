
        // ============================================================
        // ============ PLANUNG / GRUNDRISS (SVG-Editor) ==============
        // ============================================================
        // Maßstab: 20 Pixel = 1 Meter. Plan wird als project.plan (JSON)
        // gespeichert und über die projects-Tabelle synchronisiert.
        const PLAN_SCALE = 20;

        const PLAN_LINE_KINDS = {
            pipe:       { label: 'Leitung (Kälte)', emoji: '✏️', color: '#b3541e', width: 2.4, dash: '', techKey: 'pipeLength' },
            power:      { label: 'Stromkabel',      emoji: '⚡', color: '#c24747', width: 2,   dash: '', techKey: 'powerCableLength' },
            comm:       { label: 'Komm.-Kabel',     emoji: '📡', color: '#5b63d3', width: 2,   dash: '6 3', techKey: 'commCableLength' },
            duct:       { label: 'Kabelkanal',      emoji: '🛤️', color: '#6b7f88', width: 4,   dash: '', techKey: 'cableDuct' },
            condensate: { label: 'Kondensat',       emoji: '💧', color: '#2b8a9e', width: 2,   dash: '4 3', techKey: 'condensateLine' },
            wall:       { label: 'Wand',            emoji: '🏠', color: '#17313c', width: 5,   dash: '', techKey: null },
            measure:    { label: 'Maßlinie',        emoji: '📏', color: '#8aa0a9', width: 1.2, dash: '5 4', techKey: null }
        };
        const PLAN_SYMBOLS = {
            door:         { label: 'Tür',             emoji: '🚪' },
            window:       { label: 'Fenster',         emoji: '🪟' },
            wallUnit:     { label: 'Wandgerät',       emoji: '❄️', indoor: true },
            ceilingUnit:  { label: 'Deckenkassette',  emoji: '🔲', indoor: true },
            ductUnit:     { label: 'Kanalgerät',      emoji: '🌀', indoor: true },
            underCeiling: { label: 'Unterdeckengerät',emoji: '📥', indoor: true },
            floorUnit:    { label: 'Truhengerät',     emoji: '🗄️', indoor: true },
            outdoorUnit:  { label: 'Single Split AG', emoji: '🧊', outdoor: true },
            outdoorMulti: { label: 'Multi Split AG',  emoji: '❆',  outdoor: true },
            outdoorVRF:   { label: 'VRF-Außengerät',  emoji: '🏢', outdoor: true },
            coreDrill:    { label: 'Kernbohrung',     emoji: '⭕' },
            wallBreak:    { label: 'Mauerdurchbruch', emoji: '📍' },
            socket:       { label: 'Steckdose',       emoji: '⚡' },
            fuse:         { label: 'Sicherung',       emoji: '🔌' },
            photo:        { label: 'Foto-Marker',     emoji: '📷' },
            note:         { label: 'Notiz',           emoji: '📝' }
        };
        const PLAN_INDOOR_SYMS = Object.keys(PLAN_SYMBOLS).filter(k => PLAN_SYMBOLS[k].indoor);
        const PLAN_OUTDOOR_SYMS = Object.keys(PLAN_SYMBOLS).filter(k => PLAN_SYMBOLS[k].outdoor);

        const planState = {
            projectId: null, tool: 'select', lineKind: 'pipe',
            drawing: null, selection: null, drag: null,
            view: { x: 0, y: 0, w: 900, h: 560 },
            undo: [], saveTimer: null, applyTimer: null, pinch: null
        };

        function planNew() { return { items: [], v: 1 }; }
        function planGet(project) {
            const p = project.plan && typeof project.plan === 'object' ? project.plan : planNew();
            if (!Array.isArray(p.items)) p.items = [];
            return p;
        }
        function planLineLengthPx(pts) {
            let L = 0;
            for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
            return L;
        }
        function planLineMeters(item) { return Math.round((planLineLengthPx(item.points) / PLAN_SCALE) * 10) / 10; }

        // Räume automatisch anordnen (Grundriss aus den Raummaßen)
        function planLayoutRooms(plan, rooms) {
            const kept = plan.items.filter(i => i.type !== 'room' || rooms.some(r => String(r.id) === String(i.roomId)));
            plan.items = kept;
            const pad = 24;
            let x = pad, y = pad, rowH = 0;
            const maxW = 860;
            for (const r of rooms) {
                let it = plan.items.find(i => i.type === 'room' && String(i.roomId) === String(r.id));
                const w = Math.max((r.length || 3) * PLAN_SCALE, 40);
                const h = Math.max((r.width || 3) * PLAN_SCALE, 30);
                if (!it) {
                    if (x + w > maxW) { x = pad; y += rowH + pad; rowH = 0; }
                    it = { id: generateUUID(), type: 'room', roomId: r.id, x, y };
                    plan.items.unshift(it);
                    x += w + pad; rowH = Math.max(rowH, h);
                }
            }
        }
        function planRoomRect(it, rooms) {
            const r = rooms.find(rr => String(rr.id) === String(it.roomId));
            if (!r) return null;
            return { x: it.x, y: it.y, w: Math.max((r.length || 3) * PLAN_SCALE, 40), h: Math.max((r.width || 3) * PLAN_SCALE, 30), room: r };
        }
        function planRoomAt(plan, rooms, px, py) {
            for (const it of plan.items) {
                if (it.type !== 'room') continue;
                const rc = planRoomRect(it, rooms);
                if (rc && px >= rc.x && px <= rc.x + rc.w && py >= rc.y && py <= rc.y + rc.h) return rc.room;
            }
            return null;
        }
        // Fangpunkte: Symbole + Raumecken
        function planSnapPoint(plan, rooms, px, py, tol) {
            let best = null, bestD = tol;
            for (const it of plan.items) {
                if (it.type === 'symbol') {
                    const d = Math.hypot(it.x - px, it.y - py);
                    if (d < bestD) { bestD = d; best = [it.x, it.y]; }
                } else if (it.type === 'room') {
                    const rc = planRoomRect(it, rooms);
                    if (!rc) continue;
                    for (const [cx, cy] of [[rc.x, rc.y], [rc.x + rc.w, rc.y], [rc.x, rc.y + rc.h], [rc.x + rc.w, rc.y + rc.h]]) {
                        const d = Math.hypot(cx - px, cy - py);
                        if (d < bestD) { bestD = d; best = [cx, cy]; }
                    }
                }
            }
            return best;
        }
        // H/V/45°-Einrasten relativ zum letzten Punkt
        function planSnapAngle(last, px, py) {
            const dx = px - last[0], dy = py - last[1];
            const dist = Math.hypot(dx, dy);
            if (dist < 2) return [px, py];
            const ang = Math.atan2(dy, dx);
            const step = Math.PI / 4; // 45°
            const snapped = Math.round(ang / step) * step;
            if (Math.abs(ang - snapped) < 0.22) {
                return [last[0] + Math.cos(snapped) * dist, last[1] + Math.sin(snapped) * dist];
            }
            return [px, py];
        }

        function planItemsHtml(plan, rooms) {
            const sel = planState.selection;
            let html = '';
            // Räume zuerst (Hintergrund)
            for (const it of plan.items.filter(i => i.type === 'room')) {
                const rc = planRoomRect(it, rooms);
                if (!rc) continue;
                const kw = (((rc.room.length || 0) * (rc.room.width || 0) * 80) / 1000).toFixed(1);
                html += `<g class="pl-item pl-room ${sel === it.id ? 'pl-sel' : ''}" data-id="${it.id}">
                    <rect x="${rc.x}" y="${rc.y}" width="${rc.w}" height="${rc.h}" rx="3"></rect>
                    <text x="${rc.x + rc.w / 2}" y="${rc.y + 14}" text-anchor="middle" class="pl-room-name">${escapeHtml(rc.room.name || 'Raum')}</text>
                    <text x="${rc.x + rc.w / 2}" y="${rc.y + 26}" text-anchor="middle" class="pl-room-meta">${rc.room.length}×${rc.room.width} m · ${kw} kW</text>
                </g>`;
            }
            // Linien
            for (const it of plan.items.filter(i => i.type === 'line')) {
                const k = PLAN_LINE_KINDS[it.kind] || PLAN_LINE_KINDS.pipe;
                const ptsStr = it.points.map(p => p.join(',')).join(' ');
                const mid = it.points[Math.floor(it.points.length / 2)];
                const meters = planLineMeters(it);
                html += `<g class="pl-item pl-line ${sel === it.id ? 'pl-sel' : ''}" data-id="${it.id}">
                    <polyline points="${ptsStr}" fill="none" stroke="${k.color}" stroke-width="${k.width}" ${k.dash ? `stroke-dasharray="${k.dash}"` : ''} stroke-linecap="round" stroke-linejoin="round"></polyline>
                    <polyline points="${ptsStr}" fill="none" stroke="transparent" stroke-width="14"></polyline>
                    ${it.kind !== 'wall' ? `<text x="${mid[0]}" y="${mid[1] - 6}" text-anchor="middle" class="pl-len" fill="${k.color}">${String(meters).replace('.', ',')} m</text>` : ''}
                </g>`;
            }
            // Symbole
            for (const it of plan.items.filter(i => i.type === 'symbol')) {
                const s = PLAN_SYMBOLS[it.sym] || { emoji: '❓', label: '?' };
                const sc = it.sc || 1;
                // Außengeräte: Serviceabstand (seitlich 0,3 m, vorne 0,5 m) gestrichelt anzeigen
                let clearance = '';
                if (s.outdoor) {
                    const side = 0.3 * PLAN_SCALE, front = 0.5 * PLAN_SCALE, bw = 0.9 * PLAN_SCALE, bh = 0.35 * PLAN_SCALE;
                    clearance = `
                        <rect x="${-bw / 2 - side}" y="${-bh / 2 - side}" width="${bw + side * 2}" height="${bh + side + front}" rx="3"
                              fill="none" stroke="var(--warning)" stroke-width="1" stroke-dasharray="4 3" opacity="0.8"></rect>
                        <rect x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="2" fill="var(--bg-tertiary)" stroke="var(--text-muted)" stroke-width="0.8"></rect>
                        <text text-anchor="middle" y="${bh / 2 + front - 2}" class="pl-clearance">Service 0,5 m</text>`;
                }
                html += `<g class="pl-item pl-sym ${sel === it.id ? 'pl-sel' : ''}" data-id="${it.id}" transform="translate(${it.x},${it.y}) rotate(${it.rot || 0}) scale(${sc})">
                    ${clearance}
                    <circle r="13" class="pl-sym-bg"></circle>
                    <text text-anchor="middle" dy="5" font-size="14">${s.emoji}</text>
                    ${it.text ? `<text text-anchor="middle" y="24" class="pl-sym-label">${escapeHtml(String(it.text).slice(0, 24))}</text>` : ''}
                </g>`;
            }
            // Aktive Zeichnung (Vorschau)
            if (planState.drawing && planState.drawing.points.length) {
                const d = planState.drawing;
                const k = PLAN_LINE_KINDS[d.kind];
                const pts = [...d.points, ...(d.preview ? [d.preview] : [])];
                html += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${k.color}" stroke-width="${k.width}" stroke-dasharray="4 4" opacity="0.85" pointer-events="none"></polyline>`;
                for (const p of d.points) html += `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="${k.color}" pointer-events="none"></circle>`;
            }
            return html;
        }

        function planRedraw() {
            const svg = document.getElementById('planSvg');
            if (!svg) return;
            const layer = svg.querySelector('#planLayer');
            layer.innerHTML = planItemsHtml(planState.plan, planState.rooms);
            svg.setAttribute('viewBox', `${planState.view.x} ${planState.view.y} ${planState.view.w} ${planState.view.h}`);
            const bar = document.getElementById('planSelBar');
            if (bar) bar.style.display = planState.selection ? 'flex' : 'none';
            planUpdateStatus();
        }
        function planUpdateStatus(extra) {
            const el = document.getElementById('planStatus');
            if (!el) return;
            if (extra) { el.textContent = extra; return; }
            if (planState.tool === 'line') {
                const k = PLAN_LINE_KINDS[planState.lineKind];
                const cur = planState.drawing ? ` · ${String(Math.round((planLineLengthPx([...planState.drawing.points, ...(planState.drawing.preview ? [planState.drawing.preview] : [])]) / PLAN_SCALE) * 10) / 10).replace('.', ',')} m` : '';
                el.textContent = `${k.emoji} ${k.label}: Tippen setzt Punkte, ✔ beendet${cur}`;
            } else if (planState.tool === 'select') {
                el.textContent = 'Auswählen & Verschieben · leere Fläche ziehen = Plan bewegen · Pinch/Rad = Zoom';
            } else {
                const s = PLAN_SYMBOLS[planState.tool];
                if (s) el.textContent = `${s.emoji} ${s.label}: auf den Plan tippen zum Platzieren`;
            }
        }

        // ---------- Interaktion (Maus, Finger, S-Pen, Apple Pencil via Pointer Events) ----------
        function planClientToSvg(svg, cx, cy) {
            const r = svg.getBoundingClientRect();
            return [
                planState.view.x + ((cx - r.left) / r.width) * planState.view.w,
                planState.view.y + ((cy - r.top) / r.height) * planState.view.h
            ];
        }
        function planPushUndo() {
            planState.undo.push(JSON.stringify(planState.plan));
            if (planState.undo.length > 30) planState.undo.shift();
        }
        function planCommit() {
            planRedraw();
            planScheduleSave();
        }
        function planScheduleSave() {
            clearTimeout(planState.saveTimer);
            planState.saveTimer = setTimeout(async () => {
                try {
                    const project = await db.get('projects', planState.projectId);
                    if (!project) return;
                    project.plan = planState.plan;
                    await db.put('projects', project);
                    planUpdateStatus('💾 Plan gespeichert & synchronisiert');
                    setTimeout(() => planUpdateStatus(), 1400);
                } catch (e) { console.warn('Plan speichern fehlgeschlagen:', e); }
            }, 900);
            // Automatische Übernahme in Räume + Material (ohne manuelles Aktualisieren)
            clearTimeout(planState.applyTimer);
            planState.applyTimer = setTimeout(() => { app.applyPlanToProject(planState.projectId, true); }, 1800);
        }

        function initPlanEditor(project, rooms) {
            const svg = document.getElementById('planSvg');
            if (!svg) return;
            planState.projectId = project.id;
            planState.rooms = rooms;
            planState.plan = planGet(project);
            planState.drawing = null;
            planState.selection = null;
            if (!planState.plan.items.some(i => i.type === 'room') && rooms.length) {
                planLayoutRooms(planState.plan, rooms);
            } else {
                planLayoutRooms(planState.plan, rooms); // neue Räume ergänzen, gelöschte entfernen
            }

            // Werkzeugleiste
            document.querySelectorAll('.plan-tool').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.plan-tool').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const t = btn.dataset.tool;
                    if (t.startsWith('line:')) { planState.tool = 'line'; planState.lineKind = t.split(':')[1]; }
                    else planState.tool = t;
                    if (planState.tool !== 'line') planState.drawing = null;
                    planState.selection = null;
                    planRedraw();
                });
            });
            document.getElementById('planFinishLine')?.addEventListener('click', () => planFinishLine());
            document.getElementById('planUndo')?.addEventListener('click', () => {
                if (planState.drawing && planState.drawing.points.length > 1) { planState.drawing.points.pop(); planRedraw(); return; }
                const last = planState.undo.pop();
                if (last) { planState.plan = JSON.parse(last); planState.selection = null; planCommit(); }
            });
            document.getElementById('planRelayout')?.addEventListener('click', () => {
                planPushUndo();
                planState.plan.items = planState.plan.items.filter(i => i.type !== 'room');
                planLayoutRooms(planState.plan, planState.rooms);
                planCommit();
            });
            document.getElementById('planApplyNow')?.addEventListener('click', () => app.applyPlanToProject(planState.projectId, false));

            // Auswahl-Aktionen
            const selItem = () => planState.plan.items.find(i => i.id === planState.selection);
            document.getElementById('planSelRotate')?.addEventListener('click', () => { const it = selItem(); if (it && it.type === 'symbol') { planPushUndo(); it.rot = ((it.rot || 0) + 45) % 360; planCommit(); } });
            document.getElementById('planSelScaleUp')?.addEventListener('click', () => { const it = selItem(); if (it && it.type === 'symbol') { planPushUndo(); it.sc = Math.min(3, (it.sc || 1) * 1.2); planCommit(); } });
            document.getElementById('planSelScaleDown')?.addEventListener('click', () => { const it = selItem(); if (it && it.type === 'symbol') { planPushUndo(); it.sc = Math.max(0.5, (it.sc || 1) / 1.2); planCommit(); } });
            document.getElementById('planSelCopy')?.addEventListener('click', () => {
                const it = selItem(); if (!it || it.type === 'room') return;
                planPushUndo();
                const cp = JSON.parse(JSON.stringify(it)); cp.id = generateUUID();
                if (cp.type === 'symbol') { cp.x += 26; cp.y += 26; }
                if (cp.type === 'line') cp.points = cp.points.map(p => [p[0] + 26, p[1] + 26]);
                planState.plan.items.push(cp);
                planState.selection = cp.id;
                planCommit();
            });
            document.getElementById('planSelText')?.addEventListener('click', () => {
                const it = selItem(); if (!it || it.type !== 'symbol') return;
                const t = prompt('Text / Beschriftung:', it.text || '');
                if (t === null) return;
                planPushUndo(); it.text = t.trim(); planCommit();
            });
            document.getElementById('planSelDelete')?.addEventListener('click', () => {
                const it = selItem(); if (!it) return;
                if (it.type === 'room') { showToast('Räume löschst du in der Raum-Tabelle – im Plan kannst du sie nur verschieben.', 'info'); return; }
                planPushUndo();
                planState.plan.items = planState.plan.items.filter(i => i.id !== it.id);
                planState.selection = null;
                planCommit();
            });

            // Pointer-Interaktion
            svg.style.touchAction = 'none';
            const pointers = new Map();

            svg.addEventListener('pointerdown', (e) => {
                svg.setPointerCapture(e.pointerId);
                pointers.set(e.pointerId, [e.clientX, e.clientY]);
                if (pointers.size === 2) { // Pinch-Zoom Start
                    const [a, b] = [...pointers.values()];
                    planState.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), view: { ...planState.view } };
                    planState.drag = null;
                    return;
                }
                const [px, py] = planClientToSvg(svg, e.clientX, e.clientY);

                if (planState.tool === 'line') {
                    const snapA = planSnapPoint(planState.plan, planState.rooms, px, py, 14 * (planState.view.w / 900));
                    let pt = snapA || [px, py];
                    if (!planState.drawing) {
                        planState.drawing = { kind: planState.lineKind, points: [pt], preview: null };
                        document.getElementById('planFinishLine')?.classList.add('show');
                    } else {
                        const last = planState.drawing.points[planState.drawing.points.length - 1];
                        pt = snapA || planSnapAngle(last, px, py);
                        planState.drawing.points.push(pt);
                    }
                    planRedraw();
                    return;
                }

                if (planState.tool !== 'select' && PLAN_SYMBOLS[planState.tool]) {
                    // Klima-Logik: Geräte nur an fachlich passenden Positionen
                    const inRoom = planRoomAt(planState.plan, planState.rooms, px, py);
                    if (PLAN_SYMBOLS[planState.tool].indoor && !inRoom) {
                        showToast('Innengeräte werden IN einem Raum platziert.', 'error');
                        return;
                    }
                    if (PLAN_SYMBOLS[planState.tool].outdoor && inRoom) {
                        showToast('Außengeräte werden AUSSERHALB der Räume platziert (Fassade, Dach, Garten).', 'error');
                        return;
                    }
                    planPushUndo();
                    const it = { id: generateUUID(), type: 'symbol', sym: planState.tool, x: Math.round(px), y: Math.round(py), rot: 0, sc: 1 };
                    if (planState.tool === 'note' || planState.tool === 'photo') {
                        const t = prompt(planState.tool === 'note' ? 'Notiz:' : 'Foto-Beschreibung (Bild fügst du unter „Bilder" hinzu):', '');
                        if (t) it.text = t.trim();
                    }
                    planState.plan.items.push(it);
                    planState.selection = it.id;
                    planCommit();
                    return;
                }

                // Auswählen / Verschieben / Pan
                const g = e.target.closest('.pl-item');
                if (g) {
                    const it = planState.plan.items.find(i => i.id === g.dataset.id);
                    planState.selection = it?.id || null;
                    if (it) {
                        planPushUndo();
                        planState.drag = { it, sx: px, sy: py, orig: it.type === 'line' ? it.points.map(p => [...p]) : { x: it.x, y: it.y } };
                    }
                } else {
                    planState.selection = null;
                    planState.drag = { pan: true, sx: e.clientX, sy: e.clientY, view: { ...planState.view } };
                }
                planRedraw();
            });

            svg.addEventListener('pointermove', (e) => {
                if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.clientX, e.clientY]);
                if (planState.pinch && pointers.size === 2) {
                    const [a, b] = [...pointers.values()];
                    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
                    const f = Math.min(4, Math.max(0.25, planState.pinch.d / d));
                    const v0 = planState.pinch.view;
                    const cx = v0.x + v0.w / 2, cy = v0.y + v0.h / 2;
                    planState.view = { w: v0.w * f, h: v0.h * f, x: cx - (v0.w * f) / 2, y: cy - (v0.h * f) / 2 };
                    planRedraw();
                    return;
                }
                const [px, py] = planClientToSvg(svg, e.clientX, e.clientY);

                if (planState.tool === 'line' && planState.drawing) {
                    const last = planState.drawing.points[planState.drawing.points.length - 1];
                    const snapA = planSnapPoint(planState.plan, planState.rooms, px, py, 14 * (planState.view.w / 900));
                    planState.drawing.preview = snapA || planSnapAngle(last, px, py);
                    planRedraw();
                    return;
                }
                if (!planState.drag) return;
                if (planState.drag.pan) {
                    const r = svg.getBoundingClientRect();
                    const dx = ((e.clientX - planState.drag.sx) / r.width) * planState.view.w;
                    const dy = ((e.clientY - planState.drag.sy) / r.height) * planState.view.h;
                    planState.view.x = planState.drag.view.x - dx;
                    planState.view.y = planState.drag.view.y - dy;
                    planRedraw();
                    return;
                }
                const dx = px - planState.drag.sx, dy = py - planState.drag.sy;
                const it = planState.drag.it;
                if (it.type === 'line') it.points = planState.drag.orig.map(p => [p[0] + dx, p[1] + dy]);
                else { it.x = Math.round(planState.drag.orig.x + dx); it.y = Math.round(planState.drag.orig.y + dy); }
                planRedraw();
            });

            const endPointer = (e) => {
                pointers.delete(e.pointerId);
                if (pointers.size < 2) planState.pinch = null;
                if (planState.drag && !planState.drag.pan) planScheduleSave();
                planState.drag = null;
            };
            svg.addEventListener('pointerup', endPointer);
            svg.addEventListener('pointercancel', endPointer);
            svg.addEventListener('dblclick', () => planFinishLine());
            svg.addEventListener('wheel', (e) => {
                e.preventDefault();
                const f = e.deltaY > 0 ? 1.12 : 0.89;
                const [px, py] = planClientToSvg(svg, e.clientX, e.clientY);
                const v = planState.view;
                planState.view = { w: v.w * f, h: v.h * f, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
                planRedraw();
            }, { passive: false });

            planRedraw();
        }
        function planFinishLine() {
            const d = planState.drawing;
            document.getElementById('planFinishLine')?.classList.remove('show');
            if (!d || d.points.length < 2) { planState.drawing = null; planRedraw(); return; }
            planPushUndo();
            planState.plan.items.push({ id: generateUUID(), type: 'line', kind: d.kind, points: d.points.map(p => [Math.round(p[0]), Math.round(p[1])]) });
            planState.drawing = null;
            planCommit();
        }

        // ---------- Live-Projektzusammenfassung ----------
        async function buildProjectSummaryChips(projectId) {
            const rooms = (await db.getByIndex('rooms', 'projectId', projectId)) || [];
            const pm = (await db.getByIndex('projectMaterials', 'projectId', projectId)) || [];
            const materials = await db.getAll('materials');
            const cooling = calculateCoolingCapacity(rooms);
            const num = v => (typeof v === 'number' && v > 0 ? v : 0);
            const t = rooms.reduce((a, r) => {
                const x = r.tech || {};
                a.pipe += num(x.pipeLength); a.power += num(x.powerCableLength); a.comm += num(x.commCableLength);
                a.duct += num(x.cableDuct); a.cond += num(x.condensateLine); a.drills += num(x.coreDrills);
                return a;
            }, { pipe: 0, power: 0, comm: 0, duct: 0, cond: 0, drills: 0 });
            const indoor = pm.filter(x => { const m = materials.find(mm => String(mm.id) === String(x.materialId)); return (m?.name || '').toLowerCase().includes('innengerät'); }).reduce((s, x) => s + (Number(x.quantity) || 0), 0);
            const outdoor = pm.filter(x => { const m = materials.find(mm => String(mm.id) === String(x.materialId)); return (m?.name || '').toLowerCase().includes('außengerät'); }).reduce((s, x) => s + (Number(x.quantity) || 0), 0);
            let ek = 0, vk = 0;
            for (const x of pm) {
                const m = materials.find(mm => String(mm.id) === String(x.materialId));
                const q = Number(x.quantity) || 0;
                ek += q * (Number(m?.purchasePrice) || 0);
                vk += q * (x.price !== undefined && x.price !== null ? Number(x.price) : matUnitPrice(m, x.unit || m?.unit || 'Stk'));
            }
            const fm = v => String(Math.round(v * 10) / 10).replace('.', ',');
            const chips = [
                ['🚪 Räume', rooms.length],
                ['❄ Innengeräte', indoor],
                ['🧊 Außengeräte', outdoor],
                ['🧵 Rohrlänge', fm(t.pipe) + ' m'],
                ['⚡ Kabel', fm(t.power + t.comm) + ' m'],
                ['💧 Kondensat', fm(t.cond) + ' m'],
                ['🛤 Kabelkanal', fm(t.duct) + ' m'],
                ['⭕ Kernbohrungen', t.drills],
                ['❄ Gesamtleistung', (cooling.recommendation || 0) + ' kW'],
                ['📦 Materialwert (EK)', formatCurrency(ek)],
                ['💶 Verkaufspreis', formatCurrency(vk)]
            ];
            return chips.map(([l, v]) => `<div class="survey-chip"><span>${l}</span><strong>${v}</strong></div>`).join('');
        }
        async function refreshProjectSummary(projectId) {
            const el = document.getElementById('projSummary');
            if (el) el.innerHTML = await buildProjectSummaryChips(projectId);
        }

        // ---------- Plan als PDF-Vektor-Zeichnung ----------
        function pdfPlanDrawing(doc, plan, rooms, x, y, maxW) {
            const items = (plan?.items || []);
            if (!items.length) return y;
            let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
            const roomRects = [];
            for (const it of items) {
                if (it.type === 'room') {
                    const rc = planRoomRect(it, rooms);
                    if (!rc) continue;
                    roomRects.push(rc);
                    minX = Math.min(minX, rc.x); minY = Math.min(minY, rc.y);
                    maxX = Math.max(maxX, rc.x + rc.w); maxY = Math.max(maxY, rc.y + rc.h);
                } else if (it.type === 'line') {
                    for (const p of it.points) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); }
                } else if (it.type === 'symbol') {
                    minX = Math.min(minX, it.x - 14); minY = Math.min(minY, it.y - 14);
                    maxX = Math.max(maxX, it.x + 14); maxY = Math.max(maxY, it.y + 14);
                }
            }
            if (minX > maxX) return y;
            const pad = 10;
            const scale = Math.min(maxW / (maxX - minX + pad * 2), 110 / (maxY - minY + pad * 2), 0.6);
            const tx = px => x + (px - minX + pad) * scale;
            const ty = py => y + (py - minY + pad) * scale;

            for (const rc of roomRects) {
                doc.setFillColor(240, 247, 249); doc.setDrawColor(...PDF_TEAL); doc.setLineWidth(0.4);
                doc.roundedRect(tx(rc.x), ty(rc.y), rc.w * scale, rc.h * scale, 1, 1, 'FD');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(...PDF_INK);
                doc.text(String(rc.room.name || 'Raum'), tx(rc.x + rc.w / 2), ty(rc.y) + 4, { align: 'center', maxWidth: rc.w * scale - 2 });
                doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6); doc.setTextColor(...PDF_GRAY);
                doc.text(`${rc.room.length}×${rc.room.width} m`, tx(rc.x + rc.w / 2), ty(rc.y) + 7.4, { align: 'center' });
            }
            for (const it of items.filter(i => i.type === 'line')) {
                const k = PLAN_LINE_KINDS[it.kind] || PLAN_LINE_KINDS.pipe;
                const rgb = k.color.match(/#(..)(..)(..)/).slice(1).map(h => parseInt(h, 16));
                doc.setDrawColor(...rgb); doc.setLineWidth(Math.max(0.3, k.width * scale * 0.45));
                if (k.dash) doc.setLineDashPattern([1.2, 1], 0); else doc.setLineDashPattern([], 0);
                for (let i = 1; i < it.points.length; i++) {
                    doc.line(tx(it.points[i - 1][0]), ty(it.points[i - 1][1]), tx(it.points[i][0]), ty(it.points[i][1]));
                }
                if (it.kind !== 'wall' && it.kind !== 'measure') {
                    const mid = it.points[Math.floor(it.points.length / 2)];
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.4); doc.setTextColor(...rgb);
                    doc.text(`${String(planLineMeters(it)).replace('.', ',')} m`, tx(mid[0]), ty(mid[1]) - 1, { align: 'center' });
                }
            }
            doc.setLineDashPattern([], 0);
            const SYM_CODE = { door: 'T', window: 'F', wallUnit: 'IG', ceilingUnit: 'DK', ductUnit: 'KG', underCeiling: 'UD', floorUnit: 'TG', outdoorUnit: 'AG', outdoorMulti: 'AG-M', outdoorVRF: 'VRF', coreDrill: 'KB', wallBreak: 'MD', socket: 'SD', fuse: 'SI', photo: 'FO', note: 'N' };
            for (const it of items.filter(i => i.type === 'symbol')) {
                doc.setFillColor(255, 255, 255); doc.setDrawColor(...PDF_TEAL); doc.setLineWidth(0.35);
                doc.circle(tx(it.x), ty(it.y), 3.1, 'FD');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(4.8); doc.setTextColor(...PDF_TEAL);
                doc.text(SYM_CODE[it.sym] || '?', tx(it.x), ty(it.y) + 1.6, { align: 'center' });
            }
            let ly = y + (maxY - minY + pad * 2) * scale + 5;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); doc.setTextColor(...PDF_GRAY);
            doc.text('Legende: IG Innengerät · DK Deckenkassette · KG Kanalgerät · AG Außengerät · KB Kernbohrung · MD Mauerdurchbruch · T Tür · F Fenster · SD Steckdose · SI Sicherung', x, ly, { maxWidth: maxW });
            return ly + 8;
        }

        // ---------- Plan -> Räume & Material übernehmen ----------
        const planApplyExtensions = {
            // Gewünschte Auto-Materialien eines Raums aus dessen Technikdaten
            _roomWantedMaterials(tech) {
                const num = v => (typeof v === 'number' && v > 0 ? v : 0);
                const L = num(tech.pipeLength);
                const wanted = [];
                if (L > 0) {
                    wanted.push({ name: 'Kupferrohr', size: tech.pipeDimension || '', qty: L, unit: 'm', category: 'Kupferrohre' });
                    wanted.push({ name: 'Rohrisolierung', size: tech.insulation || '', qty: L, unit: 'm', category: 'Isolierung' });
                    wanted.push({ name: 'Kondensatschlauch', size: '', qty: num(tech.condensateLine) || L, unit: 'm', category: 'Kondensat' });
                    wanted.push({ name: 'Stromkabel', size: tech.powerCable || '', qty: num(tech.powerCableLength) || (L + 1), unit: 'm', category: 'Kabel' });
                    wanted.push({ name: 'Kommunikationskabel', size: tech.commCable || '', qty: num(tech.commCableLength) || (L + 1), unit: 'm', category: 'Kabel' });
                    wanted.push({ name: 'Kabelkanal', size: '', qty: num(tech.cableDuct) || L, unit: 'm', category: 'Elektromaterial' });
                }
                if (tech.condensatePump === true) wanted.push({ name: 'Kondensatpumpe', size: '', qty: 1, unit: 'Stk', category: 'Kondensat' });
                if (tech.devManufacturer) {
                    wanted.push({ name: `Innengerät ${tech.devManufacturer}`, size: tech.devModel || (num(tech.devCapacity) ? `${tech.devCapacity} kW` : ''), qty: 1, unit: 'Stk', category: 'Klimageräte' });
                }
                if (tech.bigFoot === true) wanted.push({ name: 'Big Foot Konsole', size: '', qty: 1, unit: 'Set', category: 'Befestigung' });
                if (tech.wallBracket === true) wanted.push({ name: 'Wandkonsole Außengerät', size: '', qty: 1, unit: 'Stk', category: 'Befestigung' });
                if (tech.vibrationDampers === true) wanted.push({ name: 'Schwingungsdämpfer', size: '', qty: 1, unit: 'Set', category: 'Befestigung' });
                return wanted;
            },

            // Auto-Positionen eines Raums anlegen UND bestehende automatische Mengen aktualisieren
            async _syncRoomAutoMaterials(projectId, roomId, roomName, tech) {
                const wanted = this._roomWantedMaterials(tech);
                if (!wanted.length) return 0;
                const existing = ((await db.getByIndex('projectMaterials', 'projectId', projectId)) || []).filter(x => String(x.roomId) === String(roomId));
                let changed = 0;
                for (const w of wanted) {
                    const mat = await this._ensureCatalogMaterial(w.name, w.size, w.category, w.unit);
                    // Dubletten-Regel: gleiches Material + gleiche Einheit + gleicher Raum = EINE Position,
                    // egal ob sie von der Raum- oder der Projekt-Automatik stammt
                    const ex = existing.find(x => String(x.materialId) === String(mat.id)
                        && (x.unit || 'Stk') === w.unit
                        && String(x.roomId ?? '') === String(roomId ?? ''));
                    if (ex) {
                        if ((ex.note || '').includes('automatisch') && Number(ex.quantity) !== w.qty) {
                            ex.quantity = w.qty;
                            await db.put('projectMaterials', ex);
                            changed++;
                        }
                    } else {
                        await db.add('projectMaterials', { projectId, materialId: mat.id, roomId, quantity: w.qty, unit: w.unit, size: w.size || '', price: matUnitPrice(mat, w.unit), note: `${roomName} – automatisch` });
                        changed++;
                    }
                }
                return changed;
            },

            // Gezeichnete Leitungen/Symbole des Plans in die Räume + Materialliste übernehmen
            async applyPlanToProject(projectId, silent = false) {
                const project = await db.get('projects', projectId);
                if (!project) return;
                const plan = (project.plan && Array.isArray(project.plan.items)) ? project.plan : { items: [] };
                const rooms = (await db.getByIndex('rooms', 'projectId', projectId)) || [];
                if (!plan.items.length || !rooms.length) { if (!silent) showToast('Kein Plan bzw. keine Räume vorhanden.', 'info'); return; }

                // Je Raum: Längen aller Linienarten + Kernbohrungen zählen
                const perRoom = new Map(rooms.map(r => [String(r.id), { pipe: 0, power: 0, comm: 0, duct: 0, cond: 0, drills: 0 }]));
                const roomOf = (px, py) => planRoomAt(plan, rooms, px, py);
                for (const it of plan.items) {
                    if (it.type === 'line' && PLAN_LINE_KINDS[it.kind]?.techKey) {
                        const mid = it.points[Math.floor(it.points.length / 2)];
                        const r = roomOf(it.points[0][0], it.points[0][1]) || roomOf(mid[0], mid[1]);
                        if (!r) continue;
                        const acc = perRoom.get(String(r.id));
                        const m = planLineMeters(it);
                        if (it.kind === 'pipe') acc.pipe += m;
                        else if (it.kind === 'power') acc.power += m;
                        else if (it.kind === 'comm') acc.comm += m;
                        else if (it.kind === 'duct') acc.duct += m;
                        else if (it.kind === 'condensate') acc.cond += m;
                    } else if (it.type === 'symbol' && (it.sym === 'coreDrill' || it.sym === 'wallBreak')) {
                        const r = roomOf(it.x, it.y);
                        if (r) perRoom.get(String(r.id)).drills += 1;
                    }
                }

                const r1 = v => Math.round(v * 10) / 10;
                let updatedRooms = 0, changedMat = 0;
                for (const room of rooms) {
                    const acc = perRoom.get(String(room.id));
                    const tech = { ...(room.tech || {}) };
                    let dirty = false;
                    const setIf = (key, val) => { if (val > 0 && tech[key] !== r1(val)) { tech[key] = r1(val); dirty = true; } };
                    setIf('pipeLength', acc.pipe);
                    setIf('powerCableLength', acc.power);
                    setIf('commCableLength', acc.comm);
                    setIf('cableDuct', acc.duct);
                    setIf('condensateLine', acc.cond);
                    if (acc.drills > 0 && tech.coreDrills !== acc.drills) { tech.coreDrills = acc.drills; dirty = true; }
                    if (dirty) {
                        await db.put('rooms', { ...room, tech });
                        updatedRooms++;
                    }
                    changedMat += await this._syncRoomAutoMaterials(projectId, room.id, room.name || 'Raum', tech);
                }

                await refreshProjectSummary(projectId);
                if (!silent) {
                    showToast(`Plan übernommen: ${updatedRooms} Raum/Räume aktualisiert, ${changedMat} Materialposition(en) angepasst.`, 'success');
                    app.navigate('projects', projectId);
                } else if (updatedRooms > 0 || changedMat > 0) {
                    planUpdateStatus(`🔄 ${updatedRooms} Räume · ${changedMat} Material automatisch aktualisiert`);
                    setTimeout(() => planUpdateStatus(), 2200);
                }
            }
        };

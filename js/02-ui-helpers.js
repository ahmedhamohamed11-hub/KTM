

        const PAGE_TITLES = {
            dashboard: 'Dashboard', customers: 'Kunden', projects: 'Projekte',
            calendar: 'Kalender', materials: 'Materialien', offers: 'Angebote',
            orders: 'Bestellungen', invoices: 'Rechnungen', settings: 'Einstellungen', backup: 'Backup', fields: 'Felder & Kategorien',
            calc: 'Schnellrechner', equipment: 'Anlagen', maintenance: 'Wartung'
        };
        function setPageTitle(page) {
            const el = document.getElementById('pageTitle');
            if (el) el.textContent = PAGE_TITLES[page] || 'KTM';
            // Kategorien/Felder still im Hintergrund aktualisieren (Realtime-Sync)
            if (typeof loadCustomization === 'function') loadCustomization().catch(() => {});
        }
        function updateBottomNav(page) {
            document.querySelectorAll('#bottomNav button[data-bnav]').forEach(b => {
                b.classList.toggle('active', b.dataset.bnav === page);
            });
        }
        async function refreshAvatar() {
            try {
                const name = await getSetting('companyName', '');
                const el = document.getElementById('userAvatar');
                if (!el) return;
                if (name && name.trim()) {
                    const parts = name.trim().split(/\s+/);
                    el.textContent = (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
                } else {
                    el.textContent = 'KT';
                }
            } catch (e) { /* ignorieren */ }
        }
        async function refreshBellDot() {
            try {
                const events = await db.getAll('events');
                const todayStr = toLocalDateString(new Date());
                const hasToday = events.some(ev => ev.date === todayStr);
                const dot = document.getElementById('bellDot');
                if (dot) dot.style.display = hasToday ? 'block' : 'none';
            } catch (e) { /* ignorieren */ }
        }

        function orderStatusClass(status) {
            const map = { 'Offen': 'status-offen', 'Bestellt': 'status-aktiv', 'Geliefert': 'status-fertig', 'Storniert': 'status-danger' };
            return map[status] || 'status-offen';
        }

        // Lokale Filterzustände der Listenseiten
        const listFilters = {
            customers: { q: '' },
            materials: { q: '' },
            offers: { q: '', status: '' },
            orders: { q: '', status: '' },
            invoices: { q: '', status: '' }
        };

        // ============================================================
        // ============ KALENDER ======================================
        // ============================================================
        function renderCalendar() {
            (async () => {
                const events = await db.getAll('events');
                const projects = await db.getAll('projects');
                const customers = await db.getAll('customers');

                const year = calendarViewDate.getFullYear();
                const month = calendarViewDate.getMonth();
                const monthLabel = calendarViewDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

                const eventsByDate = {};
                for (const ev of events) {
                    if (!ev.date) continue;
                    (eventsByDate[ev.date] = eventsByDate[ev.date] || []).push(ev);
                }

                const firstOfMonth = new Date(year, month, 1);
                const startOffset = (firstOfMonth.getDay() + 6) % 7;
                const gridStart = new Date(year, month, 1 - startOffset);
                const totalCells = 42;
                const todayStr = toLocalDateString(new Date());

                let cellsHtml = '';
                for (let i = 0; i < totalCells; i++) {
                    const cellDate = new Date(gridStart);
                    cellDate.setDate(gridStart.getDate() + i);
                    const cellStr = toLocalDateString(cellDate);
                    const inMonth = cellDate.getMonth() === month;
                    const dayEvents = (eventsByDate[cellStr] || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                    const visible = dayEvents.slice(0, 2);
                    const more = dayEvents.length - visible.length;

                    cellsHtml += `
                        <div class="calendar-day ${inMonth ? '' : 'other-month'} ${cellStr === todayStr ? 'today' : ''}" onclick="app.openEventModal(null, '${cellStr}')">
                            <div class="cal-day-num">${cellDate.getDate()}</div>
                            ${visible.map(ev => `<div class="cal-event-pill ${eventTypeClass(ev.type)}" onclick="event.stopPropagation();app.openEventModal(${idJS(ev.id)})">${ev.time ? escapeHtml(ev.time) + ' ' : ''}${escapeHtml(ev.title)}</div>`).join('')}
                            ${more > 0 ? `<div class="cal-more">+${more}</div>` : ''}
                            ${dayEvents.length > 0 ? '<div class="cal-dot"></div>' : ''}
                        </div>
                    `;
                }

                const weekdays = ['Mo','Di','Mi','Do','Fr','Sa','So'];

                const upcoming = events
                    .filter(ev => ev.date >= todayStr)
                    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
                    .slice(0, 10);

                const upcomingHtml = upcoming.length === 0
                    ? '<div class="cal-side-empty">Keine Termine geplant.</div>'
                    : upcoming.map(ev => {
                        const d = new Date(ev.date);
                        const proj = ev.projectId ? projects.find(p => String(p.id) === String(ev.projectId)) : null;
                        const cust = ev.customerId ? customers.find(c => String(c.id) === String(ev.customerId)) : null;
                        const metaParts = [ev.time, proj?.title, cust ? `${cust.firstName} ${cust.lastName}` : null].filter(Boolean);
                        return `
                            <div class="event-list-item">
                                <div class="event-date-box"><div class="ed-day">${d.getDate()}</div><div class="ed-month">${d.toLocaleDateString('de-DE',{month:'short'})}</div></div>
                                <div class="event-info">
                                    <div class="event-title">${escapeHtml(ev.title)}</div>
                                    <div class="event-meta">${escapeHtml(metaParts.join(' · ')) || escapeHtml(ev.type || 'Termin')}</div>
                                </div>
                                <button class="icon-btn" style="width:32px;height:32px;" onclick="app.openEventModal(${idJS(ev.id)})">${icon('edit')}</button>
                                <button class="icon-btn" style="width:32px;height:32px;color:var(--danger);" onclick="app.deleteEvent(${idJS(ev.id)})">${icon('trash')}</button>
                            </div>
                        `;
                    }).join('');

                contentArea.innerHTML = `
                    <div class="calendar-header">
                        <span class="cal-month-label">${monthLabel}</span>
                        <div class="calendar-nav">
                            <button class="btn btn-outline btn-sm" onclick="app.calendarShiftMonth(-1)">‹</button>
                            <button class="btn btn-outline btn-sm" onclick="app.calendarGoToday()">Heute</button>
                            <button class="btn btn-outline btn-sm" onclick="app.calendarShiftMonth(1)">›</button>
                        </div>
                        <div class="toolbar-spacer"></div>
                        <button class="btn btn-primary" onclick="app.openEventModal()">${icon('plus')} Termin</button>
                    </div>
                    <div class="cal-layout">
                        <div class="calendar-grid">
                            ${weekdays.map(w => `<div class="calendar-weekday">${w}</div>`).join('')}
                            ${cellsHtml}
                        </div>
                        <div class="panel">
                            <div class="panel-title">${icon('calendar')} Anstehende Termine</div>
                            ${upcomingHtml}
                        </div>
                    </div>
                `;
            })();
        }

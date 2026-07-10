
        // ============================================================
        // ============ SUPABASE CONFIG & HELPER ======================
        // ============================================================
        const SUPABASE_URL = 'https://byajcepqydkyoegztcgj.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_s3zhy_TO4KWnVQN1XSYDHg_zcOwA6Qn';

        // Supabase wird defensiv initialisiert: Falls das CDN-Script (z.B. wegen
        // fehlender Internetverbindung) nicht lädt, darf die App trotzdem starten.
        let sb = null;
        let supabaseAvailable = false;
        try {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                supabaseAvailable = true;
            } else {
                console.warn('Supabase SDK nicht geladen – App läuft im Offline-/Lokal-Modus.');
            }
        } catch (e) {
            console.warn('Supabase-Initialisierung fehlgeschlagen:', e);
        }
// Lokale Store-Namen -> Supabase-Tabellennamen (snake_case)
        const TABLE_MAP = { projectMaterials: 'project_materials' };
        const sbTable = (t) => TABLE_MAP[t] || t;
        const localStore = (t) => Object.keys(TABLE_MAP).find(k => TABLE_MAP[k] === t) || t;

        const FIELD_MAP = {
  firstName: 'first_name',
  lastName: 'last_name',
  houseNumber: 'house_number',
  customerId: 'customer_id',
  projectId: 'project_id',

  articleNumber: 'article_number',
  purchasePrice: 'purchase_price',
  sellingPrice: 'selling_price',
  materialId: 'material_id',
  roomId: 'room_id',
  customData: 'custom_data',
  invoiceNumber: 'invoice_number',
  offerId: 'offer_id',
  dueDate: 'due_date',
  skontoRate: 'skonto_rate',
  skontoDays: 'skonto_days',
  minStock: 'min_stock',

  offerNumber: 'offer_number',
  offerDate: 'offer_date',
  validUntil: 'valid_until',
  validUntilEnabled: 'valid_until_enabled',

  vatEnabled: 'vat_enabled',
  vatRate: 'vat_rate',
  vatAmount: 'vat_amount',

  discountEnabled: 'discount_enabled',
  discountRate: 'discount_rate',
  discountAmount: 'discount_amount',

  netAfterDiscount: 'net_after_discount',

  totalPrice: 'total_price',
  coolingRecommendation: 'cooling_recommendation',
  coolingDetails: 'cooling_details',

  contactPerson: 'contact_person',
  contactPhone: 'contact_phone',
  contactEmail: 'contact_email',

  siteAddress: 'site_address',

  createdAt: 'created_at',
  updatedAt: 'updated_at'
};
        const REVERSE_MAP = Object.fromEntries(Object.entries(FIELD_MAP).map(([k,v])=>[v,k]));
function toSnake(o) {
    const r = {};
    for (const k in o) {
        if (['_synced', '_remote', 'rooms', 'images', 'offers'].includes(k)) continue;
        r[FIELD_MAP[k] || k] = o[k];
    }
    return r;
}

        function toCamel(o) {
            const r={};
            for(const k in o) r[REVERSE_MAP[k]||k]=o[k];
            return r;
        }

        function updateSyncStatus(status, text) {
            const el = document.getElementById('syncStatus');
            if(el) {
                el.textContent = text;
                el.style.color = status === 'online' ? 'var(--success)' : (status === 'syncing' ? 'var(--warning)' : 'var(--text-muted)');
            }
        }

        // ============================================================
        // ============ DATENBANK-MANAGER (KOMPLETT KORRIGIERT) =======
        // ============================================================
        class DatabaseManager {
            constructor() { this.db = null; }

            init() {
                return new Promise((resolve, reject) => {
                    if (!('indexedDB' in window)) {
                        reject(new Error('IndexedDB wird von diesem Browser nicht unterstützt.'));
                        return;
                    }
                    const req = indexedDB.open('KTM_DB', 7);
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        ['customers', 'projects', 'rooms', 'images', 'materials', 'offers', 'orders', 'projectMaterials', 'invoices', 'settings', 'events'].forEach(s => {
                            if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: s === 'settings' ? 'key' : 'id', autoIncrement: s !== 'settings' });
                        });
                    };
                    req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
                    req.onerror = (e) => {
                        const err = e.target.error;
                        if (err && err.name === 'VersionError') {
                            reject(new Error('Es existiert bereits eine neuere lokale Datenbank in diesem Browser. Bitte lade die aktuellste Version der App, oder leere im Zweifel die Website-Daten für diese Seite (Browser-Einstellungen).'));
                            return;
                        }
                        reject(err || new Error('IndexedDB konnte nicht geöffnet werden.'));
                    };
                    req.onblocked = () => reject(new Error('Datenbank-Upgrade blockiert. Bitte alle anderen Tabs dieser App schließen.'));
                });
            }

            async addLocalOnly(storeName, data) {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction(storeName, 'readwrite');
                    const request = tx.objectStore(storeName).add(data);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            }

            async putLocalOnly(storeName, data) {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction(storeName, 'readwrite');
                    const request = tx.objectStore(storeName).put(data);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            }

            async deleteLocalOnly(storeName, id) {
                return new Promise((resolve, reject) => {
                    if (id === undefined || id === null) { resolve(); return; }
                    const tx = this.db.transaction(storeName, 'readwrite');
                    const request = tx.objectStore(storeName).delete(id);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }

            async get(storeName, id) {
                return new Promise((resolve, reject) => {
                    if (id === undefined || id === null) { resolve(undefined); return; }
                    const tx = this.db.transaction(storeName, 'readonly');
                    const request = tx.objectStore(storeName).get(id);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            }

            async getAll(storeName) {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction(storeName, 'readonly');
                    const request = tx.objectStore(storeName).getAll();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            }

            async getByIndex(storeName, indexName, value) {
                return new Promise((resolve, reject) => {
                    if (value === undefined || value === null) { resolve([]); return; }
                    const tx = this.db.transaction(storeName, 'readonly');
                    const request = tx.objectStore(storeName).getAll();
                    request.onsuccess = () => {
                        // String-Vergleich statt strikter Typgleichheit: verhindert, dass
                        // Datensätze wegen number-vs-string ID-Typen (Alt-Daten vs. neue
                        // UUID-Strings) fälschlich nicht gefunden werden.
                        const results = request.result.filter(item => item[indexName] !== undefined && item[indexName] !== null && String(item[indexName]) === String(value));
                        resolve(results);
                    };
                    request.onerror = () => reject(request.error);
                });
            }

            async clear(storeName) {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction(storeName, 'readwrite');
                    const request = tx.objectStore(storeName).clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }

            async add(storeName, data) {
                data._synced = false;
                data.createdAt = data.createdAt || new Date().toISOString();
                data.updatedAt = new Date().toISOString();

                // Die ID wird VOR dem Insert client-seitig als UUID vergeben (statt sich
                // auf den lokalen IndexedDB autoIncrement-Zähler zu verlassen). So hat ein
                // neuer Datensatz von Anfang an dieselbe ID lokal und in Supabase - es gibt
                // keine ID-Umschreibung nach dem Sync mehr und damit auch keine Race-Conditions
                // bei verknüpften Datensätzen (z.B. ein Raum, der kurz nach dem Projekt angelegt wird).
                if (storeName !== 'settings' && !data.id) {
                    data.id = generateUUID();
                }

                const result = await this.addLocalOnly(storeName, data);

                backgroundSyncPush(); // queued automatisch nach, falls gerade ein Push läuft

                return storeName === 'settings' ? result : data.id;
            }

async put(storeName, data) {
    data._synced = false;
    data.updatedAt = new Date().toISOString();

    const result = await this.putLocalOnly(storeName, data);

    backgroundSyncPush(); // queued automatisch nach, falls gerade ein Push läuft

    return result;
}

         async delete(storeName, id) {

    await this.deleteLocalOnly(storeName, id);

    if (!navigator.onLine || !supabaseAvailable) {
        // Offline gelöscht: die Löschung merken, damit sie sobald wir wieder
        // online sind nachgeholt wird. Ohne das würde die Löschung nie zu den
        // anderen Geräten gelangen - genau der gemeldete Bug "Löschungen
        // propagieren nicht".
        await addPendingDelete(storeName, id);
        return;
    }

    try {

        const { error } = await sb
            .from(storeName)
            .delete()
            .eq(storeName === 'settings' ? 'key' : 'id', id);

        if (error) {
            console.error(error);
            await addPendingDelete(storeName, id);
        }

    } catch (e) {
        console.error(e);
        await addPendingDelete(storeName, id);
    }

}

            async getProjectWithDetails(projectId) {
    const project = await this.get('projects', projectId);
    if (!project) return null;
    const rooms = await this.getByIndex('rooms', 'projectId', projectId);
    const images = await this.getByIndex('images', 'projectId', projectId);
    const offers = await this.getByIndex('offers', 'projectId', projectId);
    return {
        ...project,
        rooms,
        images,
        offers
    };
}

            async exportAllData() {
                return {
                    customers: await this.getAll('customers'),
                    projects: await this.getAll('projects'),
                    rooms: await this.getAll('rooms'),
                    images: await this.getAll('images'),
                    materials: await this.getAll('materials'),
                    offers: await this.getAll('offers'),
                    events: await this.getAll('events'),
                    orders: await this.getAll('orders'),
                    projectMaterials: await this.getAll('projectMaterials'),
                    invoices: await this.getAll('invoices'),
                    settings: await this.getAll('settings'),
                    exportDate: new Date().toISOString(),
                    version: '2.0'
                };
            }

            async importAllData(data) {
                for(const s of ['customers','projects','rooms','images','materials','offers','orders','projectMaterials','invoices','settings','events']) await this.clear(s);
                for (const c of data.customers || []) await this.addLocalOnly('customers', c);
                for (const p of data.projects || []) await this.addLocalOnly('projects', p);
                for (const r of data.rooms || []) await this.addLocalOnly('rooms', r);
                for (const i of data.images || []) await this.addLocalOnly('images', i);
                for (const m of data.materials || []) await this.addLocalOnly('materials', m);
                for (const o of data.offers || []) await this.addLocalOnly('offers', o);
                for (const ev of data.events || []) await this.addLocalOnly('events', ev);
                for (const o of data.orders || []) await this.addLocalOnly('orders', o);
                for (const pm of data.projectMaterials || []) await this.addLocalOnly('projectMaterials', pm);
                for (const iv of data.invoices || []) await this.addLocalOnly('invoices', iv);
                for (const s of data.settings || []) await this.putLocalOnly('settings', s);
                backgroundSyncPush();
            }
        }

        const db = new DatabaseManager();

        async function handleRemoteChange(payload) {
          try {
            const { eventType, new: newRec, old: oldRec } = payload;
            const table = localStore(payload.table);
            console.log("Supabase Live Update:", eventType, table);

            if (eventType === 'DELETE') {
                await db.deleteLocalOnly(table, oldRec.key || oldRec.id);
            } else {
               const localData = toCamel(newRec);

const existing = await db.get(table, localData.id ?? localData.key);

if (
    existing &&
    existing.updatedAt &&
    localData.updatedAt &&
    new Date(existing.updatedAt) >= new Date(localData.updatedAt)
) {
    return;
}

localData._synced = true;
localData._remote = true;

await db.putLocalOnly(table, localData);
            }
            app.navigate(app.currentPage, app.currentProjectId);
          } catch (e) {
            console.warn('Live-Update konnte nicht verarbeitet werden:', e, payload);
          }
        }

        function initRealtime() {
            if (!supabaseAvailable) return;
            try {
                sb.channel('public-changes')
                    .on('postgres_changes', { event: '*', schema: 'public' }, handleRemoteChange)
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            updateSyncStatus('online', '🟢 Live');
                        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                            updateSyncStatus('offline', '🟡 Live-Sync gestört');
                        }
                    });
            } catch (e) {
                console.warn('Realtime konnte nicht gestartet werden:', e);
            }
        }

        async function initialFullSync() {
            if (!supabaseAvailable) {
                updateSyncStatus('offline', '⚪ Lokal (kein Supabase)');
                return;
            }
            updateSyncStatus('syncing', '🔄 Syncing...');
            if (!navigator.onLine) {
                updateSyncStatus('offline', '🔴 Offline');
                return;
            }
            try {
                await backgroundSyncPush();

                const failedTables = [];
                for (const t of ['customers','projects','rooms','images','materials','offers','orders','projectMaterials','invoices','events','settings']) {
                    const { data, error } = await sb.from(sbTable(t)).select('*');
                    if (!error && data) {
                        const remoteIds = new Set(data.map(r => String(t === 'settings' ? r.key : r.id)));
                        for (const row of data) {
                            const localData = toCamel(row);
                            localData._synced = true;
                            localData._remote = true;
                            await db.putLocalOnly(t, localData);
                        }
                        // ECHTE LÖSCH-SYNCHRONISATION: Was auf dem Server nicht mehr
                        // existiert, aber lokal als "synchronisiert" markiert ist, wurde
                        // von einem anderen Gerät gelöscht -> lokal ebenfalls entfernen.
                        // Lokale, noch nie gepushte Datensätze (_synced !== true) bleiben.
                        const localRows = await db.getAll(t);
                        for (const rec of localRows) {
                            const key = t === 'settings' ? rec.key : rec.id;
                            if (key === undefined || key === null) continue;
                            if (t === 'settings' && typeof key === 'string' && key.startsWith('_')) continue;
                            if (rec._synced === true && !remoteIds.has(String(key))) {
                                await db.deleteLocalOnly(t, key);
                            }
                        }
                    } else if (error) {
                        console.warn(`Sync-Fehler bei Tabelle "${t}":`, error.message);
                        failedTables.push({ table: t, message: error.message });
                    }
                }
                await reconcileOfferCounter();

                if (failedTables.length > 0) {
                    updateSyncStatus('offline', '🟡 Sync unvollständig');
                    const details = failedTables.map(f => `${f.table}: ${f.message}`).join(' | ');
                    console.error('Folgende Tabellen konnten nicht synchronisiert werden:', details);
                    showToast(`Sync unvollständig (${failedTables.length} Tabelle${failedTables.length > 1 ? 'n' : ''}). Details in der Konsole (F12).`, 'error');
                } else {
                    updateSyncStatus('online', '🟢 Online');
                }
                app.navigate(app.currentPage, app.currentProjectId);
            } catch(e) {
                console.error("Sync Error:", e);
                updateSyncStatus('offline', '🔴 Sync Fehler');
                showToast(`Synchronisierung fehlgeschlagen: ${e.message || e}`, 'error');
            }
        }

// ============================================================
// ============ OFFLINE-LÖSCH-WARTESCHLANGE ===================
// ============================================================
// Löschungen, die offline (oder wegen eines Netzwerkfehlers) nicht sofort an
// Supabase gesendet werden konnten, landen hier zwischengespeichert und werden
// beim nächsten erfolgreichen Sync nachgeholt. Der Schlüssel beginnt bewusst
// mit "_", damit backgroundSyncPushInner ihn nie selbst synchronisiert
// (siehe Filter dort) - sonst würden sich mehrere Geräte gegenseitig ihre
// Löschwarteschlange überschreiben.
const PENDING_DELETES_KEY = '_pendingDeletes';

async function getPendingDeletes() {
    try {
        const rec = await db.get('settings', PENDING_DELETES_KEY);
        return rec?.value ? JSON.parse(rec.value) : [];
    } catch (e) {
        return [];
    }
}

async function addPendingDelete(table, id) {
    if (id === undefined || id === null) return;
    const list = await getPendingDeletes();
    if (list.some(item => item.table === table && item.id === id)) return;
    list.push({ table, id });
    await db.putLocalOnly('settings', { key: PENDING_DELETES_KEY, value: JSON.stringify(list) });
}

async function flushPendingDeletes() {
    if (!navigator.onLine || !supabaseAvailable) return;
    const list = await getPendingDeletes();
    if (!list.length) return;
    const remaining = [];
    for (const item of list) {
        try {
            const { error } = await sb.from(sbTable(item.table)).delete().eq(item.table === 'settings' ? 'key' : 'id', item.id);
            if (error) {
                console.warn('Nachgeholte Löschung fehlgeschlagen:', item, error.message);
                remaining.push(item);
            }
        } catch (e) {
            remaining.push(item);
        }
    }
    await db.putLocalOnly('settings', { key: PENDING_DELETES_KEY, value: JSON.stringify(remaining) });
}

const _pushErrorsWarned = new Set();

let isSyncing = false;

let syncQueued = false;
async function backgroundSyncPush() {

    if (isSyncing) { syncQueued = true; return; }
    if (!navigator.onLine || !supabaseAvailable) return;

    isSyncing = true;

    try {
        await backgroundSyncPushInner();
    } catch(e) {
        console.warn('Sync Push Fehler:', e);
    } finally {
        // KRITISCH: isSyncing muss in JEDEM Fall zurückgesetzt werden - im
        // Original fehlte dieser Reset komplett, wodurch nach dem allerersten
        // Push-Vorgang für den Rest der Sitzung *nie wieder* synchronisiert wurde
        // (jeder weitere Aufruf von db.add()/db.put() wurde durch "if (!isSyncing)"
        // stillschweigend übersprungen). Das war vermutlich die Hauptursache dafür,
        // dass Räume, Angebote und Materialien nach einer Weile nicht mehr synchronisierten.
        isSyncing = false;
        if (syncQueued) { syncQueued = false; setTimeout(() => backgroundSyncPush(), 60); }
    }
}

async function backgroundSyncPushInner() {
        // Zuerst offline aufgelaufene Löschungen nachholen, bevor neue/geänderte
        // Datensätze gepusht werden (sonst könnte ein gelöschter Datensatz durch
        // einen späteren Push versehentlich wieder auftauchen).
        await flushPendingDeletes();

        for (const t of ['customers','projects','rooms','images','materials','offers','orders','projectMaterials','invoices','events','settings']) {

            const unsynced = (await db.getAll(t)).filter(r => {
                if (r._synced) return false;
                // Rein lokale Meta-Einträge (Schlüssel beginnt mit "_") nie synchronisieren -
                // z.B. die Pending-Delete-Queue, die pro Gerät unterschiedlich ist.
                if (t === 'settings' && typeof r.key === 'string' && r.key.startsWith('_')) return false;
                return true;
            });

            const handled = new Set();

            const filtered = unsynced.filter(r => {
                const key = r.id ?? r.key ?? JSON.stringify(r);

                if (handled.has(key)) return false;

                handled.add(key);
                return true;
            });

            for (const rec of filtered) {

                const p = toSnake(rec);

                // Die ID wird seit der UUID-Umstellung immer schon beim Erstellen lokal
                // vergeben (siehe DatabaseManager.add). Ein upsert mit onConflict=id
                // funktioniert daher sowohl für's erste Einfügen als auch für Updates -
                // es gibt keinen Fall mehr, in dem die ID nach dem Sync wechselt.
                const { data, error } = await sb.from(sbTable(t))
                    .upsert(p, { onConflict: t === 'settings' ? 'key' : 'id' })
                    .select();

                if (!error && data?.length) {
                    // WICHTIG: Nicht blind zurückschreiben - der Datensatz kann sich
                    // WÄHREND des Pushs lokal geändert haben (z. B. schnelle Eingaben,
                    // Plan-Editor). Nur als synchronisiert markieren, wenn er noch dem
                    // gepushten Stand entspricht - sonst bleibt er unsynced und der
                    // nächste Push überträgt die neuere Version.
                    const curKey = t === 'settings' ? rec.key : rec.id;
                    const current = await db.get(t, curKey);
                    const same = current && ((current.updatedAt && rec.updatedAt)
                        ? current.updatedAt === rec.updatedAt
                        : JSON.stringify(current.value ?? current) === JSON.stringify(rec.value ?? rec));
                    if (same) {
                        current._synced = true;
                        current._remote = true;
                        await db.putLocalOnly(t, current);
                    }
                } else if (error) {
                    console.warn(`Sync-Push-Fehler bei Tabelle "${t}":`, error.message);
                    if (!_pushErrorsWarned.has(t)) {
                        _pushErrorsWarned.add(t);
                        showToast(`"${t}" konnte nicht synchronisiert werden: ${error.message}`, 'error');
                    }
                }
            }
        }
}

        function calculateCoolingCapacity(rooms) {
            if (!rooms || rooms.length === 0) return { totalKW: 0, recommendation: null, details: [] };

            let totalWatts = 0;
            const details = [];

            for (const room of rooms) {
                const area = (room.length || 0) * (room.width || 0);
                const volume = area * (room.height || 2.5);

                let wattsPerSqm = 80;
                if (room.name && (room.name.toLowerCase().includes('dach') || room.name.toLowerCase().includes('wintergarten'))) {
                    wattsPerSqm = 120;
                }
                if (room.name && room.name.toLowerCase().includes('keller')) {
                    wattsPerSqm = 60;
                }

                const roomWatts = area * wattsPerSqm;
                totalWatts += roomWatts;

                details.push({
                    roomName: room.name || 'Unbenannt',
                    area: Math.round(area * 100) / 100,
                    volume: Math.round(volume * 100) / 100,
                    wattsPerSqm,
                    estimatedKW: Math.round(roomWatts / 100) / 10
                });
            }

            const totalKW = Math.round(totalWatts / 100) / 10;
            const availableSizes = [2.0, 2.5, 3.5, 4.2, 5.0, 6.0, 7.1, 8.5, 10.0];

            let recommendation = availableSizes[0];
            for (const size of availableSizes) {
                if (size >= totalKW) { recommendation = size; break; }
            }
            if (totalKW > availableSizes[availableSizes.length - 1]) {
                recommendation = availableSizes[availableSizes.length - 1];
            }

            return { totalKW, recommendation, details };
        }

        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            const icons = { success: '✅', error: '❌', info: 'ℹ️' };
            toast.innerHTML = `${icons[type] || ''} ${(message)}`;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        function formatCurrency(amount) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount || 0); }
        function formatDate(isoString) { return !isoString ? '-' : new Date(isoString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

        function toLocalDateString(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
        function getStatusClass(status) {
            const map = {
                'Neu': 'status-neu', 'Besichtigung offen': 'status-offen', 'Besichtigt': 'status-offen',
                'Angebot offen': 'status-offen', 'Angebot gesendet': 'status-aktiv', 'Auftrag erhalten': 'status-aktiv',
                'Material bestellt': 'status-aktiv', 'Montage geplant': 'status-aktiv', 'Montage läuft': 'status-aktiv',
                'Fertig': 'status-fertig', 'Archiv': 'status-fertig'
            };
            return map[status] || 'status-neu';
        }

        function showModal(title, contentHtml, onSave, onCancel, opts = {}) {
            const container = document.getElementById('modalContainer');
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal ${opts.wide ? 'modal-wide' : ''}">
                    <h3>${title}</h3>
                    <div class="modal-body">${contentHtml}</div>
                    <div class="modal-actions">
                        <button class="btn btn-outline cancel-btn">Abbrechen</button>
                        ${onSave ? '<button class="btn btn-primary save-btn">Speichern</button>' : ''}
                    </div>
                </div>
            `;
            container.appendChild(overlay);

            overlay.querySelector('.cancel-btn')?.addEventListener('click', () => {
                overlay.remove();
                if (onCancel) onCancel();
            });
            overlay.querySelector('.save-btn')?.addEventListener('click', () => {
                if (onSave) onSave(overlay);
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) { overlay.remove(); if (onCancel) onCancel(); }
            });
            return overlay;
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str ?? '';
            return div.innerHTML;
        }
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
        function generateUUID() {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                return window.crypto.randomUUID();
            }
            // Fallback für sehr alte Browser / unsichere Kontexte (kein HTTPS/localhost)
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        function idJS(id) {
            if (typeof id === 'number') return String(id);
            return "'" + String(id).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
        }
        function parseId(value) {
            if (value === null || value === undefined || value === '') return null;
            return /^\d+$/.test(value) ? Number(value) : value;
        }

        async function getSetting(key, fallback = '') {
            const rec = await db.get('settings', key);
            return rec?.value ?? fallback;
        }
        async function setSetting(key, value) {
            await db.put('settings', { key, value });
        }

        const MATERIAL_CATEGORIES = ['Klimageräte','Außengeräte','Multisplit','Wärmepumpen','Kupferrohre','Isolierung','Kabel','Kondensat','Elektromaterial','Befestigung','Arbeitszeit','Anfahrt','Zubehör','Sonstiges'];
const OFFER_DEFAULTS = {
    autoNumber: true,
    lastNumber: 0,
    defaultVatRate: 0.20,
    vatEnabled: true,
    validUntilEnabled: true,
    defaultValidDays: 14,
    defaultDiscount: 0,
};

async function loadOfferDefaults() {
    const defaults = { ...OFFER_DEFAULTS };
    for (const key of Object.keys(defaults)) {
        const val = await getSetting(`offerDefault_${key}`, null);
        if (val !== null) {
            if (typeof defaults[key] === 'boolean') defaults[key] = val === 'true';
            else if (typeof defaults[key] === 'number') defaults[key] = Number(val);
            else defaults[key] = val;
        }
    }
    return defaults;
}

async function saveOfferDefault(key, value) {
    await setSetting(`offerDefault_${key}`, String(value));
}

async function getNextAutoNumber() {
    const year = new Date().getFullYear();
    const counterKey = `offerCounter_${year}`;
    let counter = parseInt(await getSetting(counterKey, '0')) || 0;
    counter += 1;
    await setSetting(counterKey, String(counter));
    return `A-${year}-${String(counter).padStart(4, '0')}`;
}

async function isOfferNumberUnique(number, excludeId = null) {
    const allOffers = await db.getAll('offers');
    return !allOffers.some(o => o.offerNumber === number && o.id !== excludeId);
}

// Jedes Gerät führt seinen eigenen Angebots-Zähler lokal - ohne Abgleich können
// zwei Geräte offline zufällig dieselbe Angebotsnummer vergeben ("Angebote
// duplizieren sich"). Nach jedem vollständigen Sync ziehen wir den lokalen
// Zähler auf den höchsten bekannten Wert nach, sodass neue Nummern auf allen
// Geräten fortlaufend über dem zuletzt gesehenen Höchstwert liegen.
async function reconcileOfferCounter() {
    try {
        const allOffers = await db.getAll('offers');
        const year = new Date().getFullYear();
        const prefix = `A-${year}-`;
        let maxNum = 0;
        for (const o of allOffers) {
            if (o.offerNumber && o.offerNumber.startsWith(prefix)) {
                const n = parseInt(o.offerNumber.slice(prefix.length), 10);
                if (!isNaN(n) && n > maxNum) maxNum = n;
            }
        }
        const counterKey = `offerCounter_${year}`;
        const localCounter = parseInt(await getSetting(counterKey, '0')) || 0;
        if (maxNum > localCounter) {
            await setSetting(counterKey, String(maxNum));
        }
    } catch (e) {
        console.warn('Angebots-Zähler-Abgleich fehlgeschlagen:', e);
    }
}
        const contentArea = document.getElementById('contentArea');

        let calendarViewDate = new Date();

        function eventTypeClass(type) {
            const map = { 'Besichtigung': 'type-besichtigung', 'Montage': 'type-montage', 'Wartung': 'type-wartung' };
            return map[type] || '';
        }

        function eventTypeBadgeClass(type) {
            const map = { 'Besichtigung': 'status-offen', 'Montage': 'status-aktiv', 'Wartung': 'status-neu', 'Sonstiges': 'status-fertig' };
            return map[type] || 'status-neu';
        }

        // ============================================================
        // ============ UI v3 – ICONS, TITEL, NAVIGATION ==============
        // ============================================================
        const ICONS = {
            users: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
            briefcase: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
            file: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
            cart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
            calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
            euro: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/></svg>',
            box: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
            activity: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
            search: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
            edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
            trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
            pdf: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>',
            copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
            plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
            sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.3 11.3 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
            moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
            clock: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
        };
        function icon(name) { return ICONS[name] || ''; }

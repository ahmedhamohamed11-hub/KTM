
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
        const TABLE_MAP = { projectMaterials: 'project_materials', refrigerantLog: 'refrigerant_log' };
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
  bundleLength: 'bundle_length',

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
  netPrice: 'net_price',
  calcData: 'calc_data',
  variantOf: 'variant_of',

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
                    // Sicherheitsnetz: Wenn IndexedDB nicht innerhalb von 6 Sekunden
                    // antwortet (kein success/error/blocked), brechen wir ab, damit
                    // die App nicht ewig im Ladebildschirm hängt.
                    let settled = false;
                    const done = (fn, arg) => { if (settled) return; settled = true; clearTimeout(watchdog); fn(arg); };
                    const watchdog = setTimeout(() => {
                        done(reject, new Error('Datenbank antwortet nicht (Zeitüberschreitung).'));
                    }, 6000);

                    const req = indexedDB.open('KTM_DB', 9);
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        ['customers', 'projects', 'rooms', 'images', 'materials', 'offers', 'orders', 'projectMaterials', 'invoices', 'settings', 'events', 'equipment', 'refrigerantLog', 'maintenance', 'catalogPages'].forEach(s => {
                            if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: s === 'settings' ? 'key' : 'id', autoIncrement: s !== 'settings' });
                        });
                    };
                    req.onsuccess = (e) => { this.db = e.target.result; done(resolve); };
                    req.onerror = (e) => {
                        const err = e.target.error;
                        if (err && err.name === 'VersionError') {
                            done(reject, new Error('Es existiert bereits eine neuere lokale Datenbank in diesem Browser. Bitte lade die aktuellste Version der App, oder leere im Zweifel die Website-Daten für diese Seite (Browser-Einstellungen).'));
                            return;
                        }
                        done(reject, err || new Error('IndexedDB konnte nicht geöffnet werden.'));
                    };
                    req.onblocked = () => done(reject, new Error('Datenbank-Upgrade blockiert. Bitte alle anderen Tabs dieser App schließen.'));
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
                for(const s of ['customers','projects','rooms','images','materials','offers','orders','projectMaterials','invoices','settings','events','equipment','refrigerantLog','maintenance','catalogPages']) await this.clear(s);
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

localData._synced = true; localData._pushedAt = localData._pushedAt || new Date().toISOString();
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
                for (const t of ['customers','projects','rooms','images','materials','offers','orders','projectMaterials','invoices','events','equipment','refrigerantLog','maintenance','settings']) {
                    const { data, error } = await sb.from(sbTable(t)).select('*');
                    if (!error && data) {
                        const remoteIds = new Set(data.map(r => String(t === 'settings' ? r.key : r.id)));
                        for (const row of data) {
                            const localData = toCamel(row);
                            localData._synced = true; localData._pushedAt = localData._pushedAt || new Date().toISOString();
                            localData._remote = true;
                            await db.putLocalOnly(t, localData);
                        }
                        // HINWEIS (Datenverlust-Fix): Früher wurden hier lokale
                        // Datensätze gelöscht, die auf dem Server fehlten. Das war die
                        // Ursache für verlorene Materialien/Anlagen: Kam der Server-Pull
                        // leer zurück (RLS, fehlende Spalte, Netzfehler), wurden frisch
                        // angelegte Datensätze fälschlich als "remote gelöscht" behandelt
                        // und lokal entfernt. Echte Löschungen laufen zuverlässig über
                        // die explizite Lösch-Warteschlange (deletePendingQueue) auf
                        // allen Geräten. Automatisches lokales Löschen entfällt daher –
                        // lokale Daten bleiben immer erhalten, bis sie bewusst gelöscht
                        // werden.
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

        for (const t of ['customers','projects','rooms','images','materials','offers','orders','projectMaterials','invoices','events','equipment','refrigerantLog','maintenance','settings']) {

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

                // Mandantentrennung: jeden Datensatz dem angemeldeten Benutzer
                // zuordnen, damit die RLS-Policy (tenant_id = auth.uid()) greift.
                if (window.__ktmAuth && window.__ktmAuth.userId) {
                    p.tenant_id = window.__ktmAuth.userId;
                }

                // Die ID wird seit der UUID-Umstellung immer schon beim Erstellen lokal
                // vergeben (siehe DatabaseManager.add). Ein upsert mit onConflict=id
                // funktioniert daher sowohl für's erste Einfügen als auch für Updates -
                // es gibt keinen Fall mehr, in dem die ID nach dem Sync wechselt.
                let { data, error } = await sb.from(sbTable(t))
                    .upsert(p, { onConflict: t === 'settings' ? 'key' : 'id' })
                    .select();

                // SELBSTHEILUNG: Kennt die Datenbank eine Spalte noch nicht
                // ("Could not find the 'xy' column"), entfernen wir genau dieses
                // Feld und versuchen es erneut - so lange, bis der Datensatz passt.
                // Dadurch synchronisiert die App auch mit einer DB, der einzelne
                // (neue) Spalten fehlen, statt den ganzen Datensatz abzulehnen.
                let guard = 0;
                while (error && /Could not find the '(\w+)' column/.test(error.message) && guard < 25) {
                    guard++;
                    const miss = error.message.match(/Could not find the '(\w+)' column/)[1];
                    // Im Einzelnutzer-Modus ist tenant_id nicht nötig - fehlt die
                    // Spalte, einfach weglassen und weitermachen.
                    delete p[miss];
                    ({ data, error } = await sb.from(sbTable(t))
                        .upsert(p, { onConflict: t === 'settings' ? 'key' : 'id' })
                        .select());
                }

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
                        current._pushedAt = new Date().toISOString();   // Nachweis: erfolgreich zum Server gepusht
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

        // Toast mit "Rückgängig"-Knopf – ruft onUndo, wenn innerhalb von 6 Sek. geklickt
        function showUndoToast(message, onUndo) {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = 'toast toast-info toast-undo';
            const btn = document.createElement('button');
            btn.className = 'toast-undo-btn';
            btn.textContent = 'Rückgängig';
            toast.innerHTML = `↩️ ${message} `;
            toast.appendChild(btn);
            container.appendChild(toast);
            let done = false;
            const finish = () => { if (done) return; done = true; toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); };
            btn.addEventListener('click', async () => { if (done) return; done = true; toast.remove(); try { await onUndo(); } catch (e) { showToast('Wiederherstellen fehlgeschlagen.', 'error'); } });
            setTimeout(finish, 6000);
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
            overlay.querySelector('.save-btn')?.addEventListener('click', async (e) => {
                if (!onSave) return;
                const btn = e.currentTarget;
                if (btn.dataset.saving === '1') return;   // Doppelklick-Schutz
                btn.dataset.saving = '1';
                btn.disabled = true;
                const origText = btn.textContent;
                btn.textContent = 'Speichert…';
                try {
                    await onSave(overlay);
                } finally {
                    // Modal evtl. schon entfernt – nur zurücksetzen, wenn es noch da ist
                    if (document.body.contains(btn)) {
                        btn.dataset.saving = '';
                        btn.disabled = false;
                        btn.textContent = origText;
                    }
                }
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) { overlay.remove(); if (onCancel) onCancel(); }
            });
            return overlay;
        }

        // Schöne Bestätigungs-Abfrage im App-Design (statt hässlichem System-confirm).
        function showConfirm(message, opts = {}) {
            return new Promise((resolve) => {
                const container = document.getElementById('modalContainer');
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                const danger = opts.danger !== false;
                overlay.innerHTML = `
                    <div class="modal modal-confirm">
                        <h3>${opts.title || 'Bestätigen'}</h3>
                        <div class="modal-body"><p style="font-size:14px;line-height:1.5;margin:0;">${message}</p></div>
                        <div class="modal-actions">
                            <button class="btn btn-outline confirm-no">${opts.cancelText || 'Abbrechen'}</button>
                            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} confirm-yes">${opts.okText || 'Löschen'}</button>
                        </div>
                    </div>`;
                container.appendChild(overlay);
                const close = (val) => { overlay.remove(); resolve(val); };
                overlay.querySelector('.confirm-no').addEventListener('click', () => close(false));
                overlay.querySelector('.confirm-yes').addEventListener('click', () => close(true));
                overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
            });
        }

        // Drei-Wege-Dialog bei Preisänderung im Angebot:
        // 'permanent' (dauerhaft in Materialdatenbank), 'once' (nur dieses Angebot), 'cancel'
        function showPriceSaveDialog(name, oldPrice, newPrice) {
            return new Promise((resolve) => {
                const container = document.getElementById('modalContainer');
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                const fmt = v => (typeof formatCurrency === 'function') ? formatCurrency(v) : (Number(v).toFixed(2) + ' €');
                overlay.innerHTML = `
                    <div class="modal modal-confirm">
                        <h3>Preisänderung speichern?</h3>
                        <div class="modal-body">
                            <p style="font-size:14px;line-height:1.5;margin:0 0 10px;">Du hast den Verkaufspreis von <strong>${escapeHtml(name)}</strong> geändert:</p>
                            <div style="display:flex;gap:10px;align-items:center;font-size:14px;margin-bottom:4px;">
                                <span style="text-decoration:line-through;color:var(--text-muted);">${fmt(oldPrice)}</span>
                                <span>→</span>
                                <strong style="color:var(--accent);">${fmt(newPrice)}</strong>
                            </div>
                            <p style="font-size:13px;color:var(--text-muted);line-height:1.45;margin:8px 0 0;">Soll dieser neue Preis dauerhaft in der Materialdatenbank gespeichert werden (gilt dann für alle künftigen Angebote)?</p>
                        </div>
                        <div class="modal-actions" style="flex-wrap:wrap;">
                            <button class="btn btn-outline" data-choice="cancel">Abbrechen</button>
                            <button class="btn btn-outline" data-choice="once">Nur dieses Angebot</button>
                            <button class="btn btn-primary" data-choice="permanent">Ja, dauerhaft speichern</button>
                        </div>
                    </div>`;
                container.appendChild(overlay);
                const close = (val) => { overlay.remove(); resolve(val); };
                overlay.querySelectorAll('[data-choice]').forEach(b => b.addEventListener('click', () => close(b.dataset.choice)));
                overlay.addEventListener('click', (e) => { if (e.target === overlay) close('once'); });
            });
        }
        window.showPriceSaveDialog = showPriceSaveDialog;

        // Sicherheits-Fix (gefunden beim App-Audit): escapeHtml() escapte bisher nur
        // &, < und > (das reicht für reinen Textinhalt, z.B. <div>${escapeHtml(x)}</div>).
        // Im ganzen Code wird das Ergebnis aber auch massenhaft in doppelt gequotete
        // HTML-Attribute eingesetzt (value="${escapeHtml(x)}", data-x="${escapeHtml(x)}",
        // onclick="...('${escapeHtml(x)}')" usw.). Enthält der Wert ein " (z.B. ein
        // Kategorie- oder Materialname mit Anführungszeichen), bricht er aus dem
        // Attribut aus und der Rest wird als neues HTML/Attribut interpretiert
        // (Attribut-Injection - reproduziert und verifiziert beim App-Audit).
        // Zusätzliches Escapen von " ist in reinem Textinhalt folgenlos (wird dort nie
        // ausgewertet) und macht escapeHtml() dadurch für Text- UND Attribut-Kontext
        // sicher, ohne jede Aufrufstelle einzeln anzupassen.
        // WICHTIG: ' bewusst NICHT mit-escapen. Etliche Aufrufstellen im Code hängen
        // zusätzlich .replace(/'/g, "\\'") an escapeHtml() an, um innerhalb von
        // onclick="...('...')" ein JS-String-Escaping herzustellen. Da " (der äußere
        // HTML-Attribut-Delimiter) hier bereits sicher ist, ist ein rohes ' im
        // JS-String-Kontext unkritisch für die HTML-Ebene; würde escapeHtml() es zu
        // &#39; kodieren, würde der Browser das beim Attribut-Parsen wieder zu einem
        // rohen ' dekodieren, BEVOR die JS-Engine den Onclick-Code liest - der
        // nachgelagerte .replace(/'/g, "\\'") liefe dann ins Leere und die Browser-
        // seitige Dekodierung würde den JS-String erneut vorzeitig beenden (Namen mit
        // Apostroph, z.B. "d'Anjou", hätten dann kaputte onclick-Handler).
        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str ?? '';
            return div.innerHTML.replace(/"/g, '&quot;');
        }

        // PDF teilen (natives Teilen-Menü: WhatsApp, E-Mail, ...) oder speichern.
        async function sharePdfDoc(doc, fileName, title) {
            try {
                const blob = doc.output('blob');
                const file = new File([blob], fileName, { type: 'application/pdf' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: title || fileName });
                    return;
                }
            } catch (e) {
                if (e && e.name === 'AbortError') return; // Nutzer hat bewusst abgebrochen
            }
            try { doc.save(fileName); showToast('PDF gespeichert (Teilen auf diesem Gerät nicht möglich).', 'info'); }
            catch (e) { showToast('PDF konnte nicht erstellt werden.', 'error'); }
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
        // Rechnet ein Angebot IMMER frisch aus den Positionen durch.
        // Rechenreihenfolge: Rabatt auf Netto, dann MwSt pro Position.
        // Klimageraete (Klimaanlagen, Klimageraete, Innen/Aussengeraete): immer 20% MwSt.
        // Alle anderen Positionen: MwSt-Rate aus dem Angebot (vatRate), wenn vatEnabled.
        function recomputeOffer(offer) {
            const positions = offer.positions || [];
            const KLIMA = new Set(['Klimaanlagen','Klimageräte','Klimageraete','Innengeräte','Innengeraete','Außengeräte','Aussengeraete','Multisplit-Systeme']);
            const vatBase = offer.vatEnabled !== false ? (Number(offer.vatRate) || 0.20) : 0;

            // Umsatzsteuersatz je Position - EINE Regel fuer Anzeige und Summe:
            // Material und Geraete immer 20 %, Arbeitsleistung nach Schalter.
            const vatOf = p => (typeof posVatRate === 'function') ? posVatRate(p, offer)
                : (KLIMA.has((p.category || '').trim()) ? 0.20 : vatBase);
            // KEINE doppelte USt: ist priceIncludesVat gesetzt, ist der Preis bereits
            // ein Bruttopreis. Dann wird daraus der Nettowert herausgerechnet statt
            // nochmals 20 % aufgeschlagen.
            const netUnit = p => {
                const pr = Number(p.price) || 0;
                if (!p.priceIncludesVat) return pr;
                const r = vatOf(p);
                return r > 0 ? pr / (1 + r) : pr;
            };

            // Netto pro Position nach Positions-Rabatt
            const netPerPos = positions.map(p =>
                netUnit(p) * (Number(p.quantity) || 0) * (1 - (Number(p.discount) || 0) / 100)
            );
            const gross = positions.reduce((s, p) =>
                s + netUnit(p) * (Number(p.quantity) || 0), 0);
            const net = netPerPos.reduce((s, v) => s + v, 0);
            const posDiscount = gross - net;

            // Gesamt-Rabatt laeuft auf das MATERIAL. Die Arbeitsleistung steht im
            // Angebot als eigener Betrag nach dem Rabatt und wird nicht rabattiert.
            let rate = Number(offer.discountRate) || 0;
            if (rate > 1) rate = rate / 100;
            const discountEnabled = !!offer.discountEnabled && rate > 0;
            const isLabor = p => (typeof isLaborPos === 'function') ? isLaborPos(p) : false;

            let netMaterial = 0, netLabor = 0, vatMaterialFull = 0, vatLabor = 0;
            positions.forEach((p, i) => {
                const r = vatOf(p);
                if (isLabor(p)) { netLabor += netPerPos[i]; vatLabor += netPerPos[i] * r; }
                else            { netMaterial += netPerPos[i]; vatMaterialFull += netPerPos[i] * r; }
            });

            // Bruttowerte - so steht es im Angebot: Material inkl. USt., davon Rabatt,
            // Arbeitsleistung separat, Summe daraus.
            const grossMaterial = netMaterial + vatMaterialFull;
            const grossLabor    = netLabor + vatLabor;
            const grossDiscount = discountEnabled ? grossMaterial * rate : 0;
            const total         = grossMaterial - grossDiscount + grossLabor;

            // Nettowerte fuer die interne Kalkulation
            const globalDiscount = discountEnabled ? netMaterial * rate : 0;
            const netAfter  = netMaterial - globalDiscount + netLabor;
            const vatAmount = vatMaterialFull * (1 - (discountEnabled ? rate : 0)) + vatLabor;
            const vatRate   = vatBase;

            return { gross, net, posDiscount, rate, discountEnabled, globalDiscount, netAfter,
                     vatRate, vatAmount, total,
                     netMaterial, netLabor, vatLabor, grossMaterial, grossLabor, grossDiscount };
        }

        // Baut den Anzeigenamen eines Kunden inkl. Anrede + Titel zusammen.
        // "Herr Dr. Max Mustermann" – Firma-Kunden zeigen die Firma.
        function customerDisplayName(c, opts = {}) {
            if (!c) return opts.fallback || '–';
            const nameParts = [c.salutation && c.salutation !== 'Firma' ? c.salutation : '', c.title || '', c.firstName || '', c.lastName || ''].filter(Boolean);
            const personName = nameParts.join(' ').trim();
            if (personName) return personName;
            if (c.company) return c.company;
            if (c.phone) return c.phone;
            return opts.fallback || '–';
        }
        window.customerDisplayName = customerDisplayName;

        function parseId(value) {
            if (value === null || value === undefined || value === '') return null;
            return /^\d+$/.test(value) ? Number(value) : value;
        }

        // ===== Zentrale EK-Ermittlung =====
        // Der hinterlegte Prozentwert ist IMMER der RABATT auf den Netto-Listenpreis,
        // nie der Einkaufsanteil.  EK-Anteil = 100 - Rabatt.
        //     ekNetto  = listenpreisNetto * (100 - rabatt) / 100
        //     ekBrutto = ekNetto * 1,20
        //
        // Reihenfolge (bewusst: tatsaechlicher EK schlaegt jede Rechnung):
        //   1. manuell eingetragener tatsaechlicher EK (purchasePrice)  -> quelle 'ist'
        //   2. individueller Artikelrabatt (dealerDiscount)             -> quelle 'kalk'
        //   3. Markenrabatt aus den Einstellungen (je Hersteller!)      -> quelle 'kalk'
        //   4. sonst NICHTS - es wird kein EK erfunden                  -> quelle 'keiner'
        // Markenrabatte gelten ausschliesslich fuer die jeweilige Marke, nie global.
        const EK_VAT = 1.20;
        function ekInfo(m, dealerDiscounts) {
            const leer = { ekNetto: 0, ekBrutto: 0, quelle: 'keiner', rabatt: null, anteil: null, listenpreis: 0 };
            if (!m) return leer;
            const list = Number(m.sellingPrice) || 0;
            const norm = d => { d = Number(d) || 0; return d > 1 ? d : d * 100; };   // immer in Prozent

            // 1. tatsaechlicher EK hat Vorrang
            const ist = Number(m.purchasePrice) || 0;
            if (ist > 0) {
                return { ekNetto: ist, ekBrutto: ist * EK_VAT, quelle: 'ist',
                         rabatt: list > 0 ? Math.round((1 - ist / list) * 1000) / 10 : null,
                         anteil: list > 0 ? Math.round((ist / list) * 1000) / 10 : null, listenpreis: list };
            }
            if (!(list > 0)) return leer;

            // 2./3. Rabatt: erst Artikel, dann Marke
            let rabatt = null;
            if (m.dealerDiscount != null && m.dealerDiscount !== '') rabatt = norm(m.dealerDiscount);
            if (rabatt == null) {
                const brand = (m.manufacturer || '').trim();
                const dd = dealerDiscounts || window.__ktmDealerDiscounts || {};
                if (brand && dd[brand] != null && dd[brand] !== '') rabatt = norm(dd[brand]);
            }
            if (rabatt == null || !(rabatt > 0)) return { ...leer, listenpreis: list };

            const anteil = 100 - rabatt;
            const ekNetto = list * anteil / 100;
            return { ekNetto, ekBrutto: ekNetto * EK_VAT, quelle: 'kalk',
                     rabatt: Math.round(rabatt * 10) / 10, anteil: Math.round(anteil * 10) / 10, listenpreis: list };
        }
        // ===== Materialpreise als Endpreise inkl. 20 % =====
        // sellingPrice bleibt INTERN der Netto-Listenpreis - der Haendlerrabatt ist
        // darauf definiert und die Kalkulation braucht ihn. Fuer Anzeige und Angebot
        // liefert matBrutto() den fertigen Preis inkl. USt.
        // Ist priceIncludesVat am Material gesetzt, wurde der Preis bereits brutto
        // erfasst und wird NICHT nochmals multipliziert.
        const MAT_VAT = 0.20;
        function matNetto(m) {
            const p = Number(m?.sellingPrice) || 0;
            return m?.priceIncludesVat ? p / (1 + MAT_VAT) : p;
        }
        function matBrutto(m) {
            const p = Number(m?.sellingPrice) || 0;
            return m?.priceIncludesVat ? p : p * (1 + MAT_VAT);
        }
        // Anzeigepreis einer Angebotsposition = IMMER Endpreis inkl. USt.
        // Positionen mit priceIncludesVat sind bereits brutto und bleiben unveraendert;
        // aeltere Positionen (vor der Umstellung) sind netto gespeichert und werden
        // nur fuer die Anzeige hochgerechnet - der gespeicherte Wert bleibt netto.
        // Steuersatz einer Position. MATERIAL UND GERAETE immer 20 % - deren Preise
        // sind Endpreise inkl. USt., unabhaengig vom MwSt-Schalter des Angebots.
        // Nur Arbeitsleistung folgt dem Schalter (z.B. steuerfreie Abrechnung).
        // Massgeblich ist die KATEGORIE (MAT_CAT_META.vat), nicht der Artikelname.
        // Nur wenn gar keine Kategorie gesetzt ist, wird der Name herangezogen.
        function isLaborPos(p) {
            const cat = (p?.category || '').trim();
            if (cat && typeof MAT_CAT_META !== 'undefined' && MAT_CAT_META[cat]) {
                return MAT_CAT_META[cat].vat === false;
            }
            if (cat) return cat.toLowerCase() === 'arbeitsleistung';
            const n = (p?.name || '').toLowerCase();
            return n.includes('arbeitsleistung') || n.includes('montagepauschale')
                || n.includes('arbeitsstunde') || n.includes('anfahrt')
                || n.includes('inbetriebnahme') || n.includes('leitungsverlegung');
        }
        function posVatRate(p, offer) {
            if (isLaborPos(p)) return (offer && offer.vatEnabled === false) ? 0 : (Number(offer?.vatRate) || 0.20);
            return 0.20;
        }
        window.isLaborPos = isLaborPos;
        window.posVatRate = posVatRate;

        function posDisplayPrice(p, offer) {
            const pr = Number(p?.price) || 0;
            if (p?.priceIncludesVat) return pr;
            return pr * (1 + posVatRate(p, offer));
        }
        window.posDisplayPrice = posDisplayPrice;

        window.matNetto = matNetto;
        window.matBrutto = matBrutto;
        window.MAT_VAT = MAT_VAT;

        window.ekInfo = ekInfo;
        window.EK_VAT = EK_VAT;

        // Rueckwaertskompatible Huelle - liefert weiterhin nur den EK-Nettobetrag.
        function effectivePurchasePrice(m, dealerDiscounts) {
            return ekInfo(m, dealerDiscounts).ekNetto;
        }
        window.effectivePurchasePrice = effectivePurchasePrice;

        // Zentrale, EINZIGE Stelle für die Umrechnung Einkaufseinheit -> Verkaufseinheit.
        // Grund: Bei Rollen-/Bund-/Stangenware (z.B. Kupferrohr) wird EINGEKAUFT pro
        // Rolle, aber VERKAUFT pro Meter. Wird der Rollen-EK direkt mit der Meter-Menge
        // multipliziert, entsteht ein um ein Vielfaches zu hoher "Einkauf" -> unrealistischer
        // oder stark negativer Gewinn (Ursache des gemeldeten Fehlers). Jede Stelle, die
        // einen Gewinn/EK je Position berechnet, MUSS diese Funktion nutzen statt eigener
        // Kopien - sonst wird ein hier behobener Bug an anderer Stelle erneut eingebaut.
        // Gibt EK PRO VERKAUFTER EINHEIT zurück (z.B. € je Meter statt € je Rolle).
        function ekPerSalesUnit(m, dealerDiscounts) {
            if (!m) return { ek: 0, known: false, quelle: 'keiner' };
            const info = ekInfo(m, dealerDiscounts);
            const ekPack = info.ekNetto;
            if (!(ekPack > 0)) return { ek: 0, known: false, quelle: 'keiner' };
            const bl = Number(m.bundleLength) || 0;
            const isPack = ['Rolle', 'Bund', 'Stange'].includes(m.unit || '') && bl > 0;
            // quelle: 'ist' = tatsaechlich eingekauft, 'kalk' = aus Rabatt gerechnet
            return { ek: isPack ? ekPack / bl : ekPack, known: true, quelle: info.quelle };
        }
        window.ekPerSalesUnit = ekPerSalesUnit;

        // Bucht den Verbrauch von Metern bei Rollen-/Bund-/Stangen-Material.
        // stock = Anzahl ganzer Rollen, openMeters = Rest der angebrochenen Rolle.
        // Reicht der offene Rest nicht, wird automatisch eine Rolle angebrochen
        // (stock −1, openMeters += Rollenlänge). Bei 0 m ist die Rolle verbraucht.
        // Gibt {ok, rollsUsed, remainingOpen, remainingRolls} zurück.
        // Buchungen werden serialisiert (Warteschlange), damit schnelle
        // Folgebuchungen sich nicht gegenseitig überschreiben.
        let __bookQueue = Promise.resolve();
        function bookMeterConsumption(materialId, meters) {
            const run = () => _bookMeterNow(materialId, meters);
            const p = __bookQueue.then(run, run);
            __bookQueue = p.catch(() => {});
            return p;
        }
        async function _bookMeterNow(materialId, meters) {
            const m = await db.get('materials', materialId);
            if (!m) return { ok: false, reason: 'not_found' };
            const need = Number(meters) || 0;
            if (need <= 0) return { ok: false, reason: 'zero' };
            const bl = Number(m.bundleLength) || 0;
            const isRoll = ['Rolle', 'Bund', 'Stange'].includes(m.unit || '') && bl > 0;
            if (!isRoll) {
                m.stock = Math.max(0, (Number(m.stock) || 0) - need);
                await db.put('materials', m);
                return { ok: true, rollsUsed: 0, remainingOpen: 0, remainingRolls: m.stock };
            }
            let rolls = Number(m.stock) || 0;
            let open = Number(m.openMeters) || 0;
            let rollsUsed = 0;
            let remaining = need;
            while (remaining > 0.0001) {
                if (open <= 0.0001) {
                    if (rolls <= 0) break;
                    rolls -= 1;
                    rollsUsed += 1;
                    open = bl;
                }
                const take = Math.min(open, remaining);
                open -= take;
                remaining -= take;
            }
            m.stock = rolls;
            m.openMeters = Math.round(open * 1000) / 1000;
            await db.put('materials', m);
            return { ok: remaining <= 0.0001, shortfall: Math.max(0, remaining), rollsUsed, remainingOpen: m.openMeters, remainingRolls: rolls };
        }
        window.bookMeterConsumption = bookMeterConsumption;

        async function getDealerDiscounts() {
            if (window.__ktmDealerDiscounts) return window.__ktmDealerDiscounts;
            const raw = await getSetting('dealerDiscounts', '');
            let map = {};
            try { map = raw ? JSON.parse(raw) : {}; } catch (e) { map = {}; }
            window.__ktmDealerDiscounts = map;
            return map;
        }

        async function getSetting(key, fallback = '') {
            const rec = await db.get('settings', key);
            return rec?.value ?? fallback;
        }
        async function setSetting(key, value) {
            await db.put('settings', { key, value });
        }

        // Hauptkategorien für Kälte- und Klimatechnik (alphabetisch, mit Icon)
        // Klimageräte sind speziell: Navigation geht Hersteller → Single/Multi → kW → Paar
        const MATERIAL_CATEGORIES = [
            'Arbeitsleistung',
            'Befestigung & Montage',
            'Elektroinstallation',
            'Kabelkanäle',
            'Kältemittel',
            'Klimageräte',
            'Kondensat',
            'Kupfer & Rohrsysteme',
            'Steuerung & Regelung',
            'Zubehör',
        ];
        // vat: true  = Materialkategorie -> Einzelpreis immer inkl. 20 % USt.
        // vat: false = Arbeitsleistung   -> eigener Betrag, folgt dem MwSt-Schalter,
        //                                   kein Material-Aufschlag, kein Rabatt
        const MAT_CAT_META = {
            'Arbeitsleistung':      { icon: '⏱️', vat: false },
            'Befestigung & Montage':{ icon: '🔩', vat: true  },
            'Elektroinstallation':  { icon: '⚡', vat: true  },
            'Kabelkanäle':          { icon: '📦', vat: true  },
            'Kältemittel':          { icon: '❄️', vat: true  },
            'Klimageräte':          { icon: '🌡️', vat: true  },
            'Kondensat':            { icon: '💧', vat: true  },
            'Kupfer & Rohrsysteme': { icon: '🔧', vat: true  },
            'Steuerung & Regelung': { icon: '🎛️', vat: true  },
            'Zubehör':              { icon: '🗂️', vat: true  },
        };
        window.MAT_CAT_META = MAT_CAT_META;

        // Automatisches Kategorie-Mapping (für Migration + neues Material-Anlegen)
        const KLIMA_BAUARTS = new Set([
            'Innengerät Single-Split','Außengerät Single-Split',
            'Innengerät Multi-Split','Außengerät Multi-Split',
            'Truhengerät','Klimaset'
        ]);
        const KLIMA_CATS_OLD = new Set([
            'Klimaanlagen','Klimageräte','Innengeräte','Außengeräte',
            'Multisplit-Systeme','Multi Split','VRF-Systeme'
        ]);
        function autoCategory(m) {
            // 1. Bauart-Erkennung (Klimageräte)
            if (KLIMA_BAUARTS.has(m.bauart || '')) return 'Klimageräte';
            // 2. Alte Klimakategorie
            if (KLIMA_CATS_OLD.has(m.category || '')) return 'Klimageräte';
            // 3. Keyword-Matching auf Name
            const n = (m.name || '').toLowerCase();
            const c = (m.category || '').toLowerCase();
            if (/kabel(?!kanal)|leitung|nym|h05|h07|kommunikationskabel|ls-schalter|fi-schalter|relais|schütz|klemm|sicherung/.test(n)) return 'Elektroinstallation';
            if (/kabelkanal|formteil|abdeckung/.test(n) || c === 'kabelkanäle') return 'Kabelkanäle';
            if (/kupferrohr|rohr|fitting|bördelwerkzeug|lötmaterial|isolier|armaflex|kautschuk/.test(n) || /kupfer|isolierung/.test(c)) return 'Kupfer & Rohrsysteme';
            if (/kältemittel|kälteöl|lecksuch|stickstoff|r32|r410|r454|r744|co2/.test(n) || c === 'kältemittel') return 'Kältemittel';
            if (/wandhalter|bodenkonsole|big foot|schwingung|schraube|dübel|schelle|kabelbinder|gewindestange|konsole/.test(n) || /befestigung|montagemat/.test(c)) return 'Befestigung & Montage';
            if (/kondensatschlauch|kondensatpumpe|kondensatwanne/.test(n) || c === 'kondensat') return 'Kondensat';
            if (/steuerung|thermostat|regler|sensor|fernbedienung|knx|modbus|wlan.*klima/.test(n) || c === 'steuerungen') return 'Steuerung & Regelung';
            if (/montage|inbetriebnahme|wartung|kernbohrung|elektroanschluss|anfahrt|arbeitsstunde/.test(n) || /arbeitszeit|anfahrt/.test(c)) return 'Arbeitsleistung';
            if (c === 'arbeitsleistung' || c === 'arbeitszeit') return 'Arbeitsleistung';
            if (c === 'elektroinstallation') return 'Elektroinstallation';
            if (c === 'kupfer & rohrsysteme') return 'Kupfer & Rohrsysteme';
            if (c === 'befestigung & montage' || c === 'befestigung') return 'Befestigung & Montage';
            if (c === 'steuerung & regelung') return 'Steuerung & Regelung';
            // Bekannte neue Kategorien direkt durchreichen
            if (MATERIAL_CATEGORIES.includes(m.category || '')) return m.category;
            return 'Zubehör';
        }
        window.autoCategory = autoCategory;
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

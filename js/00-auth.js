// ============================================================================
// KTM Auth – Benutzerverwaltung, Login, Registrierung, Mandantentrennung
// ============================================================================
// Läuft VOR der App-Initialisierung. Die App wird erst gestartet, wenn ein
// gültiger Benutzer angemeldet ist. Jeder Benutzer bekommt über Supabase Auth
// eine eigene ID (tenant_id), die serverseitig per RLS erzwingt, dass er nur
// seine eigenen Daten sieht.
// ============================================================================

(function () {
    'use strict';

    const SUPABASE_URL = 'https://byajcepqydkyoegztcgj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_s3zhy_TO4KWnVQN1XSYDHg_zcOwA6Qn';

    // Eigener Auth-Client (die App nutzt später denselben, siehe window.__ktmAuth)
    let authClient = null;
    try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            authClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ktm-auth' }
            });
        }
    } catch (e) {
        console.warn('Auth-Client konnte nicht erstellt werden:', e);
    }

    // Zustand der Auth-Maske: 'login' | 'register' | 'reset'
    let mode = 'login';

    const $ = (id) => document.getElementById(id);

    function showError(msg) {
        const el = $('authError');
        if (!el) return;
        el.textContent = msg;
        el.style.display = msg ? 'block' : 'none';
    }

    // Fehlermeldungen von Supabase in verständliches Deutsch übersetzen
    function humanError(err) {
        const m = (err && err.message ? err.message : String(err || '')).toLowerCase();
        if (m.includes('invalid login')) return 'E-Mail oder Passwort ist falsch.';
        if (m.includes('already registered') || m.includes('already been registered')) return 'Diese E-Mail ist bereits registriert. Bitte einloggen.';
        if (m.includes('password should be at least')) return 'Das Passwort muss mindestens 6 Zeichen haben.';
        if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Bitte eine gültige E-Mail-Adresse eingeben.';
        if (m.includes('email not confirmed')) return 'Bitte bestätige zuerst deine E-Mail (Link im Postfach).';
        if (m.includes('rate limit') || m.includes('too many')) return 'Zu viele Versuche. Bitte kurz warten.';
        if (m.includes('network') || m.includes('fetch')) return 'Keine Verbindung. Bitte Internet prüfen.';
        return err && err.message ? err.message : 'Es ist ein Fehler aufgetreten.';
    }

    function setMode(newMode) {
        mode = newMode;
        showError('');
        const subtitle = $('authSubtitle');
        const submit = $('authSubmit');
        const nameWrap = $('authNameWrap');
        const passWrap = $('authPassWrap');
        const toRegister = $('authToRegister');
        const toLogin = $('authToLogin');
        const toReset = $('authToReset');

        if (mode === 'login') {
            subtitle.textContent = 'Anmelden';
            submit.textContent = 'Anmelden';
            nameWrap.style.display = 'none';
            passWrap.style.display = '';
            toRegister.style.display = '';
            toLogin.style.display = 'none';
            toReset.style.display = '';
            $('authPass').setAttribute('autocomplete', 'current-password');
        } else if (mode === 'register') {
            subtitle.textContent = 'Konto erstellen';
            submit.textContent = 'Konto erstellen';
            nameWrap.style.display = '';
            passWrap.style.display = '';
            toRegister.style.display = 'none';
            toLogin.style.display = '';
            toReset.style.display = 'none';
            $('authPass').setAttribute('autocomplete', 'new-password');
        } else if (mode === 'reset') {
            subtitle.textContent = 'Passwort zurücksetzen';
            submit.textContent = 'Link zum Zurücksetzen senden';
            nameWrap.style.display = 'none';
            passWrap.style.display = 'none';
            toRegister.style.display = 'none';
            toLogin.style.display = '';
            toReset.style.display = 'none';
        }
    }

    function showAuthScreen() {
        const splash = $('splash');
        if (splash) splash.style.display = 'none';
        const screen = $('authScreen');
        if (screen) screen.style.display = 'flex';
        setMode('login');
    }

    function hideAuthScreen() {
        const screen = $('authScreen');
        if (screen) screen.style.display = 'none';
    }

    async function handleSubmit() {
        if (!authClient) { showError('Kein Internet – Anmeldung nicht möglich.'); return; }
        const submit = $('authSubmit');
        const email = ($('authEmail').value || '').trim();
        const pass = $('authPass').value || '';
        const name = ($('authName').value || '').trim();

        if (!email) { showError('Bitte E-Mail eingeben.'); return; }
        if (mode !== 'reset' && pass.length < 6) { showError('Das Passwort muss mindestens 6 Zeichen haben.'); return; }
        if (mode === 'register' && !name) { showError('Bitte Firmenname eingeben.'); return; }

        submit.disabled = true;
        const orig = submit.textContent;
        submit.textContent = 'Bitte warten…';
        showError('');

        try {
            if (mode === 'login') {
                const { error } = await authClient.auth.signInWithPassword({ email, password: pass });
                if (error) throw error;
                await onAuthenticated();
            } else if (mode === 'register') {
                const { data, error } = await authClient.auth.signUp({
                    email, password: pass,
                    options: { data: { company_name: name } }
                });
                if (error) throw error;
                // Wenn E-Mail-Bestätigung aktiv ist, gibt es noch keine Session
                if (data && data.session) {
                    await onAuthenticated();
                } else {
                    setMode('login');
                    showError('Fast fertig! Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte bestätige sie und logge dich dann ein.');
                }
            } else if (mode === 'reset') {
                const { error } = await authClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin
                });
                if (error) throw error;
                setMode('login');
                showError('Wenn die E-Mail existiert, haben wir dir einen Link zum Zurücksetzen geschickt.');
            }
        } catch (err) {
            showError(humanError(err));
        } finally {
            submit.disabled = false;
            if (submit.textContent === 'Bitte warten…') submit.textContent = orig;
        }
    }

    // Wird aufgerufen, sobald ein gültiger Benutzer da ist -> App starten
    let appBooted = false;
    async function onAuthenticated() {
        hideAuthScreen();
        const splash = $('splash');
        if (splash) { splash.style.display = 'flex'; const s = $('splashStatus'); if (s) s.textContent = 'Wird geladen...'; }

        // Session-Daten für die App bereitstellen
        const { data: { session } } = await authClient.auth.getSession();
        window.__ktmAuth = {
            client: authClient,
            userId: session ? session.user.id : null,
            email: session ? session.user.email : null,
            company: session && session.user.user_metadata ? session.user.user_metadata.company_name : null,
            signOut: async () => {
                try { await authClient.auth.signOut(); } catch (e) {}
                window.location.reload();
            }
        };

        if (appBooted) return;
        appBooted = true;
        // Signal an die App, dass sie starten darf
        if (typeof window.__ktmStartApp === 'function') {
            window.__ktmStartApp();
        }
    }

    function wireEvents() {
        $('authSubmit').addEventListener('click', handleSubmit);
        // Enter-Taste im Formular
        ['authEmail', 'authPass', 'authName'].forEach(id => {
            const el = $(id);
            if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
        });
        $('authToRegister').addEventListener('click', (e) => { e.preventDefault(); setMode('register'); });
        $('authToLogin').addEventListener('click', (e) => { e.preventDefault(); setMode('login'); });
        $('authToReset').addEventListener('click', (e) => { e.preventDefault(); setMode('reset'); });
    }

    // Beim Laden: Einzelnutzer-Modus -> App startet direkt ohne Anmeldung.
    // Für Team-/Mehrbenutzer-Betrieb kann SINGLE_USER auf false gesetzt werden;
    // dann greift wieder der Login-Bildschirm.
    const SINGLE_USER = true;

    async function boot() {
        wireEvents();

        if (SINGLE_USER) {
            // Kein Login nötig - App SOFORT starten, ohne auf Supabase zu warten.
            // (Das Warten auf getSession() konnte bei schlechtem Netz hängen
            //  bleiben und die App im Ladebildschirm einfrieren.)
            hideAuthScreen();
            if (typeof window.__ktmStartApp === 'function') window.__ktmStartApp();

            // Optionale Session-Übernahme läuft im Hintergrund, blockiert nichts.
            if (authClient) {
                authClient.auth.getSession().then(({ data: { session } }) => {
                    if (session) {
                        window.__ktmAuth = {
                            client: authClient,
                            userId: session.user.id,
                            email: session.user.email,
                            company: session.user.user_metadata?.company_name || null,
                            signOut: async () => { try { await authClient.auth.signOut(); } catch (e) {} window.location.reload(); }
                        };
                    }
                }).catch(() => { /* egal */ });
            }
            return;
        }

        if (!authClient) {
            const hadSession = localStorage.getItem('ktm-auth');
            if (hadSession) {
                if (typeof window.__ktmStartApp === 'function') window.__ktmStartApp();
            } else {
                showAuthScreen();
                showError('Für die erste Anmeldung wird eine Internetverbindung benötigt.');
            }
            return;
        }
        try {
            const { data: { session } } = await authClient.auth.getSession();
            if (session) {
                await onAuthenticated();
            } else {
                showAuthScreen();
            }
        } catch (e) {
            showAuthScreen();
        }
    }

    // Auth bootet, sobald das DOM steht
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();

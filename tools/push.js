#!/usr/bin/env node
/**
 * KTM – Direkt-Push ins GitHub-Repo
 * =================================
 *
 * Schiebt eine oder mehrere Dateien über die GitHub-API direkt nach main,
 * ohne git-Kommandos. Gedacht als Werkzeug, das auch ein KI-Assistent
 * aufrufen kann.
 *
 * WICHTIG – Token NIEMALS in diese Datei schreiben:
 *   Der Token wird ausschliesslich aus der Umgebungsvariable GITHUB_TOKEN
 *   gelesen. Steht er im Code, landet er beim ersten Push im Repo und ist
 *   damit oeffentlich – auch wenn das Repo privat ist, steht er dann in der
 *   Git-Historie und laesst sich praktisch nicht mehr entfernen.
 *
 * Einrichtung (einmalig):
 *   1. Neues Token erzeugen:
 *      GitHub -> Settings -> Developer settings -> Personal access tokens
 *      -> Fine-grained tokens -> "Generate new token"
 *      Repository access: nur "ahmedhamohamed11-hub/KTM"
 *      Permissions: Contents = Read and write   (mehr wird NICHT gebraucht)
 *   2. Token setzen:
 *      Linux/Mac:  export GITHUB_TOKEN="dein_neues_token"
 *      Windows:    setx GITHUB_TOKEN "dein_neues_token"    (danach neu oeffnen)
 *
 * Benutzung:
 *   node tools/push.js js/03-pages.js "Build v164"
 *   node tools/push.js js/03-pages.js js/07-extensions-init.js -m "Zwei Dateien"
 *   node tools/push.js --alle-geaenderten -m "Alles was sich geaendert hat"
 *   node tools/push.js js/03-pages.js -m "Test" --probe     (nur anzeigen, nicht pushen)
 *
 * Rueckgabewert: 0 = alles gut, 1 = Fehler (fuer Automatisierung auswertbar)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------- Konfiguration
const REPO_OWNER = 'ahmedhamohamed11-hub';
const REPO_NAME = 'KTM';
const BRANCH = 'main';
const API = 'https://api.github.com';

// Dateien, die NIE gepusht werden - Schutz vor versehentlichem Hochladen
// von Zugangsdaten oder lokalem Kram.
const NIEMALS_PUSHEN = [
    /(^|\/)\.env$/i,
    /(^|\/)\.env\./i,
    /(^|\/)node_modules\//,
    /(^|\/)\.git\//,
    /\.pem$/i,
    /\.key$/i,
    /(^|\/)secrets?\./i,
];

// Muster, die auf einen versehentlich mitgeschriebenen Token hindeuten.
// Findet das Skript so etwas im Dateiinhalt, bricht es ab.
const TOKEN_MUSTER = [
    { name: 'GitHub Personal Access Token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
    { name: 'GitHub Fine-grained Token', re: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
    { name: 'AWS Access Key', re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: 'Privater Schluessel', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

// ---------------------------------------------------------------- Hilfsfunktionen
const farbe = {
    rot: (t) => `\x1b[31m${t}\x1b[0m`,
    gruen: (t) => `\x1b[32m${t}\x1b[0m`,
    gelb: (t) => `\x1b[33m${t}\x1b[0m`,
    grau: (t) => `\x1b[90m${t}\x1b[0m`,
};

function abbruch(nachricht) {
    console.error(farbe.rot('\nAbbruch: ') + nachricht + '\n');
    process.exit(1);
}

function tokenHolen() {
    const t = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (!t) {
        abbruch(
            'Kein Token gefunden.\n\n' +
            '  Setze ihn so:\n' +
            '    Linux/Mac:  export GITHUB_TOKEN="dein_token"\n' +
            '    Windows:    setx GITHUB_TOKEN "dein_token"\n\n' +
            '  Den Token NICHT in diese Datei schreiben – er landet sonst im Repo.'
        );
    }
    return t;
}

async function githubAnfrage(pfad, optionen = {}) {
    const antwort = await fetch(API + pfad, {
        ...optionen,
        headers: {
            'Authorization': `Bearer ${tokenHolen()}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'ktm-push-tool',
            ...(optionen.body ? { 'Content-Type': 'application/json' } : {}),
            ...optionen.headers,
        },
    });

    const text = await antwort.text();
    let daten = null;
    try { daten = text ? JSON.parse(text) : null; } catch { /* kein JSON */ }

    if (!antwort.ok) {
        // Verstaendliche Meldungen statt roher API-Fehler
        if (antwort.status === 401) {
            abbruch('Token ungültig oder abgelaufen. Bitte ein neues erzeugen.');
        }
        if (antwort.status === 403) {
            abbruch(
                'Zugriff verweigert. Häufigste Ursachen:\n' +
                '  • Token hat kein "Contents: Read and write" für dieses Repo\n' +
                '  • Token ist abgelaufen\n' +
                '  • Zu viele Anfragen (Rate Limit) – kurz warten'
            );
        }
        if (antwort.status === 404) {
            abbruch(`Nicht gefunden: ${pfad}\n  Stimmen Repo-Name und Branch? (${REPO_OWNER}/${REPO_NAME}, ${BRANCH})`);
        }
        if (antwort.status === 409) {
            abbruch('Konflikt: Die Datei wurde zwischenzeitlich geändert. Bitte noch einmal ausführen.');
        }
        abbruch(`GitHub-Fehler ${antwort.status}: ${(daten && daten.message) || text.slice(0, 200)}`);
    }
    return daten;
}

/** Aktuellen SHA einer Datei holen (nötig zum Überschreiben). null = Datei ist neu. */
async function dateiShaHolen(repoPfad) {
    const url = `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(repoPfad).replace(/%2F/g, '/')}?ref=${BRANCH}`;
    const antwort = await fetch(API + url, {
        headers: {
            'Authorization': `Bearer ${tokenHolen()}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'ktm-push-tool',
        },
    });
    if (antwort.status === 404) return null;      // Datei existiert noch nicht
    if (!antwort.ok) abbruch(`SHA konnte nicht geholt werden (${antwort.status}) für ${repoPfad}`);
    const daten = await antwort.json();
    return daten.sha;
}

function pruefeVerboten(repoPfad) {
    for (const muster of NIEMALS_PUSHEN) {
        if (muster.test(repoPfad)) {
            abbruch(`"${repoPfad}" steht auf der Sperrliste und wird nicht gepusht.`);
        }
    }
}

function pruefeAufTokens(repoPfad, inhalt) {
    for (const { name, re } of TOKEN_MUSTER) {
        const treffer = inhalt.match(re);
        if (treffer) {
            abbruch(
                `In "${repoPfad}" steckt offenbar ein Zugangsdatum (${name}):\n` +
                `  ${treffer[0].slice(0, 12)}…\n\n` +
                '  Der Push wurde gestoppt. Entferne den Wert und lade ihn stattdessen\n' +
                '  aus einer Umgebungsvariablen. Einmal gepusht, steht er dauerhaft in\n' +
                '  der Git-Historie.'
            );
        }
    }
}

/** Liste der lokal geänderten Dateien über git ermitteln. */
function geaenderteDateien() {
    try {
        const aus = execSync('git status --porcelain', { encoding: 'utf8', cwd: projektWurzel() });
        return aus.split('\n')
            .map((z) => z.trim())
            .filter(Boolean)
            .filter((z) => !z.startsWith('D '))          // gelöschte hier nicht behandeln
            .map((z) => z.replace(/^\S+\s+/, ''))
            // Nur echte Dateien. "git status" meldet neue Ordner als eine Zeile
            // (z.B. "tools/") - die wuerde beim Lesen als Verzeichnis knallen.
            .flatMap((f) => {
                const abs = path.join(projektWurzel(), f);
                if (!fs.existsSync(abs)) return [];
                if (!fs.statSync(abs).isDirectory()) return [f];
                // Ordner: rekursiv die enthaltenen Dateien einsammeln
                const sammeln = (d) => fs.readdirSync(d, { withFileTypes: true })
                    .flatMap((e) => {
                        const voll = path.join(d, e.name);
                        if (e.name === 'node_modules' || e.name === '.git') return [];
                        return e.isDirectory() ? sammeln(voll) : [voll];
                    });
                return sammeln(abs).map((v) => path.relative(projektWurzel(), v).split(path.sep).join('/'));
            });
    } catch {
        abbruch('git nicht verfügbar oder kein Repo – bitte Dateien einzeln angeben.');
    }
}

function projektWurzel() {
    return path.resolve(__dirname, '..');
}

// ---------------------------------------------------------------- Hauptlauf
async function main() {
    const args = process.argv.slice(2);
    if (!args.length || args.includes('--hilfe') || args.includes('-h')) {
        console.log(`
${farbe.gruen('KTM Direkt-Push')}

  node tools/push.js <datei> [weitere...] -m "Commit-Nachricht"
  node tools/push.js --alle-geaenderten -m "Nachricht"
  node tools/push.js <datei> -m "Nachricht" --probe

Optionen:
  -m, --nachricht   Commit-Nachricht (sonst wird eine erzeugt)
  --alle-geaenderten  alle lokal geänderten Dateien
  --probe           nur anzeigen, was passieren würde – kein Push
  -h, --hilfe       diese Hilfe
`);
        process.exit(0);
    }

    const probe = args.includes('--probe');
    let nachricht = null;
    const dateien = [];

    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '-m' || a === '--nachricht') { nachricht = args[++i]; continue; }
        if (a === '--probe') continue;
        if (a === '--alle-geaenderten') { dateien.push(...geaenderteDateien()); continue; }
        if (a.startsWith('-')) abbruch(`Unbekannte Option: ${a}`);
        // Ohne -m: das letzte Argument als Nachricht deuten, wenn es keine Datei ist
        if (!fs.existsSync(path.resolve(projektWurzel(), a)) && i === args.length - 1 && !nachricht) {
            nachricht = a; continue;
        }
        dateien.push(a);
    }

    if (!dateien.length) abbruch('Keine Dateien angegeben.');

    const einmalig = [...new Set(dateien)];
    nachricht = nachricht || `Aktualisierung: ${einmalig.join(', ')}`;

    console.log(`\n${farbe.grau('Repo:')} ${REPO_OWNER}/${REPO_NAME} (${BRANCH})`);
    console.log(`${farbe.grau('Nachricht:')} ${nachricht}`);
    console.log(`${farbe.grau('Dateien:')} ${einmalig.length}\n`);

    // Erst ALLES prüfen, dann erst pushen. So bricht nichts mittendrin ab
    // und hinterlässt einen halb gepushten Stand.
    const vorbereitet = [];
    for (const rel of einmalig) {
        const abs = path.resolve(projektWurzel(), rel);
        if (!fs.existsSync(abs)) abbruch(`Datei nicht gefunden: ${rel}`);
        const repoPfad = path.relative(projektWurzel(), abs).split(path.sep).join('/');
        pruefeVerboten(repoPfad);
        const roh = fs.readFileSync(abs);
        pruefeAufTokens(repoPfad, roh.toString('utf8'));

        // JS-Dateien vor dem Push auf Syntaxfehler prüfen – verhindert,
        // dass eine kaputte Datei live geht.
        if (repoPfad.endsWith('.js')) {
            try {
                new (require('vm').Script)(roh.toString('utf8'), { filename: repoPfad });
            } catch (e) {
                abbruch(`Syntaxfehler in ${repoPfad}:\n  ${e.message}\n\n  Nicht gepusht.`);
            }
        }
        vorbereitet.push({ repoPfad, inhalt: roh.toString('base64'), groesse: roh.length });
    }

    if (probe) {
        console.log(farbe.gelb('PROBE – es wird nichts gepusht:\n'));
        vorbereitet.forEach((v) => console.log(`  ${v.repoPfad}  ${(v.groesse / 1024).toFixed(1)} KB`));
        console.log('');
        process.exit(0);
    }

    let ok = 0;
    for (const v of vorbereitet) {
        const sha = await dateiShaHolen(v.repoPfad);
        const koerper = {
            message: nachricht,
            content: v.inhalt,
            branch: BRANCH,
            ...(sha ? { sha } : {}),
        };
        await githubAnfrage(
            `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(v.repoPfad).replace(/%2F/g, '/')}`,
            { method: 'PUT', body: JSON.stringify(koerper) }
        );
        console.log(`  ${farbe.gruen('✓')} ${v.repoPfad} ${farbe.grau(sha ? '(aktualisiert)' : '(neu)')}`);
        ok++;
    }

    console.log(`\n${farbe.gruen(`${ok} Datei(en) gepusht.`)}`);
    console.log(farbe.grau('Vercel baut jetzt automatisch – meist 1–2 Minuten.\n'));
}

main().catch((e) => abbruch(e && e.message ? e.message : String(e)));

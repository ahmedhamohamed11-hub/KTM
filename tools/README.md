# Direkt-Push ins Repo

Schiebt Dateien über die GitHub-API direkt nach `main` – ohne git-Kommandos.
Danach baut Vercel automatisch (1–2 Minuten).

## Einmalig einrichten

**1. Altes Token sperren.** Das bisherige Token stand mehrfach im Klartext in
Chatverläufen und muss als kompromittiert gelten:
GitHub → Settings → Developer settings → Personal access tokens → altes Token
→ **Revoke**.

**2. Neues Token erzeugen** – bewusst so eng wie möglich:

- Typ: **Fine-grained token**
- Repository access: **nur** `ahmedhamohamed11-hub/KTM`
- Permissions: **Contents → Read and write**
- Ablauf: 90 Tage (danach neu erzeugen – das ist Absicht)

Mehr Rechte braucht das Skript nicht. Ein Token mit vollem `repo`-Zugriff
könnte im Schadensfall alle deine Repos verändern.

**3. Token setzen** (nicht in eine Datei schreiben):

```bash
# Linux / Mac
export GITHUB_TOKEN="dein_neues_token"

# Windows (danach Fenster neu öffnen)
setx GITHUB_TOKEN "dein_neues_token"
```

## Benutzen

```bash
# Eine Datei
node tools/push.js js/03-pages.js -m "Build v164"

# Mehrere Dateien in einem Commit
node tools/push.js js/03-pages.js js/07-extensions-init.js -m "Zwei Dateien"

# Alles, was sich lokal geändert hat
node tools/push.js --alle-geaenderten -m "Aufräumen"

# Nur anschauen, was passieren würde – kein Push
node tools/push.js js/03-pages.js -m "Test" --probe
```

## Was das Skript automatisch verhindert

Es bricht **vor** dem Push ab, wenn:

| Prüfung | Warum |
|---|---|
| Zugangsdaten im Dateiinhalt | GitHub-Token, AWS-Keys, private Schlüssel. Einmal gepusht, stehen sie dauerhaft in der Historie |
| JavaScript-Syntaxfehler | Eine kaputte Datei würde sonst live gehen und die App lahmlegen |
| Gesperrte Dateien | `.env`, `node_modules/`, `.git/`, `*.pem`, `*.key` |
| Fehlender Token | Klare Anleitung statt kryptischem API-Fehler |

Geprüft wird **alles zuerst**, gepusht erst danach. So bleibt kein halb
hochgeladener Stand zurück, wenn eine Datei durchfällt.

## Wenn etwas schiefgeht

| Meldung | Ursache |
|---|---|
| Token ungültig oder abgelaufen | Neues Token erzeugen |
| Zugriff verweigert | Token hat kein „Contents: Read and write" für dieses Repo |
| Konflikt | Datei wurde zwischenzeitlich woanders geändert – Befehl einfach nochmal ausführen |

## Grenzen

- Pusht **nur nach `main`**, kein Branch, kein Pull Request.
- **Löschen** von Dateien kann es nicht – bewusst, das ist der riskantere Fall.
- Bei mehreren Dateien entsteht **pro Datei ein Commit**, nicht ein
  gemeinsamer. Für einen einzelnen sauberen Commit weiterhin `git` verwenden.

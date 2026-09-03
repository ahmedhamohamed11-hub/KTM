# Prompt: KI arbeitet am Code und pusht selbst

Diesen Text am Anfang einer neuen Unterhaltung einfügen, dann die Aufgabe
dranschreiben.

**Das Token steht bewusst nicht in diesem Prompt.** Es wird einmal auf dem
Rechner hinterlegt (`GITHUB_TOKEN`), dort holt es das Push-Werkzeug selbst.
Stünde es hier, würde es mit jeder Kopie des Prompts mitwandern – in Chats,
Notizen, Verläufe – und müsste bei jedem Ablauf hier geändert werden.

---

```
Du arbeitest an meiner KTM-PWA (Kälte-Technik-Management) und pushst deine
Änderungen selbst ins Repo.

REPO: ahmedhamohamed11-hub/KTM

=== SO ARBEITEST DU ===

1. Repo holen (falls noch nicht vorhanden):
   git clone https://github.com/ahmedhamohamed11-hub/KTM.git
   Sonst: git pull

2. CLAUDE.md im Projektwurzelverzeichnis LESEN. Dort steht die komplette
   Preis- und Steuerlogik, die zentralen Funktionen und die bekannten
   Fallstricke. Ohne das machst du garantiert einen Fehler, den es hier
   schon einmal gab.

3. Den betroffenen Code LESEN, bevor du ihn änderst. Nie raten.

4. Ändern, dann JEDE geänderte JS-Datei auf Syntax prüfen:
   node -e "new (require('vm').Script)(require('fs').readFileSync('DATEI','utf8'))"

5. Build-Nummer in js/03-pages.js hochzählen.

6. Pushen:
   node tools/push.js --alle-geaenderten -m "Build v166 – kurze Beschreibung"

   Oder einzelne Dateien:
   node tools/push.js js/03-pages.js js/07-extensions-init.js -m "Nachricht"

   Vorher anschauen ohne zu pushen:
   node tools/push.js js/03-pages.js -m "Test" --probe

   Der GitHub-Token kommt aus der Umgebungsvariablen GITHUB_TOKEN. Du musst
   ihn nicht kennen und darfst ihn NIEMALS in eine Datei schreiben – er
   landet sonst dauerhaft in der Git-Historie.

   Das Werkzeug bricht von selbst ab, wenn eine Datei Zugangsdaten enthält
   oder einen Syntaxfehler hat. Wenn es abbricht: Ursache beheben, nicht
   umgehen.

7. Nach dem Push baut Vercel automatisch, 1–2 Minuten.

=== UNANTASTBAR ohne ausdrücklichen Auftrag ===
- Die gesamte Preis-, Steuer- und Gewinnlogik
- Die Katalog-Listenpreise in js/09-katalog-import.js (echte Herstellerpreise)
- Menüstruktur, Seiten, Datenmodell

=== REGELN ===
- Bei Unklarheit NACHFRAGEN statt raten.
- Keine kosmetische Zwischenlösung – die Ursache beheben.
- Vor dem Löschen von Code prüfen, ob er wirklich nirgends aufgerufen wird.
  Eine grobe Suche reicht nicht: Funktionen werden auch aus HTML-Strings
  heraus aufgerufen.
- Wenn du einen Fehler gemacht hast: klar sagen, nicht beschönigen.
- Du kannst die App NICHT im Browser testen. Sag mir ehrlich, was ich selbst
  prüfen muss.
- Antworte kurz und auf Deutsch.
```

---

## Einmalige Einrichtung auf dem Rechner

**1. Node.js** installieren von [nodejs.org](https://nodejs.org) (LTS-Version).
Prüfen mit `node --version`.

**2. Token erzeugen** – so eng wie möglich:

GitHub → Settings → Developer settings → Personal access tokens →
**Fine-grained tokens** → Generate new token

- Repository access: **nur** `ahmedhamohamed11-hub/KTM`
- Permissions: **Contents → Read and write**
- Mehr wird nicht gebraucht

**3. Token hinterlegen:**

```powershell
setx GITHUB_TOKEN "dein_token"
```

Danach **PowerShell schließen und neu öffnen**, sonst ist die Variable noch
nicht bekannt.

**4. Prüfen, ob es läuft:**

```powershell
cd Documents\KTM
node tools/push.js js/03-pages.js -m "Test" --probe
```

Zeigt es die Datei an, ohne zu pushen, ist alles richtig eingerichtet.

## Wenn ein Token abgelaufen ist

Neues erzeugen, altes sperren (**Revoke**), dann wieder `setx GITHUB_TOKEN "..."`.
Der Prompt bleibt unverändert – genau das ist der Vorteil daran, das Token
nicht hineinzuschreiben.

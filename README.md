# Mali's Date Quest ♥

Ein kleines Pixel-Art-Spiel für den Browser. Mali läuft durch eine Stadt, probiert 7 Date-Ideen als
Minispiel aus und sucht sich am Ende eins aus. Danach wählt sie Tag und Uhrzeit im Kalender, und du
bekommst eine E-Mail.

Gespielt wird am iPhone im Querformat: einfach dahin tippen, wo man hinlaufen will.

## 1. E-Mail-Benachrichtigung einrichten (2 Minuten)

1. Auf **https://web3forms.com** gehen, **faruk44_4@hotmail.de** eintragen und "Create Access Key" klicken.
   (Die Mail geht immer an die Adresse, mit der der Key erstellt wurde.)
2. Du bekommst einen **Access Key** per Mail (sieht aus wie `a1b2c3d4-...`). Schau auch im Junk-Ordner nach.
3. In `js/config.js` eintragen:
   ```js
   web3formsKey: 'DEIN-KEY-HIER',
   ```
   Der Key darf öffentlich im Code stehen, er kann nur Mails an *deine* Adresse schicken.
4. Einmal selbst bis zum Ende durchspielen und abschicken, um zu testen, ob die Mail ankommt.
   Danach im Hauptmenü "new game" drücken.

Solange kein Key eingetragen ist, läuft das Spiel im Testmodus und verschickt nichts.

**In der Mail steht:**
- welches Date, welcher Tag, welche Uhrzeit, ihre Notiz
- ein Link, mit dem du den Termin direkt in den Google Kalender übernimmst
- der **Tracker**: wie lange sie gespielt hat, wie oft sie "no" drücken wollte, welche Dates sie in
  welcher Reihenfolge gemacht hat (mit Punkten/Zeiten aus den Minispielen), alle ihre Antworten in den
  Dialogen, welche Katzen sie gestreichelt hat und ob sie ihre Wahl nachträglich geändert hat

## Ablauf im Spiel

- Oben rechts steht immer die **Quest** (antippen = Checkliste aller Dates).
- 7 Date-Orte in der Stadt, jeder mit eigenem Minispiel. Der Flohmarkt ist ein kleines Abenteuer:
  Stände durchsuchen, Bärenmütze + goldenes Schwert finden, Verwandlung, Kampf gegen den Schrott-Golem.
- Wenn alle 7 erledigt sind: zum Brunnen in der Mitte. Dort wählt sie das echte Date + Tag + Uhrzeit,
  dann kommt das Ticket und "the end". Danach kann sie weiter herumlaufen.

## 2. Auf GitHub Pages veröffentlichen

1. Auf github.com ein neues Repository anlegen, z. B. `date-quest` (öffentlich).
2. **Den Inhalt dieses Ordners** hochladen (`index.html`, `style.css`, `js/`, `assets/` …),
   per Drag & Drop über "Add file → Upload files" oder per git.
   Die Ordner `tools/` (Grafik-Generatoren) und `.claude/` (lokaler Testserver) werden für das Spiel nicht gebraucht.
3. Im Repo: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**,
   Branch `main`, Ordner `/ (root)`, speichern.
4. Nach ca. 1 Minute ist das Spiel online unter
   `https://DEIN-GITHUB-NAME.github.io/date-quest/`

Diesen Link per WhatsApp an Mali schicken. Tipp für sie: Handy quer halten und Ton an.
(Wer will, kann die Seite in Safari über Teilen → "Zum Home-Bildschirm" wie eine App starten.)

## 3. Anpassen

Alles Wichtige steht in `js/config.js`:
- `herName` / `hisName`: die Namen in den Dialogen
- `dates`: Titel, Orte, Links und alle Dialogzeilen der 7 Dates
  (`'me:happy'`, `'me:love'`, `'me:tease'` wählen den Gesichtsausdruck im Porträt)
- `cats`: Namen und Sprüche der Katzen

Wenn du nach dem Hochladen etwas änderst und es auf dem Handy nicht aktualisiert wird:
in `index.html` die Zahl bei `?v=3` erhöhen (und `VERSION` in `js/core.js`).

## 4. Lokal testen

Im Ordner ausführen:

```bash
python -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen. Am PC gehen auch Pfeiltasten/WASD + Leertaste.

Der Spielstand wird im Browser gespeichert. Im Hauptmenü setzt "new game" alles zurück.

# Benutzerdokumentation für Foosboard

## 1. Zweck der Anwendung

Foosboard ist eine digitale Taktiktafel für Tischfußball. Mit der App lassen sich Spielsituationen visualisieren, Schusswege planen, Passoptionen markieren und typische Stellungen speichern oder teilen.

## 2. Aufruf der App

Die Anwendung ist direkt im Browser nutzbar:

- https://marten-lucas.github.io/foosboard/

Es ist keine Server-Installation notwendig.

## 3. Oberfläche im Überblick

Die App besteht aus zwei Hauptbereichen:

- dem Spielfeld auf der linken Seite
- dem Steuer- und Informationsbereich auf der rechten Seite

Im Steuerbereich befinden sich Werkzeuge für Ball, Schuss, Pass, Hilfslinien, Snapshots und Teilen.

## 4. Bedienung

### 4.1 Ball platzieren und bewegen

- Wähle das Werkzeug **Ball**.
- Klicke auf eine freie Stelle im Spielfeld, um den Ball dort zu platzieren.
- Ziehe den Ball direkt mit der Maus oder per Touch, um ihn zu verschieben.

### 4.2 Schusslinien anlegen

- Wähle das Werkzeug **Schuss**.
- Klicke auf das Spielfeld, um eine Schusslinie vom Ball zum Zielpunkt anzulegen.
- Mehrere Linien können parallel erzeugt werden.

### 4.3 Passlinien anlegen

- Wähle das Werkzeug **Pass**.
- Klicke auf einen Zielpunkt auf dem Spielfeld.
- Passlinien werden separat verwaltet und visuell unterschieden.

### 4.4 Farben wählen

Im Werkzeugbereich kann die Farbe für neue Linien geändert werden. So lassen sich unterschiedliche Spielideen oder Optionen leichter voneinander trennen.

### 4.5 Stangen verschieben

- Greife eine Stange im Spielfeld.
- Ziehe sie entlang der vertikalen Achse.
- Die Bewegung ist auf sinnvolle Spielfeldgrenzen beschränkt.

### 4.6 Figuren kippen

Über den Button **Kippen** lässt sich der Neigungszustand einer Stange wechseln:

- neutral
- front
- back

Damit können unterschiedliche Spielsituationen realistischer simuliert werden.

### 4.7 Hilfslinien und Zielpunkte

Über die Steuerbuttons können zusätzliche visuelle Hilfen ein- oder ausgeschaltet werden:

- Hilfslinien
- 3 oder 5 Zielpunkte am Tor

## 5. Szenen speichern und laden

### Snapshot speichern

- Gib einen Namen in das Feld **Snapshot-Name** ein.
- Klicke auf **Speichern**.

### Snapshot laden

- Wähle im Bereich **Stellungen** den Lade-Button der gewünschten Szene.

### Snapshot löschen

- Nutze den Löschen-Button neben dem jeweiligen Eintrag.

Die gespeicherten Szenen werden lokal im Browser abgelegt.

## 6. Teilen von Taktiken

Mit dem Button **Teilen** erzeugt die App einen Link, der den aktuellen Zustand enthält.

Der Link kann:

- kopiert
- verschickt
- später erneut geöffnet

werden. Dadurch lässt sich eine konkrete Spielsituation reproduzieren.

## 7. Reset-Funktion

Mit **Reset** wird die aktuelle Szene auf den Ausgangszustand zurückgesetzt.

## 8. Mobile Nutzung

Foosboard ist für kleine Bildschirme optimiert. Die Bedienung funktioniert auch per Touch. Für präzise Eingaben empfiehlt sich auf Mobilgeräten die Nutzung im Querformat.

## 9. Hinweise zur Datenspeicherung

- Snapshots werden im LocalStorage des Browsers gespeichert.
- Ein Browserwechsel oder das Löschen lokaler Daten kann diese Einträge entfernen.
- Für wichtige Stellungen empfiehlt sich zusätzlich der Share-Link.

## 10. Typische Anwendungsfälle

- Vorbereitung von Standardsituationen
- Analyse von Passwegen
- Training von Pressing- oder Abwehrformationen
- Austausch von Taktiken im Team

## 11. Fehlerbehebung

Falls die App unerwartet reagiert:

1. Seite neu laden
2. Browserdaten für die Seite leeren
3. den neuesten Share-Link erneut öffnen
4. bei Bedarf einen aktuellen Browser verwenden

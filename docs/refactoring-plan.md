Projektdokumentation: Digital Foosball Tactics Board (Master Spec)

1. Vision & Zielsetzung

Entwicklung einer modernen, mobilen Taktik-App für Tischfußball. Die App soll das bestehende Legacy-Design des Ullrich-Tisches (von marten-lucas.github.io/foosboard/) refactoren und in eine dynamische, datengesteuerte Anwendung überführen. Das Ziel ist eine einzige, portable HTML-Datei, die ohne Server auskommt (GitHub Pages).

2. Architektur & Tech-Stack

Build-Tool: Vite mit vite-plugin-singlefile (Ergebnis: 1x .html).

Framework: React + Mantine UI (v7+).

Icons: Lucide-React.

State Management: Zustand (mit LocalStorage-Persistenz).

Grafik: Dynamisches SVG (Koordinaten in mm, Anzeige via viewBox skaliert).

Kein Tailwind: Styling erfolgt über Mantine-Komponenten oder CSS-Modules.

2.1 Bibliotheksbewertung

SVG.js / Snap.svg: Für die neue Architektur eher nicht als Kernschicht einplanen. React rendert das SVG deklarativ bereits sauber, und direkte DOM-Manipulation würde die Zustandslogik unnötig aufsplitten. Als Prototyping-Hilfe denkbar, aber nicht als Standard.

Interact.js: Für Drag-and-Drop mit harten Constraints grundsätzlich sinnvoll, vor allem für das Verschieben der Stangen entlang einer Achse. Kann helfen, wenn sich Pointer-Events und eigene Drag-Logik als zu aufwendig erweisen. Kandidat für einen gezielten Einsatz, nicht zwingend für die gesamte App.

Paper.js: Technisch interessant für Schusslinien, Pfad-Intersections, Reflexionen und Kollisionsfragen. Für die Hauptarchitektur aber eher ein optionaler Geometrie-Helfer als eine Pflichtabhängigkeit. Erst einsetzen, wenn die eigene Mathe-Schicht für Analyse und Block-Schatten zu teuer wird.

Empfehlung: Die Basis bleibt React mit eigenem SVG-Rendering und eigenen Geometry-Utilities. Externe Libraries nur dort einsetzen, wo sie messbar Zeit sparen oder die Komplexität klar senken.

3. Legacy Migration (Ullrich-Tisch)

Extraktion: Die bestehende SVG-Grafik des Ullrich-Tisches ist die visuelle Referenz.

Refactoring: - Der Pfad der Ullrich-Puppe muss isoliert werden, um ihn dynamisch zu rendern.

Die Geometrie des Tisches (Banden, Torlöcher) wird in Millimetern parametrisiert.

Standard-Spielfeldmaße (Ullrich/Leonhart): ca. 1113mm x 680mm.

4. Detaillierte User Stories & Interaktionen

4.1 Ball-Interaktionen

Platzieren: Ein kurzer Tap/Klick auf eine freie Stelle versetzt den Ball dorthin.

Verschieben: Drag-and-Drop des Balls über das gesamte Spielfeld.

Zielwahl: Nach Auswahl des Balls kann ein Ziel (Tor oder andere Stange) markiert werden.

4.2 Stangen-Interaktionen (Rods)

Verschieben (Y-Achse): Greifen und Schieben einer Stange entlang der Y-Achse.

Constraint: Die Bewegung ist durch die physischen Puffer (Banden-Kollision) begrenzt.

Kipp-Modus (Ankanten): Jede Stange unterstützt drei Rotations-Positionen:

Neutral: Senkrechte Draufsicht (Original-Pfad).

Front: Nach vorne gekippt (Pfad auf X-Achse gestaucht, leichter Versatz nach vorn).

Back: Nach hinten gekippt (Pfad gestaucht, Versatz nach hinten).

Interaktion: Tap auf eine Figur der Stange rotiert durch die 3 Zustände. Alle Figuren einer Stange agieren synchron.

4.3 Schuss- & Pass-System

Mehrfarbige Linien: Unterstützung für mehrere Schüsse gleichzeitig in verschiedenen Farben (z. B. Rot für Schuss, Blau für Pass-Option).

Banden-Reflexion: Automatische Berechnung des Abprall-Winkels (Einfallswinkel = Ausfallswinkel) bei Kontakt mit der Seitenbande.

Lücken-Analyse (Block-Schatten): - Dynamische Projektion von "Schatten" ausgehend vom Ball durch die gegnerischen Figuren.

Zeigt die blockierten Bereiche des Tores oder der Zielstange an.

4.4 Konfigurations-Modus (Editor)

Tisch-Maße: Eingabe von Länge, Breite, Torbreite in mm.

Stangen-Editor: X-Position der Stangen, Anzahl der Puppen pro Stange, Abstände (Gap) zwischen den Puppen.

Asset-Manager: Hochladen/Einfügen von SVG-Pfaden für neue Puppen-Designs.

4.5 Speichern & Teilen

Snapshot: Speichern des gesamten Zustands (Ball, Stangen, Linien) unter einem Namen im LocalStorage.

Share-Link: Generierung eines Base64-kodierten URL-Strings, der die Szene ohne Datenbank-Abfrage teilt.

5. Technische Implementierungshinweise (für KI-Agenten)

5.1 Koordinaten-Logik

Das interne System rechnet in Millimetern (0 bis Tischbreite/höhe).

Eine Hilfsfunktion screenToWorld(x, y) rechnet Touch-Koordinaten in Tisch-Millimeter um.

Das SVG-Element nutzt preserveAspectRatio="xMidYMid meet", um auf allen Geräten (Portrait/Landscape) korrekt zu füllen.

5.2 Mathematik der Reflexion

Wenn Schusslinie Punkt P1(x1, y1) zu P2(x2, y2) geht und y2 < 0 oder y2 > fieldHeight:

Berechne Schnittpunkt mit Bande.

Spiegle den Richtungsvektor an der horizontalen Achse (dy = -dy).

5.3 Mobile Optimierung

Responsive UI: Die Steuerungselemente (Mantine Buttons/Drawers) passen sich der Bildschirmgröße an.

Verhindern des Standard-Touch-Zooms während der Interaktion mit dem Spielfeld (touch-action: none).

6. Phasenplan für das Refactoring

Der Umbau soll nicht als Big-Bang erfolgen, sondern in klaren, vertikalen Phasen. Jede Phase liefert ein lauffähiges Zwischenziel und reduziert das Risiko, dass die neue Architektur am Ende nicht mit den fachlichen Anforderungen zusammenpasst.

6.1 Phase 0: Analyse, Inventar und Zielbild

Ziel: Den alten Entwurf vollständig verstehen, bevor die neue Implementierung beginnt.

Aufgaben:

- Bestehende Funktionen, SVG-Assets und Interaktionen inventarisieren.
- Fachliche Kernobjekte festziehen: Ball, Stange, Figur, Schusslinie, Spielfeld.
- Referenz-Screenshots und Referenzfälle für die spätere Prüfung sammeln.
- Nicht-Ziele definieren, damit der erste Wurf nicht zu groß wird.
- Kurz prüfen, ob ein Library-Stub sinnvoll ist: Interact.js für Drag-Constraints und Paper.js für Schuss-/Kollisionsmathe nur als Option evaluieren.

Ergebnis:

- Klarer Scope für den Neubau.
- Eine belastbare Liste der Legacy-Bestandteile, die übernommen, neu gebaut oder verworfen werden.

6.2 Phase 1: Projektfundament und Build-Pipeline

Ziel: Das neue Projekt technisch sauber aufsetzen.

Aufgaben:

- Vite-Projekt mit React, Mantine, Zustand und Lucide aufsetzen.
- Single-HTML-Build mit vite-plugin-singlefile absichern.
- Grundlegende Struktur für State, SVG-Rendering und Styling schaffen.
- Deployment-Pfad für GitHub Pages vorbereiten.

Ergebnis:

- Eine leere, aber produktionsfähige Anwendung, die bereits als einzelne HTML-Datei gebaut werden kann.

6.3 Phase 2: Designsystem und visueller Neuaufbau

Ziel: Die App optisch modernisieren, bevor die fachliche Komplexität wächst.

Aufgaben:

- Ein konsistentes Mantine-Theme definieren und die globale Farbwelt festlegen.
- Typografie, Abstände, Komponentenstil und Fokuszustände modernisieren.
- SVG-Farben, Linien, Figuren und Tischdetails visuell neu abstimmen.
- Layout-Prinzipien für Desktop und Mobile festziehen.

Ergebnis:

- Ein eigener visueller Stil, der nicht mehr nach Legacy-Entwurf aussieht und als Designbasis für alle weiteren Phasen dient.

6.4 Phase 3: Spielfeld, Koordinaten und Datenmodell

Ziel: Die fachliche Geometrie des Tischfußballs als stabile Grundlage abbilden.

Aufgaben:

- Interne Koordinaten konsequent in Millimetern modellieren.
- Tisch, Banden, Tore und Stangen parametrisierbar machen.
- screenToWorld und die inverse Umrechnung definieren.
- Das SVG-Spielfeld dynamisch rendern und responsiv skalieren.

Ergebnis:

- Das Spielfeld ist in jeder Bildschirmgröße korrekt sichtbar und bildet die Basis für alle weiteren Funktionen.

6.5 Phase 4: Kerninteraktionen für Ball und Stangen

Ziel: Die wichtigste Nutzungslogik interaktiv machen.

Aufgaben:

- Ball per Tap/Klick und Drag-and-Drop bewegbar machen.
- Stangen entlang der Y-Achse verschieben und physisch begrenzen.
- Kipp-Modus für Figuren mit den drei Zuständen Neutral, Front und Back umsetzen.
- Synchrones Verhalten aller Figuren einer Stange sicherstellen.

Ergebnis:

- Die Taktik-Tafel ist bereits als Werkzeug nutzbar, auch ohne Schuss- und Analysefunktionen.

6.6 Phase 5: Editor- und Konfigurationsmodus

Ziel: Das System anpassbar machen, ohne den Code zu verändern.

Aufgaben:

- Tischmaße, Torbreite und Stangenpositionen editierbar machen.
- Anzahl und Abstand der Figuren pro Stange konfigurieren.
- Einfache Asset-Verwaltung für SVG-Pfade ergänzen.
- Konfigurationen als Teil des Szenenzustands behandeln.

Ergebnis:

- Das Projekt ist nicht mehr an einen starren Ullrich-Tisch gebunden, sondern kann auf verschiedene Tisch- und Figurenvarianten angepasst werden.

6.7 Phase 6: Schuss-, Pass- und Analysewerkzeuge

Ziel: Die eigentliche Taktikfunktion des Tools ausbauen.

Aufgaben:

- Mehrere Linien in verschiedenen Farben unterstützen.
- Reflexionen an der Bande berechnen.
- Zielwahl für Tore und Zielstangen ergänzen.
- Block- und Schattenanalyse für freie Schusswege implementieren.

Ergebnis:

- Das Werkzeug liefert taktische Aussagen statt nur einer visuellen Platzierung von Ball und Figuren.

6.8 Phase 7: Speichern, Teilen und Wiederherstellen

Ziel: Szenen dauerhaft nutzbar und austauschbar machen.

Aufgaben:

- Vollständigen Szenenzustand im LocalStorage speichern.
- Snapshot-Verwaltung unter Namen bereitstellen.
- Share-Link mit Base64-kodiertem Zustand erzeugen.
- Import und Export stabil und versionsfähig halten.

Ergebnis:

- Eine erzeugte Taktik kann später geladen, geteilt und reproduziert werden.

6.9 Phase 8: Mobile Optimierung, Polish und Abnahme

Ziel: Das Produkt auf Alltagstauglichkeit bringen.

Aufgaben:

- Touch-Verhalten für mobile Geräte robust machen.
- UI-Elemente für kleine Bildschirme anpassen.
- Edge Cases, Ladezeiten und Rendering-Fehler prüfen.
- End-to-End-Checks gegen die Referenzfälle durchführen.

Ergebnis:

- Die Anwendung ist nicht nur technisch korrekt, sondern auch auf mobilen Geräten sauber benutzbar.

7. Empfohlene Reihenfolge für die Umsetzung

1. Erst das technische Fundament schaffen.
2. Dann das Designsystem und den visuellen Stil modernisieren.
3. Danach Koordinatenmodell und Spielfeld stabilisieren.
4. Anschließend Ball und Stangen interaktiv machen.
5. Erst danach Editor, Analyse, Persistenz und Sharing ergänzen.
6. Zum Schluss mobile Optimierung und Feinschliff.

8. Umsetzungplan für den Neubau

8.1 Sprint 1: Technische Basis

- Vite, React, Mantine, Zustand und die Build-Ausgabe als Single-HTML einrichten.
- Den Legacy-Einstieg aus `index.html` durch die neue App ersetzen.
- Die alten jQuery- und Snap.svg-Startpfade aus dem aktiven Laufpfad entfernen.

8.2 Sprint 2: Datenmodell und Rendering

- Die Tischgeometrie aus der SVG in eine JSON-Konfiguration überführen.
- Das Spielfeld, die Stangen und den Ball als React-SVG-Rendering aufbauen.
- Eine einfache, verlässliche Umrechnung zwischen Bildschirm- und Weltkoordinaten ergänzen.

8.3 Sprint 3: Interaktion und Zustand

- Ball und Stangen per Pointer-Events verschiebbar machen.
- Kipp-Zustände und Constraints für die Stangen abbilden.
- Zustand, LocalStorage und Share-Link-Serialisierung implementieren.

8.4 Sprint 4: Taktik, Analyse und Feinschliff

- Schusslinien, Reflexionen und Blockanalyse ergänzen.
- Theme, Farben und SVG-Palette modernisieren.
- Mobile Verhalten, Layout und Edge Cases prüfen.

9. Statusprüfung April 2026

Stand heute ist der Refactor für die Kernanwendung weitgehend umgesetzt und technisch verifiziert.

Abgeschlossen:

- Neue Architektur mit Vite, React, Mantine, Zustand und Single-HTML-Build.
- Dynamisches SVG-Rendering auf Basis einer JSON-Konfiguration statt Legacy-Logik im Live-Pfad.
- Erhalt der ursprünglichen Tischgeometrie und Abmessungen der Referenzvorlage.
- Interaktionen für Ball, Stangen, Kipp-Modus, Schuss- und Passlinien.
- Block-/Tor-Schattenanalyse, Snapshot-Speicherung, Share-Link und Wiederherstellung.
- Moderne responsive Oberfläche.
- Automatisierte Absicherung mit Unit-, Regression- und Playwright-End-to-End-Tests.

Verifiziert über:

- erfolgreichen Produktions-Build
- grüne Vitest-Suite
- grüne Playwright-Suite

Noch offen, falls der Masterplan wörtlich zu 100 Prozent abgeschlossen werden soll:

- ein vollwertiger Editor-Modus für frei editierbare Tischmaße, Rod-Abstände und Asset-Verwaltung direkt in der UI
- optionaler Import-/Export-Workflow jenseits des bestehenden Share-Hash-Mechanismus

Fazit:

Für die eigentliche Taktiktafel ist der Refactor funktional abgeschlossen. Der Plan ist in der Praxis weitgehend erfüllt; als verbleibender Ausbaupunkt bleibt vor allem der erweiterte Konfigurations-/Editor-Modus.
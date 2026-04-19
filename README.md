# Foosboard

Foosboard ist eine moderne Taktiktafel für Tischfußball. Das Projekt wurde aus einer Legacy-Version in eine aktuelle, testbare Architektur mit React, Vite, Mantine und Zustand überführt.

## Live-App

Die aktuelle Version ist direkt über GitHub Pages erreichbar:

- GitHub Pages: https://marten-lucas.github.io/foosboard/
- Repository: https://github.com/marten-lucas/foosboard

## Hauptfunktionen

- interaktive Taktiktafel mit Ball-, Rod- und Liniensteuerung
- Schuss- und Passlinien mit mehreren Farben
- Block- und Tor-Schattenanalyse
- Speichern und Laden von Szenen im Browser
- Share-Link für reproduzierbare Taktiken
- responsive Oberfläche für Desktop und Mobile
- automatisierte Tests mit Vitest und Playwright

## Technologie-Stack

- React
- Vite
- Mantine UI
- Zustand
- SVG-Rendering
- Vitest
- Playwright

## Lokale Entwicklung

### Voraussetzungen

- Node.js 20 oder neuer
- npm

### Starten

```bash
npm install
npm run dev
```

### Tests ausführen

```bash
npm run test:all
```

### Produktions-Build

```bash
npm run build
```

## Deployment und Releases

Das Repository enthält einen GitHub-Workflow, der automatisch:

- die Anwendung baut
- die Tests ausführt
- GitHub Pages aktualisiert
- bei Versions-Tags einen GitHub Release erzeugt

## Dokumentation

- Benutzerdoku: docs/benutzerdokumentation.md
- Refactoring- und Architekturplan: docs/refactoring-plan.md

## Projektstatus

Die Kernanwendung des Refactors ist abgeschlossen und produktiv nutzbar. Ein erweiterter Editor-Modus für vollständig frei konfigurierbare Tischparameter kann künftig noch ergänzt werden.

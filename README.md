# Fokus Planer

Ein moderner, lokaler Planer mit Fokus-Funktionen, Aufgaben-Management und Notizen-System.

## Features

🎯 **Fokus-Modus** - Pomodoro-Timer für konzentriertes Arbeiten (Standard: 20 Min)
📋 **Aufgaben-Management** - Erstellen, organisieren und verwalten Sie Ihre Aufgaben
📝 **Notizen-System** - Sammeln Sie Ideen und konvertieren Sie sie in Aufgaben
👥 **Gruppen-Organisation** - Organisieren Sie Aufgaben in farbcodierten Gruppen
📊 **Statistiken** - Verfolgen Sie Ihre Produktivität und Fokus-Zeit
🔍 **Suche** - Finden Sie schnell Aufgaben und Notizen
📦 **Archiv** - Verwalten Sie erledigte Aufgaben und alte Notizen
⌨️ **Shortcuts** - Effiziente Bedienung mit Tastenkombinationen

## Installation & Start

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm

### Installation

1. **Abhängigkeiten installieren:**
```bash
npm install
```

### Anwendung starten

**Entwicklungsmodus:**
```bash
npm start
```

**Production Build erstellen:**
```bash
npm run build
```

**Installierbare Version erstellen:**
```bash
npm run dist
```

## Verwendung

### Grundfunktionen

- **Neue Aufgabe erstellen**: `Ctrl+T` oder Button in der Header-Leiste
- **Neue Notiz erstellen**: `Ctrl+N` oder Button in der Header-Leiste  
- **Fokus-Modus starten**: `Ctrl+F` oder Fokus-Button
- **Neue Gruppe erstellen**: `Ctrl+G` oder Button im Aufgaben-Tab

### Navigation

- **Dashboard**: `Ctrl+1` - Übersicht und Statistiken
- **Aufgaben**: `Ctrl+2` - Alle Aufgaben verwalten
- **Notizen**: `Ctrl+3` - Notizen erstellen und verwalten
- **Archiv**: `Ctrl+4` - Erledigte Aufgaben und archivierte Notizen

### Fokus-Modus

1. Wählen Sie eine Aufgabe aus der Liste
2. Der Timer startet automatisch (Standard: 20 Minuten)
3. Während der Session können Sie:
   - Notizen direkt zur Aufgabe hinzufügen
   - Subtasks abhaken
   - Den Timer pausieren (`Leertaste`)
4. Nach Ablauf wird eine Pause vorgeschlagen

### Aufgaben-Management

**Aufgaben erstellen:**
- Titel (erforderlich)
- Beschreibung
- Gruppe zuweisen
- Priorität setzen (Niedrig/Mittel/Hoch)
- Tags hinzufügen
- Fälligkeitsdatum
- Geschätzte Zeit

**Aufgaben bearbeiten:**
- Klicken Sie auf eine Aufgabe oder nutzen Sie den Bearbeiten-Button
- Subtasks hinzufügen und abhaken
- Notizen direkt zur Aufgabe hinzufügen
- Progress wird automatisch basierend auf Subtasks berechnet

### Notizen

**Notizen erstellen:**
- Titel (optional, wird automatisch generiert)
- Inhalt mit einfacher Markdown-Formatierung
- Tags für bessere Organisation

**Notizen verwalten:**
- Anheften für wichtige Notizen
- In Aufgaben umwandeln
- Archivieren oder löschen

### Tastenkombinationen

#### Erstellung
- `Ctrl+N` - Neue Notiz
- `Ctrl+T` - Neue Aufgabe  
- `Ctrl+G` - Neue Gruppe

#### Navigation
- `Ctrl+1` - Dashboard
- `Ctrl+2` - Aufgaben
- `Ctrl+3` - Notizen
- `Ctrl+4` - Archiv

#### Fokus
- `Ctrl+F` - Fokus-Modus starten/verwalten
- `Leertaste` - Timer pausieren/fortsetzen (im Fokus)
- `Ctrl+Shift+F` - Fokus-Session beenden

#### Allgemein
- `Ctrl+K` - Schnellsuche
- `Ctrl+Shift+L` - Ansicht wechseln (Liste/Raster)
- `Escape` - Popup schließen
- `Ctrl+Enter` - Formular absenden
- `Ctrl+S` - Alle Daten speichern

## Datenspeicherung

Die Anwendung speichert alle Daten lokal:

- **Electron-App**: Im Benutzerordner unter `~/FokusPlaner/data/`
- **Browser-Version**: Im Browser LocalStorage

### Backup

- Automatische Backups können über `Ctrl+Shift+B` erstellt werden
- Backup-Dateien werden als JSON exportiert
- In der Browser-Version wird ein Download-Link generiert

## Projektstruktur

```
fokus-planer/
├── main.js                 # Electron Hauptprozess
├── package.json            # Abhängigkeiten und Scripts
├── src/
│   ├── index.html          # Haupt-HTML
│   ├── focus.html          # Fokus-Fenster
│   ├── styles.css          # Haupt-Styles
│   └── js/
│       ├── app.js          # App-Initialisierung
│       ├── storage.js      # Datenverwaltung
│       ├── tasks.js        # Aufgaben-Management
│       ├── notes.js        # Notizen-Management
│       ├── groups.js       # Gruppen-Management
│       ├── focus.js        # Fokus-Modus
│       ├── ui.js           # UI-Management
│       ├── popup.js        # Popup-Dialoge
│       └── shortcuts.js    # Tastenkombinationen
└── data/                   # Lokale Datenbank (wird erstellt)
    ├── tasks.json
    ├── notes.json
    ├── groups.json
    ├── settings.json
    ├── archive.json
    └── stats.json
```

## Entwicklung

### Scripts

- `npm start` - Entwicklungsserver starten
- `npm run build` - Production Build
- `npm run dist` - Installierbare Pakete erstellen

### Architektur

- **Modularer Aufbau**: Jede Funktionalität in eigenem Modul
- **Globale Manager**: TaskManager, NoteManager, etc. als window-Objekte
- **Event-basiert**: Saubere Trennung zwischen UI und Logik
- **Storage-agnostisch**: Funktioniert mit Dateisystem oder LocalStorage

## Fehlerbehebung

### App startet nicht
1. Prüfen Sie, ob Node.js installiert ist: `node --version`
2. Installieren Sie Abhängigkeiten neu: `npm install`
3. Löschen Sie `node_modules` und installieren neu

### Daten gehen verloren
- Erstellen Sie regelmäßig Backups mit `Ctrl+Shift+B`
- Prüfen Sie den Speicherort: `~/FokusPlaner/data/`

### Performance-Probleme
- Archivieren Sie alte Aufgaben und Notizen regelmäßig
- Reduzieren Sie die Anzahl der Tags

## Lizenz

MIT License - Freie Verwendung für private und kommerzielle Zwecke.

## Mitwirken

1. Fork des Repositories
2. Feature-Branch erstellen
3. Änderungen committen
4. Pull Request erstellen

---

**Viel Erfolg mit Ihrem produktiven Arbeiten! 🎯**

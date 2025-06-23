// Storage Management - Browser-kompatible Datenspeicherung für Electron

// Prüfe ob wir in Electron laufen und Node.js verfügbar ist
const isElectron = typeof window !== 'undefined' && window.process && window.process.type;
const hasNodeIntegration = typeof require !== 'undefined';

let fs, path, os;
let DATA_DIR;

// Initialisiere Storage-Backend
if (isElectron && hasNodeIntegration) {
    // Node.js in Electron verfügbar
    try {
        fs = require('fs');
        path = require('path');
        os = require('os');
        
        // Datenverzeichnis im Benutzerordner
        DATA_DIR = path.join(os.homedir(), 'FokusPlaner', 'data');
        
        // Stelle sicher, dass das Datenverzeichnis existiert
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        
        console.log('Storage: Node.js Backend initialisiert -', DATA_DIR);
    } catch (error) {
        console.warn('Storage: Node.js nicht verfügbar, verwende LocalStorage Backend');
        fs = null;
    }
} else {
    console.log('Storage: Browser/LocalStorage Backend wird verwendet');
}

// Datenpfade (nur für Node.js Backend)
let DATA_PATHS = {};
if (fs && path && DATA_DIR) {
    DATA_PATHS = {
        tasks: path.join(DATA_DIR, 'tasks.json'),
        notes: path.join(DATA_DIR, 'notes.json'),
        groups: path.join(DATA_DIR, 'groups.json'),
        settings: path.join(DATA_DIR, 'settings.json'),
        archive: path.join(DATA_DIR, 'archive.json'),
        stats: path.join(DATA_DIR, 'stats.json')
    };
}

// Standard-Datenstrukturen
const DEFAULT_DATA = {
    tasks: [],
    notes: [],
    groups: [
        {
            id: 'default',
            name: 'Allgemein',
            color: '#4a9eff',
            createdAt: new Date().toISOString()
        }
    ],
    settings: {
        focusTimer: 20,
        theme: 'dark',
        viewMode: 'grid',
        notifications: true,
        autoArchive: false
    },
    archive: {
        tasks: [],
        notes: []
    },
    stats: {
        totalFocusTime: 0,
        completedTasks: 0,
        createdNotes: 0,
        dailyStats: {}
    }
};

// Datei lesen (Node.js Backend)
function readDataFileNode(type) {
    try {
        const filePath = DATA_PATHS[type];
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } else {
            // Erstelle Datei mit Standard-Daten falls sie nicht existiert
            const defaultData = DEFAULT_DATA[type];
            writeDataFileNode(type, defaultData);
            return defaultData;
        }
    } catch (error) {
        console.error(`Fehler beim Lesen der ${type} Datei:`, error);
        return DEFAULT_DATA[type] || [];
    }
}

// Datei schreiben (Node.js Backend)
function writeDataFileNode(type, data) {
    try {
        const filePath = DATA_PATHS[type];
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Fehler beim Schreiben der ${type} Datei:`, error);
        return false;
    }
}

// Datei lesen (LocalStorage Backend)
function readDataFileLocal(type) {
    try {
        const key = `fokusplaner_${type}`;
        const data = localStorage.getItem(key);
        if (data) {
            return JSON.parse(data);
        } else {
            // Erstelle Eintrag mit Standard-Daten falls er nicht existiert
            const defaultData = DEFAULT_DATA[type] || [];
            writeDataFileLocal(type, defaultData);
            return defaultData;
        }
    } catch (error) {
        console.error(`Fehler beim Lesen der ${type} LocalStorage:`, error);
        return DEFAULT_DATA[type] || [];
    }
}

// Datei schreiben (LocalStorage Backend)
function writeDataFileLocal(type, data) {
    try {
        const key = `fokusplaner_${type}`;
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error(`Fehler beim Schreiben der ${type} LocalStorage:`, error);
        return false;
    }
}

// Hauptfunktionen (verwenden das verfügbare Backend)
function readDataFile(type) {
    if (fs) {
        return readDataFileNode(type);
    } else {
        return readDataFileLocal(type);
    }
}

function writeDataFile(type, data) {
    if (fs) {
        return writeDataFileNode(type, data);
    } else {
        return writeDataFileLocal(type, data);
    }
}

// Alle Daten laden
function loadAllData() {
    return {
        tasks: readDataFile('tasks'),
        notes: readDataFile('notes'),
        groups: readDataFile('groups'),
        settings: readDataFile('settings'),
        archive: readDataFile('archive'),
        stats: readDataFile('stats')
    };
}

// Backup erstellen
function createBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const allData = loadAllData();
        
        if (fs) {
            // Node.js Backend: Datei erstellen
            const backupDir = path.join(DATA_DIR, 'backups');
            
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
            fs.writeFileSync(backupPath, JSON.stringify(allData, null, 2), 'utf8');
            console.log(`Backup erstellt: ${backupPath}`);
            return backupPath;
        } else {
            // LocalStorage Backend: Download-Link erstellen
            const backupData = JSON.stringify(allData, null, 2);
            const blob = new Blob([backupData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `fokusplaner-backup-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`Backup heruntergeladen: fokusplaner-backup-${timestamp}.json`);
            return `fokusplaner-backup-${timestamp}.json`;
        }
    } catch (error) {
        console.error('Fehler beim Erstellen des Backups:', error);
        return null;
    }
}

// UUID Generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Datum formatieren
function formatDate(date) {
    return new Date(date).toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Heute's Datum als String
function getTodayString() {
    return new Date().toDateString();
}

// Statistiken aktualisieren
function updateStats(type, value = 1) {
    try {
        const stats = readDataFile('stats');
        const today = getTodayString();
        
        // Tägliche Statistiken initialisieren
        if (!stats.dailyStats[today]) {
            stats.dailyStats[today] = {
                focusTime: 0,
                completedTasks: 0,
                createdNotes: 0
            };
        }
        
        // Statistiken aktualisieren
        switch (type) {
            case 'focusTime':
                stats.totalFocusTime += value;
                stats.dailyStats[today].focusTime += value;
                break;
            case 'completedTask':
                stats.completedTasks += value;
                stats.dailyStats[today].completedTasks += value;
                break;
            case 'createdNote':
                stats.createdNotes += value;
                stats.dailyStats[today].createdNotes += value;
                break;
        }
        
        writeDataFile('stats', stats);
        return true;
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Statistiken:', error);
        return false;
    }
}

// Heute's Statistiken abrufen
function getTodayStats() {
    try {
        const stats = readDataFile('stats');
        const today = getTodayString();
        
        if (stats.dailyStats[today]) {
            return stats.dailyStats[today];
        } else {
            return {
                focusTime: 0,
                completedTasks: 0,
                createdNotes: 0
            };
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der heutigen Statistiken:', error);
        return {
            focusTime: 0,
            completedTasks: 0,
            createdNotes: 0
        };
    }
}

// Storage-Info abrufen
function getStorageInfo() {
    return {
        backend: fs ? 'nodejs' : 'localstorage',
        location: fs ? DATA_DIR : 'Browser LocalStorage',
        available: true
    };
}

// Exportiere globale Funktionen
window.StorageManager = {
    readDataFile,
    writeDataFile,
    loadAllData,
    createBackup,
    generateUUID,
    formatDate,
    getTodayString,
    updateStats,
    getTodayStats,
    getStorageInfo
};

console.log('Storage Manager initialisiert:', window.StorageManager.getStorageInfo());

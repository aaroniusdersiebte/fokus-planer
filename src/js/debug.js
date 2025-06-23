// Debug Utilities - Hilfsfunktionen für Fehlerbehebung

let debugMode = false;
let debugLogs = [];

// Debug-Modus aktivieren/deaktivieren
function toggleDebugMode() {
    debugMode = !debugMode;
    console.log(`Debug-Modus ${debugMode ? 'aktiviert' : 'deaktiviert'}`);
    
    if (debugMode) {
        showDebugPanel();
    } else {
        hideDebugPanel();
    }
    
    return debugMode;
}

// Debug-Log erstellen
function debugLog(category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        category,
        message,
        data,
        stack: new Error().stack
    };
    
    debugLogs.push(logEntry);
    
    if (debugMode) {
        console.log(`[DEBUG:${category}] ${message}`, data || '');
    }
    
    // Halte nur die letzten 100 Logs
    if (debugLogs.length > 100) {
        debugLogs.shift();
    }
    
    updateDebugPanel();
}

// System-Status prüfen
function checkSystemStatus() {
    const status = {
        timestamp: new Date().toISOString(),
        app: {
            initialized: window.FokusApp?.initialized() || false,
            version: '1.0.0'
        },
        storage: {
            available: !!window.StorageManager,
            info: window.StorageManager?.getStorageInfo() || null
        },
        managers: {
            TaskManager: !!window.TaskManager,
            NoteManager: !!window.NoteManager,
            GroupManager: !!window.GroupManager,
            FocusManager: !!window.FocusManager,
            UIManager: !!window.UIManager,
            PopupManager: !!window.PopupManager,
            ShortcutManager: !!window.ShortcutManager
        },
        dom: {
            ready: document.readyState,
            elementsFound: checkDOMElements()
        },
        data: {
            tasks: window.StorageManager ? window.StorageManager.readDataFile('tasks').length : 0,
            notes: window.StorageManager ? window.StorageManager.readDataFile('notes').length : 0,
            groups: window.StorageManager ? window.StorageManager.readDataFile('groups').length : 0
        }
    };
    
    debugLog('SYSTEM', 'System-Status geprüft', status);
    return status;
}

// DOM-Elemente prüfen
function checkDOMElements() {
    const requiredElements = [
        'newTaskBtn',
        'newNoteBtn',
        'focusModeBtn',
        'newGroupBtn',
        'searchInput',
        'viewToggle',
        'tasksContainer',
        'notesContainer',
        'archiveContainer',
        'popupOverlay'
    ];
    
    const found = {};
    requiredElements.forEach(id => {
        found[id] = !!document.getElementById(id);
    });
    
    return found;
}

// Event-Handler Debugging
function debugEventHandlers() {
    const elements = document.querySelectorAll('button, input, select');
    const report = [];
    
    elements.forEach(el => {
        const info = {
            id: el.id || 'no-id',
            className: el.className,
            hasClickHandler: !!el.onclick,
            hasEventListeners: 'unknown' // getEventListeners ist nicht in allen Umgebungen verfügbar
        };
        report.push(info);
    });
    
    debugLog('EVENTS', 'Event-Handler geprüft', report);
    return report;
}

// Storage-Test
function testStorage() {
    try {
        // Test schreiben
        const testData = { test: true, timestamp: Date.now() };
        const writeResult = window.StorageManager.writeDataFile('test', testData);
        
        // Test lesen
        const readData = window.StorageManager.readDataFile('test');
        
        const success = writeResult && readData.test === true;
        
        debugLog('STORAGE', 'Storage-Test', {
            writeResult,
            readData,
            success
        });
        
        return success;
    } catch (error) {
        debugLog('STORAGE', 'Storage-Test Fehler', error);
        return false;
    }
}

// Manager-Funktionen testen
function testManagers() {
    const tests = {};
    
    // TaskManager testen
    if (window.TaskManager) {
        try {
            const tasks = window.TaskManager.loadTasks ? window.TaskManager.loadTasks() : [];
            tests.TaskManager = { success: true, taskCount: tasks.length };
        } catch (error) {
            tests.TaskManager = { success: false, error: error.message };
        }
    } else {
        tests.TaskManager = { success: false, error: 'Not available' };
    }
    
    // NoteManager testen
    if (window.NoteManager) {
        try {
            const notes = window.NoteManager.loadNotes ? window.NoteManager.loadNotes() : [];
            tests.NoteManager = { success: true, noteCount: notes.length };
        } catch (error) {
            tests.NoteManager = { success: false, error: error.message };
        }
    } else {
        tests.NoteManager = { success: false, error: 'Not available' };
    }
    
    // GroupManager testen
    if (window.GroupManager) {
        try {
            const groups = window.GroupManager.loadGroups ? window.GroupManager.loadGroups() : [];
            tests.GroupManager = { success: true, groupCount: groups.length };
        } catch (error) {
            tests.GroupManager = { success: false, error: error.message };
        }
    } else {
        tests.GroupManager = { success: false, error: 'Not available' };
    }
    
    debugLog('MANAGERS', 'Manager-Tests', tests);
    return tests;
}

// Debug-Panel anzeigen
function showDebugPanel() {
    let panel = document.getElementById('debugPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'debugPanel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 600px;
            background: #000;
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border: 2px solid #0f0;
            border-radius: 8px;
            z-index: 10000;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,255,0,0.3);
        `;
        
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong>🐛 DEBUG PANEL</strong>
                <button onclick="hideDebugPanel()" style="background: #f00; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">×</button>
            </div>
            <div id="debugContent">Loading...</div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #0f0;">
                <button onclick="runFullDiagnostic()" style="background: #0f0; color: #000; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">Volltest</button>
                <button onclick="clearDebugLogs()" style="background: #ff0; color: #000; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Clear</button>
            </div>
        `;
        
        document.body.appendChild(panel);
    }
    
    updateDebugPanel();
}

// Debug-Panel verstecken
function hideDebugPanel() {
    const panel = document.getElementById('debugPanel');
    if (panel) {
        panel.remove();
    }
}

// Debug-Panel aktualisieren
function updateDebugPanel() {
    const content = document.getElementById('debugContent');
    if (!content) return;
    
    const recentLogs = debugLogs.slice(-5).reverse();
    
    content.innerHTML = `
        <div><strong>Status:</strong> ${window.FokusApp?.initialized() ? '✅ OK' : '❌ NOT READY'}</div>
        <div><strong>DOM:</strong> ${document.readyState}</div>
        <div><strong>Storage:</strong> ${window.StorageManager ? '✅' : '❌'}</div>
        <div><strong>Logs:</strong> ${debugLogs.length}</div>
        <hr style="border-color: #0f0; margin: 10px 0;">
        ${recentLogs.map(log => `
            <div style="margin-bottom: 5px; padding: 5px; background: rgba(0,255,0,0.1); border-radius: 3px;">
                <div style="color: #ff0;">[${log.category}] ${log.timestamp.split('T')[1].split('.')[0]}</div>
                <div>${log.message}</div>
                ${log.data ? `<div style="color: #aaa; font-size: 10px;">${JSON.stringify(log.data).substring(0, 100)}...</div>` : ''}
            </div>
        `).join('')}
    `;
}

// Debug-Logs löschen
function clearDebugLogs() {
    debugLogs = [];
    updateDebugPanel();
}

// Vollständige Diagnose
function runFullDiagnostic() {
    console.log('🔍 Starte vollständige Diagnose...');
    
    const results = {
        system: checkSystemStatus(),
        storage: testStorage(),
        managers: testManagers(),
        eventHandlers: debugEventHandlers()
    };
    
    console.log('📊 Diagnose-Ergebnisse:', results);
    
    // Zeige Zusammenfassung
    const issues = [];
    
    if (!results.system.app.initialized) {
        issues.push('App nicht initialisiert');
    }
    
    if (!results.storage) {
        issues.push('Storage-Probleme');
    }
    
    Object.entries(results.system.managers).forEach(([name, available]) => {
        if (!available) {
            issues.push(`${name} nicht verfügbar`);
        }
    });
    
    Object.entries(results.system.dom.elementsFound).forEach(([id, found]) => {
        if (!found) {
            issues.push(`Element #${id} nicht gefunden`);
        }
    });
    
    if (issues.length === 0) {
        alert('✅ Alle Tests bestanden! Das System funktioniert korrekt.');
    } else {
        alert(`❌ ${issues.length} Probleme gefunden:\n\n${issues.join('\n')}\n\nDetails in der Konsole.`);
    }
    
    return results;
}

// Auto-Debug bei Fehlern
window.addEventListener('error', (e) => {
    debugLog('ERROR', `Unbehandelter Fehler: ${e.message}`, {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error?.stack
    });
});

window.addEventListener('unhandledrejection', (e) => {
    debugLog('PROMISE', `Unbehandelte Promise-Ablehnung: ${e.reason}`, e.reason);
});

// Debug-Panel bei Ctrl+Shift+D öffnen
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleDebugMode();
    }
});

// Exportiere Debug-Funktionen
window.Debug = {
    toggleDebugMode,
    checkSystemStatus,
    testStorage,
    testManagers,
    runFullDiagnostic,
    debugLog,
    showDebugPanel,
    hideDebugPanel
};

// Globale Funktionen für HTML onclick Events
window.hideDebugPanel = hideDebugPanel;
window.runFullDiagnostic = runFullDiagnostic;
window.clearDebugLogs = clearDebugLogs;

console.log('🐛 Debug-System geladen. Drücken Sie Ctrl+Shift+D für Debug-Panel.');

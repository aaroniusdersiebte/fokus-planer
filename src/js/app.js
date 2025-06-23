// App Main - Haupt-Anwendungslogik und Initialisierung

let appInitialized = false;
let appData = {};

// App initialisieren
async function initializeApp() {
    if (appInitialized) return;
    
    console.log('🚀 Fokus Planer wird gestartet...');
    
    try {
        // 1. Storage-System initialisieren
        initializeStorage();
        
        // 2. Daten laden
        loadAppData();
        
        // 3. Manager initialisieren (in der richtigen Reihenfolge)
        await initializeManagers();
        
        // 4. UI initialisieren
        initializeUserInterface();
        
        // 5. Event-System initialisieren
        initializeEventSystem();
        
        // 6. Shortcuts aktivieren
        initializeShortcuts();
        
        // 7. Auto-Save einrichten
        setupAutoSave();
        
        // 8. Cleanup-Handler einrichten
        setupCleanupHandlers();
        
        // 9. Initialisierung abschließen
        finalizeInitialization();
        
        appInitialized = true;
        console.log('✅ Fokus Planer erfolgreich gestartet!');
        
    } catch (error) {
        console.error('❌ Fehler beim Starten der App:', error);
        showErrorMessage('Die Anwendung konnte nicht gestartet werden. Bitte versuchen Sie es erneut.');
    }
}

// Storage-System initialisieren
function initializeStorage() {
    console.log('📦 Storage-System wird initialisiert...');
    
    // Prüfe ob alle Storage-Funktionen verfügbar sind
    if (!window.StorageManager) {
        throw new Error('StorageManager nicht verfügbar');
    }
    
    // Teste Storage-Funktionalität
    try {
        const testData = window.StorageManager.loadAllData();
        console.log('📦 Storage-System erfolgreich initialisiert');
        return testData;
    } catch (error) {
        console.error('📦 Storage-Fehler:', error);
        throw new Error('Storage-System konnte nicht initialisiert werden');
    }
}

// App-Daten laden
function loadAppData() {
    console.log('📂 App-Daten werden geladen...');
    
    try {
        appData = window.StorageManager.loadAllData();
        
        // Validierung der geladenen Daten
        validateAppData();
        
        console.log('📂 App-Daten erfolgreich geladen:', {
            tasks: appData.tasks.length,
            notes: appData.notes.length,
            groups: appData.groups.length
        });
        
    } catch (error) {
        console.error('📂 Fehler beim Laden der App-Daten:', error);
        
        // Fallback: Standard-Daten verwenden
        console.log('📂 Verwende Standard-Daten als Fallback');
        appData = createDefaultAppData();
    }
}

// App-Daten validieren
function validateAppData() {
    const requiredFields = ['tasks', 'notes', 'groups', 'settings', 'archive', 'stats'];
    
    for (const field of requiredFields) {
        if (!appData[field]) {
            console.warn(`📂 Fehlende Datenstruktur: ${field}`);
            appData[field] = getDefaultDataForField(field);
        }
    }
    
    // Validiere Standard-Gruppe
    if (!appData.groups.find(g => g.id === 'default')) {
        console.log('📂 Standard-Gruppe wird erstellt');
        appData.groups.unshift({
            id: 'default',
            name: 'Allgemein',
            color: '#4a9eff',
            createdAt: new Date().toISOString()
        });
        window.StorageManager.writeDataFile('groups', appData.groups);
    }
}

// Standard-App-Daten erstellen
function createDefaultAppData() {
    return {
        tasks: [],
        notes: [],
        groups: [{
            id: 'default',
            name: 'Allgemein',
            color: '#4a9eff',
            createdAt: new Date().toISOString()
        }],
        settings: {
            focusTimer: 20,
            theme: 'dark',
            viewMode: 'grid',
            notifications: true,
            autoArchive: false,
            autoSave: true,
            autoSaveInterval: 30000 // 30 Sekunden
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
}

// Standard-Daten für Feld abrufen
function getDefaultDataForField(field) {
    const defaults = createDefaultAppData();
    return defaults[field] || [];
}

// Manager initialisieren
function initializeManagers() {
    console.log('⚙️ Manager werden initialisiert...');
    
    // Reihenfolge ist wichtig: Storage -> Groups -> Tasks/Notes -> Focus -> UI
    
    // Warte bis alle Scripts geladen sind
    return new Promise((resolve) => {
        const checkManagers = () => {
            let allLoaded = true;
            const requiredManagers = ['StorageManager', 'GroupManager', 'TaskManager', 'NoteManager', 'PopupManager'];
            
            for (const manager of requiredManagers) {
                if (!window[manager]) {
                    console.log(`⏳ Warte auf ${manager}...`);
                    allLoaded = false;
                    break;
                }
            }
            
            if (allLoaded) {
                initializeManagersAfterLoad();
                resolve();
            } else {
                setTimeout(checkManagers, 100);
            }
        };
        
        checkManagers();
    });
}

// Manager initialisieren nach dem Laden
function initializeManagersAfterLoad() {
    // 1. GroupManager
    if (window.GroupManager && window.GroupManager.loadGroups) {
        window.GroupManager.loadGroups();
        console.log('✅ GroupManager initialisiert');
    } else {
        console.warn('⚠️ GroupManager nicht verfügbar');
    }
    
    // 2. TaskManager
    if (window.TaskManager && window.TaskManager.loadTasks) {
        window.TaskManager.loadTasks();
        console.log('✅ TaskManager initialisiert');
    } else {
        console.warn('⚠️ TaskManager nicht verfügbar');
    }
    
    // 3. NoteManager
    if (window.NoteManager && window.NoteManager.loadNotes) {
        window.NoteManager.loadNotes();
        console.log('✅ NoteManager initialisiert');
    } else {
        console.warn('⚠️ NoteManager nicht verfügbar');
    }
    
    // 4. FocusManager
    if (window.FocusManager && window.FocusManager.loadFocusSettings) {
        window.FocusManager.loadFocusSettings();
        console.log('✅ FocusManager initialisiert');
    } else {
        console.warn('⚠️ FocusManager nicht verfügbar');
    }
    
    console.log('⚙️ Alle Manager erfolgreich initialisiert');
}

// Benutzeroberfläche initialisieren
function initializeUserInterface() {
    console.log('🎨 Benutzeroberfläche wird initialisiert...');
    
    if (window.UIManager) {
        window.UIManager.initializeUI();
        console.log('✅ UIManager initialisiert');
    }
    
    // Theme anwenden
    applyTheme(appData.settings.theme || 'dark');
    
    // URL-basierte Navigation
    handleUrlNavigation();
    
    console.log('🎨 Benutzeroberfläche erfolgreich initialisiert');
}

// Event-System initialisieren
function initializeEventSystem() {
    console.log('🔗 Event-System wird initialisiert...');
    
    // Window-Events
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    // Hash-Change für Navigation
    window.addEventListener('hashchange', handleHashChange);
    
    // Resize-Events
    window.addEventListener('resize', debounce(handleWindowResize, 250));
    
    // Online/Offline Events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    console.log('✅ Event-System initialisiert');
}

// Shortcuts initialisieren
function initializeShortcuts() {
    console.log('⌨️ Shortcuts werden initialisiert...');
    
    if (window.ShortcutManager) {
        window.ShortcutManager.initializeShortcuts();
        console.log('✅ Shortcuts initialisiert');
    }
}

// Auto-Save einrichten
function setupAutoSave() {
    if (!appData.settings.autoSave) return;
    
    const interval = appData.settings.autoSaveInterval || 30000; // 30 Sekunden
    
    setInterval(() => {
        try {
            saveAllData();
            console.log('💾 Auto-Save durchgeführt');
        } catch (error) {
            console.error('💾 Auto-Save Fehler:', error);
        }
    }, interval);
    
    console.log(`💾 Auto-Save aktiviert (${interval / 1000}s Intervall)`);
}

// Cleanup-Handler einrichten
function setupCleanupHandlers() {
    // Electron-spezifische Handler
    if (window.require) {
        const { ipcRenderer } = window.require('electron');
        
        ipcRenderer.on('app-before-quit', () => {
            console.log('🔄 App wird beendet, speichere Daten...');
            saveAllData();
        });
    }
    
    // Browser-spezifische Handler
    window.addEventListener('beforeunload', (e) => {
        // Prüfe auf ungespeicherte Änderungen
        if (hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = 'Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?';
            return e.returnValue;
        }
    });
}

// Initialisierung abschließen
function finalizeInitialization() {
    // Lade-Animation ausblenden
    hideLoadingAnimation();
    
    // Willkommensnachricht anzeigen (nur beim ersten Start)
    if (isFirstRun()) {
        showWelcomeMessage();
    }
    
    // Performance-Metriken loggen
    logPerformanceMetrics();
    
    // Update-Check (falls verfügbar)
    checkForUpdates();
}

// Theme anwenden
function applyTheme(themeName) {
    document.body.className = `theme-${themeName}`;
    document.documentElement.setAttribute('data-theme', themeName);
}

// URL-Navigation behandeln
function handleUrlNavigation() {
    const hash = window.location.hash.slice(1);
    if (hash && window.UIManager) {
        window.UIManager.switchTab(hash);
    }
}

// Hash-Change behandeln
function handleHashChange() {
    handleUrlNavigation();
}

// Window-Events
function handleBeforeUnload(e) {
    // Speichere alle Daten vor dem Schließen
    try {
        saveAllData();
    } catch (error) {
        console.error('Fehler beim Speichern vor dem Schließen:', error);
    }
}

function handleUnload() {
    // Cleanup-Aktionen
    if (window.FocusManager) {
        const session = window.FocusManager.getCurrentFocusSession();
        if (session && session.isActive) {
            // Fokus-Session pausieren beim Schließen
            window.FocusManager.toggleFocusSession();
        }
    }
}

function handleWindowFocus() {
    // App-Daten aktualisieren wenn Fenster Fokus erhält
    refreshAppData();
}

function handleWindowBlur() {
    // Daten speichern wenn Fenster Fokus verliert
    saveAllData();
}

function handleWindowResize() {
    // UI-Layout anpassen
    if (window.UIManager) {
        window.UIManager.updateAllViews();
    }
}

function handleOnline() {
    console.log('🌐 Online-Verbindung wiederhergestellt');
    showNotification('🌐 Online-Verbindung wiederhergestellt', 'success');
}

function handleOffline() {
    console.log('📶 Offline-Modus aktiviert');
    showNotification('📶 Offline-Modus aktiviert', 'warning');
}

// Hilfsfunktionen
function saveAllData() {
    if (window.TaskManager) window.TaskManager.saveTasks();
    if (window.NoteManager) window.NoteManager.saveNotes();
    if (window.GroupManager) window.GroupManager.saveGroups();
    if (window.FocusManager) window.FocusManager.saveFocusSettings();
    if (window.UIManager) window.UIManager.saveUISettings();
}

function refreshAppData() {
    // Daten neu laden falls sie extern geändert wurden
    try {
        const newData = window.StorageManager.loadAllData();
        
        // Prüfe auf Änderungen und aktualisiere UI falls nötig
        if (JSON.stringify(newData) !== JSON.stringify(appData)) {
            appData = newData;
            
            // Manager aktualisieren
            if (window.TaskManager) window.TaskManager.loadTasks();
            if (window.NoteManager) window.NoteManager.loadNotes();
            if (window.GroupManager) window.GroupManager.loadGroups();
            
            console.log('🔄 App-Daten aktualisiert');
        }
    } catch (error) {
        console.error('🔄 Fehler beim Aktualisieren der App-Daten:', error);
    }
}

function hasUnsavedChanges() {
    // TODO: Implementiere Check für ungespeicherte Änderungen
    return false;
}

function isFirstRun() {
    return appData.stats.totalFocusTime === 0 && 
           appData.tasks.length === 0 && 
           appData.notes.length === 0;
}

function hideLoadingAnimation() {
    const loader = document.querySelector('.app-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
    }
}

function showWelcomeMessage() {
    if (window.PopupManager) {
        const content = `
            <div class="welcome-message">
                <div class="welcome-icon">🎯</div>
                <h3>Willkommen beim Fokus Planer!</h3>
                <p>Ihr persönlicher Assistent für produktives Arbeiten mit Fokus-Sessions, Aufgaben-Management und Notizen.</p>
                
                <div class="welcome-features">
                    <div class="feature">
                        <strong>📋 Aufgaben verwalten</strong>
                        <p>Erstellen Sie Aufgaben, organisieren Sie sie in Gruppen und behalten Sie den Überblick.</p>
                    </div>
                    <div class="feature">
                        <strong>🎯 Fokus-Sessions</strong>
                        <p>Nutzen Sie den Pomodoro-Timer für konzentriertes Arbeiten mit 20-minütigen Sessions.</p>
                    </div>
                    <div class="feature">
                        <strong>📝 Notizen</strong>
                        <p>Sammeln Sie Ideen und Gedanken, konvertieren Sie sie bei Bedarf in Aufgaben.</p>
                    </div>
                </div>
                
                <div class="welcome-shortcuts">
                    <h4>Wichtige Shortcuts:</h4>
                    <ul>
                        <li><kbd>Ctrl</kbd>+<kbd>T</kbd> - Neue Aufgabe</li>
                        <li><kbd>Ctrl</kbd>+<kbd>N</kbd> - Neue Notiz</li>
                        <li><kbd>Ctrl</kbd>+<kbd>F</kbd> - Fokus-Modus</li>
                    </ul>
                </div>
                
                <div class="welcome-actions">
                    <button class="btn btn-primary" onclick="closePopup()">Los geht's!</button>
                    <button class="btn btn-secondary" onclick="showShortcutsHelp()">Alle Shortcuts anzeigen</button>
                </div>
            </div>
        `;
        
        window.PopupManager.showPopup('Willkommen! 🎉', content);
    }
}

function logPerformanceMetrics() {
    if (window.performance) {
        const metrics = {
            loadTime: Math.round(window.performance.now()),
            navigation: window.performance.getEntriesByType('navigation')[0]
        };
        
        console.log('📊 Performance-Metriken:', metrics);
    }
}

function checkForUpdates() {
    // TODO: Implementiere Update-Check
    console.log('🔍 Update-Check (noch nicht implementiert)');
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'app-error';
    errorDiv.innerHTML = `
        <div class="error-content">
            <h2>❌ Fehler</h2>
            <p>${message}</p>
            <button onclick="location.reload()" class="btn btn-primary">Neu laden</button>
        </div>
    `;
    
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        text-align: center;
    `;
    
    document.body.appendChild(errorDiv);
}

function showNotification(message, type = 'info') {
    if (window.NoteManager && typeof window.NoteManager.showNotification === 'function') {
        window.NoteManager.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Debounce-Funktion für Performance
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// CSS für Welcome-Message hinzufügen
const welcomeCSS = `
<style>
.welcome-message {
    text-align: center;
    max-width: 600px;
}

.welcome-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-lg);
}

.welcome-message h3 {
    color: var(--accent-primary);
    margin-bottom: var(--spacing-md);
    font-size: 1.5rem;
}

.welcome-message > p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xl);
    font-size: 1.1rem;
    line-height: 1.5;
}

.welcome-features {
    display: grid;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
    text-align: left;
}

.feature {
    background: var(--bg-tertiary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
}

.feature strong {
    display: block;
    margin-bottom: var(--spacing-xs);
    color: var(--text-primary);
}

.feature p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0;
}

.welcome-shortcuts {
    background: var(--bg-tertiary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-xl);
}

.welcome-shortcuts h4 {
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
}

.welcome-shortcuts ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.welcome-shortcuts li {
    padding: var(--spacing-xs) 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.welcome-shortcuts kbd {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.75rem;
    font-family: monospace;
    color: var(--text-primary);
}

.welcome-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
}

.app-loader {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    transition: opacity 0.3s ease;
}

@media (max-width: 768px) {
    .welcome-actions {
        flex-direction: column;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', welcomeCSS);

// App-Export
window.FokusApp = {
    initialize: initializeApp,
    saveAllData,
    refreshAppData,
    appData,
    initialized: () => appInitialized
};

// App automatisch starten wenn DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM geladen, starte App-Initialisierung...');
    
    // Zusätzliche Sicherheit: Warte bis alle Elemente verfügbar sind
    setTimeout(() => {
        initializeApp();
    }, 100);
});

// Fallback falls DOMContentLoaded bereits gefeuert wurde
if (document.readyState === 'loading') {
    // DOM ist noch nicht bereit, warte auf DOMContentLoaded
} else {
    // DOM ist bereits bereit, starte sofort
    console.log('📄 DOM bereits bereit, starte App-Initialisierung...');
    setTimeout(() => {
        initializeApp();
    }, 100);
}

// Globale Error-Handler
window.addEventListener('error', (e) => {
    console.error('🚨 Unbehandelter Fehler:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 Unbehandelte Promise-Ablehnung:', e.reason);
});

console.log('📋 Fokus Planer - App-Modul geladen');

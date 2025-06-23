// Shortcuts Management - Globale Funktionen für Tastenkombinationen

let shortcutsEnabled = true;
let registeredShortcuts = new Map();

// Shortcuts initialisieren
function initializeShortcuts() {
    setupKeyboardListeners();
    registerDefaultShortcuts();
    setupShortcutTooltips();
}

// Keyboard Event Listeners einrichten
function setupKeyboardListeners() {
    document.addEventListener('keydown', handleKeyDown);
    
    // IPC Listener für Electron Shortcuts
    if (window.require) {
        const { ipcRenderer } = window.require('electron');
        
        ipcRenderer.on('shortcut-new-note', () => {
            if (shortcutsEnabled) {
                handleShortcut('new-note');
            }
        });
        
        ipcRenderer.on('shortcut-new-task', () => {
            if (shortcutsEnabled) {
                handleShortcut('new-task');
            }
        });
        
        ipcRenderer.on('shortcut-focus-mode', () => {
            if (shortcutsEnabled) {
                handleShortcut('focus-mode');
            }
        });
    }
}

// Standard-Shortcuts registrieren
function registerDefaultShortcuts() {
    // Grundlegende Shortcuts
    registerShortcut('Ctrl+N', 'new-note', 'Neue Notiz erstellen');
    registerShortcut('Ctrl+T', 'new-task', 'Neue Aufgabe erstellen');
    registerShortcut('Ctrl+F', 'focus-mode', 'Fokus-Modus starten/verwalten');
    registerShortcut('Ctrl+G', 'new-group', 'Neue Gruppe erstellen');
    
    // Navigation
    registerShortcut('Ctrl+1', 'tab-dashboard', 'Zum Dashboard wechseln');
    registerShortcut('Ctrl+2', 'tab-tasks', 'Zu Aufgaben wechseln');
    registerShortcut('Ctrl+3', 'tab-notes', 'Zu Notizen wechseln');
    registerShortcut('Ctrl+4', 'tab-archive', 'Zum Archiv wechseln');
    
    // Suche und Navigation
    registerShortcut('Ctrl+K', 'quick-search', 'Schnellsuche öffnen');
    registerShortcut('F3', 'search-next', 'Nächstes Suchergebnis');
    registerShortcut('Shift+F3', 'search-previous', 'Vorheriges Suchergebnis');
    
    // Ansicht
    registerShortcut('Ctrl+Shift+L', 'toggle-view', 'Ansicht wechseln (Liste/Raster)');
    
    // Popup-Steuerung
    registerShortcut('Escape', 'close-popup', 'Popup schließen');
    registerShortcut('Ctrl+Enter', 'submit-form', 'Formular absenden');
    
    // Fokus-Spezifische Shortcuts
    registerShortcut('Space', 'toggle-focus-timer', 'Fokus-Timer pausieren/fortsetzen');
    registerShortcut('Ctrl+Shift+F', 'stop-focus', 'Fokus-Session beenden');
    
    // Erweiterte Funktionen
    registerShortcut('Ctrl+S', 'save-all', 'Alle Daten speichern');
    registerShortcut('Ctrl+Shift+B', 'create-backup', 'Backup erstellen');
    registerShortcut('F11', 'toggle-fullscreen', 'Vollbild umschalten');
    
    // Debug (nur in Entwicklung)
    registerShortcut('Ctrl+Shift+D', 'toggle-devtools', 'Entwicklertools umschalten');
}

// Shortcut registrieren
function registerShortcut(keyCombo, action, description) {
    const normalizedCombo = normalizeKeyCombo(keyCombo);
    registeredShortcuts.set(normalizedCombo, {
        action: action,
        description: description,
        keyCombo: keyCombo
    });
}

// Key-Kombination normalisieren
function normalizeKeyCombo(combo) {
    return combo
        .toLowerCase()
        .replace(/\s+/g, '')
        .split('+')
        .sort()
        .join('+');
}

// Keyboard Event behandeln
function handleKeyDown(e) {
    if (!shortcutsEnabled) return;
    
    // Wenn in einem Input/Textarea, nur bestimmte Shortcuts erlauben
    if (isInputElement(e.target)) {
        handleInputShortcuts(e);
        return;
    }
    
    // Key-Kombination erstellen
    const keys = [];
    if (e.ctrlKey) keys.push('ctrl');
    if (e.shiftKey) keys.push('shift');
    if (e.altKey) keys.push('alt');
    if (e.metaKey) keys.push('meta');
    
    // Haupt-Taste hinzufügen
    const key = e.key.toLowerCase();
    if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
        keys.push(key);
    }
    
    const keyCombo = keys.sort().join('+');
    const shortcut = registeredShortcuts.get(keyCombo);
    
    if (shortcut) {
        e.preventDefault();
        e.stopPropagation();
        handleShortcut(shortcut.action);
    }
}

// Input-Element prüfen
function isInputElement(element) {
    const inputTypes = ['input', 'textarea', 'select'];
    return inputTypes.includes(element.tagName.toLowerCase()) || 
           element.contentEditable === 'true';
}

// Input-spezifische Shortcuts behandeln
function handleInputShortcuts(e) {
    const keyCombo = createKeyCombo(e);
    
    // Nur bestimmte Shortcuts in Input-Elementen erlauben
    const allowedInInputs = [
        'ctrl+a', 'ctrl+c', 'ctrl+v', 'ctrl+x', 'ctrl+z', 'ctrl+y',
        'escape', 'ctrl+enter', 'ctrl+s'
    ];
    
    if (allowedInInputs.includes(keyCombo)) {
        const shortcut = registeredShortcuts.get(keyCombo);
        if (shortcut) {
            e.preventDefault();
            e.stopPropagation();
            handleShortcut(shortcut.action);
        }
    }
}

// Key-Kombination aus Event erstellen
function createKeyCombo(e) {
    const keys = [];
    if (e.ctrlKey) keys.push('ctrl');
    if (e.shiftKey) keys.push('shift');
    if (e.altKey) keys.push('alt');
    if (e.metaKey) keys.push('meta');
    
    const key = e.key.toLowerCase();
    if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
        keys.push(key);
    }
    
    return keys.sort().join('+');
}

// Shortcut-Aktion ausführen
function handleShortcut(action) {
    switch (action) {
        // Erstellung
        case 'new-note':
            if (window.NoteManager) {
                window.NoteManager.showNewNoteDialog();
            }
            break;
            
        case 'new-task':
            if (window.TaskManager) {
                window.TaskManager.showNewTaskDialog();
            }
            break;
            
        case 'new-group':
            if (window.GroupManager) {
                window.GroupManager.showNewGroupDialog();
            }
            break;
            
        // Navigation
        case 'tab-dashboard':
            if (window.UIManager) {
                window.UIManager.switchTab('dashboard');
            }
            break;
            
        case 'tab-tasks':
            if (window.UIManager) {
                window.UIManager.switchTab('tasks');
            }
            break;
            
        case 'tab-notes':
            if (window.UIManager) {
                window.UIManager.switchTab('notes');
            }
            break;
            
        case 'tab-archive':
            if (window.UIManager) {
                window.UIManager.switchTab('archive');
            }
            break;
            
        // Fokus
        case 'focus-mode':
            if (window.UIManager) {
                window.UIManager.handleFocusMode();
            }
            break;
            
        case 'toggle-focus-timer':
            if (window.FocusManager && window.FocusManager.getCurrentFocusSession()) {
                window.FocusManager.toggleFocusSession();
            }
            break;
            
        case 'stop-focus':
            if (window.FocusManager && window.FocusManager.getCurrentFocusSession()) {
                if (confirm('Fokus-Session wirklich beenden?')) {
                    window.FocusManager.stopFocusSession();
                }
            }
            break;
            
        // Suche
        case 'quick-search':
            focusSearchInput();
            break;
            
        case 'search-next':
            // TODO: Implement search navigation
            break;
            
        case 'search-previous':
            // TODO: Implement search navigation
            break;
            
        // Ansicht
        case 'toggle-view':
            if (window.UIManager) {
                window.UIManager.toggleViewMode();
            }
            break;
            
        // Popup-Steuerung
        case 'close-popup':
            if (window.PopupManager) {
                window.PopupManager.closePopup();
            }
            break;
            
        case 'submit-form':
            submitActiveForm();
            break;
            
        // System
        case 'save-all':
            saveAllData();
            break;
            
        case 'create-backup':
            createBackup();
            break;
            
        case 'toggle-fullscreen':
            toggleFullscreen();
            break;
            
        case 'toggle-devtools':
            toggleDevTools();
            break;
            
        default:
            console.log('Unbekannte Shortcut-Aktion:', action);
    }
}

// Suchfeld fokussieren
function focusSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.focus();
        searchInput.select();
    }
}

// Aktives Formular absenden
function submitActiveForm() {
    const activeForm = document.querySelector('.popup-container form');
    if (activeForm) {
        const submitButton = activeForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.click();
        }
    }
}

// Alle Daten speichern
function saveAllData() {
    try {
        if (window.TaskManager) window.TaskManager.saveTasks();
        if (window.NoteManager) window.NoteManager.saveNotes();
        if (window.GroupManager) window.GroupManager.saveGroups();
        if (window.FocusManager) window.FocusManager.saveFocusSettings();
        if (window.UIManager) window.UIManager.saveUISettings();
        
        showShortcutNotification('💾 Alle Daten gespeichert!', 'success');
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        showShortcutNotification('❌ Fehler beim Speichern!', 'error');
    }
}

// Backup erstellen
function createBackup() {
    try {
        const backupPath = window.StorageManager.createBackup();
        if (backupPath) {
            showShortcutNotification('📦 Backup erstellt!', 'success');
        } else {
            showShortcutNotification('❌ Backup-Erstellung fehlgeschlagen!', 'error');
        }
    } catch (error) {
        console.error('Fehler beim Backup:', error);
        showShortcutNotification('❌ Backup-Fehler!', 'error');
    }
}

// Vollbild umschalten
function toggleFullscreen() {
    if (window.require) {
        const { remote } = window.require('electron');
        const win = remote.getCurrentWindow();
        win.setFullScreen(!win.isFullScreen());
    }
}

// Entwicklertools umschalten
function toggleDevTools() {
    if (window.require) {
        const { remote } = window.require('electron');
        const win = remote.getCurrentWindow();
        win.webContents.toggleDevTools();
    }
}

// Shortcut-Tooltips einrichten
function setupShortcutTooltips() {
    // Tooltips für Buttons mit Shortcuts hinzufügen
    const buttonsWithShortcuts = [
        { id: 'newTaskBtn', shortcut: 'Ctrl+T' },
        { id: 'newNoteBtn', shortcut: 'Ctrl+N' },
        { id: 'focusModeBtn', shortcut: 'Ctrl+F' },
        { id: 'newGroupBtn', shortcut: 'Ctrl+G' },
        { id: 'viewToggle', shortcut: 'Ctrl+Shift+L' }
    ];
    
    buttonsWithShortcuts.forEach(({ id, shortcut }) => {
        const button = document.getElementById(id);
        if (button) {
            const currentTitle = button.title || '';
            button.title = currentTitle + (currentTitle ? ' ' : '') + `(${shortcut})`;
        }
    });
}

// Shortcuts aktivieren/deaktivieren
function toggleShortcuts(enabled = null) {
    if (enabled === null) {
        shortcutsEnabled = !shortcutsEnabled;
    } else {
        shortcutsEnabled = enabled;
    }
    
    console.log('Shortcuts', shortcutsEnabled ? 'aktiviert' : 'deaktiviert');
    return shortcutsEnabled;
}

// Shortcuts-Hilfe anzeigen
function showShortcutsHelp() {
    const shortcutGroups = {
        'Erstellung': [
            { combo: 'Ctrl+N', desc: 'Neue Notiz erstellen' },
            { combo: 'Ctrl+T', desc: 'Neue Aufgabe erstellen' },
            { combo: 'Ctrl+G', desc: 'Neue Gruppe erstellen' }
        ],
        'Navigation': [
            { combo: 'Ctrl+1', desc: 'Dashboard' },
            { combo: 'Ctrl+2', desc: 'Aufgaben' },
            { combo: 'Ctrl+3', desc: 'Notizen' },
            { combo: 'Ctrl+4', desc: 'Archiv' }
        ],
        'Fokus': [
            { combo: 'Ctrl+F', desc: 'Fokus-Modus starten/verwalten' },
            { combo: 'Leertaste', desc: 'Fokus-Timer pausieren/fortsetzen' },
            { combo: 'Ctrl+Shift+F', desc: 'Fokus-Session beenden' }
        ],
        'Suche & Ansicht': [
            { combo: 'Ctrl+K', desc: 'Schnellsuche öffnen' },
            { combo: 'Ctrl+Shift+L', desc: 'Ansicht wechseln (Liste/Raster)' }
        ],
        'Allgemein': [
            { combo: 'Escape', desc: 'Popup schließen' },
            { combo: 'Ctrl+Enter', desc: 'Formular absenden' },
            { combo: 'Ctrl+S', desc: 'Alle Daten speichern' },
            { combo: 'F11', desc: 'Vollbild umschalten' }
        ]
    };
    
    const content = `
        <div class="shortcuts-help">
            <div class="shortcuts-intro">
                <p>Verwenden Sie diese Tastenkombinationen für eine effizientere Bedienung:</p>
            </div>
            
            ${Object.entries(shortcutGroups).map(([groupName, shortcuts]) => `
                <div class="shortcut-group">
                    <h4 class="shortcut-group-title">${groupName}</h4>
                    <div class="shortcut-list">
                        ${shortcuts.map(({ combo, desc }) => `
                            <div class="shortcut-item">
                                <div class="shortcut-combo">
                                    ${combo.split('+').map(key => `<kbd>${key}</kbd>`).join('+')}
                                </div>
                                <div class="shortcut-desc">${desc}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
            
            <div class="shortcuts-footer">
                <p><small>💡 Tipp: Die meisten Shortcuts funktionieren global, außer in Eingabefeldern.</small></p>
            </div>
        </div>
    `;
    
    if (window.PopupManager) {
        window.PopupManager.showPopup('⌨️ Tastenkombinationen', content);
    }
}

// Shortcut-Benachrichtigung anzeigen
function showShortcutNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `shortcut-notification shortcut-notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--accent-success)' : type === 'error' ? 'var(--accent-danger)' : 'var(--accent-primary)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 0.9rem;
        animation: slideInUp 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Nach 2 Sekunden entfernen
    setTimeout(() => {
        notification.style.animation = 'slideOutDown 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 2000);
}

// CSS für Shortcuts-Hilfe hinzufügen
const shortcutsCSS = `
<style>
.shortcuts-help {
    max-height: 70vh;
    overflow-y: auto;
}

.shortcuts-intro {
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-md);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    text-align: center;
}

.shortcut-group {
    margin-bottom: var(--spacing-lg);
}

.shortcut-group-title {
    margin-bottom: var(--spacing-md);
    color: var(--accent-primary);
    font-size: 1rem;
    font-weight: 600;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: var(--spacing-xs);
}

.shortcut-list {
    display: grid;
    gap: var(--spacing-sm);
}

.shortcut-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    transition: background-color var(--transition-fast);
}

.shortcut-item:hover {
    background: var(--bg-hover);
}

.shortcut-combo {
    display: flex;
    gap: 2px;
    align-items: center;
}

.shortcut-combo kbd {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.75rem;
    font-family: monospace;
    color: var(--text-primary);
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.shortcut-desc {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.shortcuts-footer {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border-color);
    text-align: center;
}

@keyframes slideInUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

@keyframes slideOutDown {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(100%); opacity: 0; }
}

@media (max-width: 768px) {
    .shortcut-item {
        flex-direction: column;
        gap: var(--spacing-xs);
        text-align: center;
    }
    
    .shortcut-combo {
        justify-content: center;
    }
}
</style>
`;

// CSS zum Head hinzufügen
document.head.insertAdjacentHTML('beforeend', shortcutsCSS);

// Exportiere globale Funktionen
window.ShortcutManager = {
    initializeShortcuts,
    registerShortcut,
    toggleShortcuts,
    showShortcutsHelp,
    handleShortcut
};

// Globale Funktionen für HTML onclick Events
window.showShortcutsHelp = showShortcutsHelp;

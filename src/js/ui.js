// UI Management - Globale Funktionen für Benutzeroberfläche

// UI-Status in globalem Objekt kapseln, um Konflikte zu vermeiden
if (typeof window.FokusUI === 'undefined') {
    window.FokusUI = {
        currentTab: 'dashboard',
        currentViewMode: 'grid', // 'grid', 'kanban', 'list'
        searchTimeout: null,
        initialized: false
    };
}

// Shortcuts für bessere Lesbarkeit
const UI = window.FokusUI;

// UI initialisieren
function initializeUI() {
    if (UI.initialized) {
        console.log('UI bereits initialisiert');
        return;
    }
    
    try {
        console.log('🎨 Starte UI-Initialisierung...');
        
        setupNavigation();
        setupSearch();
        setupViewToggle();
        setupEventListeners();
        loadUISettings();
        updateAllViews();
        
        UI.initialized = true;
        console.log('✅ UI erfolgreich initialisiert');
    } catch (error) {
        console.error('❌ Fehler bei UI-Initialisierung:', error);
    }
}

// Navigation einrichten
function setupNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    console.log(`Gefunden ${navTabs.length} Navigation-Tabs`);
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = e.currentTarget.dataset.tab;
            console.log('Tab-Wechsel zu:', tabId);
            switchTab(tabId);
        });
    });
}

// Tab wechseln
function switchTab(tabId) {
    console.log('Wechsle zu Tab:', tabId);
    
    // Aktuelle Tab-Markierung entfernen
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Tab-Inhalte verstecken
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Neue Tab aktivieren
    const newTab = document.querySelector(`[data-tab="${tabId}"]`);
    const newContent = document.getElementById(`${tabId}-tab`);
    
    if (newTab && newContent) {
        newTab.classList.add('active');
        newContent.classList.add('active');
        UI.currentTab = tabId;
        
        // Tab-spezifische Aktionen
        handleTabSwitch(tabId);
        
        // URL aktualisieren
        if (history.replaceState) {
            history.replaceState(null, null, `#${tabId}`);
        }
        
        console.log('✅ Tab gewechselt zu:', tabId);
    } else {
        console.error('❌ Tab-Elemente nicht gefunden:', { tabId, newTab: !!newTab, newContent: !!newContent });
    }
}

// Tab-spezifische Aktionen
function handleTabSwitch(tabId) {
    switch (tabId) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'tasks':
            if (window.TaskManager) {
                window.TaskManager.updateTasksUI();
            }
            break;
        case 'notes':
            if (window.NoteManager) {
                window.NoteManager.updateNotesUI();
            }
            break;
        case 'archive':
            updateArchive();
            break;
        default:
            console.warn('Unbekannter Tab:', tabId);
    }
}

// Suche einrichten
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        console.log('✅ Suchfeld gefunden und Event-Listener hinzugefügt');
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(UI.searchTimeout);
            UI.searchTimeout = setTimeout(() => {
                handleSearch(e.target.value);
            }, 300);
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(e.target.value);
            }
        });
    } else {
        console.warn('⚠️ Suchfeld nicht gefunden');
    }
}

// Suche durchführen
function handleSearch(searchTerm) {
    const term = searchTerm.trim().toLowerCase();
    console.log('Suche nach:', term);
    
    switch (UI.currentTab) {
        case 'tasks':
            if (window.TaskManager) {
                window.TaskManager.updateTasksUI();
            }
            break;
        case 'notes':
            if (window.NoteManager) {
                window.NoteManager.updateNotesUI();
            }
            break;
        case 'archive':
            updateArchive();
            break;
        default:
            if (term) {
                performGlobalSearch(term);
            }
    }
}

// Globale Suche
function performGlobalSearch(term) {
    console.log('Starte globale Suche für:', term);
    
    if (!window.StorageManager) {
        console.error('StorageManager nicht verfügbar');
        return;
    }
    
    const results = {
        tasks: [],
        notes: [],
        archived: []
    };
    
    try {
        // Aufgaben durchsuchen
        const tasks = window.StorageManager.readDataFile('tasks');
        results.tasks = tasks.filter(task => 
            task.title.toLowerCase().includes(term) ||
            (task.description && task.description.toLowerCase().includes(term)) ||
            (task.tags && task.tags.some(tag => tag.toLowerCase().includes(term)))
        );
        
        // Notizen durchsuchen
        const notes = window.StorageManager.readDataFile('notes');
        results.notes = notes.filter(note => 
            note.title.toLowerCase().includes(term) ||
            (note.content && note.content.toLowerCase().includes(term)) ||
            (note.tags && note.tags.some(tag => tag.toLowerCase().includes(term)))
        );
        
        // Archiv durchsuchen
        const archive = window.StorageManager.readDataFile('archive');
        if (archive.tasks) {
            results.archived.push(...archive.tasks.filter(task => 
                task.title.toLowerCase().includes(term) ||
                (task.description && task.description.toLowerCase().includes(term))
            ));
        }
        if (archive.notes) {
            results.archived.push(...archive.notes.filter(note => 
                note.title.toLowerCase().includes(term) ||
                (note.content && note.content.toLowerCase().includes(term))
            ));
        }
        
        showSearchResults(term, results);
    } catch (error) {
        console.error('Fehler bei globaler Suche:', error);
    }
}

// Suchergebnisse anzeigen
function showSearchResults(term, results) {
    const totalResults = results.tasks.length + results.notes.length + results.archived.length;
    
    if (totalResults === 0) {
        showNotification(`Keine Ergebnisse für "${term}" gefunden.`, 'info');
        return;
    }
    
    // Zu Dashboard wechseln
    switchTab('dashboard');
    
    // Suchergebnisse-Container erstellen
    const dashboardContent = document.getElementById('dashboard-tab');
    if (!dashboardContent) {
        console.error('Dashboard-Content nicht gefunden');
        return;
    }
    
    // Bestehende Suchergebnisse entfernen
    const existingResults = dashboardContent.querySelector('.search-results');
    if (existingResults) {
        existingResults.remove();
    }
    
    const searchResultsContainer = document.createElement('div');
    searchResultsContainer.className = 'search-results';
    searchResultsContainer.innerHTML = `
        <div class="search-header">
            <h3>Suchergebnisse für "${term}" (${totalResults})</h3>
            <button class="btn btn-secondary" onclick="clearSearchResults()">
                <span class="icon">×</span> Suche löschen
            </button>
        </div>
        <div class="search-content">
            ${results.tasks.length > 0 ? `
                <div class="search-section">
                    <h4>Aufgaben (${results.tasks.length})</h4>
                    <div class="search-items">
                        ${results.tasks.map(task => createSearchResultItem(task, 'task')).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${results.notes.length > 0 ? `
                <div class="search-section">
                    <h4>Notizen (${results.notes.length})</h4>
                    <div class="search-items">
                        ${results.notes.map(note => createSearchResultItem(note, 'note')).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${results.archived.length > 0 ? `
                <div class="search-section">
                    <h4>Archiv (${results.archived.length})</h4>
                    <div class="search-items">
                        ${results.archived.map(item => createSearchResultItem(item, 'archived')).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Neue Ergebnisse einfügen
    dashboardContent.insertBefore(searchResultsContainer, dashboardContent.firstChild);
}

// Suchergebnis-Item erstellen
function createSearchResultItem(item, type) {
    const isArchived = type === 'archived';
    const isTask = type === 'task' || (isArchived && item.subtasks !== undefined);
    
    return `
        <div class="search-item ${type}" onclick="openSearchResultItem('${item.id}', '${type}')">
            <div class="search-item-header">
                <span class="search-item-type">${isTask ? '📋' : '📝'} ${isArchived ? 'Archiv' : isTask ? 'Aufgabe' : 'Notiz'}</span>
                <span class="search-item-date">${window.StorageManager.formatDate(item.createdAt)}</span>
            </div>
            <h4 class="search-item-title">${item.title || 'Ohne Titel'}</h4>
            <p class="search-item-content">${((item.description || item.content || '').substring(0, 100))}${(item.description || item.content || '').length > 100 ? '...' : ''}</p>
            ${item.tags && item.tags.length > 0 ? `
                <div class="search-item-tags">
                    ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Suchergebnis-Item öffnen
function openSearchResultItem(itemId, type) {
    console.log('Öffne Suchergebnis:', { itemId, type });
    
    switch (type) {
        case 'task':
            switchTab('tasks');
            if (window.TaskManager && window.TaskManager.openTaskEditor) {
                setTimeout(() => window.TaskManager.openTaskEditor(itemId), 100);
            }
            break;
        case 'note':
            switchTab('notes');
            if (window.NoteManager && window.NoteManager.editNote) {
                setTimeout(() => window.NoteManager.editNote(itemId), 100);
            }
            break;
        case 'archived':
            switchTab('archive');
            break;
    }
}

// Suchergebnisse löschen
function clearSearchResults() {
    const searchResults = document.querySelector('.search-results');
    if (searchResults) {
        searchResults.remove();
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    updateDashboard();
}

// View-Toggle einrichten
function setupViewToggle() {
    const viewToggle = document.getElementById('viewToggle');
    if (viewToggle) {
        console.log('✅ View-Toggle gefunden');
        viewToggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleViewMode();
        });
        updateViewToggleIcon();
    } else {
        console.warn('⚠️ View-Toggle nicht gefunden');
    }
}

// Ansichtsmodus wechseln
function toggleViewMode() {
    // Zyklisch durch die Modi wechseln: grid -> kanban -> list -> grid
    switch (UI.currentViewMode) {
        case 'grid':
            UI.currentViewMode = 'kanban';
            break;
        case 'kanban':
            UI.currentViewMode = 'list';
            break;
        case 'list':
            UI.currentViewMode = 'grid';
            break;
        default:
            UI.currentViewMode = 'grid';
    }
    
    console.log('View-Modus gewechselt zu:', UI.currentViewMode);
    updateViewMode();
    saveUISettings();
}

// Ansichtsmodus aktualisieren
function updateViewMode() {
    const containers = document.querySelectorAll('.content-grid');
    containers.forEach(container => {
        container.classList.remove('list-view', 'kanban-view');
        
        if (UI.currentViewMode === 'list') {
            container.classList.add('list-view');
        } else if (UI.currentViewMode === 'kanban') {
            container.classList.add('kanban-view');
        }
    });
    
    updateViewToggleIcon();
    
    // UI für aktuellen Tab aktualisieren
    if (UI.currentTab === 'tasks' && window.TaskManager) {
        window.TaskManager.updateTasksUI();
    }
}

// View-Toggle Icon aktualisieren
function updateViewToggleIcon() {
    const viewToggle = document.getElementById('viewToggle');
    if (viewToggle) {
        const icon = viewToggle.querySelector('.icon');
        if (icon) {
            switch (UI.currentViewMode) {
                case 'grid':
                    icon.textContent = '⊞';
                    viewToggle.title = 'Zur Kanban-Ansicht wechseln';
                    break;
                case 'kanban':
                    icon.textContent = '☰';
                    viewToggle.title = 'Zur Listen-Ansicht wechseln';
                    break;
                case 'list':
                    icon.textContent = '⋮';
                    viewToggle.title = 'Zur Raster-Ansicht wechseln';
                    break;
            }
        }
    }
}

// Event Listeners einrichten
function setupEventListeners() {
    console.log('🔗 Richte Event-Listeners ein...');
    
    // Header-Buttons
    const buttons = [
        { id: 'newTaskBtn', handler: () => window.TaskManager?.showNewTaskDialog?.() },
        { id: 'newNoteBtn', handler: () => window.NoteManager?.showNewNoteDialog?.() },
        { id: 'focusModeBtn', handler: handleFocusMode },
        { id: 'newGroupBtn', handler: () => window.GroupManager?.showNewGroupDialog?.() }
    ];
    
    buttons.forEach(({ id, handler }) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Button geklickt:', id);
                handler();
            });
            console.log('✅ Event-Listener für', id, 'hinzugefügt');
        } else {
            console.warn('⚠️ Button nicht gefunden:', id);
        }
    });
    
    // Quick Actions
    const quickActions = [
        { id: 'quickTask', handler: () => window.TaskManager?.showNewTaskDialog?.() },
        { id: 'quickNote', handler: () => window.NoteManager?.showNewNoteDialog?.() },
        { id: 'quickFocus', handler: handleFocusMode }
    ];
    
    quickActions.forEach(({ id, handler }) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Quick-Action geklickt:', id);
                handler();
            });
            console.log('✅ Event-Listener für Quick-Action', id, 'hinzugefügt');
        }
    });
    
    // Gruppen-Filter
    const groupFilter = document.getElementById('groupFilter');
    if (groupFilter) {
        groupFilter.addEventListener('change', () => {
            if (window.TaskManager) {
                window.TaskManager.updateTasksUI();
            }
        });
        console.log('✅ Event-Listener für Gruppen-Filter hinzugefügt');
    }
    
    // Archiv-Aktionen
    const clearArchiveBtn = document.getElementById('clearArchiveBtn');
    if (clearArchiveBtn) {
        clearArchiveBtn.addEventListener('click', clearArchive);
        console.log('✅ Event-Listener für Archiv-Löschen hinzugefügt');
    }
}

// Fokus-Modus behandeln
function handleFocusMode() {
    console.log('🎯 Fokus-Modus aktiviert');
    
    try {
        const focusSession = window.FocusManager?.getCurrentFocusSession();
        
        if (focusSession && focusSession.isActive) {
            const action = confirm('Es läuft bereits eine Fokus-Session. Möchten Sie diese stoppen? (Abbrechen = Pausieren/Fortsetzen)');
            if (action) {
                window.FocusManager.stopFocusSession();
            } else {
                window.FocusManager.toggleFocusSession();
            }
        } else {
            showTaskSelectionForFocus();
        }
    } catch (error) {
        console.error('Fehler im Fokus-Modus:', error);
        alert('Der Fokus-Modus ist momentan nicht verfügbar.');
    }
}

// Aufgabenauswahl für Fokus anzeigen
function showTaskSelectionForFocus() {
    if (!window.StorageManager) {
        alert('Datensystem nicht verfügbar');
        return;
    }
    
    try {
        const tasks = window.StorageManager.readDataFile('tasks');
        const activeTasks = tasks.filter(task => !task.completed);
        
        if (activeTasks.length === 0) {
            alert('Keine aktiven Aufgaben vorhanden. Erstellen Sie zuerst eine Aufgabe.');
            return;
        }
        
        const content = `
            <div class="focus-task-selection">
                <p>Wählen Sie eine Aufgabe für die Fokus-Session:</p>
                <div class="task-selection-list">
                    ${activeTasks.map(task => {
                        const group = window.GroupManager?.getGroupById?.(task.groupId);
                        return `
                            <div class="task-selection-item" onclick="selectTaskForFocus('${task.id}')">
                                <div class="task-selection-header">
                                    <h4>${task.title}</h4>
                                    <span class="task-selection-group" style="color: ${group?.color || '#666'}">${group?.name || 'Unbekannt'}</span>
                                </div>
                                ${task.description ? `<p class="task-selection-desc">${task.description}</p>` : ''}
                                <div class="task-selection-meta">
                                    <span>⚡ ${task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}</span>
                                    ${task.estimatedTime ? `<span>⏱️ ${task.estimatedTime} Min</span>` : ''}
                                    ${task.subtasks?.length ? `<span>📋 ${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length} Subtasks</span>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        if (window.PopupManager) {
            window.PopupManager.showPopup('Fokus-Session starten', content);
        } else {
            alert('Popup-System nicht verfügbar');
        }
    } catch (error) {
        console.error('Fehler bei Aufgabenauswahl:', error);
        alert('Fehler beim Laden der Aufgaben');
    }
}

// Aufgabe für Fokus auswählen
function selectTaskForFocus(taskId) {
    console.log('Aufgabe für Fokus ausgewählt:', taskId);
    
    if (window.PopupManager) {
        window.PopupManager.closePopup();
    }
    
    if (window.FocusManager) {
        window.FocusManager.startFocusSession(taskId);
    } else {
        alert('Fokus-System nicht verfügbar');
    }
}

// Dashboard aktualisieren
function updateDashboard() {
    console.log('📊 Aktualisiere Dashboard...');
    updateDashboardStats();
    updateRecentTasks();
}

// Dashboard-Statistiken aktualisieren
function updateDashboardStats() {
    if (!window.StorageManager) return;
    
    try {
        const todayStats = window.StorageManager.getTodayStats();
        
        const todayTasksEl = document.getElementById('todayTasks');
        const todayFocusEl = document.getElementById('todayFocus');
        
        if (todayTasksEl) {
            todayTasksEl.textContent = todayStats.completedTasks || 0;
        }
        
        if (todayFocusEl) {
            todayFocusEl.textContent = todayStats.focusTime || 0;
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Dashboard-Statistiken:', error);
    }
}

// Letzte Aufgaben aktualisieren
function updateRecentTasks() {
    if (window.TaskManager && window.TaskManager.updateTasksUI) {
        // Aktualisiere speziell den recentTasks Container
        const container = document.getElementById('recentTasks');
        if (container && window.TaskManager.updateRecentTasksContainer) {
            window.TaskManager.updateRecentTasksContainer();
        }
    }
}

// Archiv aktualisieren
function updateArchive() {
    const container = document.getElementById('archiveContainer');
    if (!container || !window.StorageManager) return;
    
    try {
        const archive = window.StorageManager.readDataFile('archive');
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        
        let archivedItems = [];
        if (archive.tasks) archivedItems.push(...archive.tasks);
        if (archive.notes) archivedItems.push(...archive.notes);
        
        // Suche anwenden
        if (searchTerm) {
            archivedItems = archivedItems.filter(item => 
                item.title.toLowerCase().includes(searchTerm) ||
                (item.description || item.content || '').toLowerCase().includes(searchTerm)
            );
        }
        
        // Nach Archivierungsdatum sortieren
        archivedItems.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
        
        if (archivedItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h3>Archiv ist leer</h3>
                    <p>Hier erscheinen archivierte Aufgaben und Notizen.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = archivedItems.map(item => {
            const isTask = item.subtasks !== undefined;
            return `
                <div class="archive-card ${isTask ? 'task' : 'note'}">
                    <div class="card-header">
                        <span class="archive-type">${isTask ? '📋' : '📝'} ${isTask ? 'Aufgabe' : 'Notiz'}</span>
                        <div class="card-actions">
                            <button class="card-action" onclick="restoreArchivedItem('${item.id}', '${isTask ? 'task' : 'note'}')" title="Wiederherstellen">
                                ↩️
                            </button>
                            <button class="card-action" onclick="deleteArchivedItem('${item.id}', '${isTask ? 'task' : 'note'}')" title="Endgültig löschen">
                                🗑️
                            </button>
                        </div>
                    </div>
                    
                    <h3 class="card-title">${item.title}</h3>
                    
                    ${item.description || item.content ? `
                        <div class="card-content">${(item.description || item.content).substring(0, 150)}...</div>
                    ` : ''}
                    
                    <div class="card-meta">
                        <div class="archive-date">
                            Archiviert: ${window.StorageManager.formatDate(item.archivedAt)}
                        </div>
                        <div class="creation-date">
                            Erstellt: ${window.StorageManager.formatDate(item.createdAt)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Archivs:', error);
        container.innerHTML = '<div class="empty-state"><h3>Fehler beim Laden des Archivs</h3></div>';
    }
}

// Archiviertes Element wiederherstellen
function restoreArchivedItem(itemId, type) {
    console.log('Wiederherstellen:', { itemId, type });
    
    if (type === 'task') {
        if (window.TaskManager && window.TaskManager.restoreTask) {
            if (window.TaskManager.restoreTask(itemId)) {
                showNotification('Aufgabe wurde wiederhergestellt!', 'success');
                updateArchive();
            }
        }
    } else {
        if (window.NoteManager && window.NoteManager.restoreNote) {
            if (window.NoteManager.restoreNote(itemId)) {
                showNotification('Notiz wurde wiederhergestellt!', 'success');
                updateArchive();
            }
        }
    }
}

// Archiviertes Element endgültig löschen
function deleteArchivedItem(itemId, type) {
    if (!confirm('Möchten Sie dieses Element endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        return;
    }
    
    if (!window.StorageManager) return;
    
    try {
        const archive = window.StorageManager.readDataFile('archive');
        
        if (type === 'task') {
            archive.tasks = archive.tasks.filter(task => task.id !== itemId);
        } else {
            archive.notes = archive.notes.filter(note => note.id !== itemId);
        }
        
        window.StorageManager.writeDataFile('archive', archive);
        updateArchive();
        showNotification('Element wurde endgültig gelöscht.', 'info');
    } catch (error) {
        console.error('Fehler beim Löschen des archivierten Elements:', error);
    }
}

// Archiv leeren
function clearArchive() {
    if (!confirm('Möchten Sie das gesamte Archiv leeren? Alle archivierten Elemente werden endgültig gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.')) {
        return;
    }
    
    if (!window.StorageManager) return;
    
    try {
        const archive = { tasks: [], notes: [] };
        window.StorageManager.writeDataFile('archive', archive);
        updateArchive();
        showNotification('Archiv wurde geleert.', 'info');
    } catch (error) {
        console.error('Fehler beim Leeren des Archivs:', error);
    }
}

// Alle Ansichten aktualisieren
function updateAllViews() {
    updateViewMode();
    handleTabSwitch(UI.currentTab);
}

// UI-Einstellungen laden
function loadUISettings() {
    if (!window.StorageManager) return;
    
    try {
        const settings = window.StorageManager.readDataFile('settings');
        if (settings.viewMode) {
            // Validiere den geladenen View-Modus
            if (['grid', 'kanban', 'list'].includes(settings.viewMode)) {
                UI.currentViewMode = settings.viewMode;
            } else {
                UI.currentViewMode = 'grid'; // Fallback
            }
        }
        updateViewMode();
    } catch (error) {
        console.error('Fehler beim Laden der UI-Einstellungen:', error);
    }
}

// UI-Einstellungen speichern
function saveUISettings() {
    if (!window.StorageManager) return;
    
    try {
        const settings = window.StorageManager.readDataFile('settings');
        settings.viewMode = UI.currentViewMode;
        window.StorageManager.writeDataFile('settings', settings);
    } catch (error) {
        console.error('Fehler beim Speichern der UI-Einstellungen:', error);
    }
}

// Benachrichtigung anzeigen
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Verwende die Funktion aus notes.js falls verfügbar
    if (window.NoteManager && typeof window.NoteManager.showNotification === 'function') {
        window.NoteManager.showNotification(message, type);
        return;
    }
    
    // Fallback: Einfache Browser-Benachrichtigung
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-primary);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}

// URL-Navigation behandeln
function handleUrlNavigation() {
    const hash = window.location.hash.slice(1);
    if (hash && ['dashboard', 'tasks', 'notes', 'archive'].includes(hash)) {
        switchTab(hash);
    }
}

// Exportiere globale Funktionen
window.UIManager = {
    initializeUI,
    switchTab,
    toggleViewMode,
    updateAllViews,
    updateDashboard,
    updateArchive,
    handleFocusMode,
    showTaskSelectionForFocus,
    clearSearchResults,
    handleUrlNavigation,
    saveUISettings,
    loadUISettings,
    currentViewMode: () => UI.currentViewMode
};

// Globale Funktionen für HTML onclick Events
window.clearSearchResults = clearSearchResults;
window.openSearchResultItem = openSearchResultItem;
window.selectTaskForFocus = selectTaskForFocus;
window.restoreArchivedItem = restoreArchivedItem;
window.deleteArchivedItem = deleteArchivedItem;
window.clearArchive = clearArchive;

console.log('🎨 UI-Modul geladen');

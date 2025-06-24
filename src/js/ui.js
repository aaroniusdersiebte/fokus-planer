// UI Management - Globale Funktionen für Benutzeroberfläche

// UI-Status in globalem Objekt kapseln, um Konflikte zu vermeiden
if (typeof window.FokusUI === 'undefined') {
    window.FokusUI = {
        currentTab: 'dashboard',
        currentViewMode: 'kanban', // Standard auf Kanban
        currentSortMode: 'groups', // 'groups' oder 'priority'
        currentFilterGroup: '',
        currentFilterPriority: '',
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
        setupViewToggles();
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

// View-Toggles einrichten (neue Version mit separaten Buttons)
function setupViewToggles() {
    console.log('🔄 Richte View-Toggle-Buttons ein...');
    
    // Warte kurz, damit alle DOM-Elemente geladen sind
    setTimeout(() => {
        const viewToggles = document.querySelectorAll('.view-toggle');
        console.log(`✅ ${viewToggles.length} View-Toggle-Buttons gefunden`);
        
        if (viewToggles.length === 0) {
            console.warn('⚠️ Keine View-Toggle-Buttons gefunden');
            return;
        }
        
        viewToggles.forEach((toggle, index) => {
            const viewMode = toggle.dataset.view;
            console.log(`🔄 Button ${index + 1}: data-view="${viewMode}"`);
            
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔄 View-Toggle geklickt:', viewMode);
                
                if (viewMode) {
                    setViewMode(viewMode);
                } else {
                    console.warn('⚠️ Kein data-view Attribut gefunden');
                }
            });
        });
        
        updateViewToggleButtons();
    }, 200);
}

// Ansichtsmodus setzen
function setViewMode(viewMode) {
    if (!['kanban', 'list', 'grid'].includes(viewMode)) {
        console.warn('Ungültiger View-Modus:', viewMode);
        return;
    }
    
    console.log('🔄 View-Modus gewechselt von', UI.currentViewMode, 'zu', viewMode);
    UI.currentViewMode = viewMode;
    updateViewMode();
    saveUISettings();
}

// Ansichtsmodus aktualisieren
function updateViewMode() {
    console.log('🔄 Aktualisiere View-Modus:', UI.currentViewMode);
    
    updateViewToggleButtons();
    updateContainerClasses();
    
    // UI für aktuellen Tab aktualisieren
    if (UI.currentTab === 'tasks' && window.TaskManager) {
        console.log('🔄 Aktualisiere Tasks UI mit Modus:', UI.currentViewMode);
        // Force TaskManager to use the current view mode
        window.TaskManager.currentViewMode = UI.currentViewMode;
        window.TaskManager.updateTasksUI();
    }
}

// Container-Klassen für View-Modi aktualisieren
function updateContainerClasses() {
    const tasksContainer = document.getElementById('tasksContainer');
    if (!tasksContainer) return;
    
    // Entferne alle View-Klassen
    tasksContainer.classList.remove('kanban-view', 'list-view', 'grid-view');
    
    // Füge aktuelle View-Klasse hinzu
    tasksContainer.classList.add(`${UI.currentViewMode}-view`);
    
    console.log('🔄 Container-Klassen aktualisiert:', `${UI.currentViewMode}-view`);
}

// View-Toggle Buttons aktualisieren
function updateViewToggleButtons() {
    const viewToggles = document.querySelectorAll('.view-toggle');
    console.log('🔄 Aktualisiere', viewToggles.length, 'View-Toggle-Buttons, aktueller Modus:', UI.currentViewMode);
    
    viewToggles.forEach(toggle => {
        const viewMode = toggle.dataset.view;
        if (viewMode === UI.currentViewMode) {
            toggle.classList.add('active');
            console.log('🔄 Button aktiviert:', viewMode);
        } else {
            toggle.classList.remove('active');
        }
    });
}

// Event Listeners einrichten
function setupEventListeners() {
    console.log('🔗 Richte Event-Listeners ein...');
    
    // Robuste Handler-Funktionen
    const safeTaskEditorShow = () => {
        if (window.TaskEditorManager && window.TaskEditorManager.showTaskEditor) {
            window.TaskEditorManager.showTaskEditor();
        } else {
            console.warn('⚠️ TaskEditorManager nicht verfügbar');
            alert('Task-Editor ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.');
        }
    };
    
    const safeNoteDialogShow = () => {
        if (window.NoteManager && window.NoteManager.showNewNoteDialog) {
            window.NoteManager.showNewNoteDialog();
        } else {
            console.warn('⚠️ NoteManager nicht verfügbar');
            alert('Notiz-Editor ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.');
        }
    };
    
    const safeGroupDialogShow = () => {
        if (window.GroupManager && window.GroupManager.showNewGroupDialog) {
            window.GroupManager.showNewGroupDialog();
        } else {
            console.warn('⚠️ GroupManager nicht verfügbar');
            alert('Gruppen-Editor ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.');
        }
    };
    
    // Header-Buttons
    const buttons = [
        { id: 'newTaskBtn', handler: safeTaskEditorShow },
        { id: 'newNoteBtn', handler: safeNoteDialogShow },
        { id: 'focusModeBtn', handler: handleFocusMode },
        { id: 'newGroupBtn', handler: safeGroupDialogShow }
    ];
    
    buttons.forEach(({ id, handler }) => {
        const btn = document.getElementById(id);
        if (btn) {
            // Entferne bestehende Event-Listener
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button geklickt:', id);
                try {
                    handler();
                } catch (error) {
                    console.error('Fehler beim Ausführen von Button-Handler:', error);
                }
            });
            console.log('✅ Event-Listener für', id, 'hinzugefügt');
        } else {
            console.warn('⚠️ Button nicht gefunden:', id);
        }
    });
    
    // Quick Actions
    const quickActions = [
        { id: 'quickTask', handler: safeTaskEditorShow },
        { id: 'quickNote', handler: safeNoteDialogShow },
        { id: 'quickFocus', handler: handleFocusMode }
    ];
    
    quickActions.forEach(({ id, handler }) => {
        const btn = document.getElementById(id);
        if (btn) {
            // Entferne bestehende Event-Listener
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Quick-Action geklickt:', id);
                try {
                    handler();
                } catch (error) {
                    console.error('Fehler beim Ausführen von Quick-Action-Handler:', error);
                }
            });
            console.log('✅ Event-Listener für Quick-Action', id, 'hinzugefügt');
        }
    });
    
    // Gruppen-Filter
    const groupFilter = document.getElementById('groupFilter');
    if (groupFilter) {
        groupFilter.addEventListener('change', (e) => {
            UI.currentFilterGroup = e.target.value;
            saveUISettings();
            if (window.TaskManager && window.TaskManager.updateTasksUI) {
                window.TaskManager.updateTasksUI();
            }
        });
        console.log('✅ Event-Listener für Gruppen-Filter hinzugefügt');
    }
    
    // Prioritäts-Filter
    const priorityFilter = document.getElementById('priorityFilter');
    if (priorityFilter) {
        priorityFilter.addEventListener('change', (e) => {
            UI.currentFilterPriority = e.target.value;
            saveUISettings();
            if (window.TaskManager && window.TaskManager.updateTasksUI) {
                window.TaskManager.updateTasksUI();
            }
        });
        console.log('✅ Event-Listener für Prioritäts-Filter hinzugefügt');
    }
    
    // Sort-Modus Toggle
    const sortToggle = document.getElementById('sortToggle');
    if (sortToggle) {
        sortToggle.addEventListener('click', () => {
            UI.currentSortMode = UI.currentSortMode === 'groups' ? 'priority' : 'groups';
            updateSortToggleButton();
            saveUISettings();
            if (window.TaskManager && window.TaskManager.updateTasksUI) {
                window.TaskManager.updateTasksUI();
            }
        });
        console.log('✅ Event-Listener für Sort-Toggle hinzugefügt');
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
    updateRecentNotes();
    updateFocusActivity();
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
    const container = document.getElementById('recentTasks');
    if (!container || !window.StorageManager) return;
    
    try {
        const tasks = window.StorageManager.readDataFile('tasks');
        const recentTasks = tasks
            .filter(task => !task.completed)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 4);
        
        container.innerHTML = '';
        
        if (recentTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <p>Keine aktuellen Aufgaben vorhanden.</p>
                    <button class="btn btn-sm btn-primary" onclick="window.TaskManager.showNewTaskDialog()">
                        + Aufgabe erstellen
                    </button>
                </div>
            `;
            return;
        }
        
        recentTasks.forEach(task => {
            const group = window.GroupManager?.getGroupById?.(task.groupId);
            const taskCard = document.createElement('div');
            taskCard.className = 'dashboard-task-card';
            taskCard.innerHTML = `
                <div class="task-card-priority ${task.priority}"></div>
                <div class="task-card-content" onclick="window.TaskManager.openTaskEditor('${task.id}')">
                    <h4 class="task-card-title">${task.title}</h4>
                    <div class="task-card-meta">
                        <span class="task-group" style="color: ${group?.color || '#666'}">${group?.name || 'Unbekannt'}</span>
                        <span class="task-updated">${window.StorageManager.formatDate(task.updatedAt)}</span>
                    </div>
                    ${task.subtasks && task.subtasks.length > 0 ? `
                        <div class="task-progress-mini">
                            <div class="progress-bar-mini">
                                <div class="progress-fill-mini" style="width: ${task.progress || 0}%"></div>
                            </div>
                            <span class="progress-text-mini">${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="task-card-actions">
                    <button class="btn-icon-small" onclick="event.stopPropagation(); window.FocusManager.startFocusSession('${task.id}')" title="Fokus starten">🎯</button>
                    <button class="btn-icon-small" onclick="event.stopPropagation(); window.TaskManager.completeTask('${task.id}')" title="Erledigt">✓</button>
                </div>
            `;
            container.appendChild(taskCard);
        });
    } catch (error) {
        console.error('Fehler beim Aktualisieren der letzten Aufgaben:', error);
        container.innerHTML = '<div class="error-state">Fehler beim Laden der Aufgaben</div>';
    }
}

// Letzte Notizen aktualisieren
function updateRecentNotes() {
    const container = document.getElementById('recentNotes');
    if (!container || !window.StorageManager) return;
    
    try {
        const notes = window.StorageManager.readDataFile('notes');
        const recentNotes = notes
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 4);
        
        container.innerHTML = '';
        
        if (recentNotes.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <p>Keine Notizen vorhanden.</p>
                    <button class="btn btn-sm btn-primary" onclick="window.NoteManager.showNewNoteDialog()">
                        + Notiz erstellen
                    </button>
                </div>
            `;
            return;
        }
        
        recentNotes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'dashboard-note-card';
            if (note.pinned) noteCard.classList.add('pinned');
            
            noteCard.innerHTML = `
                <div class="note-card-content" onclick="window.NoteManager.editNote('${note.id}')">
                    ${note.pinned ? '<div class="pin-indicator-mini">📌</div>' : ''}
                    <h4 class="note-card-title">${note.title}</h4>
                    <p class="note-card-preview">${(note.content || '').substring(0, 80)}${note.content && note.content.length > 80 ? '...' : ''}</p>
                    <div class="note-card-meta">
                        <span class="note-updated">${window.StorageManager.formatDate(note.updatedAt)}</span>
                        ${note.tags && note.tags.length > 0 ? `
                            <div class="note-tags-mini">
                                ${note.tags.slice(0, 2).map(tag => `<span class="tag-mini">${tag}</span>`).join('')}
                                ${note.tags.length > 2 ? `<span class="tag-mini">+${note.tags.length - 2}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="note-card-actions">
                    <button class="btn-icon-small" onclick="event.stopPropagation(); window.NoteManager.togglePinNote('${note.id}')" title="${note.pinned ? 'Lösen' : 'Anheften'}">
                        ${note.pinned ? '📌' : '📍'}
                    </button>
                    <button class="btn-icon-small" onclick="event.stopPropagation(); window.NoteManager.showConvertNoteDialog('${note.id}')" title="In Aufgabe umwandeln">✓</button>
                </div>
            `;
            container.appendChild(noteCard);
        });
    } catch (error) {
        console.error('Fehler beim Aktualisieren der letzten Notizen:', error);
        container.innerHTML = '<div class="error-state">Fehler beim Laden der Notizen</div>';
    }
}

// Fokus-Aktivität aktualisieren
function updateFocusActivity() {
    const container = document.getElementById('focusActivity');
    if (!container || !window.StorageManager) return;
    
    try {
        const stats = window.StorageManager.readDataFile('stats');
        const todayStats = window.StorageManager.getTodayStats();
        
        // Aktuelle Fokus-Session prüfen
        const currentSession = window.FocusManager?.getCurrentFocusSession?.();
        
        container.innerHTML = `
            <div class="focus-stats">
                <div class="focus-stat-item">
                    <div class="focus-stat-number">${todayStats.focusTime || 0}</div>
                    <div class="focus-stat-label">Min heute</div>
                </div>
                <div class="focus-stat-item">
                    <div class="focus-stat-number">${Math.round((stats.totalFocusTime || 0) / 60)}</div>
                    <div class="focus-stat-label">Std gesamt</div>
                </div>
                <div class="focus-stat-item">
                    <div class="focus-stat-number">${todayStats.completedTasks || 0}</div>
                    <div class="focus-stat-label">Erledigt</div>
                </div>
            </div>
            
            ${currentSession && currentSession.isActive ? `
                <div class="active-focus-session">
                    <div class="session-header">
                        <span class="session-indicator">🎯</span>
                        <span class="session-title">Aktive Session</span>
                    </div>
                    <div class="session-task">${currentSession.taskTitle || 'Allgemeine Fokus-Session'}</div>
                    <div class="session-timer" id="sessionTimer">
                        ${formatSessionTime(currentSession.remainingTime || 0)}
                    </div>
                    <div class="session-actions">
                        <button class="btn btn-sm btn-secondary" onclick="window.FocusManager.toggleFocusSession()">
                            ${currentSession.isPaused ? '▶️ Fortsetzen' : '⏸️ Pausieren'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.FocusManager.stopFocusSession()">
                            ⏹️ Stoppen
                        </button>
                    </div>
                </div>
            ` : `
                <div class="focus-suggestions">
                    <h4>Bereit für Fokus?</h4>
                    <p>Starten Sie eine 20-Minuten Session für maximale Produktivität.</p>
                    <div class="recent-focus-tasks" id="recentFocusTasks">
                        <!-- Wird dynamisch gefüllt -->
                    </div>
                </div>
            `}
        `;
        
        // Timer für aktive Session aktualisieren
        if (currentSession && currentSession.isActive) {
            updateSessionTimer();
        } else {
            updateRecentFocusTasks();
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Fokus-Aktivität:', error);
        container.innerHTML = '<div class="error-state">Fehler beim Laden der Fokus-Daten</div>';
    }
}

// Session-Timer formatieren
function formatSessionTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Session-Timer aktualisieren
function updateSessionTimer() {
    const timerElement = document.getElementById('sessionTimer');
    if (!timerElement) return;
    
    const currentSession = window.FocusManager?.getCurrentFocusSession?.();
    if (currentSession && currentSession.isActive && !currentSession.isPaused) {
        timerElement.textContent = formatSessionTime(currentSession.remainingTime || 0);
        
        setTimeout(() => {
            updateSessionTimer();
        }, 1000);
    }
}

// Letzte Fokus-Aufgaben aktualisieren
function updateRecentFocusTasks() {
    const container = document.getElementById('recentFocusTasks');
    if (!container || !window.StorageManager) return;
    
    try {
        const tasks = window.StorageManager.readDataFile('tasks');
        const focusTasks = tasks
            .filter(task => !task.completed && task.priority === 'high')
            .slice(0, 2);
        
        if (focusTasks.length === 0) {
            container.innerHTML = '<p class="focus-hint">Keine priorisierten Aufgaben verfügbar.</p>';
            return;
        }
        
        container.innerHTML = focusTasks.map(task => `
            <div class="focus-task-suggestion" onclick="window.FocusManager.startFocusSession('${task.id}')">
                <span class="focus-task-title">${task.title}</span>
                <span class="focus-task-priority">🔴</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Fehler beim Laden der Fokus-Aufgaben:', error);
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
                console.log('🔄 View-Modus aus Settings geladen:', UI.currentViewMode);
            } else {
                UI.currentViewMode = 'kanban'; // Fallback auf Kanban
                console.log('🔄 Ungültiger View-Modus in Settings, verwende Fallback:', UI.currentViewMode);
            }
        }
        
        // Lade Sort-Modus
        if (settings.sortMode) {
            UI.currentSortMode = ['groups', 'priority'].includes(settings.sortMode) ? settings.sortMode : 'groups';
        }
        
        // Lade Filter-Einstellungen
        if (settings.filterGroup) UI.currentFilterGroup = settings.filterGroup;
        if (settings.filterPriority) UI.currentFilterPriority = settings.filterPriority;
        
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
        settings.sortMode = UI.currentSortMode;
        settings.filterGroup = UI.currentFilterGroup;
        settings.filterPriority = UI.currentFilterPriority;
        window.StorageManager.writeDataFile('settings', settings);
        console.log('🔄 UI-Einstellungen gespeichert:', {
            viewMode: UI.currentViewMode,
            sortMode: UI.currentSortMode,
            filters: { group: UI.currentFilterGroup, priority: UI.currentFilterPriority }
        });
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

// Sort-Toggle Button aktualisieren
function updateSortToggleButton() {
    const sortToggle = document.getElementById('sortToggle');
    if (sortToggle) {
        const icon = UI.currentSortMode === 'groups' ? '📁' : '⚡';
        const text = UI.currentSortMode === 'groups' ? 'Nach Gruppen' : 'Nach Priorität';
        sortToggle.innerHTML = `<span class="icon">${icon}</span> ${text}`;
        sortToggle.title = `Aktuell sortiert ${text.toLowerCase()}, klicken zum Umschalten`;
    }
}

// Filter zurücksetzen
function resetFilters() {
    UI.currentFilterGroup = '';
    UI.currentFilterPriority = '';
    
    const groupFilter = document.getElementById('groupFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    
    if (groupFilter) groupFilter.value = '';
    if (priorityFilter) priorityFilter.value = '';
    
    saveUISettings();
    
    if (window.TaskManager && window.TaskManager.updateTasksUI) {
        window.TaskManager.updateTasksUI();
    }
}

// Filter-Werte setzen
function setFilters(groupId = '', priority = '') {
    UI.currentFilterGroup = groupId;
    UI.currentFilterPriority = priority;
    
    const groupFilter = document.getElementById('groupFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    
    if (groupFilter) groupFilter.value = groupId;
    if (priorityFilter) priorityFilter.value = priority;
    
    saveUISettings();
}

// Aktuelle Filter abrufen
function getCurrentFilters() {
    return {
        group: UI.currentFilterGroup,
        priority: UI.currentFilterPriority,
        sortMode: UI.currentSortMode
    };
}

// Exportiere globale Funktionen
window.UIManager = {
    initializeUI,
    switchTab,
    setViewMode,
    updateAllViews,
    updateDashboard,
    updateArchive,
    handleFocusMode,
    showTaskSelectionForFocus,
    clearSearchResults,
    handleUrlNavigation,
    saveUISettings,
    loadUISettings,
    resetFilters,
    setFilters,
    getCurrentFilters,
    updateSortToggleButton,
    currentViewMode: () => UI.currentViewMode,
    currentSortMode: () => UI.currentSortMode
};

// Globale Funktionen für HTML onclick Events
window.clearSearchResults = clearSearchResults;
window.openSearchResultItem = openSearchResultItem;
window.selectTaskForFocus = selectTaskForFocus;
window.restoreArchivedItem = restoreArchivedItem;
window.deleteArchivedItem = deleteArchivedItem;
window.clearArchive = clearArchive;

console.log('🎨 UI-Modul geladen');

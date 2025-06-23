// Tasks Management - Globale Funktionen für Aufgaben-Verwaltung

let tasks = [];
let currentViewMode = 'grid';
let currentFilter = '';

// Aufgaben laden
function loadTasks() {
    tasks = window.StorageManager.readDataFile('tasks');
    updateTasksUI();
    updateGroupTaskCounts();
    return tasks;
}

// Aufgaben speichern
function saveTasks() {
    return window.StorageManager.writeDataFile('tasks', tasks);
}

// Neue Aufgabe erstellen
function createTask(taskData) {
    const newTask = {
        id: window.StorageManager.generateUUID(),
        title: taskData.title.trim(),
        description: taskData.description || '',
        groupId: taskData.groupId || 'default',
        priority: taskData.priority || 'medium',
        tags: taskData.tags || [],
        subtasks: [],
        notes: [],
        completed: false,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: taskData.dueDate || null,
        estimatedTime: taskData.estimatedTime || 0,
        actualTime: 0
    };
    
    tasks.push(newTask);
    saveTasks();
    updateTasksUI();
    window.GroupManager.updateGroupTaskCounts();
    
    return newTask;
}

// Aufgabe bearbeiten
function updateTask(taskId, updates) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex] = { 
            ...tasks[taskIndex], 
            ...updates, 
            updatedAt: new Date().toISOString() 
        };
        
        // Progress basierend auf Subtasks aktualisieren
        updateTaskProgress(taskId);
        
        saveTasks();
        updateTasksUI();
        window.GroupManager.updateGroupTaskCounts();
        return tasks[taskIndex];
    }
    return null;
}

// Aufgabe als erledigt markieren
function completeTask(taskId) {
    const task = getTaskById(taskId);
    if (!task) return false;
    
    updateTask(taskId, { 
        completed: true, 
        completedAt: new Date().toISOString(),
        progress: 100
    });
    
    // Statistiken aktualisieren
    window.StorageManager.updateStats('completedTask');
    
    // Nach kurzer Zeit ins Archiv verschieben
    setTimeout(() => {
        archiveTask(taskId);
    }, 2000);
    
    return true;
}

// Aufgabe wieder aktivieren
function uncompleteTask(taskId) {
    const task = getTaskById(taskId);
    if (!task) return false;
    
    updateTask(taskId, { 
        completed: false, 
        completedAt: null 
    });
    
    return true;
}

// Aufgabe archivieren
function archiveTask(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;
    
    const task = tasks[taskIndex];
    const archive = window.StorageManager.readDataFile('archive');
    
    // Zur Archiv hinzufügen
    archive.tasks.push({
        ...task,
        archivedAt: new Date().toISOString()
    });
    
    // Aus aktiven Aufgaben entfernen
    tasks.splice(taskIndex, 1);
    
    // Speichern
    saveTasks();
    window.StorageManager.writeDataFile('archive', archive);
    updateTasksUI();
    window.GroupManager.updateGroupTaskCounts();
    
    return true;
}

// Aufgabe aus Archiv wiederherstellen
function restoreTask(taskId) {
    const archive = window.StorageManager.readDataFile('archive');
    const taskIndex = archive.tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) return false;
    
    const task = archive.tasks[taskIndex];
    
    // Archiv-spezifische Felder entfernen
    delete task.archivedAt;
    task.completed = false;
    task.updatedAt = new Date().toISOString();
    
    // Zu aktiven Aufgaben hinzufügen
    tasks.push(task);
    
    // Aus Archiv entfernen
    archive.tasks.splice(taskIndex, 1);
    
    // Speichern
    saveTasks();
    window.StorageManager.writeDataFile('archive', archive);
    updateTasksUI();
    window.GroupManager.updateGroupTaskCounts();
    
    return true;
}

// Aufgabe löschen
function deleteTask(taskId) {
    if (!confirm('Sind Sie sicher, dass Sie diese Aufgabe löschen möchten?')) {
        return false;
    }
    
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks();
    updateTasksUI();
    window.GroupManager.updateGroupTaskCounts();
    return true;
}

// Aufgabe nach ID finden
function getTaskById(taskId) {
    return tasks.find(t => t.id === taskId);
}

// Aufgaben filtern
function filterTasks(searchTerm = '', groupId = '') {
    let filteredTasks = tasks;
    
    // Nach Gruppe filtern
    if (groupId) {
        filteredTasks = filteredTasks.filter(task => task.groupId === groupId);
    }
    
    // Nach Suchbegriff filtern
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredTasks = filteredTasks.filter(task => 
            task.title.toLowerCase().includes(term) ||
            task.description.toLowerCase().includes(term) ||
            task.tags.some(tag => tag.toLowerCase().includes(term))
        );
    }
    
    return filteredTasks;
}

// Subtask hinzufügen
function addSubtask(taskId, subtaskText) {
    const task = getTaskById(taskId);
    if (!task) return false;
    
    const newSubtask = {
        id: window.StorageManager.generateUUID(),
        text: subtaskText.trim(),
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    if (!task.subtasks) task.subtasks = [];
    task.subtasks.push(newSubtask);
    updateTaskProgress(taskId);
    saveTasks();
    
    return newSubtask;
}

// Subtask-Text bearbeiten
function updateSubtaskText(taskId, subtaskId, newText) {
    const task = getTaskById(taskId);
    if (!task) return false;
    
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return false;
    
    subtask.text = newText.trim();
    saveTasks();
    
    return true;
}

// Subtask als erledigt markieren
function toggleSubtask(taskId, subtaskId) {
    const task = getTaskById(taskId);
    if (!task) return false;
    
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return false;
    
    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? new Date().toISOString() : null;
    
    updateTaskProgress(taskId);
    saveTasks();
    
    return true;
}

// Subtask löschen
function deleteSubtask(taskId, subtaskId) {
    const task = getTaskById(taskId);
    if (!task) return false;
    
    task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
    updateTaskProgress(taskId);
    saveTasks();
    
    return true;
}

// Aufgaben-Progress aktualisieren
function updateTaskProgress(taskId) {
    const task = getTaskById(taskId);
    if (!task || task.subtasks.length === 0) {
        if (task) task.progress = 0;
        return;
    }
    
    const completedSubtasks = task.subtasks.filter(st => st.completed).length;
    task.progress = Math.round((completedSubtasks / task.subtasks.length) * 100);
    
    // Aufgabe automatisch als erledigt markieren wenn alle Subtasks erledigt sind
    if (task.progress === 100 && !task.completed) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
        window.StorageManager.updateStats('completedTask');
    }
}

// Notiz zur Aufgabe hinzufügen
function addTaskNote(taskId, noteText) {
    const task = getTaskById(taskId);
    if (!task) return false;
    
    const newNote = {
        id: window.StorageManager.generateUUID(),
        text: noteText.trim(),
        createdAt: new Date().toISOString(),
        important: false
    };
    
    // Neue Notizen werden oben eingefügt (wie Chat)
    if (!task.notes) task.notes = [];
    task.notes.unshift(newNote);
    updateTask(taskId, { notes: task.notes });
    
    return newNote;
}

// Notiz als wichtig markieren
function toggleTaskNoteImportant(taskId, noteId) {
    const task = getTaskById(taskId);
    if (!task) return false;
    
    const note = task.notes.find(n => n.id === noteId);
    if (!note) return false;
    
    note.important = !note.important;
    saveTasks();
    
    return true;
}

// Aufgaben-Notiz bearbeiten
function updateTaskNote(taskId, noteId, newText) {
    const task = getTaskById(taskId);
    if (!task) return false;
    
    const note = task.notes.find(n => n.id === noteId);
    if (!note) return false;
    
    note.text = newText.trim();
    note.updatedAt = new Date().toISOString();
    
    saveTasks();
    return true;
}

// Aufgaben-Notiz löschen
function deleteTaskNote(taskId, noteId) {
    const task = getTaskById(taskId);
    if (!task) return false;
    
    task.notes = task.notes.filter(n => n.id !== noteId);
    saveTasks();
    
    return true;
}

// Aufgaben UI aktualisieren
function updateTasksUI() {
    const viewMode = window.UIManager ? window.UIManager.currentViewMode || 'grid' : 'grid';
    
    if (viewMode === 'kanban') {
        updateKanbanView();
    } else if (viewMode === 'list') {
        updateListView();
    } else {
        updateTasksContainer();
    }
    
    updateRecentTasks();
    updateDashboardStats();
}

// Kanban-Ansicht aktualisieren
function updateKanbanView() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    
    const groupFilter = document.getElementById('groupFilter');
    const searchInput = document.getElementById('searchInput');
    
    const groupId = groupFilter ? groupFilter.value : '';
    const searchTerm = searchInput ? searchInput.value : '';
    
    let filteredTasks = filterTasks(searchTerm, groupId);
    
    // Nach Priorität gruppieren
    const priorities = {
        high: { name: 'Hohe Priorität', icon: '🔴', tasks: [] },
        medium: { name: 'Mittlere Priorität', icon: '🟡', tasks: [] },
        low: { name: 'Niedrige Priorität', icon: '🟢', tasks: [] }
    };
    
    filteredTasks.forEach(task => {
        priorities[task.priority].tasks.push(task);
    });
    
    container.innerHTML = `
        <div class="kanban-container">
            ${Object.entries(priorities).map(([priority, data]) => `
                <div class="kanban-column">
                    <div class="kanban-header">
                        <div class="kanban-title">
                            <span>${data.icon}</span>
                            <span>${data.name}</span>
                            <span class="kanban-count">${data.tasks.length}</span>
                        </div>
                    </div>
                    <div class="kanban-content">
                        ${data.tasks.length > 0 ? data.tasks.map(task => createKanbanCard(task)).join('') : 
                            '<div class="empty-state-small">Keine Aufgaben in dieser Priorität</div>'}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Listen-Ansicht aktualisieren
function updateListView() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    
    const groupFilter = document.getElementById('groupFilter');
    const searchInput = document.getElementById('searchInput');
    
    const groupId = groupFilter ? groupFilter.value : '';
    const searchTerm = searchInput ? searchInput.value : '';
    
    let filteredTasks = filterTasks(searchTerm, groupId);
    
    // Nach Gruppen organisieren
    const groups = window.GroupManager ? window.GroupManager.getAllGroups() : [];
    const tasksByGroup = {};
    
    // Initialisiere Gruppen
    groups.forEach(group => {
        tasksByGroup[group.id] = {
            group: group,
            tasks: []
        };
    });
    
    // Aufgaben in Gruppen einteilen
    filteredTasks.forEach(task => {
        if (tasksByGroup[task.groupId]) {
            tasksByGroup[task.groupId].tasks.push(task);
        }
    });
    
    container.innerHTML = `
        <div class="list-view-container">
            ${Object.values(tasksByGroup)
                .filter(groupData => groupData.tasks.length > 0)
                .map(groupData => `
                    <div class="list-group">
                        <div class="list-group-header">
                            <div class="list-group-title">
                                <span style="color: ${groupData.group.color}">●</span>
                                <span>${groupData.group.name}</span>
                            </div>
                            <span class="list-group-count">${groupData.tasks.length}</span>
                        </div>
                        <div class="list-group-content">
                            ${groupData.tasks.map(task => createListItem(task)).join('')}
                        </div>
                    </div>
                `).join('')}
            ${Object.values(tasksByGroup).every(groupData => groupData.tasks.length === 0) ? `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>Keine Aufgaben gefunden</h3>
                    <p>Erstellen Sie Ihre erste Aufgabe oder passen Sie den Filter an.</p>
                    <button class="btn btn-primary" onclick="showNewTaskDialog()">
                        <span class="icon">+</span> Neue Aufgabe
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Kanban-Karte erstellen
function createKanbanCard(task) {
    const group = window.GroupManager.getGroupById(task.groupId);
    const groupName = group ? group.name : 'Unbekannt';
    const groupColor = group ? group.color : '#666';
    
    return `
        <div class="kanban-card priority-${task.priority}" onclick="openTaskEditor('${task.id}')">
            <div class="card-header">
                <div class="card-actions">
                    <button class="card-action" onclick="event.stopPropagation(); openTaskEditor('${task.id}')" title="Bearbeiten">
                        ✏️
                    </button>
                    <button class="card-action" onclick="event.stopPropagation(); completeTask('${task.id}')" title="Als erledigt markieren">
                        ✓
                    </button>
                    <button class="card-action" onclick="event.stopPropagation(); deleteTask('${task.id}')" title="Löschen">
                        🗑️
                    </button>
                </div>
            </div>
            
            <h4 class="card-title">${task.title}</h4>
            
            ${task.description ? `<div class="card-content">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
            
            ${task.subtasks && task.subtasks.length > 0 ? `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${task.progress || 0}%"></div>
                </div>
                <div class="subtasks-preview">
                    ${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length} Subtasks erledigt
                </div>
            ` : ''}
            
            ${task.tags && task.tags.length > 0 ? `
                <div class="card-tags">
                    ${task.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    ${task.tags.length > 3 ? `<span class="tag">+${task.tags.length - 3}</span>` : ''}
                </div>
            ` : ''}
            
            <div class="card-meta">
                <div class="card-group" style="color: ${groupColor}">
                    ${groupName}
                </div>
                <div class="card-date">
                    ${window.StorageManager.formatDate(task.createdAt)}
                </div>
            </div>
        </div>
    `;
}

// Listen-Item erstellen
function createListItem(task) {
    const group = window.GroupManager.getGroupById(task.groupId);
    const groupName = group ? group.name : 'Unbekannt';
    
    return `
        <div class="list-item" onclick="openTaskEditor('${task.id}')">
            <div class="list-item-priority ${task.priority}"></div>
            <div class="list-item-content">
                <div class="list-item-title">${task.title}</div>
                <div class="list-item-meta">
                    <span>📋 ${groupName}</span>
                    ${task.subtasks && task.subtasks.length > 0 ? `
                        <span>✓ ${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length}</span>
                    ` : ''}
                    ${task.tags && task.tags.length > 0 ? `
                        <span>🏷️ ${task.tags.slice(0, 2).join(', ')}${task.tags.length > 2 ? '...' : ''}</span>
                    ` : ''}
                    <span>📅 ${window.StorageManager.formatDate(task.createdAt)}</span>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="card-action" onclick="event.stopPropagation(); openTaskEditor('${task.id}')" title="Bearbeiten">
                    ✏️
                </button>
                <button class="card-action" onclick="event.stopPropagation(); completeTask('${task.id}')" title="Als erledigt markieren">
                    ✓
                </button>
                <button class="card-action" onclick="event.stopPropagation(); deleteTask('${task.id}')" title="Löschen">
                    🗑️
                </button>
            </div>
        </div>
    `;
}
function updateTasksContainer() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    
    const groupFilter = document.getElementById('groupFilter');
    const searchInput = document.getElementById('searchInput');
    
    const groupId = groupFilter ? groupFilter.value : '';
    const searchTerm = searchInput ? searchInput.value : '';
    
    const filteredTasks = filterTasks(searchTerm, groupId);
    
    container.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>Keine Aufgaben gefunden</h3>
                <p>Erstellen Sie Ihre erste Aufgabe oder passen Sie den Filter an.</p>
                <button class="btn btn-primary" onclick="showNewTaskDialog()">
                    <span class="icon">+</span> Neue Aufgabe
                </button>
            </div>
        `;
        return;
    }
    
    filteredTasks.forEach(task => {
        const taskCard = createTaskCard(task);
        container.appendChild(taskCard);
    });
}

// Aufgaben-Karte erstellen
function createTaskCard(task) {
    const group = window.GroupManager.getGroupById(task.groupId);
    const groupName = group ? group.name : 'Unbekannt';
    const groupColor = group ? group.color : '#666';
    
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-task-id', task.id);
    
    const priorityColors = {
        low: '#4caf50',
        medium: '#ff9800',
        high: '#f44336'
    };
    
    const priorityLabels = {
        low: 'Niedrig',
        medium: 'Mittel',
        high: 'Hoch'
    };
    
    card.innerHTML = `
        <div class="card-header">
            <div class="card-priority" style="background-color: ${priorityColors[task.priority]}"></div>
            <div class="card-actions">
                <button class="card-action" onclick="openTaskEditor('${task.id}')" title="Bearbeiten">
                    ✏️
                </button>
                <button class="card-action" onclick="completeTask('${task.id}')" title="Als erledigt markieren">
                    ✓
                </button>
                <button class="card-action" onclick="deleteTask('${task.id}')" title="Löschen">
                    🗑️
                </button>
            </div>
        </div>
        
        <h3 class="card-title">${task.title}</h3>
        
        ${task.description ? `<div class="card-content">${task.description}</div>` : ''}
        
        ${task.subtasks.length > 0 ? `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${task.progress}%"></div>
            </div>
            <div class="subtasks-preview">
                ${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length} Subtasks erledigt
            </div>
        ` : ''}
        
        ${task.tags.length > 0 ? `
            <div class="card-tags">
                ${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        ` : ''}
        
        <div class="card-meta">
            <div class="card-group" style="color: ${groupColor}">
                ${groupName}
            </div>
            <div class="card-date">
                ${window.StorageManager.formatDate(task.createdAt)}
            </div>
        </div>
    `;
    
    // Click Handler für das Öffnen des Editors
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.card-action')) {
            openTaskEditor(task.id);
        }
    });
    
    return card;
}

// Letzte Aufgaben aktualisieren
function updateRecentTasks() {
    const container = document.getElementById('recentTasks');
    if (!container) return;
    
    const recentTasks = tasks
        .filter(task => !task.completed)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 6);
    
    container.innerHTML = '';
    
    if (recentTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <p>Keine aktuellen Aufgaben vorhanden.</p>
            </div>
        `;
        return;
    }
    
    recentTasks.forEach(task => {
        const taskCard = createTaskCard(task);
        container.appendChild(taskCard);
    });
}

// Dashboard-Statistiken aktualisieren
function updateDashboardStats() {
    const todayStats = window.StorageManager.getTodayStats();
    
    const todayTasksEl = document.getElementById('todayTasks');
    const todayFocusEl = document.getElementById('todayFocus');
    
    if (todayTasksEl) {
        todayTasksEl.textContent = todayStats.completedTasks;
    }
    
    if (todayFocusEl) {
        todayFocusEl.textContent = todayStats.focusTime;
    }
}

// Aufgaben-Editor öffnen
function openTaskEditor(taskId) {
    const task = getTaskById(taskId);
    if (!task) return;
    
    // Für jetzt verwenden wir den Popup-Editor
    // Später kann das in den Fokus-Modus integriert werden
    showTaskEditDialog(task);
}

// Neue Aufgabe Dialog
function showNewTaskDialog() {
    window.PopupManager.showTaskDialog();
}

// Aufgabe bearbeiten Dialog
function showTaskEditDialog(task) {
    window.PopupManager.showTaskDialog(task);
}

// Exportiere globale Funktionen
window.TaskManager = {
    loadTasks,
    saveTasks,
    createTask,
    updateTask,
    completeTask,
    uncompleteTask,
    archiveTask,
    restoreTask,
    deleteTask,
    getTaskById,
    filterTasks,
    addSubtask,
    updateSubtaskText,
    toggleSubtask,
    deleteSubtask,
    updateTaskProgress,
    addTaskNote,
    toggleTaskNoteImportant,
    updateTaskNote,
    deleteTaskNote,
    updateTasksUI,
    updateKanbanView,
    updateListView,
    openTaskEditor,
    showNewTaskDialog,
    showTaskEditDialog
};

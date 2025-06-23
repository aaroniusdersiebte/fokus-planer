// Groups Management - Globale Funktionen für Gruppen-Verwaltung

let groups = [];

// Gruppen laden
function loadGroups() {
    groups = window.StorageManager.readDataFile('groups');
    updateGroupsUI();
    return groups;
}

// Gruppen speichern
function saveGroups() {
    return window.StorageManager.writeDataFile('groups', groups);
}

// Neue Gruppe erstellen
function createGroup(name, color = '#4a9eff') {
    const newGroup = {
        id: window.StorageManager.generateUUID(),
        name: name.trim(),
        color: color,
        createdAt: new Date().toISOString(),
        taskCount: 0
    };
    
    groups.push(newGroup);
    saveGroups();
    updateGroupsUI();
    return newGroup;
}

// Gruppe bearbeiten
function updateGroup(groupId, updates) {
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex !== -1) {
        groups[groupIndex] = { ...groups[groupIndex], ...updates };
        saveGroups();
        updateGroupsUI();
        return groups[groupIndex];
    }
    return null;
}

// Gruppe löschen
function deleteGroup(groupId) {
    if (groupId === 'default') {
        alert('Die Standard-Gruppe kann nicht gelöscht werden.');
        return false;
    }
    
    // Prüfe ob Aufgaben in der Gruppe existieren
    const tasks = window.StorageManager.readDataFile('tasks');
    const hasTasksInGroup = tasks.some(task => task.groupId === groupId);
    
    if (hasTasksInGroup) {
        if (!confirm('Diese Gruppe enthält noch Aufgaben. Sollen alle Aufgaben in die Standard-Gruppe verschoben werden?')) {
            return false;
        }
        
        // Verschiebe alle Aufgaben zur Standard-Gruppe
        tasks.forEach(task => {
            if (task.groupId === groupId) {
                task.groupId = 'default';
            }
        });
        window.StorageManager.writeDataFile('tasks', tasks);
    }
    
    groups = groups.filter(g => g.id !== groupId);
    saveGroups();
    updateGroupsUI();
    return true;
}

// Gruppe nach ID finden
function getGroupById(groupId) {
    return groups.find(g => g.id === groupId);
}

// Alle Gruppen abrufen
function getAllGroups() {
    return groups;
}

// Anzahl der Aufgaben pro Gruppe aktualisieren
function updateGroupTaskCounts() {
    const tasks = window.StorageManager.readDataFile('tasks');
    
    groups.forEach(group => {
        group.taskCount = tasks.filter(task => 
            task.groupId === group.id && !task.completed
        ).length;
    });
    
    saveGroups();
}

// Gruppen UI aktualisieren
function updateGroupsUI() {
    updateGroupFilter();
    updateTasksGroupedView();
}

// Gruppen-Filter aktualisieren
function updateGroupFilter() {
    const groupFilter = document.getElementById('groupFilter');
    if (!groupFilter) return;
    
    // Aktuelle Auswahl merken
    const currentValue = groupFilter.value;
    
    // Filter leeren
    groupFilter.innerHTML = '<option value="">Alle Gruppen</option>';
    
    // Gruppen hinzufügen
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = `${group.name} (${group.taskCount || 0})`;
        groupFilter.appendChild(option);
    });
    
    // Auswahl wiederherstellen
    groupFilter.value = currentValue;
}

// Aufgaben nach Gruppen gruppiert anzeigen
function updateTasksGroupedView() {
    const tasksContainer = document.getElementById('tasksContainer');
    if (!tasksContainer || !tasksContainer.classList.contains('grouped-view')) return;
    
    tasksContainer.innerHTML = '';
    
    groups.forEach(group => {
        const groupSection = document.createElement('div');
        groupSection.className = 'group-section';
        groupSection.innerHTML = `
            <div class="group-header">
                <div class="group-info">
                    <div class="group-color" style="background-color: ${group.color}"></div>
                    <h3 class="group-name">${group.name}</h3>
                    <span class="group-count">${group.taskCount || 0} Aufgaben</span>
                </div>
                <div class="group-actions">
                    <button class="btn-icon" onclick="editGroup('${group.id}')" title="Gruppe bearbeiten">
                        ✏️
                    </button>
                    ${group.id !== 'default' ? `
                        <button class="btn-icon" onclick="deleteGroup('${group.id}')" title="Gruppe löschen">
                            🗑️
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="group-tasks" id="group-tasks-${group.id}">
                <!-- Wird von TaskManager gefüllt -->
            </div>
        `;
        tasksContainer.appendChild(groupSection);
    });
}

// Gruppe bearbeiten Dialog
function editGroup(groupId) {
    const group = getGroupById(groupId);
    if (!group) return;
    
    const content = `
        <form id="editGroupForm" class="group-form">
            <div class="form-group">
                <label class="form-label" for="groupName">Gruppenname</label>
                <input type="text" id="groupName" class="form-input" value="${group.name}" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="groupColor">Farbe</label>
                <div class="color-picker">
                    <input type="color" id="groupColor" class="form-color" value="${group.color}">
                    <div class="color-presets">
                        <button type="button" class="color-preset" data-color="#4a9eff" style="background: #4a9eff"></button>
                        <button type="button" class="color-preset" data-color="#6c63ff" style="background: #6c63ff"></button>
                        <button type="button" class="color-preset" data-color="#4caf50" style="background: #4caf50"></button>
                        <button type="button" class="color-preset" data-color="#ff9800" style="background: #ff9800"></button>
                        <button type="button" class="color-preset" data-color="#f44336" style="background: #f44336"></button>
                        <button type="button" class="color-preset" data-color="#9c27b0" style="background: #9c27b0"></button>
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closePopup()">Abbrechen</button>
                <button type="submit" class="btn btn-primary">Speichern</button>
            </div>
        </form>
    `;
    
    window.PopupManager.showPopup('Gruppe bearbeiten', content);
    
    // Event Listeners
    document.getElementById('editGroupForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('groupName').value.trim();
        const color = document.getElementById('groupColor').value;
        
        if (!name) {
            alert('Bitte geben Sie einen Gruppennamen ein.');
            return;
        }
        
        updateGroup(groupId, { name, color });
        window.PopupManager.closePopup();
        
        // UI aktualisieren
        if (window.TaskManager) {
            window.TaskManager.loadTasks();
        }
    });
    
    // Farb-Presets
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            document.getElementById('groupColor').value = preset.dataset.color;
        });
    });
}

// Neue Gruppe Dialog
function showNewGroupDialog() {
    const content = `
        <form id="newGroupForm" class="group-form">
            <div class="form-group">
                <label class="form-label" for="newGroupName">Gruppenname</label>
                <input type="text" id="newGroupName" class="form-input" placeholder="z.B. Arbeit, Privat..." required autofocus>
            </div>
            <div class="form-group">
                <label class="form-label" for="newGroupColor">Farbe</label>
                <div class="color-picker">
                    <input type="color" id="newGroupColor" class="form-color" value="#4a9eff">
                    <div class="color-presets">
                        <button type="button" class="color-preset" data-color="#4a9eff" style="background: #4a9eff"></button>
                        <button type="button" class="color-preset" data-color="#6c63ff" style="background: #6c63ff"></button>
                        <button type="button" class="color-preset" data-color="#4caf50" style="background: #4caf50"></button>
                        <button type="button" class="color-preset" data-color="#ff9800" style="background: #ff9800"></button>
                        <button type="button" class="color-preset" data-color="#f44336" style="background: #f44336"></button>
                        <button type="button" class="color-preset" data-color="#9c27b0" style="background: #9c27b0"></button>
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closePopup()">Abbrechen</button>
                <button type="submit" class="btn btn-primary">Erstellen</button>
            </div>
        </form>
    `;
    
    window.PopupManager.showPopup('Neue Gruppe', content);
    
    // Event Listeners
    document.getElementById('newGroupForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('newGroupName').value.trim();
        const color = document.getElementById('newGroupColor').value;
        
        if (!name) {
            alert('Bitte geben Sie einen Gruppennamen ein.');
            return;
        }
        
        // Prüfe auf doppelte Namen
        const existingGroup = groups.find(g => g.name.toLowerCase() === name.toLowerCase());
        if (existingGroup) {
            alert('Eine Gruppe mit diesem Namen existiert bereits.');
            return;
        }
        
        const newGroup = createGroup(name, color);
        window.PopupManager.closePopup();
        
        // UI aktualisieren
        if (window.TaskManager) {
            window.TaskManager.loadTasks();
        }
        
        console.log('Neue Gruppe erstellt:', newGroup);
    });
    
    // Farb-Presets
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            document.getElementById('newGroupColor').value = preset.dataset.color;
        });
    });
}

// Exportiere globale Funktionen
window.GroupManager = {
    loadGroups,
    saveGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupById,
    getAllGroups,
    updateGroupTaskCounts,
    updateGroupsUI,
    editGroup,
    showNewGroupDialog
};

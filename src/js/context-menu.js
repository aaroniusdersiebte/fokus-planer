// Context Menu System - Globale Kontextmenü-Verwaltung

let activeContextMenu = null;
let collapsedGroups = new Set(); // Eingeklappte Gruppen global verwalten

// Kontextmenü-System initialisieren
function initializeContextMenu() {
    // Event-Listener für das Schließen von Kontextmenüs
    document.addEventListener('click', closeAllContextMenus);
    document.addEventListener('contextmenu', handleGlobalContextMenu);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllContextMenus();
        }
    });
    
    loadCollapsedGroups();
    console.log('✅ Kontextmenü-System initialisiert');
}

// Globales Kontextmenü-Handler
function handleGlobalContextMenu(e) {
    e.preventDefault();
    closeAllContextMenus();
    
    const taskElement = e.target.closest('[data-task-id]');
    const groupElement = e.target.closest('[data-group-id]');
    const groupHeader = e.target.closest('.group-header, .kanban-header, .list-group-header');
    
    if (taskElement && !groupElement) {
        // Aufgaben-Kontextmenü
        const taskId = taskElement.dataset.taskId;
        showTaskContextMenu(e.clientX, e.clientY, taskId);
    } else if (groupHeader || groupElement) {
        // Gruppen-Kontextmenü
        const groupId = groupElement?.dataset?.groupId || 
                       groupHeader?.querySelector('[data-group-id]')?.dataset?.groupId ||
                       extractGroupIdFromHeader(groupHeader);
        if (groupId) {
            showGroupContextMenu(e.clientX, e.clientY, groupId);
        }
    }
}

// Gruppe-ID aus Header extrahieren
function extractGroupIdFromHeader(headerElement) {
    // Für Kanban-Header mit Add-Button
    const addButton = headerElement?.querySelector('[onclick*="showNewTaskDialogForGroup"]');
    if (addButton) {
        const onclick = addButton.getAttribute('onclick');
        const match = onclick.match(/showNewTaskDialogForGroup\('([^']+)'\)/);
        return match ? match[1] : null;
    }
    
    // Weitere Fallbacks...
    return null;
}

// Aufgaben-Kontextmenü anzeigen
function showTaskContextMenu(x, y, taskId) {
    const task = window.TaskManager.getTaskById(taskId);
    if (!task) return;
    
    const menuItems = [
        {
            icon: '🎯',
            label: 'Fokus starten',
            action: () => window.FocusManager.startFocusSession(taskId),
            shortcut: 'F'
        },
        {
            icon: '✏️',
            label: 'Bearbeiten',
            action: () => window.TaskManager.openTaskEditor(taskId),
            shortcut: 'E'
        },
        {
            icon: '✓',
            label: task.completed ? 'Als offen markieren' : 'Als erledigt markieren',
            action: () => task.completed ? 
                window.TaskManager.uncompleteTask(taskId) : 
                window.TaskManager.completeTask(taskId),
            shortcut: 'D'
        },
        { divider: true },
        {
            icon: '📋',
            label: 'Duplizieren',
            action: () => duplicateTask(taskId)
        },
        {
            icon: '📦',
            label: 'Archivieren',
            action: () => window.TaskManager.archiveTask(taskId)
        },
        { divider: true },
        {
            icon: '🗑️',
            label: 'Löschen',
            action: () => window.TaskManager.deleteTask(taskId),
            className: 'danger',
            shortcut: 'Del'
        }
    ];
    
    showContextMenu(x, y, menuItems);
}

// Gruppen-Kontextmenü anzeigen  
function showGroupContextMenu(x, y, groupId) {
    const group = window.GroupManager.getGroupById(groupId);
    if (!group) return;
    
    const isCollapsed = collapsedGroups.has(groupId);
    const isDefaultGroup = groupId === 'default';
    
    const menuItems = [
        {
            icon: isCollapsed ? '📂' : '📁',
            label: isCollapsed ? 'Gruppe ausklappen' : 'Gruppe einklappen',
            action: () => toggleGroupCollapse(groupId)
        },
        { divider: true },
        {
            icon: '+',
            label: 'Aufgabe hinzufügen',
            action: () => window.TaskManager.showNewTaskDialogForGroup(groupId)
        },
        { divider: true },
        {
            icon: '✏️',
            label: 'Gruppe umbenennen',
            action: () => window.GroupManager.editGroup(groupId),
            disabled: isDefaultGroup
        },
        {
            icon: '🎨',
            label: 'Farbe ändern',
            action: () => showGroupColorPicker(groupId),
            disabled: isDefaultGroup
        },
        { divider: true },
        {
            icon: '🗑️',
            label: 'Gruppe löschen',
            action: () => window.GroupManager.deleteGroup(groupId),
            className: 'danger',
            disabled: isDefaultGroup
        }
    ];
    
    showContextMenu(x, y, menuItems);
}

// Kontextmenü anzeigen (generisch)
function showContextMenu(x, y, items) {
    closeAllContextMenus();
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        z-index: 10000;
    `;
    
    items.forEach(item => {
        if (item.divider) {
            const divider = document.createElement('div');
            divider.className = 'context-menu-divider';
            menu.appendChild(divider);
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = `context-menu-item ${item.className || ''} ${item.disabled ? 'disabled' : ''}`;
            
            menuItem.innerHTML = `
                <span class="context-menu-icon">${item.icon}</span>
                <span class="context-menu-label">${item.label}</span>
                ${item.shortcut ? `<span class="context-menu-shortcut">${item.shortcut}</span>` : ''}
            `;
            
            if (!item.disabled && item.action) {
                menuItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.action();
                    closeAllContextMenus();
                });
            }
            
            menu.appendChild(menuItem);
        }
    });
    
    // Position anpassen, falls Menü außerhalb des Viewports wäre
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    
    if (rect.right > window.innerWidth) {
        menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${y - rect.height}px`;
    }
    
    activeContextMenu = menu;
}

// Alle Kontextmenüs schließen
function closeAllContextMenus() {
    if (activeContextMenu) {
        activeContextMenu.remove();
        activeContextMenu = null;
    }
}

// Aufgabe duplizieren
function duplicateTask(taskId) {
    const task = window.TaskManager.getTaskById(taskId);
    if (!task) return;
    
    const duplicatedTask = {
        title: `${task.title} (Kopie)`,
        description: task.description,
        groupId: task.groupId,
        priority: task.priority,
        tags: [...(task.tags || [])],
        subtasks: task.subtasks ? task.subtasks.map(st => ({
            ...st,
            id: window.StorageManager.generateUUID(),
            completed: false
        })) : []
    };
    
    window.TaskManager.createTask(duplicatedTask);
}

// Gruppe ein-/ausklappen
function toggleGroupCollapse(groupId) {
    if (collapsedGroups.has(groupId)) {
        collapsedGroups.delete(groupId);
    } else {
        collapsedGroups.add(groupId);
    }
    
    saveCollapsedGroups();
    
    // UI in allen Ansichten aktualisieren
    if (window.TaskManager) {
        window.TaskManager.updateTasksUI();
    }
}

// Eingeklappte Gruppen laden
function loadCollapsedGroups() {
    try {
        const settings = window.StorageManager.readDataFile('settings');
        if (settings.collapsedGroups) {
            collapsedGroups = new Set(settings.collapsedGroups);
        }
    } catch (error) {
        console.error('Fehler beim Laden der eingeklappten Gruppen:', error);
    }
}

// Eingeklappte Gruppen speichern
function saveCollapsedGroups() {
    try {
        const settings = window.StorageManager.readDataFile('settings');
        settings.collapsedGroups = Array.from(collapsedGroups);
        window.StorageManager.writeDataFile('settings', settings);
    } catch (error) {
        console.error('Fehler beim Speichern der eingeklappten Gruppen:', error);
    }
}

// Gruppen-Farbauswahl anzeigen
function showGroupColorPicker(groupId) {
    const group = window.GroupManager.getGroupById(groupId);
    if (!group) return;
    
    const colors = [
        '#4a9eff', '#6c63ff', '#4caf50', '#ff9800', 
        '#f44336', '#9c27b0', '#795548', '#607d8b'
    ];
    
    const content = `
        <div class="color-picker-popup">
            <h4>Farbe für "${group.name}" wählen</h4>
            <div class="color-picker-grid">
                ${colors.map(color => `
                    <button class="color-picker-option ${color === group.color ? 'selected' : ''}" 
                            style="background: ${color}" 
                            data-color="${color}"
                            onclick="selectGroupColor('${groupId}', '${color}')">
                    </button>
                `).join('')}
            </div>
            <div class="color-picker-custom">
                <label>Benutzerdefiniert:</label>
                <input type="color" value="${group.color}" onchange="selectGroupColor('${groupId}', this.value)">
            </div>
        </div>
    `;
    
    window.PopupManager.showPopup('Gruppenfarbe ändern', content);
}

// Gruppenfarbe auswählen
function selectGroupColor(groupId, color) {
    window.GroupManager.updateGroup(groupId, { color });
    window.PopupManager.closePopup();
    
    // UI aktualisieren
    if (window.TaskManager) {
        window.TaskManager.updateTasksUI();
    }
}

// Prüfen ob Gruppe eingeklappt ist
function isGroupCollapsed(groupId) {
    return collapsedGroups.has(groupId);
}

// Gruppe per Klick umschalten (für Listen-Ansicht)
function handleGroupHeaderClick(e, groupId) {
    // Nur bei Linksklick und nicht auf Buttons
    if (e.button === 0 && !e.target.closest('button')) {
        e.preventDefault();
        toggleGroupCollapse(groupId);
    }
}

// Exportiere globale Funktionen
window.ContextMenuManager = {
    initializeContextMenu,
    showTaskContextMenu,
    showGroupContextMenu,
    toggleGroupCollapse,
    isGroupCollapsed,
    handleGroupHeaderClick,
    closeAllContextMenus
};

// Globale Funktionen für HTML onclick Events
window.selectGroupColor = selectGroupColor;
window.duplicateTask = duplicateTask;

console.log('🎯 Kontextmenü-System geladen');

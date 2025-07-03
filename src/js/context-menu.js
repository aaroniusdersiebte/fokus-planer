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
    
    // Erste Priorität: Direkte Aufgaben-Elemente
    const taskElement = e.target.closest('[data-task-id]');
    if (taskElement) {
        const taskId = taskElement.dataset.taskId;
        showTaskContextMenu(e.clientX, e.clientY, taskId);
        return;
    }
    
    // Zweite Priorität: Gruppen-Header (nur wenn nicht in einer Aufgabe)
    const groupHeader = e.target.closest('.group-header, .kanban-header, .list-group-header, .grid-group-header');
    if (groupHeader) {
        const groupId = extractGroupIdFromHeader(groupHeader);
        if (groupId) {
            showGroupContextMenu(e.clientX, e.clientY, groupId);
            return;
        }
    }
    
    // Dritte Priorität: Gruppen-Container (falls Header-Detection fehlschlägt)
    const groupElement = e.target.closest('[data-group-id]');
    if (groupElement) {
        const groupId = groupElement.dataset.groupId;
        if (groupId) {
            showGroupContextMenu(e.clientX, e.clientY, groupId);
            return;
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
        {
            icon: '🗓️',
            label: 'Alle Gruppen sortieren',
            action: () => showGroupSortDialog()
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

// Gruppen-Sort-Dialog anzeigen
function showGroupSortDialog() {
    const groups = window.GroupManager ? window.GroupManager.getAllGroups() : [];
    
    const content = `
        <div class="group-sort-dialog">
            <h4>🗓️ Gruppen sortieren</h4>
            <p>Ziehen Sie die Gruppen per Drag & Drop in die gewünschte Reihenfolge:</p>
            
            <div class="sortable-groups" id="sortableGroups">
                ${groups.map((group, index) => `
                    <div class="sortable-group-item" data-group-id="${group.id}" draggable="true">
                        <div class="drag-handle">:::</div>
                        <div class="group-color-dot" style="background: ${group.color}"></div>
                        <span class="group-name">${group.name}</span>
                        <span class="group-position">#${index + 1}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="sort-actions">
                <button class="btn btn-secondary" onclick="resetGroupOrder()">Zurücksetzen</button>
                <button class="btn btn-primary" onclick="saveGroupOrder()">Reihenfolge speichern</button>
            </div>
        </div>
    `;
    
    window.PopupManager.showPopup('Gruppen sortieren', content);
    
    // Drag & Drop initialisieren
    setTimeout(() => {
        initializeGroupSorting();
    }, 100);
}

// Drag & Drop für Gruppen-Sortierung initialisieren
function initializeGroupSorting() {
    const container = document.getElementById('sortableGroups');
    if (!container) return;
    
    let draggedItem = null;
    let draggedOverItem = null;
    
    // Event-Listener für alle Gruppen-Items
    container.querySelectorAll('.sortable-group-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
            container.querySelectorAll('.sortable-group-item').forEach(i => {
                i.classList.remove('drag-over');
            });
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (item !== draggedItem) {
                draggedOverItem = item;
                item.classList.add('drag-over');
            }
        });
        
        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (draggedItem && draggedOverItem && draggedItem !== draggedOverItem) {
                // Bestimme ob vor oder nach dem Element eingefügt werden soll
                const rect = draggedOverItem.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const insertAfter = e.clientY > midpoint;
                
                if (insertAfter) {
                    draggedOverItem.parentNode.insertBefore(draggedItem, draggedOverItem.nextSibling);
                } else {
                    draggedOverItem.parentNode.insertBefore(draggedItem, draggedOverItem);
                }
                
                // Positionen aktualisieren
                updateGroupPositions();
            }
            
            container.querySelectorAll('.sortable-group-item').forEach(i => {
                i.classList.remove('drag-over');
            });
        });
    });
}

// Gruppen-Positionen aktualisieren
function updateGroupPositions() {
    const container = document.getElementById('sortableGroups');
    if (!container) return;
    
    container.querySelectorAll('.sortable-group-item').forEach((item, index) => {
        const positionSpan = item.querySelector('.group-position');
        if (positionSpan) {
            positionSpan.textContent = `#${index + 1}`;
        }
    });
}

// Gruppen-Reihenfolge zurücksetzen
function resetGroupOrder() {
    const container = document.getElementById('sortableGroups');
    if (!container) return;
    
    // Gruppen nach Name sortieren (Default-Reihenfolge)
    const items = Array.from(container.querySelectorAll('.sortable-group-item'));
    items.sort((a, b) => {
        const nameA = a.querySelector('.group-name').textContent;
        const nameB = b.querySelector('.group-name').textContent;
        
        // Default-Gruppe immer an erster Stelle
        if (a.dataset.groupId === 'default') return -1;
        if (b.dataset.groupId === 'default') return 1;
        
        return nameA.localeCompare(nameB);
    });
    
    // Container leeren und sortierte Items einfügen
    container.innerHTML = '';
    items.forEach(item => container.appendChild(item));
    
    updateGroupPositions();
}

// Gruppen-Reihenfolge speichern
function saveGroupOrder() {
    const container = document.getElementById('sortableGroups');
    if (!container) return;
    
    const newOrder = [];
    container.querySelectorAll('.sortable-group-item').forEach((item, index) => {
        newOrder.push({
            id: item.dataset.groupId,
            order: index
        });
    });
    
    // Reihenfolge in den Gruppen speichern
    if (window.GroupManager) {
        const groups = window.GroupManager.getAllGroups();
        
        // Order-Eigenschaft zu jeder Gruppe hinzufügen
        newOrder.forEach(orderItem => {
            const group = groups.find(g => g.id === orderItem.id);
            if (group) {
                group.order = orderItem.order;
            }
        });
        
        // Gruppen speichern
        window.GroupManager.saveGroups();
        
        // UI in allen Ansichten aktualisieren
        if (window.TaskManager) {
            window.TaskManager.updateTasksUI();
        }
        if (window.GroupManager.updateGroupsUI) {
            window.GroupManager.updateGroupsUI();
        }
        
        console.log('🗓️ Gruppen-Reihenfolge gespeichert:', newOrder);
    }
    
    window.PopupManager.closePopup();
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
window.resetGroupOrder = resetGroupOrder;
window.saveGroupOrder = saveGroupOrder;

console.log('🎯 Kontextmenü-System geladen');

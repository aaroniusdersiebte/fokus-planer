// Unified Task Editor - Einheitliche Bearbeitungskomponente für Aufgaben

let currentEditingTask = null;
let isInFocusMode = false;
let editorCallbacks = {};

// Haupt-Editor-Funktion
function showTaskEditor(task = null, options = {}) {
    currentEditingTask = task;
    isInFocusMode = options.focusMode || false;
    editorCallbacks = options.callbacks || {};
    
    const isEdit = !!task;
    const title = isEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe';
    const groups = window.GroupManager.getAllGroups();
    
    // Wenn im Fokus-Modus, zeige den Editor inline
    if (isInFocusMode) {
        showInlineFocusEditor(task);
        return;
    }
    
    // Sonst zeige als Popup
    const content = createEditorContent(task, groups, isEdit);
    window.PopupManager.showPopup(title, content);
    setupEditorEventListeners(task, isEdit);
}

// Editor-Content erstellen
function createEditorContent(task, groups, isEdit) {
    return `
        <div class="unified-task-editor">
            <form id="taskEditorForm" class="modern-task-form">
                <!-- Grundlegende Informationen -->
                <div class="task-section main-info">
                    <div class="form-group">
                        <label class="modern-label" for="taskTitle">
                            <span class="label-text">Titel <span class="required">*</span></span>
                        </label>
                        <input type="text" id="taskTitle" class="modern-input title-input" 
                               value="${isEdit ? task.title : ''}" 
                               placeholder="Was soll erledigt werden?" required autofocus>
                    </div>
                    
                    <div class="form-group">
                        <label class="modern-label" for="taskDescription">
                            <span class="label-text">Beschreibung</span>
                            <span class="label-hint">Optional</span>
                        </label>
                        <textarea id="taskDescription" class="modern-textarea" 
                                  placeholder="Zusätzliche Details, Kontext oder Anforderungen..."
                                  rows="3">${isEdit ? task.description : ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="modern-label" for="taskGroup">
                                <span class="label-text">📁 Gruppe</span>
                            </label>
                            <select id="taskGroup" class="modern-select">
                                ${groups.map(group => 
                                    `<option value="${group.id}" ${isEdit && task.groupId === group.id ? 'selected' : ''}>
                                        ${group.name}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="modern-label" for="taskPriority">
                                <span class="label-text">⚡ Priorität</span>
                            </label>
                            <select id="taskPriority" class="modern-select">
                                <option value="low" ${isEdit && task.priority === 'low' ? 'selected' : ''}>🟢 Niedrig</option>
                                <option value="medium" ${isEdit && task.priority === 'medium' ? 'selected' : ''}>🟡 Mittel</option>
                                <option value="high" ${isEdit && task.priority === 'high' ? 'selected' : ''}>🔴 Hoch</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="modern-label" for="taskTags">
                            <span class="label-text">🏷️ Tags</span>
                            <span class="label-hint">Kommagetrennt</span>
                        </label>
                        <div class="tags-input-container">
                            <input type="text" id="taskTags" class="modern-input" 
                                   value="${isEdit ? task.tags.join(', ') : ''}"
                                   placeholder="z.B. wichtig, projekt, deadline">
                            <div class="tags-suggestions" id="tagsSuggestions"></div>
                        </div>
                        <div class="existing-tags">
                            <span class="tags-label">Häufig verwendet:</span>
                            ${getPopularTags().map(tag => `
                                <span class="tag-suggestion" onclick="addTagToInput('${tag}')">${tag}</span>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Subtasks Sektion -->
                ${isEdit && task.subtasks && task.subtasks.length > 0 ? `
                    <div class="task-section">
                        <div class="section-header">
                            <h4>📋 Unteraufgaben</h4>
                            <div class="progress-indicator">
                                <div class="progress-bar modern">
                                    <div class="progress-fill" style="width: ${task.progress || 0}%"></div>
                                </div>
                                <span class="progress-text">${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length}</span>
                            </div>
                        </div>
                        
                        <div class="subtask-input-container">
                            <input type="text" id="newSubtaskInput" class="modern-input" 
                                   placeholder="Neue Unteraufgabe hinzufügen...">
                            <button type="button" class="btn btn-icon modern" onclick="addNewSubtask('${task.id}')">
                                +
                            </button>
                        </div>
                        
                        <div class="subtasks-list modern" id="subtasksList">
                            ${task.subtasks.map(subtask => `
                                <div class="subtask-item modern ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}">
                                    <label class="subtask-checkbox">
                                        <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                               onchange="toggleSubtaskInEditor('${task.id}', '${subtask.id}')">
                                        <span class="checkmark"></span>
                                    </label>
                                    <span class="subtask-text" ondblclick="editSubtaskText('${subtask.id}')">${subtask.text}</span>
                                    <div class="subtask-actions">
                                        <button type="button" class="btn-icon small" onclick="editSubtaskText('${subtask.id}')" title="Bearbeiten">
                                            ✏️
                                        </button>
                                        <button type="button" class="btn-icon small danger" onclick="deleteSubtaskInEditor('${task.id}', '${subtask.id}')" title="Löschen">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Chat/History Sektion -->
                ${isEdit && task.notes && task.notes.length > 0 ? `
                    <div class="task-section">
                        <div class="section-header">
                            <h4>💬 Verlauf & Notizen</h4>
                            <span class="entry-count">${task.notes.length} Einträge</span>
                        </div>
                        
                        <div class="history-chat" id="historyChat">
                            ${task.notes.map(note => `
                                <div class="chat-message ${note.important ? 'important' : ''}" data-note-id="${note.id}">
                                    <div class="message-header">
                                        <span class="message-time">${formatChatTime(note.createdAt)}</span>
                                        <div class="message-actions">
                                            <button class="btn-icon micro" onclick="toggleNoteImportant('${task.id}', '${note.id}')" title="${note.important ? 'Als nicht wichtig markieren' : 'Als wichtig markieren'}">
                                                ${note.important ? '⭐' : '☆'}
                                            </button>
                                            <button class="btn-icon micro" onclick="editTaskNote('${task.id}', '${note.id}')" title="Bearbeiten">
                                                ✏️
                                            </button>
                                            <button class="btn-icon micro danger" onclick="deleteTaskNoteFromEditor('${task.id}', '${note.id}')" title="Löschen">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <div class="message-content ${note.important ? 'important' : ''}">
                                        ${note.important ? '<span class="important-marker">⭐</span>' : ''}
                                        ${note.text}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="message-input-container">
                            <textarea id="newMessageInput" class="modern-textarea message-input" 
                                      placeholder="Notiz, Fortschritt oder Idee hinzufügen... (Ctrl+Enter zum Senden)"
                                      rows="2"></textarea>
                            <button type="button" class="btn btn-primary modern" onclick="addNewTaskNote('${task.id}')">
                                <span class="icon">💬</span>
                                Hinzufügen
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- Form Actions -->
                <div class="form-actions modern">
                    <button type="button" class="btn btn-secondary modern" onclick="closeTaskEditor()">
                        <span class="icon">↶</span> Abbrechen
                    </button>
                    
                    ${isEdit ? `
                        <button type="button" class="btn btn-focus modern" onclick="startFocusFromEditor('${task.id}')">
                            <span class="icon">🎯</span> Fokus starten
                        </button>
                    ` : ''}
                    
                    <button type="submit" class="btn btn-primary modern">
                        <span class="icon">${isEdit ? '💾' : '✨'}</span>
                        ${isEdit ? 'Speichern' : 'Erstellen'}
                    </button>
                </div>
            </form>
        </div>
    `;
}

// Inline Fokus-Editor anzeigen
function showInlineFocusEditor(task) {
    const editorContainer = document.getElementById('focusTaskEditor');
    if (!editorContainer) return;
    
    const groups = window.GroupManager.getAllGroups();
    const isEdit = !!task;
    
    editorContainer.innerHTML = createEditorContent(task, groups, isEdit);
    editorContainer.classList.add('active');
    setupEditorEventListeners(task, isEdit);
}

// Event Listeners einrichten
function setupEditorEventListeners(task, isEdit) {
    // Form Submit Handler
    const form = document.getElementById('taskEditorForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit(task, isEdit);
        });
    }
    
    // Tags Auto-Complete
    setupTagsAutofill();
    
    // Enter-Handler für Subtask-Input
    const subtaskInput = document.getElementById('newSubtaskInput');
    if (subtaskInput) {
        subtaskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (task) addNewSubtask(task.id);
            }
        });
    }
    
    // Ctrl+Enter für Notiz-Input
    const messageInput = document.getElementById('newMessageInput');
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                if (task) addNewTaskNote(task.id);
            }
        });
    }
}

// Form-Daten verarbeiten
function handleFormSubmit(task, isEdit) {
    const formData = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        groupId: document.getElementById('taskGroup').value,
        priority: document.getElementById('taskPriority').value,
        tags: document.getElementById('taskTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
    };
    
    if (!formData.title) {
        alert('Bitte geben Sie einen Titel ein.');
        document.getElementById('taskTitle').focus();
        return;
    }
    
    let savedTask;
    if (isEdit) {
        savedTask = window.TaskManager.updateTask(task.id, formData);
    } else {
        savedTask = window.TaskManager.createTask(formData);
    }
    
    // Callbacks ausführen
    if (editorCallbacks.onSave) {
        editorCallbacks.onSave(savedTask);
    }
    
    closeTaskEditor();
    
    // Erfolgsmeldung
    showNotification(
        isEdit ? '✅ Aufgabe aktualisiert' : '✨ Neue Aufgabe erstellt',
        'success'
    );
}

// Editor schließen
function closeTaskEditor() {
    if (isInFocusMode) {
        const editorContainer = document.getElementById('focusTaskEditor');
        if (editorContainer) {
            editorContainer.classList.remove('active');
        }
    } else {
        window.PopupManager.closePopup();
    }
    
    currentEditingTask = null;
    isInFocusMode = false;
    editorCallbacks = {};
}

// Fokus aus Editor starten
function startFocusFromEditor(taskId) {
    closeTaskEditor();
    window.FocusManager.startFocusSession(taskId);
}

// Subtask-Funktionen für Editor
function toggleSubtaskInEditor(taskId, subtaskId) {
    if (window.TaskManager.toggleSubtask(taskId, subtaskId)) {
        const subtaskItem = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
        if (subtaskItem) {
            const checkbox = subtaskItem.querySelector('input[type="checkbox"]');
            if (checkbox.checked) {
                subtaskItem.classList.add('completed');
            } else {
                subtaskItem.classList.remove('completed');
            }
        }
        updateProgressIndicator(taskId);
    }
}

function deleteSubtaskInEditor(taskId, subtaskId) {
    if (confirm('Unteraufgabe löschen?')) {
        if (window.TaskManager.deleteSubtask(taskId, subtaskId)) {
            const subtaskItem = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
            if (subtaskItem) {
                subtaskItem.remove();
                updateProgressIndicator(taskId);
            }
        }
    }
}

function addNewSubtask(taskId) {
    const input = document.getElementById('newSubtaskInput');
    if (!input || !input.value.trim()) return;
    
    const subtaskText = input.value.trim();
    const newSubtask = window.TaskManager.addSubtask(taskId, subtaskText);
    
    if (newSubtask) {
        const subtasksList = document.getElementById('subtasksList');
        if (subtasksList) {
            const subtaskElement = document.createElement('div');
            subtaskElement.className = 'subtask-item modern';
            subtaskElement.setAttribute('data-subtask-id', newSubtask.id);
            subtaskElement.innerHTML = `
                <label class="subtask-checkbox">
                    <input type="checkbox" onchange="toggleSubtaskInEditor('${taskId}', '${newSubtask.id}')">
                    <span class="checkmark"></span>
                </label>
                <span class="subtask-text" ondblclick="editSubtaskText('${newSubtask.id}')">${newSubtask.text}</span>
                <div class="subtask-actions">
                    <button type="button" class="btn-icon small" onclick="editSubtaskText('${newSubtask.id}')" title="Bearbeiten">
                        ✏️
                    </button>
                    <button type="button" class="btn-icon small danger" onclick="deleteSubtaskInEditor('${taskId}', '${newSubtask.id}')" title="Löschen">
                        🗑️
                    </button>
                </div>
            `;
            subtasksList.appendChild(subtaskElement);
        }
        
        updateProgressIndicator(taskId);
        input.value = '';
        input.focus();
    }
}

// Notiz-Funktionen für Editor
function addNewTaskNote(taskId) {
    const input = document.getElementById('newMessageInput');
    if (!input || !input.value.trim()) return;
    
    const noteText = input.value.trim();
    const newNote = window.TaskManager.addTaskNote(taskId, noteText);
    
    if (newNote) {
        const historyChat = document.getElementById('historyChat');
        if (historyChat) {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message';
            messageElement.setAttribute('data-note-id', newNote.id);
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-time">${formatChatTime(newNote.createdAt)}</span>
                    <div class="message-actions">
                        <button class="btn-icon micro" onclick="toggleNoteImportant('${taskId}', '${newNote.id}')" title="Als wichtig markieren">
                            ☆
                        </button>
                        <button class="btn-icon micro" onclick="editTaskNote('${taskId}', '${newNote.id}')" title="Bearbeiten">
                            ✏️
                        </button>
                        <button class="btn-icon micro danger" onclick="deleteTaskNoteFromEditor('${taskId}', '${newNote.id}')" title="Löschen">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="message-content">${newNote.text}</div>
            `;
            
            historyChat.insertBefore(messageElement, historyChat.firstChild);
        }
        
        // Entry count aktualisieren
        const entryCount = document.querySelector('.entry-count');
        if (entryCount) {
            const currentCount = parseInt(entryCount.textContent.split(' ')[0]) + 1;
            entryCount.textContent = `${currentCount} Einträge`;
        }
        
        input.value = '';
        input.focus();
    }
}

function deleteTaskNoteFromEditor(taskId, noteId) {
    if (confirm('Diese Notiz löschen?')) {
        if (window.TaskManager.deleteTaskNote(taskId, noteId)) {
            const messageEl = document.querySelector(`[data-note-id="${noteId}"]`);
            if (messageEl) {
                messageEl.remove();
                
                // Entry count aktualisieren
                const entryCount = document.querySelector('.entry-count');
                if (entryCount) {
                    const currentCount = Math.max(0, parseInt(entryCount.textContent.split(' ')[0]) - 1);
                    entryCount.textContent = `${currentCount} Einträge`;
                }
            }
        }
    }
}

// Hilfsfunktionen
function getPopularTags() {
    const allTasks = window.StorageManager.readDataFile('tasks');
    const tagCounts = {};
    
    allTasks.forEach(task => {
        task.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    
    return Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([tag,]) => tag);
}

function formatChatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

function updateProgressIndicator(taskId) {
    const task = window.TaskManager.getTaskById(taskId);
    if (!task) return;
    
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressFill && progressText) {
        const completed = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
        const total = task.subtasks ? task.subtasks.length : 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        progressFill.style.width = progress + '%';
        progressText.textContent = `${completed}/${total}`;
    }
}

function setupTagsAutofill() {
    const tagsInput = document.getElementById('taskTags');
    const suggestionsContainer = document.getElementById('tagsSuggestions');
    
    if (!tagsInput || !suggestionsContainer) return;
    
    tagsInput.addEventListener('input', (e) => {
        const value = e.target.value;
        const lastCommaIndex = value.lastIndexOf(',');
        const currentTag = value.substring(lastCommaIndex + 1).trim();
        
        if (currentTag.length > 0) {
            const allTasks = window.StorageManager.readDataFile('tasks');
            const existingTags = [...new Set(allTasks.flatMap(t => t.tags || []))];
            const matchingTags = existingTags.filter(tag => 
                tag.toLowerCase().includes(currentTag.toLowerCase()) &&
                !value.includes(tag)
            );
            
            if (matchingTags.length > 0) {
                suggestionsContainer.innerHTML = matchingTags
                    .slice(0, 5)
                    .map(tag => `<div class="tag-suggestion" onclick="insertTag('${tag}')">${tag}</div>`)
                    .join('');
                suggestionsContainer.style.display = 'block';
            } else {
                suggestionsContainer.style.display = 'none';
            }
        } else {
            suggestionsContainer.style.display = 'none';
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!tagsInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });
}

function insertTag(tag) {
    const tagsInput = document.getElementById('taskTags');
    const suggestionsContainer = document.getElementById('tagsSuggestions');
    
    if (!tagsInput) return;
    
    const value = tagsInput.value;
    const lastCommaIndex = value.lastIndexOf(',');
    
    if (lastCommaIndex === -1) {
        tagsInput.value = tag + ', ';
    } else {
        tagsInput.value = value.substring(0, lastCommaIndex + 1) + ' ' + tag + ', ';
    }
    
    suggestionsContainer.style.display = 'none';
    tagsInput.focus();
}

function addTagToInput(tag) {
    const tagsInput = document.getElementById('taskTags');
    if (!tagsInput) return;
    
    const currentValue = tagsInput.value.trim();
    if (currentValue && !currentValue.endsWith(',')) {
        tagsInput.value = currentValue + ', ' + tag + ', ';
    } else {
        tagsInput.value = currentValue + tag + ', ';
    }
    tagsInput.focus();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentNode.remove()">×</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#2196f3'};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 250px;
        animation: slideInRight 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    `;
    
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

// Exportiere globale Funktionen
window.TaskEditorManager = {
    showTaskEditor,
    closeTaskEditor,
    showInlineFocusEditor
};

// Globale Funktionen für HTML onclick Events
window.closeTaskEditor = closeTaskEditor;
window.startFocusFromEditor = startFocusFromEditor;
window.toggleSubtaskInEditor = toggleSubtaskInEditor;
window.deleteSubtaskInEditor = deleteSubtaskInEditor;
window.addNewSubtask = addNewSubtask;
window.addNewTaskNote = addNewTaskNote;
window.deleteTaskNoteFromEditor = deleteTaskNoteFromEditor;
window.toggleNoteImportant = function(taskId, noteId) {
    if (window.TaskManager.toggleTaskNoteImportant(taskId, noteId)) {
        const messageEl = document.querySelector(`[data-note-id="${noteId}"]`);
        if (messageEl) {
            const task = window.TaskManager.getTaskById(taskId);
            const note = task.notes.find(n => n.id === noteId);
            
            const contentEl = messageEl.querySelector('.message-content');
            const importantBtn = messageEl.querySelector('.btn-icon[onclick*="toggleNoteImportant"]');
            
            if (note.important) {
                contentEl.classList.add('important');
                importantBtn.innerHTML = '⭐';
                importantBtn.title = 'Als nicht wichtig markieren';
            } else {
                contentEl.classList.remove('important');
                importantBtn.innerHTML = '☆';
                importantBtn.title = 'Als wichtig markieren';
            }
        }
    }
};
window.editTaskNote = function(taskId, noteId) {
    // Implementierung für inline Bearbeitung
    console.log('Edit note:', noteId);
};
window.addTagToInput = addTagToInput;
window.insertTag = insertTag;
window.editSubtaskText = function(subtaskId) {
    // Implementierung für inline Bearbeitung
    console.log('Edit subtask:', subtaskId);
};
window.formatChatTime = formatChatTime;

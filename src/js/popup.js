// Popup Management - Globale Funktionen für Pop-up-Fenster

let currentPopup = null;

// Popup anzeigen
function showPopup(title, content) {
    const overlay = document.getElementById('popupOverlay');
    const popupTitle = document.getElementById('popupTitle');
    const popupContent = document.getElementById('popupContent');
    
    if (!overlay || !popupTitle || !popupContent) return;
    
    popupTitle.textContent = title;
    popupContent.innerHTML = content;
    
    overlay.classList.add('active');
    currentPopup = title;
    
    // Focus auf erstes Input-Element setzen
    setTimeout(() => {
        const firstInput = popupContent.querySelector('input, textarea, select');
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
    
    // ESC-Key Handler
    document.addEventListener('keydown', handlePopupEscape);
}

// Popup schließen
function closePopup() {
    const overlay = document.getElementById('popupOverlay');
    if (!overlay) return;
    
    overlay.classList.remove('active');
    currentPopup = null;
    
    document.removeEventListener('keydown', handlePopupEscape);
}

// ESC-Key Handler
function handlePopupEscape(e) {
    if (e.key === 'Escape') {
        closePopup();
    }
}

// Aufgaben-Dialog anzeigen
function showTaskDialog(task = null) {
    const isEdit = !!task;
    const title = isEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe';
    const groups = window.GroupManager.getAllGroups();
    
    const content = `
        <form id="taskForm" class="task-form">
            <div class="form-group">
                <label class="form-label" for="taskTitle">Titel *</label>
                <input type="text" id="taskTitle" class="form-input" 
                       value="${isEdit ? task.title : ''}" 
                       placeholder="Was soll erledigt werden?" required autofocus>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="taskDescription">Beschreibung</label>
                <textarea id="taskDescription" class="form-textarea" 
                          placeholder="Zusätzliche Details...">${isEdit ? task.description : ''}</textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label" for="taskGroup">Gruppe</label>
                    <select id="taskGroup" class="form-select">
                        ${groups.map(group => 
                            `<option value="${group.id}" ${isEdit && task.groupId === group.id ? 'selected' : ''}>
                                ${group.name}
                            </option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="taskPriority">Priorität</label>
                    <select id="taskPriority" class="form-select">
                        <option value="low" ${isEdit && task.priority === 'low' ? 'selected' : ''}>Niedrig</option>
                        <option value="medium" ${isEdit && task.priority === 'medium' ? 'selected' : ''}>Mittel</option>
                        <option value="high" ${isEdit && task.priority === 'high' ? 'selected' : ''}>Hoch</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="taskTags">Tags (kommagetrennt)</label>
                <input type="text" id="taskTags" class="form-input" 
                       value="${isEdit ? task.tags.join(', ') : ''}"
                       placeholder="z.B. wichtig, urgent, projekt1">
            </div>
            
            <div class="form-group">
                <label class="form-label" for="taskDueDate">Fälligkeitsdatum</label>
                <input type="datetime-local" id="taskDueDate" class="form-input"
                       value="${isEdit && task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''}">
            </div>
            
            <div class="form-group">
                <label class="form-label" for="taskEstimatedTime">Geschätzte Zeit (Minuten)</label>
                <input type="number" id="taskEstimatedTime" class="form-input" min="0"
                       value="${isEdit ? task.estimatedTime : 0}"
                       placeholder="0">
            </div>
            
            ${isEdit && task.subtasks && task.subtasks.length > 0 ? `
                <div class="form-group">
                    <label class="form-label">Subtasks</label>
                    <div class="subtasks-list" id="subtasksList">
                        ${task.subtasks.map(subtask => `
                            <div class="subtask-item" data-subtask-id="${subtask.id}">
                                <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                       onchange="toggleSubtaskInDialog('${task.id}', '${subtask.id}')">
                                <span class="subtask-text ${subtask.completed ? 'completed' : ''}">${subtask.text}</span>
                                <button type="button" class="btn-icon" onclick="deleteSubtaskInDialog('${task.id}', '${subtask.id}')">🗑️</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closePopup()">Abbrechen</button>
                ${isEdit ? `
                    <button type="button" class="btn btn-focus" onclick="startFocusMode('${task.id}')">
                        <span class="icon">🎯</span> Fokus
                    </button>
                ` : ''}
                <button type="submit" class="btn btn-primary">
                    ${isEdit ? 'Speichern' : 'Erstellen'}
                </button>
            </div>
        </form>
    `;
    
    showPopup(title, content);
    
    // Form Submit Handler
    document.getElementById('taskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            groupId: document.getElementById('taskGroup').value,
            priority: document.getElementById('taskPriority').value,
            tags: document.getElementById('taskTags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0),
            dueDate: document.getElementById('taskDueDate').value || null,
            estimatedTime: parseInt(document.getElementById('taskEstimatedTime').value) || 0
        };
        
        if (!formData.title) {
            alert('Bitte geben Sie einen Titel ein.');
            return;
        }
        
        if (isEdit) {
            window.TaskManager.updateTask(task.id, formData);
        } else {
            window.TaskManager.createTask(formData);
        }
        
        closePopup();
    });
}

// Notizen-Dialog anzeigen
function showNoteDialog(note = null) {
    const isEdit = !!note;
    const title = isEdit ? 'Notiz bearbeiten' : 'Neue Notiz';
    
    const content = `
        <form id="noteForm" class="note-form">
            <div class="form-group">
                <label class="form-label" for="noteTitle">Titel (optional)</label>
                <input type="text" id="noteTitle" class="form-input" 
                       value="${isEdit ? note.title : ''}" 
                       placeholder="Wird automatisch aus dem Inhalt generiert">
            </div>
            
            <div class="form-group">
                <label class="form-label" for="noteContent">Inhalt *</label>
                <textarea id="noteContent" class="form-textarea large" 
                          placeholder="Hier können Sie Ihre Notiz eingeben..."
                          required autofocus rows="10">${isEdit ? note.content : ''}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="noteTags">Tags (kommagetrennt)</label>
                <input type="text" id="noteTags" class="form-input" 
                       value="${isEdit ? note.tags.join(', ') : ''}"
                       placeholder="z.B. idee, wichtig, später">
            </div>
            
            <div class="form-tips">
                <h4>Formatierungstipps:</h4>
                <ul>
                    <li><strong>**fett**</strong> für fetten Text</li>
                    <li><em>*kursiv*</em> für kursiven Text</li>
                    <li>Zeilenumbrüche werden automatisch erkannt</li>
                </ul>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closePopup()">Abbrechen</button>
                ${isEdit ? `
                    <button type="button" class="btn btn-warning" onclick="convertNoteToTaskFromDialog('${note.id}')">
                        <span class="icon">✓</span> In Aufgabe umwandeln
                    </button>
                ` : ''}
                <button type="submit" class="btn btn-primary">
                    ${isEdit ? 'Speichern' : 'Erstellen'}
                </button>
            </div>
        </form>
    `;
    
    showPopup(title, content);
    
    // Auto-Resize für Textarea
    const textarea = document.getElementById('noteContent');
    textarea.addEventListener('input', autoResizeTextarea);
    
    // Form Submit Handler
    document.getElementById('noteForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('noteTitle').value.trim(),
            content: document.getElementById('noteContent').value.trim(),
            tags: document.getElementById('noteTags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
        };
        
        if (!formData.content) {
            alert('Bitte geben Sie einen Inhalt ein.');
            return;
        }
        
        if (isEdit) {
            window.NoteManager.updateNote(note.id, formData);
        } else {
            window.NoteManager.createNote(formData);
        }
        
        closePopup();
    });
}

// Textarea automatisch vergrößern
function autoResizeTextarea(e) {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px';
}

// Subtask im Dialog umschalten
function toggleSubtaskInDialog(taskId, subtaskId) {
    window.TaskManager.toggleSubtask(taskId, subtaskId);
    
    // UI aktualisieren
    const subtaskItem = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (subtaskItem) {
        const checkbox = subtaskItem.querySelector('input[type="checkbox"]');
        const text = subtaskItem.querySelector('.subtask-text');
        
        if (checkbox.checked) {
            text.classList.add('completed');
        } else {
            text.classList.remove('completed');
        }
    }
}

// Subtask im Dialog löschen
function deleteSubtaskInDialog(taskId, subtaskId) {
    if (confirm('Subtask löschen?')) {
        window.TaskManager.deleteSubtask(taskId, subtaskId);
        
        // UI Element entfernen
        const subtaskItem = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
        if (subtaskItem) {
            subtaskItem.remove();
        }
    }
}

// Notiz in Aufgabe umwandeln (aus Dialog)
function convertNoteToTaskFromDialog(noteId) {
    closePopup();
    window.NoteManager.showConvertNoteDialog(noteId);
}

// Fokus-Modus starten (aus Dialog)
function startFocusMode(taskId) {
    closePopup();
    window.FocusManager.startFocusSession(taskId);
}

// Event Listeners für Popup
document.addEventListener('DOMContentLoaded', () => {
    // Popup schließen bei Klick auf Overlay
    const overlay = document.getElementById('popupOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closePopup();
            }
        });
    }
    
    // Popup schließen Button
    const closeBtn = document.getElementById('popupClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePopup);
    }
});

// CSS für Form-Styling hinzufügen
const additionalCSS = `
<style>
.task-form, .note-form {
    max-width: 100%;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
}

.form-textarea.large {
    min-height: 200px;
    resize: vertical;
}

.form-tips {
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin: var(--spacing-md) 0;
}

.form-tips h4 {
    margin-bottom: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.form-tips ul {
    margin: 0;
    padding-left: var(--spacing-lg);
    color: var(--text-muted);
    font-size: 0.85rem;
}

.form-tips li {
    margin-bottom: var(--spacing-xs);
}

.subtasks-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
}

.subtask-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) 0;
    border-bottom: 1px solid var(--border-color);
}

.subtask-item:last-child {
    border-bottom: none;
}

.subtask-text {
    flex: 1;
    font-size: 0.9rem;
}

.subtask-text.completed {
    text-decoration: line-through;
    color: var(--text-muted);
}

.btn-icon {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
}

.btn-icon:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.form-color {
    width: 50px;
    height: 35px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    background: transparent;
}

.color-picker {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

.color-presets {
    display: flex;
    gap: var(--spacing-xs);
}

.color-preset {
    width: 25px;
    height: 25px;
    border: 2px solid var(--border-color);
    border-radius: 50%;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.color-preset:hover {
    transform: scale(1.1);
    border-color: var(--text-primary);
}

.convert-note-preview {
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.note-preview {
    margin-top: var(--spacing-sm);
}

.note-preview strong {
    display: block;
    margin-bottom: var(--spacing-xs);
    color: var(--accent-primary);
}

.note-preview p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.4;
}

@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

@media (max-width: 768px) {
    .form-row {
        grid-template-columns: 1fr;
    }
    
    .popup-container {
        width: 95%;
        margin: var(--spacing-md);
    }
}

/* Moderne Task-Dialog Styles */
.modern-task-dialog {
    max-width: 700px;
    width: 100%;
}

.modern-task-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
}

.task-section {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border: 1px solid var(--border-color);
}

.task-section.main-info {
    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
}

.modern-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    font-weight: 600;
    color: var(--text-primary);
}

.label-text {
    font-size: 0.9rem;
}

.required {
    color: var(--accent-danger);
    font-weight: bold;
}

.label-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 400;
    margin-left: auto;
}

.modern-input, .modern-textarea, .modern-select {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all var(--transition-medium);
    font-family: inherit;
}

.modern-input:focus, .modern-textarea:focus, .modern-select:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.1);
    transform: translateY(-1px);
}

.title-input {
    font-size: 1.1rem;
    font-weight: 600;
    padding: 16px 20px;
}

.modern-textarea {
    resize: vertical;
    min-height: 80px;
    line-height: 1.5;
}

.tags-input-container {
    position: relative;
}

.tags-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-primary);
    border: 2px solid var(--border-color);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
}

.tags-suggestions .tag-suggestion {
    padding: 10px 16px;
    cursor: pointer;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-color);
    transition: all var(--transition-fast);
}

.tags-suggestions .tag-suggestion:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.tags-suggestions .tag-suggestion:last-child {
    border-bottom: none;
}

.existing-tags {
    margin-top: var(--spacing-sm);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-xs);
}

.tags-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-right: var(--spacing-sm);
}

.tag-suggestion {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    border: 1px solid transparent;
}

.tag-suggestion:hover {
    background: var(--accent-primary);
    color: white;
    transform: translateY(-1px);
}

/* Subtasks Sektion */
.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-sm);
    border-bottom: 2px solid var(--border-color);
}

.section-header h4 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.section-header h4:before {
    content: "📋";
    font-size: 1.2rem;
}

.progress-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.progress-bar.modern {
    width: 120px;
    height: 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
}

.progress-bar.modern .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-success) 0%, var(--accent-primary) 100%);
    border-radius: 4px;
    transition: width var(--transition-medium);
}

.progress-text {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 600;
    min-width: 30px;
}

.subtask-input-container {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
}

.subtask-input-container .modern-input {
    flex: 1;
}

.btn.btn-icon.modern {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    border: 2px solid var(--accent-primary);
    background: var(--accent-primary);
    color: white;
    transition: all var(--transition-fast);
}

.btn.btn-icon.modern:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

.subtasks-list.modern {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    max-height: 300px;
    overflow-y: auto;
    background: var(--bg-primary);
}

.subtask-item.modern {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
    transition: all var(--transition-fast);
    position: relative;
}

.subtask-item.modern:hover {
    background: var(--bg-hover);
}

.subtask-item.modern:last-child {
    border-bottom: none;
}

.subtask-item.modern.completed {
    opacity: 0.7;
}

.subtask-checkbox {
    position: relative;
    display: flex;
    align-items: center;
    cursor: pointer;
    min-width: 20px;
}

.subtask-checkbox input[type="checkbox"] {
    opacity: 0;
    position: absolute;
    cursor: pointer;
}

.subtask-checkbox .checkmark {
    width: 20px;
    height: 20px;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    border-radius: 4px;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
}

.subtask-checkbox input[type="checkbox"]:checked + .checkmark {
    background: var(--accent-success);
    border-color: var(--accent-success);
}

.subtask-checkbox input[type="checkbox"]:checked + .checkmark:after {
    content: "✓";
    color: white;
    font-size: 0.8rem;
    font-weight: bold;
}

.subtask-text {
    flex: 1;
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
}

.subtask-text:hover {
    background: var(--bg-tertiary);
}

.subtask-item.completed .subtask-text {
    text-decoration: line-through;
    color: var(--text-muted);
}

.subtask-actions {
    display: flex;
    gap: var(--spacing-xs);
    opacity: 0;
    transition: opacity var(--transition-fast);
}

.subtask-item.modern:hover .subtask-actions {
    opacity: 1;
}

.btn-icon.small {
    width: 28px;
    height: 28px;
    border: none;
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 0.8rem;
}

.btn-icon.small:hover {
    background: var(--bg-hover);
    transform: scale(1.1);
}

.btn-icon.small.danger:hover {
    background: var(--accent-danger);
    color: white;
}

.edit-subtask-input {
    width: 100%;
    background: var(--bg-primary);
    border: 1px solid var(--accent-primary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs);
    color: var(--text-primary);
    font-size: inherit;
}

/* History/Chat Sektion */
.history-section .section-header h4:before {
    content: "💬";
}

.entry-count {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
}

.history-chat {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
}

.chat-message {
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    border-left: 3px solid var(--border-color);
    transition: all var(--transition-fast);
}

.chat-message:hover {
    border-left-color: var(--accent-primary);
    transform: translateX(2px);
}

.message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xs);
}

.message-time {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 500;
}

.message-actions {
    display: flex;
    gap: var(--spacing-xs);
    opacity: 0;
    transition: opacity var(--transition-fast);
}

.chat-message:hover .message-actions {
    opacity: 1;
}

.btn-icon.micro {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 0.7rem;
    color: var(--text-muted);
}

.btn-icon.micro:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    transform: scale(1.1);
}

.btn-icon.micro.danger:hover {
    background: var(--accent-danger);
    color: white;
}

.message-content {
    color: var(--text-primary);
    line-height: 1.4;
    word-wrap: break-word;
}

.message-content.important {
    background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%);
    border-left: 3px solid var(--accent-warning);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    margin-top: var(--spacing-xs);
}

.important-marker {
    font-size: 0.8rem;
    margin-right: var(--spacing-xs);
}

.no-messages {
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
    padding: var(--spacing-lg);
}

.message-input-container {
    display: flex;
    gap: var(--spacing-sm);
    align-items: flex-end;
}

.message-input {
    flex: 1;
    min-height: 60px;
    resize: vertical;
}

.edit-note-textarea {
    width: 100%;
    background: var(--bg-primary);
    border: 2px solid var(--accent-primary);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm);
    color: var(--text-primary);
    resize: vertical;
    font-family: inherit;
}

.edit-note-buttons {
    display: flex;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
}

.btn.btn-sm {
    padding: 6px 12px;
    font-size: 0.8rem;
    border-radius: var(--radius-sm);
}

/* Form Actions */
.form-actions.modern {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    padding-top: var(--spacing-lg);
    border-top: 2px solid var(--border-color);
    margin-top: var(--spacing-lg);
}

.btn.modern {
    padding: 12px 24px;
    border-radius: var(--radius-md);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    transition: all var(--transition-medium);
    border: 2px solid transparent;
    position: relative;
    overflow: hidden;
}

.btn.modern .icon {
    font-size: 1.1rem;
}

.btn.btn-primary.modern {
    background: linear-gradient(135deg, var(--accent-primary) 0%, #3b82f6 100%);
    color: white;
    border-color: var(--accent-primary);
}

.btn.btn-primary.modern:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(74, 158, 255, 0.3);
}

.btn.btn-secondary.modern {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-color: var(--border-color);
}

.btn.btn-secondary.modern:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    transform: translateY(-1px);
}

.btn.btn-focus.modern {
    background: linear-gradient(135deg, var(--accent-warning) 0%, #f59e0b 100%);
    color: white;
    border-color: var(--accent-warning);
}

.btn.btn-focus.modern:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
    .modern-task-dialog {
        max-width: 95vw;
    }
    
    .task-section {
        padding: var(--spacing-md);
    }
    
    .form-actions.modern {
        flex-direction: column;
    }
    
    .btn.modern {
        justify-content: center;
    }
    
    .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
    }
    
    .progress-indicator {
        align-self: stretch;
    }
    
    .message-input-container {
        flex-direction: column;
    }
}

/* Scrollbar Styles */
.history-chat::-webkit-scrollbar,
.subtasks-list.modern::-webkit-scrollbar {
    width: 6px;
}

.history-chat::-webkit-scrollbar-track,
.subtasks-list.modern::-webkit-scrollbar-track {
    background: var(--bg-tertiary);
    border-radius: 3px;
}

.history-chat::-webkit-scrollbar-thumb,
.subtasks-list.modern::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
}

.history-chat::-webkit-scrollbar-thumb:hover,
.subtasks-list.modern::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
}

</style>
`;

// CSS zum Head hinzufügen
document.head.insertAdjacentHTML('beforeend', additionalCSS);

// Exportiere globale Funktionen
window.PopupManager = {
    showPopup,
    closePopup,
    showTaskDialog,
    showNoteDialog
};

// Hilfsfunktionen für modernen Task-Dialog
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
    
    // Verstecke Vorschläge beim Klick außerhalb
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

function addNewSubtask(taskId) {
    const input = document.getElementById('newSubtaskInput');
    if (!input || !input.value.trim()) return;
    
    const subtaskText = input.value.trim();
    const newSubtask = window.TaskManager.addSubtask(taskId, subtaskText);
    
    if (newSubtask) {
        // UI aktualisieren
        const subtasksList = document.getElementById('subtasksList');
        if (subtasksList) {
            const subtaskElement = document.createElement('div');
            subtaskElement.className = 'subtask-item modern';
            subtaskElement.setAttribute('data-subtask-id', newSubtask.id);
            subtaskElement.innerHTML = `
                <label class="subtask-checkbox">
                    <input type="checkbox" onchange="toggleSubtaskInDialog('${taskId}', '${newSubtask.id}')">
                    <span class="checkmark"></span>
                </label>
                <span class="subtask-text" ondblclick="editSubtaskText('${newSubtask.id}')">${newSubtask.text}</span>
                <div class="subtask-actions">
                    <button type="button" class="btn-icon small" onclick="editSubtaskText('${newSubtask.id}')" title="Bearbeiten">
                        ✏️
                    </button>
                    <button type="button" class="btn-icon small danger" onclick="deleteSubtaskInDialog('${taskId}', '${newSubtask.id}')" title="Löschen">
                        🗑️
                    </button>
                </div>
            `;
            subtasksList.appendChild(subtaskElement);
        }
        
        // Progress aktualisieren
        updateProgressIndicator(taskId);
        
        // Input leeren und fokussiert lassen
        input.value = '';
        input.focus();
    }
}

function addNewTaskNote(taskId) {
    const input = document.getElementById('newMessageInput');
    if (!input || !input.value.trim()) return;
    
    const noteText = input.value.trim();
    const newNote = window.TaskManager.addTaskNote(taskId, noteText);
    
    if (newNote) {
        // UI aktualisieren
        const historyChat = document.getElementById('historyChat');
        if (historyChat) {
            // Entferne "Keine Nachrichten" falls vorhanden
            const noMessages = historyChat.querySelector('.no-messages');
            if (noMessages) noMessages.remove();
            
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message';
            messageElement.setAttribute('data-note-id', newNote.id);
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-time">${formatChatTime(newNote.createdAt)}</span>
                    <div class="message-actions">
                        <button class="btn-icon micro" onclick="toggleNoteImportant('${taskId}', '${newNote.id}')" title="Als wichtig markieren">
                            ⭐
                        </button>
                        <button class="btn-icon micro" onclick="editTaskNote('${taskId}', '${newNote.id}')" title="Bearbeiten">
                            ✏️
                        </button>
                        <button class="btn-icon micro danger" onclick="deleteTaskNoteFromDialog('${taskId}', '${newNote.id}')" title="Löschen">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="message-content">${newNote.text}</div>
            `;
            
            // Am Anfang einfügen (neueste oben)
            historyChat.insertBefore(messageElement, historyChat.firstChild);
        }
        
        // Input leeren und fokussiert lassen
        input.value = '';
        input.focus();
    }
}

function toggleNoteImportant(taskId, noteId) {
    if (window.TaskManager.toggleTaskNoteImportant(taskId, noteId)) {
        // UI aktualisieren
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
}

function editTaskNote(taskId, noteId) {
    const messageEl = document.querySelector(`[data-note-id="${noteId}"]`);
    if (!messageEl) return;
    
    const task = window.TaskManager.getTaskById(taskId);
    const note = task.notes.find(n => n.id === noteId);
    if (!note) return;
    
    const contentEl = messageEl.querySelector('.message-content');
    const originalText = note.text;
    
    // Textarea erstellen
    const textarea = document.createElement('textarea');
    textarea.value = originalText;
    textarea.className = 'edit-note-textarea';
    textarea.rows = 2;
    
    // Buttons erstellen
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'edit-note-buttons';
    buttonContainer.innerHTML = `
        <button class="btn btn-sm btn-primary" onclick="saveNoteEdit('${taskId}', '${noteId}', this)">Speichern</button>
        <button class="btn btn-sm btn-secondary" onclick="cancelNoteEdit('${noteId}', '${originalText}', this)">Abbrechen</button>
    `;
    
    // Content ersetzen
    contentEl.innerHTML = '';
    contentEl.appendChild(textarea);
    contentEl.appendChild(buttonContainer);
    
    textarea.focus();
    textarea.select();
}

function saveNoteEdit(taskId, noteId, buttonEl) {
    const messageEl = document.querySelector(`[data-note-id="${noteId}"]`);
    if (!messageEl) return;
    
    const textarea = messageEl.querySelector('.edit-note-textarea');
    if (!textarea) return;
    
    const newText = textarea.value.trim();
    if (!newText) return;
    
    if (window.TaskManager.updateTaskNote(taskId, noteId, newText)) {
        const contentEl = messageEl.querySelector('.message-content');
        const task = window.TaskManager.getTaskById(taskId);
        const note = task.notes.find(n => n.id === noteId);
        
        contentEl.innerHTML = `<div class="message-content ${note.important ? 'important' : ''}">${newText}</div>`;
    }
}

function cancelNoteEdit(noteId, originalText, buttonEl) {
    const messageEl = document.querySelector(`[data-note-id="${noteId}"]`);
    if (!messageEl) return;
    
    const contentEl = messageEl.querySelector('.message-content');
    const task = window.TaskManager.getTaskById(getCurrentTaskId());
    const note = task.notes.find(n => n.id === noteId);
    
    contentEl.innerHTML = originalText;
}

function deleteTaskNoteFromDialog(taskId, noteId) {
    if (confirm('Diese Notiz löschen?')) {
        if (window.TaskManager.deleteTaskNote(taskId, noteId)) {
            const messageEl = document.querySelector(`[data-note-id="${noteId}"]`);
            if (messageEl) {
                messageEl.remove();
                
                // Prüfe ob Chat leer ist
                const historyChat = document.getElementById('historyChat');
                if (historyChat && historyChat.children.length === 0) {
                    historyChat.innerHTML = '<div class="no-messages">Noch keine Einträge vorhanden</div>';
                }
            }
        }
    }
}

function editSubtaskText(subtaskId) {
    const subtaskEl = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (!subtaskEl) return;
    
    const textEl = subtaskEl.querySelector('.subtask-text');
    const originalText = textEl.textContent;
    
    // Input erstellen
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'edit-subtask-input';
    
    // Event Handlers
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveSubtaskEdit(subtaskId, input.value);
        } else if (e.key === 'Escape') {
            cancelSubtaskEdit(subtaskId, originalText);
        }
    });
    
    input.addEventListener('blur', () => {
        saveSubtaskEdit(subtaskId, input.value);
    });
    
    // Text ersetzen
    textEl.innerHTML = '';
    textEl.appendChild(input);
    input.focus();
    input.select();
}

function saveSubtaskEdit(subtaskId, newText) {
    const subtaskEl = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (!subtaskEl) return;
    
    const textEl = subtaskEl.querySelector('.subtask-text');
    const trimmedText = newText.trim();
    
    if (trimmedText) {
        // Hier müsste die taskId ermittelt werden
        const taskId = getCurrentTaskId(); // Hilfsfunktion needed
        if (window.TaskManager.updateSubtaskText(taskId, subtaskId, trimmedText)) {
            textEl.textContent = trimmedText;
        }
    } else {
        // Wenn leer, nicht speichern
        const task = window.TaskManager.getTaskById(getCurrentTaskId());
        const subtask = task.subtasks.find(st => st.id === subtaskId);
        if (subtask) {
            textEl.textContent = subtask.text;
        }
    }
}

function cancelSubtaskEdit(subtaskId, originalText) {
    const subtaskEl = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (!subtaskEl) return;
    
    const textEl = subtaskEl.querySelector('.subtask-text');
    textEl.textContent = originalText;
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

// Hilfsfunktion um aktuelle Task-ID zu ermitteln
function getCurrentTaskId() {
    const form = document.getElementById('taskForm');
    if (form && form.dataset.taskId) {
        return form.dataset.taskId;
    }
    
    // Fallback: versuche aus URL oder anderen Quellen zu extrahieren
    return null;
}

// Globale Funktionen für HTML onclick Events
window.closePopup = closePopup;
window.toggleSubtaskInDialog = toggleSubtaskInDialog;
window.deleteSubtaskInDialog = deleteSubtaskInDialog;
window.convertNoteToTaskFromDialog = convertNoteToTaskFromDialog;
window.startFocusMode = startFocusMode;
window.addTagToInput = addTagToInput;
window.insertTag = insertTag;
window.addNewSubtask = addNewSubtask;
window.addNewTaskNote = addNewTaskNote;
window.toggleNoteImportant = toggleNoteImportant;
window.editTaskNote = editTaskNote;
window.saveNoteEdit = saveNoteEdit;
window.cancelNoteEdit = cancelNoteEdit;
window.deleteTaskNoteFromDialog = deleteTaskNoteFromDialog;
window.editSubtaskText = editSubtaskText;
window.formatChatTime = formatChatTime;

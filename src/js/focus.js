// Focus Management - Globale Funktionen für Fokus-Modus

let focusSession = null;
let focusTimer = null;
let currentTaskId = null;
let focusSettings = {
    defaultDuration: 20, // Minuten
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4
};

// Fokus-Session starten
function startFocusSession(taskId) {
    const task = window.TaskManager.getTaskById(taskId);
    if (!task) {
        alert('Aufgabe nicht gefunden!');
        return false;
    }
    
    // Prüfe ob bereits eine Session läuft
    if (focusSession && focusSession.isActive) {
        if (!confirm('Es läuft bereits eine Fokus-Session. Möchten Sie diese beenden und eine neue starten?')) {
            return false;
        }
        stopFocusSession();
    }
    
    // Neue Session erstellen
    focusSession = {
        id: window.StorageManager.generateUUID(),
        taskId: taskId,
        startTime: new Date(),
        duration: focusSettings.defaultDuration * 60 * 1000, // in Millisekunden
        remainingTime: focusSettings.defaultDuration * 60 * 1000,
        isActive: true,
        isPaused: false,
        notes: []
    };
    
    currentTaskId = taskId;
    
    // Timer starten
    startFocusTimer();
    
    // Neues Fokus-Interface öffnen
    showAdvancedFocusMode();
    
    console.log('Fokus-Session gestartet für Aufgabe:', task.title);
    return true;
}

// Fokus-Session stoppen
function stopFocusSession() {
    if (!focusSession) return false;
    
    // Timer stoppen
    if (focusTimer) {
        clearInterval(focusTimer);
        focusTimer = null;
    }
    
    // Session beenden
    if (focusSession.isActive) {
        const elapsedTime = Math.floor((new Date() - focusSession.startTime) / 1000 / 60); // in Minuten
        
        // Statistiken aktualisieren
        window.StorageManager.updateStats('focusTime', elapsedTime);
        
        // Aufgabe aktualisieren
        if (currentTaskId) {
            const task = window.TaskManager.getTaskById(currentTaskId);
            if (task) {
                const newActualTime = (task.actualTime || 0) + elapsedTime;
                window.TaskManager.updateTask(currentTaskId, { actualTime: newActualTime });
            }
        }
        
        focusSession.endTime = new Date();
        focusSession.actualDuration = elapsedTime * 60 * 1000; // in Millisekunden
        focusSession.isActive = false;
        
        console.log(`Fokus-Session beendet. Dauer: ${elapsedTime} Minuten`);
    }
    
    // Fokus-Interface schließen
    hideAdvancedFocusMode();
    
    // Session zurücksetzen
    focusSession = null;
    currentTaskId = null;
    
    // UI aktualisieren
    updateFocusUI();
    
    return true;
}

// Fokus-Session pausieren/fortsetzen
function toggleFocusSession() {
    if (!focusSession || !focusSession.isActive) return false;
    
    if (focusSession.isPaused) {
        // Fortsetzen
        focusSession.isPaused = false;
        focusSession.pauseStartTime = null;
        startFocusTimer();
        console.log('Fokus-Session fortgesetzt');
    } else {
        // Pausieren
        focusSession.isPaused = true;
        focusSession.pauseStartTime = new Date();
        if (focusTimer) {
            clearInterval(focusTimer);
            focusTimer = null;
        }
        console.log('Fokus-Session pausiert');
    }
    
    updateFocusUI();
    return true;
}

// Timer starten
function startFocusTimer() {
    if (focusTimer) {
        clearInterval(focusTimer);
    }
    
    focusTimer = setInterval(() => {
        if (!focusSession || !focusSession.isActive || focusSession.isPaused) {
            clearInterval(focusTimer);
            focusTimer = null;
            return;
        }
        
        focusSession.remainingTime -= 1000; // 1 Sekunde abziehen
        
        // Timer abgelaufen
        if (focusSession.remainingTime <= 0) {
            completeFocusSession();
        }
        
        // UI aktualisieren
        updateFocusDisplay();
    }, 1000);
}

// Fokus-Session abschließen
function completeFocusSession() {
    if (!focusSession) return;
    
    // Timer stoppen
    if (focusTimer) {
        clearInterval(focusTimer);
        focusTimer = null;
    }
    
    // Erfolgs-Benachrichtigung
    showFocusNotification('🎉 Fokus-Session abgeschlossen!', 'success');
    
    // Session-Daten speichern
    const completedSession = { ...focusSession };
    completedSession.isActive = false;
    completedSession.endTime = new Date();
    completedSession.completed = true;
    
    // Statistiken aktualisieren
    const sessionMinutes = Math.floor(focusSettings.defaultDuration);
    window.StorageManager.updateStats('focusTime', sessionMinutes);
    
    // Aufgabe aktualisieren
    if (currentTaskId) {
        const task = window.TaskManager.getTaskById(currentTaskId);
        if (task) {
            const newActualTime = (task.actualTime || 0) + sessionMinutes;
            window.TaskManager.updateTask(currentTaskId, { actualTime: newActualTime });
        }
    }
    
    // Pause-Dialog anzeigen
    showBreakDialog();
    
    // Session zurücksetzen
    focusSession = null;
    currentTaskId = null;
    
    updateFocusUI();
}

// Erweiterten Fokus-Modus anzeigen
function showAdvancedFocusMode() {
    const task = window.TaskManager.getTaskById(currentTaskId);
    if (!task) return;
    
    // Entferne existierendes Overlay falls vorhanden
    const existingOverlay = document.getElementById('advancedFocusOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Erstelle neues Overlay
    const overlay = document.createElement('div');
    overlay.id = 'advancedFocusOverlay';
    overlay.className = 'advanced-focus-overlay';
    overlay.innerHTML = createAdvancedFocusContent(task);
    
    document.body.appendChild(overlay);
    
    // Aktiviere Overlay
    setTimeout(() => overlay.classList.add('active'), 10);
    
    // Event Listeners einrichten
    setupAdvancedFocusEventListeners();
    
    // Initial update
    updateFocusDisplay();
}

// Erweiterten Fokus-Modus verstecken
function hideAdvancedFocusMode() {
    const overlay = document.getElementById('advancedFocusOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }
}

// Erweiterten Fokus-Content erstellen
function createAdvancedFocusContent(task) {
    const group = window.GroupManager.getGroupById(task.groupId);
    
    return `
        <div class="advanced-focus-container">
            <!-- Header mit Task-Info -->
            <div class="focus-header">
                <div class="focus-task-info">
                    <div class="task-title-row">
                        <h1 class="focus-task-title">${task.title}</h1>
                        <div class="task-priority-badge priority-${task.priority}">
                            ${task.priority === 'high' ? '🔴 Hoch' : task.priority === 'medium' ? '🟡 Mittel' : '🟢 Niedrig'}
                        </div>
                    </div>
                    <div class="task-meta-row">
                        <span class="task-group" style="color: ${group ? group.color : '#666'}">
                            📁 ${group ? group.name : 'Unbekannt'}
                        </span>
                        ${task.tags && task.tags.length > 0 ? `
                            <div class="task-tags-focus">
                                ${task.tags.slice(0, 3).map(tag => `<span class="tag-focus">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    ${task.description ? `
                        <div class="task-description-focus">${task.description}</div>
                    ` : ''}
                </div>
                
                <div class="focus-controls-header">
                    <button class="btn-focus-header" onclick="minimizeFocusMode()" title="Minimieren">
                        <span class="icon">−</span>
                    </button>
                    <button class="btn-focus-header danger" onclick="exitFocusMode()" title="Fokus beenden">
                        <span class="icon">×</span>
                    </button>
                </div>
            </div>

            <!-- Haupt-Content Area -->
            <div class="focus-main-content">
                <!-- Timer Sektion -->
                <div class="focus-timer-section">
                    <div class="timer-display-container">
                        <div class="timer-circle-container">
                            <svg class="timer-svg" viewBox="0 0 200 200">
                                <circle class="timer-bg" cx="100" cy="100" r="90"></circle>
                                <circle class="timer-progress" cx="100" cy="100" r="90" id="timerProgress"></circle>
                            </svg>
                            <div class="timer-display" id="timerDisplay">${formatRemainingTime(focusSession.remainingTime)}</div>
                        </div>
                    </div>
                    
                    <div class="timer-controls">
                        <button class="btn-timer large primary" id="focusToggleBtn" onclick="toggleFocusSession()">
                            <span class="icon">${focusSession.isPaused ? '▶️' : '⏸️'}</span>
                            ${focusSession.isPaused ? 'Fortsetzen' : 'Pausieren'}
                        </button>
                        <button class="btn-timer large danger" onclick="stopFocusSession()">
                            <span class="icon">⏹️</span> Stoppen
                        </button>
                    </div>
                    
                    <div class="session-stats">
                        <div class="stat-item">
                            <span class="stat-value" id="sessionCount">1</span>
                            <span class="stat-label">Session</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="todayFocusTime">0</span>
                            <span class="stat-label">Min heute</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="taskProgressValue">${task.progress || 0}%</span>
                            <span class="stat-label">Fortschritt</span>
                        </div>
                    </div>
                </div>

                <!-- Task Management Panel -->
                <div class="focus-task-panel">
                    <!-- Tabs -->
                    <div class="focus-tabs">
                        <button class="focus-tab active" data-tab="subtasks" onclick="switchFocusTab('subtasks')">
                            <span class="tab-icon">📋</span> Unteraufgaben
                        </button>
                        <button class="focus-tab" data-tab="notes" onclick="switchFocusTab('notes')">
                            <span class="tab-icon">💬</span> Notizen
                        </button>
                        <button class="focus-tab" data-tab="edit" onclick="switchFocusTab('edit')">
                            <span class="tab-icon">✏️</span> Bearbeiten
                        </button>
                    </div>
                    
                    <!-- Tab Contents -->
                    <div class="focus-tab-content active" id="focusSubtasks">
                        ${createSubtasksTabContent(task)}
                    </div>
                    
                    <div class="focus-tab-content" id="focusNotes">
                        ${createNotesTabContent(task)}
                    </div>
                    
                    <div class="focus-tab-content" id="focusEdit">
                        <div id="focusTaskEditor" class="focus-editor-container">
                            <!-- Wird vom Task Editor gefüllt -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Subtasks Tab Content
function createSubtasksTabContent(task) {
    return `
        <div class="subtasks-focus-container">
            <div class="subtasks-header">
                <div class="progress-section">
                    <div class="progress-bar-focus">
                        <div class="progress-fill-focus" style="width: ${task.progress || 0}%" id="subtasksProgress"></div>
                    </div>
                    <span class="progress-label-focus" id="subtasksProgressLabel">
                        ${task.subtasks ? task.subtasks.filter(st => st.completed).length : 0}/${task.subtasks ? task.subtasks.length : 0} erledigt
                    </span>
                </div>
            </div>
            
            <div class="subtasks-list-focus" id="subtasksListFocus">
                ${task.subtasks && task.subtasks.length > 0 ? 
                    task.subtasks.map(subtask => `
                        <div class="subtask-item-focus ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}">
                            <label class="subtask-checkbox-focus">
                                <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                       onchange="toggleSubtaskInFocus('${task.id}', '${subtask.id}')">
                                <span class="checkmark-focus"></span>
                            </label>
                            <span class="subtask-text-focus">${subtask.text}</span>
                        </div>
                    `).join('') : 
                    '<div class="no-subtasks-focus">Keine Unteraufgaben vorhanden</div>'
                }
            </div>
            
            <div class="add-subtask-focus">
                <input type="text" id="newSubtaskFocusInput" class="focus-input" 
                       placeholder="Neue Unteraufgabe hinzufügen...">
                <button class="btn-focus-add" onclick="addSubtaskInFocusMode('${task.id}')">
                    <span class="icon">+</span>
                </button>
            </div>
        </div>
    `;
}

// Notes Tab Content
function createNotesTabContent(task) {
    return `
        <div class="notes-focus-container">
            <div class="notes-list-focus" id="notesListFocus">
                ${task.notes && task.notes.length > 0 ? 
                    task.notes.map(note => `
                        <div class="note-item-focus ${note.important ? 'important' : ''}">
                            <div class="note-header-focus">
                                <span class="note-time-focus">${formatChatTime(note.createdAt)}</span>
                                ${note.important ? '<span class="important-marker-focus">⭐</span>' : ''}
                            </div>
                            <div class="note-content-focus">${note.text}</div>
                        </div>
                    `).join('') : 
                    '<div class="no-notes-focus">Noch keine Notizen vorhanden</div>'
                }
            </div>
            
            <div class="add-note-focus">
            <textarea id="newNoteFocusInput" class="focus-textarea" 
            placeholder="Notiz, Idee oder Fortschritt hinzufügen..." rows="3"></textarea>
            <div class="note-add-actions">
            <button class="btn-focus-add" onclick="addNoteInFocusMode('${task.id}')">
                    <span class="icon">💬</span> Zur Aufgabe
                    </button>
                                    <button class="btn-focus-add secondary" onclick="addGeneralNoteInFocusMode()">
                                        <span class="icon">📝</span> Allgemeine Notiz
                                    </button>
                                </div>
                            </div>
        </div>
    `;
}

// Event Listeners für erweiterten Fokus-Modus
function setupAdvancedFocusEventListeners() {
    // Enter-Key für Subtask-Input
    const subtaskInput = document.getElementById('newSubtaskFocusInput');
    if (subtaskInput) {
        subtaskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addSubtaskInFocusMode(currentTaskId);
            }
        });
    }
    
    // Ctrl+Enter für Notiz-Input
    const noteInput = document.getElementById('newNoteFocusInput');
    if (noteInput) {
        noteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                addNoteInFocusMode(currentTaskId);
            }
        });
    }
    
    // ESC-Key zum Beenden
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && focusSession && focusSession.isActive) {
            if (confirm('Fokus-Session beenden?')) {
                stopFocusSession();
            }
        }
    });
}

// Tab-Wechsel im Fokus-Modus
function switchFocusTab(tabName) {
    // Tab-Buttons aktualisieren
    document.querySelectorAll('.focus-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Content aktualisieren
    document.querySelectorAll('.focus-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(`focus${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Spezielle Behandlung für Edit-Tab
    if (tabName === 'edit') {
        const task = window.TaskManager.getTaskById(currentTaskId);
        if (task) {
            window.TaskEditorManager.showTaskEditor(task, {
                focusMode: true,
                callbacks: {
                    onSave: (savedTask) => {
                        // Refresh focus interface
                        refreshFocusInterface(savedTask);
                    }
                }
            });
        }
    }
}

// Fokus-Interface aktualisieren
function refreshFocusInterface(updatedTask) {
    // Subtasks Tab aktualisieren
    const subtasksContent = document.getElementById('focusSubtasks');
    if (subtasksContent) {
        subtasksContent.innerHTML = createSubtasksTabContent(updatedTask);
    }
    
    // Notes Tab aktualisieren
    const notesContent = document.getElementById('focusNotes');
    if (notesContent) {
        notesContent.innerHTML = createNotesTabContent(updatedTask);
    }
    
    // Task-Header aktualisieren
    const taskTitle = document.querySelector('.focus-task-title');
    if (taskTitle) {
        taskTitle.textContent = updatedTask.title;
    }
    
    // Event Listeners neu einrichten
    setupAdvancedFocusEventListeners();
}

// Subtask im Fokus-Modus hinzufügen
function addSubtaskInFocusMode(taskId) {
    const input = document.getElementById('newSubtaskFocusInput');
    if (!input || !input.value.trim()) return;
    
    const subtaskText = input.value.trim();
    const newSubtask = window.TaskManager.addSubtask(taskId, subtaskText);
    
    if (newSubtask) {
        const subtasksList = document.getElementById('subtasksListFocus');
        if (subtasksList) {
            // Entferne "keine Subtasks" Nachricht falls vorhanden
            const noSubtasks = subtasksList.querySelector('.no-subtasks-focus');
            if (noSubtasks) noSubtasks.remove();
            
            const subtaskElement = document.createElement('div');
            subtaskElement.className = 'subtask-item-focus';
            subtaskElement.setAttribute('data-subtask-id', newSubtask.id);
            subtaskElement.innerHTML = `
                <label class="subtask-checkbox-focus">
                    <input type="checkbox" onchange="toggleSubtaskInFocus('${taskId}', '${newSubtask.id}')">
                    <span class="checkmark-focus"></span>
                </label>
                <span class="subtask-text-focus">${newSubtask.text}</span>
            `;
            
            subtasksList.appendChild(subtaskElement);
        }
        
        updateFocusProgress(taskId);
        input.value = '';
        input.focus();
    }
}

// Notiz im Fokus-Modus hinzufügen
function addNoteInFocusMode(taskId) {
    const input = document.getElementById('newNoteFocusInput');
    if (!input || !input.value.trim()) return;
    
    const noteText = input.value.trim();
    const newNote = window.TaskManager.addTaskNote(taskId, noteText);
    
    if (newNote) {
        // Auch zur Fokus-Session hinzufügen
        addFocusNote(noteText);
        
        const notesList = document.getElementById('notesListFocus');
        if (notesList) {
            // Entferne "keine Notizen" Nachricht falls vorhanden
            const noNotes = notesList.querySelector('.no-notes-focus');
            if (noNotes) noNotes.remove();
            
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item-focus';
            noteElement.innerHTML = `
                <div class="note-header-focus">
                    <span class="note-time-focus">${formatChatTime(newNote.createdAt)}</span>
                </div>
                <div class="note-content-focus">${newNote.text}</div>
            `;
            
            notesList.insertBefore(noteElement, notesList.firstChild);
        }
        
        input.value = '';
        input.focus();
        
        // Erfolgsmeldung
        showFocusNotification('✅ Notiz zur Aufgabe hinzugefügt', 'success');
    }
}

// Allgemeine Notiz im Fokus-Modus hinzufügen
function addGeneralNoteInFocusMode() {
    const input = document.getElementById('newNoteFocusInput');
    if (!input || !input.value.trim()) return;
    
    const noteText = input.value.trim();
    
    // Erstelle allgemeine Notiz über NoteManager
    if (window.NoteManager && window.NoteManager.createNote) {
        const noteData = {
            title: noteText.length > 50 ? noteText.substring(0, 47) + '...' : noteText,
            content: noteText,
            tags: ['fokus-session'],
            important: false
        };
        
        const newNote = window.NoteManager.createNote(noteData);
        
        if (newNote) {
            // Auch zur Fokus-Session hinzufügen
            addFocusNote(`[Allgemeine Notiz] ${noteText}`);
            
            input.value = '';
            input.focus();
            
            // Erfolgsmeldung mit Link zum Notizen-Tab
            showFocusNotification('📝 Allgemeine Notiz erstellt! Gespeichert im Notizen-Tab.', 'success');
        }
    } else {
        console.error('NoteManager nicht verfügbar');
        showFocusNotification('⚠️ Fehler beim Erstellen der Notiz', 'warning');
    }
}

// Subtask im Fokus-Modus umschalten
function toggleSubtaskInFocus(taskId, subtaskId) {
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
        updateFocusProgress(taskId);
    }
}

// Fokus-Progress aktualisieren
function updateFocusProgress(taskId) {
    const task = window.TaskManager.getTaskById(taskId);
    if (!task) return;
    
    const progressFill = document.getElementById('subtasksProgress');
    const progressLabel = document.getElementById('subtasksProgressLabel');
    const taskProgressValue = document.getElementById('taskProgressValue');
    
    if (task.subtasks) {
        const completed = task.subtasks.filter(st => st.completed).length;
        const total = task.subtasks.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        if (progressFill) progressFill.style.width = progress + '%';
        if (progressLabel) progressLabel.textContent = `${completed}/${total} erledigt`;
        if (taskProgressValue) taskProgressValue.textContent = `${progress}%`;
    }
}

// Fokus-Display aktualisieren
function updateFocusDisplay() {
    if (!focusSession) return;
    
    const timerDisplay = document.getElementById('timerDisplay');
    const timerProgress = document.getElementById('timerProgress');
    const toggleBtn = document.getElementById('focusToggleBtn');
    
    if (timerDisplay) {
        timerDisplay.textContent = formatRemainingTime(focusSession.remainingTime);
    }
    
    if (timerProgress) {
        const totalTime = focusSettings.defaultDuration * 60 * 1000;
        const elapsed = totalTime - focusSession.remainingTime;
        const progress = (elapsed / totalTime) * 100;
        
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (progress / 100) * circumference;
        
        timerProgress.style.strokeDasharray = circumference;
        timerProgress.style.strokeDashoffset = offset;
    }
    
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('.icon');
        const text = toggleBtn.childNodes[1];
        
        if (focusSession.isPaused) {
            icon.textContent = '▶️';
            text.textContent = ' Fortsetzen';
        } else {
            icon.textContent = '⏸️';
            text.textContent = ' Pausieren';
        }
    }
    
    // Heute-Stats aktualisieren
    const todayFocusTime = document.getElementById('todayFocusTime');
    if (todayFocusTime) {
        const todayStats = window.StorageManager.getTodayStats();
        todayFocusTime.textContent = todayStats.focusTime;
    }
}

// Pause-Dialog anzeigen
function showBreakDialog() {
    const content = `
        <div class="break-dialog">
            <div class="break-icon">☕</div>
            <h3>Fokus-Session abgeschlossen!</h3>
            <p>Großartig! Sie haben ${focusSettings.defaultDuration} Minuten fokussiert gearbeitet.</p>
            <p>Möchten Sie eine kurze Pause einlegen?</p>
            
            <div class="break-actions">
                <button class="btn btn-secondary" onclick="window.PopupManager.closePopup()">
                    Weiter arbeiten
                </button>
                <button class="btn btn-primary" onclick="startBreak(${focusSettings.breakDuration})">
                    ${focusSettings.breakDuration} Min Pause
                </button>
                <button class="btn btn-warning" onclick="startBreak(${focusSettings.longBreakDuration})">
                    ${focusSettings.longBreakDuration} Min Pause
                </button>
            </div>
        </div>
    `;
    
    window.PopupManager.showPopup('Session abgeschlossen', content);
}

// Pause starten
function startBreak(minutes) {
    window.PopupManager.closePopup();
    
    showFocusNotification(`🛌 ${minutes} Minuten Pause gestartet. Erholen Sie sich!`, 'info');
    
    setTimeout(() => {
        showFocusNotification('⏰ Pause beendet! Bereit für die nächste Session?', 'success');
    }, minutes * 60 * 1000);
}

// Minimieren
function minimizeFocusMode() {
    const overlay = document.getElementById('advancedFocusOverlay');
    if (overlay) {
        overlay.style.transform = 'scale(0.1)';
        overlay.style.opacity = '0';
        
        // Kleines Floating-Widget erstellen
        createFloatingFocusWidget();
    }
}

// Floating Widget erstellen
function createFloatingFocusWidget() {
    const widget = document.createElement('div');
    widget.id = 'focusFloatingWidget';
    widget.className = 'focus-floating-widget';
    widget.innerHTML = `
        <div class="widget-timer" id="widgetTimer">${formatRemainingTime(focusSession.remainingTime)}</div>
        <div class="widget-controls">
            <button onclick="toggleFocusSession()" title="${focusSession.isPaused ? 'Fortsetzen' : 'Pausieren'}">
                ${focusSession.isPaused ? '▶️' : '⏸️'}
            </button>
            <button onclick="showAdvancedFocusMode()" title="Fokus öffnen">🎯</button>
        </div>
    `;
    
    document.body.appendChild(widget);
    
    // Widget draggable machen
    makeDraggable(widget);
}

// Draggable Funktionalität
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }
    
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Fokus-Modus beenden
function exitFocusMode() {
    if (confirm('Möchten Sie die Fokus-Session wirklich beenden?')) {
        stopFocusSession();
    }
}

// Notiz zur aktuellen Fokus-Session hinzufügen
function addFocusNote(noteText) {
    if (!focusSession || !currentTaskId) return false;
    
    const sessionNote = {
        id: window.StorageManager.generateUUID(),
        text: noteText.trim(),
        timestamp: new Date().toISOString()
    };
    
    focusSession.notes.push(sessionNote);
    
    console.log('Fokus-Notiz hinzugefügt:', noteText);
    return sessionNote;
}

// Aktuelle Session abrufen
function getCurrentFocusSession() {
    return focusSession;
}

// Verbleibende Zeit formatieren
function formatRemainingTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Zeit formatieren für Chat
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

// Fokus-Einstellungen laden
function loadFocusSettings() {
    const settings = window.StorageManager.readDataFile('settings');
    if (settings.focusTimer) {
        focusSettings.defaultDuration = settings.focusTimer;
    }
    return focusSettings;
}

// Fokus-Einstellungen speichern
function saveFocusSettings() {
    const settings = window.StorageManager.readDataFile('settings');
    settings.focusTimer = focusSettings.defaultDuration;
    window.StorageManager.writeDataFile('settings', settings);
}

// Fokus-UI aktualisieren
function updateFocusUI() {
    // Header Fokus-Button aktualisieren
    const focusBtn = document.getElementById('focusModeBtn');
    if (focusBtn) {
        if (focusSession && focusSession.isActive) {
            focusBtn.classList.add('active');
            focusBtn.innerHTML = `
                <span class="icon">⏸️</span> 
                ${focusSession.isPaused ? 'Fortsetzen' : 'Aktiv'}
            `;
        } else {
            focusBtn.classList.remove('active');
            focusBtn.innerHTML = `
                <span class="icon">🎯</span> Fokus
            `;
        }
    }
    
    // Floating Widget aktualisieren
    const widgetTimer = document.getElementById('widgetTimer');
    if (widgetTimer && focusSession) {
        widgetTimer.textContent = formatRemainingTime(focusSession.remainingTime);
    }
    
    // Dashboard Statistiken aktualisieren
    if (window.TaskManager && window.TaskManager.updateTasksUI) {
        window.TaskManager.updateTasksUI();
    }
}

// Fokus-Benachrichtigung anzeigen
function showFocusNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `focus-notification focus-notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentNode.parentNode.remove()">×</button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#2196f3'};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        z-index: 10001;
        min-width: 300px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
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
    }, 5000);
}

// Exportiere globale Funktionen
window.FocusManager = {
    startFocusSession,
    stopFocusSession,
    toggleFocusSession,
    completeFocusSession,
    addFocusNote,
    getCurrentFocusSession,
    formatRemainingTime,
    loadFocusSettings,
    saveFocusSettings,
    updateFocusUI,
    showAdvancedFocusMode,
    hideAdvancedFocusMode
};

// Globale Funktionen für HTML onclick Events
window.startBreak = startBreak;
window.switchFocusTab = switchFocusTab;
window.addSubtaskInFocusMode = addSubtaskInFocusMode;
window.addNoteInFocusMode = addNoteInFocusMode;
window.addGeneralNoteInFocusMode = addGeneralNoteInFocusMode;
window.toggleSubtaskInFocus = toggleSubtaskInFocus;
window.minimizeFocusMode = minimizeFocusMode;
window.exitFocusMode = exitFocusMode;
window.formatChatTime = formatChatTime;

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
    
    // Fokus-Fenster öffnen
    openFocusWindow();
    
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
        updateFocusUI();
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

// Pause-Dialog anzeigen
function showBreakDialog() {
    const content = `
        <div class="break-dialog">
            <div class="break-icon">☕</div>
            <h3>Fokus-Session abgeschlossen!</h3>
            <p>Großartig! Sie haben ${focusSettings.defaultDuration} Minuten fokussiert gearbeitet.</p>
            <p>Möchten Sie eine kurze Pause einlegen?</p>
            
            <div class="break-actions">
                <button class="btn btn-secondary" onclick="closePopup()">
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
    
    // Einfache Pause-Benachrichtigung
    showFocusNotification(`🛌 ${minutes} Minuten Pause gestartet. Erholen Sie sich!`, 'info');
    
    // Nach der Pause-Zeit eine Benachrichtigung anzeigen
    setTimeout(() => {
        showFocusNotification('⏰ Pause beendet! Bereit für die nächste Session?', 'success');
    }, minutes * 60 * 1000);
}

// Fokus-Overlay öffnen (statt separates Fenster)
function openFocusWindow() {
    showFocusOverlay();
}

// Fokus-Overlay schließen
function closeFocusWindow() {
    hideFocusOverlay();
}

// Notiz zur aktuellen Fokus-Session hinzufügen
function addFocusNote(noteText) {
    if (!focusSession || !currentTaskId) return false;
    
    // Notiz zur Session hinzufügen
    const sessionNote = {
        id: window.StorageManager.generateUUID(),
        text: noteText.trim(),
        timestamp: new Date().toISOString()
    };
    
    focusSession.notes.push(sessionNote);
    
    // Notiz auch zur Aufgabe hinzufügen
    window.TaskManager.addTaskNote(currentTaskId, noteText);
    
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
    
    // Fokus-Fenster UI aktualisieren (falls geöffnet)
    updateFocusWindowUI();
    
    // Dashboard Statistiken aktualisieren
    if (window.TaskManager && window.TaskManager.updateTasksUI) {
        window.TaskManager.updateTasksUI();
    }
}

// Fokus-Overlay UI aktualisieren
function updateFocusWindowUI() {
    updateFocusOverlayDisplay();
}

// Fokus-Overlay anzeigen
function showFocusOverlay() {
    const task = window.TaskManager.getTaskById(currentTaskId);
    if (!task) return;
    
    // Erstelle Overlay falls nicht vorhanden
    let overlay = document.getElementById('focusOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'focusOverlay';
        overlay.className = 'focus-overlay';
        document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
        <div class="focus-container">
            <div class="focus-header">
                <div class="focus-task-info">
                    <h2 class="focus-task-title">${task.title}</h2>
                    <p class="focus-task-description">${task.description || 'Keine Beschreibung'}</p>
                </div>
                <button class="focus-close" onclick="closeFocusWindow()">
                    <span class="icon">×</span>
                </button>
            </div>
            
            <div class="focus-main">
                <div class="focus-timer-section">
                    <div class="focus-timer-display">
                        <div class="timer-circle">
                            <svg class="timer-svg" viewBox="0 0 100 100">
                                <circle class="timer-bg" cx="50" cy="50" r="45"></circle>
                                <circle class="timer-progress" cx="50" cy="50" r="45" id="timerProgress"></circle>
                            </svg>
                            <div class="timer-text" id="timerText">${formatRemainingTime(focusSession.remainingTime)}</div>
                        </div>
                    </div>
                    
                    <div class="focus-controls">
                        <button class="btn btn-focus large" id="focusToggleBtn" onclick="toggleFocusSession()">
                            <span class="icon">${focusSession.isPaused ? '▶️' : '⏸️'}</span>
                            ${focusSession.isPaused ? 'Fortsetzen' : 'Pausieren'}
                        </button>
                        <button class="btn btn-danger large" onclick="stopFocusSession()">
                            <span class="icon">⏹️</span> Stoppen
                        </button>
                    </div>
                </div>
                
                <div class="focus-task-section">
                    <div class="focus-tabs">
                        <button class="focus-tab active" data-tab="subtasks" onclick="switchFocusTab('subtasks')">
                            📋 Unteraufgaben
                        </button>
                        <button class="focus-tab" data-tab="notes" onclick="switchFocusTab('notes')">
                            💬 Notizen
                        </button>
                        <button class="focus-tab" data-tab="info" onclick="switchFocusTab('info')">
                            ℹ️ Details
                        </button>
                    </div>
                    
                    <div class="focus-content">
                        <!-- Subtasks Tab -->
                        <div class="focus-tab-content active" id="focusSubtasks">
                            <div class="subtask-progress">
                                <div class="progress-bar focus">
                                    <div class="progress-fill" style="width: ${task.progress || 0}%"></div>
                                </div>
                                <span class="progress-label">${task.subtasks ? task.subtasks.filter(st => st.completed).length : 0}/${task.subtasks ? task.subtasks.length : 0} erledigt</span>
                            </div>
                            
                            <div class="subtask-list focus" id="focusSubtaskList">
                                ${task.subtasks ? task.subtasks.map(subtask => `
                                    <div class="subtask-item focus ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}">
                                        <label class="subtask-checkbox focus">
                                            <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                                   onchange="toggleSubtaskInFocus('${task.id}', '${subtask.id}')">
                                            <span class="checkmark focus"></span>
                                        </label>
                                        <span class="subtask-text focus">${subtask.text}</span>
                                    </div>
                                `).join('') : '<div class="no-subtasks">Keine Unteraufgaben vorhanden</div>'}
                            </div>
                            
                            <div class="add-subtask focus">
                                <input type="text" id="focusNewSubtask" class="focus-input" 
                                       placeholder="Neue Unteraufgabe hinzufügen...">
                                <button class="btn btn-primary" onclick="addSubtaskInFocus('${task.id}')">
                                    <span class="icon">+</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Notes Tab -->
                        <div class="focus-tab-content" id="focusNotes">
                            <div class="focus-notes-list" id="focusNotesList">
                                ${task.notes ? task.notes.map(note => `
                                    <div class="focus-note ${note.important ? 'important' : ''}">
                                        <div class="note-time">${formatChatTime(note.createdAt)}</div>
                                        <div class="note-content">${note.text}</div>
                                    </div>
                                `).join('') : '<div class="no-notes">Noch keine Notizen vorhanden</div>'}
                            </div>
                            
                            <div class="add-note focus">
                                <textarea id="focusNewNote" class="focus-textarea" 
                                          placeholder="Notiz, Idee oder Fortschritt hinzufügen..." rows="3"></textarea>
                                <button class="btn btn-primary" onclick="addNoteInFocus('${task.id}')">
                                    <span class="icon">💬</span> Hinzufügen
                                </button>
                            </div>
                        </div>
                        
                        <!-- Info Tab -->
                        <div class="focus-tab-content" id="focusInfo">
                            <div class="task-details focus">
                                <div class="detail-row">
                                    <span class="detail-label">Priorität:</span>
                                    <span class="detail-value priority-${task.priority}">
                                        ${task.priority === 'high' ? '🔴 Hoch' : task.priority === 'medium' ? '🟡 Mittel' : '🟢 Niedrig'}
                                    </span>
                                </div>
                                
                                ${task.tags && task.tags.length > 0 ? `
                                    <div class="detail-row">
                                        <span class="detail-label">Tags:</span>
                                        <div class="task-tags focus">
                                            ${task.tags.map(tag => `<span class="tag focus">${tag}</span>`).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <div class="detail-row">
                                    <span class="detail-label">Erstellt:</span>
                                    <span class="detail-value">${window.StorageManager.formatDate(task.createdAt)}</span>
                                </div>
                                
                                ${task.estimatedTime ? `
                                    <div class="detail-row">
                                        <span class="detail-label">Geschätzte Zeit:</span>
                                        <span class="detail-value">${task.estimatedTime} Minuten</span>
                                    </div>
                                ` : ''}
                                
                                ${task.actualTime ? `
                                    <div class="detail-row">
                                        <span class="detail-label">Tatsächliche Zeit:</span>
                                        <span class="detail-value">${task.actualTime} Minuten</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    overlay.classList.add('active');
    
    // Event Listeners für Enter-Keys
    setupFocusEventListeners();
    
    // Timer aktualisieren
    updateFocusTimer();
}

// Fokus-Overlay verstecken
function hideFocusOverlay() {
    const overlay = document.getElementById('focusOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }
}

// Fokus-Tab wechseln
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
    document.getElementById(`focus${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
}

// Fokus-Overlay Display aktualisieren
function updateFocusOverlayDisplay() {
    if (!focusSession || !document.getElementById('focusOverlay')) return;
    
    updateFocusTimer();
    updateFocusControls();
}

// Fokus-Timer visuell aktualisieren
function updateFocusTimer() {
    const timerText = document.getElementById('timerText');
    const timerProgress = document.getElementById('timerProgress');
    
    if (timerText && focusSession) {
        timerText.textContent = formatRemainingTime(focusSession.remainingTime);
    }
    
    if (timerProgress && focusSession) {
        const totalTime = focusSettings.defaultDuration * 60 * 1000;
        const elapsed = totalTime - focusSession.remainingTime;
        const progress = (elapsed / totalTime) * 100;
        
        // SVG Kreis-Progress (Umfang = 2 * π * r = 2 * π * 45 ≈ 283)
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (progress / 100) * circumference;
        
        timerProgress.style.strokeDasharray = circumference;
        timerProgress.style.strokeDashoffset = offset;
    }
}

// Fokus-Controls aktualisieren
function updateFocusControls() {
    const toggleBtn = document.getElementById('focusToggleBtn');
    if (toggleBtn && focusSession) {
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
}

// Event Listeners für Fokus-Overlay
function setupFocusEventListeners() {
    const subtaskInput = document.getElementById('focusNewSubtask');
    if (subtaskInput) {
        subtaskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addSubtaskInFocus(currentTaskId);
            }
        });
    }
    
    const noteInput = document.getElementById('focusNewNote');
    if (noteInput) {
        noteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                addNoteInFocus(currentTaskId);
            }
        });
    }
}

// Subtask im Fokus-Modus hinzufügen
function addSubtaskInFocus(taskId) {
    const input = document.getElementById('focusNewSubtask');
    if (!input || !input.value.trim()) return;
    
    const subtaskText = input.value.trim();
    const newSubtask = window.TaskManager.addSubtask(taskId, subtaskText);
    
    if (newSubtask) {
        // UI aktualisieren
        const subtaskList = document.getElementById('focusSubtaskList');
        if (subtaskList) {
            // Entferne "keine Subtasks" Nachricht falls vorhanden
            const noSubtasks = subtaskList.querySelector('.no-subtasks');
            if (noSubtasks) noSubtasks.remove();
            
            // Neues Subtask hinzufügen
            const subtaskElement = document.createElement('div');
            subtaskElement.className = 'subtask-item focus';
            subtaskElement.setAttribute('data-subtask-id', newSubtask.id);
            subtaskElement.innerHTML = `
                <label class="subtask-checkbox focus">
                    <input type="checkbox" onchange="toggleSubtaskInFocus('${taskId}', '${newSubtask.id}')">
                    <span class="checkmark focus"></span>
                </label>
                <span class="subtask-text focus">${newSubtask.text}</span>
            `;
            
            subtaskList.appendChild(subtaskElement);
        }
        
        // Progress aktualisieren
        updateFocusProgress(taskId);
        
        // Input leeren und fokussiert lassen
        input.value = '';
        input.focus();
    }
}

// Notiz im Fokus-Modus hinzufügen
function addNoteInFocus(taskId) {
    const input = document.getElementById('focusNewNote');
    if (!input || !input.value.trim()) return;
    
    const noteText = input.value.trim();
    const newNote = window.TaskManager.addTaskNote(taskId, noteText);
    
    if (newNote) {
        // UI aktualisieren
        const notesList = document.getElementById('focusNotesList');
        if (notesList) {
            // Entferne "keine Notizen" Nachricht falls vorhanden
            const noNotes = notesList.querySelector('.no-notes');
            if (noNotes) noNotes.remove();
            
            // Neue Notiz hinzufügen (oben)
            const noteElement = document.createElement('div');
            noteElement.className = 'focus-note';
            noteElement.innerHTML = `
                <div class="note-time">${formatChatTime(newNote.createdAt)}</div>
                <div class="note-content">${newNote.text}</div>
            `;
            
            notesList.insertBefore(noteElement, notesList.firstChild);
        }
        
        // Input leeren und fokussiert lassen
        input.value = '';
        input.focus();
    }
}

// Subtask im Fokus-Modus umschalten
function toggleSubtaskInFocus(taskId, subtaskId) {
    if (window.TaskManager.toggleSubtask(taskId, subtaskId)) {
        // UI aktualisieren
        const subtaskItem = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
        if (subtaskItem) {
            const checkbox = subtaskItem.querySelector('input[type="checkbox"]');
            if (checkbox.checked) {
                subtaskItem.classList.add('completed');
            } else {
                subtaskItem.classList.remove('completed');
            }
        }
        
        // Progress aktualisieren
        updateFocusProgress(taskId);
    }
}

// Fokus-Progress aktualisieren
function updateFocusProgress(taskId) {
    const task = window.TaskManager.getTaskById(taskId);
    if (!task) return;
    
    const progressFill = document.querySelector('.progress-fill');
    const progressLabel = document.querySelector('.progress-label');
    
    if (progressFill && progressLabel && task.subtasks) {
        const completed = task.subtasks.filter(st => st.completed).length;
        const total = task.subtasks.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        progressFill.style.width = progress + '%';
        progressLabel.textContent = `${completed}/${total} erledigt`;
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
        background: ${type === 'success' ? 'var(--accent-success)' : type === 'warning' ? 'var(--accent-warning)' : 'var(--accent-primary)'};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: var(--shadow-heavy);
        z-index: 10000;
        min-width: 300px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Nach 5 Sekunden automatisch entfernen
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
    openFocusWindow,
    closeFocusWindow,
    showFocusOverlay,
    hideFocusOverlay
};

// Globale Funktionen für HTML onclick Events
window.startBreak = startBreak;
window.switchFocusTab = switchFocusTab;
window.addSubtaskInFocus = addSubtaskInFocus;
window.addNoteInFocus = addNoteInFocus;
window.toggleSubtaskInFocus = toggleSubtaskInFocus;

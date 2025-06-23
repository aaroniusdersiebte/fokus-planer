// Notes Management - Globale Funktionen für Notizen-Verwaltung

let notes = [];

// Notizen laden
function loadNotes() {
    notes = window.StorageManager.readDataFile('notes');
    updateNotesUI();
    return notes;
}

// Notizen speichern
function saveNotes() {
    return window.StorageManager.writeDataFile('notes', notes);
}

// Neue Notiz erstellen
function createNote(noteData) {
    const newNote = {
        id: window.StorageManager.generateUUID(),
        title: noteData.title ? noteData.title.trim() : generateNoteTitle(noteData.content),
        content: noteData.content.trim(),
        tags: noteData.tags || [],
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    notes.unshift(newNote); // Neue Notizen oben einfügen
    saveNotes();
    updateNotesUI();
    
    // Statistiken aktualisieren
    window.StorageManager.updateStats('createdNote');
    
    return newNote;
}

// Notiz bearbeiten
function updateNote(noteId, updates) {
    const noteIndex = notes.findIndex(n => n.id === noteId);
    if (noteIndex !== -1) {
        notes[noteIndex] = { 
            ...notes[noteIndex], 
            ...updates, 
            updatedAt: new Date().toISOString() 
        };
        
        // Titel automatisch generieren wenn leer
        if (!notes[noteIndex].title || notes[noteIndex].title.trim() === '') {
            notes[noteIndex].title = generateNoteTitle(notes[noteIndex].content);
        }
        
        saveNotes();
        updateNotesUI();
        return notes[noteIndex];
    }
    return null;
}

// Notiz löschen
function deleteNote(noteId) {
    if (!confirm('Sind Sie sicher, dass Sie diese Notiz löschen möchten?')) {
        return false;
    }
    
    notes = notes.filter(n => n.id !== noteId);
    saveNotes();
    updateNotesUI();
    return true;
}

// Notiz archivieren
function archiveNote(noteId) {
    const noteIndex = notes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) return false;
    
    const note = notes[noteIndex];
    const archive = window.StorageManager.readDataFile('archive');
    
    // Zur Archiv hinzufügen
    archive.notes.push({
        ...note,
        archivedAt: new Date().toISOString()
    });
    
    // Aus aktiven Notizen entfernen
    notes.splice(noteIndex, 1);
    
    // Speichern
    saveNotes();
    window.StorageManager.writeDataFile('archive', archive);
    updateNotesUI();
    
    return true;
}

// Notiz aus Archiv wiederherstellen
function restoreNote(noteId) {
    const archive = window.StorageManager.readDataFile('archive');
    const noteIndex = archive.notes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) return false;
    
    const note = archive.notes[noteIndex];
    
    // Archiv-spezifische Felder entfernen
    delete note.archivedAt;
    note.updatedAt = new Date().toISOString();
    
    // Zu aktiven Notizen hinzufügen
    notes.unshift(note);
    
    // Aus Archiv entfernen
    archive.notes.splice(noteIndex, 1);
    
    // Speichern
    saveNotes();
    window.StorageManager.writeDataFile('archive', archive);
    updateNotesUI();
    
    return true;
}

// Notiz anheften/lösen
function togglePinNote(noteId) {
    const note = getNoteById(noteId);
    if (!note) return false;
    
    updateNote(noteId, { pinned: !note.pinned });
    
    // Notizen neu sortieren (angepinnte oben)
    sortNotes();
    
    return true;
}

// Notizen sortieren
function sortNotes() {
    notes.sort((a, b) => {
        // Erst nach pinned, dann nach updatedAt
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    saveNotes();
    updateNotesUI();
}

// Notiz in Aufgabe umwandeln
function convertNoteToTask(noteId, groupId = 'default') {
    const note = getNoteById(noteId);
    if (!note) return false;
    
    const taskData = {
        title: note.title,
        description: note.content,
        groupId: groupId,
        tags: note.tags,
        priority: 'medium'
    };
    
    // Aufgabe erstellen
    const newTask = window.TaskManager.createTask(taskData);
    
    if (newTask) {
        // Notiz archivieren
        archiveNote(noteId);
        
        // Success-Nachricht
        showNotification('Notiz wurde erfolgreich in eine Aufgabe umgewandelt!', 'success');
        
        return newTask;
    }
    
    return false;
}

// Notiz nach ID finden
function getNoteById(noteId) {
    return notes.find(n => n.id === noteId);
}

// Notizen filtern
function filterNotes(searchTerm = '') {
    if (!searchTerm) return notes;
    
    const term = searchTerm.toLowerCase();
    return notes.filter(note => 
        note.title.toLowerCase().includes(term) ||
        note.content.toLowerCase().includes(term) ||
        note.tags.some(tag => tag.toLowerCase().includes(term))
    );
}

// Titel aus Inhalt generieren
function generateNoteTitle(content) {
    if (!content || content.trim() === '') return 'Neue Notiz';
    
    // Erste 30 Zeichen als Titel verwenden
    const title = content.trim().split('\n')[0].substring(0, 30);
    return title.length < content.length ? title + '...' : title;
}

// Notizen UI aktualisieren
function updateNotesUI() {
    updateNotesContainer();
}

// Notizen-Container aktualisieren
function updateNotesContainer() {
    const container = document.getElementById('notesContainer');
    if (!container) return;
    
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value : '';
    
    const filteredNotes = filterNotes(searchTerm);
    
    container.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>Keine Notizen gefunden</h3>
                <p>Erstellen Sie Ihre erste Notiz oder passen Sie den Suchfilter an.</p>
                <button class="btn btn-primary" onclick="showNewNoteDialog()">
                    <span class="icon">+</span> Neue Notiz
                </button>
            </div>
        `;
        return;
    }
    
    filteredNotes.forEach(note => {
        const noteCard = createNoteCard(note);
        container.appendChild(noteCard);
    });
}

// Notiz-Karte erstellen
function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.setAttribute('data-note-id', note.id);
    
    if (note.pinned) {
        card.classList.add('pinned');
    }
    
    card.innerHTML = `
        <div class="card-header">
            ${note.pinned ? '<div class="pin-indicator" title="Angepinnt">📌</div>' : ''}
            <div class="card-actions">
                <button class="card-action" onclick="togglePinNote('${note.id}')" title="${note.pinned ? 'Lösen' : 'Anheften'}">
                    ${note.pinned ? '📌' : '📍'}
                </button>
                <button class="card-action" onclick="editNote('${note.id}')" title="Bearbeiten">
                    ✏️
                </button>
                <button class="card-action" onclick="showConvertNoteDialog('${note.id}')" title="In Aufgabe umwandeln">
                    ✓
                </button>
                <button class="card-action" onclick="archiveNote('${note.id}')" title="Archivieren">
                    📦
                </button>
                <button class="card-action" onclick="deleteNote('${note.id}')" title="Löschen">
                    🗑️
                </button>
            </div>
        </div>
        
        <h3 class="card-title">${note.title}</h3>
        
        <div class="card-content">${formatNoteContent(note.content)}</div>
        
        ${note.tags.length > 0 ? `
            <div class="card-tags">
                ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        ` : ''}
        
        <div class="card-meta">
            <div class="card-date">
                Erstellt: ${window.StorageManager.formatDate(note.createdAt)}
            </div>
            ${note.updatedAt !== note.createdAt ? `
                <div class="card-date">
                    Bearbeitet: ${window.StorageManager.formatDate(note.updatedAt)}
                </div>
            ` : ''}
        </div>
    `;
    
    // Click Handler für das Öffnen des Editors
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.card-action')) {
            editNote(note.id);
        }
    });
    
    return card;
}

// Notiz-Inhalt formatieren (einfache Markdown-ähnliche Formatierung)
function formatNoteContent(content) {
    if (!content) return '';
    
    // Maximale Anzahl von Zeichen für die Vorschau
    const maxLength = 200;
    let preview = content;
    
    if (content.length > maxLength) {
        preview = content.substring(0, maxLength) + '...';
    }
    
    // Einfache Formatierung
    preview = preview
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return preview;
}

// Notiz bearbeiten
function editNote(noteId) {
    const note = getNoteById(noteId);
    if (!note) return;
    
    showNoteEditDialog(note);
}

// Neue Notiz Dialog
function showNewNoteDialog() {
    window.PopupManager.showNoteDialog();
}

// Notiz bearbeiten Dialog
function showNoteEditDialog(note) {
    window.PopupManager.showNoteDialog(note);
}

// Notiz in Aufgabe umwandeln Dialog
function showConvertNoteDialog(noteId) {
    const note = getNoteById(noteId);
    if (!note) return;
    
    const groups = window.GroupManager.getAllGroups();
    
    const content = `
        <div class="convert-note-preview">
            <h4>Notiz:</h4>
            <div class="note-preview">
                <strong>${note.title}</strong>
                <p>${note.content}</p>
            </div>
        </div>
        
        <form id="convertNoteForm" class="convert-form">
            <div class="form-group">
                <label class="form-label" for="convertGroup">Gruppe auswählen</label>
                <select id="convertGroup" class="form-select" required>
                    ${groups.map(group => 
                        `<option value="${group.id}">${group.name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closePopup()">Abbrechen</button>
                <button type="submit" class="btn btn-primary">In Aufgabe umwandeln</button>
            </div>
        </form>
    `;
    
    window.PopupManager.showPopup('Notiz in Aufgabe umwandeln', content);
    
    // Event Listener
    document.getElementById('convertNoteForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const groupId = document.getElementById('convertGroup').value;
        const success = convertNoteToTask(noteId, groupId);
        
        if (success) {
            window.PopupManager.closePopup();
        }
    });
}

// Notification anzeigen
function showNotification(message, type = 'info') {
    // Einfache Notification - kann später erweitert werden
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-success);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Nach 3 Sekunden entfernen
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Exportiere globale Funktionen
window.NoteManager = {
    loadNotes,
    saveNotes,
    createNote,
    updateNote,
    deleteNote,
    archiveNote,
    restoreNote,
    togglePinNote,
    sortNotes,
    convertNoteToTask,
    getNoteById,
    filterNotes,
    updateNotesUI,
    editNote,
    showNewNoteDialog,
    showNoteEditDialog,
    showConvertNoteDialog
};

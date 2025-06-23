const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let focusWindow;

// Hauptfenster erstellen
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false
        },
        icon: path.join(__dirname, 'src/assets/icon.png'),
        titleBarStyle: 'default',
        frame: true,
        show: false
    });

    mainWindow.loadFile('src/index.html');

    // Entwicklungstools (kann später entfernt werden)
    // mainWindow.webContents.openDevTools();

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Fokus-Fenster erstellen
function createFocusWindow() {
    if (focusWindow) {
        focusWindow.focus();
        return;
    }

    focusWindow = new BrowserWindow({
        width: 900,
        height: 700,
        parent: mainWindow,
        modal: false,
        resizable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        titleBarStyle: 'default',
        frame: true,
        show: false
    });

    focusWindow.loadFile('src/focus.html');

    focusWindow.once('ready-to-show', () => {
        focusWindow.show();
    });

    focusWindow.on('closed', () => {
        focusWindow = null;
    });
}

// App Event Handler
app.whenReady().then(() => {
    createMainWindow();
    
    // Globale Shortcuts registrieren
    globalShortcut.register('CommandOrControl+N', () => {
        if (mainWindow) {
            mainWindow.webContents.send('shortcut-new-note');
        }
    });

    globalShortcut.register('CommandOrControl+T', () => {
        if (mainWindow) {
            mainWindow.webContents.send('shortcut-new-task');
        }
    });

    globalShortcut.register('CommandOrControl+F', () => {
        if (mainWindow) {
            mainWindow.webContents.send('shortcut-focus-mode');
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

// IPC Handler
ipcMain.handle('open-focus-window', () => {
    createFocusWindow();
});

ipcMain.handle('close-focus-window', () => {
    if (focusWindow) {
        focusWindow.close();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// const isDev = require('electron-is-dev');
const isDev = false;
const path = require('path');
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, 'assets/icon.png'),
  });

  const startUrl = isDev
    ? 'http://localhost:4200'
    : `file://${path.join(__dirname, 'dist/review-teachercorner/index.html')}`;

    win.loadURL(startUrl).then(() => {
  win.webContents.openDevTools();
});

  win.loadURL(startUrl).catch((err) => {
    console.error('Failed to load:', startUrl, err);
  });

  if (isDev) win.webContents.openDevTools();
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

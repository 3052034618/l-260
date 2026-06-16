const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    title: '企业资产折旧测算工具',
    icon: path.join(__dirname, '../public/icon.png')
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle('save-file', async (event, { content, filename, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存文件',
    defaultPath: filename,
    filters
  })

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content)
    return { success: true, path: result.filePath }
  }
  return { success: false }
})

ipcMain.handle('save-json', async (event, { data, filename }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存参数',
    defaultPath: filename,
    filters: [{ name: 'JSON 文件', extensions: ['json'] }]
  })

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2))
    return { success: true, path: result.filePath }
  }
  return { success: false }
})

ipcMain.handle('load-json', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '加载参数',
    filters: [{ name: 'JSON 文件', extensions: ['json'] }],
    properties: ['openFile']
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8')
    return { success: true, data: JSON.parse(content) }
  }
  return { success: false }
})

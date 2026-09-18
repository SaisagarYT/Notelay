const { app, BrowserWindow, ipcMain, shell, Menu, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'notelay-pdf',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

// Set application identity and isolated user data directory to prevent collision with generic Electron cache
app.setName('Notelay');
const notelayUserData = path.join(app.getPath('appData'), 'Notelay');
try {
  fs.mkdirSync(notelayUserData, { recursive: true });
} catch {}
app.setPath('userData', notelayUserData);

// Disable Chromium GPU and shader disk cache to eliminate Windows MoveFileEx "Access is denied (0x5)" locks
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-program-cache');
app.commandLine.appendSwitch('no-sandbox');

// Ensure single instance without crashing or locking
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Notelay] Another instance is already running. Focusing active window...');
  app.quit();
  process.exit(0);
}

let mainWindow = null;

// Suppress default menu
Menu.setApplicationMenu(null);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 840,
    minWidth: 980,
    minHeight: 620,
    frame: false, // Frameless for custom Antigravity title bar
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      plugins: true,
    },
    show: false,
  });

  const isDev = process.env.ELECTRON_DEV === 'true' || process.env.NODE_ENV === 'development';

  if (isDev) {
    const devPort = process.env.VITE_PORT || 5180;
    mainWindow.loadURL(`http://localhost:${devPort}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Window state notification
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', { isMaximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', { isMaximized: false });
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Window control IPC
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  }
  return false;
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('select-directory', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  const folderPath = result.filePaths[0];
  const folderName = path.basename(folderPath);
  return { path: folderPath, name: folderName };
});

async function extractFileText(filePath) {
  const name = path.basename(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  let content = '';
  let size = 0;

  try {
    const stats = fs.statSync(filePath);
    size = stats.size;

    if (ext === 'pdf') {
      try {
        const { PDFParse } = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: dataBuffer });
        const textResult = await parser.getText();
        const extracted = typeof textResult === 'string' ? textResult : (textResult?.text || '');
        content = extracted.trim();
        if (!content) {
          content = `[PDF document: ${name} (${(size / 1024).toFixed(1)} KB) - No extractable text found, file may contain scanned image pages.]`;
        }
      } catch (pdfErr) {
        console.error(`PDF parsing failed for ${name}:`, pdfErr);
        content = `[PDF parse error for ${name}: ${pdfErr.message}]`;
      }
    } else if (ext === 'docx') {
      try {
        const mammoth = require('mammoth');
        const docxResult = await mammoth.extractRawText({ path: filePath });
        content = (docxResult.value || '').trim();
      } catch (docxErr) {
        console.error(`DOCX parsing failed for ${name}:`, docxErr);
        content = `[Word document parse error for ${name}: ${docxErr.message}]`;
      }
    } else if (['txt', 'md', 'json', 'csv', 'js', 'ts', 'py', 'html', 'css', 'c', 'cpp', 'h', 'java', 'go', 'rs', 'sql', 'sh', 'xml', 'yaml', 'yml'].includes(ext)) {
      content = fs.readFileSync(filePath, 'utf-8');
    } else {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (/^[\x09\x0A\x0D\x20-\x7E\x80-\xFF]*$/.test(raw.slice(0, 500))) {
          content = raw;
        } else {
          content = `[Binary file: ${name} (${(size / 1024).toFixed(1)} KB)]`;
        }
      } catch {
        content = `[Binary file: ${name} (${(size / 1024).toFixed(1)} KB)]`;
      }
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }

  return { path: filePath, name, ext, size, content };
}

ipcMain.handle('select-files', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Notes, Documents or Files into Notelay',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Supported Documents & Notes', extensions: ['pdf', 'txt', 'md', 'docx', 'doc', 'json', 'csv', 'py', 'ts', 'js', 'html', 'css'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths) return [];
  const parsedFiles = [];
  for (const filePath of result.filePaths) {
    const fileData = await extractFileText(filePath);
    parsedFiles.push(fileData);
  }
  return parsedFiles;
});

ipcMain.handle('parse-files-from-paths', async (event, filePaths = []) => {
  const parsedFiles = [];
  if (Array.isArray(filePaths)) {
    for (const filePath of filePaths) {
      if (typeof filePath === 'string' && fs.existsSync(filePath)) {
        const fileData = await extractFileText(filePath);
        parsedFiles.push(fileData);
      }
    }
  }
  return parsedFiles;
});

ipcMain.handle('read-source-file-binary', async (event, { projectId, sourceName, filePath } = {}) => {
  try {
    let targetPath = null;

    // 1. Check direct filePath if provided
    if (filePath && typeof filePath === 'string' && fs.existsSync(filePath)) {
      targetPath = filePath;
    }

    // 2. Check project sources directory in Notelay Projects folder
    if (!targetPath && projectId && sourceName) {
      const storagePath = getDefaultStoragePath();
      const safeName = sourceName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const candidate1 = path.join(storagePath, projectId, 'sources', sourceName);
      const candidate2 = path.join(storagePath, projectId, 'sources', safeName);
      if (fs.existsSync(candidate1)) {
        targetPath = candidate1;
      } else if (fs.existsSync(candidate2)) {
        targetPath = candidate2;
      }
    }

    // 3. Fallback search: scan across any project folders in default storage for this source
    if (!targetPath && sourceName) {
      try {
        const storagePath = getDefaultStoragePath();
        const safeName = sourceName.replace(/[^a-zA-Z0-9._-]/g, '_');
        if (fs.existsSync(storagePath)) {
          const subdirs = fs.readdirSync(storagePath);
          for (const dir of subdirs) {
            const p1 = path.join(storagePath, dir, 'sources', sourceName);
            const p2 = path.join(storagePath, dir, 'sources', safeName);
            if (fs.existsSync(p1)) {
              targetPath = p1;
              break;
            } else if (fs.existsSync(p2)) {
              targetPath = p2;
              break;
            }
          }
        }
      } catch (scanErr) {
        console.warn('Fallback search in projects storage failed:', scanErr);
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return { success: false, error: 'File not found on disk' };
    }

    const buffer = fs.readFileSync(targetPath);
    const ext = path.extname(targetPath).slice(1).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === 'pdf') mimeType = 'application/pdf';
    else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) mimeType = `image/${ext === 'svg' ? 'svg+xml' : ext}`;
    else if (['txt', 'md', 'json', 'js', 'ts', 'py'].includes(ext)) mimeType = 'text/plain';

    return {
      success: true,
      uint8Array: new Uint8Array(buffer),
      base64: buffer.toString('base64'),
      mimeType,
      size: buffer.length,
      path: targetPath,
      name: path.basename(targetPath)
    };
  } catch (err) {
    console.error('Failed to read source file binary:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-file-in-os', async (event, filePath) => {
  try {
    if (filePath && typeof filePath === 'string' && fs.existsSync(filePath)) {
      const result = await shell.openPath(filePath);
      return { success: !result, error: result || null };
    }
    return { success: false, error: 'File does not exist' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('export-document-pdf', async (event, payload = {}) => {
  const { dialog, BrowserWindow } = require('electron');
  const fs = require('fs');
  let printWindow = null;

  try {
    const { htmlContent, defaultPath = 'Notelay-Master-Notes.pdf', pageSize = 'A4' } = payload;
    if (!htmlContent) {
      return { success: false, error: 'No HTML content provided for export' };
    }

    const saveResult = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Master Notes Document as PDF',
      defaultPath,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { success: false, canceled: true };
    }

    // Create a hidden off-screen window for high-resolution document printing
    printWindow = new BrowserWindow({
      show: false,
      width: 1024,
      height: 1448,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    // Load printable HTML directly
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    // Give web fonts time to complete rendering
    await new Promise((resolve) => setTimeout(resolve, 800));

    const pdfData = await printWindow.webContents.printToPDF({
      printBackground: true,
      pageSize,
      margins: {
        top: 0.3,
        bottom: 0.3,
        left: 0.3,
        right: 0.3
      },
      preferCSSPageSize: true
    });

    fs.writeFileSync(saveResult.filePath, pdfData);
    return { success: true, filePath: saveResult.filePath };
  } catch (err) {
    console.error('Failed to export document PDF:', err);
    return { success: false, error: err.message };
  } finally {
    if (printWindow) {
      try {
        printWindow.close();
      } catch {}
      printWindow = null;
    }
  }
});

// Backward compatible window-level print
ipcMain.handle('print-to-pdf', async (event, options = {}) => {
  const { dialog } = require('electron');
  const fs = require('fs');
  try {
    if (!mainWindow) return { success: false, error: 'No active window' };
    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: options.pageSize || 'A4',
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      },
      preferCSSPageSize: true
    });
    const saveResult = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Window Snapshot as PDF',
      defaultPath: options.defaultPath || 'Notelay-Snapshot.pdf',
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });
    if (!saveResult.canceled && saveResult.filePath) {
      fs.writeFileSync(saveResult.filePath, pdfData);
      return { success: true, filePath: saveResult.filePath };
    }
    return { success: false, canceled: true };
  } catch (err) {
    console.error('Failed to print to PDF:', err);
    return { success: false, error: err.message };
  }
});

// --- NOTELAY BACKEND & LOCAL STORAGE SUBSYSTEM ---
const os = require('os');
const { safeStorage } = require('electron');

function getConfigPath() {
  return path.join(app.getPath('userData'), 'notelay-config.json');
}

function loadConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to read config:', e);
  }
  return {};
}

function saveConfig(data) {
  try {
    const configPath = getConfigPath();
    const existing = loadConfig();
    const updated = { ...existing, ...data };
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to save config:', e);
    return false;
  }
}

function getDefaultStoragePath() {
  const cfg = loadConfig();
  if (cfg.storagePath && typeof cfg.storagePath === 'string') {
    return cfg.storagePath;
  }
  return path.join(app.getPath('documents'), 'Notelay', 'Projects');
}

// 1. Storage Location Handlers
ipcMain.handle('get-storage-path', async () => {
  const p = getDefaultStoragePath();
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch {}
  return p;
});

ipcMain.handle('set-storage-path', async (event, newPath) => {
  if (newPath && typeof newPath === 'string') {
    try {
      fs.mkdirSync(newPath, { recursive: true });
      saveConfig({ storagePath: newPath });
      return { success: true, path: newPath };
    } catch (e) {
      return { success: false, path: getDefaultStoragePath(), error: e.message };
    }
  }
  return { success: false, path: getDefaultStoragePath() };
});

// 2. Project Persistence on Local Disk
ipcMain.handle('save-project-to-disk', async (event, project) => {
  try {
    if (!project || !project.id) return { success: false, error: 'Invalid project payload' };
    const basePath = getDefaultStoragePath();
    const projectDir = path.join(basePath, project.id);
    const sourcesDir = path.join(projectDir, 'sources');
    fs.mkdirSync(sourcesDir, { recursive: true });

    // Save project.json
    const projectJsonPath = path.join(projectDir, 'project.json');
    fs.writeFileSync(projectJsonPath, JSON.stringify(project, null, 2), 'utf-8');

    // Save individual raw source files
    if (Array.isArray(project.sources)) {
      for (const s of project.sources) {
        if (s.name) {
          const safeName = s.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const destBinaryPath = path.join(sourcesDir, safeName);
          if (s.path && fs.existsSync(s.path)) {
            try {
              if (path.resolve(s.path) !== path.resolve(destBinaryPath)) {
                fs.copyFileSync(s.path, destBinaryPath);
              }
            } catch (copyErr) {
              console.warn('Could not copy source file to project directory:', copyErr);
            }
          }
          if (s.content) {
            const textFilePath = s.type === 'pdf' ? path.join(sourcesDir, `${safeName}.txt`) : destBinaryPath;
            fs.writeFileSync(textFilePath, s.content, 'utf-8');
          }
        }
      }
    }

    // Save compiled Master Notes in readable markdown
    if (project.document && Array.isArray(project.document.chapters)) {
      let md = `# ${project.document.title}\n\n`;
      if (project.document.subtitle) md += `*${project.document.subtitle}*\n\n---\n\n`;
      for (const ch of project.document.chapters) {
        md += `## Chapter ${ch.chapterNumber}: ${ch.title}\n\n`;
        if (ch.subtitle) md += `*${ch.subtitle}*\n\n`;
        for (const sec of ch.sections) {
          md += `${sec.content}\n\n`;
        }
        if (ch.summary) md += `> **Summary**: ${ch.summary}\n\n`;
        md += `---\n\n`;
      }
      fs.writeFileSync(path.join(projectDir, 'master-notes.md'), md, 'utf-8');
    }

    return { success: true, path: projectDir };
  } catch (err) {
    console.error('Failed to save project to disk:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-projects-from-disk', async () => {
  try {
    const basePath = getDefaultStoragePath();
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
      return { success: true, projects: [] };
    }

    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    const loadedProjects = [];

    for (const ent of entries) {
      if (ent.isDirectory()) {
        const pJson = path.join(basePath, ent.name, 'project.json');
        if (fs.existsSync(pJson)) {
          try {
            const data = JSON.parse(fs.readFileSync(pJson, 'utf-8'));
            if (data && data.id) {
              loadedProjects.push(data);
            }
          } catch (pe) {
            console.error(`Failed to parse project ${ent.name}:`, pe);
          }
        }
      }
    }

    return { success: true, projects: loadedProjects };
  } catch (err) {
    console.error('Failed to load projects from disk:', err);
    return { success: false, projects: [] };
  }
});

ipcMain.handle('delete-project-from-disk', async (event, projectId) => {
  try {
    if (!projectId) return { success: false, error: 'Missing projectId' };
    const basePath = getDefaultStoragePath();
    const projectDir = path.join(basePath, projectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
      console.log(`[Storage] Permanently deleted project from disk: ${projectDir}`);
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to delete project from disk:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-source-from-disk', async (event, projectId, fileName) => {
  try {
    if (!projectId || !fileName) return { success: false, error: 'Missing parameters' };
    const basePath = getDefaultStoragePath();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(basePath, projectId, 'sources', safeName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Storage] Permanently deleted source file from disk: ${filePath}`);
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to delete source file from disk:', err);
    return { success: false, error: err.message };
  }
});

// Trajectory Logging & Model Fine-Tuning Dataset Persistence
ipcMain.handle('save-agent-activity-log', async (event, logEntry) => {
  try {
    if (!logEntry || !logEntry.id) return { success: false, error: 'Invalid log payload' };
    const basePath = getDefaultStoragePath();
    const projectId = logEntry.projectId || 'general';
    const projectLogsDir = path.join(basePath, projectId, 'logs', 'agent_trajectories');
    const globalDatasetsDir = path.join(basePath, '_training_datasets');

    fs.mkdirSync(projectLogsDir, { recursive: true });
    fs.mkdirSync(globalDatasetsDir, { recursive: true });

    // 1. Save individual full trajectory JSON
    const logFilePath = path.join(projectLogsDir, `${logEntry.id}.json`);
    fs.writeFileSync(logFilePath, JSON.stringify(logEntry, null, 2), 'utf-8');

    // 2. Format standard fine-tuning sample (DeepSeek / OpenAI reasoning format with <think>...</think>)
    const trainingSample = {
      id: logEntry.id,
      timestamp: logEntry.timestamp,
      model: logEntry.model,
      projectId: logEntry.projectId,
      messages: [
        {
          role: 'system',
          content: 'You are Notelay AI, an expert pedagogical synthesizer that plans cognitive architecture and composes structured, deep notes with Mermaid diagrams and mathematical rigor.'
        },
        {
          role: 'user',
          content: logEntry.prompt
        },
        {
          role: 'assistant',
          content: logEntry.thinking ? `<think>\n${logEntry.thinking}\n</think>\n\n${logEntry.output}` : logEntry.output
        }
      ],
      trajectory: logEntry.steps || []
    };

    // 3. Append to JSONL datasets
    const projectJsonlPath = path.join(projectLogsDir, 'dataset.jsonl');
    const globalJsonlPath = path.join(globalDatasetsDir, 'notelay_training_dataset.jsonl');
    const jsonlLine = JSON.stringify(trainingSample) + '\n';

    fs.appendFileSync(projectJsonlPath, jsonlLine, 'utf-8');
    fs.appendFileSync(globalJsonlPath, jsonlLine, 'utf-8');

    console.log(`[Trajectory Logger] Logged agent run ${logEntry.id} to ${logFilePath} and dataset.`);
    return { success: true, path: logFilePath, datasetPath: globalJsonlPath };
  } catch (err) {
    console.error('Failed to save agent activity log:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-agent-logs-folder', async (event, projectId) => {
  try {
    const basePath = getDefaultStoragePath();
    let targetDir = path.join(basePath, '_training_datasets');
    if (projectId) {
      const pDir = path.join(basePath, projectId, 'logs', 'agent_trajectories');
      if (fs.existsSync(pDir)) {
        targetDir = pDir;
      }
    }
    fs.mkdirSync(targetDir, { recursive: true });
    await shell.openPath(targetDir);
    return { success: true, path: targetDir };
  } catch (err) {
    console.error('Failed to open agent logs folder:', err);
    return { success: false, error: err.message };
  }
});

// 3. Local LLM Discovery Engine (Ollama & LM Studio)
ipcMain.handle('detect-local-llms', async () => {
  const result = {
    ollama: { running: false, endpoint: 'http://127.0.0.1:11434', models: [] },
    lmstudio: { running: false, endpoint: 'http://127.0.0.1:1234', models: [] },
  };

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 1500) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  };

  // Probe Ollama
  try {
    const res = await fetchWithTimeout('http://127.0.0.1:11434/api/tags');
    if (res.ok) {
      const data = await res.json();
      result.ollama.running = true;
      if (Array.isArray(data.models)) {
        result.ollama.models = data.models.map((m) => ({
          name: m.name,
          size: m.size || 0,
          details: m.details || {},
        }));
      }
    }
  } catch (e) {
    result.ollama.running = false;
  }

  // Probe LM Studio
  try {
    const res = await fetchWithTimeout('http://127.0.0.1:1234/v1/models');
    if (res.ok) {
      const data = await res.json();
      result.lmstudio.running = true;
      if (Array.isArray(data.data)) {
        result.lmstudio.models = data.data.map((m) => ({
          id: m.id,
          object: m.object,
        }));
      }
    }
  } catch (e) {
    result.lmstudio.running = false;
  }

  return result;
});

// 4. Secure API Key Vault (Windows DPAPI via safeStorage)
ipcMain.handle('save-api-keys', async (event, keys = {}) => {
  try {
    const serialized = JSON.stringify(keys);
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encryptedStr = safeStorage.encryptString(serialized).toString('base64');
      saveConfig({ encryptedKeys: encryptedStr, hasEncryptedKeys: true });
    } else {
      saveConfig({ plainKeys: keys });
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to save API keys:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-api-keys', async () => {
  const DEFAULT_QWEN_KEY = 'sk-ws-H.DDHPPRL.rSYJ.MEQCIBSlJHIWcfqSFWq7Dg8C8faRW2eCkAMHPg0AvUSz17XZAiA4MlAhFFb4yjJvNLW1teSkqj5stgd0R_Fyn1NIVJllOg';
  try {
    const cfg = loadConfig();
    let keys = {};
    if (cfg.hasEncryptedKeys && cfg.encryptedKeys && safeStorage && safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(cfg.encryptedKeys, 'base64');
      const decrypted = safeStorage.decryptString(buffer);
      keys = JSON.parse(decrypted);
    } else if (cfg.plainKeys) {
      keys = cfg.plainKeys;
    }
    if (!keys.qwen) {
      keys.qwen = DEFAULT_QWEN_KEY;
    }
    return keys;
  } catch (err) {
    console.error('Failed to get API keys:', err);
  }
  return { qwen: DEFAULT_QWEN_KEY };
});

// 5. Shared LLM Execution Engine (Ollama, LM Studio, Gemini, OpenAI, Claude, Qwen)
const DEFAULT_QWEN_KEY = 'sk-ws-H.DDHPPRL.rSYJ.MEQCIBSlJHIWcfqSFWq7Dg8C8faRW2eCkAMHPg0AvUSz17XZAiA4MlAhFFb4yjJvNLW1teSkqj5stgd0R_Fyn1NIVJllOg';

async function executeLLMChat({
  modelId = 'qwen-plus',
  isLocal = false,
  localEndpoint = '',
  apiKeys = {},
  systemPrompt = '',
  messages = [],
  temperature = 0.7,
  maxTokens = 4096,
  onStream = null,
}) {
  const fullMessages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    ...messages,
  ];

  // 1. Ollama local synthesis with streaming thinking and tokens
  if (isLocal && ((localEndpoint || '').includes('11434') || !localEndpoint || localEndpoint.includes('localhost') || localEndpoint.includes('127.0.0.1'))) {
    const endpoint = localEndpoint || 'http://127.0.0.1:11434';
    const res = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: fullMessages,
        stream: true,
      }),
    });
    if (!res.ok) throw new Error(`Ollama error: HTTP ${res.status}`);

    let accumulatedContent = '';
    let accumulatedThinking = '';
    let totalDuration = 0;
    let evalCount = 0;
    let evalDuration = 0;

    const reader = res.body && res.body.getReader ? res.body.getReader() : null;

    if (reader) {
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.thinking) {
              accumulatedThinking += parsed.message.thinking;
              if (onStream) {
                onStream({
                  type: 'think',
                  text: parsed.message.thinking,
                  accumulatedThinking,
                  evalCount: parsed.eval_count || 0,
                });
              }
            }
            if (parsed.message?.content) {
              accumulatedContent += parsed.message.content;
              if (onStream) {
                onStream({
                  type: 'content',
                  text: parsed.message.content,
                  accumulatedContent,
                  evalCount: parsed.eval_count || 0,
                });
              }
            }
            if (parsed.done) {
              totalDuration = parsed.total_duration || 0;
              evalCount = parsed.eval_count || 0;
              evalDuration = parsed.eval_duration || 0;
            }
          } catch (e) {}
        }
      }
    } else if (res.body && res.body.on) {
      // Node Readable Stream fallback
      await new Promise((resolve, reject) => {
        let buffer = '';
        res.body.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.thinking) {
                accumulatedThinking += parsed.message.thinking;
                if (onStream) {
                  onStream({
                    type: 'think',
                    text: parsed.message.thinking,
                    accumulatedThinking,
                    evalCount: parsed.eval_count || 0,
                  });
                }
              }
              if (parsed.message?.content) {
                accumulatedContent += parsed.message.content;
                if (onStream) {
                  onStream({
                    type: 'content',
                    text: parsed.message.content,
                    accumulatedContent,
                    evalCount: parsed.eval_count || 0,
                  });
                }
              }
              if (parsed.done) {
                totalDuration = parsed.total_duration || 0;
                evalCount = parsed.eval_count || 0;
                evalDuration = parsed.eval_duration || 0;
              }
            } catch (e) {}
          }
        });
        res.body.on('end', resolve);
        res.body.on('error', reject);
      });
    }

    // Extract embedded <think> tags if model returned reasoning in content (e.g. DeepSeek-R1)
    if (!accumulatedThinking && accumulatedContent) {
      const thinkMatch = accumulatedContent.match(/<think>([\s\S]*?)<\/think>/i);
      if (thinkMatch) {
        accumulatedThinking = thinkMatch[1].trim();
        accumulatedContent = accumulatedContent.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
      }
    }

    return {
      success: true,
      rawOutput: accumulatedContent,
      thinking: accumulatedThinking,
      totalDuration,
      evalCount,
      evalDuration,
    };
  }

  // 2. LM Studio local synthesis
  if (isLocal && (localEndpoint || '').includes('1234')) {
    const endpoint = localEndpoint || 'http://127.0.0.1:1234';
    const res = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: fullMessages,
      }),
    });
    if (!res.ok) throw new Error(`LM Studio error: HTTP ${res.status}`);
    const json = await res.json();
    return { success: true, rawOutput: json.choices?.[0]?.message?.content || '' };
  }

  // 3. Google Gemini Cloud API
  if (apiKeys.gemini && (modelId.toLowerCase().includes('gemini') || !isLocal)) {
    const geminiModel = modelId.toLowerCase().includes('pro') ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKeys.gemini}`;
    const conversationText = fullMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: conversationText }],
          },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 150)}`);
    }
    const json = await res.json();
    return { success: true, rawOutput: json.candidates?.[0]?.content?.parts?.[0]?.text || '' };
  }

  // 4. OpenAI API
  if (apiKeys.openai && modelId.toLowerCase().includes('gpt')) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: modelId.toLowerCase().includes('4o-mini') ? 'gpt-4o-mini' : 'gpt-4o',
        messages: fullMessages,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 150)}`);
    }
    const json = await res.json();
    return { success: true, rawOutput: json.choices?.[0]?.message?.content || '' };
  }

  // 5. Anthropic Claude API
  if (apiKeys.anthropic && modelId.toLowerCase().includes('claude')) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeys.anthropic,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.length > 0 ? messages : [{ role: 'user', content: 'Begin synthesis.' }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API error (${res.status}): ${errText.slice(0, 150)}`);
    }
    const json = await res.json();
    return { success: true, rawOutput: json.content?.[0]?.text || '' };
  }

  // 6. Qwen / Alibaba DashScope API (Compatible Mode)
  const activeQwenKey = apiKeys.qwen || DEFAULT_QWEN_KEY;
  const isQwenTarget = modelId.toLowerCase().includes('qwen') || (!isLocal && !apiKeys.gemini && !apiKeys.openai && !apiKeys.anthropic);

  if (activeQwenKey && isQwenTarget) {
    const qwenModel = modelId.toLowerCase().includes('max')
      ? 'qwen-max'
      : modelId.toLowerCase().includes('turbo')
      ? 'qwen-turbo'
      : modelId.toLowerCase().includes('coder')
      ? 'qwen2.5-coder-32b-instruct'
      : modelId.toLowerCase().includes('72b')
      ? 'qwen2.5-72b-instruct'
      : 'qwen-plus';

    const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeQwenKey}`,
      },
      body: JSON.stringify({
        model: qwenModel,
        messages: fullMessages,
        temperature,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[AI Gateway] Qwen DashScope returned HTTP ${res.status}: ${errText.slice(0, 150)}`);
      return {
        success: false,
        error: `Qwen DashScope API (${res.status}): ${errText.slice(0, 150)}`,
        isQuotaExhausted: res.status === 403 || res.status === 429,
      };
    }
    const json = await res.json();
    return { success: true, rawOutput: json.choices?.[0]?.message?.content || '', provider: 'qwen', model: qwenModel };
  }

  return {
    success: false,
    error: 'No active local model (Ollama) or cloud API key configured for this model.',
  };
}

// 6. Real AI Synthesis Gateway with Dual-Stream Conversational & Document Architecture
ipcMain.handle('synthesize-chapter-ai', async (event, payload = {}) => {
  const {
    prompt,
    topic,
    sources = [],
    modelId,
    isLocal,
    localEndpoint,
    apiKeys = {},
    documentOutline = [],
    conversationHistory = [],
  } = payload;

  let contextText = '';
  if (Array.isArray(sources) && sources.length > 0) {
    contextText = sources.map((s) => `--- SOURCE: ${s.name} ---\n${s.content}`).join('\n\n');
  }

  let documentSummary = 'The right-side Master Document Canvas is currently empty (0 chapters).';
  if (Array.isArray(documentOutline) && documentOutline.length > 0) {
    documentSummary = documentOutline
      .map((ch, i) => {
        const secSummary = (ch.sections || [])
          .map((s, si) => `    Section ${si + 1}: "${s.title}" (preview: ${s.content ? s.content.slice(0, 80).replace(/\n/g, ' ') : ''}...)`)
          .join('\n');
        return `Chapter ${ch.chapterNumber || i + 1}: "${ch.title}"\n${secSummary}`;
      })
      .join('\n\n');
  }

  const systemPrompt = `You are Notelay Knowledge Architect and intelligent pair-researcher.
You communicate with the user in the conversation workspace. On the user's right side, there is a dedicated Master Document Canvas displaying the project's permanent ruled handwritten notes and diagrams.

CURRENT MASTER DOCUMENT CANVAS STATE:
${documentSummary}

INTENT CLASSIFICATION AND ACTION RULES:
1. "NONE":
   - The user is greeting you (e.g. "hi", "hello", "hey", "good morning"), asking a general question, asking for clarification, brainstorming, or chatting casually.
   - DO NOT generate, create, or alter any notes or chapters on the Master Document Canvas!
   - Respond conversationally, concisely, and helpfully in "chatResponse".
   - Set "action": "NONE".

2. "CREATE_CHAPTER":
   - The user explicitly asks to generate, create, write, or synthesize a new chapter/topic or notes (e.g. "write notes on X", "add a new page at the top on Y", "append a chapter at the bottom on Z").
   - Set "action": "CREATE_CHAPTER".
   - Set "position": "TOP" | "BOTTOM" | "BEFORE" | "AFTER":
     * If the user requests to place, insert, or add notes at the TOP, start, beginning, or as Chapter 1, set "position": "TOP".
     * If the user requests to insert before or after a specific chapter (e.g., "insert before Chapter 2"), set "position": "BEFORE" or "AFTER" and set "targetChapterNumber": integer.
     * Otherwise, default to "position": "BOTTOM".
   - In "chatResponse", provide a short executive summary of what was synthesized and where it was placed.
   - In "chapter", provide:
     - "title": Descriptive Chapter title tailored to the subject
     - "subtitle": Contextual subtitle
     - "sections": Adaptively determine the best pedagogical structure and number of sections (typically 2 to 6 deep, focused sections). DO NOT force a single rigid pattern or generic names like "Part 1" or "Part 2"!
       * Name each section specifically after the core concept (e.g., "Loss Landscape Topography & Optimization Dynamics", "Computational Graph & Chain Rule Flow", "Vanishing Gradient Bottleneck & Residual Connections", "Comparative Benchmark: AdamW vs SGD with Momentum").
       * Choose the optimal pedagogical modalities for the subject:
         - Diagrams: When explaining architectures, lifecycles, protocols, or workflows, embed an authentic Mermaid.js diagram inside \`\`\`mermaid ... \`\`\`.
           CHOOSE THE MOST EXPRESSIVE MERMAID DIAGRAM TYPE:
           * Architecture/Hardware: block-beta or graph TB
           * Lifecycles/Transitions: stateDiagram-v2
           * Protocols/Interactions: sequenceDiagram
           * Conceptual Taxonomies: mindmap
           * Dataflow/Pipelines: graph TD or flowchart LR
           CRITICAL MERMAID SYNTAX RULES:
           * Always quote subgraph titles: subgraph "Title"
           * Always quote edge labels with parentheses or special characters: -->|"Edge Label"|
           * Always quote node labels containing special characters or slashes: node["Node Title"]
         - Mathematics: For quantitative, ML, physical, or algorithmic concepts, formulate equations cleanly using LaTeX notation ($...$ or $$...$$).
         - Comparative Tradeoffs: Use Markdown comparison tables when contrasting paradigms, tools, or algorithms.
         - Code & Implementation: Provide clean code snippets with annotations where applicable.
         - Invariants & Key Takeaways: Conclude deep sections with bulleted core invariants.
     - "summary": Chapter key takeaway.
     - DO NOT include active recall quiz questions.

3. "UPDATE_SECTION":
   - The user wants to add a point, insert information, or revise an existing chapter/section (e.g. "add a point about log compaction to Chapter 1", "in section 2 also mention connection pools", "clarify that decoupling is asynchronous").
   - Set "action": "UPDATE_SECTION".
   - Set "targetChapterNumber": integer (e.g. 1).
   - Set "targetSectionIndex": 0-indexed integer (0 for Section 1, 1 for Section 2, etc.).
   - Set "patchType": "APPEND" (to append new points/notes to the section) or "REPLACE" (to rewrite the section).
   - Set "patchContent": The formatted Markdown text to insert or replace.
   - In "chatResponse", confirm the background update conversationally (e.g. "I've added the connection pooling point to Chapter 1: System Blueprint in your master document canvas.").

4. "UPDATE_DIAGRAM":
   - The user wants to update or regenerate a diagram in an existing chapter.
   - Set "action": "UPDATE_DIAGRAM".
   - Set "targetChapterNumber": integer (e.g. 1).
   - Set "diagram": { "type": "flowchart", "code": "graph TD\\n...", "caption": "..." }.
   - In "chatResponse", confirm the diagram update.

5. "DELETE_CHAPTER":
   - The user asks to delete, remove, drop, or erase a chapter or page from the Master Document Canvas (e.g. "delete Chapter 2", "remove the chapter on memory management", "delete the last chapter", "delete section 2 of Chapter 1").
   - Set "action": "DELETE_CHAPTER".
   - Set "targetChapterNumber": integer (e.g. 2). If the user asks to delete the "last chapter", use the highest chapter number from CURRENT MASTER DOCUMENT CANVAS STATE.
   - Set "targetSectionIndex": optional 0-indexed integer if deleting a specific section/page within a chapter.
   - In "chatResponse", confirm the removal conversationally (e.g. "I have removed Chapter 2 from your Master Document Canvas and sequentially re-numbered the remaining chapters.").

6. "REVISE_NOTES":
   - The user wants to perform a deep revision, rewrite, restructuring, or stylistic change on an entire existing chapter (e.g. "rewrite Chapter 1 focusing on practical Linux kernel implementation", "restructure Chapter 2 into bullet points with formulas").
   - Set "action": "REVISE_NOTES".
   - Set "targetChapterNumber": integer (e.g. 1).
   - In "chapter", provide the full revised chapter ("title", "subtitle", "sections", "summary").
   - In "chatResponse", summarize the changes made to the chapter.

OUTPUT FORMAT REQUIREMENTS:
You MUST respond with valid JSON enclosed in \`\`\`json ... \`\`\` or raw JSON:
{
  "action": "NONE" | "CREATE_CHAPTER" | "UPDATE_SECTION" | "UPDATE_DIAGRAM" | "DELETE_CHAPTER" | "REVISE_NOTES",
  "position": "TOP" | "BOTTOM" | "BEFORE" | "AFTER",
  "targetChapterNumber": 1,
  "targetSectionIndex": 0,
  "thinking": "Concise cognitive plan and pedagogical strategy: why this structure and modalities were chosen to maximize clarity and retention",
  "chatResponse": "Your conversational response to the user in chat",
  "patchType": "APPEND",
  "patchContent": "...",
  "chapter": {
    "title": "...",
    "subtitle": "...",
    "sections": [
      { "title": "...", "content": "..." }
    ],
    "summary": "..."
  },
  "diagram": {
    "type": "flowchart",
    "code": "graph TD\\n...",
    "caption": "..."
  }
}`;

  // Assemble full multi-turn messages array
  const conversationMessages = [];
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    for (const m of conversationHistory.slice(-6)) {
      if (m && (m.sender === 'user' || m.sender === 'agent')) {
        conversationMessages.push({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content || '',
        });
      }
    }
  }

  const currentUserPrompt = `${prompt}${contextText ? `\n\nRelevant Knowledge Sources:\n${contextText}` : ''}`;
  conversationMessages.push({ role: 'user', content: currentUserPrompt });

  const { runId } = payload;
  const onStream = (data) => {
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('ai-stream-event', {
        runId,
        ...data,
      });
    }
  };

  try {
    const result = await executeLLMChat({
      modelId,
      isLocal,
      localEndpoint,
      apiKeys,
      systemPrompt,
      messages: conversationMessages,
      temperature: 0.7,
      onStream,
    });

    if (result && result.rawOutput) {
      const thinkMatch = result.rawOutput.match(/<think>([\s\S]*?)<\/think>/i);
      if (thinkMatch) {
        result.thinking = thinkMatch[1].trim();
        result.rawOutput = result.rawOutput.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
      }
    }

    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('ai-stream-event', {
        runId,
        type: 'done',
        thinking: result?.thinking || '',
        evalCount: result?.evalCount || 0,
        durationMs: result?.totalDuration ? Math.round(result.totalDuration / 1000000) : undefined,
      });
    }

    return result;
  } catch (err) {
    console.error('Synthesis error in backend:', err);
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('ai-stream-event', {
        runId,
        type: 'error',
        error: err.message,
      });
    }
    return { success: false, error: err.message };
  }
});

// 7. High-Speed Localized AI Customization IPC Handler
ipcMain.handle('customize-selection-ai', async (event, payload = {}) => {
  const {
    selectedText = '',
    sectionTitle = '',
    sectionContent = '',
    action = 'deepen',
    customPrompt = '',
    modelId = 'qwen-plus',
    isLocal = false,
    localEndpoint = '',
    apiKeys = {},
  } = payload;

  const systemPrompt = `You are Notelay Knowledge Architect performing an inline agentic enhancement on a specific section of master notes.
The user highlighted a passage inside a section of their Master Document Canvas and requested an inline enhancement.

SECTION TITLE: "${sectionTitle}"
FULL SECTION CONTEXT:
${sectionContent.slice(0, 2000)}

SELECTED TARGET PASSAGE:
"${selectedText}"

ACTION REQUESTED: "${action}"
${customPrompt ? `CUSTOM USER INSTRUCTION: "${customPrompt}"` : ''}

INSTRUCTIONS PER ACTION:
- "deepen": Deepen and expand this specific passage with rigorous technical mechanics, low-level architecture, or system-level implementation details while keeping it integrated with the surrounding section. Provide the rewritten or expanded markdown text.
- "analogy": Provide an intuitive, memorable real-world analogy and mental model for this concept to make it crystal clear, then explain how the technical reality maps to the analogy.
- "diagram": Generate an authentic Mermaid.js diagram illustrating this selected concept or process. Choose between \`block-beta\` (for architecture/layers/memory layouts), \`flowchart TD\` (for logic flows), \`stateDiagram-v2\` (for lifecycles/states), or \`sequenceDiagram\` (for interactions/protocols). Include a short explanatory caption.
- "table": Convert or complement this concept into a comprehensive Markdown comparison matrix/table with clear analytical columns (e.g. Feature / Metric, Option A, Option B, Trade-offs).
- "custom": Follow the custom instruction carefully to modify or rewrite the passage.

OUTPUT FORMAT REQUIREMENTS:
You MUST respond with valid JSON enclosed in \`\`\`json ... \`\`\` or raw JSON:
{
  "replacementContent": "The enhanced/modified markdown text for this passage or section",
  "diagram": {
    "type": "flowchart",
    "title": "Diagram Title",
    "code": "graph TD\\n...",
    "caption": "Diagram caption"
  }
}`;

  try {
    const aiResult = await executeLLMChat({
      modelId,
      isLocal,
      localEndpoint,
      apiKeys,
      systemPrompt,
      messages: [{ role: 'user', content: `Perform action "${action}" on: "${selectedText}"` }],
      temperature: 0.6,
    });

    if (!aiResult.success || !aiResult.rawOutput) {
      return { success: false, error: aiResult.error || 'Failed to synthesize customization' };
    }

    let jsonStr = '';
    const fenceMatch = aiResult.rawOutput.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1];
    } else {
      const firstBrace = aiResult.rawOutput.indexOf('{');
      const lastBrace = aiResult.rawOutput.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = aiResult.rawOutput.slice(firstBrace, lastBrace + 1);
      }
    }

    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        return {
          success: true,
          replacementContent: parsed.replacementContent,
          diagram: parsed.diagram,
        };
      } catch (err) {
        console.warn('Failed to parse JSON from customize-selection-ai output, using raw text fallback');
      }
    }

    // Fallback: if action was diagram, extract mermaid code fence
    const mermaidMatch = aiResult.rawOutput.match(/```mermaid([\s\S]*?)```/);
    if (action === 'diagram' && mermaidMatch) {
      return {
        success: true,
        diagram: {
          id: `diag-${Date.now()}`,
          type: 'flowchart',
          title: `${selectedText.slice(0, 30)} Architecture`,
          code: mermaidMatch[1].trim(),
          caption: 'Generated Diagram',
        },
      };
    }

    return {
      success: true,
      replacementContent: aiResult.rawOutput.replace(/```(?:json)?[\s\S]*?```/g, '').trim(),
    };
  } catch (err) {
    console.error('customize-selection-ai error:', err);
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  // Register protocol handler for streaming PDF files
  protocol.handle('notelay-pdf', async (request) => {
    try {
      const url = new URL(request.url);
      const filePath = url.searchParams.get('path');
      if (filePath && fs.existsSync(filePath)) {
        const fileUrl = require('url').pathToFileURL(filePath).toString();
        return net.fetch(fileUrl);
      }
      return new Response('PDF File Not Found', { status: 404 });
    } catch (err) {
      console.error('notelay-pdf handler error:', err);
      return new Response('Internal Protocol Error', { status: 500 });
    }
  });

  createWindow();

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

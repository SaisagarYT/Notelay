const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowStateChange: (callback) => {
    const subscription = (_event, state) => callback(state);
    ipcRenderer.on('window-state-changed', subscription);
    return () => {
      ipcRenderer.removeListener('window-state-changed', subscription);
    };
  },
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  parseFilesFromPaths: (filePaths) => ipcRenderer.invoke('parse-files-from-paths', filePaths),
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),
  exportDocumentPDF: (payload) => ipcRenderer.invoke('export-document-pdf', payload),
  detectLocalLLMs: () => ipcRenderer.invoke('detect-local-llms'),
  getStoragePath: () => ipcRenderer.invoke('get-storage-path'),
  setStoragePath: (newPath) => ipcRenderer.invoke('set-storage-path', newPath),
  saveProjectToDisk: (project) => ipcRenderer.invoke('save-project-to-disk', project),
  loadProjectsFromDisk: () => ipcRenderer.invoke('load-projects-from-disk'),
  deleteProjectFromDisk: (projectId) => ipcRenderer.invoke('delete-project-from-disk', projectId),
  deleteSourceFileFromDisk: (projectId, fileName) => ipcRenderer.invoke('delete-source-from-disk', projectId, fileName),
  saveApiKeys: (keys) => ipcRenderer.invoke('save-api-keys', keys),
  getApiKeys: () => ipcRenderer.invoke('get-api-keys'),
  synthesizeChapterAI: (payload) => ipcRenderer.invoke('synthesize-chapter-ai', payload),
  readSourceFileBinary: (params) => ipcRenderer.invoke('read-source-file-binary', params),
  openFileInOS: (filePath) => ipcRenderer.invoke('open-file-in-os', filePath),
  customizeSelectionAI: (payload) => ipcRenderer.invoke('customize-selection-ai', payload),
  saveAgentActivityLog: (logEntry) => ipcRenderer.invoke('save-agent-activity-log', logEntry),
  openAgentLogsFolder: (projectId) => ipcRenderer.invoke('open-agent-logs-folder', projectId),
  onAIStreamEvent: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('ai-stream-event', subscription);
    return () => {
      ipcRenderer.removeListener('ai-stream-event', subscription);
    };
  },
});

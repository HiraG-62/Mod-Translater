import { contextBridge, ipcRenderer } from 'electron';

// APIの型定義
interface IElectronAPI {
    openFile: () => Promise<string | null>;
    getFileContent: (filePath: string) => Promise<string>;
    saveApiKey: (apiKey: string) => Promise<boolean>;
    loadApiKey: () => Promise<string>;
    onOpenApiSettings: (callback: () => void) => void;
    saveJsonFile: (jsonData: any) => Promise<boolean>;
    onSaveJsonRequest: (callback: () => void) => void;
}

// DOMContentLoadedイベントの処理
window.addEventListener('DOMContentLoaded', () => {
    // ドラッグオーバー時のデフォルト動作を防ぐ
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    // ドロップ時の処理
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

// APIをレンダラープロセスに公開
contextBridge.exposeInMainWorld('electronAPI', {
    openFile: () => ipcRenderer.invoke('open-file'),
    getFileContent: (filePath: string) => ipcRenderer.invoke('get-file-content', filePath),
    saveApiKey: (apiKey: string) => ipcRenderer.invoke('save-api-key', apiKey),
    loadApiKey: () => ipcRenderer.invoke('load-api-key'),
    onOpenApiSettings: (callback: () => void) => {
        ipcRenderer.on('open-api-settings', () => callback());
    },
    saveJsonFile: (jsonData: any) => ipcRenderer.invoke('save-json-file', jsonData),
    onSaveJsonRequest: (callback: () => void) => {
        ipcRenderer.on('save-json-request', () => callback());
    }
} as IElectronAPI);

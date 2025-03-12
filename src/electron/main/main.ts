import { join } from "path";
import { app, BrowserWindow, session, ipcMain, dialog, Menu, MenuItemConstructorOptions } from "electron";
import fs from "fs";
import crypto from 'crypto';

const isDev = process.env.npm_lifecycle_event === "app:dev" ? true : false;

// 暗号化キーの生成（アプリケーション起動時に一度だけ生成）
const ENCRYPTION_KEY = crypto.scryptSync(app.getPath('userData'), 'salt', 24);
const ALGORITHM = 'aes-192-cbc';

// APIキーの暗号化
function encryptApiKey(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

// APIキーの復号化
function decryptApiKey(text: string): string {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: join(__dirname, "../../../assets/icon.png"),
        webPreferences: {
            preload: join(__dirname, "../preload/preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
    });

    // ファイル保存ハンドラー
    ipcMain.handle('save-json-file', async (_event, jsonData: any) => {
        try {
            const result = await dialog.showSaveDialog(mainWindow, {
                filters: [
                    { name: 'JSON Files', extensions: ['json'] }
                ],
                defaultPath: 'ja_jp.json'
            });

            if (!result.canceled && result.filePath) {
                // JSONデータを整形して保存
                const formattedJson = JSON.stringify(jsonData, null, 2);
                fs.writeFileSync(result.filePath, formattedJson, 'utf8');
                return true;
            }
            return false;
        } catch (error) {
            console.error('File save error:', error);
            return false;
        }
    });

    // メニューバーの設定
    const template: MenuItemConstructorOptions[] = [
        {
            label: '設定',
            submenu: [
                {
                    label: 'API設定',
                    click: () => {
                        mainWindow.webContents.send('open-api-settings');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // ファイルのドラッグ&ドロップで新しいウィンドウが開くのを防ぐ
    mainWindow.webContents.on('will-navigate', (event) => {
        event.preventDefault();
    });

    // ファイル選択と読み込みのハンドラー
    ipcMain.handle('open-file', async () => {
        try {
            const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [
                    { name: 'JSON Files', extensions: ['json'] }
                ]
            });
            if (!result.canceled) {
                const filePath = result.filePaths[0];
                // パスの検証
                if (!filePath.toLowerCase().endsWith('.json')) {
                    throw new Error('Invalid file type');
                }
                return filePath;
            }
            return null;
        } catch (error) {
            console.error('File selection error:', error);
            return null;
        }
    });

    ipcMain.handle('get-file-content', async (_event, filePath: string) => {
        try {
            // パスの検証
            if (!filePath.toLowerCase().endsWith('.json')) {
                throw new Error('Invalid file type');
            }

            // ファイルサイズの確認
            const stats = fs.statSync(filePath);
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (stats.size > maxSize) {
                throw new Error('File too large');
            }

            const data = fs.readFileSync(filePath, 'utf8');
            
            // JSONの検証
            JSON.parse(data); // 有効なJSONかチェック
            
            return data;
        } catch (error) {
            console.error('File read error:', error);
            throw error;
        }
    });

    // API設定の保存と読み込み
    ipcMain.handle('save-api-key', async (_event, apiKey: string) => {
        try {
            const configPath = join(app.getPath('userData'), 'config.json');
            const encryptedKey = encryptApiKey(apiKey);
            fs.writeFileSync(configPath, JSON.stringify({ apiKey: encryptedKey }), 'utf8');
            return true;
        } catch (error) {
            console.error('API key save error:', error);
            return false;
        }
    });

    ipcMain.handle('load-api-key', async () => {
        try {
            const configPath = join(app.getPath('userData'), 'config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                return config.apiKey ? decryptApiKey(config.apiKey) : '';
            }
            return '';
        } catch (error) {
            console.error('API key load error:', error);
            return '';
        }
    });

    // CSPの設定
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    isDev ?
                    // 開発環境用CSP
                    `default-src 'self';
                     script-src 'self' ${isDev ? "'unsafe-eval'" : ''};
                     style-src 'self' 'unsafe-inline';
                     img-src 'self' data:;
                     font-src 'self' data:;
                     connect-src 'self' ws://localhost:5173 https://api-free.deepl.com/v2/;
                     object-src 'none';
                     base-uri 'self';
                     form-action 'self';
                     frame-ancestors 'none'` :
                    // 本番環境用CSP
                    `default-src 'self';
                     script-src 'self';
                     style-src 'self' 'unsafe-inline';
                     img-src 'self' data:;
                     font-src 'self' data:;
                     connect-src 'self' https://api-free.deepl.com/v2/;
                     object-src 'none';
                     base-uri 'self';
                     form-action 'self';
                     frame-ancestors 'none'`
                ]
            }
        });
    });

    mainWindow.loadURL(
      isDev ?
      "http://localhost:5173" :
      join(__dirname, "../../../../index.html")
    )

    if(isDev) {
      mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate",  function() {
    if(BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if(process.platform !== "darwin") app.quit();
});

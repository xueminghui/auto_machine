import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { join } from 'path';
import { createMenu } from '@/menu';
import { ChildProcess, fork } from 'child_process';
import chokidar from 'chokidar';

function createHelloWorker(win?: BrowserWindow): ChildProcess {
    const isDev = process.env.NODE_ENV === 'development';
    const workerPath = join(__dirname,
        isDev ? '../src/background-worker/start-background.ts'
            : './background/start-background.js'
    );

    let worker: ChildProcess | null = null;

    function setupWorkerMessageHandlers(worker: ChildProcess) {
        if (win) {
            // 接收来自渲染进程的消息，并转发给 worker
            ipcMain.removeAllListeners('message');  // 清理旧的监听器
            ipcMain.on('message', async (event, data) => {
                try {
                    if (worker && !worker.killed) {
                        worker.send(data);
                    }
                } catch (error) {
                    console.error('Error sending message to worker:', error);
                }
            });

            // 接收来自 worker 的消息，并转发给渲染进程
            worker.on('message', (message) => {
                try {
                    if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
                        console.log('[waht] main receive from worker:', message);
                        win.webContents.send('message', message);
                    }
                } catch (error) {
                    console.error('Error sending message to renderer:', error);
                }
            });

            // 监听窗口关闭事件
            win.on('closed', () => {
                if (worker && !worker.killed) {
                    worker.removeAllListeners('message');
                    worker.kill();
                }
            });
        }
    }

    function startWorker() {
        worker = fork(workerPath, [], {
            execArgv: isDev ? ['--import', 'tsx'] : []
        });
        setupWorkerMessageHandlers(worker);
    }

    function restartWorker() {
        if (worker) {
            worker.removeAllListeners('message');  // 清理旧的消息监听器
            worker.kill();
        }
        startWorker();
    }

    startWorker();

    if (isDev) {
        const watcher = chokidar.watch(workerPath, {
            ignored: /(^|[\/\\])\../,
            persistent: true
        });

        watcher.on('change', (path) => {
            console.log(`File ${path} has been changed. Restarting worker...`);
            restartWorker();
        });
    }

    return worker!;
}

const createWindow = async () => {
    const win = new BrowserWindow({
        width: 1600,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        }
    })

    // 创建并应用菜单
    createMenu(win);

    const worker = createHelloWorker(win);

    if (process.env.NODE_ENV === 'development') {
        console.log('[waht] Loading development URL...');
        await win.loadURL(process.env.VITE_DEV_SERVER_URL!)
    } else {
        await win.loadFile(
            path.join(__dirname, '../renderer/index.html'),
            {
                // 关键配置：设置根路径基准
                search: `?basePath=${path.dirname(__dirname)}`
            }
        )
    }
}

app.whenReady().then(() => {
    createWindow()
})

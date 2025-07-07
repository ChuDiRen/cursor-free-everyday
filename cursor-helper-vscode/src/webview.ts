import * as vscode from 'vscode';
import * as path from 'path';
import { DeviceIdGenerator, DeviceIds } from './deviceIdGenerator';
import { CursorConfigManager } from './cursorConfigManager';
import { RegistryManager } from './registryManager';
import { EmailCodeReceiver } from './emailCodeReceiver';

export class CursorHelperPanel {
    public static currentPanel: CursorHelperPanel | undefined;
    public static readonly viewType = 'cursorHelper';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // 如果已经有面板打开，则显示它
        if (CursorHelperPanel.currentPanel) {
            CursorHelperPanel.currentPanel._panel.reveal(column);
            return;
        }

        // 创建新面板
        const panel = vscode.window.createWebviewPanel(
            CursorHelperPanel.viewType,
            'Cursor Helper - 免费助手',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ]
            }
        );

        CursorHelperPanel.currentPanel = new CursorHelperPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // 设置初始HTML内容
        this._update();

        // 监听面板关闭事件
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // 处理来自webview的消息
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                await this._handleMessage(message);
            },
            null,
            this._disposables
        );
    }

    private async _handleMessage(message: any) {
        switch (message.type) {
            case 'resetDeviceId':
                await this._handleResetDeviceId();
                break;
            case 'getVerificationCode':
                await this._handleGetVerificationCode(message.email);
                break;
            case 'getCurrentStatus':
                await this._handleGetCurrentStatus();
                break;
            case 'testEmailServer':
                await this._handleTestEmailServer(message.serverUrl);
                break;
            case 'generateRandomEmail':
                await this._handleGenerateRandomEmail(message.domain);
                break;
            default:
                console.log('未知消息类型:', message.type);
        }
    }

    private async _handleResetDeviceId() {
        try {
            this._postMessage({
                type: 'resetDeviceIdProgress',
                data: { step: 'start', message: '开始重置设备ID...' }
            });

            // 检查管理员权限
            const hasAdminRights = await RegistryManager.checkAdminRights();
            if (!hasAdminRights) {
                this._postMessage({
                    type: 'resetDeviceIdError',
                    data: { message: '需要管理员权限才能修改注册表。请以管理员身份重新启动 VSCode。' }
                });
                return;
            }

            // 生成新的设备ID
            this._postMessage({
                type: 'resetDeviceIdProgress',
                data: { step: 'generate', message: '生成新的设备ID...' }
            });
            
            const deviceIds = DeviceIdGenerator.generateAllIds();

            // 关闭Cursor进程
            this._postMessage({
                type: 'resetDeviceIdProgress',
                data: { step: 'close', message: '关闭Cursor进程...' }
            });
            
            await CursorConfigManager.closeCursorProcesses();

            // 备份配置
            this._postMessage({
                type: 'resetDeviceIdProgress',
                data: { step: 'backup', message: '备份配置文件...' }
            });
            
            const backupPath = await CursorConfigManager.backupConfig();

            // 更新注册表
            this._postMessage({
                type: 'resetDeviceIdProgress',
                data: { step: 'registry', message: '更新注册表...' }
            });
            
            const registrySuccess = await RegistryManager.updateMachineGuid();
            if (!registrySuccess) {
                throw new Error('注册表更新失败');
            }

            // 更新配置文件
            this._postMessage({
                type: 'resetDeviceIdProgress',
                data: { step: 'config', message: '更新配置文件...' }
            });
            
            const configSuccess = await CursorConfigManager.updateStorageFile(deviceIds);
            if (!configSuccess) {
                throw new Error('配置文件更新失败');
            }

            // 完成
            this._postMessage({
                type: 'resetDeviceIdSuccess',
                data: {
                    message: '设备ID重置成功！请重启Cursor以应用新配置。',
                    deviceIds,
                    backupPath
                }
            });

        } catch (error) {
            this._postMessage({
                type: 'resetDeviceIdError',
                data: { message: error instanceof Error ? error.message : '未知错误' }
            });
        }
    }

    private async _handleGetVerificationCode(email: string) {
        try {
            this._postMessage({
                type: 'getVerificationCodeProgress',
                data: { message: `开始获取邮箱 ${email} 的验证码...` }
            });

            const emailReceiver = new EmailCodeReceiver();
            const code = await emailReceiver.getVerificationCode(email, (message) => {
                this._postMessage({
                    type: 'getVerificationCodeProgress',
                    data: { message }
                });
            });

            if (code) {
                this._postMessage({
                    type: 'getVerificationCodeSuccess',
                    data: { email, code }
                });
            } else {
                throw new Error('验证码获取失败');
            }

        } catch (error) {
            this._postMessage({
                type: 'getVerificationCodeError',
                data: { message: error instanceof Error ? error.message : '未知错误' }
            });
        }
    }

    private async _handleGetCurrentStatus() {
        try {
            const cursorVersion = await CursorConfigManager.getCursorVersion();
            const currentDeviceIds = await CursorConfigManager.getCurrentDeviceIds();
            const hasAdminRights = await RegistryManager.checkAdminRights();
            const currentMachineGuid = await RegistryManager.getCurrentMachineGuid();

            this._postMessage({
                type: 'currentStatus',
                data: {
                    cursorVersion,
                    currentDeviceIds,
                    hasAdminRights,
                    currentMachineGuid,
                    platform: process.platform
                }
            });
        } catch (error) {
            this._postMessage({
                type: 'statusError',
                data: { message: error instanceof Error ? error.message : '获取状态失败' }
            });
        }
    }

    private async _handleTestEmailServer(serverUrl: string) {
        try {
            const emailReceiver = new EmailCodeReceiver();
            const result = await emailReceiver.testConnection(serverUrl);
            
            this._postMessage({
                type: 'emailServerTestResult',
                data: result
            });
        } catch (error) {
            this._postMessage({
                type: 'emailServerTestResult',
                data: {
                    success: false,
                    error: error instanceof Error ? error.message : '测试失败'
                }
            });
        }
    }

    private async _handleGenerateRandomEmail(domain: string) {
        try {
            const randomEmail = EmailCodeReceiver.generateRandomEmail(domain);
            this._postMessage({
                type: 'randomEmailGenerated',
                data: { email: randomEmail }
            });
        } catch (error) {
            this._postMessage({
                type: 'randomEmailError',
                data: { message: error instanceof Error ? error.message : '生成失败' }
            });
        }
    }

    private _postMessage(message: any) {
        this._panel.webview.postMessage(message);
    }

    public dispose() {
        CursorHelperPanel.currentPanel = undefined;

        // 清理资源
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // 获取样式文件URI
        const styleResetUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css')
        );
        const styleVSCodeUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css')
        );
        const styleMainUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css')
        );

        // 获取脚本文件URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
        );

        // 生成nonce用于安全
        const nonce = this._getNonce();

        return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleResetUri}" rel="stylesheet">
            <link href="${styleVSCodeUri}" rel="stylesheet">
            <link href="${styleMainUri}" rel="stylesheet">
            <title>Cursor Helper</title>
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>🚀 Cursor Helper - 免费助手</h1>
                    <p>完全免费的 Cursor 助手工具，提供设备ID重置、邮箱验证码接收等功能</p>
                </header>

                <main>
                    <section class="status-section">
                        <h2>📊 当前状态</h2>
                        <div id="status-info">
                            <p>正在加载状态信息...</p>
                        </div>
                        <button id="refresh-status" class="button">刷新状态</button>
                    </section>

                    <section class="device-id-section">
                        <h2>🔄 设备ID重置</h2>
                        <p>重置Cursor的设备标识符以获取新的免费额度</p>
                        <div id="device-id-progress" class="progress-info" style="display: none;"></div>
                        <div id="device-id-result" class="result-info" style="display: none;"></div>
                        <button id="reset-device-id" class="button primary">重置设备ID</button>
                    </section>

                    <section class="email-section">
                        <h2>📧 邮箱验证码</h2>
                        <p>获取临时邮箱的验证码用于注册</p>
                        <div class="input-group">
                            <input type="email" id="email-input" placeholder="输入邮箱地址" />
                            <button id="generate-email" class="button secondary">生成随机邮箱</button>
                        </div>
                        <div id="email-progress" class="progress-info" style="display: none;"></div>
                        <div id="email-result" class="result-info" style="display: none;"></div>
                        <button id="get-verification-code" class="button primary">获取验证码</button>
                    </section>

                    <section class="settings-section">
                        <h2>⚙️ 设置</h2>
                        <div class="input-group">
                            <label for="server-url">邮箱服务器地址:</label>
                            <input type="url" id="server-url" placeholder="http://example.com:5362" />
                            <button id="test-server" class="button secondary">测试连接</button>
                        </div>
                    </section>
                </main>

                <footer>
                    <p>⚠️ 本工具仅供学习交流使用，请勿用于商业用途</p>
                    <p>🔗 <a href="https://github.com/ChuDiRen/cursor-free-everyday">GitHub项目地址</a></p>
                </footer>
            </div>

            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}

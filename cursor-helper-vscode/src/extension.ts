import * as vscode from 'vscode';
import { CursorHelperPanel } from './webview';
import { DeviceIdGenerator } from './deviceIdGenerator';
import { CursorConfigManager } from './cursorConfigManager';
import { RegistryManager } from './registryManager';
import { EmailCodeReceiver } from './emailCodeReceiver';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    console.log('Cursor Helper 插件正在激活...');

    // 创建输出通道
    outputChannel = vscode.window.createOutputChannel('Cursor Helper');
    outputChannel.appendLine('='.repeat(50));
    outputChannel.appendLine('🚀 Cursor Helper 插件已启动');
    outputChannel.appendLine(`📅 启动时间: ${new Date().toLocaleString()}`);
    outputChannel.appendLine(`📍 插件版本: ${context.extension.packageJSON.version}`);
    outputChannel.appendLine('='.repeat(50));

    // 注册命令：打开主面板
    const openCommand = vscode.commands.registerCommand('cursor-helper.open', () => {
        CursorHelperPanel.createOrShow(context.extensionUri);
    });

    // 注册命令：重置设备ID
    const resetDeviceIdCommand = vscode.commands.registerCommand('cursor-helper.resetDeviceId', async () => {
        await resetDeviceId();
    });

    // 注册命令：获取邮箱验证码
    const getVerificationCodeCommand = vscode.commands.registerCommand('cursor-helper.getVerificationCode', async () => {
        await getVerificationCode();
    });

    // 添加到订阅列表
    context.subscriptions.push(
        openCommand,
        resetDeviceIdCommand,
        getVerificationCodeCommand,
        outputChannel
    );

    // 创建状态栏项目
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(tools) Cursor Helper";
    statusBarItem.tooltip = "点击打开 Cursor Helper 面板";
    statusBarItem.command = 'cursor-helper.open';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // 显示欢迎信息
    vscode.window.showInformationMessage(
        '🎉 Cursor Helper 已就绪！使用 Ctrl+Shift+C 或点击状态栏图标开始使用。',
        '打开面板',
        '查看帮助'
    ).then(selection => {
        if (selection === '打开面板') {
            vscode.commands.executeCommand('cursor-helper.open');
        } else if (selection === '查看帮助') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/ChuDiRen/cursor-free-everyday'));
        }
    });

    outputChannel.appendLine('✅ 插件激活完成，所有功能已就绪');
}

async function resetDeviceId() {
    const startTime = Date.now();
    try {
        outputChannel.show();
        outputChannel.appendLine('');
        outputChannel.appendLine('🔄 开始重置设备ID操作...');
        outputChannel.appendLine(`⏰ 开始时间: ${new Date().toLocaleString()}`);

        // 检查管理员权限
        outputChannel.appendLine('🔍 检查管理员权限...');
        const hasAdminRights = await RegistryManager.checkAdminRights();
        if (!hasAdminRights) {
            const message = '⚠️ 需要管理员权限才能修改注册表。请以管理员身份重新启动 VSCode。';
            outputChannel.appendLine(message);

            vscode.window.showWarningMessage(
                message,
                '了解更多',
                '查看帮助'
            ).then(selection => {
                if (selection === '了解更多') {
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/ChuDiRen/cursor-free-everyday'));
                } else if (selection === '查看帮助') {
                    outputChannel.appendLine(RegistryManager.getAdminRightsMessage());
                }
            });
            return;
        }
        outputChannel.appendLine('✅ 管理员权限检查通过');

        // 显示进度
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "🔄 重置设备ID",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "生成新的设备ID..." });
            outputChannel.appendLine('🎲 生成新的设备ID...');

            // 生成新的设备ID
            const deviceIds = DeviceIdGenerator.generateAllIds();
            outputChannel.appendLine('✅ 设备ID生成完成:');
            outputChannel.appendLine(DeviceIdGenerator.formatIds(deviceIds));

            progress.report({ increment: 20, message: "关闭Cursor进程..." });
            outputChannel.appendLine('🔄 关闭Cursor进程...');

            // 关闭Cursor进程
            await CursorConfigManager.closeCursorProcesses();
            outputChannel.appendLine('✅ Cursor进程已关闭');

            progress.report({ increment: 40, message: "备份配置文件..." });
            outputChannel.appendLine('💾 备份配置文件...');

            // 备份配置
            const backupPath = await CursorConfigManager.backupConfig();
            if (backupPath) {
                outputChannel.appendLine(`✅ 配置已备份到: ${backupPath}`);
            } else {
                outputChannel.appendLine('⚠️ 配置备份跳过（文件不存在或备份失败）');
            }

            progress.report({ increment: 60, message: "更新注册表..." });
            outputChannel.appendLine('🔧 更新注册表...');

            // 更新注册表
            const registrySuccess = await RegistryManager.updateMachineGuid();
            if (!registrySuccess) {
                throw new Error('注册表更新失败');
            }
            outputChannel.appendLine('✅ 注册表更新成功');

            progress.report({ increment: 80, message: "更新配置文件..." });
            outputChannel.appendLine('📝 更新配置文件...');

            // 更新配置文件
            const configSuccess = await CursorConfigManager.updateStorageFile(deviceIds);
            if (!configSuccess) {
                throw new Error('配置文件更新失败');
            }
            outputChannel.appendLine('✅ 配置文件更新成功');

            progress.report({ increment: 100, message: "完成!" });
        });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        outputChannel.appendLine('');
        outputChannel.appendLine('🎉 设备ID重置完成！');
        outputChannel.appendLine(`⏱️ 总耗时: ${duration}秒`);
        outputChannel.appendLine(`⏰ 完成时间: ${new Date().toLocaleString()}`);
        outputChannel.appendLine('📌 请重启Cursor以应用新配置');

        vscode.window.showInformationMessage(
            `🎉 设备ID重置成功！耗时${duration}秒，请重启Cursor以应用新配置。`,
            '查看日志',
            '打开Cursor'
        ).then(selection => {
            if (selection === '查看日志') {
                outputChannel.show();
            } else if (selection === '打开Cursor') {
                // 尝试启动Cursor
                vscode.env.openExternal(vscode.Uri.parse('cursor://'));
            }
        });

    } catch (error) {
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const errorMessage = error instanceof Error ? error.message : '未知错误';

        outputChannel.appendLine('');
        outputChannel.appendLine('❌ 设备ID重置失败！');
        outputChannel.appendLine(`⚠️ 错误信息: ${errorMessage}`);
        outputChannel.appendLine(`⏱️ 失败前耗时: ${duration}秒`);
        outputChannel.appendLine(`⏰ 失败时间: ${new Date().toLocaleString()}`);

        if (error instanceof Error && error.stack) {
            outputChannel.appendLine('📋 详细错误堆栈:');
            outputChannel.appendLine(error.stack);
        }

        vscode.window.showErrorMessage(
            `❌ 设备ID重置失败: ${errorMessage}`,
            '查看日志',
            '重试',
            '获取帮助'
        ).then(selection => {
            if (selection === '查看日志') {
                outputChannel.show();
            } else if (selection === '重试') {
                resetDeviceId();
            } else if (selection === '获取帮助') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/ChuDiRen/cursor-free-everyday/issues'));
            }
        });
    }
}

async function getVerificationCode() {
    const startTime = Date.now();
    try {
        // 提供快速选择选项
        const quickOptions = [
            '$(mail) 输入自定义邮箱',
            '$(symbol-misc) 生成随机邮箱',
            '$(history) 使用最近的邮箱'
        ];

        const selection = await vscode.window.showQuickPick(quickOptions, {
            placeHolder: '选择邮箱输入方式'
        });

        if (!selection) {
            return;
        }

        let email: string | undefined;

        if (selection.includes('输入自定义邮箱')) {
            // 获取用户输入的邮箱地址
            email = await vscode.window.showInputBox({
                prompt: '请输入邮箱地址',
                placeholder: 'example@storetaikhoan.com',
                validateInput: (value) => {
                    if (!value) {
                        return '邮箱地址不能为空';
                    }
                    const validation = EmailCodeReceiver.validateEmail(value);
                    return validation.valid ? null : validation.message;
                }
            });
        } else if (selection.includes('生成随机邮箱')) {
            const domains = EmailCodeReceiver.getAvailableDomains();
            const selectedDomain = await vscode.window.showQuickPick(domains, {
                placeHolder: '选择邮箱域名'
            });
            if (selectedDomain) {
                email = EmailCodeReceiver.generateRandomEmail(selectedDomain);
                vscode.window.showInformationMessage(`已生成随机邮箱: ${email}`);
            }
        }

        if (!email) {
            return;
        }

        outputChannel.show();
        outputChannel.appendLine('');
        outputChannel.appendLine('📧 开始获取邮箱验证码...');
        outputChannel.appendLine(`📮 目标邮箱: ${email}`);
        outputChannel.appendLine(`⏰ 开始时间: ${new Date().toLocaleString()}`);

        // 显示进度
        const code = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "📧 获取验证码",
            cancellable: true
        }, async (progress, token) => {
            progress.report({ increment: 0, message: "连接服务器..." });

            const emailReceiver = new EmailCodeReceiver();
            return await emailReceiver.getVerificationCode(email, (message) => {
                progress.report({ message });
                outputChannel.appendLine(`📝 ${message}`);
            }, token);
        });

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        if (code) {
            outputChannel.appendLine('');
            outputChannel.appendLine('🎉 验证码获取成功！');
            outputChannel.appendLine(`📧 邮箱: ${email}`);
            outputChannel.appendLine(`🔢 验证码: ${code}`);
            outputChannel.appendLine(`⏱️ 耗时: ${duration}秒`);
            outputChannel.appendLine(`⏰ 完成时间: ${new Date().toLocaleString()}`);

            // 显示验证码并提供复制选项
            const action = await vscode.window.showInformationMessage(
                `🎉 验证码获取成功: ${code} (耗时${duration}秒)`,
                '复制到剪贴板',
                '查看日志',
                '再次获取'
            );

            if (action === '复制到剪贴板') {
                await vscode.env.clipboard.writeText(code);
                vscode.window.showInformationMessage('✅ 验证码已复制到剪贴板');
            } else if (action === '查看日志') {
                outputChannel.show();
            } else if (action === '再次获取') {
                getVerificationCode();
            }
        } else {
            outputChannel.appendLine('');
            outputChannel.appendLine('❌ 验证码获取失败');
            outputChannel.appendLine(`⏱️ 失败前耗时: ${duration}秒`);
            outputChannel.appendLine(`⏰ 失败时间: ${new Date().toLocaleString()}`);

            vscode.window.showErrorMessage(
                '❌ 验证码获取失败，请查看输出日志了解详情',
                '查看日志',
                '重试',
                '更换邮箱'
            ).then(selection => {
                if (selection === '查看日志') {
                    outputChannel.show();
                } else if (selection === '重试') {
                    getVerificationCode();
                } else if (selection === '更换邮箱') {
                    getVerificationCode();
                }
            });
        }

    } catch (error) {
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const errorMessage = error instanceof Error ? error.message : '未知错误';

        outputChannel.appendLine('');
        outputChannel.appendLine('❌ 验证码获取过程中发生错误！');
        outputChannel.appendLine(`⚠️ 错误信息: ${errorMessage}`);
        outputChannel.appendLine(`⏱️ 失败前耗时: ${duration}秒`);
        outputChannel.appendLine(`⏰ 失败时间: ${new Date().toLocaleString()}`);

        if (error instanceof Error && error.stack) {
            outputChannel.appendLine('📋 详细错误堆栈:');
            outputChannel.appendLine(error.stack);
        }

        vscode.window.showErrorMessage(
            `❌ 验证码获取失败: ${errorMessage}`,
            '查看日志',
            '重试',
            '获取帮助'
        ).then(selection => {
            if (selection === '查看日志') {
                outputChannel.show();
            } else if (selection === '重试') {
                getVerificationCode();
            } else if (selection === '获取帮助') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/ChuDiRen/cursor-free-everyday/issues'));
            }
        });
    }
}

export function deactivate() {
    outputChannel?.appendLine('');
    outputChannel?.appendLine('👋 Cursor Helper 插件正在停用...');
    outputChannel?.appendLine(`⏰ 停用时间: ${new Date().toLocaleString()}`);
    outputChannel?.dispose();
    console.log('Cursor Helper 插件已停用');
}

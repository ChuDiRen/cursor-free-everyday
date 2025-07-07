import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export class RegistryManager {
    private static readonly REGISTRY_PATH = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography';
    private static readonly REGISTRY_KEY = 'MachineGuid';

    /**
     * 检查是否有管理员权限
     */
    static async checkAdminRights(): Promise<boolean> {
        if (os.platform() !== 'win32') {
            return true; // 非Windows系统不需要注册表操作
        }

        try {
            // 尝试读取需要管理员权限的注册表项
            await execAsync(`reg query "${this.REGISTRY_PATH}" /v ${this.REGISTRY_KEY}`);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取当前的MachineGuid
     */
    static async getCurrentMachineGuid(): Promise<string | null> {
        if (os.platform() !== 'win32') {
            return null;
        }

        try {
            const { stdout } = await execAsync(`reg query "${this.REGISTRY_PATH}" /v ${this.REGISTRY_KEY}`);
            
            // 解析注册表输出
            const lines = stdout.split('\n');
            for (const line of lines) {
                if (line.includes(this.REGISTRY_KEY)) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 3) {
                        return parts[2]; // 第三部分是值
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('获取MachineGuid失败:', error);
            return null;
        }
    }

    /**
     * 备份注册表项
     */
    static async backupRegistry(backupDir: string): Promise<string | null> {
        if (os.platform() !== 'win32') {
            return null;
        }

        try {
            // 确保备份目录存在
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // 生成备份文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `MachineGuid_${timestamp}.reg`;
            const backupFilePath = path.join(backupDir, backupFileName);

            // 导出注册表项
            const exportCommand = `reg export "${this.REGISTRY_PATH}" "${backupFilePath}" /y`;
            await execAsync(exportCommand);

            console.log(`注册表已备份到: ${backupFilePath}`);
            return backupFilePath;
        } catch (error) {
            console.error('备份注册表失败:', error);
            return null;
        }
    }

    /**
     * 更新MachineGuid
     */
    static async updateMachineGuid(backupDir?: string): Promise<boolean> {
        if (os.platform() !== 'win32') {
            console.log('非Windows系统，跳过注册表操作');
            return true;
        }

        try {
            // 检查管理员权限
            const hasAdminRights = await this.checkAdminRights();
            if (!hasAdminRights) {
                console.error('需要管理员权限才能修改注册表');
                return false;
            }

            // 获取当前值
            const currentGuid = await this.getCurrentMachineGuid();
            if (currentGuid) {
                console.log(`当前MachineGuid: ${currentGuid}`);
            }

            // 备份注册表
            if (backupDir) {
                const backupPath = await this.backupRegistry(backupDir);
                if (!backupPath) {
                    console.warn('注册表备份失败，但继续执行更新操作');
                }
            }

            // 生成新的GUID
            const newGuid = uuidv4();
            console.log(`新的MachineGuid: ${newGuid}`);

            // 更新注册表
            const updateCommand = `reg add "${this.REGISTRY_PATH}" /v ${this.REGISTRY_KEY} /t REG_SZ /d "${newGuid}" /f`;
            await execAsync(updateCommand);

            // 验证更新
            const updatedGuid = await this.getCurrentMachineGuid();
            if (updatedGuid === newGuid) {
                console.log('注册表更新成功并已验证');
                return true;
            } else {
                console.error('注册表更新验证失败');
                return false;
            }
        } catch (error) {
            console.error('更新MachineGuid失败:', error);
            return false;
        }
    }

    /**
     * 从备份恢复注册表
     */
    static async restoreFromBackup(backupFilePath: string): Promise<boolean> {
        if (os.platform() !== 'win32') {
            return true;
        }

        try {
            if (!fs.existsSync(backupFilePath)) {
                console.error(`备份文件不存在: ${backupFilePath}`);
                return false;
            }

            // 导入注册表备份
            const importCommand = `reg import "${backupFilePath}"`;
            await execAsync(importCommand);

            console.log(`注册表已从备份恢复: ${backupFilePath}`);
            return true;
        } catch (error) {
            console.error('从备份恢复注册表失败:', error);
            return false;
        }
    }

    /**
     * 验证注册表项是否存在
     */
    static async verifyRegistryKey(): Promise<boolean> {
        if (os.platform() !== 'win32') {
            return true;
        }

        try {
            await execAsync(`reg query "${this.REGISTRY_PATH}" /v ${this.REGISTRY_KEY}`);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取注册表操作的详细信息
     */
    static getRegistryInfo(): { path: string; key: string; platform: string } {
        return {
            path: this.REGISTRY_PATH,
            key: this.REGISTRY_KEY,
            platform: os.platform()
        };
    }

    /**
     * 检查是否需要注册表操作
     */
    static needsRegistryOperation(): boolean {
        return os.platform() === 'win32';
    }

    /**
     * 获取管理员权限提示信息
     */
    static getAdminRightsMessage(): string {
        return `需要管理员权限才能修改注册表。请按以下步骤操作：

1. 关闭当前的 VSCode
2. 右键点击 VSCode 图标
3. 选择"以管理员身份运行"
4. 重新打开此插件

注册表路径: ${this.REGISTRY_PATH}
注册表项: ${this.REGISTRY_KEY}`;
    }

    /**
     * 执行完整的注册表重置流程
     */
    static async performFullReset(backupDir: string): Promise<{
        success: boolean;
        backupPath?: string;
        oldGuid?: string;
        newGuid?: string;
        error?: string;
    }> {
        try {
            // 检查平台
            if (os.platform() !== 'win32') {
                return {
                    success: true,
                    error: '非Windows系统，跳过注册表操作'
                };
            }

            // 检查权限
            const hasAdminRights = await this.checkAdminRights();
            if (!hasAdminRights) {
                return {
                    success: false,
                    error: '需要管理员权限'
                };
            }

            // 获取当前GUID
            const oldGuid = await this.getCurrentMachineGuid();

            // 备份注册表
            const backupPath = await this.backupRegistry(backupDir);

            // 更新注册表
            const updateSuccess = await this.updateMachineGuid();
            if (!updateSuccess) {
                return {
                    success: false,
                    backupPath,
                    oldGuid,
                    error: '注册表更新失败'
                };
            }

            // 获取新GUID
            const newGuid = await this.getCurrentMachineGuid();

            return {
                success: true,
                backupPath,
                oldGuid,
                newGuid
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '未知错误'
            };
        }
    }
}

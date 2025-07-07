import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DeviceIds } from './deviceIdGenerator';

const execAsync = promisify(exec);

export class CursorConfigManager {
    /**
     * 获取Cursor配置文件路径
     */
    static getStorageFilePath(): string {
        const platform = os.platform();
        let configDir: string;

        switch (platform) {
            case 'win32':
                configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage');
                break;
            case 'darwin':
                configDir = path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage');
                break;
            case 'linux':
                configDir = path.join(os.homedir(), '.config', 'Cursor', 'User', 'globalStorage');
                break;
            default:
                throw new Error(`不支持的操作系统: ${platform}`);
        }

        return path.join(configDir, 'storage.json');
    }

    /**
     * 获取备份目录路径
     */
    static getBackupDirPath(): string {
        const storageDir = path.dirname(this.getStorageFilePath());
        return path.join(storageDir, 'backups');
    }

    /**
     * 获取Cursor package.json路径
     */
    static getCursorPackagePath(): string[] {
        const platform = os.platform();
        const possiblePaths: string[] = [];

        switch (platform) {
            case 'win32':
                const localAppData = path.join(os.homedir(), 'AppData', 'Local');
                possiblePaths.push(
                    path.join(localAppData, 'Programs', 'cursor', 'resources', 'app', 'package.json'),
                    path.join(localAppData, 'cursor', 'resources', 'app', 'package.json')
                );
                break;
            case 'darwin':
                possiblePaths.push(
                    '/Applications/Cursor.app/Contents/Resources/app/package.json'
                );
                break;
            case 'linux':
                possiblePaths.push(
                    '/opt/cursor/resources/app/package.json',
                    path.join(os.homedir(), '.local', 'share', 'cursor', 'resources', 'app', 'package.json')
                );
                break;
        }

        return possiblePaths;
    }

    /**
     * 获取Cursor版本信息
     */
    static async getCursorVersion(): Promise<string | null> {
        const possiblePaths = this.getCursorPackagePath();
        
        for (const packagePath of possiblePaths) {
            try {
                if (fs.existsSync(packagePath)) {
                    const packageContent = fs.readFileSync(packagePath, 'utf8');
                    const packageJson = JSON.parse(packageContent);
                    return packageJson.version || null;
                }
            } catch (error) {
                console.error(`读取package.json失败: ${packagePath}`, error);
            }
        }
        
        return null;
    }

    /**
     * 检查Cursor是否已安装
     */
    static async isCursorInstalled(): Promise<boolean> {
        const version = await this.getCursorVersion();
        return version !== null;
    }

    /**
     * 关闭Cursor进程
     */
    static async closeCursorProcesses(): Promise<void> {
        const platform = os.platform();
        
        try {
            switch (platform) {
                case 'win32':
                    // Windows: 使用taskkill命令
                    await execAsync('taskkill /F /IM Cursor.exe /T 2>nul || echo "No Cursor process found"');
                    await execAsync('taskkill /F /IM cursor.exe /T 2>nul || echo "No cursor process found"');
                    break;
                case 'darwin':
                case 'linux':
                    // macOS/Linux: 使用pkill命令
                    await execAsync('pkill -f Cursor || true');
                    await execAsync('pkill -f cursor || true');
                    break;
            }
            
            // 等待进程完全关闭
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error('关闭Cursor进程时出错:', error);
            // 不抛出错误，因为进程可能本来就没有运行
        }
    }

    /**
     * 备份配置文件
     */
    static async backupConfig(): Promise<string | null> {
        try {
            const storageFilePath = this.getStorageFilePath();
            const backupDirPath = this.getBackupDirPath();
            
            if (!fs.existsSync(storageFilePath)) {
                console.log('配置文件不存在，无需备份');
                return null;
            }

            // 创建备份目录
            if (!fs.existsSync(backupDirPath)) {
                fs.mkdirSync(backupDirPath, { recursive: true });
            }

            // 生成备份文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `storage.json.backup_${timestamp}`;
            const backupFilePath = path.join(backupDirPath, backupFileName);

            // 复制文件
            fs.copyFileSync(storageFilePath, backupFilePath);
            
            console.log(`配置已备份到: ${backupFilePath}`);
            return backupFilePath;
        } catch (error) {
            console.error('备份配置文件失败:', error);
            return null;
        }
    }

    /**
     * 更新存储配置文件
     */
    static async updateStorageFile(deviceIds: DeviceIds): Promise<boolean> {
        try {
            const storageFilePath = this.getStorageFilePath();
            
            if (!fs.existsSync(storageFilePath)) {
                console.error(`配置文件不存在: ${storageFilePath}`);
                console.log('请先安装并运行Cursor一次，然后再使用此工具');
                return false;
            }

            // 读取原始配置
            const originalContent = fs.readFileSync(storageFilePath, 'utf8');
            let config: any;
            
            try {
                config = JSON.parse(originalContent);
            } catch (parseError) {
                console.error('解析配置文件JSON失败:', parseError);
                return false;
            }

            // 确保telemetry对象存在
            if (!config.telemetry || typeof config.telemetry !== 'object') {
                config.telemetry = {};
            }

            // 更新设备ID
            config.telemetry.machineId = deviceIds.machineId;
            config.telemetry.macMachineId = deviceIds.macMachineId;
            config.telemetry.devDeviceId = deviceIds.devDeviceId;
            config.telemetry.sqmId = deviceIds.sqmId;

            // 写入更新后的配置
            const updatedContent = JSON.stringify(config, null, 2);
            fs.writeFileSync(storageFilePath, updatedContent, 'utf8');
            
            console.log(`配置文件更新成功: ${storageFilePath}`);
            return true;
        } catch (error) {
            console.error('更新配置文件失败:', error);
            return false;
        }
    }

    /**
     * 读取当前配置文件中的设备ID
     */
    static async getCurrentDeviceIds(): Promise<DeviceIds | null> {
        try {
            const storageFilePath = this.getStorageFilePath();
            
            if (!fs.existsSync(storageFilePath)) {
                return null;
            }

            const content = fs.readFileSync(storageFilePath, 'utf8');
            const config = JSON.parse(content);
            
            if (!config.telemetry) {
                return null;
            }

            return {
                machineId: config.telemetry.machineId || '',
                macMachineId: config.telemetry.macMachineId || '',
                devDeviceId: config.telemetry.devDeviceId || '',
                sqmId: config.telemetry.sqmId || ''
            };
        } catch (error) {
            console.error('读取当前设备ID失败:', error);
            return null;
        }
    }

    /**
     * 恢复配置文件从备份
     */
    static async restoreFromBackup(backupFilePath: string): Promise<boolean> {
        try {
            const storageFilePath = this.getStorageFilePath();
            
            if (!fs.existsSync(backupFilePath)) {
                console.error(`备份文件不存在: ${backupFilePath}`);
                return false;
            }

            fs.copyFileSync(backupFilePath, storageFilePath);
            console.log(`配置已从备份恢复: ${backupFilePath}`);
            return true;
        } catch (error) {
            console.error('从备份恢复配置失败:', error);
            return false;
        }
    }

    /**
     * 列出所有备份文件
     */
    static async listBackups(): Promise<string[]> {
        try {
            const backupDirPath = this.getBackupDirPath();
            
            if (!fs.existsSync(backupDirPath)) {
                return [];
            }

            const files = fs.readdirSync(backupDirPath);
            return files
                .filter(file => file.startsWith('storage.json.backup_'))
                .map(file => path.join(backupDirPath, file))
                .sort((a, b) => {
                    const statA = fs.statSync(a);
                    const statB = fs.statSync(b);
                    return statB.mtime.getTime() - statA.mtime.getTime(); // 按修改时间倒序
                });
        } catch (error) {
            console.error('列出备份文件失败:', error);
            return [];
        }
    }

    /**
     * 清理旧的备份文件（保留最新的10个）
     */
    static async cleanupOldBackups(keepCount: number = 10): Promise<void> {
        try {
            const backups = await this.listBackups();
            
            if (backups.length <= keepCount) {
                return;
            }

            const toDelete = backups.slice(keepCount);
            for (const backupPath of toDelete) {
                fs.unlinkSync(backupPath);
                console.log(`已删除旧备份: ${backupPath}`);
            }
        } catch (error) {
            console.error('清理旧备份失败:', error);
        }
    }
}

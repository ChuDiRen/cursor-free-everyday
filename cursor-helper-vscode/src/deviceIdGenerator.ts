import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface DeviceIds {
    machineId: string;
    macMachineId: string;
    devDeviceId: string;
    sqmId: string;
}

export class DeviceIdGenerator {
    /**
     * 生成标准格式的机器ID (UUID v4格式)
     * 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
     */
    static generateMachineId(): string {
        const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
        return template.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * 生成带auth0前缀的机器ID
     * 格式: auth0|user_ + 32位随机十六进制字符
     */
    static generateAuthMachineId(): string {
        const prefix = Buffer.from('auth0|user_').toString('hex');
        const randomPart = this.getRandomHex(32);
        return prefix + randomPart;
    }

    /**
     * 生成设备ID (UUID v4)
     */
    static generateDeviceId(): string {
        return uuidv4();
    }

    /**
     * 生成SQM ID (大写UUID v4，带花括号)
     * 格式: {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}
     */
    static generateSqmId(): string {
        return `{${uuidv4().toUpperCase()}}`;
    }

    /**
     * 生成指定长度的随机十六进制字符串
     */
    static getRandomHex(length: number): string {
        return randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length)
            .toLowerCase();
    }

    /**
     * 生成所有需要的设备ID
     */
    static generateAllIds(): DeviceIds {
        return {
            machineId: this.generateAuthMachineId(),
            macMachineId: this.generateMachineId(),
            devDeviceId: this.generateDeviceId(),
            sqmId: this.generateSqmId()
        };
    }

    /**
     * 验证UUID格式是否正确
     */
    static isValidUuid(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * 验证机器ID格式是否正确
     */
    static isValidMachineId(machineId: string): boolean {
        // 检查auth0前缀格式
        if (machineId.startsWith('auth0|user_')) {
            return machineId.length > 11; // auth0|user_ 后面应该有更多字符
        }
        
        // 检查UUID格式
        return this.isValidUuid(machineId);
    }

    /**
     * 生成用于测试的示例ID
     */
    static generateTestIds(): DeviceIds {
        return {
            machineId: 'auth0|user_' + this.getRandomHex(32),
            macMachineId: '12345678-1234-4567-8901-123456789012',
            devDeviceId: '87654321-4321-4321-4321-210987654321',
            sqmId: '{ABCDEFGH-IJKL-MNOP-QRST-UVWXYZ123456}'
        };
    }

    /**
     * 格式化显示设备ID信息
     */
    static formatIds(ids: DeviceIds): string {
        return `设备ID信息:
├── Machine ID: ${ids.machineId}
├── Mac Machine ID: ${ids.macMachineId}
├── Device ID: ${ids.devDeviceId}
└── SQM ID: ${ids.sqmId}`;
    }

    /**
     * 将设备ID转换为JSON字符串
     */
    static toJson(ids: DeviceIds): string {
        return JSON.stringify(ids, null, 2);
    }

    /**
     * 从JSON字符串解析设备ID
     */
    static fromJson(json: string): DeviceIds | null {
        try {
            const parsed = JSON.parse(json);
            if (this.validateIds(parsed)) {
                return parsed as DeviceIds;
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * 验证设备ID对象是否有效
     */
    static validateIds(ids: any): boolean {
        return (
            typeof ids === 'object' &&
            typeof ids.machineId === 'string' &&
            typeof ids.macMachineId === 'string' &&
            typeof ids.devDeviceId === 'string' &&
            typeof ids.sqmId === 'string' &&
            ids.machineId.length > 0 &&
            ids.macMachineId.length > 0 &&
            ids.devDeviceId.length > 0 &&
            ids.sqmId.length > 0
        );
    }
}

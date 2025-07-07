import axios, { AxiosResponse } from 'axios';
import * as vscode from 'vscode';

interface CodeResponse {
    success: boolean;
    code?: string;
    message?: string;
}

interface HealthResponse {
    status: string;
    timestamp?: number;
}

export class EmailCodeReceiver {
    private readonly defaultServerUrl = 'http://14.103.190.198:5362';
    private readonly maxRetries = 3;
    private readonly retryInterval = 3000; // 3秒

    /**
     * 获取配置的服务器地址
     */
    private getServerUrl(): string {
        const config = vscode.workspace.getConfiguration('cursor-helper');
        return config.get<string>('emailServer') || this.defaultServerUrl;
    }

    /**
     * 检查服务器健康状态
     */
    async checkServerHealth(serverUrl?: string): Promise<boolean> {
        const url = serverUrl || this.getServerUrl();
        
        try {
            const response: AxiosResponse<HealthResponse> = await axios.get(
                `${url}/health`,
                { timeout: 5000 }
            );
            
            return response.status === 200 && response.data.status === 'ok';
        } catch (error) {
            console.error('服务器健康检查失败:', error);
            return false;
        }
    }

    /**
     * 获取邮箱验证码
     */
    async getVerificationCode(
        email: string,
        progressCallback?: (message: string) => void,
        cancellationToken?: vscode.CancellationToken
    ): Promise<string | null> {
        const serverUrl = this.getServerUrl();
        
        // 检查服务器健康状态
        progressCallback?.('检查服务器状态...');
        const isHealthy = await this.checkServerHealth(serverUrl);
        if (!isHealthy) {
            throw new Error('服务器不可用，请检查网络连接或更换服务器地址');
        }

        progressCallback?.(`开始获取邮箱 ${email} 的验证码...`);

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            // 检查是否被取消
            if (cancellationToken?.isCancellationRequested) {
                throw new Error('操作已取消');
            }

            try {
                progressCallback?.(`尝试 ${attempt}/${this.maxRetries}: 请求验证码...`);
                
                const response: AxiosResponse<CodeResponse> = await axios.get(
                    `${serverUrl}/get_code`,
                    {
                        params: { email },
                        timeout: 30000
                    }
                );

                if (response.status === 200 && response.data.success && response.data.code) {
                    progressCallback?.(`成功获取验证码: ${response.data.code}`);
                    return response.data.code;
                } else {
                    const message = response.data.message || '未找到验证码';
                    progressCallback?.(`请求失败: ${message}`);
                }
            } catch (error) {
                const errorMessage = this.getErrorMessage(error);
                progressCallback?.(`请求出错: ${errorMessage}`);
                
                if (attempt === this.maxRetries) {
                    throw new Error(`获取验证码失败: ${errorMessage}`);
                }
            }

            // 如果不是最后一次尝试，等待后重试
            if (attempt < this.maxRetries) {
                const waitTime = this.retryInterval * attempt;
                progressCallback?.(`等待 ${waitTime / 1000} 秒后重试...`);
                
                await this.delay(waitTime);
            }
        }

        throw new Error('达到最大重试次数，获取验证码失败');
    }

    /**
     * 批量获取多个邮箱的验证码
     */
    async getMultipleVerificationCodes(
        emails: string[],
        progressCallback?: (message: string) => void,
        cancellationToken?: vscode.CancellationToken
    ): Promise<{ [email: string]: string | null }> {
        const results: { [email: string]: string | null } = {};
        
        for (let i = 0; i < emails.length; i++) {
            if (cancellationToken?.isCancellationRequested) {
                break;
            }

            const email = emails[i];
            progressCallback?.(`处理邮箱 ${i + 1}/${emails.length}: ${email}`);
            
            try {
                const code = await this.getVerificationCode(email, progressCallback, cancellationToken);
                results[email] = code;
            } catch (error) {
                progressCallback?.(`邮箱 ${email} 获取失败: ${this.getErrorMessage(error)}`);
                results[email] = null;
            }

            // 在处理下一个邮箱前稍作延迟
            if (i < emails.length - 1) {
                await this.delay(1000);
            }
        }

        return results;
    }

    /**
     * 验证邮箱地址格式
     */
    static validateEmail(email: string): { valid: boolean; message?: string } {
        if (!email) {
            return { valid: false, message: '邮箱地址不能为空' };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, message: '邮箱地址格式不正确' };
        }

        return { valid: true };
    }

    /**
     * 生成随机邮箱地址
     */
    static generateRandomEmail(domain: string): string {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let prefix = '';
        
        for (let i = 0; i < 10; i++) {
            prefix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return `${prefix}@${domain}`;
    }

    /**
     * 获取可用的邮箱域名列表
     */
    static getAvailableDomains(): string[] {
        return [
            'storetaikhoan.com',
            'portaltrendsarena.com',
            'elementfx.com',
            // 注意：根据Domain Address.txt，这些域名可能已失效
            // 实际使用时需要更新为可用的域名
        ];
    }

    /**
     * 测试服务器连接
     */
    async testConnection(serverUrl?: string): Promise<{
        success: boolean;
        responseTime?: number;
        error?: string;
    }> {
        const url = serverUrl || this.getServerUrl();
        const startTime = Date.now();
        
        try {
            const response = await axios.get(`${url}/health`, { timeout: 10000 });
            const responseTime = Date.now() - startTime;
            
            return {
                success: response.status === 200,
                responseTime
            };
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * 获取服务器状态信息
     */
    async getServerStatus(serverUrl?: string): Promise<{
        online: boolean;
        responseTime?: number;
        version?: string;
        error?: string;
    }> {
        const url = serverUrl || this.getServerUrl();
        
        try {
            const startTime = Date.now();
            const response = await axios.get(`${url}/status`, { timeout: 5000 });
            const responseTime = Date.now() - startTime;
            
            return {
                online: true,
                responseTime,
                version: response.data.version
            };
        } catch (error) {
            return {
                online: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取错误信息
     */
    private getErrorMessage(error: any): string {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                return `HTTP ${error.response.status}: ${error.response.statusText}`;
            } else if (error.request) {
                return '网络请求失败，请检查网络连接';
            } else {
                return error.message;
            }
        } else if (error instanceof Error) {
            return error.message;
        } else {
            return '未知错误';
        }
    }

    /**
     * 格式化验证码显示
     */
    static formatVerificationCode(code: string): string {
        return `验证码: ${code}`;
    }

    /**
     * 复制验证码到剪贴板
     */
    static async copyToClipboard(code: string): Promise<void> {
        await vscode.env.clipboard.writeText(code);
    }
}

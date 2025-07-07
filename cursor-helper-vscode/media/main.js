// VSCode Webview JavaScript
(function() {
    const vscode = acquireVsCodeApi();

    // DOM elements
    const refreshStatusBtn = document.getElementById('refresh-status');
    const resetDeviceIdBtn = document.getElementById('reset-device-id');
    const getVerificationCodeBtn = document.getElementById('get-verification-code');
    const generateEmailBtn = document.getElementById('generate-email');
    const testServerBtn = document.getElementById('test-server');
    
    const statusInfo = document.getElementById('status-info');
    const deviceIdProgress = document.getElementById('device-id-progress');
    const deviceIdResult = document.getElementById('device-id-result');
    const emailProgress = document.getElementById('email-progress');
    const emailResult = document.getElementById('email-result');
    
    const emailInput = document.getElementById('email-input');
    const serverUrlInput = document.getElementById('server-url');

    // Available domains for random email generation
    const availableDomains = [
        'storetaikhoan.com',
        'portaltrendsarena.com',
        'elementfx.com'
    ];

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        loadCurrentStatus();
        setupEventListeners();
        loadSettings();
    });

    function setupEventListeners() {
        refreshStatusBtn.addEventListener('click', loadCurrentStatus);
        resetDeviceIdBtn.addEventListener('click', resetDeviceId);
        getVerificationCodeBtn.addEventListener('click', getVerificationCode);
        generateEmailBtn.addEventListener('click', generateRandomEmail);
        testServerBtn.addEventListener('click', testEmailServer);
        
        // Save server URL when changed
        serverUrlInput.addEventListener('change', saveSettings);
    }

    function loadSettings() {
        // Load default server URL
        serverUrlInput.value = 'http://14.103.190.198:5362';
    }

    function saveSettings() {
        // Settings are handled by VSCode configuration
        // This is just for UI feedback
    }

    function loadCurrentStatus() {
        showLoading(statusInfo);
        vscode.postMessage({ type: 'getCurrentStatus' });
    }

    function resetDeviceId() {
        if (!confirm('确定要重置设备ID吗？这将关闭Cursor进程并修改系统配置。')) {
            return;
        }

        setButtonState(resetDeviceIdBtn, true);
        hideElement(deviceIdResult);
        showElement(deviceIdProgress);
        
        vscode.postMessage({ type: 'resetDeviceId' });
    }

    function getVerificationCode() {
        const email = emailInput.value.trim();
        if (!email) {
            showError(emailResult, '请输入邮箱地址');
            return;
        }

        if (!isValidEmail(email)) {
            showError(emailResult, '请输入有效的邮箱地址');
            return;
        }

        setButtonState(getVerificationCodeBtn, true);
        hideElement(emailResult);
        showElement(emailProgress);
        
        vscode.postMessage({ 
            type: 'getVerificationCode',
            email: email
        });
    }

    function generateRandomEmail() {
        const randomDomain = availableDomains[Math.floor(Math.random() * availableDomains.length)];
        vscode.postMessage({ 
            type: 'generateRandomEmail',
            domain: randomDomain
        });
    }

    function testEmailServer() {
        const serverUrl = serverUrlInput.value.trim();
        if (!serverUrl) {
            alert('请输入服务器地址');
            return;
        }

        setButtonState(testServerBtn, true);
        vscode.postMessage({ 
            type: 'testEmailServer',
            serverUrl: serverUrl
        });
    }

    // Message handler
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'currentStatus':
                displayCurrentStatus(message.data);
                break;
            case 'statusError':
                showError(statusInfo, message.data.message);
                break;
            case 'resetDeviceIdProgress':
                updateProgress(deviceIdProgress, message.data.message);
                break;
            case 'resetDeviceIdSuccess':
                handleResetSuccess(message.data);
                break;
            case 'resetDeviceIdError':
                handleResetError(message.data.message);
                break;
            case 'getVerificationCodeProgress':
                updateProgress(emailProgress, message.data.message);
                break;
            case 'getVerificationCodeSuccess':
                handleEmailSuccess(message.data);
                break;
            case 'getVerificationCodeError':
                handleEmailError(message.data.message);
                break;
            case 'randomEmailGenerated':
                emailInput.value = message.data.email;
                break;
            case 'randomEmailError':
                showError(emailResult, message.data.message);
                break;
            case 'emailServerTestResult':
                handleServerTestResult(message.data);
                break;
        }
    });

    function displayCurrentStatus(data) {
        const html = `
            <div class="status-item">
                <span class="status-label">Cursor版本:</span>
                <span class="status-value ${data.cursorVersion ? 'success' : 'error'}">
                    ${data.cursorVersion || '未检测到'}
                </span>
            </div>
            <div class="status-item">
                <span class="status-label">管理员权限:</span>
                <span class="status-value ${data.hasAdminRights ? 'success' : 'error'}">
                    ${data.hasAdminRights ? '✓ 已获取' : '✗ 需要管理员权限'}
                </span>
            </div>
            <div class="status-item">
                <span class="status-label">操作系统:</span>
                <span class="status-value">${getPlatformName(data.platform)}</span>
            </div>
            <div class="status-item">
                <span class="status-label">当前MachineGuid:</span>
                <span class="status-value">${data.currentMachineGuid || '无法获取'}</span>
            </div>
            ${data.currentDeviceIds ? `
            <div class="device-ids">
                <div class="device-id-item">
                    <span class="device-id-label">Machine ID:</span> ${data.currentDeviceIds.machineId}
                </div>
                <div class="device-id-item">
                    <span class="device-id-label">Mac Machine ID:</span> ${data.currentDeviceIds.macMachineId}
                </div>
                <div class="device-id-item">
                    <span class="device-id-label">Device ID:</span> ${data.currentDeviceIds.devDeviceId}
                </div>
                <div class="device-id-item">
                    <span class="device-id-label">SQM ID:</span> ${data.currentDeviceIds.sqmId}
                </div>
            </div>
            ` : ''}
        `;
        statusInfo.innerHTML = html;
    }

    function handleResetSuccess(data) {
        setButtonState(resetDeviceIdBtn, false);
        hideElement(deviceIdProgress);
        
        const html = `
            <div class="text-success">
                <strong>✓ ${data.message}</strong>
            </div>
            ${data.backupPath ? `<p>备份文件: ${data.backupPath}</p>` : ''}
            <div class="device-ids">
                <div class="device-id-item">
                    <span class="device-id-label">Machine ID:</span> ${data.deviceIds.machineId}
                </div>
                <div class="device-id-item">
                    <span class="device-id-label">Mac Machine ID:</span> ${data.deviceIds.macMachineId}
                </div>
                <div class="device-id-item">
                    <span class="device-id-label">Device ID:</span> ${data.deviceIds.devDeviceId}
                </div>
                <div class="device-id-item">
                    <span class="device-id-label">SQM ID:</span> ${data.deviceIds.sqmId}
                </div>
            </div>
        `;
        
        showSuccess(deviceIdResult, html);
        loadCurrentStatus(); // Refresh status
    }

    function handleResetError(message) {
        setButtonState(resetDeviceIdBtn, false);
        hideElement(deviceIdProgress);
        showError(deviceIdResult, message);
    }

    function handleEmailSuccess(data) {
        setButtonState(getVerificationCodeBtn, false);
        hideElement(emailProgress);
        
        const html = `
            <div class="text-success">
                <strong>✓ 验证码获取成功!</strong>
            </div>
            <div class="device-ids">
                <div class="device-id-item">
                    <span class="device-id-label">邮箱:</span> ${data.email}
                </div>
                <div class="device-id-item">
                    <span class="device-id-label">验证码:</span> 
                    <strong style="font-size: 1.2em; color: var(--vscode-textLink-foreground);">${data.code}</strong>
                    <button onclick="copyToClipboard('${data.code}')" class="button secondary" style="margin-left: 10px;">复制</button>
                </div>
            </div>
        `;
        
        showSuccess(emailResult, html);
    }

    function handleEmailError(message) {
        setButtonState(getVerificationCodeBtn, false);
        hideElement(emailProgress);
        showError(emailResult, message);
    }

    function handleServerTestResult(data) {
        setButtonState(testServerBtn, false);
        
        if (data.success) {
            alert(`服务器连接成功! 响应时间: ${data.responseTime}ms`);
        } else {
            alert(`服务器连接失败: ${data.error}`);
        }
    }

    // Utility functions
    function showElement(element) {
        element.style.display = 'block';
    }

    function hideElement(element) {
        element.style.display = 'none';
    }

    function showLoading(element) {
        element.innerHTML = '<div class="loading"></div> 正在加载...';
    }

    function showSuccess(element, content) {
        element.className = 'result-info success';
        element.innerHTML = content;
        showElement(element);
    }

    function showError(element, message) {
        element.className = 'result-info error';
        element.innerHTML = `<strong>✗ 错误:</strong> ${message}`;
        showElement(element);
    }

    function updateProgress(element, message) {
        element.innerHTML = `<div class="loading"></div> ${message}`;
        showElement(element);
    }

    function setButtonState(button, disabled) {
        button.disabled = disabled;
        if (disabled) {
            button.innerHTML = '<div class="loading"></div> 处理中...';
        } else {
            // Restore original text
            if (button.id === 'reset-device-id') {
                button.innerHTML = '重置设备ID';
            } else if (button.id === 'get-verification-code') {
                button.innerHTML = '获取验证码';
            } else if (button.id === 'test-server') {
                button.innerHTML = '测试连接';
            }
        }
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function getPlatformName(platform) {
        switch (platform) {
            case 'win32': return 'Windows';
            case 'darwin': return 'macOS';
            case 'linux': return 'Linux';
            default: return platform;
        }
    }

    // Global function for copying to clipboard
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('验证码已复制到剪贴板!');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('验证码已复制到剪贴板!');
        });
    };
})();

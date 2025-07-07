# Cursor Helper - VSCode插件版

![Cursor Helper Logo](media/icon.png)

## 🚀 简介

Cursor Helper 是一个专为VSCode开发的Cursor免费助手插件，让您在熟悉的VSCode环境中轻松管理Cursor的相关功能。

### ✨ 主要功能

- 🔄 **设备ID重置** - 一键重置Cursor的设备标识符，获取新的免费额度
- 📧 **邮箱验证码接收** - 智能获取临时邮箱的验证码用于注册
- ⚙️ **配置管理** - 自动备份和恢复Cursor配置文件
- 🔒 **安全操作** - 完整的错误处理和恢复机制
- 📊 **实时状态** - 显示当前系统和Cursor状态
- 🎨 **现代界面** - 符合VSCode设计规范的用户界面

### 🎯 快速特性

- **快捷键支持**: `Ctrl+Shift+C` (Windows/Linux) 或 `Cmd+Shift+C` (Mac)
- **状态栏集成**: 点击状态栏图标快速访问
- **智能提示**: 详细的操作指导和错误提示
- **日志记录**: 完整的操作日志，便于问题排查

## 📦 安装方法

### 方法一：从源码安装

1. 克隆项目到本地：
```bash
git clone https://github.com/ChuDiRen/cursor-free-everyday.git
cd cursor-free-everyday/cursor-helper-vscode
```

2. 安装依赖：
```bash
npm install
```

3. 编译项目：
```bash
npm run compile
```

4. 在VSCode中按 `F5` 启动调试，或者打包安装：
```bash
npm run package
```

### 方法二：直接安装VSIX包

1. 下载最新的 `.vsix` 文件
2. 在VSCode中按 `Ctrl+Shift+P` 打开命令面板
3. 输入 `Extensions: Install from VSIX...`
4. 选择下载的 `.vsix` 文件进行安装

## 🎯 使用方法

### 1. 打开插件面板

- 按 `Ctrl+Shift+P` 打开命令面板
- 输入 `Cursor Helper: 打开助手面板`
- 或者直接搜索 `Cursor Helper`

### 2. 重置设备ID

1. 确保以**管理员身份**运行VSCode（Windows系统）
2. 点击"重置设备ID"按钮
3. 等待处理完成
4. 重启Cursor应用新配置

### 3. 获取邮箱验证码

1. 输入邮箱地址或点击"生成随机邮箱"
2. 点击"获取验证码"按钮
3. 等待验证码返回
4. 点击"复制"按钮复制验证码

## ⚠️ 重要说明

### 系统要求

- **Windows**: 需要管理员权限来修改注册表
- **macOS/Linux**: 支持配置文件操作，无需特殊权限
- **VSCode**: 版本 1.74.0 或更高

### 权限要求

在Windows系统上，插件需要管理员权限才能修改注册表。请按以下步骤操作：

1. 关闭当前的VSCode
2. 右键点击VSCode图标
3. 选择"以管理员身份运行"
4. 重新打开插件

### 安全提示

- 插件会自动备份原始配置文件
- 所有操作都可以通过备份文件恢复
- 建议在使用前关闭Cursor应用

## 🔧 配置选项

插件提供以下配置选项：

- `cursor-helper.emailServer`: 邮箱验证码服务器地址
- `cursor-helper.autoBackup`: 是否自动备份配置文件
- `cursor-helper.showWarnings`: 是否显示警告信息

在VSCode设置中搜索 `cursor-helper` 进行配置。

## 📁 文件结构

```
cursor-helper-vscode/
├── package.json              # 插件配置
├── tsconfig.json             # TypeScript配置
├── src/                      # 源代码
│   ├── extension.ts          # 插件入口
│   ├── webview.ts            # Webview管理
│   ├── deviceIdGenerator.ts  # 设备ID生成器
│   ├── cursorConfigManager.ts # 配置管理器
│   ├── registryManager.ts    # 注册表管理器
│   └── emailCodeReceiver.ts  # 邮箱验证码接收器
├── media/                    # 媒体文件
│   ├── main.css              # 主样式
│   ├── main.js               # 前端脚本
│   ├── vscode.css            # VSCode主题样式
│   └── reset.css             # CSS重置
└── README.md                 # 说明文档
```

## 🛠️ 开发指南

### 本地开发

1. 克隆项目并安装依赖：
```bash
git clone https://github.com/ChuDiRen/cursor-free-everyday.git
cd cursor-free-everyday/cursor-helper-vscode
npm install
```

2. 启动开发模式：
```bash
npm run watch
```

3. 在VSCode中按 `F5` 启动调试

### 构建发布

```bash
# 编译项目
npm run compile

# 打包插件
npm run package

# 发布到市场（需要配置发布令牌）
npm run publish
```

### 代码结构

- `src/extension.ts` - 插件主入口，注册命令和事件
- `src/webview.ts` - 管理Webview界面和消息通信
- `src/deviceIdGenerator.ts` - 生成各种设备标识符
- `src/cursorConfigManager.ts` - 管理Cursor配置文件
- `src/registryManager.ts` - Windows注册表操作
- `src/emailCodeReceiver.ts` - 邮箱验证码接收功能

## 🐛 故障排除

### 常见问题

1. **权限不足错误**
   - 确保以管理员身份运行VSCode（Windows）
   - 检查Cursor配置文件路径是否正确

2. **验证码获取失败**
   - 检查网络连接
   - 尝试更换邮箱服务器地址
   - 确认邮箱地址格式正确

3. **配置文件未找到**
   - 确保Cursor已安装并至少运行过一次
   - 检查配置文件路径是否存在

### 日志查看

1. 打开VSCode输出面板（`Ctrl+Shift+U`）
2. 选择"Cursor Helper"输出通道
3. 查看详细的操作日志

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](../LICENSE) 文件。

## ⚖️ 免责声明

- 本工具仅供学习交流使用，请勿用于商业用途
- 使用本工具可能违反Cursor的服务条款，请自行承担风险
- 作者不承担任何法律责任，使用造成的后果由使用者自行承担
- 建议支持Cursor官方的正版Pro会员服务

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📞 支持

- GitHub Issues: [提交问题](https://github.com/ChuDiRen/cursor-free-everyday/issues)
- QQ群: 951642519（交流学习）

---

**⭐ 如果这个项目对您有帮助，请给个Star支持一下！**

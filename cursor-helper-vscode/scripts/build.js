#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始构建 Cursor Helper 插件...');

// 检查必要的文件
const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'src/extension.ts'
];

console.log('📋 检查必要文件...');
for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
        console.error(`❌ 缺少必要文件: ${file}`);
        process.exit(1);
    }
}
console.log('✅ 所有必要文件检查通过');

// 清理输出目录
console.log('🧹 清理输出目录...');
if (fs.existsSync('out')) {
    fs.rmSync('out', { recursive: true, force: true });
}

// 编译TypeScript
console.log('🔨 编译TypeScript...');
try {
    execSync('npm run compile', { stdio: 'inherit' });
    console.log('✅ TypeScript编译完成');
} catch (error) {
    console.error('❌ TypeScript编译失败');
    process.exit(1);
}

// 运行代码检查
console.log('🔍 运行代码检查...');
try {
    execSync('npm run lint', { stdio: 'inherit' });
    console.log('✅ 代码检查通过');
} catch (error) {
    console.warn('⚠️ 代码检查发现问题，但继续构建');
}

// 检查package.json配置
console.log('📦 检查package.json配置...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredFields = ['name', 'displayName', 'description', 'version', 'publisher'];
for (const field of requiredFields) {
    if (!packageJson[field]) {
        console.error(`❌ package.json缺少必要字段: ${field}`);
        process.exit(1);
    }
}

if (!packageJson.icon) {
    console.warn('⚠️ 建议添加插件图标 (icon字段)');
}

if (!packageJson.repository) {
    console.warn('⚠️ 建议添加仓库地址 (repository字段)');
}

console.log('✅ package.json配置检查完成');

// 检查README文件
console.log('📖 检查README文件...');
if (!fs.existsSync('README.md')) {
    console.warn('⚠️ 建议添加README.md文件');
} else {
    const readmeContent = fs.readFileSync('README.md', 'utf8');
    if (readmeContent.length < 100) {
        console.warn('⚠️ README.md内容较少，建议完善');
    }
}

console.log('🎉 构建完成！');
console.log('');
console.log('📋 构建摘要:');
console.log(`   插件名称: ${packageJson.displayName}`);
console.log(`   版本: ${packageJson.version}`);
console.log(`   发布者: ${packageJson.publisher}`);
console.log('');
console.log('🔧 下一步操作:');
console.log('   1. 运行 "npm run package" 打包插件');
console.log('   2. 运行 "code --install-extension *.vsix" 本地安装测试');
console.log('   3. 运行 "npm run publish" 发布到市场');

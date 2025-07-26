#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import time
import requests
from urllib.parse import quote

def get_verification_code(server_url, email, retry_interval=3):
    """
    从网站获取指定邮箱的验证码
    
    参数:
        server_url: 网站URL，例如 "cjrom2ero@portaltrendsarena.com"
        email: 完整的邮箱地址
        retry_interval: 重试间隔（秒）
        
    返回:
        成功返回验证码字符串，失败返回None
    """
    # URL编码邮箱地址
    encoded_email = quote(email)
    api_url = f"{server_url}/get_code?email={encoded_email}"
    
    print(f"开始获取邮箱 {email} 的验证码...")
    
    max_retries = 3  # 增加重试次数
    for attempt in range(max_retries):
        try:
            print(f"尝试 {attempt+1}/{max_retries}: 请求验证码...")
            response = requests.get(api_url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("code"):
                    print(f"成功获取验证码: {data['code']}")
                    return data["code"]
                else:
                    print(f"未找到验证码，响应: {data}")
            else:
                print(f"请求失败，状态码: {response.status_code}")
                
            # 如果不是最后一次尝试，等待后重试
            if attempt < max_retries - 1:
                retry_wait = retry_interval * (attempt + 1)  # 递增等待时间
                print(f"等待 {retry_wait} 秒后重试...")
                time.sleep(retry_wait)
                
        except Exception as e:
            print(f"请求出错: {e}")
            if attempt < max_retries - 1:
                retry_wait = retry_interval * (attempt + 1)
                print(f"等待 {retry_wait} 秒后重试...")
                time.sleep(retry_wait)
    
    print("达到最大重试次数，获取验证码失败")
    return None

def check_server_health(server_url):
    try:
        response = requests.get(f"{server_url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return True
        else:
            print(f"失败，状态码: {response.status_code}")
            return False
    except Exception as e:
        print(f"出错: {e}")
        return False

def main():
    """主函数"""
    # 设置默认值 这个不变
    server_url = "http://更换自己搭建的"
    # server_url = "http://127.0.0.1:5362"

    # 在项目中的txt提供了大量的域名,从里面随便选一个
    # 前缀可以使用一个10位数的随机数 数字小大写字母混合,@后缀不能随机
    email = "lordsem89@storetaikhoan.com" #这个要修改,硬编码了一个测试邮箱
    
    # 如果提供了命令行参数则使用命令行参数
    if len(sys.argv) >= 3:
        server_url = sys.argv[1].rstrip('/')
        email = sys.argv[2]
    else:
        print("未提供命令行参数，使用默认值:")
        print(f"网站URL: {server_url}")
        print(f"邮箱地址: {email}")
    
    # 检查网站健康状态
    if not check_server_health(server_url):
        print("网站健康检查失败，退出程序")
        return
    
    # 获取验证码
    code = get_verification_code(server_url, email)
    

if __name__ == "__main__":
    main() 

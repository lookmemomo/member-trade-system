import os

frontend_dir = r'D:\001\001\member-trade-system\frontend'
for root, dirs, files in os.walk(frontend_dir):
    for f in files:
        if f.endswith('.html'):
            filepath = os.path.join(root, f)
            with open(filepath, 'r', encoding='utf-8') as fp:
                content = fp.read()
            content = content.replace("'http://localhost:3000/api'", "'/api'")
            content = content.replace('http://localhost:3000${', '${')
            content = content.replace("http://localhost:3000\\${user", "\\${user")
            content = content.replace("http://localhost:3000\\${trade", "\\${trade")
            content = content.replace("http://localhost:3000\\${voucher", "\\${voucher")
            content = content.replace("http://localhost:3000\\${t", "\\${t")
            with open(filepath, 'w', encoding='utf-8') as fp:
                fp.write(content)
            print(f'修改完成: {f}')
print('所有前端文件修改完成')

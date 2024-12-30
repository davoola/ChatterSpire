# ChatterSpire | 话尖阁 

> 一个现代化的实时聊天社交平台，基于 Node.js + MongoDB + Socket.IO 开发。  

## 项目简介

ChatterSpire 是一个功能丰富的实时聊天应用，旨在提供流畅的即时通讯体验。它支持多房间聊天、文件共享、用户管理等功能，适合用于团队协作、在线社区等场景。

### 为什么选择 ChatterSpire?
- 🚀 快速部署：支持传统安装和 Docker 部署
- 💬 实时通讯：基于 Socket.IO 的即时消息传递
- 🔒 安全可靠：支持 HTTPS 和 WSS 加密通信
- 🎨 美观易用：现代化 UI 设计，响应式布局
- 🛠 可扩展：模块化设计，易于扩展新功能

## 技术栈
### 后端技术
- Node.js - 服务器运行环境
- Express.js - Web 应用框架
- Socket.IO - WebSocket 库，用于实时通信
- MongoDB - NoSQL 数据库
- Mongoose - MongoDB 对象模型工具
- JWT - 用户认证
- bcrypt - 密码加密
### 前端技术
- EJS - 服务端模板引擎
- Socket.IO Client - WebSocket 客户端
- highlight.js - 代码高亮
- markdown-it - Markdown 渲染
### 开发工具
- Cursor - 代码编写
- Docker - 容器化部署
- Docker Compose - 多容器编排
  
## 功能特点 

- 用户注册和登录
- 账号密码登录
- 记住登录状态
- 用户角色权限控制
- 实时聊天
- 文本消息发送
- 表情符号支持
- 代码块高亮显示
- Markdown 格式支持
- 图片预览功能
- 多房间支持
- 创建私密房间
- 房间密码保护
- 在线用户列表
- 房间成员管理
- 文件上传和分享
- 支持多种文件格式
- 文件大小限制
- 安全性检查
- 消息历史记录
- 按时间查询
- 消息持久化存储
- 历史记录导出
- 用户资料管理
- 头像上传
- 个人信息编辑
- 密码修改
- 管理员后台
- 用户管理
- 房间管理
- 系统设置
- 运行状态监控 

## 普通安装方式 

### 前置条件
- Node.js >= 14.x
- MongoDB >= 4.x
- npm >= 6.x 

### 安装步骤 

1. 克隆项目
```bash
git clone https://github.com/davoola/ChatterSpire.git
cd ChatterSpire
```
2. 安装依赖
```bash
npm install
```
3. 配置 MongoDB
确保 MongoDB 服务已启动，默认连接地址为：mongodb://localhost:27017/chatterspire 

4. 初始化管理员账号
```bash
npm run init-admin
```
这将创建一个默认管理员账号：
- 用户名：Admin
- 密码：Admin123 

5. 启动应用
```bash
npm start
```
应用将在 http://localhost:3000 启动。

## Docker 安装方式 

### 前置条件 

- Docker >= 20.10.x
- Docker Compose >= 2.x
  
### 使用 Docker Compose 安装（推荐）  

1. 克隆项目并进入目录
```bash
git clone [项目地址]
cd ChatterSpire
```
2. 启动服务
```bash
docker-compose up -d
```
服务将在 http://localhost:3000 启动。首次启动时会自动创建管理员账号：
- 用户名：Admin
- 密码：Admin123
**注意：** 请在首次登录后立即修改管理员密码。  

### 使用单独的 Docker 命令安装

1. 创建 Docker 网络
```bash
docker network create chatroom-network
``` 
2. 启动 MongoDB 容器
```bash
docker run -d \\
--name chatroom-mongo \\
--network chatroom-network \\
-v chatroom-mongo-data:/data/db \\
mongo:latest
```
3. 构建并启动应用容器
```bash
docker build -t chatroom-app .
docker run -d \\
--name chatroom-app \\
--network chatroom-network \\
-p 3000:3000 \\
-e MONGODB_URI=mongodb://chatroom-mongo:27017/chatterspire \\
chatroom-app
```
4. 初始化管理员账号
```bash
docker exec chatroom-app npm run init-admin
```

## 配置说明 

### 环境变量
- `PORT`: 应用端口号（默认：3000）
- `MONGODB_URI`: MongoDB 连接地址（默认：mongodb://localhost:27017/chatterspire）
- `SESSION_SECRET`: Session 密钥（默认：your_secret_key）

### 文件上传
上传的文件将保存在 `public/upload` 目录下，确保该目录具有写入权限。  

## 开发模式
启动开发模式（支持热重载）：
```bash
npm run dev
```

## 注意事项 

1. 首次使用请及时修改管理员密码
2. 定期备份 MongoDB 数据
3. 在生产环境中，建议：
- 使用 HTTPS
- 配置反向代理（如 Nginx）
```js
server {
listen [::]:443 ssl;
listen 443 ssl;
server_name example.com; # 请替换为你的域名
ssl_certificate /etc/nginx/example.com.pem; # 请替换为你的证书路径
ssl_certificate_key /etc/nginx/example.com.key; # 请替换为你的私钥路径
ssl_session_timeout 1d;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
ssl_session_cache shared:MozSSL:10m;
ssl_session_tickets off;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off; 

location / {
proxy_pass http://127.0.0.1:3000; # 请替换为你的地址
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# WebSocket 超时设置
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
}

# 专门为 Socket.IO 添加的配置
location /socket.io/ {
proxy_pass http://127.0.0.1:3000; # 请替换为你的地址
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_cache_bypass $http_upgrade;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
  
# WebSocket 超时设置
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
}
}
```

- 修改默认的 Session Secret
- 设置适当的文件上传限制

## 使用指南 

### 用户功能 

1. 注册/登录
- 访问首页，点击"注册"或"登录"
- 填写相关信息
- 首次登录建议修改默认密码
  
2. 创建/加入房间
- 在主页点击"创建房间"
- 或从房间列表选择已有房间
- 输入房间密码（如果需要）
  
3. 聊天功能
- 发送文本消息
- 使用 Markdown 语法
- 插入代码块（支持语法高亮）
- 上传文件/图片
- 使用表情符号
  
4. 个人设置
- 修改个人信息
- 上传头像
- 更改密码
- 设置通知偏好 

### 管理员功能 

1. 用户管理
- 查看用户列表
- 禁用/启用用户
- 重置用户密码
- 修改用户权限 

2. 房间管理
- 查看所有房间
- 关闭/删除房间
- 设置房间属性
- 管理房间成员  

3. 系统设置
- 配置系统参数
- 查看运行日志
- 备份/恢复数据
- 监控系统状态 

## 性能优化建议  

1. 数据库优化
- 建立适当的索引
- 定期数据清理
- 使用数据库连接池 

2. 缓存策略
- 使用 Redis 缓存会话
- 静态资源缓存
- 消息队列处理 

3. 安全加固
- 启用 HTTPS
- 配置 CSP 策略
- 定期安全更新
- 日志监控告警  

## 贡献指南

我们欢迎所有形式的贡献，包括但不限于：

1. 提交问题和建议
2. 改进文档
3. 修复 bug
4. 添加新功能
5. 优化性能 

### 贡献步骤

1. Fork 项目
2. 创建特性分支
```bash
git checkout -b feature/your-feature-name
```

3. 提交更改
```bash
git commit -m 'Add some feature'
```

4. 推送到分支
```bash
git push origin feature/your-feature-name
```
5. 创建 Pull Request 

### 开发规范 

- 遵循 ESLint 配置
- 编写测试用例
- 保持代码简洁清晰
- 添加必要的注释
- 更新相关文档 

## 常见问题

1. Q: 如何修改默认端口？
A: 在环境变量中设置 PORT 值
2. Q: 如何备份数据？
A: 使用 MongoDB 的备份工具 mongodump  
3. Q: 如何配置邮件服务？
A: 在环境变量中设置邮件服务器相关参数
4. Q: 如何扩展新的功能？
A: 参考开发文档，遵循模块化开发方式 

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。 

## 鸣谢
  感谢以下开源项目：
- [Cursor](https://www.cursor.com/) !important
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [MongoDB](https://www.mongodb.com/)
- [Bootstrap](https://getbootstrap.com/)
- [Font Awesome](https://fontawesome.com/)
- [highlight.js](https://highlightjs.org/)
- [markdown-it](https://github.com/markdown-it/markdown-it) 
特别感谢所有贡献者的付出！

> 欢迎加入 ChatterSpire 社区，一起打造更好的即时通讯平台！
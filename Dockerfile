# 使用 Node.js 官方镜像作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制应用程序代码
COPY . .

# 创建上传目录
RUN mkdir -p public/upload && chmod 777 public/upload
RUN mkdir -p public/avatar && chmod 777 public/avatar
RUN mkdir -p records && chmod 777 records

# 添加执行权限到入口脚本
RUN chmod +x docker-entrypoint.sh

# 暴露端口
EXPOSE 3000

# 设置入口点
ENTRYPOINT ["./docker-entrypoint.sh"] 
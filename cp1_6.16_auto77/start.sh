#!/bin/bash

# 安装依赖（如果还没安装）
if [ ! -d "node_modules" ]; then
  echo "安装依赖中..."
  npm install
fi

# 同时启动前端和后端
echo "启动后端服务器 (端口 3001)..."
npm run server &
SERVER_PID=$!

echo "启动前端开发服务器 (端口 5173)..."
npm run dev &
CLIENT_PID=$!

# 捕获退出信号，清理子进程
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" SIGINT SIGTERM

# 等待子进程
wait

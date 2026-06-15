@echo off
chcp 65001 >nul
echo 正在启动 Music Collab 平台...

if not exist "node_modules" (
  echo 正在安装依赖...
  call npm install
)

echo 启动后端服务器 (端口 3001)...
start "Music Server" cmd /c "npm run server"

timeout /t 2 /nobreak >nul

echo 启动前端开发服务器 (端口 5173)...
start "Music Client" cmd /c "npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   音乐协作平台已启动!
echo   前端: http://localhost:5173
echo   后端: http://localhost:3001
echo ========================================
echo.
echo 按任意键退出（前端和后端会继续运行）...
pause >nul

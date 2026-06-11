## 1. 架构设计

```mermaid
flowchart TD
    "index.html" --> "dist/bundle.js"
    "dist/bundle.js" --> "gallery.ts"
    "gallery.ts" --> "renderer.ts"
    "gallery.ts" --> "animator.ts"
    "gallery.ts" --> "types.ts"
    "renderer.ts" --> "types.ts"
    "animator.ts" --> "types.ts"
    "style.css" --> "index.html"
```

纯前端项目，无后端服务。使用 TypeScript + 原生 CSS（无框架），Vite 构建。

## 2. 技术说明

- 前端：TypeScript + 原生 CSS（无框架）
- 构建工具：Vite
- 目标：ES2020，严格模式
- 样式：原生 CSS，使用 CSS 变量管理主题色
- 数据：硬编码数组提供照片数据，不少于12张
- 包管理：npm
- 开发服务器：http-server

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 画廊主页，展示所有照片 |

单页应用，无路由切换。

## 4. 文件结构

```
├── package.json          # 项目依赖和启动脚本
├── index.html            # 入口HTML，加载dist/bundle.js和style.css
├── tsconfig.json         # TypeScript严格模式配置，ES2020目标
├── vite.config.js        # Vite构建配置，输出到dist目录
├── style.css             # 全局样式、颜色变量、动画关键帧、响应式断点
└── src/
    ├── types.ts          # 照片接口类型定义（id, url, title, category等）
    ├── animator.ts       # CSS动画类切换和时间线控制
    ├── renderer.ts       # 网格视图和灯箱DOM结构生成，状态维护
    └── gallery.ts        # 主要逻辑，照片数据管理、分类筛选、调用Renderer和Animator
```

## 5. 模块职责

### types.ts
定义 `Photo` 接口，包含字段：id (number), url (string), title (string), category (string)

### gallery.ts
- 管理硬编码的照片数据数组（12+张，涵盖风景/人像/街拍等分类）
- 管理当前筛选分类状态
- 管理收藏状态和收藏计数
- 初始化 Renderer 和 Animator
- 绑定分类筛选事件
- 绑定灯箱打开/关闭事件
- 绑定键盘事件（左右箭头切换、Esc关闭灯箱）
- 绑定收藏按钮事件

### renderer.ts
- 生成网格视图的DOM结构
- 生成灯箱模式的DOM结构
- 生成导航栏（毛玻璃效果）
- 生成分类筛选栏
- 生成收藏计数器
- 维护当前灯箱状态（当前照片索引、是否打开）
- 更新网格视图（根据分类筛选）
- 更新收藏按钮状态

### animator.ts
- 管理悬停浮起动画（CSS transition）
- 管理交错飞入动画（stagger animation）
- 管理灯箱淡入动画
- 管理分类按钮下划线滑动效果
- 管理心形收藏弹出动画
- 管理粒子爆炸特效
- 所有动画使用 CSS 类切换实现，确保60fps

## 6. 数据模型

### 照片数据

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 唯一标识 |
| url | string | 照片图片地址 |
| title | string | 照片标题 |
| category | string | 分类（landscape/portrait/street） |

### 分类映射

| 英文标识 | 中文显示 |
|----------|----------|
| all | 全部 |
| landscape | 风景 |
| portrait | 人像 |
| street | 街拍 |

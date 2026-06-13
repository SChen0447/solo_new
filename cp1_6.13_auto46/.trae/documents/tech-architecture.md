## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "App.tsx" --> "Piano.tsx"
        "App.tsx" --> "SheetMusic.tsx"
        "Piano.tsx" --> "useAudio.ts"
    end
    subgraph "浏览器API层"
        "useAudio.ts" --> "Web Audio API"
        "SheetMusic.tsx" --> "Canvas API"
        "App.tsx" --> "localStorage"
    end
    subgraph "输入层"
        "键盘事件" --> "App.tsx"
        "鼠标事件" --> "Piano.tsx"
    end
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite
- 初始化工具：vite-init (react-ts模板)
- 状态管理：zustand
- 样式：CSS Modules + CSS变量（主题切换）
- 音频：Web Audio API（振荡器+ADSR包络）
- 乐谱渲染：Canvas 2D API
- 后端：无
- 数据库：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，包含钢琴键盘、乐谱和控制面板 |

## 4. 数据模型

### 4.1 核心类型定义

```typescript
interface Note {
  name: string;
  octave: number;
  frequency: number;
  isBlack: boolean;
}

interface SongNote {
  note: string;
  duration: number;
}

interface Song {
  name: string;
  notes: SongNote[];
}

interface RecordedNote {
  note: string;
  timestamp: number;
}

interface ThemeName {
  theme: 'classic' | 'cosmic' | 'sunset';
}
```

## 5. 文件结构与调用关系

```
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx              → 挂载App到#root
    ├── App.tsx               → 主组件，zustand状态管理
    │   ├── 调用 Piano.tsx    → 传递onKeyPress回调
    │   ├── 调用 SheetMusic.tsx → 传递当前音高+乐谱数据
    │   └── 使用 useAudio.ts  → playNote方法
    ├── components/
    │   ├── Piano.tsx          → 钢琴键盘组件
    │   │   └── 调用 useAudio.ts → 播放音符
    │   └── SheetMusic.tsx     → 乐谱组件（Canvas渲染）
    ├── hooks/
    │   └── useAudio.ts        → Web Audio API封装
    ├── store/
    │   └── usePianoStore.ts   → zustand全局状态
    ├── data/
    │   └── songs.ts           → 内置乐谱数据
    └── styles/
        └── themes.css         → 主题CSS变量定义
```

## 6. 数据流向

1. **演奏流程**：键盘/鼠标事件 → Piano组件 → useAudio.playNote() → Web Audio API发声
2. **状态同步**：Piano组件 → zustand store更新currentNote → SheetMusic响应高亮
3. **学习模式**：用户弹奏 → App比对当前乐谱音符 → 正确(绿闪)/错误(红闪) → 高亮前移
4. **录制流程**：每次按键 → zustand store追加RecordedNote → 回放时按时间戳依次触发
5. **主题切换**：用户选择主题 → zustand更新theme → CSS变量切换 + localStorage持久化

## 7. 性能策略

- Web Audio API直接创建振荡器节点，确保<50ms延迟
- Canvas乐谱使用requestAnimationFrame驱动，确保≥55fps
- 录制数据存储为轻量数组结构，60秒录音约数千条记录，内存远<200MB
- 琴键使用CSS transform动画，利用GPU加速

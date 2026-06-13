import { v4 as uuidv4 } from 'uuid';
import type { Room, DocumentVersion, User } from '../types';
import { generateRoomId, getUserColor } from '../types';

const rooms = new Map<string, Room>();

const DEFAULT_CONTENT = `# 欢迎使用 Markdown 协作编辑器

这是一个支持多人实时协作的 Markdown 编辑器。

## 功能特点

- **实时协作**：多人同时编辑，立即看到对方的光标和修改
- **实时预览**：右侧实时渲染 Markdown 内容
- **版本管理**：保存重要版本，随时回溯
- **内置聊天**：房间内即时沟通

## 代码示例

\`\`\`javascript
function hello(name) {
  console.log(\`Hello, \${name}!\`);
}

hello('World');
\`\`\`

## 表格示例

| 功能 | 状态 | 说明 |
|------|------|------|
| 实时编辑 | ✅ | 支持多人同时编辑 |
| 光标同步 | ✅ | 显示其他用户光标位置 |
| 版本管理 | ✅ | 支持保存和回溯版本 |

## 数学公式

行内公式：$E = mc^2$

块级公式：
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## 图片

![示例图片](https://picsum.photos/600/300)

---

开始编辑你的文档吧！
`;

export function createRoom(): { roomId: string; room: Room } {
  const roomId = generateRoomId();
  const now = Date.now();
  
  const room: Room = {
    id: roomId,
    content: DEFAULT_CONTENT,
    version: 0,
    users: new Map(),
    versions: [],
    createdAt: now,
    lastActivityAt: now,
  };
  
  rooms.set(roomId, room);
  return { roomId, room };
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId.toUpperCase());
}

export function roomExists(roomId: string): boolean {
  return rooms.has(roomId.toUpperCase());
}

export function getDocument(roomId: string): string | null {
  const room = getRoom(roomId);
  return room ? room.content : null;
}

export function updateDocument(roomId: string, content: string, version: number): boolean {
  const room = getRoom(roomId);
  if (!room) return false;
  
  room.content = content;
  room.version = version;
  room.lastActivityAt = Date.now();
  return true;
}

export function addUser(roomId: string, userId: string, nickname: string): User | null {
  const room = getRoom(roomId);
  if (!room) return null;
  
  const userIndex = room.users.size;
  const color = getUserColor(userIndex);
  
  const user: User = {
    id: userId,
    nickname,
    color,
    cursorPosition: 0,
    selectionStart: 0,
    selectionEnd: 0,
    joinedAt: Date.now(),
  };
  
  room.users.set(userId, user);
  room.lastActivityAt = Date.now();
  return user;
}

export function removeUser(roomId: string, userId: string): boolean {
  const room = getRoom(roomId);
  if (!room) return false;
  
  const removed = room.users.delete(userId);
  room.lastActivityAt = Date.now();
  return removed;
}

export function getUser(roomId: string, userId: string): User | undefined {
  const room = getRoom(roomId);
  return room?.users.get(userId);
}

export function getUsers(roomId: string): User[] {
  const room = getRoom(roomId);
  if (!room) return [];
  return Array.from(room.users.values());
}

export function updateCursor(
  roomId: string,
  userId: string,
  position: number,
  selectionStart: number,
  selectionEnd: number
): boolean {
  const room = getRoom(roomId);
  if (!room) return false;
  
  const user = room.users.get(userId);
  if (!user) return false;
  
  user.cursorPosition = position;
  user.selectionStart = selectionStart;
  user.selectionEnd = selectionEnd;
  room.lastActivityAt = Date.now();
  return true;
}

export function saveVersion(
  roomId: string,
  createdBy: string,
  createdByName: string,
  note: string
): DocumentVersion | null {
  const room = getRoom(roomId);
  if (!room) return null;
  
  const versionNumber = room.versions.length + 1;
  
  const version: DocumentVersion = {
    id: uuidv4(),
    content: room.content,
    note: note || `版本 ${versionNumber}`,
    createdAt: Date.now(),
    createdBy,
    createdByName,
    versionNumber,
  };
  
  room.versions.push(version);
  room.lastActivityAt = Date.now();
  return version;
}

export function getVersions(roomId: string): DocumentVersion[] {
  const room = getRoom(roomId);
  if (!room) return [];
  return [...room.versions].reverse();
}

export function revertVersion(roomId: string, versionId: string): DocumentVersion | null {
  const room = getRoom(roomId);
  if (!room) return null;
  
  const version = room.versions.find((v) => v.id === versionId);
  if (!version) return null;
  
  room.content = version.content;
  room.version += 1;
  room.lastActivityAt = Date.now();
  
  return version;
}

const ROOM_TTL = 24 * 60 * 60 * 1000;

export function cleanupInactiveRooms(): void {
  const now = Date.now();
  
  for (const [roomId, room] of rooms) {
    if (now - room.lastActivityAt > ROOM_TTL && room.users.size === 0) {
      rooms.delete(roomId);
    }
  }
}

setInterval(cleanupInactiveRooms, 60 * 60 * 1000);

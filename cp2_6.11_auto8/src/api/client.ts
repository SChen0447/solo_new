/**
 * API 客户端
 * 
 * 调用方：
 * - src/main.tsx 渲染时 → App.tsx 路由组件调用
 * - ExhibitionList 列表页 → fetchExhibitions() 获取展览列表
 * - CreateExhibition 创建页 → uploadImageWithProgress() 上传进度条 + createExhibition()
 * - ViewExhibition 浏览页 → fetchBubbles() / saveBubble() 气泡管理
 * - ExhibitionCanvas Canvas组件 → onBubbleSave 回调 → saveBubble()
 * 
 * 数据流向：
 * 组件调用 → API函数 → fetch/XHR → Express路由 → 文件存储 → JSON响应 → 组件更新状态
 */

import type { Exhibition, Bubble, EmotionTheme, ImageItem } from '../types';

// ============== 通用 fetch 包装 ==============

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any).error || `请求失败: ${res.status}`);
  }
  return data as T;
}

// ============== 展览相关 API ==============

/**
 * 获取所有展览列表
 * 调用方：ExhibitionList 页面 componentDidMount
 */
export function fetchExhibitions(): Promise<Exhibition[]> {
  return request<Exhibition[]>('/api/exhibitions');
}

/**
 * 创建新展览
 * 调用方：CreateExhibition 页面 提交表单
 */
export function createExhibition(data: {
  name: string;
  theme: EmotionTheme;
  images: Omit<ImageItem, 'id'>[];
}): Promise<Exhibition> {
  return request<Exhibition>('/api/exhibitions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============== 图片上传 API ==============

/**
 * 上传图片（带进度回调，用于触发进度条动画）
 * 
 * 核心实现：
 * - 使用 XMLHttpRequest 而非 fetch，因为 fetch 不支持监听上传进度
 * - onprogress 事件 → progressCallback(0~100) → UI 更新进度条宽度
 * - 进度条过渡：transition: width 0.3s ease-out（在 CSS 中定义）
 * 
 * 调用方：ImageUploader 组件 onFileSelected → xhr.send(formData)
 * 错误处理：超过2MB → 后端返回413 → reject → 前端按钮抖动+红色提示条
 */
export function uploadImageWithProgress(
  file: File,
  progressCallback: (percent: number) => void
): Promise<{ url: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('image', file);

    // 监听上传进度，驱动进度条动画
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressCallback(percent);
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          // 确保100%显示短暂时间后完成
          progressCallback(100);
          resolve(data);
        } else {
          reject(new Error(data.error || `上传失败 (${xhr.status})`));
        }
      } catch {
        reject(new Error('解析响应失败'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('网络错误，上传失败'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('上传已取消'));
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}

// ============== 气泡相关 API ==============

/**
 * 获取指定展览的所有气泡
 * 调用方：ViewExhibition 页面进入时 → useEffect → 传给 ExhibitionCanvas
 */
export function fetchBubbles(exhibitionId: string): Promise<Bubble[]> {
  return request<Bubble[]>(`/api/bubbles/${exhibitionId}`);
}

/**
 * 保存一个新气泡
 * 调用方：ExhibitionCanvas → 用户输入气泡文字回车 → 调API → 保存后更新本地气泡列表
 */
export function saveBubble(data: {
  exhibitionId: string;
  x: number;
  y: number;
  text: string;
}): Promise<Bubble> {
  return request<Bubble>('/api/bubbles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

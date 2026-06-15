import { useColorStore } from './store';
import { darkenForHover } from './colorAlgorithm';
import { useState } from 'react';

export default function ThemePreview() {
  const { theme, mode, extractedColors } = useColorStore();
  const [hoverPrimary, setHoverPrimary] = useState(false);
  const hasTheme = extractedColors.length > 0;

  const isDark = mode === 'dark';

  const previewBg = isDark ? '#1A1A2E' : theme.light;
  const previewText = isDark ? '#E0E0E0' : theme.dark;
  const previewCardBg = isDark ? '#2A2A3E' : '#FFFFFF';

  const themeEntries = [
    { key: 'light', label: '浅色', color: theme.light },
    { key: 'dark', label: '深色', color: theme.dark },
    { key: 'accent1', label: '强调1', color: theme.accent1 },
    { key: 'accent2', label: '强调2', color: theme.accent2 },
    { key: 'accent3', label: '强调3', color: theme.accent3 },
  ];

  return (
    <div className="h-full flex flex-col">
      {!hasTheme ? (
        <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">
          上传图片后预览配色主题效果
        </div>
      ) : (
        <div
          className="flex-1 rounded-2xl p-6 overflow-auto transition-all duration-500"
          style={{ backgroundColor: previewBg, color: previewText }}
        >
          <div className="flex items-center gap-3 mb-6">
            {themeEntries.map((entry) => (
              <div key={entry.key} className="flex items-center gap-1.5">
                <div
                  className="w-8 h-8 rounded-md shadow-sm transition-colors duration-500"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[11px] font-mono opacity-60">{entry.color}</span>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <button
                className="rounded-lg font-medium text-white transition-all duration-500"
                style={{
                  width: '180px',
                  height: '44px',
                  backgroundColor: hoverPrimary ? darkenForHover(theme.accent1) : theme.accent1,
                  transition: 'background-color 0.5s ease, transform 0.2s ease',
                  transform: hoverPrimary ? 'scale(1.03)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoverPrimary(true)}
                onMouseLeave={() => setHoverPrimary(false)}
              >
                主要按钮
              </button>

              <button
                className="rounded-lg font-medium bg-transparent transition-all duration-200 hover:scale-105"
                style={{
                  height: '44px',
                  padding: '0 24px',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: theme.accent2,
                  color: theme.accent3,
                }}
              >
                次要按钮
              </button>
            </div>

            <div
              className="rounded-xl p-5 transition-all duration-500"
              style={{
                backgroundColor: previewCardBg,
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0 mt-1.5 transition-colors duration-500"
                  style={{ backgroundColor: theme.accent1 }}
                />
                <div>
                  <h3
                    className="text-lg font-semibold mb-1 transition-colors duration-500"
                    style={{ color: theme.dark }}
                  >
                    标题卡片
                  </h3>
                  <p
                    className="text-sm opacity-70 transition-colors duration-500"
                    style={{ color: isDark ? '#AAAACC' : theme.dark }}
                  >
                    这是一个预览卡片，展示配色主题在文字和背景上的应用效果。当前为{isDark ? '暗色' : '亮色'}模式。
                  </p>
                </div>
              </div>
            </div>

            <div
              className="rounded-xl p-5 w-full transition-all duration-500"
              style={{ backgroundColor: theme.light }}
            >
              <h4
                className="text-sm font-medium mb-2 transition-colors duration-500"
                style={{ color: theme.dark }}
              >
                全宽背景色块
              </h4>
              <p
                className="text-xs opacity-60 transition-colors duration-500"
                style={{ color: theme.dark }}
              >
                浅色色值应用于背景区域，深色色值应用于文字内容
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

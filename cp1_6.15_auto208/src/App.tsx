import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore, type ChartType, type AxisMapping, type DetailCardData } from './store';
import { parseCSV } from './dataParser';
import { renderChart, setupCanvasClick } from './chartRenderer';
import {
  Upload,
  CircleDot,
  TrendingUp,
  BarChart3,
  X,
  Menu,
  GripVertical,
} from 'lucide-react';
import './index.css';

const AXIS_LABELS: Record<keyof AxisMapping, string> = {
  x: 'X 轴',
  y: 'Y 轴',
  color: '颜色分组',
  size: '大小',
};

const AXIS_ICONS: Record<keyof AxisMapping, string> = {
  x: '→',
  y: '↑',
  color: '🎨',
  size: '⬤',
};

type ChartTypeOption = { type: ChartType; icon: typeof CircleDot; label: string };

const CHART_TYPES: ChartTypeOption[] = [
  { type: 'scatter', icon: CircleDot, label: '散点图' },
  { type: 'line', icon: TrendingUp, label: '折线图' },
  { type: 'bar', icon: BarChart3, label: '柱状图' },
];

export default function App() {
  const {
    fields,
    rows,
    chartType,
    axisMapping,
    notification,
    detailCard,
    drawerOpen,
    setParsedData,
    setChartType,
    updateAxisMapping,
    clearAxisMapping,
    setNotification,
    setDetailCard,
    setDrawerOpen,
    getAvailableFields,
  } = useStore();

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [dragOverAxis, setDragOverAxis] = useState<keyof AxisMapping | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!axisMapping.x || !axisMapping.y || rows.length === 0) return;
    const timer = setTimeout(() => {
      renderChart({
        chartType,
        axisMapping,
        rows,
        fields,
        container: svgRef.current,
        onDetailCard: setDetailCard,
        width: canvasSize.width,
        height: canvasSize.height,
      });
    }, 16);
    return () => clearTimeout(timer);
  }, [chartType, axisMapping, rows, fields, canvasSize, setDetailCard]);

  useEffect(() => {
    if (svgRef.current) {
      setupCanvasClick(svgRef.current, setDetailCard);
    }
  }, [setDetailCard]);

  useEffect(() => {
    if (notification?.type === 'success') {
      const timer = setTimeout(() => setNotification(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const result = parseCSV(text);
        if (result.success && result.data) {
          setParsedData(result.data.fields, result.data.rows);
          setNotification({ type: 'success', message: `成功解析 ${result.data.rows.length} 行 × ${result.data.fields.length} 列数据` });
        } else {
          setNotification({ type: 'error', message: result.error || '解析失败' });
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [setParsedData, setNotification]
  );

  const handlePasteSubmit = useCallback(() => {
    if (!pasteText.trim()) return;
    const result = parseCSV(pasteText);
    if (result.success && result.data) {
      setParsedData(result.data.fields, result.data.rows);
      setNotification({ type: 'success', message: `成功解析 ${result.data.rows.length} 行 × ${result.data.fields.length} 列数据` });
      setPasteText('');
      setShowPaste(false);
    } else {
      setNotification({ type: 'error', message: result.error || '解析失败' });
    }
  }, [pasteText, setParsedData, setNotification]);

  const handleDragStart = useCallback((e: React.DragEvent, field: string) => {
    e.dataTransfer.setData('text/plain', field);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedField(field);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedField(null);
    setDragOverAxis(null);
  }, []);

  const handleAxisDragOver = useCallback(
    (e: React.DragEvent, axis: keyof AxisMapping) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverAxis(axis);
    },
    []
  );

  const handleAxisDragLeave = useCallback(() => {
    setDragOverAxis(null);
  }, []);

  const handleAxisDrop = useCallback(
    (e: React.DragEvent, axis: keyof AxisMapping) => {
      e.preventDefault();
      const field = e.dataTransfer.getData('text/plain');
      if (field) {
        updateAxisMapping(axis, field);
      }
      setDraggedField(null);
      setDragOverAxis(null);
    },
    [updateAxisMapping]
  );

  const availableFields = getAvailableFields();

  return (
    <div className="app-container">
      {notification && (
        <div
          className={`notification-bar ${notification.type}`}
          style={{
            background: notification.type === 'error' ? '#ffebee' : '#e8f5e9',
            color: notification.type === 'error' ? '#c62828' : '#2e7d32',
          }}
        >
          {notification.message}
        </div>
      )}

      <button
        className="hamburger-btn"
        onClick={() => setDrawerOpen(!drawerOpen)}
        aria-label="菜单"
      >
        <Menu size={18} />
      </button>

      <aside className={`left-panel ${drawerOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h1 className="panel-title">数据叙事图表工坊</h1>
        </div>

        <div className="panel-section">
          <div className="section-label">数据导入</div>
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            <span>上传 CSV / TSV 文件</span>
          </button>
          <button
            className="paste-btn"
            onClick={() => setShowPaste(!showPaste)}
          >
            粘贴文本数据
          </button>
          {showPaste && (
            <div className="paste-area">
              <textarea
                className="paste-textarea"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="粘贴 CSV 或 TSV 格式数据..."
                rows={6}
              />
              <button className="paste-submit-btn" onClick={handlePasteSubmit}>
                解析数据
              </button>
            </div>
          )}
        </div>

        {fields.length > 0 && (
          <>
            <div className="panel-section">
              <div className="section-label">字段列表</div>
              <div className="field-list">
                {availableFields.map((field) => (
                  <div
                    key={field}
                    className="field-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, field)}
                    onDragEnd={handleDragEnd}
                  >
                    <GripVertical size={14} className="field-grip" />
                    <span className="field-name">{field}</span>
                  </div>
                ))}
                {availableFields.length === 0 && (
                  <div className="field-empty">所有字段已映射到轴</div>
                )}
              </div>
            </div>

            <div className="panel-section">
              <div className="section-label">轴映射</div>
              <div className="axis-slots">
                {(Object.keys(axisMapping) as (keyof AxisMapping)[]).map(
                  (axis) => (
                    <div
                      key={axis}
                      className={`axis-slot ${dragOverAxis === axis ? 'drag-over' : ''} ${axisMapping[axis] ? 'filled' : ''}`}
                      onDragOver={(e) => handleAxisDragOver(e, axis)}
                      onDragLeave={handleAxisDragLeave}
                      onDrop={(e) => handleAxisDrop(e, axis)}
                    >
                      <span className="axis-icon">{AXIS_ICONS[axis]}</span>
                      <span className="axis-label">{AXIS_LABELS[axis]}</span>
                      {axisMapping[axis] ? (
                        <div className="axis-field-chip">
                          <span>{axisMapping[axis]}</span>
                          <button
                            className="axis-remove-btn"
                            onClick={() => clearAxisMapping(axis)}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="axis-placeholder">拖入字段</span>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </aside>

      <div
        className={`drawer-overlay ${drawerOpen ? 'visible' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      <main className="right-canvas" ref={containerRef}>
        <div className="chart-type-switcher">
          {CHART_TYPES.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              className={`chart-type-btn ${chartType === type ? 'active' : ''}`}
              onClick={() => setChartType(type)}
              title={label}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>

        <div className="canvas-grid">
          {axisMapping.x && axisMapping.y && rows.length > 0 ? (
            <svg
              ref={svgRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="chart-svg"
            />
          ) : (
            <div className="canvas-placeholder">
              <div className="placeholder-icon">
                <BarChart3 size={48} strokeWidth={1} />
              </div>
              <p>上传数据并拖拽字段到轴区以生成图表</p>
            </div>
          )}
        </div>

        {detailCard && (
          <DetailCardView
            data={detailCard}
            onClose={() => setDetailCard(null)}
            canvasWidth={canvasSize.width}
          />
        )}
      </main>
    </div>
  );
}

function DetailCardView({
  data,
  onClose,
  canvasWidth,
}: {
  data: DetailCardData;
  onClose: () => void;
  canvasWidth: number;
}) {
  const cardWidth = 280;
  const leftOffset = Math.min(data.x, canvasWidth - cardWidth - 16);
  const adjustedX = Math.max(16, leftOffset);

  return (
    <div
      className="detail-card"
      style={{
        left: adjustedX,
        top: data.y - 8,
      }}
    >
      <div className="detail-card-header">
        <span className="detail-card-title">数据详情</span>
        <button className="detail-card-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div className="detail-card-body">
        {Object.entries(data.row).map(([key, value]) => (
          <div key={key} className="detail-row">
            <span className="detail-key">{key}</span>
            <span className="detail-value">
              {typeof value === 'number' ? value.toLocaleString() : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

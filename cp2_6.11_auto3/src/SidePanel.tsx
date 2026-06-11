import React, { useMemo } from 'react';
import type { ModuleAnalysis, ModuleNode, DependencyType } from './utils/analyzer';
import { analyzeModule } from './utils/analyzer';

interface SidePanelProps {
  modules: ModuleNode[];
  selectedNode: string | null;
  onSelectNode: (name: string) => void;
}

const SidePanel: React.FC<SidePanelProps> = ({ modules, selectedNode, onSelectNode }) => {
  const analysis = useMemo(() => {
    if (!selectedNode) return null;
    return analyzeModule(modules, selectedNode);
  }, [modules, selectedNode]);

  const getDepType = (depName: string): DependencyType | 'circular' => {
    const mod = modules.find(m => m.name === selectedNode);
    if (mod) {
      const dep = mod.dependencies.find(d => d.name === depName);
      if (dep) return dep.type;
    }
    const upstreamMod = modules.find(m => m.name === depName);
    if (upstreamMod) {
      const dep = upstreamMod.dependencies.find(d => d.name === selectedNode);
      if (dep) return dep.type;
    }
    return 'internal';
  };

  const isInCircularPath = (name: string): boolean => {
    if (!analysis) return false;
    return analysis.circularPaths.some(p => p.includes(name));
  };

  if (!selectedNode || !analysis) {
    return (
      <div className="side-panel">
        <div className="side-panel-header">
          <div className="side-panel-title">模块详情</div>
        </div>
        <div className="side-panel-body">
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <div>点击图中的模块节点</div>
            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
              查看其详细依赖关系与影响范围
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isExternal = !modules.some(m => m.name === selectedNode);

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <div className="side-panel-title">模块详情</div>
      </div>
      <div className="side-panel-body">
        <div className="glass-card">
          <div className="module-detail-title">{analysis.name}</div>
          <div className={`module-detail-type ${isExternal ? 'external' : ''}`}>
            {isExternal ? '外部库' : '内部模块'} · 深度 {analysis.depth}
          </div>

          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-value">{analysis.directUpstream.length}</div>
              <div className="stat-label">直接上游</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{analysis.directDownstream.length}</div>
              <div className="stat-label">直接下游</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{analysis.allUpstream.length}</div>
              <div className="stat-label">所有上游</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{analysis.allDownstream.length}</div>
              <div className="stat-label">所有下游</div>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-value">{analysis.impactScore.toFixed(1)}</div>
              <div className="stat-label">影响分数</div>
            </div>
            <div className="stat-item">
              <div className={`stat-value ${analysis.circularPaths.length > 0 ? 'warning' : ''}`}>
                {analysis.circularPaths.length}
              </div>
              <div className="stat-label">循环依赖</div>
            </div>
          </div>
        </div>

        {analysis.directUpstream.length > 0 && (
          <>
            <div className="section-title">直接上游（引用它）</div>
            <ul className="dep-list">
              {analysis.directUpstream.map(name => (
                <li
                  key={`up-${name}`}
                  className="dep-item"
                  onClick={() => onSelectNode(name)}
                >
                  <span className={`dep-type-badge ${isInCircularPath(name) ? 'circular' : getDepType(name)}`}></span>
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {analysis.directDownstream.length > 0 && (
          <>
            <div className="section-title">直接下游（它引用）</div>
            <ul className="dep-list">
              {analysis.directDownstream.map(name => (
                <li
                  key={`down-${name}`}
                  className="dep-item"
                  onClick={() => onSelectNode(name)}
                >
                  <span className={`dep-type-badge ${isInCircularPath(name) ? 'circular' : getDepType(name)}`}></span>
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {analysis.circularPaths.length > 0 && (
          <>
            <div className="section-title">循环依赖路径</div>
            {analysis.circularPaths.map((path, idx) => (
              <div key={idx} className="glass-card" style={{ marginBottom: '10px' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--accent-red)',
                  lineHeight: '1.8',
                  wordBreak: 'break-all'
                }}>
                  {path.map((p, i) => (
                    <span key={i}>
                      <span
                        style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' }}
                        onClick={() => onSelectNode(p)}
                      >{p}</span>
                      {i < path.length - 1 ? ' → ' : ''}
                    </span>
                  ))}
                  <span> → {path[0]}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {analysis.allUpstream.length > analysis.directUpstream.length && (
          <>
            <div className="section-title">所有上游模块</div>
            <ul className="dep-list">
              {analysis.allUpstream.filter(n => !analysis.directUpstream.includes(n)).map(name => (
                <li
                  key={`allup-${name}`}
                  className="dep-item"
                  onClick={() => onSelectNode(name)}
                  style={{ opacity: 0.7 }}
                >
                  <span className={`dep-type-badge ${isInCircularPath(name) ? 'circular' : 'internal'}`}></span>
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {analysis.allDownstream.length > analysis.directDownstream.length && (
          <>
            <div className="section-title">所有下游模块</div>
            <ul className="dep-list">
              {analysis.allDownstream.filter(n => !analysis.directDownstream.includes(n)).map(name => (
                <li
                  key={`alldown-${name}`}
                  className="dep-item"
                  onClick={() => onSelectNode(name)}
                  style={{ opacity: 0.7 }}
                >
                  <span className={`dep-type-badge ${isInCircularPath(name) ? 'circular' : 'internal'}`}></span>
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default SidePanel;

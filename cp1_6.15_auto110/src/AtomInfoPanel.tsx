import { useMoleculeStore } from './store';
import { getAtomColor } from './moleculeParser';

const ELEMENT_NAMES: Record<string, string> = {
  C: '碳 (Carbon)',
  O: '氧 (Oxygen)',
  N: '氮 (Nitrogen)',
  H: '氢 (Hydrogen)',
};

export default function AtomInfoPanel() {
  const selectedAtomId = useMoleculeStore((s) => s.selectedAtomId);
  const getAtomById = useMoleculeStore((s) => s.getAtomById);
  const getAtomBonds = useMoleculeStore((s) => s.getAtomBonds);

  const atom = selectedAtomId !== null ? getAtomById(selectedAtomId) : undefined;
  const bonds = selectedAtomId !== null ? getAtomBonds(selectedAtomId) : [];

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    left: '16px',
    width: '220px',
    maxHeight: 'calc(100vh - 32px)',
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    overflowY: 'auto',
    zIndex: 10,
    color: '#e0e0e0',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    scrollbarWidth: 'thin',
    scrollbarColor: '#3a3a4a transparent',
  };

  const responsiveStyle: React.CSSProperties = {
    ...panelStyle,
    ...(typeof window !== 'undefined' && window.innerWidth < 768
      ? {
          top: 'auto',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxHeight: '45vh',
          borderRadius: '16px 16px 0 0',
          padding: '20px 16px',
        }
      : {}),
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    margin: 0,
    marginBottom: '12px',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#888899',
    marginBottom: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#e0e0e0',
    marginBottom: '10px',
  };

  const coordContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    marginBottom: '14px',
  };

  const coordItemStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '6px',
    padding: '6px 4px',
    textAlign: 'center',
  };

  const bondItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '6px',
    marginBottom: '4px',
    fontSize: '12px',
  };

  return (
    <div style={responsiveStyle}>
      <h3 style={titleStyle}>
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: atom ? getAtomColor(atom.element) : '#666',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        原子信息
      </h3>

      {!atom ? (
        <div style={{ fontSize: '12px', color: '#888899', lineHeight: 1.6 }}>
          点击分子中的任意原子以查看详细信息。您可以使用鼠标拖拽旋转分子，滚轮缩放，右键平移。
        </div>
      ) : (
        <>
          <div style={labelStyle}>元素</div>
          <div
            style={{
              ...valueStyle,
              fontSize: '16px',
              fontWeight: 600,
              color: '#ffffff',
            }}
          >
            {atom.element} - {ELEMENT_NAMES[atom.element] || atom.element}
          </div>

          <div style={labelStyle}>原子ID</div>
          <div style={valueStyle}>#{atom.id}</div>

          <div style={labelStyle}>三维坐标</div>
          <div style={coordContainerStyle}>
            <div style={coordItemStyle}>
              <div style={{ ...labelStyle, marginBottom: '2px', textAlign: 'center' }}>X</div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e0e0e0' }}>
                {atom.x.toFixed(2)}
              </div>
            </div>
            <div style={coordItemStyle}>
              <div style={{ ...labelStyle, marginBottom: '2px', textAlign: 'center' }}>Y</div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e0e0e0' }}>
                {atom.y.toFixed(2)}
              </div>
            </div>
            <div style={coordItemStyle}>
              <div style={{ ...labelStyle, marginBottom: '2px', textAlign: 'center' }}>Z</div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e0e0e0' }}>
                {atom.z.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={labelStyle}>所属化学键 ({bonds.length})</div>
          {bonds.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#888899' }}>无化学键连接</div>
          ) : (
            <div>
              {bonds.map((bond) => {
                const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
                const otherAtom = getAtomById(otherId);
                return (
                  <div key={bond.id} style={bondItemStyle}>
                    <span style={{ color: '#888899' }}>键 #{bond.id}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: otherAtom ? getAtomColor(otherAtom.element) : '#666',
                        }}
                      />
                      <span style={{ fontFamily: 'monospace' }}>
                        {otherAtom ? otherAtom.element : '?'}#{otherId}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

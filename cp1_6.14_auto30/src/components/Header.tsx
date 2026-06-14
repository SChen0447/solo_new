export function Header() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
      }}
      className="glass-panel fade-in"
    >
      <div style={{ padding: '16px 24px' }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#e0e8ff',
            margin: 0,
            letterSpacing: 2,
            textShadow: '0 0 20px rgba(100, 150, 255, 0.5)',
          }}
        >
          🌍 实时地震监测
        </h1>
        <p
          style={{
            fontSize: 12,
            color: '#8899bb',
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          Global Earthquake Visualization
        </p>
      </div>
    </div>
  )
}

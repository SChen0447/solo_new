import { useEarthquakeStore } from '../store/useEarthquakeStore'
import { formatTime, getMagnitudeColor } from '../utils/geoUtils'

export function InfoCard() {
  const { selectedEarthquake, setSelectedEarthquake } = useEarthquakeStore()

  if (!selectedEarthquake) return null

  const magColor = getMagnitudeColor(selectedEarthquake.magnitude)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        width: 420,
      }}
      className="glass-panel fade-in"
    >
      <div style={{ padding: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#c0d0ff',
                margin: 0,
                marginBottom: 4,
              }}
            >
              地震详情
            </h3>
            <p
              style={{
                fontSize: 14,
                color: '#99aacc',
                margin: 0,
              }}
            >
              {selectedEarthquake.place}
            </p>
          </div>
          <button
            onClick={() => setSelectedEarthquake(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#8899bb',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8899bb'
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <InfoItem
            label="震级"
            value={selectedEarthquake.magnitude.toFixed(1)}
            suffix="级"
            color={magColor}
            large
          />
          <InfoItem
            label="深度"
            value={selectedEarthquake.depth.toFixed(1)}
            suffix="公里"
            color="#4da6ff"
          />
          <InfoItem
            label="纬度"
            value={selectedEarthquake.latitude.toFixed(3)}
            suffix="°N"
            color="#99aacc"
          />
          <InfoItem
            label="经度"
            value={selectedEarthquake.longitude.toFixed(3)}
            suffix="°E"
            color="#99aacc"
          />
        </div>

        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid rgba(100, 150, 255, 0.2)',
          }}
        >
          <div style={{ fontSize: 12, color: '#8899bb', marginBottom: 4 }}>发生时间</div>
          <div style={{ fontSize: 14, color: '#c0d0ff' }}>
            {formatTime(selectedEarthquake.time)}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: '#667799',
          }}
        >
          震级类型: {selectedEarthquake.magType?.toUpperCase() || 'N/A'}
        </div>
      </div>
    </div>
  )
}

interface InfoItemProps {
  label: string
  value: string
  suffix?: string
  color: string
  large?: boolean
}

function InfoItem({ label, value, suffix, color, large }: InfoItemProps) {
  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'rgba(30, 50, 90, 0.4)',
        borderRadius: 8,
        transition: 'all 0.2s ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(50, 80, 140, 0.5)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(30, 50, 90, 0.4)'
      }}
    >
      <div style={{ fontSize: 12, color: '#8899bb', marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: large ? 28 : 20,
          fontWeight: 700,
          color,
          lineHeight: 1.2,
        }}
      >
        {value}
        {suffix && (
          <span style={{ fontSize: large ? 14 : 12, fontWeight: 400, color: '#7788aa', marginLeft: 4 }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

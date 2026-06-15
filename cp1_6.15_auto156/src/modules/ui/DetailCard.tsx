import React from 'react'
import { useStore } from '@/store/Store'

const organelleDescriptions: Record<string, { description: string; function: string }> = {
  nucleus: {
    description: '细胞核是细胞的控制中心，包含遗传物质DNA。',
    function: '调控基因表达，介导DNA复制，控制细胞的生长、代谢和繁殖。',
  },
  mitochondria: {
    description: '线粒体是细胞的能量工厂，进行有氧呼吸产生ATP。',
    function: '通过氧化磷酸化合成ATP，为细胞代谢提供能量，参与细胞凋亡调控。',
  },
  chloroplast: {
    description: '叶绿体是植物细胞特有的细胞器，进行光合作用。',
    function: '利用光能将CO₂和H₂O转化为有机物和O₂，是生态系统的能量输入点。',
  },
  golgi: {
    description: '高尔基体由堆叠的扁平囊泡组成，负责蛋白质加工。',
    function: '修饰、分类和包装蛋白质，将其运输到目的地，参与溶酶体形成。',
  },
  endoplasmicReticulum: {
    description: '内质网是连续的膜网络，分为粗面和滑面两种类型。',
    function: '粗面ER合成蛋白质，滑面ER合成脂质，参与钙离子储存和释放。',
  },
  cellMembrane: {
    description: '细胞膜是包围细胞的磷脂双分子层，具有选择透过性。',
    function: '控制物质进出细胞，传递信号，维持细胞形态和内部稳定。',
  },
  cellWall: {
    description: '细胞壁是植物细胞外层的坚硬结构，主要由纤维素组成。',
    function: '提供机械支持，维持细胞形状，防止细胞吸水涨破，参与防御。',
  },
  vacuole: {
    description: '液泡是植物细胞中的大型囊泡，内含细胞液。',
    function: '储存水分和营养物质，维持细胞膨压，参与色素储存和降解。',
  },
}

const DetailCard: React.FC = () => {
  const selectedOrganelleId = useStore((state) => state.selectedOrganelleId)
  const organelleData = useStore((state) => state.organelleData)
  const setSelectedOrganelleId = useStore((state) => state.setSelectedOrganelleId)

  if (!selectedOrganelleId) return null

  const data = organelleData[selectedOrganelleId]
  const description = organelleDescriptions[selectedOrganelleId]

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const recentData = data.dataSeries.slice(-10)
  const avgValue = recentData.length > 0
    ? recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length
    : 0

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: 20,
        width: 320,
        maxWidth: 'calc(100% - 40px)',
        background: 'rgba(30, 30, 30, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 12,
        border: '1px solid rgba(0, 188, 212, 0.3)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        padding: 20,
        color: '#fff',
        fontFamily: 'sans-serif',
        zIndex: 10,
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 188, 212, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(0, 188, 212, 0); }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: data.color,
              boxShadow: `0 0 12px ${data.color}`,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: '#00bcd4',
            }}
          >
            {data.name}
          </h3>
        </div>
        <button
          onClick={() => setSelectedOrganelleId(null)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#888',
            width: 24,
            height: 24,
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(229, 57, 53, 0.5)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.color = '#888'
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: 'rgba(0, 188, 212, 0.1)',
            borderRadius: 8,
            padding: 12,
            border: '1px solid rgba(0, 188, 212, 0.2)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: '#888',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            当前值
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#00bcd4',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {data.currentValue.toFixed(2)}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0, 230, 118, 0.1)',
            borderRadius: 8,
            padding: 12,
            border: '1px solid rgba(0, 230, 118, 0.2)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: '#888',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            平均值
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#00e676',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {avgValue.toFixed(2)}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: '#888',
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{data.unit}</span>
        <span>数据点: {data.dataSeries.length}</span>
        {data.dataSeries.length > 0 && (
          <span>
            最后更新: {formatTime(data.dataSeries[data.dataSeries.length - 1].timestamp)}
          </span>
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid #333',
          paddingTop: 16,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#aaa',
            marginBottom: 8,
          }}
        >
          结构描述
        </div>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: '#ccc',
            margin: 0,
          }}
        >
          {description?.description}
        </p>
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#aaa',
            marginBottom: 8,
          }}
        >
          生理功能
        </div>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: '#ccc',
            margin: 0,
          }}
        >
          {description?.function}
        </p>
      </div>
    </div>
  )
}

export default DetailCard

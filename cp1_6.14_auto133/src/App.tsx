import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene3D from './components/Scene3D'
import { useCityData } from './store'
import { getNodeTypeColor, getLoadColor } from './utils/dataFlow'
import './index.css'

function StatsPanel() {
  const { nodes, flows } = useCityData()

  return (
    <div className="absolute top-4 left-4 z-10 pointer-events-none">
      <div
        className="rounded-lg p-4 text-white"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <h2 className="text-lg font-bold mb-3" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          城市数据监控
        </h2>
        
        <div className="space-y-3">
          {nodes.map((node) => (
            <div key={node.id} className="min-w-[200px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm" style={{ color: getNodeTypeColor(node.type) }}>
                  {node.name}
                </span>
                <span className="text-sm font-mono" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {node.load.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${node.load}%`,
                    backgroundColor: getLoadColor(node.load),
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">活跃数据流</span>
            <span className="font-mono" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {flows.length} 条
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function useDataFlowSimulation() {
  const { randomizeFlowRates, calculateNodeLoads } = useCityData()

  useEffect(() => {
    calculateNodeLoads()

    const interval = setInterval(() => {
      randomizeFlowRates()
    }, 2000)

    return () => clearInterval(interval)
  }, [randomizeFlowRates, calculateNodeLoads])
}

export default function App() {
  const {
    nodes,
    flows,
    selectedNodeId,
    hoveredNodeId,
    setSelectedNodeId,
    setHoveredNodeId,
  } = useCityData()

  useDataFlowSimulation()

  return (
    <div className="w-full h-full relative">
      <StatsPanel />

      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div
          className="text-white text-xs p-3 rounded-lg"
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div className="mb-1">🖱️ 拖拽旋转视角</div>
          <div className="mb-1">🔍 滚轮缩放</div>
          <div>📍 点击节点查看详情</div>
        </div>
      </div>

      <Canvas
        camera={{ position: [30, 25, 30], fov: 50 }}
        style={{
          background: 'radial-gradient(ellipse at center, #0a1628 0%, #1a0a2e 100%)',
        }}
      >
        <Scene3D
          nodes={nodes}
          flows={flows}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          onNodeClick={setSelectedNodeId}
          onNodeHover={setHoveredNodeId}
        />
      </Canvas>
    </div>
  )
}

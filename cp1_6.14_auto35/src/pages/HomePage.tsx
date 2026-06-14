import { useState, useEffect } from 'react'
import axios from 'axios'
import { Device } from '../types'
import { useFilterStore } from '../store/useFilterStore'
import DeviceCard from '../components/DeviceCard'
import './HomePage.css'

const categories = ['all', '吉他', '键盘', '音响', '效果器', '其他']
const sortOptions = [
  { value: 'default', label: '默认排序' },
  { value: 'price-asc', label: '租金从低到高' },
  { value: 'price-desc', label: '租金从高到低' }
]

function HomePage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [fadeKey, setFadeKey] = useState(0)

  const { searchQuery, category, sortOrder, setSearchQuery, setCategory, setSortOrder, filterDevices } =
    useFilterStore()

  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true)
      try {
        const res = await axios.get('/api/devices')
        setDevices(res.data)
      } catch (error) {
        console.error('获取设备列表失败:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDevices()
  }, [])

  const filteredDevices = filterDevices(devices)

  const handleFilterChange = () => {
    setFadeKey(prev => prev + 1)
  }

  const handleCategoryChange = (c: string) => {
    setCategory(c)
    handleFilterChange()
  }

  const handleSortChange = (s: string) => {
    setSortOrder(s as any)
    handleFilterChange()
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  return (
    <div className="home-page">
      <div className="container">
      <div className="hero-section">
        <h1 className="hero-title">🎵 发现音乐设备</h1>
        <p className="hero-subtitle">租赁专业音乐设备，开启你的音乐之旅</p>
      </div>

      <div className="filters-section">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索设备名称或描述..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn ${category === cat ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat)}
              >
                {cat === 'all' ? '全部' : cat}
              </button>
            ))}
          </div>

          <select
            className="sort-select"
            value={sortOrder}
            onChange={e => handleSortChange(e.target.value)}
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="results-info">
        共 <span className="results-count">{filteredDevices.length}</span> 个设备
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎸</div>
          <p>没有找到匹配的设备</p>
          <p className="empty-hint">试试其他搜索词或分类</p>
        </div>
      ) : (
        <div key={fadeKey} className="devices-grid fade-in">
          {filteredDevices.map((device, index) => (
            <DeviceCard key={device.id} device={device} index={index} />
          ))}
        </div>
      )}
    </div>
    </div>
  )
}

export default HomePage

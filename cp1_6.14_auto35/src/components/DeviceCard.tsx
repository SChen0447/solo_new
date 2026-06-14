import { Link } from 'react-router-dom'
import { Device } from '../types'
import './DeviceCard.css'

interface DeviceCardProps {
  device: Device
  index?: number
}

function DeviceCard({ device, index = 0 }: DeviceCardProps) {
  return (
    <Link
      to={`/device/${device.id}`}
      className="device-card card"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="device-image-wrapper">
        <img src={device.imageUrl} alt={device.name} className="device-image" />
        <div className="device-category-badge">{device.category}</div>
      </div>
      <div className="device-info">
        <h3 className="device-name">{device.name}</h3>
        <div className="device-pricing">
          <div className="price-item">
            <span className="price-label">日租金</span>
            <span className="price-value">¥{device.dailyPrice}</span>
          </div>
          <div className="price-item deposit">
            <span className="price-label">押金</span>
            <span className="price-value">¥{device.deposit}</span>
          </div>
        </div>
        <div className="device-owner">
          <span>👤 {device.ownerName}</span>
        </div>
      </div>
    </Link>
  )
}

export default DeviceCard

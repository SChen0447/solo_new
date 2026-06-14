import { OrderStatus } from '../types'

interface OrderStatusBadgeProps {
  status: OrderStatus
}

const statusLabels: Record<OrderStatus, string> = {
  pending: '待支付',
  paid: '已支付',
  renting: '租赁中',
  completed: '已完成',
  cancelled: '已取消'
}

function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return <span className={`badge badge-${status}`}>{statusLabels[status]}</span>
}

export default OrderStatusBadge

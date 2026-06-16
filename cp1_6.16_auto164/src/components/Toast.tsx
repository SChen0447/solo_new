import { X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

const typeStyles: Record<string, string> = {
  error: '#F44336',
  success: '#4CAF50',
  info: '#1976D2',
}

export default function Toast() {
  const { toasts, removeToast } = useStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed z-[9999]" style={{ top: 70, right: 20 }}>
      <div className="flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'toast-enter flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm min-w-[280px] max-w-[400px]'
            )}
            style={{ backgroundColor: typeStyles[toast.type] || typeStyles.info }}
          >
            <span>{toast.message}</span>
            <button
              className="flex-shrink-0 hover:bg-white/20 rounded p-0.5 transition-colors"
              onClick={() => removeToast(toast.id)}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

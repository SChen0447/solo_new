import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';

const iconMap = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'text-status-available',
  error: 'text-red-500',
  warning: 'text-status-borrowed',
  info: 'text-status-reserved',
};

export default function NotificationPopup() {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
      {notifications.map((n) => {
        const Icon = iconMap[n.type];
        return (
          <div
            key={n.id}
            className="flex h-[50px] w-[440px] items-center gap-3 rounded-xl bg-surface-white shadow-dropdown px-5 animate-elasticIn"
          >
            <Icon className={`h-5 w-5 shrink-0 ${colorMap[n.type]}`} />
            <p className="flex-1 text-sm text-gray-700">{n.message}</p>
            <button
              onClick={() => removeNotification(n.id)}
              className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

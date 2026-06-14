import { format, differenceInDays, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'yyyy年MM月dd日', { locale: zhCN });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MM月dd日', { locale: zhCN });
  } catch {
    return dateStr;
  }
}

export function getDaysRemaining(endDateStr: string): number {
  try {
    const end = parseISO(endDateStr);
    const now = new Date();
    return differenceInDays(end, now);
  } catch {
    return 0;
  }
}

export function getCountdownText(endDateStr: string): { text: string; urgent: boolean; expired: boolean } {
  const days = getDaysRemaining(endDateStr);

  if (days < 0) {
    return { text: '已过期', urgent: false, expired: true };
  }

  if (days === 0) {
    const hours = differenceInHours(parseISO(endDateStr), new Date());
    if (hours < 0) {
      return { text: '已过期', urgent: false, expired: true };
    }
    if (hours < 24) {
      const mins = differenceInMinutes(parseISO(endDateStr), new Date());
      if (mins <= 60) {
        return { text: `${mins}分钟`, urgent: true, expired: false };
      }
      return { text: `${hours}小时`, urgent: true, expired: false };
    }
  }

  return {
    text: `${days}天`,
    urgent: days < 3,
    expired: false,
  };
}

export function getInitials(name: string): string {
  if (!name) return '';
  if (name.length <= 2) return name;
  return name.slice(0, 2);
}

export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 8) return idCard;
  return idCard.slice(0, 4) + '********' + idCard.slice(-4);
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    '小吃': '🍜',
    '水果': '🍎',
    '日用品': '🧺',
    '工艺品': '🎨',
  };
  return icons[category] || '🏪';
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case '有效':
      return 'badge-success';
    case '过期':
      return 'badge-warning';
    case '吊销':
      return 'badge-danger';
    default:
      return 'badge-info';
  }
}

export function getPatrolStatusColor(status: string): string {
  switch (status) {
    case '正常':
      return 'bg-green-500';
    case '轻微违规':
      return 'bg-yellow-500';
    case '严重违规':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

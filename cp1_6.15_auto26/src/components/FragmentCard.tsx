import { Fragment } from './BoneManager';

interface FragmentCardProps {
  fragment: Fragment;
  onClick: () => void;
  isSelected: boolean;
}

const BoneIcon = ({ name }: { name: string }) => {
  const iconPath = (() => {
    switch (name) {
      case '颅顶':
        return (
          <path d="M20 25 C20 10 44 10 44 25 L44 32 C44 35 42 37 40 37 L24 37 C22 37 20 35 20 32 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        );
      case '左颧骨':
      case '右颧骨':
        return (
          <path d="M32 20 L36 30 L32 40 L28 30 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        );
      case '上颌骨':
        return (
          <path d="M16 32 L20 24 L32 20 L44 24 L48 32 L40 36 L32 38 L24 36 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        );
      case '下颌骨':
        return (
          <path d="M16 28 L12 40 L24 44 L40 44 L52 40 L48 28 L40 32 L32 34 L24 32 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        );
      case '左犬齿':
      case '右犬齿':
        return (
          <path d="M32 16 L36 40 L32 44 L28 40 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        );
      case '鼻骨':
        return (
          <path d="M28 20 L36 20 L34 36 L30 36 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        );
      default:
        return (
          <rect x="20" y="20" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
        );
    }
  })();

  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {iconPath}
    </svg>
  );
};

export function FragmentCard({ fragment, onClick, isSelected }: FragmentCardProps) {
  const getStatusText = () => {
    if (fragment.placed) return '已放置';
    if (fragment.status === 'dragging') return '拖动中';
    if (fragment.status === 'pending') return '待拼接';
    return '未放置';
  };

  const getStatusClass = () => {
    if (fragment.placed) return 'placed';
    if (fragment.status === 'pending') return 'pending';
    return '';
  };

  return (
    <div
      className={`fragment-card ${fragment.placed ? 'placed' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="fragment-icon">
        <BoneIcon name={fragment.name} />
      </div>
      <div className="fragment-name">{fragment.name}</div>
      <div className="fragment-status">
        <span className={`status-dot ${getStatusClass()}`}></span>
        <span className="status-text">{getStatusText()}</span>
      </div>
    </div>
  );
}

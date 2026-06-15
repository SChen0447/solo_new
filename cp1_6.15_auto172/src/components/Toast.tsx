import { useColorStore } from '../store/colorStore';

export const Toast: React.FC = () => {
  const toasts = useColorStore((state) => state.toasts);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
};

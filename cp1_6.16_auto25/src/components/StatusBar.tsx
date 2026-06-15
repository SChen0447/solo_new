import { useEditor } from '../context/EditorContext';

function StatusBar() {
  const { wordCount, paragraphCount, setShowConfirmModal } = useEditor();

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item">
          <span className="status-icon">📝</span>
          字数 <strong>{wordCount}</strong>
        </span>
        <span className="status-divider">|</span>
        <span className="status-item">
          <span className="status-icon">📄</span>
          段落 <strong>{paragraphCount}</strong>
        </span>
      </div>
      <div className="status-right">
        <button
          type="button"
          className="clear-btn"
          onClick={() => setShowConfirmModal(true)}
        >
          <span>🗑️</span> 清空
        </button>
      </div>
    </div>
  );
}

export default StatusBar;

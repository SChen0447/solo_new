import { useEditor } from '../context/EditorContext';

function ConfirmModal() {
  const { showConfirmModal, setShowConfirmModal, clearAll } = useEditor();

  if (!showConfirmModal) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowConfirmModal(false);
        }
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true">
        <div className="modal-icon">⚠️</div>
        <h3 className="modal-title">确认清空所有内容？</h3>
        <p className="modal-desc">
          此操作将清除编辑器中的所有内容，同时也会删除已保存的本地数据。该操作无法撤销。
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={() => setShowConfirmModal(false)}
          >
            取消
          </button>
          <button
            type="button"
            className="modal-btn modal-btn-danger"
            onClick={clearAll}
          >
            确认清空
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

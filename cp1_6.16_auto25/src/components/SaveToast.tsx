import { useEditor } from '../context/EditorContext';

function SaveToast() {
  const { showSaveToast } = useEditor();

  return (
    <div className={`save-toast ${showSaveToast ? 'show' : ''}`} aria-live="polite">
      <span className="save-icon">✓</span>
      已保存
    </div>
  );
}

export default SaveToast;

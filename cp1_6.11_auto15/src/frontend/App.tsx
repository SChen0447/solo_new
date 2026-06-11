import { useState, useEffect, useMemo } from 'react';
import { useItems, OfficeItem, BorrowRecord } from './api/useItems';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

type ModalMode = 'add' | 'edit';

const cssStyles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #f0f6ff;
  color: #1e3a5f;
  min-height: 100vh;
}
.app-container { display: flex; flex-direction: column; min-height: 100vh; }

.navbar {
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
  color: white;
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 20px rgba(37, 99, 235, 0.2);
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.nav-brand-icon {
  width: 36px;
  height: 36px;
  background: rgba(255,255,255,0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}
.overdue-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #dc2626;
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  animation: pulse 2s infinite;
  cursor: pointer;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
}
.overdue-badge.hidden-badge { background: rgba(255,255,255,0.15); animation: none; }

.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 24px 32px;
  background: white;
  border-bottom: 1px solid #e0e7ff;
}
.stat-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.3s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(14, 165, 233, 0.15); }
.stat-card.overdue { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-color: #fecaca; }
.stat-card.borrowed { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-color: #fde68a; }
.stat-label { font-size: 13px; color: #64748b; font-weight: 500; }
.stat-value { font-size: 28px; font-weight: 700; color: #0c4a6e; }
.stat-card.overdue .stat-value { color: #991b1b; }
.stat-card.borrowed .stat-value { color: #92400e; }

.main-content {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 24px;
  padding: 24px 32px;
  flex: 1;
  max-width: 1800px;
  width: 100%;
  margin: 0 auto;
  align-self: center;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #0c4a6e;
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-secondary {
  background: white;
  color: #0c4a6e;
  border: 1px solid #cbd5e1;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s;
}
.btn-secondary:hover { background: #f1f5f9; border-color: #94a3b8; }
.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
}
.btn-danger:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
.btn-ghost {
  background: transparent;
  color: #64748b;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-ghost:hover { background: #f1f5f9; color: #0c4a6e; }
.btn-ghost.danger:hover { background: #fef2f2; color: #dc2626; }

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.4);
  transform: scale(0);
  animation: ripple 0.6s linear;
  pointer-events: none;
}
@keyframes ripple {
  to { transform: scale(4); opacity: 0; }
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.item-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1);
  border-color: #93c5fd;
}
.item-card.overdue-card {
  border-color: #fca5a5;
  background: linear-gradient(135deg, white 0%, #fff5f5 100%);
}
.item-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.item-name {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  flex: 1;
  word-break: break-word;
}
.item-code {
  font-size: 12px;
  color: #64748b;
  font-family: 'SF Mono', Consolas, monospace;
  background: #f1f5f9;
  padding: 3px 8px;
  border-radius: 4px;
  margin-top: 4px;
  display: inline-block;
}
.item-dept {
  font-size: 13px;
  color: #475569;
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.item-dept::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 4px;
  background: #2563eb;
  border-radius: 50%;
}
.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
  margin-top: 6px;
}
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
}
.status-tag.available {
  background: #dcfce7;
  color: #166534;
}
.status-tag.borrowed {
  background: #fef3c7;
  color: #92400e;
}
.status-tag.overdue {
  background: #fee2e2;
  color: #991b1b;
  animation: blink 1.2s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.borrow-count {
  font-size: 12px;
  color: #94a3b8;
}
.item-actions {
  display: flex;
  gap: 6px;
  position: absolute;
  top: 14px;
  right: 14px;
  opacity: 0;
  transition: opacity 0.2s;
}
.item-card:hover .item-actions { opacity: 1; }

.overdue-banner {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: slideIn 0.3s ease-out;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel {
  background: white;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  height: fit-content;
  position: sticky;
  top: 100px;
}
.panel-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.tab-btn {
  padding: 16px;
  background: none;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}
.tab-btn.active {
  color: #2563eb;
  background: white;
}
.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 3px;
  background: #2563eb;
  border-radius: 2px 2px 0 0;
}

.panel-body { padding: 24px; }

.form-group { margin-bottom: 18px; }
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}
.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 11px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #0f172a;
  transition: all 0.25s;
  background: white;
  font-family: inherit;
}
.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.15);
}
.form-input.error, .form-select.error {
  border-color: #f87171;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.12);
}
.form-error {
  color: #dc2626;
  font-size: 12px;
  margin-top: 5px;
}
.form-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 5px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  margin-top: 8px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}
.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
}
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.submit-btn.green {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
}
.submit-btn.green:hover { box-shadow: 0 6px 16px rgba(22, 163, 74, 0.35); }

.loading-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  vertical-align: middle;
  margin-right: 8px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.toast {
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  min-width: 280px;
  max-width: 380px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
  animation: toastIn 0.3s ease-out;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
}
.toast.leaving { animation: toastOut 0.3s ease-out forwards; }
@keyframes toastIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
@keyframes toastOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(40px); } }
.toast.success { background: #16a34a; color: white; }
.toast.error { background: #dc2626; color: white; }
.toast.info { background: #2563eb; color: white; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal {
  background: white;
  border-radius: 16px;
  padding: 28px;
  width: 90%;
  max-width: 440px;
  box-shadow: 0 25px 50px rgba(15, 23, 42, 0.2);
  animation: modalIn 0.25s ease-out;
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.modal-header {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #94a3b8;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
  border-radius: 6px;
  transition: all 0.2s;
}
.modal-close:hover { background: #f1f5f9; color: #475569; }
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.records-list {
  margin-top: 16px;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.record-item {
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
}
.record-item:last-child { border-bottom: none; }
.record-item:hover { background: #f0f9ff; }
.record-item.selected { background: #dbeafe; }
.record-item-name { font-weight: 600; color: #0f172a; }
.record-item-meta { color: #64748b; font-size: 12px; margin-top: 2px; }

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}
.empty-state-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }

@media (max-width: 768px) {
  .navbar { padding: 14px 16px; }
  .nav-brand { font-size: 18px; }
  .stats-bar { grid-template-columns: repeat(2, 1fr); padding: 16px; gap: 10px; }
  .stat-card { padding: 14px; }
  .stat-value { font-size: 22px; }
  .main-content {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  .items-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .item-card { padding: 14px; }
  .item-name { font-size: 15px; }
  .panel { position: static; }
  .toast-container { left: 16px; right: 16px; top: auto; bottom: 24px; }
  .toast { min-width: auto; width: 100%; max-width: none; }
}

@media (max-width: 480px) {
  .items-grid { grid-template-columns: 1fr; }
  .stats-bar { grid-template-columns: repeat(2, 1fr); }
}
`;

function createRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const button = e.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;
  const rect = button.getBoundingClientRect();
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - rect.left - radius}px`;
  circle.style.top = `${e.clientY - rect.top - radius}px`;
  circle.classList.add('ripple');
  const existing = button.getElementsByClassName('ripple')[0];
  if (existing) existing.remove();
  button.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

function App() {
  const {
    items,
    borrowRecords,
    stats,
    loading,
    addItem,
    updateItem,
    deleteItem,
    borrowItem,
    returnItem,
  } = useItems();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<'borrow' | 'return'>('borrow');
  const [showItemModal, setShowItemModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingItem, setEditingItem] = useState<OfficeItem | null>(null);

  const [borrowForm, setBorrowForm] = useState({
    employeeId: '',
    employeeName: '',
    itemId: '',
    expectedReturnDate: '',
  });
  const [borrowErrors, setBorrowErrors] = useState<Record<string, string>>({});

  const [returnForm, setReturnForm] = useState({
    employeeId: '',
    recordId: '',
  });
  const [returnErrors, setReturnErrors] = useState<Record<string, string>>({});
  const [returnSearch, setReturnSearch] = useState('');

  const [itemForm, setItemForm] = useState({ name: '', code: '', department: '' });
  const [itemFormErrors, setItemFormErrors] = useState<Record<string, string>>({});

  const pushToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, message: t.message + '_leaving_' } : t)));
    }, 2700);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingItem(null);
    setItemForm({ name: '', code: '', department: '' });
    setItemFormErrors({});
    setShowItemModal(true);
  };

  const openEditModal = (item: OfficeItem) => {
    setModalMode('edit');
    setEditingItem(item);
    setItemForm({ name: item.name, code: item.code, department: item.department });
    setItemFormErrors({});
    setShowItemModal(true);
  };

  const handleItemModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!itemForm.name.trim()) errors.name = '请输入物品名称';
    if (!itemForm.code.trim()) errors.code = '请输入物品编号';
    if (!itemForm.department.trim()) errors.department = '请输入所属部门';
    if (Object.keys(errors).length > 0) {
      setItemFormErrors(errors);
      return;
    }
    try {
      if (modalMode === 'add') {
        await addItem({
          name: itemForm.name.trim(),
          code: itemForm.code.trim(),
          department: itemForm.department.trim(),
        });
        pushToast('物品添加成功', 'success');
      } else if (editingItem) {
        await updateItem(editingItem.id, {
          name: itemForm.name.trim(),
          code: itemForm.code.trim(),
          department: itemForm.department.trim(),
        });
        pushToast('物品更新成功', 'success');
      }
      setShowItemModal(false);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleDeleteItem = async (item: OfficeItem) => {
    if (!window.confirm(`确定删除"${item.name}"吗？`)) return;
    try {
      await deleteItem(item.id);
      pushToast('物品删除成功', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleBorrowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!borrowForm.employeeId.trim()) errors.employeeId = '请输入工号';
    if (!borrowForm.employeeName.trim()) errors.employeeName = '请输入姓名';
    if (!borrowForm.itemId) errors.itemId = '请选择物品';
    if (!borrowForm.expectedReturnDate) errors.expectedReturnDate = '请选择预计归还日期';
    if (borrowForm.expectedReturnDate) {
      const expected = new Date(borrowForm.expectedReturnDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expected < today) errors.expectedReturnDate = '归还日期不能早于今天';
    }
    if (Object.keys(errors).length > 0) {
      setBorrowErrors(errors);
      return;
    }
    try {
      const result = await borrowItem(borrowForm.itemId, {
        employeeId: borrowForm.employeeId.trim(),
        employeeName: borrowForm.employeeName.trim(),
        expectedReturnDate: borrowForm.expectedReturnDate,
      });
      pushToast(
        `借出成功！记录编号: ${result.record.id.slice(0, 8)}...`,
        'success'
      );
      setBorrowForm({ employeeId: '', employeeName: '', itemId: '', expectedReturnDate: '' });
      setBorrowErrors({});
    } catch (err) {
      pushToast(err instanceof Error ? err.message : '借出失败', 'error');
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!returnForm.employeeId.trim()) errors.employeeId = '请输入工号';
    if (!returnForm.recordId.trim()) errors.recordId = '请输入或选择借出记录编号';
    if (Object.keys(errors).length > 0) {
      setReturnErrors(errors);
      return;
    }
    try {
      const result = await returnItem(returnForm.recordId.trim(), returnForm.employeeId.trim());
      pushToast(
        `归还成功！"${items.find((i) => i.id === result.record.itemId)?.name || ''}"已入库`,
        'success'
      );
      setReturnForm({ employeeId: '', recordId: '' });
      setReturnSearch('');
      setReturnErrors({});
    } catch (err) {
      pushToast(err instanceof Error ? err.message : '归还失败', 'error');
    }
  };

  const availableItems = useMemo(() => items.filter((i) => i.status === 'available'), [items]);
  const activeRecords = useMemo(() => {
    const recs = borrowRecords.filter((r) => !r.actualReturnDate);
    return recs;
  }, [borrowRecords]);
  const overdueActiveRecords = useMemo(
    () => activeRecords.filter((r) => r.isOverdue),
    [activeRecords]
  );
  const overdueItemIds = useMemo(
    () => new Set(overdueActiveRecords.map((r) => r.itemId)),
    [overdueActiveRecords]
  );

  const filteredRecordsForReturn = useMemo(() => {
    if (!returnSearch.trim()) return activeRecords.slice(0, 5);
    const q = returnSearch.toLowerCase();
    return activeRecords.filter((r) => {
      const item = items.find((i) => i.id === r.itemId);
      return (
        r.id.toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q) ||
        r.employeeName.toLowerCase().includes(q) ||
        (item?.name.toLowerCase().includes(q) ?? false) ||
        (item?.code.toLowerCase().includes(q) ?? false)
      );
    });
  }, [activeRecords, items, returnSearch]);

  const recordToItemMap = useMemo(() => {
    const m = new Map<string, BorrowRecord>();
    for (const r of activeRecords) m.set(r.itemId, r);
    return m;
  }, [activeRecords]);

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  return (
    <>
      <style>{cssStyles}</style>
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-brand">
            <span className="nav-brand-icon">📦</span>
            OfficeLend
            <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.85 }}>办公物品借用管理</span>
          </div>
          <div className="nav-right">
            <div
              className={`overdue-badge ${stats.overdueCount === 0 ? 'hidden-badge' : ''}`}
              onClick={() => {
                if (stats.overdueCount > 0) {
                  pushToast(`当前有 ${stats.overdueCount} 个逾期物品待处理`, 'info');
                }
              }}
            >
              <span>⚠️</span>
              逾期 {stats.overdueCount}
            </div>
          </div>
        </nav>

        <div className="stats-bar">
          <div className="stat-card">
            <span className="stat-label">📋 物品总数</span>
            <span className="stat-value">{stats.totalItems}</span>
          </div>
          <div className="stat-card borrowed">
            <span className="stat-label">📤 当前借出</span>
            <span className="stat-value">{stats.currentlyBorrowed}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">🔄 累计借出次数</span>
            <span className="stat-value">{stats.totalBorrowCount}</span>
          </div>
          <div className="stat-card overdue">
            <span className="stat-label">🚨 逾期未还</span>
            <span className="stat-value">{stats.overdueCount}</span>
          </div>
        </div>

        <div className="main-content">
          <section>
            <div className="section-header">
              <div className="section-title">
                <span>🗂️</span> 物品清单
                <span style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: '#94a3b8',
                  marginLeft: 6
                }}>
                  （共 {items.length} 件）
                </span>
              </div>
              <button className="btn-primary" onClick={openAddModal}>
                + 添加物品
              </button>
            </div>

            {items.length === 0 && !loading ? (
              <div className="empty-state" style={{ background: 'white', borderRadius: 14, border: '1px dashed #cbd5e1' }}>
                <div className="empty-state-icon">📦</div>
                <div>暂无物品，点击上方"添加物品"按钮开始</div>
              </div>
            ) : (
              <div className="items-grid">
                {items.map((item) => {
                  const isOverdue = overdueItemIds.has(item.id);
                  const record = recordToItemMap.get(item.id);
                  return (
                    <div key={item.id} className={`item-card ${isOverdue ? 'overdue-card' : ''}`}>
                      <div className="item-actions">
                        <button
                          className="btn-ghost"
                          onClick={() => openEditModal(item)}
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-ghost danger"
                          onClick={() => handleDeleteItem(item)}
                          disabled={item.status === 'borrowed'}
                          title={item.status === 'borrowed' ? '借出中无法删除' : '删除'}
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="item-card-header">
                        <div style={{ flex: 1 }}>
                          <div className="item-name">{item.name}</div>
                          <span className="item-code">{item.code}</span>
                        </div>
                      </div>
                      <div className="item-dept">{item.department}</div>
                      {record && (
                        <div style={{ fontSize: 12, color: '#475569', margin: '4px 0' }}>
                          <div>借用人：{record.employeeName}（{record.employeeId}）</div>
                          <div>应归还：{record.expectedReturnDate}</div>
                        </div>
                      )}
                      {isOverdue && (
                        <div className="overdue-banner">
                          <span>🚨</span> 已逾期，请尽快处理！
                        </div>
                      )}
                      <div className="item-footer">
                        <span
                          className={`status-tag ${
                            isOverdue ? 'overdue' : item.status === 'borrowed' ? 'borrowed' : 'available'
                          }`}
                        >
                          <span className="status-dot" />
                          {isOverdue ? '逾期未还' : item.status === 'borrowed' ? '已借出' : '可用'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="borrow-count">借 {item.borrowCount}</span>
                          {item.status === 'available' && (
                            <button
                              className="btn-primary"
                              style={{ padding: '6px 14px', fontSize: 12 }}
                              onClick={(e) => {
                                createRipple(e);
                                setActiveTab('borrow');
                                setBorrowForm((f) => ({ ...f, itemId: item.id }));
                              }}
                            >
                              借出
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="panel">
            <div className="panel-tabs">
              <button
                className={`tab-btn ${activeTab === 'borrow' ? 'active' : ''}`}
                onClick={() => setActiveTab('borrow')}
              >
                📤 借出登记
              </button>
              <button
                className={`tab-btn ${activeTab === 'return' ? 'active' : ''}`}
                onClick={() => setActiveTab('return')}
              >
                📥 归还登记
              </button>
            </div>
            <div className="panel-body">
              {activeTab === 'borrow' ? (
                <form onSubmit={handleBorrowSubmit}>
                  <div className="form-group">
                    <label className="form-label">工号</label>
                    <input
                      className={`form-input ${borrowErrors.employeeId ? 'error' : ''}`}
                      placeholder="例如：E001"
                      value={borrowForm.employeeId}
                      onChange={(e) => {
                        setBorrowForm({ ...borrowForm, employeeId: e.target.value });
                        if (borrowErrors.employeeId) setBorrowErrors({ ...borrowErrors, employeeId: '' });
                      }}
                    />
                    {borrowErrors.employeeId && <div className="form-error">{borrowErrors.employeeId}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">姓名</label>
                    <input
                      className={`form-input ${borrowErrors.employeeName ? 'error' : ''}`}
                      placeholder="请输入姓名"
                      value={borrowForm.employeeName}
                      onChange={(e) => {
                        setBorrowForm({ ...borrowForm, employeeName: e.target.value });
                        if (borrowErrors.employeeName) setBorrowErrors({ ...borrowErrors, employeeName: '' });
                      }}
                    />
                    {borrowErrors.employeeName && <div className="form-error">{borrowErrors.employeeName}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">选择物品</label>
                    <select
                      className={`form-select ${borrowErrors.itemId ? 'error' : ''}`}
                      value={borrowForm.itemId}
                      onChange={(e) => {
                        setBorrowForm({ ...borrowForm, itemId: e.target.value });
                        if (borrowErrors.itemId) setBorrowErrors({ ...borrowErrors, itemId: '' });
                      }}
                    >
                      <option value="">-- 请选择可用物品 --</option>
                      {availableItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}（{item.code}）- {item.department}
                        </option>
                      ))}
                    </select>
                    {borrowErrors.itemId && <div className="form-error">{borrowErrors.itemId}</div>}
                    {availableItems.length === 0 && (
                      <div className="form-hint">⚠️ 当前暂无可借物品</div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">预计归还日期</label>
                    <input
                      type="date"
                      className={`form-input ${borrowErrors.expectedReturnDate ? 'error' : ''}`}
                      value={borrowForm.expectedReturnDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        setBorrowForm({ ...borrowForm, expectedReturnDate: e.target.value });
                        if (borrowErrors.expectedReturnDate) setBorrowErrors({ ...borrowErrors, expectedReturnDate: '' });
                      }}
                    />
                    {borrowErrors.expectedReturnDate && (
                      <div className="form-error">{borrowErrors.expectedReturnDate}</div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="submit-btn"
                    onClick={createRipple}
                    disabled={loading}
                  >
                    {loading && <span className="loading-spinner" />}
                    提交借出
                  </button>
                </form>
              ) : (
                <form onSubmit={handleReturnSubmit}>
                  <div className="form-group">
                    <label className="form-label">工号</label>
                    <input
                      className={`form-input ${returnErrors.employeeId ? 'error' : ''}`}
                      placeholder="请输入借用时的工号"
                      value={returnForm.employeeId}
                      onChange={(e) => {
                        setReturnForm({ ...returnForm, employeeId: e.target.value });
                        if (returnErrors.employeeId) setReturnErrors({ ...returnErrors, employeeId: '' });
                      }}
                    />
                    {returnErrors.employeeId && <div className="form-error">{returnErrors.employeeId}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">借出记录编号</label>
                    <input
                      className={`form-input ${returnErrors.recordId ? 'error' : ''}`}
                      placeholder="搜索或从下方选择记录"
                      value={returnForm.recordId}
                      onChange={(e) => {
                        setReturnForm({ ...returnForm, recordId: e.target.value });
                        setReturnSearch(e.target.value);
                        if (returnErrors.recordId) setReturnErrors({ ...returnErrors, recordId: '' });
                      }}
                      onFocus={(e) => setReturnSearch(e.target.value)}
                    />
                    {returnErrors.recordId && <div className="form-error">{returnErrors.recordId}</div>}
                  </div>
                  {filteredRecordsForReturn.length > 0 && (
                    <div className="records-list">
                      {filteredRecordsForReturn.map((r) => {
                        const item = items.find((i) => i.id === r.itemId);
                        return (
                          <div
                            key={r.id}
                            className={`record-item ${returnForm.recordId === r.id ? 'selected' : ''}`}
                            onClick={() => {
                              setReturnForm({ ...returnForm, recordId: r.id });
                              setReturnSearch(r.id);
                              if (returnErrors.recordId) setReturnErrors({ ...returnErrors, recordId: '' });
                            }}
                          >
                            <div className="record-item-name">
                              {r.isOverdue ? '🚨 ' : ''}{item?.name ?? '未知物品'}
                              <span style={{ marginLeft: 6, fontWeight: 400, color: '#94a3b8', fontSize: 11 }}>
                                {item?.code}
                              </span>
                            </div>
                            <div className="record-item-meta">
                              {r.employeeName}（{r.employeeId}）· 编号 {r.id.slice(0, 12)}... · 应还 {r.expectedReturnDate}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {activeRecords.length === 0 && (
                    <div className="form-hint" style={{ marginTop: 0 }}>
                      🎉 暂无待归还记录
                    </div>
                  )}
                  <button
                    type="submit"
                    className="submit-btn green"
                    style={{ marginTop: 18 }}
                    onClick={createRipple}
                    disabled={loading}
                  >
                    {loading && <span className="loading-spinner" />}
                    确认归还
                  </button>
                </form>
              )}
            </div>
          </aside>
        </div>
      </div>

      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type} ${t.message.endsWith('_leaving_') ? 'leaving' : ''}`}
          >
            <span>
              {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span style={{ flex: 1 }}>{t.message.replace(/_leaving_$/, '')}</span>
          </div>
        ))}
      </div>

      {showItemModal && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>{modalMode === 'add' ? '➕ 添加新物品' : '✏️ 编辑物品'}</span>
              <button className="modal-close" onClick={() => setShowItemModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleItemModalSubmit}>
              <div className="form-group">
                <label className="form-label">物品名称</label>
                <input
                  className={`form-input ${itemFormErrors.name ? 'error' : ''}`}
                  placeholder="例如：投影仪 B"
                  value={itemForm.name}
                  onChange={(e) => {
                    setItemForm({ ...itemForm, name: e.target.value });
                    if (itemFormErrors.name) setItemFormErrors({ ...itemFormErrors, name: '' });
                  }}
                />
                {itemFormErrors.name && <div className="form-error">{itemFormErrors.name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">物品编号</label>
                <input
                  className={`form-input ${itemFormErrors.code ? 'error' : ''}`}
                  placeholder="例如：PRJ-002"
                  value={itemForm.code}
                  onChange={(e) => {
                    setItemForm({ ...itemForm, code: e.target.value });
                    if (itemFormErrors.code) setItemFormErrors({ ...itemFormErrors, code: '' });
                  }}
                />
                {itemFormErrors.code && <div className="form-error">{itemFormErrors.code}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">所属部门</label>
                <input
                  className={`form-input ${itemFormErrors.department ? 'error' : ''}`}
                  placeholder="例如：行政部"
                  value={itemForm.department}
                  onChange={(e) => {
                    setItemForm({ ...itemForm, department: e.target.value });
                    if (itemFormErrors.department) setItemFormErrors({ ...itemFormErrors, department: '' });
                  }}
                />
                {itemFormErrors.department && <div className="form-error">{itemFormErrors.department}</div>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowItemModal(false)}>
                  取消
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  onClick={createRipple}
                  disabled={loading}
                >
                  {modalMode === 'add' ? '添加' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default App;

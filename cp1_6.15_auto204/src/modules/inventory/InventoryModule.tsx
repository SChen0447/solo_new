import React, { useState, useEffect, useCallback } from 'react';
import { useInventoryStore } from '../../stores/inventoryStore';
import InventoryStats from './InventoryStats';

const InventoryModule: React.FC = () => {
  const {
    items,
    loading,
    error,
    searchTerm,
    fetchInventory,
    addItem,
    updateItem,
    deleteItem,
    restockItem,
    setSearchTerm,
    getFilteredItems,
  } = useInventoryStore();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [restockItem_id, setRestockItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: '米',
    quantity: 0,
    unit_cost: 0,
  });
  const [restockQty, setRestockQty] = useState(0);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filteredItems = getFilteredItems();

  const resetForm = useCallback(() => {
    setFormData({ name: '', unit: '米', quantity: 0, unit_cost: 0 });
    setEditingItem(null);
    setShowForm(false);
    setFormError('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('请输入材料名称');
      return;
    }
    if (formData.quantity < 0) {
      setFormError('数量不能为负数');
      return;
    }

    try {
      if (editingItem) {
        await updateItem(editingItem, formData);
      } else {
        await addItem(formData);
      }
      resetForm();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleEdit = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      setFormData({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      });
      setEditingItem(id);
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除此材料吗？关联的消耗记录也将被删除。')) {
      try {
        await deleteItem(id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleRestock = async () => {
    if (!restockItem_id || restockQty <= 0) return;
    try {
      await restockItem(restockItem_id, restockQty);
      setRestockItemId(null);
      setRestockQty(0);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isLowStock = (item: { quantity: number; initial_quantity: number }) =>
    item.initial_quantity > 0 && item.quantity < item.initial_quantity * 0.1;

  return (
    <div className="module-container fade-in">
      <div className="module-header">
        <h2>库存管理</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + 新增材料
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索材料名称..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field"
        />
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal card fade-in" onClick={(e) => e.stopPropagation()}>
            <h3>{editingItem ? '编辑材料' : '新增材料'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>材料名称</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：浅蓝色棉布"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>计量单位</label>
                  <select
                    className="input-field"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="米">米</option>
                    <option value="克">克</option>
                    <option value="个">个</option>
                    <option value="卷">卷</option>
                    <option value="包">包</option>
                    <option value="块">块</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>数量</label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>成本单价（元）</label>
                <input
                  type="number"
                  className="input-field"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: Number(e.target.value) })}
                  min="0"
                  step="0.01"
                />
              </div>
              {formError && <div className="error-msg">{formError}</div>}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {editingItem ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {restockItem_id && (
        <div className="modal-overlay" onClick={() => setRestockItemId(null)}>
          <div className="modal card fade-in" onClick={(e) => e.stopPropagation()}>
            <h3>补货</h3>
            <div className="form-group">
              <label>补货数量</label>
              <input
                type="number"
                className="input-field"
                value={restockQty}
                onChange={(e) => setRestockQty(Number(e.target.value))}
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setRestockItemId(null)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleRestock}>
                确认补货
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>编号</th>
              <th>材料名称</th>
              <th>单位</th>
              <th>当前库存</th>
              <th>初始库存</th>
              <th>成本单价</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-row">
                  暂无材料数据
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => (
                <tr
                  key={item.id}
                  id={`inventory-${item.id}`}
                  className={`${isLowStock(item) ? 'low-stock-row' : ''} ${idx % 2 === 1 ? 'zebra-row' : ''}`}
                >
                  <td className="cell-id">{item.id.slice(0, 8)}</td>
                  <td>{item.name}</td>
                  <td>{item.unit}</td>
                  <td className={isLowStock(item) ? 'text-danger' : ''}>
                    {item.quantity}
                  </td>
                  <td>{item.initial_quantity}</td>
                  <td>¥{item.unit_cost.toFixed(2)}</td>
                  <td className="cell-date">
                    {new Date(item.updated_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="cell-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setRestockItemId(item.id)}
                    >
                      补货
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEdit(item.id)}
                    >
                      编辑
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(item.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InventoryStats />
    </div>
  );
};

export default InventoryModule;

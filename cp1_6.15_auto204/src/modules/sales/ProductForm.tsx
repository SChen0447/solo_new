import React, { useState, useEffect } from 'react';
import { useInventoryStore, InventoryItem } from '../../stores/inventoryStore';
import { useSalesStore, MaterialConsumption } from '../../stores/salesStore';

interface ProductFormProps {
  onClose: () => void;
  onSaved: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ onClose, onSaved }) => {
  const { items, fetchInventory } = useInventoryStore();
  const { createProduct } = useSalesStore();

  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialConsumption[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleToggleMaterial = (item: InventoryItem) => {
    const exists = selectedMaterials.find((m) => m.inventoryId === item.id);
    if (exists) {
      setSelectedMaterials(selectedMaterials.filter((m) => m.inventoryId !== item.id));
    } else {
      setSelectedMaterials([
        ...selectedMaterials,
        { inventoryId: item.id, quantity: 0 },
      ]);
    }
  };

  const handleQuantityChange = (inventoryId: string, quantity: number) => {
    setSelectedMaterials(
      selectedMaterials.map((m) =>
        m.inventoryId === inventoryId ? { ...m, quantity } : m
      )
    );
  };

  const getItemById = (id: string) => items.find((i) => i.id === id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('请输入作品名称');
      return;
    }
    if (price <= 0) {
      setFormError('售价必须大于0');
      return;
    }
    if (selectedMaterials.length === 0) {
      setFormError('请至少选择一种材料');
      return;
    }

    const zeroQty = selectedMaterials.find((m) => m.quantity <= 0);
    if (zeroQty) {
      const item = getItemById(zeroQty.inventoryId);
      setFormError(`${item?.name || '材料'}消耗量必须大于0`);
      return;
    }

    for (const m of selectedMaterials) {
      const item = getItemById(m.inventoryId);
      if (item && m.quantity > item.quantity) {
        setFormError(
          `${item.name}材料库存不足，当前仅剩${item.quantity}${item.unit}`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      await createProduct(name, price, selectedMaterials);
      onSaved();
      onClose();
    } catch (err: any) {
      if (err.message.includes('库存不足')) {
        try {
          const data = JSON.parse(err.message.replace('库存不足', '').trim() || '{}');
          setFormError(
            `${data.insufficient?.map((i: any) => `${i.name}材料库存不足，当前仅剩${i.available}${i.unit}`).join('；') || '库存不足'}`
          );
        } catch {
          setFormError(err.message);
        }
      } else {
        setFormError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card fade-in" onClick={(e) => e.stopPropagation()}>
        <h3>登记新作品</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>作品名称</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：手工刺绣香包"
            />
          </div>
          <div className="form-group">
            <label>售价（元）</label>
            <input
              type="number"
              className="input-field"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min="0.01"
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label>选择材料</label>
            <div className="multi-select">
              <div
                className="multi-select-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {selectedMaterials.length === 0
                  ? '点击选择材料...'
                  : selectedMaterials
                      .map((m) => getItemById(m.inventoryId)?.name || '')
                      .join('、')}
                <span className="multi-select-arrow">
                  {dropdownOpen ? '▲' : '▼'}
                </span>
              </div>
              {dropdownOpen && (
                <div className="multi-select-dropdown">
                  {items.length === 0 ? (
                    <div className="dropdown-empty">暂无材料，请先添加</div>
                  ) : (
                    items.map((item) => {
                      const isSelected = selectedMaterials.some(
                        (m) => m.inventoryId === item.id
                      );
                      return (
                        <div
                          key={item.id}
                          className={`dropdown-item ${isSelected ? 'dropdown-item-selected' : ''}`}
                          onClick={() => handleToggleMaterial(item)}
                        >
                          <span className="dropdown-check">
                            {isSelected ? '☑' : '☐'}
                          </span>
                          {item.name}（库存: {item.quantity} {item.unit}）
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedMaterials.length > 0 && (
            <div className="selected-materials">
              {selectedMaterials.map((m) => {
                const item = getItemById(m.inventoryId);
                if (!item) return null;
                const isOver = m.quantity > item.quantity && m.quantity > 0;
                return (
                  <div key={m.inventoryId} className="material-input-row">
                    <span className="material-name">{item.name}</span>
                    <span className="material-stock">
                      （库存: {item.quantity} {item.unit}）
                    </span>
                    <input
                      type="number"
                      className={`input-field input-sm ${isOver ? 'input-error' : ''}`}
                      value={m.quantity || ''}
                      onChange={(e) =>
                        handleQuantityChange(m.inventoryId, Number(e.target.value))
                      }
                      placeholder="消耗量"
                      min="0"
                      step="0.01"
                    />
                    <span className="material-unit">{item.unit}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() =>
                        setSelectedMaterials(
                          selectedMaterials.filter((s) => s.inventoryId !== m.inventoryId)
                        )
                      }
                    >
                      ✕
                    </button>
                    {isOver && (
                      <span className="error-text">
                        {item.name}材料库存不足，当前仅剩{item.quantity}{item.unit}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {formError && <div className="error-msg">{formError}</div>}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '提交中...' : '提交'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;

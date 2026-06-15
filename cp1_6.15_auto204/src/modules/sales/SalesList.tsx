import React, { useState, useEffect } from 'react';
import { useSalesStore, Product, ProductConsumption } from '../../stores/salesStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import ProductForm from './ProductForm';

const SalesList: React.FC = () => {
  const { products, consumptions, loading, fetchProducts, deleteProduct, dateFilter, setDateFilter } =
    useSalesStore();
  const { items } = useInventoryStore();

  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFilter = () => {
    fetchProducts(startDate, endDate);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除此作品记录吗？关联材料库存将恢复。')) {
      try {
        await deleteProduct(id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const getProductConsumptions = (productId: string) => {
    return consumptions.filter((c) => c.product_id === productId);
  };

  const getMaterialName = (inventoryId: string) => {
    const item = items.find((i) => i.id === inventoryId);
    const consumption = consumptions.find((c) => c.inventory_id === inventoryId);
    return consumption?.material_name || item?.name || inventoryId.slice(0, 8);
  };

  const calcProfit = (product: Product) => {
    const pConsumptions = consumptions.filter((c) => c.product_id === product.id);
    let cost = 0;
    for (const c of pConsumptions) {
      const item = items.find((i) => i.id === c.inventory_id);
      cost += c.quantity_consumed * (item?.unit_cost || 0);
    }
    return product.price - cost;
  };

  return (
    <div className="module-container fade-in">
      <div className="module-header">
        <h2>作品列表</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + 登记作品
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>开始日期</label>
          <input
            type="date"
            className="input-field"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>结束日期</label>
          <input
            type="date"
            className="input-field"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleFilter}>
          筛选
        </button>
        <button className="btn btn-secondary" onClick={handleReset}>
          重置
        </button>
      </div>

      {showForm && (
        <ProductForm
          onClose={() => setShowForm(false)}
          onSaved={() => fetchProducts(startDate, endDate)}
        />
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>编号</th>
              <th>作品名称</th>
              <th>售价</th>
              <th>关联材料</th>
              <th>利润</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row">
                  暂无作品记录
                </td>
              </tr>
            ) : (
              products.map((product, idx) => {
                const pConsumptions = getProductConsumptions(product.id);
                const profit = calcProfit(product);
                return (
                  <tr key={product.id} className={idx % 2 === 1 ? 'zebra-row' : ''}>
                    <td className="cell-id">{product.id.slice(0, 8)}</td>
                    <td>{product.name}</td>
                    <td>¥{product.price.toFixed(2)}</td>
                    <td>
                      {pConsumptions.length > 0 ? (
                        <div className="material-tags">
                          {pConsumptions.map((c) => (
                            <span key={c.id} className="material-tag">
                              {c.material_name || getMaterialName(c.inventory_id)} × {c.quantity_consumed}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className={profit >= 0 ? 'text-success' : 'text-danger'}>
                      ¥{profit.toFixed(2)}
                    </td>
                    <td className="cell-date">
                      {new Date(product.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="cell-actions">
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(product.id)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesList;

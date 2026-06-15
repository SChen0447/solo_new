import React, { useState } from 'react';
import { useMenuStore, MenuItem, Prices } from '../../store';
import StockEditor from './StockEditor';

interface FormState {
  name: string;
  description: string;
  imageUrl: string;
  stock: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  recommended: boolean;
}

const initialForm: FormState = {
  name: '',
  description: '',
  imageUrl: '',
  stock: '0',
  breakfast: '0',
  lunch: '0',
  dinner: '0',
  recommended: false
};

const AdminPanel: React.FC = () => {
  const { menuItems, createMenuItem, updateMenuItem, deleteMenuItem, isLoading, error } =
    useMenuStore();
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');

  const handleInputChange = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      stock: String(item.stock),
      breakfast: String(item.prices.breakfast),
      lunch: String(item.prices.lunch),
      dinner: String(item.prices.dinner),
      recommended: item.recommended
    });
    setActiveTab('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('请输入菜品名称');
      return;
    }

    const prices: Prices = {
      breakfast: parseInt(form.breakfast, 10) || 0,
      lunch: parseInt(form.lunch, 10) || 0,
      dinner: parseInt(form.dinner, 10) || 0
    };

    const itemData = {
      name: form.name.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      stock: parseInt(form.stock, 10) || 0,
      recommended: form.recommended,
      prices
    };

    if (editingId) {
      await updateMenuItem(editingId, itemData);
    } else {
      await createMenuItem(itemData);
    }
    resetForm();
    setActiveTab('list');
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`确定要删除菜品「${name}」吗？`)) {
      await deleteMenuItem(id);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        paddingBottom: 40
      }}
    >
      <header
        style={{
          padding: '20px 32px',
          backgroundColor: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#212121',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            <span>⚙️ 后台管理中心</span>
          </h1>
          <p style={{ fontSize: 12, color: '#757575', marginTop: 4 }}>
            管理菜品、库存及定价策略
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: activeTab === 'list' ? '#1565c0' : '#f5f5f5',
              color: activeTab === 'list' ? '#fff' : '#616161',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            菜品列表
          </button>
          <button
            onClick={() => {
              resetForm();
              setActiveTab('form');
            }}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: activeTab === 'form' ? '#1565c0' : '#f5f5f5',
              color: activeTab === 'form' ? '#fff' : '#616161',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {editingId ? '编辑菜品' : '新增菜品'}
          </button>
        </div>
      </header>

      {error && (
        <div
          style={{
            margin: '16px 32px',
            padding: '12px 20px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: 8,
            fontSize: 14
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <main style={{ padding: '24px 32px' }}>
        {activeTab === 'list' ? (
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              overflow: 'hidden'
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#fafafa',
                      borderBottom: '1px solid #e0e0e0'
                    }}
                  >
                    <th
                      style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#424242',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      图片
                    </th>
                    <th
                      style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#424242',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      菜品名称
                    </th>
                    <th
                      style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#424242',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      推荐
                    </th>
                    <th
                      style={{
                        padding: '14px 16px',
                        textAlign: 'center',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#424242',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      库存
                    </th>
                    <th
                      style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#424242',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      早餐价
                    </th>
                    <th
                      style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#424242',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      午餐价
                    </th>
                    <th
                      style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#424242',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      晚餐价
                    </th>
                    <th
                      style={{
                        padding: '14px 16px',
                        textAlign: 'center',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#424242',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item, index) => (
                    <tr
                      key={item.id}
                      style={{
                        height: 50,
                        backgroundColor: index % 2 === 0 ? '#fafafa' : '#ffffff',
                        borderBottom: '1px solid #f0f0f0',
                        transition: 'background-color 0.2s ease-in-out'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f9ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          index % 2 === 0 ? '#fafafa' : '#ffffff';
                      }}
                    >
                      <td style={{ padding: '8px 16px' }}>
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 6,
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgZmlsbD0iI2UwZTBlMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==';
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#212121',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.name}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {item.recommended ? (
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: '#fff3e0',
                              color: '#ff9800',
                              fontWeight: 600
                            }}
                          >
                            ★ 推荐
                          </span>
                        ) : (
                          <span style={{ color: '#bdbdbd', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          textAlign: 'center'
                        }}
                      >
                        <StockEditor id={item.id} initialStock={item.stock} />
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          textAlign: 'right',
                          fontSize: 14,
                          color: item.prices.breakfast > 0 ? '#ff6d00' : '#bdbdbd',
                          fontWeight: 500,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.prices.breakfast > 0 ? `¥${item.prices.breakfast}` : '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          textAlign: 'right',
                          fontSize: 14,
                          color: item.prices.lunch > 0 ? '#00c853' : '#bdbdbd',
                          fontWeight: 500,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.prices.lunch > 0 ? `¥${item.prices.lunch}` : '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          textAlign: 'right',
                          fontSize: 14,
                          color: item.prices.dinner > 0 ? '#2979ff' : '#bdbdbd',
                          fontWeight: 500,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.prices.dinner > 0 ? `¥${item.prices.dinner}` : '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            justifyContent: 'center'
                          }}
                        >
                          <button
                            onClick={() => handleEditItem(item)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 500,
                              backgroundColor: '#e3f2fd',
                              color: '#1976d2',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#bbdefb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#e3f2fd';
                            }}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 500,
                              backgroundColor: '#ffebee',
                              color: '#d32f2f',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffcdd2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffebee';
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {menuItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: 60,
                          textAlign: 'center',
                          color: '#9e9e9e',
                          fontSize: 14
                        }}
                      >
                        暂无菜品，请点击右上角「新增菜品」添加
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              padding: 32,
              maxWidth: 720,
              margin: '0 auto'
            }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#212121',
                margin: '0 0 24px 0'
              }}
            >
              {editingId ? '编辑菜品' : '新增菜品'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#424242',
                      marginBottom: 6
                    }}
                  >
                    菜品名称 <span style={{ color: '#f44336' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="例如：黑椒牛排"
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: 6,
                      fontSize: 14,
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#90caf9';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(33,150,243,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#424242',
                      marginBottom: 6
                    }}
                  >
                    菜品描述
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="描述菜品特色、食材等信息"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #e0e0e0',
                      borderRadius: 6,
                      fontSize: 14,
                      resize: 'vertical',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#90caf9';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(33,150,243,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#424242',
                      marginBottom: 6
                    }}
                  >
                    图片URL
                  </label>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                    placeholder="https://..."
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: 6,
                      fontSize: 14,
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#90caf9';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(33,150,243,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#424242',
                        marginBottom: 6
                      }}
                    >
                      库存量
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.stock}
                      onChange={(e) => handleInputChange('stock', e.target.value)}
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 12px',
                        border: '1px solid #e0e0e0',
                        borderRadius: 6,
                        fontSize: 14,
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#90caf9';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(33,150,243,0.15)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 140,
                      display: 'flex',
                      alignItems: 'flex-end',
                      paddingBottom: 6
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        color: '#424242',
                        userSelect: 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.recommended}
                        onChange={(e) => handleInputChange('recommended', e.target.checked)}
                        style={{
                          width: 18,
                          height: 18,
                          cursor: 'pointer',
                          accentColor: '#1565c0'
                        }}
                      />
                      <span style={{ fontWeight: 500 }}>标记为推荐菜品</span>
                    </label>
                  </div>
                </div>

                <div
                  style={{
                    padding: 16,
                    backgroundColor: '#fafafa',
                    borderRadius: 8,
                    border: '1px solid #f0f0f0'
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#424242',
                      marginBottom: 14
                    }}
                  >
                    时段价格设置（元）
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 12,
                          color: '#ff6d00',
                          marginBottom: 4,
                          fontWeight: 500
                        }}
                      >
                        早餐价（06-11点）
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.breakfast}
                        onChange={(e) => handleInputChange('breakfast', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '100%',
                          height: 36,
                          padding: '0 10px',
                          border: '1px solid #ffe0b2',
                          borderRadius: 6,
                          fontSize: 14,
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#ff9800';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#ffe0b2';
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 12,
                          color: '#00c853',
                          marginBottom: 4,
                          fontWeight: 500
                        }}
                      >
                        午餐价（11-17点）
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.lunch}
                        onChange={(e) => handleInputChange('lunch', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '100%',
                          height: 36,
                          padding: '0 10px',
                          border: '1px solid #c8e6c9',
                          borderRadius: 6,
                          fontSize: 14,
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#4caf50';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#c8e6c9';
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 12,
                          color: '#2979ff',
                          marginBottom: 4,
                          fontWeight: 500
                        }}
                      >
                        晚餐价（17-22点）
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.dinner}
                        onChange={(e) => handleInputChange('dinner', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '100%',
                          height: 36,
                          padding: '0 10px',
                          border: '1px solid #bbdefb',
                          borderRadius: 6,
                          fontSize: 14,
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#2196f3';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#bbdefb';
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#9e9e9e',
                      marginTop: 10
                    }}
                  >
                    * 设置为0表示该时段不供应此菜品
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    justifyContent: 'flex-end',
                    paddingTop: 12,
                    borderTop: '1px solid #f0f0f0'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActiveTab('list');
                    }}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 500,
                      backgroundColor: '#f5f5f5',
                      color: '#616161',
                      transition: 'background-color 0.2s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#eeeeee';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      padding: '10px 28px',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      backgroundColor: '#1565c0',
                      color: '#fff',
                      transition: 'background-color 0.2s ease-in-out',
                      opacity: isLoading ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#0d47a1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#1565c0';
                      }
                    }}
                  >
                    {isLoading ? '提交中...' : editingId ? '保存修改' : '创建菜品'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;

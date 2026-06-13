import React, { useState } from 'react';
import { Pet } from '../types';
import { addPet, updatePet, removePet } from '../stores/apiStore';

interface PetProfileProps {
  pets: Pet[];
  refreshPets: () => Promise<void>;
  loading: boolean;
}

const PetProfile: React.FC<PetProfileProps> = ({ pets, refreshPets, loading }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    age: '',
    note: '',
  });
  const [panelVisible, setPanelVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const openAddPanel = () => {
    setEditingPet(null);
    setFormData({ name: '', breed: '', age: '', note: '' });
    setPanelVisible(true);
    setShowPanel(true);
  };

  const openEditPanel = (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      breed: pet.breed,
      age: pet.age.toString(),
      note: pet.note,
    });
    setPanelVisible(true);
    setShowPanel(true);
  };

  const closePanel = () => {
    setPanelVisible(false);
    setTimeout(() => setShowPanel(false), 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingPet) {
      await updatePet({
        id: editingPet.id,
        name: formData.name,
        breed: formData.breed,
        age: Number(formData.age) || 0,
        note: formData.note,
      });
    } else {
      await addPet({
        name: formData.name,
        breed: formData.breed,
        age: Number(formData.age) || 0,
        note: formData.note,
      });
    }

    await refreshPets();
    closePanel();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个宠物档案吗？')) return;
    setDeletingId(id);
    setTimeout(async () => {
      await removePet(id);
      await refreshPets();
      setDeletingId(null);
    }, 300);
  };

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>宠物档案</h1>
        <button style={styles.addBtn} onClick={openAddPanel}>
          + 添加宠物
        </button>
      </div>
      <p style={styles.subtitle}>管理你的毛孩子档案，预约更便捷</p>

      {pets.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>还没有宠物档案，点击上方按钮添加吧</p>
        </div>
      ) : (
        <div style={styles.petList}>
          {pets.map((pet) => (
            <div
              key={pet.id}
              style={{
                ...styles.petCard,
                ...(deletingId === pet.id ? styles.petCardDeleting : {}),
              }}
            >
              <div style={styles.petAvatar}>
                <span style={styles.petEmoji}>🐾</span>
              </div>
              <div style={styles.petInfo}>
                <h3 style={styles.petName}>{pet.name}</h3>
                <p style={styles.petDetail}>品种：{pet.breed || '未知'}</p>
                <p style={styles.petDetail}>年龄：{pet.age}岁</p>
                {pet.note && <p style={styles.petNote}>备注：{pet.note}</p>}
              </div>
              <div style={styles.petActions}>
                <button style={styles.actionBtn} onClick={() => openEditPanel(pet)}>
                  编辑
                </button>
                <button style={{ ...styles.actionBtn, ...styles.deleteBtn }} onClick={() => handleDelete(pet.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPanel && (
        <>
          <div style={styles.overlay} onClick={closePanel} />
          <div
            style={{
              ...styles.sidePanel,
              ...(panelVisible ? {} : styles.sidePanelHidden),
            }}
          >
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>{editingPet ? '编辑宠物' : '添加宠物'}</h2>
              <button style={styles.closeBtn} onClick={closePanel}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>宠物名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  placeholder="请输入宠物名称"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>品种</label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  style={styles.input}
                  placeholder="请输入品种"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>年龄（岁）</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  style={styles.input}
                  placeholder="请输入年龄"
                  min="0"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>备注</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  style={styles.textarea}
                  placeholder="其他需要注意的事项"
                  rows={4}
                />
              </div>
              <button type="submit" style={styles.submitBtn}>
                {editingPet ? '保存修改' : '添加宠物'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  loading: {
    textAlign: 'center',
    padding: '60px 0',
    color: '#888',
    fontSize: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#333',
  },
  addBtn: {
    backgroundColor: '#FF8C00',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  subtitle: {
    color: '#666',
    marginBottom: '24px',
    fontSize: '0.95rem',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 0',
  },
  emptyText: {
    color: '#999',
    fontSize: '1rem',
  },
  petList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  petCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
  },
  petCardDeleting: {
    animation: 'collapse 0.3s ease forwards',
  },
  petAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#FFF5E6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  petEmoji: {
    fontSize: '1.8rem',
  },
  petInfo: {
    flex: 1,
    minWidth: 0,
  },
  petName: {
    fontSize: '1.15rem',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px',
  },
  petDetail: {
    fontSize: '0.9rem',
    color: '#666',
    marginBottom: '2px',
  },
  petNote: {
    fontSize: '0.85rem',
    color: '#888',
    marginTop: '6px',
  },
  petActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0,
  },
  actionBtn: {
    padding: '6px 16px',
    borderRadius: '6px',
    border: '1px solid #FF8C00',
    backgroundColor: 'transparent',
    color: '#FF8C00',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  deleteBtn: {
    borderColor: '#f44336',
    color: '#f44336',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1500,
    animation: 'fadeIn 0.3s ease',
  },
  sidePanel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '400px',
    maxWidth: '100%',
    backgroundColor: 'white',
    zIndex: 1600,
    boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 400ms ease, opacity 400ms ease',
    animation: 'slideInRight 400ms ease',
  },
  sidePanelHidden: {
    transform: 'translateX(100%)',
    opacity: 0,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #f0f0f0',
  },
  panelTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#333',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    color: '#999',
    padding: '4px 8px',
    cursor: 'pointer',
  },
  form: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '80px',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#FF8C00',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
};

export default PetProfile;

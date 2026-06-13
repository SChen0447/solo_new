import React, { useState } from 'react';
import { Pet } from '../types';
import { addPet, updatePet, removePet } from '../stores/apiStore';
import './PetProfile.css';

interface PetProfileProps {
  pets: Pet[];
  refreshPets: () => Promise<void>;
  loading: boolean;
}

const PetProfile: React.FC<PetProfileProps> = ({ pets, refreshPets, loading }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    age: '',
    note: '',
  });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const openAddPanel = () => {
    setEditingPet(null);
    setFormData({ name: '', breed: '', age: '', note: '' });
    setShowPanel(true);
    requestAnimationFrame(() => {
      setPanelVisible(true);
    });
  };

  const openEditPanel = (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      breed: pet.breed,
      age: pet.age.toString(),
      note: pet.note,
    });
    setShowPanel(true);
    requestAnimationFrame(() => {
      setPanelVisible(true);
    });
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
    }, 350);
  };

  if (loading) {
    return <div className="pet-loading">加载中...</div>;
  }

  return (
    <div>
      <div className="pet-header">
        <h1 className="pet-title">宠物档案</h1>
        <button className="pet-add-btn" onClick={openAddPanel}>
          + 添加宠物
        </button>
      </div>
      <p className="pet-subtitle">管理你的毛孩子档案，预约更便捷</p>

      {pets.length === 0 ? (
        <div className="pet-empty">
          <p className="pet-empty-text">还没有宠物档案，点击上方按钮添加吧</p>
        </div>
      ) : (
        <div className="pet-list">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className={`pet-card ${deletingId === pet.id ? 'pet-card-deleting' : ''}`}
            >
              <div className="pet-avatar">
                <span className="pet-emoji">🐾</span>
              </div>
              <div className="pet-info">
                <h3 className="pet-name">{pet.name}</h3>
                <p className="pet-detail">品种：{pet.breed || '未知'}</p>
                <p className="pet-detail">年龄：{pet.age}岁</p>
                {pet.note && <p className="pet-note">备注：{pet.note}</p>}
              </div>
              <div className="pet-actions">
                <button className="pet-action-btn" onClick={() => openEditPanel(pet)}>
                  编辑
                </button>
                <button className="pet-action-btn pet-delete-btn" onClick={() => handleDelete(pet.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPanel && (
        <>
          <div
            className={`pet-overlay ${panelVisible ? 'pet-overlay-visible' : ''}`}
            onClick={closePanel}
          />
          <div
            className={`pet-side-panel ${panelVisible ? 'pet-side-panel-visible' : ''}`}
          >
            <div className="pet-panel-header">
              <h2 className="pet-panel-title">{editingPet ? '编辑宠物' : '添加宠物'}</h2>
              <button className="pet-close-btn" onClick={closePanel}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="pet-form">
              <div className="pet-form-group">
                <label className="pet-label">宠物名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pet-input"
                  placeholder="请输入宠物名称"
                  required
                />
              </div>
              <div className="pet-form-group">
                <label className="pet-label">品种</label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  className="pet-input"
                  placeholder="请输入品种"
                />
              </div>
              <div className="pet-form-group">
                <label className="pet-label">年龄（岁）</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="pet-input"
                  placeholder="请输入年龄"
                  min="0"
                />
              </div>
              <div className="pet-form-group">
                <label className="pet-label">备注</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="pet-textarea"
                  placeholder="其他需要注意的事项"
                  rows={4}
                />
              </div>
              <button type="submit" className="pet-submit-btn">
                {editingPet ? '保存修改' : '添加宠物'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default PetProfile;

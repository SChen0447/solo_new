import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shop, Slot, Pet } from '../types';
import { fetchShop, fetchSlots, createAppointment } from '../stores/apiStore';

interface ShopDetailProps {
  pets: Pet[];
}

const ShopDetail: React.FC<ShopDetailProps> = ({ pets }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const shopData = await fetchShop(Number(id));
        setShop(shopData);
        if (shopData.services.length > 0) {
          setSelectedService(shopData.services[0].id);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!id) return;
      const data = await fetchSlots(Number(id), selectedDate);
      setSlots(data);
    };
    loadSlots();
  }, [id, selectedDate]);

  const handleSlotClick = (slot: Slot) => {
    if (!slot.available) return;
    setSelectedSlot(slot.time);
    setShowModal(true);
  };

  const handleConfirm = async () => {
    if (!shop || !selectedSlot || !selectedService) return;

    const service = shop.services.find((s) => s.id === selectedService);
    if (!service) return;

    const petName = selectedPet
      ? pets.find((p) => p.id === Number(selectedPet))?.name || '未命名'
      : '未命名';

    setBooking(true);
    try {
      await createAppointment({
        shop_id: shop.id,
        shop_name: shop.name,
        service_id: selectedService,
        service_name: service.name,
        date: selectedDate,
        time: selectedSlot,
        pet_name: petName,
        pet_id: selectedPet ? Number(selectedPet) : undefined,
      });
      setShowModal(false);
      setSelectedSlot('');
      const updatedSlots = await fetchSlots(shop.id, selectedDate);
      setSlots(updatedSlots);
      alert('预约成功！');
    } catch (error) {
      alert('预约失败，请重试');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  if (!shop) {
    return <div style={styles.loading}>店铺未找到</div>;
  }

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div style={styles.shopHeader}>
        <h1 style={styles.shopName}>{shop.name}</h1>
        <div style={styles.rating}>⭐ {shop.rating}</div>
      </div>
      <p style={styles.address}>📍 {shop.address}</p>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>服务项目</h2>
        <div style={styles.serviceList}>
          {shop.services.map((service) => (
            <button
              key={service.id}
              style={{
                ...styles.serviceBtn,
                ...(selectedService === service.id ? styles.serviceBtnActive : {}),
              }}
              onClick={() => setSelectedService(service.id)}
            >
              <span>{service.name}</span>
              <span style={styles.price}>¥{service.price}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>选择日期</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={styles.dateInput}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>可预约时段</h2>
        <div style={styles.slotsGrid}>
          {slots.map((slot) => (
            <button
              key={slot.time}
              style={{
                ...styles.slotBtn,
                ...(!slot.available ? styles.slotBtnDisabled : {}),
                ...(selectedSlot === slot.time ? styles.slotBtnSelected : {}),
              }}
              onClick={() => handleSlotClick(slot)}
              disabled={!slot.available}
            >
              {slot.time}
              {!slot.available && <div style={styles.bookedLabel}>已约</div>}
            </button>
          ))}
        </div>
      </div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>确认预约</h3>
            <div style={styles.modalContent}>
              <p style={styles.modalItem}>
                <span>店铺：</span>
                <strong>{shop.name}</strong>
              </p>
              <p style={styles.modalItem}>
                <span>服务：</span>
                <strong>
                  {shop.services.find((s) => s.id === selectedService)?.name}
                </strong>
              </p>
              <p style={styles.modalItem}>
                <span>日期：</span>
                <strong>{selectedDate}</strong>
              </p>
              <p style={styles.modalItem}>
                <span>时间：</span>
                <strong>{selectedSlot}</strong>
              </p>
              <div style={styles.modalItem}>
                <span style={{ display: 'block', marginBottom: '8px' }}>选择宠物：</span>
                <select
                  value={selectedPet}
                  onChange={(e) => setSelectedPet(e.target.value)}
                  style={styles.select}
                >
                  <option value="">请选择宠物</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}（{pet.breed}）
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                取消
              </button>
              <button style={styles.confirmBtn} onClick={handleConfirm} disabled={booking}>
                {booking ? '预约中...' : '确认预约'}
              </button>
            </div>
          </div>
        </div>
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
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#FF8C00',
    fontSize: '0.95rem',
    marginBottom: '16px',
    padding: '8px 0',
    fontWeight: '500',
  },
  shopHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  shopName: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#333',
  },
  rating: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#FF8C00',
  },
  address: {
    color: '#666',
    marginBottom: '24px',
    fontSize: '0.95rem',
  },
  section: {
    marginBottom: '28px',
  },
  sectionTitle: {
    fontSize: '1.15rem',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px',
  },
  serviceList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  serviceBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '16px 24px',
    borderRadius: '12px',
    border: '2px solid #e0e0e0',
    backgroundColor: 'white',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  serviceBtnActive: {
    borderColor: '#FF8C00',
    backgroundColor: '#FFF5E6',
    color: '#FF8C00',
  },
  price: {
    fontSize: '0.85rem',
    color: '#FF8C00',
    fontWeight: '600',
  },
  dateInput: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    fontFamily: 'inherit',
  },
  slotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '12px',
  },
  slotBtn: {
    padding: '14px 0',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    position: 'relative',
  },
  slotBtnDisabled: {
    backgroundColor: '#bdbdbd',
    cursor: 'not-allowed',
  },
  slotBtnSelected: {
    backgroundColor: '#FF8C00',
    transform: 'scale(1.05)',
  },
  bookedLabel: {
    fontSize: '0.7rem',
    marginTop: '2px',
    opacity: 0.9,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    animation: 'fadeIn 0.3s ease',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '28px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    animation: 'fadeIn 0.3s ease',
  },
  modalTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#333',
    marginBottom: '20px',
    textAlign: 'center',
  },
  modalContent: {
    marginBottom: '24px',
  },
  modalItem: {
    marginBottom: '12px',
    fontSize: '0.95rem',
    color: '#555',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#FF8C00',
    color: 'white',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
};

export default ShopDetail;

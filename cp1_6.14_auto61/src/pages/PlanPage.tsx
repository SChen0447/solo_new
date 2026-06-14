import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../stores/useRecipeStore';
import { useShoppingStore } from '../stores/useShoppingStore';
import PlanDayComponent from '../components/PlanDay';
import type { PlanDay, WeekPlan } from '../types';

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

export default function PlanPage() {
  const navigate = useNavigate();
  const { recipes, fetchRecipes } = useRecipeStore();
  const { plans, fetchPlans, addPlan, updatePlan, deletePlan, generateShoppingList } = useShoppingStore();

  const [currentPlan, setCurrentPlan] = useState<WeekPlan | null>(null);
  const [planName, setPlanName] = useState('');
  const [days, setDays] = useState<PlanDay[]>([]);

  useEffect(() => {
    fetchRecipes();
    fetchPlans();
  }, [fetchRecipes, fetchPlans]);

  const createNewPlan = () => {
    const dates = getWeekDates();
    const newDays: PlanDay[] = dates.map((date) => ({ date, meals: [] }));
    setDays(newDays);
    setPlanName('本周计划');
    setCurrentPlan(null);
  };

  const handleDayUpdate = (index: number, updatedDay: PlanDay) => {
    setDays((prev) => prev.map((d, i) => (i === index ? updatedDay : d)));
  };

  const savePlan = async () => {
    if (currentPlan) {
      const updated = await updatePlan(currentPlan.id, { name: planName, days });
      setCurrentPlan(updated);
    } else {
      const created = await addPlan({ name: planName, days });
      setCurrentPlan(created);
    }
  };

  const handleGenerateShopping = async () => {
    if (!currentPlan) return;
    const list = await generateShoppingList(currentPlan.id);
    navigate('/shopping');
  };

  const selectPlan = (plan: WeekPlan) => {
    setCurrentPlan(plan);
    setPlanName(plan.name);
    setDays(plan.days);
  };

  const handleDeletePlan = async (id: string) => {
    if (window.confirm('确定要删除这个周计划吗？')) {
      await deletePlan(id);
      if (currentPlan?.id === id) {
        setCurrentPlan(null);
        setDays([]);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">周计划</h1>
        <button className="btn btn--primary" onClick={createNewPlan}>
          + 新建计划
        </button>
      </div>

      {plans.length > 0 && (
        <div className="plan-list">
          <h3 className="plan-list__title">已有计划</h3>
          {plans.map((plan) => (
            <div key={plan.id} className="plan-item">
              <div className="plan-item__info" onClick={() => selectPlan(plan)}>
                <span className="plan-item__name">{plan.name}</span>
                <span className="plan-item__count">
                  {plan.days.reduce((sum, d) => sum + d.meals.length, 0)} 道菜
                </span>
              </div>
              <button className="btn btn--icon" onClick={() => handleDeletePlan(plan.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {days.length > 0 && (
        <div className="plan-editor">
          <div className="plan-editor__header">
            <input
              type="text"
              className="form-input"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="计划名称"
            />
          </div>

          <div className="plan-days">
            {days.map((day, i) => (
              <PlanDayComponent
                key={day.date}
                day={day}
                recipes={recipes}
                dayIndex={i}
                onUpdate={handleDayUpdate}
              />
            ))}
          </div>

          <div className="plan-editor__actions">
            <button className="btn btn--primary" onClick={savePlan}>
              保存计划
            </button>
            {currentPlan && (
              <button className="btn btn--accent" onClick={handleGenerateShopping}>
                🛒 生成购物清单
              </button>
            )}
          </div>
        </div>
      )}

      {days.length === 0 && plans.length === 0 && (
        <div className="empty-state">
          <div className="empty-illustration">📅</div>
          <p className="empty-text">还没有周计划</p>
          <p className="empty-hint">点击上方按钮创建新计划吧</p>
        </div>
      )}
    </div>
  );
}

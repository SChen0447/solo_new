import { v4 as uuidv4 } from 'uuid';
import type { MealSlot, PlanDay, Recipe } from '../types';

const MEAL_TYPES: MealSlot['mealType'][] = ['早餐', '午餐', '晚餐', '加餐1', '加餐2'];

interface Props {
  day: PlanDay;
  recipes: Recipe[];
  dayIndex: number;
  onUpdate: (index: number, day: PlanDay) => void;
}

export default function PlanDayComponent({ day, recipes, dayIndex, onUpdate }: Props) {
  const addMeal = (mealType: MealSlot['mealType'], recipeId: string) => {
    if (!recipeId) return;
    const newMeal: MealSlot = { id: uuidv4(), recipeId, mealType };
    const updated: PlanDay = { ...day, meals: [...day.meals, newMeal] };
    onUpdate(dayIndex, updated);
  };

  const removeMeal = (mealId: string) => {
    const updated: PlanDay = { ...day, meals: day.meals.filter((m) => m.id !== mealId) };
    onUpdate(dayIndex, updated);
  };

  const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dateObj = new Date(day.date);
  const dayName = weekDayNames[dateObj.getDay()];

  const existingMealTypes = day.meals.map((m) => m.mealType);
  const availableMealTypes = MEAL_TYPES.filter((t) => !existingMealTypes.includes(t));

  const getRecipeName = (id: string) => {
    const r = recipes.find((rec) => rec.id === id);
    return r ? r.title : '(已删除)';
  };

  return (
    <div className="plan-day">
      <div className="plan-day__header">
        <h3 className="plan-day__title">
          {dayName} · {day.date}
        </h3>
      </div>

      {day.meals.length > 0 && (
        <ul className="plan-day__meals">
          {day.meals.map((meal) => (
            <li key={meal.id} className="plan-meal">
              <span className={`plan-meal__type plan-meal__type--${meal.mealType.replace(/\d/g, '')}`}>
                {meal.mealType}
              </span>
              <span className="plan-meal__name">{getRecipeName(meal.recipeId)}</span>
              <button className="btn btn--icon btn--sm" onClick={() => removeMeal(meal.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {availableMealTypes.length > 0 && (
        <div className="plan-day__add">
          <select
            className="form-select form-select--sm"
            defaultValue=""
            onChange={(e) => {
              const [mealType, recipeId] = e.target.value.split('::');
              if (mealType && recipeId) {
                addMeal(mealType as MealSlot['mealType'], recipeId);
                e.target.value = '';
              }
            }}
          >
            <option value="">+ 添加菜品</option>
            {availableMealTypes.map((mt) => (
              <optgroup key={mt} label={mt}>
                {recipes.map((r) => (
                  <option key={`${mt}::${r.id}`} value={`${mt}::${r.id}`}>
                    {r.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

import React, { useMemo } from 'react';
import CountUp from 'react-countup';
import useCarbonStore from '../store/carbonStore';

const CarbonSummaryCard: React.FC = () => {
  const getTodayEmission = useCarbonStore((s) => s.getTodayEmission);
  const getYesterdayEmission = useCarbonStore((s) => s.getYesterdayEmission);
  const getBudgetProgress = useCarbonStore((s) => s.getBudgetProgress);
  const records = useCarbonStore((s) => s.records);

  const todayEmission = useMemo(() => getTodayEmission(), [getTodayEmission, records]);
  const yesterdayEmission = useMemo(() => getYesterdayEmission(), [getYesterdayEmission, records]);
  const budgetProgress = useMemo(() => getBudgetProgress(), [getBudgetProgress, records]);

  const changePercent = useMemo(() => {
    if (yesterdayEmission === 0) return todayEmission > 0 ? 100 : 0;
    return ((todayEmission - yesterdayEmission) / yesterdayEmission) * 100;
  }, [todayEmission, yesterdayEmission]);

  const isIncrease = changePercent > 0;

  return (
    <div className="carbon-summary-card">
      <div className="summary-main">
        <span className="summary-label">今日碳排量</span>
        <div className="summary-value">
          <CountUp
            end={todayEmission}
            duration={0.8}
            decimals={2}
            preserveValue
            separator=","
          />
          <span className="summary-unit">kg CO₂e</span>
        </div>
      </div>

      <div className="summary-change">
        {changePercent !== 0 && (
          <>
            <span className={`change-arrow ${isIncrease ? 'increase' : 'decrease'}`}>
              {isIncrease ? '↑' : '↓'}
            </span>
            <span className={`change-value ${isIncrease ? 'increase' : 'decrease'}`}>
              {Math.abs(changePercent).toFixed(1)}%
            </span>
            <span className="change-label">较昨日</span>
          </>
        )}
        {changePercent === 0 && (
          <span className="change-label">与昨日持平</span>
        )}
      </div>

      <div className="budget-section">
        <div className="budget-header">
          <span className="budget-label">本月碳预算</span>
          <span className="budget-percent">{(budgetProgress * 100).toFixed(1)}%</span>
        </div>
        <div className="budget-bar">
          <div
            className="budget-bar-fill"
            style={{
              width: `${budgetProgress * 100}%`,
              background:
                budgetProgress > 0.8
                  ? '#e74c3c'
                  : budgetProgress > 0.5
                    ? '#f39c12'
                    : '#27ae60',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CarbonSummaryCard;

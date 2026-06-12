import { useState, useEffect, useCallback } from 'react';
import MatrixPanel from './MatrixPanel';
import ChartPanel from './ChartPanel';
import {
  MatrixData,
  Alternative,
  generateMatrixData,
  calculateWeightedScore,
} from './utils/generateMatrixData';

const STORAGE_KEY = 'decision-matrix-data-v1';

function loadFromStorage(): MatrixData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.alternatives) &&
      Array.isArray(parsed.criteria)
    ) {
      return parsed as MatrixData;
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const [alternativesInput, setAlternativesInput] = useState<string>(
    '方案A\n方案B\n方案C'
  );
  const [criteriaInput, setCriteriaInput] = useState<string>(
    '成本\n性能\n可维护性\n用户体验'
  );
  const [matrixData, setMatrixData] = useState<MatrixData | null>(() =>
    loadFromStorage()
  );
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (matrixData) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(matrixData));
      } catch {
        /* ignore quota errors */
      }
    }
  }, [matrixData]);

  useEffect(() => {
    if (
      matrixData &&
      matrixData.alternatives.length > 0 &&
      !selectedAlternativeId
    ) {
      setSelectedAlternativeId(matrixData.alternatives[0].id);
    }
  }, [matrixData, selectedAlternativeId]);

  const handleGenerate = useCallback(() => {
    const altNames = alternativesInput.split('\n');
    const critNames = criteriaInput.split('\n');
    const newData = generateMatrixData(altNames, critNames);
    setMatrixData(newData);
    setSelectedAlternativeId(
      newData.alternatives.length > 0 ? newData.alternatives[0].id : null
    );
  }, [alternativesInput, criteriaInput]);

  const handleScoreChange = useCallback(
    (altId: string, criterionId: string, value: number) => {
      setMatrixData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          alternatives: prev.alternatives.map((a) =>
            a.id === altId
              ? { ...a, scores: { ...a.scores, [criterionId]: value } }
              : a
          ),
        };
      });
    },
    []
  );

  const handleWeightChange = useCallback((criterionId: string, weight: number) => {
    setMatrixData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        criteria: prev.criteria.map((c) =>
          c.id === criterionId ? { ...c, weight } : c
        ),
      };
    });
  }, []);

  const rankedAlternatives: (Alternative & { weightedScore: number })[] =
    matrixData
      ? matrixData.alternatives
          .map((a) => ({
            ...a,
            weightedScore: calculateWeightedScore(a, matrixData.criteria),
          }))
          .sort((a, b) => b.weightedScore - a.weightedScore)
      : [];

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>决策矩阵 Decision Matrix</h1>
        <p className="subtitle">团队技术选型与方案评审的量化评分工具</p>
      </header>

      <section className="input-section">
        <div className="input-card">
          <label className="input-label">方案列表（每行一个）</label>
          <textarea
            className="input-textarea"
            value={alternativesInput}
            onChange={(e) => setAlternativesInput(e.target.value)}
            placeholder="方案A&#10;方案B&#10;方案C"
            rows={3}
          />
        </div>
        <div className="input-card">
          <label className="input-label">评判标准（每行一个）</label>
          <textarea
            className="input-textarea"
            value={criteriaInput}
            onChange={(e) => setCriteriaInput(e.target.value)}
            placeholder="成本&#10;性能&#10;可维护性&#10;用户体验"
            rows={3}
          />
        </div>
        <div className="input-card input-card-btn">
          <button className="btn-generate" onClick={handleGenerate}>
            生成矩阵
          </button>
        </div>
      </section>

      {matrixData && matrixData.alternatives.length > 0 && (
        <div className="main-content">
          <div className="matrix-wrapper">
            <MatrixPanel
              alternatives={matrixData.alternatives}
              criteria={matrixData.criteria}
              onScoreChange={handleScoreChange}
              onWeightChange={handleWeightChange}
              rankedAlternatives={rankedAlternatives}
            />
          </div>
          <div className="chart-wrapper">
            <ChartPanel
              alternatives={matrixData.alternatives}
              criteria={matrixData.criteria}
              rankedAlternatives={rankedAlternatives}
              selectedAlternativeId={selectedAlternativeId}
              onSelectAlternative={setSelectedAlternativeId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

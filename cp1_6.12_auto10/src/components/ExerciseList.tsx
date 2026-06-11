import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import type { Exercise, ExerciseType } from '../types';
import {
  getExercises,
  deleteExercise,
  getStatistics,
} from '../api/exerciseApi';

interface Props {
  onEdit: (ex: Exercise) => void;
  onPlay: (ex: Exercise) => void;
  onGoDashboard: () => void;
}

const TYPE_LABELS: Record<ExerciseType, string> = {
  choice: '选择题',
  short: '简答题',
  code: '编码题',
};

const TYPE_ICONS: Record<ExerciseType, string> = {
  choice: '☑',
  short: '✎',
  code: '</>',
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const ExerciseList = memo(function ExerciseList({ onEdit, onPlay, onGoDashboard }: Props) {
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [filterType, setFilterType] = useState<ExerciseType | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(true);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [list, stats] = await Promise.all([
          getExercises({ type: 'all', sort: 'newest' }),
          getStatistics(),
        ]);
        if (!cancelled) {
          setAllExercises(list);
          setAccuracy(stats.overallAccuracy);
          setTotalAttempts(stats.totalAttempts);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!confirm('确定要删除这条练习吗？相关作答记录也会被清除。')) return;
      await deleteExercise(id);
      setAllExercises((prev) => prev.filter((ex) => ex.id !== id));
    },
    []
  );

  const counts = useMemo(() => {
    const c: Record<ExerciseType | 'all', number> = {
      all: allExercises.length,
      choice: 0,
      short: 0,
      code: 0,
    };
    allExercises.forEach((ex) => { c[ex.type]++; });
    return c;
  }, [allExercises]);

  const filteredAndSorted = useMemo(() => {
    let list = filterType === 'all'
      ? [...allExercises]
      : allExercises.filter((e) => e.type === filterType);
    list.sort((a, b) =>
      sort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );
    return list;
  }, [allExercises, filterType, sort]);

  return (
    <div>
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h2 className="section-title" style={{ margin: 0 }}>我的练习本</h2>
            <span style={{ color: '#9e9e9e', fontSize: 13 }}>
              共 {counts.all} 道 · 已作答 {totalAttempts} 次 · 正确率 {accuracy}%
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onGoDashboard}>
            📊 查看统计
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="filter-chips">
            {(['all', 'choice', 'short', 'code'] as const).map((t) => (
              <button
                key={t}
                className={`filter-chip ${filterType === t ? 'active' : ''} ${t !== 'all' ? `chip-${t}` : ''}`}
                onClick={() => setFilterType(t)}
              >
                {t === 'all' ? '全部' : `${TYPE_ICONS[t]} ${TYPE_LABELS[t]}`}
                <span className="chip-count">{counts[t]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="sort-toggle">
          <button
            className={`sort-btn ${sort === 'newest' ? 'active' : ''}`}
            onClick={() => setSort('newest')}
          >
            ↓ 最新
          </button>
          <button
            className={`sort-btn ${sort === 'oldest' ? 'active' : ''}`}
            onClick={() => setSort('oldest')}
          >
            ↑ 最早
          </button>
        </div>
      </div>

      {loading && allExercises.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-text">加载中...</div>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">📝</div>
          <div className="empty-text" style={{ marginBottom: 16 }}>
            {filterType === 'all' ? '还没有练习，点击右上角"创建练习"开始吧！' : '当前类型暂无练习'}
          </div>
        </div>
      ) : (
        <div className="exercise-grid">
          {filteredAndSorted.map((ex) => (
            <div
              key={ex.id}
              className="card exercise-card"
              onClick={() => onPlay(ex)}
            >
              <div className="exercise-card-header">
                <div className="exercise-card-title">{ex.title}</div>
                <span className={`tag tag-${ex.type}`}>
                  {TYPE_ICONS[ex.type]} {TYPE_LABELS[ex.type]}
                </span>
              </div>
              <div className="exercise-card-content">{ex.content}</div>
              <div className="exercise-card-footer">
                <div className="exercise-card-meta">
                  <span className="score-badge">{ex.score} 分</span>
                  <span className="card-date">创建于 {formatDate(ex.createdAt)}</span>
                </div>
                <div className="card-actions">
                  <button
                    className="card-icon-btn play"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(ex);
                    }}
                  >
                    答题
                  </button>
                  <button
                    className="card-icon-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(ex);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    className="card-icon-btn del"
                    onClick={(e) => handleDelete(e, ex.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default ExerciseList;

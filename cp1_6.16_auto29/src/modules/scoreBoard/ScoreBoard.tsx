import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Trophy,
  Filter,
  X,
  Clock,
  Target,
  Award,
  BarChart3,
  User,
  GraduationCap,
} from 'lucide-react';
import { useScoreStore } from '../../stores/scoreStore';
import { useExamStore } from '../../stores/examStore';
import type { ExamResult } from '../../types';

const ScoreBoard = () => {
  const { getSortedScores, scores } = useScoreStore();
  const { exams } = useExamStore();

  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  const sortedScores = useMemo(() => getSortedScores(), [getSortedScores, scores]);

  const filteredScores = useMemo(() => {
    return sortedScores.filter((s) => {
      if (selectedExam !== 'all' && s.examId !== selectedExam) return false;
      if (selectedClass !== 'all' && s.className !== selectedClass) return false;
      return true;
    });
  }, [sortedScores, selectedExam, selectedClass]);

  const classes = useMemo(() => {
    const classSet = new Set<string>();
    scores.forEach((s) => {
      if (s.className) classSet.add(s.className);
    });
    return Array.from(classSet);
  }, [scores]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  };

  const chartData = selectedResult
    ? [
        { name: '单选题', score: selectedResult.scoreByType.single },
        { name: '多选题', score: selectedResult.scoreByType.multiple },
        { name: '判断题', score: selectedResult.scoreByType.truefalse },
      ]
    : [];

  const barColors = ['#1976D2', '#42A5F5', '#90CAF9'];

  return (
    <div className="score-board">
      <div className="page-header">
        <h2 className="page-title">
          <Trophy className="icon" />
          成绩统计
        </h2>
      </div>

      <div className="card filter-card">
        <div className="filter-row">
          <div className="filter-item">
            <label className="filter-label">
              <Filter className="icon-xs" />
              筛选试卷
            </label>
            <select
              className="form-select"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="all">全部试卷</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label className="filter-label">
              <GraduationCap className="icon-xs" />
              筛选班级
            </label>
            <select
              className="form-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="all">全部班级</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-item stats-summary">
            <div className="stat-mini">
              <span className="stat-mini-label">总人数</span>
              <span className="stat-mini-value">{filteredScores.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card score-table-card">
        {filteredScores.length === 0 ? (
          <div className="empty-state">
            <Trophy className="empty-icon" />
            <p>暂无成绩数据</p>
          </div>
        ) : (
          <div className="score-table">
            <div className="table-header">
              <div className="table-col col-rank">排名</div>
              <div className="table-col col-id">学号</div>
              <div className="table-col col-name">姓名</div>
              <div className="table-col col-exam">试卷</div>
              <div className="table-col col-score">总分</div>
              <div className="table-col col-rate">正确率</div>
              <div className="table-col col-time">用时</div>
              <div className="table-col col-submit">提交时间</div>
            </div>
            <div className="table-body">
              {filteredScores.map((result, index) => (
                <div
                  key={result.id}
                  className={`table-row ${getRankBadge(index + 1)}`}
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="table-col col-rank">
                    <span className={`rank-badge ${getRankBadge(index + 1)}`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="table-col col-id">
                    <User className="icon-xs" />
                    {result.studentId}
                  </div>
                  <div className="table-col col-name">{result.studentName}</div>
                  <div className="table-col col-exam">{result.examTitle}</div>
                  <div className="table-col col-score">
                    <span className="score-value">{result.totalScore}</span>
                  </div>
                  <div className="table-col col-rate">
                    <div className="rate-bar-wrapper">
                      <div
                        className="rate-bar"
                        style={{ width: `${result.correctRate}%` }}
                      />
                      <span className="rate-text">{result.correctRate}%</span>
                    </div>
                  </div>
                  <div className="table-col col-time">
                    <Clock className="icon-xs" />
                    {formatDuration(result.duration)}
                  </div>
                  <div className="table-col col-submit">
                    {formatDate(result.submittedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedResult && (
        <div className="modal-overlay" onClick={() => setSelectedResult(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <BarChart3 className="icon" />
                成绩详情
              </h3>
              <button className="btn-icon" onClick={() => setSelectedResult(null)}>
                <X className="icon-sm" />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-student">
                  <div className="student-avatar">
                    {selectedResult.studentName.charAt(0)}
                  </div>
                  <div className="student-info">
                    <h4>{selectedResult.studentName}</h4>
                    <p>学号：{selectedResult.studentId}</p>
                    {selectedResult.className && <p>班级：{selectedResult.className}</p>}
                  </div>
                </div>
                <div className="detail-score">
                  <div className="score-big">
                    <span className="score-number">{selectedResult.totalScore}</span>
                    <span className="score-label">分</span>
                  </div>
                  <div className="detail-rates">
                    <span className="detail-rate-item">
                      <Target className="icon-xs" />
                      正确率 {selectedResult.correctRate}%
                    </span>
                    <span className="detail-rate-item">
                      <Clock className="icon-xs" />
                      用时 {formatDuration(selectedResult.duration)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="chart-section">
                <h4 className="chart-title">各题型得分</h4>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#666', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: number) => [`${value} 分`, '得分']}
                      />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={barColors[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="detail-footer">
                <div className="detail-info-grid">
                  <div className="info-item">
                    <span className="info-label">试卷名称</span>
                    <span className="info-value">{selectedResult.examTitle}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">提交时间</span>
                    <span className="info-value">{formatDate(selectedResult.submittedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreBoard;

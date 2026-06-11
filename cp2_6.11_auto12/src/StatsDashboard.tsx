import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Survey, SurveyResponse, WSMessage } from './types';

const COLORS = ['#4a90d9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'];

interface StatsDashboardProps {
  survey: Survey | null;
  wsMessages: WSMessage[];
}

interface RecentRecord {
  id: string;
  text: string;
  isNew: boolean;
}

export default function StatsDashboard({ survey, wsMessages }: StatsDashboardProps) {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [showResetNotice, setShowResetNotice] = useState(false);
  const [resetNoticeKey, setResetNoticeKey] = useState(0);
  const prevLengthRef = useRef(0);
  const processedMsgIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!survey) return;
    fetch(`/api/surveys/${survey.id}/responses`)
      .then((r) => r.json())
      .then((data: SurveyResponse[]) => {
        setResponses(data);
        prevLengthRef.current = data.length;
      })
      .catch(() => {});
  }, [survey]);

  useEffect(() => {
    if (!survey) return;
    for (const msg of wsMessages) {
      if (msg.type === 'new_response') {
        const resp = msg.payload as SurveyResponse;
        if (resp.surveyId === survey.id && !processedMsgIds.current.has(resp.id)) {
          processedMsgIds.current.add(resp.id);
          setResponses((prev) => [...prev, resp]);
        }
      } else if (msg.type === 'survey_reset') {
        const payload = msg.payload as { surveyId: string };
        if (payload.surveyId === survey.id) {
          setResponses([]);
          prevLengthRef.current = 0;
          setResetNoticeKey((k) => k + 1);
          setShowResetNotice(true);
        }
      }
    }
  }, [wsMessages, survey]);

  useEffect(() => {
    if (!showResetNotice) return;
    const timer = setTimeout(() => setShowResetNotice(false), 5000);
    return () => clearTimeout(timer);
  }, [showResetNotice, resetNoticeKey]);

  const totalCount = responses.length;

  const questionStats = useMemo(() => {
    if (!survey) return [];
    return survey.questions.map((q) => {
      if (q.type === 'rating') {
        const dist = [0, 0, 0, 0, 0];
        const recentRecords: RecentRecord[] = [];
        const recentResponses = [...responses].reverse().slice(0, 10);
        for (const resp of responses) {
          const ans = resp.answers.find((a) => a.questionId === q.id);
          if (ans && ans.ratingValue !== undefined) {
            const idx = Math.min(Math.max(ans.ratingValue - 1, 0), 4);
            dist[idx]++;
          }
        }
        for (const resp of recentResponses) {
          const ans = resp.answers.find((a) => a.questionId === q.id);
          if (ans && ans.ratingValue !== undefined) {
            recentRecords.push({
              id: `${resp.id}-${q.id}`,
              text: `评分为${ans.ratingValue}分`,
              isNew: false,
            });
          }
        }
        const chartData = dist.map((count, i) => ({
          name: `${i + 1}分`,
          value: count,
        }));
        return { question: q, chartType: 'bar' as const, chartData, recentRecords };
      } else {
        const optionCounts: Record<string, number> = {};
        for (const opt of q.options) {
          optionCounts[opt.id] = 0;
        }
        const recentRecords: RecentRecord[] = [];
        const recentResponses = [...responses].reverse().slice(0, 10);
        for (const resp of responses) {
          const ans = resp.answers.find((a) => a.questionId === q.id);
          if (ans) {
            for (const oid of ans.selectedOptionIds) {
              if (oid in optionCounts) optionCounts[oid]++;
            }
          }
        }
        for (const resp of recentResponses) {
          const ans = resp.answers.find((a) => a.questionId === q.id);
          if (ans && ans.selectedOptionIds.length > 0) {
            const selectedTexts = ans.selectedOptionIds
              .map((oid) => {
                const opt = q.options.find((o) => o.id === oid);
                return opt ? opt.text : '';
              })
              .filter(Boolean);
            if (selectedTexts.length > 0) {
              recentRecords.push({
                id: `${resp.id}-${q.id}`,
                text: `用户选择了${selectedTexts.join('、')}`,
                isNew: false,
              });
            }
          }
        }
        const chartData = q.options.map((opt, i) => ({
          name: opt.text,
          value: optionCounts[opt.id] || 0,
          color: COLORS[i % COLORS.length],
        }));
        return { question: q, chartType: 'pie' as const, chartData, recentRecords };
      }
    });
  }, [survey, responses]);

  if (!survey) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📊</div>
        <h2 style={styles.emptyTitle}>请先选择一个问卷查看统计</h2>
        <p style={styles.emptySub}>在编辑器中创建并发布问卷后，即可查看实时统计数据</p>
      </div>
    );
  }

  return (
    <div style={styles.dashboard}>
      {showResetNotice && (
        <div key={resetNoticeKey} style={styles.resetNotice}>
          问卷已重置，所有填写数据已清空
        </div>
      )}
      <div style={styles.summaryBar}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>总填写人数</span>
          <span style={styles.summaryValue}>{totalCount}</span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>问卷标题</span>
          <span style={styles.summaryValueSmall}>{survey.title}</span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>题目数量</span>
          <span style={styles.summaryValue}>{survey.questions.length}</span>
        </div>
      </div>
      <div style={styles.chartsGrid}>
        {questionStats.map((stat) => (
          <div key={stat.question.id} style={styles.chartCard}>
            <h3 style={styles.chartTitle}>{stat.question.title}</h3>
            <div style={styles.chartContainer}>
              {stat.chartType === 'pie' ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stat.chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      animationDuration={300}
                      animationEasing="ease-out"
                      isAnimationActive={true}
                    >
                      {stat.chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stat.chartData}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="#4a90d9"
                      radius={[6, 6, 0, 0]}
                      animationDuration={300}
                      animationEasing="ease-out"
                      isAnimationActive={true}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={styles.recentList}>
              <div style={styles.recentListTitle}>最近填写记录</div>
              {stat.recentRecords.length === 0 && (
                <div style={styles.noRecords}>暂无填写记录</div>
              )}
              {stat.recentRecords.map((record, i) => (
                <div
                  key={record.id}
                  style={{
                    ...styles.recentItem,
                    animation: i === 0 ? 'fadeSlideIn 0.3s cubic-bezier(0.4,0,0.2,1)' : undefined,
                  }}
                >
                  {record.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const fadeSlideInStyle = document.createElement('style');
fadeSlideInStyle.textContent = `
  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(fadeSlideInStyle);

const styles: Record<string, React.CSSProperties> = {
  dashboard: {
    minHeight: '100vh',
    background: '#f5f7fa',
    padding: 24,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f5f7fa',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    color: '#374151',
    margin: '0 0 8px',
  },
  emptySub: {
    fontSize: 15,
    color: '#9ca3af',
    margin: 0,
  },
  resetNotice: {
    position: 'fixed' as const,
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#ef4444',
    color: '#fff',
    padding: '12px 32px',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    zIndex: 9999,
    boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
    animation: 'fadeSlideIn 0.3s cubic-bezier(0.4,0,0.2,1)',
  },
  summaryBar: {
    display: 'flex',
    gap: 24,
    background: '#f97316',
    borderRadius: 14,
    padding: '20px 32px',
    marginBottom: 24,
    boxShadow: '0 4px 16px rgba(249,115,22,0.2)',
    flexWrap: 'wrap' as const,
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 500,
  },
  summaryValue: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 800,
    lineHeight: 1.2,
  },
  summaryValueSmall: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
    gap: 24,
  },
  chartCard: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    padding: 24,
    transition: 'box-shadow 0.2s cubic-bezier(0.4,0,0.2,1)',
  },
  chartTitle: {
    margin: '0 0 16px',
    fontSize: 17,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  chartContainer: {
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
  },
  recentList: {
    marginTop: 16,
    borderTop: '1px solid #f3f4f6',
    paddingTop: 12,
  },
  recentListTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  noRecords: {
    fontSize: 14,
    color: '#d1d5db',
    fontStyle: 'italic',
  },
  recentItem: {
    fontSize: 14,
    color: '#374151',
    padding: '4px 0',
    borderBottom: '1px solid #f9fafb',
    transition: 'opacity 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1)',
  },
};

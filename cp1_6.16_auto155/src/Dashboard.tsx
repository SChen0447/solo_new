import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import axios from 'axios';
import { useAppContext } from './App';
import type { Courseware, CoursewareResults, StudentAnswer } from './types';

const COLORS = ['#4FC3F7', '#81C784', '#FFB74D', '#E57373', '#CE93D8'];

function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { coursewares, loading, fetchCoursewares } = useAppContext();
  
  const [results, setResults] = useState<CoursewareResults | null>(null);
  const [currentCourseware, setCurrentCourseware] = useState<Courseware | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      const found = coursewares.find(c => c.id === id);
      if (found) {
        setCurrentCourseware(found);
        fetchResultsData(id);
      }
    } else {
      setCurrentCourseware(null);
      setResults(null);
    }
  }, [id, coursewares]);

  const fetchResultsData = async (coursewareId: string) => {
    setLoadingResults(true);
    try {
      const response = await axios.get(`/api/results/${coursewareId}`);
      setResults(response.data);
    } catch (err) {
      console.error('加载结果失败:', err);
    } finally {
      setLoadingResults(false);
    }
  };

  const simulateAnswers = async () => {
    if (!currentCourseware || currentCourseware.questions.length === 0) return;
    
    setSubmitting(true);
    
    try {
      const answers: StudentAnswer[] = currentCourseware.questions.map(question => {
        const optionsCount = question.options.length;
        let selectedOption: number;
        
        if (question.type === 'quiz' && question.correctAnswer !== undefined) {
          const isCorrect = Math.random() > 0.4;
          if (isCorrect) {
            selectedOption = question.correctAnswer;
          } else {
            const wrongOptions = question.options
              .map((_, i) => i)
              .filter(i => i !== question.correctAnswer);
            selectedOption = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
          }
        } else {
          selectedOption = Math.floor(Math.random() * optionsCount);
        }
        
        return {
          questionId: question.id,
          selectedOption
        };
      });
      
      await axios.post('/api/answer', {
        coursewareId: currentCourseware.id,
        answers
      });
      
      await fetchResultsData(currentCourseware.id);
    } catch (err) {
      console.error('提交答案失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const exportReport = async () => {
    if (!currentCourseware) return;
    
    try {
      const response = await axios.get(`/api/export/${currentCourseware.id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'report.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  const getChartData = (questionId: string) => {
    if (!results || !currentCourseware) return [];
    
    const questionResult = results.results.find(r => r.questionId === questionId);
    const question = currentCourseware.questions.find(q => q.id === questionId);
    
    if (!questionResult || !question) return [];
    
    return question.options.map((option, index) => ({
      name: `选项${String.fromCharCode(65 + index)}`,
      value: questionResult.optionCounts[index.toString()] || 0,
      label: option,
      percentage: questionResult.totalAnswers > 0
        ? ((questionResult.optionCounts[index.toString()] || 0) / questionResult.totalAnswers * 100).toFixed(1) + '%'
        : '0%'
    }));
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={styles.tooltip}>
          <p style={styles.tooltipLabel}>{payload[0].payload.label}</p>
          <p style={styles.tooltipValue}>
            选择人数: <strong>{payload[0].value}</strong>
          </p>
          <p style={styles.tooltipPercent}>
            占比: {payload[0].payload.percentage}
          </p>
        </div>
      );
    }
    return null;
  };

  if (id && currentCourseware) {
    return (
      <div style={styles.detailContainer}>
        <div style={styles.detailHeader}>
          <button
            onClick={() => navigate('/board')}
            style={styles.backButton}
          >
            ← 返回列表
          </button>
          <h2 style={styles.detailTitle}>{currentCourseware.title}</h2>
          <div style={styles.detailActions}>
            <button
              onClick={simulateAnswers}
              disabled={submitting || currentCourseware.questions.length === 0}
              style={{
                ...styles.secondaryButton,
                ...(submitting ? { opacity: 0.6 } : {})
              }}
            >
              {submitting ? '提交中...' : '🎲 模拟回答'}
            </button>
            <button
              onClick={exportReport}
              disabled={currentCourseware.questions.length === 0}
              style={styles.primaryButton}
            >
              📊 导出报告
            </button>
          </div>
        </div>

        {loadingResults ? (
          <div style={styles.loadingState}>
            <div style={styles.loadingSpinner} />
            <p>加载统计数据中...</p>
          </div>
        ) : currentCourseware.questions.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📝</div>
            <p style={styles.emptyText}>此课件暂无题目</p>
            <Link to={`/edit/${currentCourseware.id}`} style={styles.emptyLink}>
              去添加题目 →
            </Link>
          </div>
        ) : (
          <div style={styles.chartsGrid}>
            {currentCourseware.questions.map((question, qIndex) => {
              const chartData = getChartData(question.id);
              const questionResult = results?.results.find(r => r.questionId === question.id);
              
              return (
                <div key={question.id} style={styles.chartCard}>
                  <div style={styles.chartCardHeader}>
                    <div style={styles.questionInfo}>
                      <span style={styles.questionBadge}>
                        {question.type === 'quiz' ? '📝 测验题' : '🗳️ 投票题'}
                      </span>
                      <span style={styles.questionNumber}>第 {qIndex + 1} 题</span>
                    </div>
                    <div style={styles.totalAnswers}>
                      总回答: <strong>{questionResult?.totalAnswers || 0}</strong> 人
                    </div>
                  </div>
                  
                  <h3 style={styles.chartTitle}>{question.prompt}</h3>
                  
                  <div style={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 10, right: 50, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                        <XAxis type="number" tick={{ fontSize: 12, fill: '#666' }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12, fill: '#666' }}
                          width={50}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          formatter={(value: string, entry: any) => {
                            const index = entry.dataKey ? chartData.findIndex(d => d.name === value) : 0;
                            const label = chartData[index]?.label || value;
                            return label;
                          }}
                          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        />
                        <Bar
                          dataKey="value"
                          animationDuration={300}
                          animationBegin={0}
                          radius={[0, 4, 4, 0]}
                          label={{
                            position: 'right',
                            formatter: (_value: any, entry: any) => entry.payload.percentage,
                            fontSize: 12,
                            fill: '#666'
                          }}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div style={styles.statsRow}>
                    {chartData.map((item, index) => (
                      <div key={index} style={styles.statItem}>
                        <div
                          style={{
                            ...styles.statDot,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                        <span style={styles.statLabel}>{item.label}</span>
                        <span style={styles.statValue}>
                          {item.value} ({item.percentage})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.pageTitle}>反馈看板</h2>
        <p style={styles.pageSubtitle}>查看所有课件的学生反馈数据</p>
      </div>

      {loading ? (
        <div style={styles.loadingState}>
          <div style={styles.loadingSpinner} />
          <p>加载课件列表中...</p>
        </div>
      ) : coursewares.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📚</div>
          <p style={styles.emptyText}>暂无课件</p>
          <Link to="/edit" style={styles.emptyLink}>
            创建第一个课件 →
          </Link>
        </div>
      ) : (
        <div style={styles.cardsGrid}>
          {coursewares.map((courseware) => (
            <div
              key={courseware.id}
              onClick={() => navigate(`/board/${courseware.id}`)}
              style={styles.courseCard}
            >
              <div style={styles.cardIcon}>📊</div>
              <h3 style={styles.cardTitle}>{courseware.title}</h3>
              <p style={styles.cardMeta}>
                {courseware.questions.length} 道题目
              </p>
              <div style={styles.cardFooter}>
                <span style={styles.viewDetail}>查看详情 →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: 'calc(100vh - 116px)'
  },
  header: {
    marginBottom: '24px'
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '4px'
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#999'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  cardIcon: {
    fontSize: '36px',
    marginBottom: '8px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '4px'
  },
  cardMeta: {
    fontSize: '14px',
    color: '#999'
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: '12px',
    borderTop: '1px solid #F0F0F0'
  },
  viewDetail: {
    fontSize: '14px',
    color: '#1976D2',
    fontWeight: 500
  },
  detailContainer: {
    minHeight: 'calc(100vh - 116px)'
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#F5F5F5',
    color: '#666',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'background-color 0.2s'
  },
  detailTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#333',
    flex: 1,
    textAlign: 'center'
  },
  detailActions: {
    display: 'flex',
    gap: '12px'
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: '#1976D2',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s'
  },
  secondaryButton: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#1976D2',
    border: '1px solid #1976D2',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '24px'
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  chartCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  questionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  questionBadge: {
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '4px',
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    fontWeight: 500
  },
  questionNumber: {
    fontSize: '13px',
    color: '#999'
  },
  totalAnswers: {
    fontSize: '14px',
    color: '#666'
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#333',
    marginBottom: '16px'
  },
  chartContainer: {
    width: '100%',
    height: '300px',
    marginBottom: '16px'
  },
  statsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #F0F0F0'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px'
  },
  statDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  statLabel: {
    color: '#666'
  },
  statValue: {
    color: '#333',
    fontWeight: 500
  },
  tooltip: {
    backgroundColor: '#fff',
    padding: '12px 16px',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    border: '1px solid #E0E0E0'
  },
  tooltipLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
    marginBottom: '6px'
  },
  tooltipValue: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '2px'
  },
  tooltipPercent: {
    fontSize: '13px',
    color: '#999'
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#999'
  },
  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #E0E0E0',
    borderTopColor: '#1976D2',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: '16px',
    color: '#999',
    marginBottom: '16px'
  },
  emptyLink: {
    fontSize: '14px',
    color: '#1976D2',
    textDecoration: 'none',
    fontWeight: 500
  },
  errorBar: {
    backgroundColor: '#FFEBEE',
    color: '#fff',
    padding: '12px',
    borderRadius: '6px',
    textAlign: 'center',
    marginBottom: '20px',
    fontSize: '14px'
  }
};

export default Dashboard;

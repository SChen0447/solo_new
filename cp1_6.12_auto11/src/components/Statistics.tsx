import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowLeft, Download, Edit, FileText, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import type { Survey, Answer, Question } from '../types';
import { dataStore } from '../dataStore';

const COLORS = ['#4F46E5', '#818CF8', '#A5B4FC', '#C7D2FE', '#E0E7FF', '#6366F1', '#7C3AED'];

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, icon, children, delay }) => {
  return (
    <div
      className="bg-white rounded-xl shadow-sm p-6 animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
};

interface PieChartCardProps {
  question: Question;
  data: { name: string; value: number }[];
  delay: number;
}

const PieChartCard: React.FC<PieChartCardProps> = ({ question, data, delay }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <StatCard title={question.title} icon={<PieChartIcon size={20} />} delay={delay}>
      {total === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400">
          暂无回答数据
        </div>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {data.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-800">
                  {item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </StatCard>
  );
};

interface BarChartCardProps {
  question: Question;
  data: { name: string; value: number }[];
  delay: number;
}

const BarChartCard: React.FC<BarChartCardProps> = ({ question, data, delay }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const avg = total > 0
    ? data.reduce((sum, item) => sum + item.value * parseInt(item.name), 0) / total
    : 0;

  return (
    <StatCard title={question.title} icon={<BarChart3 size={20} />} delay={delay}>
      {total === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400">
          暂无回答数据
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-indigo-600">{avg.toFixed(1)}</span>
            <span className="text-gray-500">平均评分</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            共 {total} 人评分
          </div>
        </>
      )}
    </StatCard>
  );
};

interface TextListCardProps {
  question: Question;
  answers: string[];
  delay: number;
}

const TextListCard: React.FC<TextListCardProps> = ({ question, answers, delay }) => {
  return (
    <StatCard title={question.title} icon={<FileText size={20} />} delay={delay}>
      {answers.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-400">
          暂无回答数据
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-3">
          {answers.map((answer, idx) => (
            <div
              key={idx}
              className="p-4 bg-gray-50 rounded-lg text-gray-700 text-sm"
            >
              {answer}
            </div>
          ))}
          <div className="text-sm text-gray-500 pt-2">
            共 {answers.length} 条回答
          </div>
        </div>
      )}
    </StatCard>
  );
};

export const Statistics: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (surveyId) {
      Promise.all([
        dataStore.getSurvey(surveyId),
        dataStore.getAnswers(surveyId),
      ]).then(([s, a]) => {
        setSurvey(s);
        setAnswers(a);
        setLoading(false);
      }).catch(() => {
        navigate('/');
      });
    }
  }, [surveyId, navigate]);

  const processChartData = useMemo(() => {
    if (!survey) return {};
    
    const result: { [questionId: string]: any } = {};
    
    survey.questions.forEach((q) => {
      const questionAnswers = answers.filter(a => a.questionId === q.id);
      
      if (q.type === 'single' || q.type === 'dropdown') {
        const counts: { [key: string]: number } = {};
        q.options?.forEach(opt => { counts[opt] = 0; });
        questionAnswers.forEach(a => {
          const val = a.value as string;
          counts[val] = (counts[val] || 0) + 1;
        });
        result[q.id] = Object.entries(counts).map(([name, value]) => ({ name, value }));
      } else if (q.type === 'multiple') {
        const counts: { [key: string]: number } = {};
        q.options?.forEach(opt => { counts[opt] = 0; });
        questionAnswers.forEach(a => {
          const vals = a.value as string[];
          vals.forEach(v => {
            counts[v] = (counts[v] || 0) + 1;
          });
        });
        result[q.id] = Object.entries(counts).map(([name, value]) => ({ name, value }));
      } else if (q.type === 'rating') {
        const counts: { [key: string]: number } = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        questionAnswers.forEach(a => {
          const val = a.value as number;
          counts[val.toString()] = (counts[val.toString()] || 0) + 1;
        });
        result[q.id] = [1, 2, 3, 4, 5].map(star => ({
          name: star.toString(),
          value: counts[star.toString()] || 0,
        }));
      } else if (q.type === 'text') {
        result[q.id] = questionAnswers.map(a => a.value as string).filter(Boolean);
      }
    });
    
    return result;
  }, [survey, answers]);

  const handleExport = async () => {
    if (!surveyId) return;
    setExporting(true);
    try {
      await dataStore.exportSurvey(surveyId);
    } catch (e) {
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const submissionCount = useMemo(() => {
    if (answers.length === 0) return 0;
    const timestamps = new Set(answers.map(a => a.submittedAt));
    return timestamps.size;
  }, [answers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F0F4F8]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!survey) return null;

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease forwards;
          opacity: 0;
        }
      `}</style>
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{survey.title}</h1>
              <p className="text-sm text-gray-500">统计分析报告</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/designer/${survey.id}`)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <Edit size={18} />
              编辑问卷
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download size={18} />
              {exporting ? '导出中...' : '导出数据'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            className="bg-white rounded-xl shadow-sm p-6 animate-fadeInUp"
            style={{ animationDelay: '0ms' }}
          >
            <div className="text-sm text-gray-500 mb-1">收到回答</div>
            <div className="text-3xl font-bold text-indigo-600">{submissionCount}</div>
            <div className="text-sm text-gray-400 mt-1">份有效问卷</div>
          </div>
          <div
            className="bg-white rounded-xl shadow-sm p-6 animate-fadeInUp"
            style={{ animationDelay: '100ms' }}
          >
            <div className="text-sm text-gray-500 mb-1">问题数量</div>
            <div className="text-3xl font-bold text-gray-800">{survey.questions.length}</div>
            <div className="text-sm text-gray-400 mt-1">道题目</div>
          </div>
          <div
            className="bg-white rounded-xl shadow-sm p-6 animate-fadeInUp"
            style={{ animationDelay: '200ms' }}
          >
            <div className="text-sm text-gray-500 mb-1">创建时间</div>
            <div className="text-xl font-bold text-gray-800">
              {new Date(survey.createdAt).toLocaleDateString('zh-CN')}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {new Date(survey.createdAt).toLocaleTimeString('zh-CN')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {survey.questions.map((question, idx) => {
            const data = processChartData[question.id];
            const delay = 300 + idx * 150;
            
            if (question.type === 'single' || question.type === 'multiple' || question.type === 'dropdown') {
              return (
                <PieChartCard
                  key={question.id}
                  question={question}
                  data={data || []}
                  delay={delay}
                />
              );
            } else if (question.type === 'rating') {
              return (
                <BarChartCard
                  key={question.id}
                  question={question}
                  data={data || []}
                  delay={delay}
                />
              );
            } else if (question.type === 'text') {
              return (
                <TextListCard
                  key={question.id}
                  question={question}
                  answers={data || []}
                  delay={delay}
                />
              );
            }
            return null;
          })}
        </div>
      </main>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, BarChart3, FileText, Eye, Calendar, CheckSquare } from 'lucide-react';
import type { Survey } from '../types';
import { dataStore } from '../dataStore';

const SurveyList: React.FC = () => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const loadSurveys = useCallback(async () => {
    setLoading(true);
    const data = await dataStore.getAllSurveys();
    setSurveys(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) {
      alert('请输入问卷标题');
      return;
    }
    setCreating(true);
    const result = await dataStore.createSurvey(newTitle.trim(), newDescription.trim());
    if (result) {
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      navigate(`/designer/${result.id}`);
    }
    setCreating(false);
  }, [newTitle, newDescription, navigate]);

  const handleDelete = useCallback(async (id: string, title: string) => {
    if (window.confirm(`确定要删除问卷「${title}」吗？此操作不可恢复。`)) {
      const success = await dataStore.deleteSurvey(id);
      if (success) {
        loadSurveys();
      }
    }
  }, [loadSurveys]);

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s ease-out;
        }
        .card-hover {
          transition: all 0.25s ease;
        }
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -8px rgba(79, 70, 229, 0.15);
        }
      `}</style>

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center">
                <CheckSquare className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">问卷调研平台</h1>
                <p className="text-sm text-gray-500">轻松创建问卷，快速收集反馈</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
            >
              <Plus size={20} />
              创建问卷
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
        ) : surveys.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <FileText size={40} className="text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">还没有问卷</h2>
            <p className="text-gray-500 mb-6">创建您的第一份问卷，开始收集反馈吧</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2 font-medium"
            >
              <Plus size={20} />
              创建问卷
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys.map((survey, idx) => (
              <div
                key={survey.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden card-hover"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center flex-shrink-0">
                      <FileText className="text-white" size={22} />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate(`/designer/${survey.id}`)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(survey.id, survey.title)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-800 text-lg mb-2 line-clamp-2">
                    {survey.title}
                  </h3>
                  {survey.description && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                      {survey.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <FileText size={14} />
                      {survey.questions.length} 题
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(survey.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-100 p-4 bg-gray-50 flex gap-2">
                  <button
                    onClick={() => navigate(`/viewer/${survey.id}`)}
                    className="flex-1 py-2 text-gray-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
                  >
                    <Eye size={16} />
                    填写
                  </button>
                  <button
                    onClick={() => navigate(`/designer/${survey.id}`)}
                    className="flex-1 py-2 text-gray-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
                  >
                    <Edit size={16} />
                    编辑
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/${survey.id}`)}
                    className="flex-1 py-2 text-gray-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
                  >
                    <BarChart3 size={16} />
                    统计
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">创建新问卷</h2>
              <p className="text-sm text-gray-500 mt-1">填写基本信息，开始创建您的问卷</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">问卷标题</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="请输入问卷标题"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">问卷描述</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="请输入问卷描述（可选）"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2 font-medium"
              >
                <Plus size={18} />
                {creating ? '创建中...' : '创建问卷'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyList;

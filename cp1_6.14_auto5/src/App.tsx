import { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ResumeProvider, useResume, type SectionType, type TemplateId } from '@/context/ResumeContext';
import ResumeForm from '@/components/ResumeForm';
import SortableSection from '@/components/SortableSection';
import ResumePreview from '@/components/ResumePreview';
import { exportResumeToPdf } from '@/utils/exportPdf';
import {
  FileText,
  Palette,
  Download,
  Loader2,
  CheckCircle2,
  LayoutGrid,
  Eye,
  User,
  GraduationCap,
  Briefcase,
} from 'lucide-react';

const TEMPLATES: { id: TemplateId; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'minimal-white', name: '简约白', icon: <FileText size={15} />, color: '#f8f9fa' },
  { id: 'modern-blue', name: '现代蓝', icon: <Palette size={15} />, color: '#1565C0' },
  { id: 'business-gray', name: '商务灰', icon: <LayoutGrid size={15} />, color: '#455A64' },
];

const SECTION_ICONS: Record<SectionType, React.ReactNode> = {
  personalInfo: <User size={15} />,
  education: <GraduationCap size={15} />,
  workExperience: <Briefcase size={15} />,
};

function ResumeBuilder() {
  const { state, dispatch } = useResume();
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  const moveSection = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const newOrder = [...state.sectionOrder];
      const [dragged] = newOrder.splice(dragIndex, 1);
      newOrder.splice(hoverIndex, 0, dragged);
      dispatch({ type: 'REORDER_SECTIONS', payload: newOrder });
    },
    [state.sectionOrder, dispatch]
  );

  const handleExport = async () => {
    dispatch({ type: 'SET_EXPORTING', payload: true });
    dispatch({ type: 'SET_EXPORT_SUCCESS', payload: false });
    try {
      await exportResumeToPdf(state.resumeData, state.templateId, state.sectionOrder);
      dispatch({ type: 'SET_EXPORT_SUCCESS', payload: true });
      setTimeout(() => dispatch({ type: 'SET_EXPORT_SUCCESS', payload: false }), 3000);
    } catch {
      alert('导出失败，请重试');
    } finally {
      dispatch({ type: 'SET_EXPORTING', payload: false });
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText size={22} className="text-blue-600" />
            <h1 className="text-base font-bold text-gray-800 tracking-tight">Resume Builder</h1>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg p-1">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => dispatch({ type: 'SET_TEMPLATE', payload: t.id })}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                  ${state.templateId === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
                `}
              >
                <span
                  className="w-3 h-3 rounded-sm border"
                  style={{ background: t.color, borderColor: state.templateId === t.id ? '#1976D2' : '#ddd' }}
                />
                {t.name}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={state.isExporting}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200
              ${state.isExporting ? 'bg-green-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 active:scale-95 shadow-sm'}
            `}
          >
            {state.isExporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download size={16} />
                导出PDF
              </>
            )}
          </button>
        </div>
      </header>

      {state.exportSuccess && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 animate-fadeIn">
          <div className="flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-lg shadow-lg text-sm font-medium">
            <CheckCircle2 size={16} />
            导出成功！PDF已下载
          </div>
        </div>
      )}

      <div className="mobile-tabs md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 flex">
        <button
          onClick={() => setActiveTab('form')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors duration-200 ${
            activeTab === 'form' ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <User size={16} />
          编辑
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors duration-200 ${
            activeTab === 'preview' ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <Eye size={16} />
          预览
        </button>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 transition-all duration-300">
          <div
            className={`
              w-full lg:w-[35%] transition-all duration-300
              ${activeTab !== 'form' ? 'hidden md:block' : ''}
            `}
          >
            <div className="lg:sticky lg:top-20">
              <div className="space-y-4">
                {state.sectionOrder.map((sectionKey, index) => (
                  <SortableSection key={sectionKey} id={sectionKey} index={index} moveSection={moveSection}>
                    <FormSectionContent sectionKey={sectionKey} />
                  </SortableSection>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`
              w-full lg:w-[65%] transition-all duration-300
              ${activeTab !== 'preview' ? 'hidden md:block' : ''}
            `}
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
                <Eye size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500">实时预览</span>
                <span className="text-[10px] text-gray-400 ml-auto">
                  {state.sectionOrder.map((s) => SECTION_ICONS[s] && (
                    <span key={s} className="inline-flex ml-1">{SECTION_ICONS[s]}</span>
                  ))}
                </span>
              </div>
              <div className="overflow-auto max-h-[calc(100vh-160px)]">
                <ResumePreview />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-16 md:hidden" />
    </div>
  );
}

function FormSectionContent({ sectionKey }: { sectionKey: SectionType }) {
  const { dispatch } = useResume();
  const { resumeData } = useResume().state;

  switch (sectionKey) {
    case 'personalInfo':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MiniInput label="姓名" value={resumeData.personalInfo.name} onChange={(v) => dispatch({ type: 'UPDATE_PERSONAL_INFO', payload: { name: v } })} />
          <MiniInput label="邮箱" value={resumeData.personalInfo.email} onChange={(v) => dispatch({ type: 'UPDATE_PERSONAL_INFO', payload: { email: v } })} type="email" />
          <MiniInput label="电话" value={resumeData.personalInfo.phone} onChange={(v) => dispatch({ type: 'UPDATE_PERSONAL_INFO', payload: { phone: v } })} />
          <MiniInput label="地址" value={resumeData.personalInfo.address} onChange={(v) => dispatch({ type: 'UPDATE_PERSONAL_INFO', payload: { address: v } })} />
        </div>
      );
    case 'education':
      return (
        <div className="space-y-3">
          {resumeData.education.map((edu, i) => (
            <div key={edu.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-gray-400 font-medium">#{i + 1}</span>
                <button onClick={() => dispatch({ type: 'REMOVE_EDUCATION', payload: edu.id })} className="text-gray-300 hover:text-red-400 transition-colors active:scale-90">
                  <span className="text-xs">删除</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniInput label="学校" value={edu.school} onChange={(v) => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { school: v } } })} />
                <MiniInput label="专业" value={edu.major} onChange={(v) => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { major: v } } })} />
                <MiniInput label="时间" value={edu.period} onChange={(v) => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { period: v } } })} />
              </div>
              <MiniTextarea label="描述" value={edu.description} onChange={(v) => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { description: v } } })} />
            </div>
          ))}
          <button onClick={() => dispatch({ type: 'ADD_EDUCATION' })} className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 active:scale-[0.98]">
            + 添加教育经历
          </button>
        </div>
      );
    case 'workExperience':
      return (
        <div className="space-y-3">
          {resumeData.workExperience.map((work, i) => (
            <div key={work.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-gray-400 font-medium">#{i + 1}</span>
                <button onClick={() => dispatch({ type: 'REMOVE_WORK_EXPERIENCE', payload: work.id })} className="text-gray-300 hover:text-red-400 transition-colors active:scale-90">
                  <span className="text-xs">删除</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniInput label="公司" value={work.company} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { id: work.id, data: { company: v } } })} />
                <MiniInput label="职位" value={work.position} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { id: work.id, data: { position: v } } })} />
                <MiniInput label="时间" value={work.period} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { id: work.id, data: { period: v } } })} />
              </div>
              <MiniTextarea label="描述" value={work.description} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { id: work.id, data: { description: v } } })} />
            </div>
          ))}
          <button onClick={() => dispatch({ type: 'ADD_WORK_EXPERIENCE' })} className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 active:scale-[0.98]">
            + 添加工作经历
          </button>
        </div>
      );
    default:
      return null;
  }
}

function MiniInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-500 mb-0.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 bg-white"
      />
    </div>
  );
}

function MiniTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-2">
      <label className="block text-[11px] font-medium text-gray-500 mb-0.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 bg-white resize-none"
      />
    </div>
  );
}

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <ResumeProvider>
        <ResumeBuilder />
      </ResumeProvider>
    </DndProvider>
  );
}

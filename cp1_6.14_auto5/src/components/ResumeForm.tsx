import { useResume } from '@/context/ResumeContext';
import { User, GraduationCap, Briefcase, Plus, Trash2 } from 'lucide-react';

export default function ResumeForm() {
  const { state, dispatch } = useResume();
  const { resumeData } = state;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-800 text-sm">个人信息</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="姓名"
            value={resumeData.personalInfo.name}
            onChange={(v) => dispatch({ type: 'UPDATE_PERSONAL_INFO', payload: { name: v } })}
            placeholder="请输入姓名"
          />
          <InputField
            label="邮箱"
            value={resumeData.personalInfo.email}
            onChange={(v) => dispatch({ type: 'UPDATE_PERSONAL_INFO', payload: { email: v } })}
            placeholder="example@email.com"
            type="email"
          />
          <InputField
            label="电话"
            value={resumeData.personalInfo.phone}
            onChange={(v) => dispatch({ type: 'UPDATE_PERSONAL_INFO', payload: { phone: v } })}
            placeholder="请输入电话号码"
          />
          <InputField
            label="地址"
            value={resumeData.personalInfo.address}
            onChange={(v) => dispatch({ type: 'UPDATE_PERSONAL_INFO', payload: { address: v } })}
            placeholder="请输入地址"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-800 text-sm">教育经历</h3>
          </div>
          <button
            onClick={() => dispatch({ type: 'ADD_EDUCATION' })}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
          >
            <Plus size={14} />
            添加
          </button>
        </div>
        <div className="space-y-4">
          {resumeData.education.map((edu, index) => (
            <div key={edu.id} className="relative border border-gray-100 rounded-lg p-3.5 bg-gray-50/50 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500">教育经历 #{index + 1}</span>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_EDUCATION', payload: edu.id })}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 active:scale-90"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  label="学校"
                  value={edu.school}
                  onChange={(v) => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { school: v } } })}
                  placeholder="请输入学校名称"
                />
                <InputField
                  label="专业"
                  value={edu.major}
                  onChange={(v) => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { major: v } } })}
                  placeholder="请输入专业"
                />
                <InputField
                  label="时间"
                  value={edu.period}
                  onChange={(v) => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { period: v } } })}
                  placeholder="2018 - 2022"
                />
                <div className="sm:col-span-2">
                  <TextAreaField
                    label="描述"
                    value={edu.description}
                    onChange={(v) => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { description: v } } })}
                    placeholder="请描述相关经历、成绩等"
                  />
                </div>
              </div>
            </div>
          ))}
          {resumeData.education.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">暂无教育经历，点击上方添加按钮</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-800 text-sm">工作经历</h3>
          </div>
          <button
            onClick={() => dispatch({ type: 'ADD_WORK_EXPERIENCE' })}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-all duration-200 active:scale-95"
          >
            <Plus size={14} />
            添加
          </button>
        </div>
        <div className="space-y-4">
          {resumeData.workExperience.map((work, index) => (
            <div key={work.id} className="relative border border-gray-100 rounded-lg p-3.5 bg-gray-50/50 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500">工作经历 #{index + 1}</span>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_WORK_EXPERIENCE', payload: work.id })}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 active:scale-90"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  label="公司"
                  value={work.company}
                  onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { id: work.id, data: { company: v } } })}
                  placeholder="请输入公司名称"
                />
                <InputField
                  label="职位"
                  value={work.position}
                  onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { id: work.id, data: { position: v } } })}
                  placeholder="请输入职位"
                />
                <InputField
                  label="时间"
                  value={work.period}
                  onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { id: work.id, data: { period: v } } })}
                  placeholder="2022 - 至今"
                />
                <div className="sm:col-span-2">
                  <TextAreaField
                    label="描述"
                    value={work.description}
                    onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { id: work.id, data: { description: v } } })}
                    placeholder="请描述工作内容、成就等"
                  />
                </div>
              </div>
            </div>
          ))}
          {resumeData.workExperience.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">暂无工作经历，点击上方添加按钮</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: InputFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white placeholder:text-gray-300"
      />
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function TextAreaField({ label, value, onChange, placeholder }: TextAreaFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white resize-none placeholder:text-gray-300"
      />
    </div>
  );
}

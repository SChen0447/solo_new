import { useResume, type SectionType } from '@/context/ResumeContext';
import { Mail, Phone, MapPin, GraduationCap, Briefcase } from 'lucide-react';

const SECTION_TITLES: Record<SectionType, string> = {
  personalInfo: '个人信息',
  education: '教育经历',
  workExperience: '工作经历',
};

export default function ResumePreview() {
  const { state } = useResume();
  const { resumeData, sectionOrder, templateId } = state;

  const templateStyles = getTemplateStyles(templateId);

  return (
    <div className="flex justify-center overflow-y-auto p-4 md:p-8" style={{ background: '#e8e8e8' }}>
      <div
        className="transition-opacity duration-300"
        style={{
          width: '210mm',
          minHeight: '297mm',
          background: templateStyles.bg,
          color: templateStyles.text,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: 1.6,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          padding: templateStyles.padding,
        }}
        id="resume-preview-content"
      >
        {sectionOrder.map((sectionKey) => {
          switch (sectionKey) {
            case 'personalInfo':
              return <PersonalInfoSection key={sectionKey} data={resumeData.personalInfo} styles={templateStyles} />;
            case 'education':
              return <EducationSection key={sectionKey} data={resumeData.education} styles={templateStyles} />;
            case 'workExperience':
              return <WorkExperienceSection key={sectionKey} data={resumeData.workExperience} styles={templateStyles} />;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}

interface TemplateStyles {
  bg: string;
  text: string;
  accent: string;
  headingColor: string;
  sectionBorder: string;
  headerBg: string;
  headerText: string;
  padding: string;
  iconColor: string;
  dividerColor: string;
  tagBg: string;
  tagText: string;
}

function getTemplateStyles(templateId: string): TemplateStyles {
  switch (templateId) {
    case 'modern-blue':
      return {
        bg: '#ffffff',
        text: '#374151',
        accent: '#1565C0',
        headingColor: '#0D47A1',
        sectionBorder: '#1565C0',
        headerBg: '#1565C0',
        headerText: '#ffffff',
        padding: '0',
        iconColor: '#1565C0',
        dividerColor: '#E3F2FD',
        tagBg: '#E3F2FD',
        tagText: '#1565C0',
      };
    case 'business-gray':
      return {
        bg: '#ffffff',
        text: '#333333',
        accent: '#455A64',
        headingColor: '#263238',
        sectionBorder: '#455A64',
        headerBg: '#37474F',
        headerText: '#ffffff',
        padding: '0',
        iconColor: '#546E7A',
        dividerColor: '#ECEFF1',
        tagBg: '#ECEFF1',
        tagText: '#455A64',
      };
    default:
      return {
        bg: '#ffffff',
        text: '#333333',
        accent: '#1976D2',
        headingColor: '#1a1a1a',
        sectionBorder: '#1976D2',
        headerBg: '#ffffff',
        headerText: '#1a1a1a',
        padding: '40px 48px',
        iconColor: '#1976D2',
        dividerColor: '#e5e7eb',
        tagBg: '#EFF6FF',
        tagText: '#1976D2',
      };
  }
}

interface PersonalInfoProps {
  data: { name: string; email: string; phone: string; address: string };
  styles: TemplateStyles;
}

function PersonalInfoSection({ data, styles }: PersonalInfoProps) {
  const hasContent = data.name || data.email || data.phone || data.address;

  if (styles.headerBg !== '#ffffff') {
    return (
      <div style={{ background: styles.headerBg, color: styles.headerText, padding: '36px 48px 28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '0.5px' }}>
          {data.name || '你的姓名'}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '10px', fontSize: '13px', opacity: 0.9 }}>
          {data.email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Mail size={13} /> {data.email}
            </span>
          )}
          {data.phone && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Phone size={13} /> {data.phone}
            </span>
          )}
          {data.address && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={13} /> {data.address}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: hasContent ? '8px' : '0' }}>
      <h1 style={{ fontSize: '30px', fontWeight: 700, color: styles.headingColor, margin: '0 0 6px', letterSpacing: '0.3px' }}>
        {data.name || '你的姓名'}
      </h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: '#666' }}>
        {data.email && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Mail size={12} style={{ color: styles.iconColor }} /> {data.email}
          </span>
        )}
        {data.phone && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Phone size={12} style={{ color: styles.iconColor }} /> {data.phone}
          </span>
        )}
        {data.address && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={12} style={{ color: styles.iconColor }} /> {data.address}
          </span>
        )}
      </div>
      <div style={{ height: '1px', background: styles.dividerColor, margin: '20px 0 0' }} />
    </div>
  );
}

interface EducationProps {
  data: { id: string; school: string; major: string; period: string; description: string }[];
  styles: TemplateStyles;
}

function EducationSection({ data, styles }: EducationProps) {
  if (data.length === 0) return null;

  return (
    <div style={{ paddingTop: '20px' }}>
      <SectionTitle icon={<GraduationCap size={15} />} title={SECTION_TITLES.education} styles={styles} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {data.map((edu) => (
          <div key={edu.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '14px', color: styles.headingColor }}>{edu.school || '学校名称'}</span>
                {edu.major && (
                  <span style={{ marginLeft: '8px', fontSize: '13px', color: styles.tagText, background: styles.tagBg, padding: '1px 8px', borderRadius: '4px' }}>
                    {edu.major}
                  </span>
                )}
              </div>
              {edu.period && (
                <span style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>{edu.period}</span>
              )}
            </div>
            {edu.description && (
              <p style={{ fontSize: '13px', color: '#555', margin: '4px 0 0', lineHeight: 1.6 }}>{edu.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface WorkExperienceProps {
  data: { id: string; company: string; position: string; period: string; description: string }[];
  styles: TemplateStyles;
}

function WorkExperienceSection({ data, styles }: WorkExperienceProps) {
  if (data.length === 0) return null;

  return (
    <div style={{ paddingTop: '20px' }}>
      <SectionTitle icon={<Briefcase size={15} />} title={SECTION_TITLES.workExperience} styles={styles} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {data.map((work) => (
          <div key={work.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '14px', color: styles.headingColor }}>{work.company || '公司名称'}</span>
                {work.position && (
                  <span style={{ marginLeft: '8px', fontSize: '13px', color: styles.tagText, background: styles.tagBg, padding: '1px 8px', borderRadius: '4px' }}>
                    {work.position}
                  </span>
                )}
              </div>
              {work.period && (
                <span style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>{work.period}</span>
              )}
            </div>
            {work.description && (
              <p style={{ fontSize: '13px', color: '#555', margin: '4px 0 0', lineHeight: 1.6 }}>{work.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';

function SectionTitle({ icon, title, styles }: { icon: ReactNode; title: string; styles: TemplateStyles }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '8px', borderBottom: `2px solid ${styles.sectionBorder}` }}>
      <span style={{ color: styles.iconColor, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <h2 style={{ fontSize: '16px', fontWeight: 700, color: styles.accent, margin: 0, letterSpacing: '0.3px' }}>{title}</h2>
    </div>
  );
}

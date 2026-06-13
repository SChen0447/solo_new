import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';

export type SectionType = 'personalInfo' | 'education' | 'workExperience';
export type TemplateId = 'minimal-white' | 'modern-blue' | 'business-gray';

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Education {
  id: string;
  school: string;
  major: string;
  period: string;
  description: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  period: string;
  description: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  education: Education[];
  workExperience: WorkExperience[];
}

export interface ResumeState {
  resumeData: ResumeData;
  sectionOrder: SectionType[];
  templateId: TemplateId;
  isExporting: boolean;
  exportSuccess: boolean;
}

type ResumeAction =
  | { type: 'UPDATE_PERSONAL_INFO'; payload: Partial<PersonalInfo> }
  | { type: 'ADD_EDUCATION' }
  | { type: 'UPDATE_EDUCATION'; payload: { id: string; data: Partial<Education> } }
  | { type: 'REMOVE_EDUCATION'; payload: string }
  | { type: 'ADD_WORK_EXPERIENCE' }
  | { type: 'UPDATE_WORK_EXPERIENCE'; payload: { id: string; data: Partial<WorkExperience> } }
  | { type: 'REMOVE_WORK_EXPERIENCE'; payload: string }
  | { type: 'REORDER_SECTIONS'; payload: SectionType[] }
  | { type: 'SET_TEMPLATE'; payload: TemplateId }
  | { type: 'SET_EXPORTING'; payload: boolean }
  | { type: 'SET_EXPORT_SUCCESS'; payload: boolean };

const initialState: ResumeState = {
  resumeData: {
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    education: [],
    workExperience: [],
  },
  sectionOrder: ['personalInfo', 'education', 'workExperience'],
  templateId: 'minimal-white',
  isExporting: false,
  exportSuccess: false,
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function resumeReducer(state: ResumeState, action: ResumeAction): ResumeState {
  switch (action.type) {
    case 'UPDATE_PERSONAL_INFO':
      return {
        ...state,
        resumeData: {
          ...state.resumeData,
          personalInfo: { ...state.resumeData.personalInfo, ...action.payload },
        },
      };
    case 'ADD_EDUCATION':
      return {
        ...state,
        resumeData: {
          ...state.resumeData,
          education: [
            ...state.resumeData.education,
            { id: generateId(), school: '', major: '', period: '', description: '' },
          ],
        },
      };
    case 'UPDATE_EDUCATION':
      return {
        ...state,
        resumeData: {
          ...state.resumeData,
          education: state.resumeData.education.map((e) =>
            e.id === action.payload.id ? { ...e, ...action.payload.data } : e
          ),
        },
      };
    case 'REMOVE_EDUCATION':
      return {
        ...state,
        resumeData: {
          ...state.resumeData,
          education: state.resumeData.education.filter((e) => e.id !== action.payload),
        },
      };
    case 'ADD_WORK_EXPERIENCE':
      return {
        ...state,
        resumeData: {
          ...state.resumeData,
          workExperience: [
            ...state.resumeData.workExperience,
            { id: generateId(), company: '', position: '', period: '', description: '' },
          ],
        },
      };
    case 'UPDATE_WORK_EXPERIENCE':
      return {
        ...state,
        resumeData: {
          ...state.resumeData,
          workExperience: state.resumeData.workExperience.map((w) =>
            w.id === action.payload.id ? { ...w, ...action.payload.data } : w
          ),
        },
      };
    case 'REMOVE_WORK_EXPERIENCE':
      return {
        ...state,
        resumeData: {
          ...state.resumeData,
          workExperience: state.resumeData.workExperience.filter((w) => w.id !== action.payload),
        },
      };
    case 'REORDER_SECTIONS':
      return { ...state, sectionOrder: action.payload };
    case 'SET_TEMPLATE':
      return { ...state, templateId: action.payload };
    case 'SET_EXPORTING':
      return { ...state, isExporting: action.payload };
    case 'SET_EXPORT_SUCCESS':
      return { ...state, exportSuccess: action.payload };
    default:
      return state;
  }
}

interface ResumeContextValue {
  state: ResumeState;
  dispatch: Dispatch<ResumeAction>;
}

const ResumeContext = createContext<ResumeContextValue | null>(null);

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(resumeReducer, initialState);
  return (
    <ResumeContext.Provider value={{ state, dispatch }}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume(): ResumeContextValue {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
}

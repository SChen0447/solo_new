import { FormTemplate, FormResponse } from '../shared/types';
import { v4 as uuidv4 } from 'uuid';

class DataStore {
  private templates: Map<string, FormTemplate> = new Map();
  private responses: Map<string, FormResponse[]> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    const sampleTemplate: FormTemplate = {
      id: uuidv4(),
      title: '用户满意度调查问卷',
      description: '感谢您抽出宝贵时间参与我们的满意度调查，您的反馈对我们非常重要！',
      questions: [
        {
          id: uuidv4(),
          type: 'radio',
          title: '您对我们产品的整体满意度如何？',
          required: true,
          options: [
            { id: uuidv4(), label: '非常满意' },
            { id: uuidv4(), label: '满意' },
            { id: uuidv4(), label: '一般' },
            { id: uuidv4(), label: '不满意' },
            { id: uuidv4(), label: '非常不满意' },
          ],
        },
        {
          id: uuidv4(),
          type: 'checkbox',
          title: '您最喜欢我们产品的哪些功能？（可多选）',
          required: false,
          options: [
            { id: uuidv4(), label: '界面设计' },
            { id: uuidv4(), label: '响应速度' },
            { id: uuidv4(), label: '功能丰富' },
            { id: uuidv4(), label: '价格合理' },
            { id: uuidv4(), label: '客服支持' },
          ],
        },
        {
          id: uuidv4(),
          type: 'rating',
          title: '请为我们的客服服务打分',
          required: true,
          ratingMax: 5,
        },
        {
          id: uuidv4(),
          type: 'text',
          title: '您对我们有什么建议或意见？',
          required: false,
          placeholder: '请输入您的宝贵建议...',
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    };
    this.templates.set(sampleTemplate.id, sampleTemplate);

    const sampleResponses: FormResponse[] = [
      {
        id: uuidv4(),
        templateId: sampleTemplate.id,
        answers: {
          [sampleTemplate.questions[0].id]: sampleTemplate.questions[0].options![0].id,
          [sampleTemplate.questions[1].id]: [
            sampleTemplate.questions[1].options![0].id,
            sampleTemplate.questions[1].options![2].id,
          ],
          [sampleTemplate.questions[2].id]: 5,
          [sampleTemplate.questions[3].id]: '产品非常好用，继续加油！',
        },
        submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: uuidv4(),
        templateId: sampleTemplate.id,
        answers: {
          [sampleTemplate.questions[0].id]: sampleTemplate.questions[0].options![1].id,
          [sampleTemplate.questions[1].id]: [
            sampleTemplate.questions[1].options![1].id,
            sampleTemplate.questions[1].options![3].id,
            sampleTemplate.questions[1].options![4].id,
          ],
          [sampleTemplate.questions[2].id]: 4,
          [sampleTemplate.questions[3].id]: '希望增加更多自定义功能。',
        },
        submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: uuidv4(),
        templateId: sampleTemplate.id,
        answers: {
          [sampleTemplate.questions[0].id]: sampleTemplate.questions[0].options![2].id,
          [sampleTemplate.questions[1].id]: [sampleTemplate.questions[1].options![0].id],
          [sampleTemplate.questions[2].id]: 3,
          [sampleTemplate.questions[3].id]: '',
        },
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    this.responses.set(sampleTemplate.id, sampleResponses);
  }

  createTemplate(template: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'>): FormTemplate {
    const now = new Date().toISOString();
    const newTemplate: FormTemplate = {
      ...template,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    this.templates.set(newTemplate.id, newTemplate);
    this.responses.set(newTemplate.id, []);
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<FormTemplate>): FormTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;
    const updated: FormTemplate = {
      ...template,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
      createdAt: template.createdAt,
    };
    this.templates.set(id, updated);
    return updated;
  }

  getTemplate(id: string): FormTemplate | null {
    return this.templates.get(id) || null;
  }

  getAllTemplates(): FormTemplate[] {
    return Array.from(this.templates.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  deleteTemplate(id: string): boolean {
    this.templates.delete(id);
    this.responses.delete(id);
    return true;
  }

  addResponse(templateId: string, answers: Record<string, any>): FormResponse | null {
    if (!this.templates.has(templateId)) return null;
    const response: FormResponse = {
      id: uuidv4(),
      templateId,
      answers,
      submittedAt: new Date().toISOString(),
    };
    const list = this.responses.get(templateId) || [];
    list.push(response);
    this.responses.set(templateId, list);
    return response;
  }

  getResponses(templateId: string): FormResponse[] {
    return this.responses.get(templateId) || [];
  }

  getResponseCount(templateId: string): number {
    return (this.responses.get(templateId) || []).length;
  }
}

export const store = new DataStore();

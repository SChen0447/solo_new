import { FormTemplate, FormResponse } from '../shared/types';
import { v4 as uuidv4 } from 'uuid';

class DataStore {
  private templates: Map<string, FormTemplate> = new Map();
  private responses: Map<string, FormResponse[]> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    const q1RadioId = uuidv4();
    const q1OptBadId = uuidv4();
    const q2CheckId = uuidv4();
    const q3RatingId = uuidv4();
    const q4TextId = uuidv4();

    const sampleTemplate: FormTemplate = {
      id: uuidv4(),
      title: '用户满意度调查问卷',
      description: '感谢您抽出宝贵时间参与我们的满意度调查，您的反馈对我们非常重要！',
      questions: [
        {
          id: q1RadioId,
          type: 'radio',
          title: '您对我们产品的整体满意度如何？',
          required: true,
          options: [
            { id: uuidv4(), label: '非常满意' },
            { id: uuidv4(), label: '满意' },
            { id: uuidv4(), label: '一般' },
            { id: q1OptBadId, label: '不满意' },
            { id: uuidv4(), label: '非常不满意' },
          ],
        },
        {
          id: q4TextId,
          type: 'text',
          title: '请告诉我们不满意的原因，我们会努力改进：',
          required: true,
          placeholder: '请详细描述您遇到的问题...',
          condition: {
            questionId: q1RadioId,
            operator: 'equals',
            value: q1OptBadId,
          },
        },
        {
          id: q2CheckId,
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
          id: q3RatingId,
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
          [q1RadioId]: sampleTemplate.questions[0].options![0].id,
          [q2CheckId]: [
            sampleTemplate.questions[2].options![0].id,
            sampleTemplate.questions[2].options![2].id,
          ],
          [q3RatingId]: 5,
          [q4TextId]: '',
          [sampleTemplate.questions[4].id]: '产品非常好用，继续加油！',
        },
        submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: uuidv4(),
        templateId: sampleTemplate.id,
        answers: {
          [q1RadioId]: sampleTemplate.questions[0].options![1].id,
          [q2CheckId]: [
            sampleTemplate.questions[2].options![1].id,
            sampleTemplate.questions[2].options![3].id,
            sampleTemplate.questions[2].options![4].id,
          ],
          [q3RatingId]: 4,
          [q4TextId]: '',
          [sampleTemplate.questions[4].id]: '希望增加更多自定义功能。',
        },
        submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: uuidv4(),
        templateId: sampleTemplate.id,
        answers: {
          [q1RadioId]: q1OptBadId,
          [q2CheckId]: [sampleTemplate.questions[2].options![4].id],
          [q3RatingId]: 2,
          [q4TextId]: '客服响应速度太慢，希望能改进。',
          [sampleTemplate.questions[4].id]: '希望加强客服培训。',
        },
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: uuidv4(),
        templateId: sampleTemplate.id,
        answers: {
          [q1RadioId]: sampleTemplate.questions[0].options![0].id,
          [q2CheckId]: [
            sampleTemplate.questions[2].options![0].id,
            sampleTemplate.questions[2].options![1].id,
          ],
          [q3RatingId]: 5,
          [q4TextId]: '',
          [sampleTemplate.questions[4].id]: '整体体验很棒！',
        },
        submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: uuidv4(),
        templateId: sampleTemplate.id,
        answers: {
          [q1RadioId]: sampleTemplate.questions[0].options![2].id,
          [q2CheckId]: [
            sampleTemplate.questions[2].options![2].id,
            sampleTemplate.questions[2].options![3].id,
          ],
          [q3RatingId]: 3,
          [q4TextId]: '',
          [sampleTemplate.questions[4].id]: '',
        },
        submittedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
    ];
    this.responses.set(sampleTemplate.id, sampleResponses);

    const regQ1Id = uuidv4();
    const regQ1OptStudent = uuidv4();
    const regQ2Id = uuidv4();
    const regQ3Id = uuidv4();
    const regQ4Id = uuidv4();
    const regQ5Id = uuidv4();

    const registrationTemplate: FormTemplate = {
      id: uuidv4(),
      title: '活动报名登记表',
      description: '请填写以下信息完成活动报名，我们期待您的参与！',
      questions: [
        {
          id: regQ1Id,
          type: 'radio',
          title: '您的身份是？',
          required: true,
          options: [
            { id: regQ1OptStudent, label: '在校学生' },
            { id: uuidv4(), label: '职场人士' },
            { id: uuidv4(), label: '自由职业者' },
            { id: uuidv4(), label: '其他' },
          ],
        },
        {
          id: regQ2Id,
          type: 'text',
          title: '请输入您的学校名称：',
          required: true,
          placeholder: '例如：某某大学',
          condition: {
            questionId: regQ1Id,
            operator: 'equals',
            value: regQ1OptStudent,
          },
        },
        {
          id: regQ3Id,
          type: 'text',
          title: '您的姓名',
          required: true,
          placeholder: '请输入真实姓名',
        },
        {
          id: regQ4Id,
          type: 'dropdown',
          title: '您所在的城市',
          required: true,
          options: [
            { id: uuidv4(), label: '北京' },
            { id: uuidv4(), label: '上海' },
            { id: uuidv4(), label: '广州' },
            { id: uuidv4(), label: '深圳' },
            { id: uuidv4(), label: '杭州' },
            { id: uuidv4(), label: '成都' },
            { id: uuidv4(), label: '其他城市' },
          ],
        },
        {
          id: regQ5Id,
          type: 'date',
          title: '您期望的参与日期',
          required: false,
        },
        {
          id: uuidv4(),
          type: 'rating',
          title: '您对本次活动的期待程度',
          required: false,
          ratingMax: 5,
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    };
    this.templates.set(registrationTemplate.id, registrationTemplate);
    this.responses.set(registrationTemplate.id, [
      {
        id: uuidv4(),
        templateId: registrationTemplate.id,
        answers: {
          [regQ1Id]: regQ1OptStudent,
          [regQ2Id]: '清华大学',
          [regQ3Id]: '张三',
          [regQ4Id]: registrationTemplate.questions[3].options![0].id,
          [regQ5Id]: '2025-07-20',
          [registrationTemplate.questions[5].id]: 5,
        },
        submittedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      },
    ]);
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

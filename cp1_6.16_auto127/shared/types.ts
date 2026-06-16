export type PetType = 'cat' | 'dog';

export type QuestionnaireData = {
  petType: PetType;
  livingSpace: number;
  awayHours: number;
  hasOtherPets: boolean;
  exerciseFrequency: 'low' | 'medium' | 'high';
  dailySchedule: number;
  petExperience: 'none' | 'some' | 'experienced';
};

export type PetState = {
  hunger: number;
  energy: number;
  social: number;
  hygiene: number;
};

export type Task = {
  id: string;
  petId: string;
  name: string;
  icon: string;
  duration: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
};

export type Pet = {
  id: string;
  type: PetType;
  name: string;
  questionnaire: QuestionnaireData;
  state: PetState;
  createdAt: string;
};

export type WSMessage =
  | { type: 'state_update'; payload: PetState }
  | { type: 'task_new'; payload: Task }
  | { type: 'task_complete'; payload: Task };

export type DailyHistory = {
  date: string;
  tasks: Task[];
  completionRate: number;
};

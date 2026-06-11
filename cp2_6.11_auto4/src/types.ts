export interface Photo {
  id: number;
  url: string;
  title: string;
  category: 'landscape' | 'portrait' | 'street';
}

export type Category = 'all' | Photo['category'];

export interface CategoryInfo {
  key: Category;
  label: string;
}


export interface DailyLog {
  date: string; // ISO Date string YYYY-MM-DD
  completed: boolean;
  value?: number; // For quantitative habits
  note?: string;
  rating?: 1 | 2 | 3 | 4 | 5; // Qualitative rating
  timestamp?: string; // ISO String for exact time of completion
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  color: string; // Hex code or Tailwind color class mapping
  createdAt: string;
  logs: Record<string, DailyLog>; // Keyed by date string YYYY-MM-DD for O(1) access
  archived: boolean;
}

export type ViewState = 'dashboard' | 'settings' | 'analytics';

export type Language = 'en' | 'zh';
export type WeekStart = 'sunday' | 'monday';

export interface AppData {
  habits: Habit[];
  settings: {
    theme: 'light' | 'dark' | 'system';
    userName: string;
    language: Language;
    weekStart: WeekStart;
    splitMonths?: boolean;
  };
}

export const HABIT_COLORS = [
  { name: 'Emerald', value: '#10b981', tailwind: 'bg-emerald-500' },
  { name: 'Blue', value: '#3b82f6', tailwind: 'bg-blue-500' },
  { name: 'Violet', value: '#8b5cf6', tailwind: 'bg-violet-500' },
  { name: 'Rose', value: '#f43f5e', tailwind: 'bg-rose-500' },
  { name: 'Amber', value: '#f59e0b', tailwind: 'bg-amber-500' },
  { name: 'Cyan', value: '#06b6d4', tailwind: 'bg-cyan-500' },
];

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Check, MoreHorizontal, Activity } from 'lucide-react';
import { Habit, DailyLog, Language, WeekStart } from '../types';
import { Heatmap } from './Heatmap';
import { t } from '../utils/i18n';

interface HabitCardProps {
  habit: Habit;
  todayLog?: DailyLog;
  onToggleToday: (habitId: string) => void;
  onOpenDetail: (habit: Habit) => void;
  onDayClick: (habitId: string, date: Date) => void;
  lang: Language;
  weekStart: WeekStart;
}

export const HabitCard: React.FC<HabitCardProps> = ({ 
  habit, 
  todayLog, 
  onToggleToday, 
  onOpenDetail, 
  onDayClick,
  lang,
  weekStart
}) => {
  const isCompleted = todayLog?.completed;
  const [animate, setAnimate] = useState(false);

  // Trigger animation when completed state becomes true
  useEffect(() => {
    if (isCompleted) {
        setAnimate(true);
        const timer = setTimeout(() => setAnimate(false), 500);
        return () => clearTimeout(timer);
    }
  }, [isCompleted]);

  // Calculate generic stats
  const totalCompleted = Object.values(habit.logs).filter((l: DailyLog) => l.completed).length;

  const handleToggle = () => {
    onToggleToday(habit.id);
  };

  return (
    <div className="group relative bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-4 overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="cursor-pointer" onClick={() => onOpenDetail(habit)}>
          <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
            {habit.title}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            {totalCompleted} {t(lang, 'daysRecorded')}
          </p>
        </div>
        
        <button 
          onClick={() => onOpenDetail(habit)}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Heatmap Visualization */}
      <div className="w-full">
        <Heatmap 
          logs={habit.logs} 
          color={habit.color} 
          onClickDay={(date) => onDayClick(habit.id, date)}
          weekStart={weekStart}
          lang={lang}
        />
      </div>

      {/* Footer / Action */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
           <Activity size={14} />
           <span>{t(lang, 'frequency')}</span>
        </div>

        <button
          onClick={handleToggle}
          className={`
            relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 transform active:scale-95
            ${isCompleted 
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-zinc-500/20' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}
            ${animate ? 'animate-pop' : ''}
          `}
          style={{
            backgroundColor: isCompleted ? habit.color : undefined,
            color: isCompleted ? '#fff' : undefined
          }}
        >
          {isCompleted ? <Check size={16} strokeWidth={3} /> : <div className="w-4 h-4 rounded-full border-2 border-current opacity-40" />}
          {isCompleted ? t(lang, 'done') : t(lang, 'checkIn')}
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { format, isSameMonth } from 'date-fns';
import { Check } from 'lucide-react';
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
  splitMonths?: boolean;
}

export const HabitCard: React.FC<HabitCardProps> = ({ 
  habit, 
  todayLog, 
  onToggleToday, 
  onOpenDetail, 
  onDayClick,
  lang,
  weekStart,
  splitMonths = false
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

  // Calculate stats for current month
  const today = new Date();
  const currentMonthLogs = Object.values(habit.logs).filter((l: DailyLog) => {
    if (!l.completed) return false;
    const logDate = new Date(l.date);
    return isSameMonth(logDate, today);
  }).length;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail when clicking the button
    onToggleToday(habit.id);
  };

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-2 overflow-hidden">
      
      {/* Compact Header: Title Left (Indented to match Heatmap Grid), Check Button Right */}
      <div className="flex justify-between items-center gap-3">
        
        {/* Title Area - Clickable for details. pl-5 (1.25rem) aligns with w-3 (0.75rem) + gap-2 (0.5rem) of heatmap labels */}
        <div 
          className="cursor-pointer flex-1 min-w-0 pl-5" 
          onClick={() => onOpenDetail(habit)}
          title={t(lang, 'details')}
        >
          <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors truncate">
            {habit.title}
          </h3>
        </div>
        
        {/* Check-in Button - Pill Style */}
        <button
          onClick={handleToggle}
          className={`
            relative flex items-center justify-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 transform active:scale-95 flex-shrink-0 text-xs font-semibold shadow-sm
            ${isCompleted 
              ? 'text-white shadow-md shadow-zinc-500/20' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}
            ${animate ? 'animate-pop' : ''}
          `}
          style={{
            backgroundColor: isCompleted ? habit.color : undefined,
          }}
        >
           {isCompleted ? (
             <>
                <Check size={14} strokeWidth={3} />
                <span>{t(lang, 'done')}</span>
             </>
           ) : (
             <>
                <div className="w-3 h-3 rounded-full border-2 border-current opacity-40" />
                <span>{t(lang, 'checkIn')}</span>
             </>
           )}
        </button>
      </div>

      {/* Heatmap Visualization */}
      <div className="w-full pt-1">
        <Heatmap 
          logs={habit.logs} 
          color={habit.color} 
          onClickDay={(date) => onDayClick(habit.id, date)}
          weekStart={weekStart}
          splitMonths={splitMonths}
          lang={lang}
        />
      </div>

      {/* Footer Stats - Centered at bottom */}
      <div className="text-center">
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">
            {t(lang, 'daysThisMonth', { count: currentMonthLogs })}
        </p>
      </div>

    </div>
  );
};

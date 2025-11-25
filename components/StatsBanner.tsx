
import React, { useMemo } from 'react';
import { Trophy, Flame, Target, Zap, Quote, ChevronUp, ChevronDown } from 'lucide-react';
import { AppData, Language, DailyLog } from '../types';
import { t } from '../utils/i18n';
import { format } from 'date-fns';
import { getDailyQuote } from '../utils/quotes';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface StatsBannerProps {
  data: AppData;
  lang: Language;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ data, lang }) => {
  const [isCollapsed, setIsCollapsed] = useLocalStorage('stats_banner_collapsed', false);
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  
  const totalHabits = data.habits.filter(h => !h.archived).length;
  
  // Ensure all hooks are called unconditionally at the top level
  const quote = useMemo(() => getDailyQuote(), []); 

  const stats = useMemo(() => {
    if (totalHabits === 0) return { completedToday: 0, completionRate: 0, streak: 0 };

    // 1. Completion Rate
    const completedToday = data.habits.reduce((acc, habit) => {
      return acc + (habit.logs[todayKey]?.completed ? 1 : 0);
    }, 0);
    const completionRate = Math.round((completedToday / totalHabits) * 100);

    // 2. Global Streak Calculation
    const activityMap = new Set<string>();
    data.habits.forEach(habit => {
      Object.values(habit.logs).forEach((log: DailyLog) => {
        if (log.completed) {
          activityMap.add(log.date);
        }
      });
    });

    let streak = 0;
    const today = new Date();
    
    const isTodayDone = activityMap.has(todayKey);
    
    const subtractDay = (d: Date) => {
      const newDate = new Date(d);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    };

    let checkDate = isTodayDone ? today : subtractDay(today);
    
    if (!isTodayDone && !activityMap.has(format(checkDate, 'yyyy-MM-dd'))) {
        streak = 0;
    } else {
        while (true) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            if (activityMap.has(dateStr)) {
                streak++;
                checkDate = subtractDay(checkDate);
            } else {
                break;
            }
        }
    }

    return { completedToday, completionRate, streak };
  }, [data.habits, totalHabits, todayKey]);

  // Handle empty state here to ensure hooks are always called in the same order
  if (totalHabits === 0) return null;

  const { completedToday, completionRate, streak } = stats;
  const isAllDone = completionRate === 100;

  return (
    <div 
        className={`relative w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl mb-8 text-zinc-900 dark:text-zinc-50 shadow-sm transition-all duration-500 ease-in-out
        ${isCollapsed ? 'pt-[10px] pb-[8px] pl-[20px] pr-[10px]' : 'pt-6 px-6 pb-[10px]'}`}
    >
      
      {/* Expanded Content */}
      <div 
        className={`transition-[max-height,opacity,margin] duration-500 ease-in-out overflow-hidden 
        ${isCollapsed ? 'max-h-0 opacity-0 mb-0' : 'max-h-64 opacity-100 mb-6'}`}
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          
          <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
            <div className={`p-3 rounded-xl transition-colors flex-shrink-0 ${completedToday > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
              {isAllDone ? <Trophy size={28} /> : <Zap size={28} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight truncate">{t(lang, 'bannerTitle')}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm italic truncate flex items-center gap-1.5 opacity-80">
                 <Quote size={12} className="flex-shrink-0" />
                 {quote}
              </p>
            </div>
          </div>

          <div className="flex gap-3 md:gap-6 w-full md:w-auto">
            <div className="flex-1 md:flex-none p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center min-w-[90px]">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Target size={10} /> {t(lang, 'completionRate')}
              </span>
              <span className={`text-xl font-black ${isAllDone ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                {completionRate}%
              </span>
            </div>
            
            <div className="flex-1 md:flex-none p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center min-w-[90px]">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Flame size={10} /> {t(lang, 'streak')}
              </span>
              <span className="text-xl font-black text-zinc-900 dark:text-white">
                {streak} <span className="text-xs font-normal text-zinc-400 ml-0.5">{t(lang, 'daysUnit')}</span>
              </span>
            </div>
          </div>

        </div>
      </div>
      
      {/* Progress Bar & Controls Section */}
      <div className="w-full flex items-center">
         
         {/* Label: Today - hidden when expanded */}
         <div 
            className={`transition-all duration-500 ease-in-out overflow-hidden whitespace-nowrap
            ${isCollapsed ? 'max-w-[150px] opacity-100 mr-4' : 'max-w-0 opacity-0 mr-0'}`}
         >
             <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {t(lang, 'completionRate')}
             </span>
         </div>

         {/* Bar */}
         <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
                className={`h-full transition-all duration-1000 ease-out ${isAllDone ? 'bg-emerald-500' : 'bg-zinc-900 dark:bg-zinc-50'}`}
                style={{ width: `${completionRate}%` }}
            />
         </div>

         {/* Percentage - hidden when expanded */}
         <div 
            className={`transition-all duration-500 ease-in-out overflow-hidden whitespace-nowrap
            ${isCollapsed ? 'max-w-[80px] opacity-100 ml-4' : 'max-w-0 opacity-0 ml-0'}`}
         >
            <span className={`text-sm font-bold ${isAllDone ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                {completionRate}%
            </span>
         </div>

         {/* Toggle Button */}
         <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0"
            title={isCollapsed ? t(lang, 'more') : t(lang, 'less')}
         >
            {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
         </button>
      </div>

    </div>
  );
};

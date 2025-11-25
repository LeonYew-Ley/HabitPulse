
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { eachDayOfInterval, format, isSameDay, isSameMonth } from 'date-fns';
import { DailyLog, WeekStart, Language } from '../types';
import { t } from '../utils/i18n';

interface HeatmapProps {
  logs: Record<string, DailyLog>;
  color: string;
  onClickDay: (date: Date, log?: DailyLog) => void;
  interactive?: boolean;
  weekStart?: WeekStart;
  lang?: Language;
}

export const Heatmap: React.FC<HeatmapProps> = ({ 
  logs, 
  color, 
  onClickDay, 
  interactive = true, 
  weekStart = 'sunday',
  lang = 'en'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [showLeftFade, setShowLeftFade] = useState(true);
  const [showRightFade, setShowRightFade] = useState(false);
  
  // Stable "today" to prevent re-calculations during re-renders
  const today = useMemo(() => new Date(), []);
  
  // Calculate date range: Last 365 days roughly
  const endDate = today;
  
  // Calculate start date manually
  const startDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() - 364);
    return d;
  }, [today]);
  
  // 0 = Sunday, 1 = Monday
  const weekStartsOn = weekStart === 'monday' ? 1 : 0;
  
  // Calculate start of week manually
  const adjustedStartDate = useMemo(() => {
    const currentDay = startDate.getDay();
    const diff = (currentDay < weekStartsOn ? 7 : 0) + currentDay - weekStartsOn;
    
    const d = new Date(startDate);
    d.setDate(startDate.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [startDate, weekStartsOn]);

  // Generate all days
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: adjustedStartDate,
      end: endDate,
    });
  }, [adjustedStartDate, endDate]);

  // Group by weeks for the grid structure
  const weeks = useMemo(() => {
    const weeksArray: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });
    // Push partial week if exists
    if (currentWeek.length > 0) weeksArray.push(currentWeek);
    return weeksArray;
  }, [days]);

  // Handle Wheel Scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // If pure vertical scroll is detected, convert to horizontal
      if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Check scroll position for fades
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    
    // Show left fade if we are not at the start
    setShowLeftFade(scrollLeft > 0);
    // Show right fade if we are not at the end (with small tolerance)
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 2);
  };

  // Auto-scroll to end on mount only
  useEffect(() => {
    if (containerRef.current && weeks.length > 0 && !initializedRef.current) {
      // Force scroll to end
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
      initializedRef.current = true;
      // Trigger check immediately
      setTimeout(handleScroll, 50);
    }
  }, [weeks]);

  // Generate labels based on week start
  const dayLabels = weekStart === 'monday' 
    ? ['M', '', 'W', '', 'F', '', 'S'] 
    : ['', 'M', '', 'W', '', 'F', ''];

  return (
    <div className="flex gap-2 w-full">
      {/* Day Labels Column */}
      <div className="flex flex-col gap-[3px] text-[9px] text-zinc-400 font-medium pt-0 select-none">
        {dayLabels.map((label, i) => (
          <div key={i} className="h-2.5 sm:h-3 flex items-center justify-center w-3 leading-none">
            {label}
          </div>
        ))}
      </div>

      {/* Heatmap Grid Container */}
      <div className="relative flex-1 overflow-hidden group">
        
        {/* Left Fade Mask */}
        <div 
            className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${showLeftFade ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Right Fade Mask */}
        <div 
            className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${showRightFade ? 'opacity-100' : 'opacity-0'}`}
        />

        <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="flex flex-col gap-1 w-full overflow-x-auto pb-0 touch-pan-x overscroll-contain"
            style={{ 
                scrollbarWidth: 'none',  /* Firefox */
                msOverflowStyle: 'none'  /* IE and Edge */
            }}
        >
            <style>{`
                /* Hide scrollbar for Chrome, Safari and Opera */
                div::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

            <div className="flex gap-[3px] min-w-max pr-1">
            {weeks.map((week, wIndex) => {
                return (
                <div key={wIndex} className="flex flex-col gap-[3px]">
                    {week.map((day, dIndex) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const log = logs[dateKey];
                        const isToday = isSameDay(day, today);
                        
                        // Strict Month Visualization Logic
                        const monthIndex = day.getMonth();
                        const isEvenMonth = monthIndex % 2 === 0;

                        // Determine visual style
                        let bgClass = '';
                        let opacityStyle = 1;
                        let customBgColor = undefined;

                        if (log?.completed) {
                            customBgColor = color;
                            // Slight variation for history vs today
                            if (log.rating) {
                                opacityStyle = 0.4 + (log.rating / 10);
                            } else {
                                opacityStyle = 1;
                            }
                        } else {
                            // Empty State with Alternating Month Patterns
                            // Even Months: Standard lighter gray
                            // Odd Months: Slightly darker gray to create "blocks"
                            // Using tailored zinc shades for light/dark mode
                            bgClass = isEvenMonth 
                                ? 'bg-zinc-100 dark:bg-zinc-800/50' 
                                : 'bg-zinc-200 dark:bg-zinc-800';
                            
                            // Remove heavy opacity fade for past months so the pattern is visible
                            opacityStyle = 1; 
                        }
                        
                        return (
                        <div
                            key={dateKey}
                            onClick={() => interactive && onClickDay(day, log)}
                            className={`
                            w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm transition-all duration-200 flex-shrink-0
                            ${interactive ? 'cursor-pointer hover:scale-125 hover:z-10' : ''}
                            ${isToday ? 'ring-1 ring-offset-1 ring-offset-zinc-50 dark:ring-offset-zinc-900 ring-zinc-400 dark:ring-zinc-500' : ''}
                            ${!log?.completed ? bgClass : ''}
                            `}
                            style={{
                                backgroundColor: customBgColor,
                                opacity: opacityStyle,
                            }}
                            title={`${format(day, 'MMM d, yyyy')}${log?.completed ? ` - ${t(lang as Language, 'done')}` : ''}`}
                        />
                        );
                    })}
                </div>
            )})}
            </div>
        </div>
      </div>
    </div>
  );
};

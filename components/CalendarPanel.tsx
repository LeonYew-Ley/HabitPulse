import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isSameMonth, addMonths, subMonths, isAfter, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Habit, DailyLog, Language, WeekStart } from '../types';
import { t } from '../utils/i18n';

// 日期按钮组件，支持长按
interface DateButtonProps {
  day: Date;
  isCompleted: boolean;
  isInMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  isFuture: boolean;
  color: string;
  onDateClick: (date: Date) => void;
  onDateLongPress: (date: Date) => void;
}

const DateButton: React.FC<DateButtonProps> = ({
  day,
  isCompleted,
  isInMonth,
  isSelected,
  isToday,
  isFuture,
  color,
  onDateClick,
  onDateLongPress
}) => {
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressingRef = useRef(false);
  const hasCompletedLongPressRef = useRef(false);
  const longPressCompletedTimeRef = useRef<number>(0);
  const [isPressing, setIsPressing] = useState(false);

  const LONG_PRESS_DURATION = 800; // ms
  const LONG_PRESS_COOLDOWN = 100; // ms - 长按完成后的冷却时间，防止立即触发单击

  const startLongPress = () => {
    if (isFuture) return; // 未来日期不能长按
    
    isLongPressingRef.current = false;
    hasCompletedLongPressRef.current = false;
    longPressCompletedTimeRef.current = 0;
    setIsPressing(true);

    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressingRef.current = true;
      hasCompletedLongPressRef.current = true;
      longPressCompletedTimeRef.current = Date.now();
      onDateLongPress(day);
      cleanup();
    }, LONG_PRESS_DURATION);
  };

  const cleanup = () => {
    setIsPressing(false);
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isFuture) return;
    // 阻止默认行为，防止文本选择等
    e.preventDefault();
    startLongPress();
  };

  const handleMouseUp = (e?: React.MouseEvent) => {
    const wasLongPressCompleted = hasCompletedLongPressRef.current;
    const timeSinceLongPress = longPressCompletedTimeRef.current > 0 
      ? Date.now() - longPressCompletedTimeRef.current 
      : Infinity;
    
    cleanup();
    
    // 如果长按已经完成，或者在冷却时间内，不要触发单击，并且阻止事件传播
    if (wasLongPressCompleted || timeSinceLongPress < LONG_PRESS_COOLDOWN) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      // 延迟重置状态，确保冷却时间生效
      setTimeout(() => {
        isLongPressingRef.current = false;
        hasCompletedLongPressRef.current = false;
        longPressCompletedTimeRef.current = 0;
      }, LONG_PRESS_COOLDOWN);
      return;
    }
    
    // 如果没有完成长按，且不是未来日期，触发单击
    if (!isFuture) {
      onDateClick(day);
    }
    // 重置状态
    isLongPressingRef.current = false;
    hasCompletedLongPressRef.current = false;
    longPressCompletedTimeRef.current = 0;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isFuture) return;
    // 对于触摸事件，不调用 preventDefault，避免 passive listener 错误
    // 如果需要阻止默认行为，可以在事件处理中检查
    startLongPress();
  };

  const handleTouchEnd = (e?: React.TouchEvent) => {
    const wasLongPressCompleted = hasCompletedLongPressRef.current;
    const timeSinceLongPress = longPressCompletedTimeRef.current > 0 
      ? Date.now() - longPressCompletedTimeRef.current 
      : Infinity;
    
    cleanup();
    
    // 如果长按已经完成，或者在冷却时间内，不要触发单击，并且阻止事件传播
    if (wasLongPressCompleted || timeSinceLongPress < LONG_PRESS_COOLDOWN) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      // 延迟重置状态，确保冷却时间生效
      setTimeout(() => {
        isLongPressingRef.current = false;
        hasCompletedLongPressRef.current = false;
        longPressCompletedTimeRef.current = 0;
      }, LONG_PRESS_COOLDOWN);
      return;
    }
    
    // 如果没有完成长按，且不是未来日期，触发单击
    if (!isFuture) {
      onDateClick(day);
    }
    // 重置状态
    isLongPressingRef.current = false;
    hasCompletedLongPressRef.current = false;
    longPressCompletedTimeRef.current = 0;
  };

  // 清理函数
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return (
    <button
      onMouseDown={handleMouseDown}
      onMouseUp={(e) => handleMouseUp(e)}
      onMouseLeave={(e) => {
        // 如果长按已完成，不要触发任何操作
        if (hasCompletedLongPressRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        handleMouseUp(e);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={(e) => handleTouchEnd(e)}
      onTouchCancel={(e) => handleTouchEnd(e)}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        // 如果长按已完成，阻止单击事件
        if (hasCompletedLongPressRef.current || 
            (longPressCompletedTimeRef.current > 0 && 
             Date.now() - longPressCompletedTimeRef.current < LONG_PRESS_COOLDOWN)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      disabled={isFuture}
      className={`
        relative overflow-hidden aspect-square rounded-lg transition-all duration-200
        flex items-center justify-center
        text-sm font-medium select-none
        ${isFuture 
          ? 'opacity-40 cursor-not-allowed' 
          : 'cursor-pointer'
        }
        ${isInMonth 
          ? isFuture 
            ? 'text-zinc-400 dark:text-zinc-600' 
            : 'text-zinc-900 dark:text-zinc-100'
          : 'text-zinc-400 dark:text-zinc-600'
        }
        ${isSelected && !isFuture
          ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 dark:ring-offset-zinc-900' 
          : ''
        }
        ${isToday && !isSelected && !isFuture
          ? 'ring-1 ring-zinc-400 dark:ring-zinc-500'
          : ''
        }
        ${isCompleted && !isFuture
          ? 'bg-opacity-100 hover:opacity-80'
          : !isFuture
          ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          : 'bg-zinc-50 dark:bg-zinc-900'
        }
      `}
      style={{
        backgroundColor: isCompleted && !isFuture ? color : undefined,
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation', // 允许触摸操作，但禁用双击缩放
      }}
      title={format(day, 'yyyy-MM-dd')}
    >
      {/* 长按进度填充 */}
      {!isFuture && (
        <div 
          className="absolute inset-0 bg-zinc-900/20 dark:bg-zinc-100/20 pointer-events-none transition-all ease-linear"
          style={{ 
            width: isPressing ? '100%' : '0%', 
            transitionDuration: isPressing ? `${LONG_PRESS_DURATION}ms` : '0ms',
            opacity: 0.8
          }}
        />
      )}
      <span className="relative z-10">{format(day, 'd')}</span>
    </button>
  );
};

interface CalendarPanelProps {
  habit: Habit;
  selectedDate: Date;
  onDateClick: (date: Date) => void;
  onDateLongPress: (date: Date) => void;
  lang: Language;
  weekStart: WeekStart;
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({
  habit,
  selectedDate,
  onDateClick,
  onDateLongPress,
  lang,
  weekStart
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(selectedDate));
  const today = new Date();

  // 当选中日期改变时，如果不在当前月份，则切换到该月份
  useEffect(() => {
    const selectedMonth = startOfMonth(selectedDate);
    if (!isSameMonth(selectedMonth, currentMonth)) {
      setCurrentMonth(selectedMonth);
    }
  }, [selectedDate, currentMonth]);

  // 计算当前月份的所有日期
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: weekStart === 'monday' ? 1 : 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: weekStart === 'monday' ? 1 : 0 });

  const days = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  // 星期标签
  const weekDayLabels = useMemo(() => {
    if (lang === 'zh') {
      return weekStart === 'monday' 
        ? ['一', '二', '三', '四', '五', '六', '日']
        : ['日', '一', '二', '三', '四', '五', '六'];
    } else {
      return weekStart === 'monday'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }
  }, [lang, weekStart]);

  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };

  const getLogForDate = (date: Date): DailyLog | undefined => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return habit.logs[dateKey];
  };

  const isDateCompleted = (date: Date): boolean => {
    const log = getLogForDate(date);
    return log?.completed || false;
  };

  const isDateInCurrentMonth = (date: Date): boolean => {
    return isSameMonth(date, currentMonth);
  };

  const isDateSelected = (date: Date): boolean => {
    return isSameDay(date, selectedDate);
  };

  const isDateToday = (date: Date): boolean => {
    return isSameDay(date, today);
  };

  const isDateFuture = (date: Date): boolean => {
    return isAfter(startOfDay(date), startOfDay(today));
  };

  // 检查是否可以切换到下个月（不能切换到未来月份）
  const canGoNextMonth = useMemo(() => {
    const nextMonth = addMonths(currentMonth, 1);
    const nextMonthStart = startOfMonth(nextMonth);
    return !isAfter(startOfDay(nextMonthStart), startOfDay(today));
  }, [currentMonth, today]);

  // 月份标题
  const monthTitle = lang === 'zh' 
    ? format(currentMonth, 'yyyy年MM月')
    : format(currentMonth, 'MMMM yyyy');

  return (
    <div className="w-full">
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label={t(lang, 'previousMonth')}
        >
          <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
        </button>
        
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {monthTitle}
        </h3>
        
        <button
          onClick={handleNextMonth}
          disabled={!canGoNextMonth}
          className={`p-2 rounded-lg transition-colors ${
            canGoNextMonth 
              ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer' 
              : 'opacity-40 cursor-not-allowed'
          }`}
          aria-label={t(lang, 'nextMonth')}
        >
          <ChevronRight size={20} className="text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>

      {/* 星期标签 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDayLabels.map((label, index) => (
          <div
            key={index}
            className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isCompleted = isDateCompleted(day);
          const isInMonth = isDateInCurrentMonth(day);
          const isSelected = isDateSelected(day);
          const isToday = isDateToday(day);
          const isFuture = isDateFuture(day);

          return (
            <DateButton
              key={index}
              day={day}
              isCompleted={isCompleted}
              isInMonth={isInMonth}
              isSelected={isSelected}
              isToday={isToday}
              isFuture={isFuture}
              color={habit.color}
              onDateClick={onDateClick}
              onDateLongPress={onDateLongPress}
            />
          );
        })}
      </div>
    </div>
  );
};



import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Plus, LayoutGrid, Settings as SettingsIcon, Moon, Sun, Check, Trash2 } from 'lucide-react';

import { useLocalStorage } from './hooks/useLocalStorage';
import { AppData, Habit, HABIT_COLORS, ViewState, DailyLog, WeekStart } from './types';
import { HabitCard } from './components/HabitCard';
import { Modal } from './components/Modal';
import { SettingsView } from './components/SettingsView';
import { StatsBanner } from './components/StatsBanner';
import { CalendarPanel } from './components/CalendarPanel';
import { t } from './utils/i18n';
import { playCheckSound } from './utils/sound';

// Simple ID generator since we can't easily import uuid without package manager in this constraint
const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_DATA: AppData = {
  habits: [],
  settings: {
    theme: 'system',
    userName: 'User',
    language: 'zh',
    weekStart: 'monday',
    splitMonths: true,
  },
};

// --- Long Press Button Component ---
export interface LongPressButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onComplete: () => void;
  duration?: number; // ms
  children: React.ReactNode;
}

export const LongPressButton: React.FC<LongPressButtonProps> = ({ 
  onComplete, 
  duration = 3000, 
  children, 
  className, 
  onClick, // intercepted
  ...props 
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = (e: React.SyntheticEvent) => {
    // We don't prevent default here to allow scrolling on touch devices
    // unless it's a specific requirement. But we prevent context menu.
    setIsPressing(true);
    timeoutRef.current = setTimeout(() => {
      onComplete();
      setIsPressing(false);
    }, duration);
  };

  const cancel = () => {
    setIsPressing(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return (
    <button
      type="button"
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative overflow-hidden select-none ${className}`}
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      {...props}
    >
      {/* Progress Fill */}
      <div 
        className="absolute inset-0 bg-rose-200 dark:bg-rose-900/60 pointer-events-none transition-all ease-linear"
        style={{ 
          width: isPressing ? '100%' : '0%', 
          transitionDuration: isPressing ? `${duration}ms` : '0ms',
          opacity: 0.8
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </div>
    </button>
  );
};


function App() {
  // --- State ---
  const [data, setData] = useLocalStorage<AppData>('habitpulse_data', INITIAL_DATA);
  const [view, setView] = useState<ViewState>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  
  // Modal States
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedDayHabitId, setSelectedDayHabitId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date>(new Date());

  // Form States
  const [habitFormTitle, setHabitFormTitle] = useState('');
  const [habitFormColor, setHabitFormColor] = useState(HABIT_COLORS[0].value);
  const [logFormNote, setLogFormNote] = useState('');

  // FAB Drag State
  const [fabPos, setFabPos] = useState<{x: number, y: number} | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const lang = data.settings.language || 'zh';

  // --- Effects ---

  // Scroll handler for auto-hiding nav
  useEffect(() => {
    const handleScroll = () => {
        // Show nav if at top (within 10px), otherwise hide
        // This is only relevant for mobile where nav is fixed top
        const currentScrollY = window.scrollY;
        if (currentScrollY < 10) {
            setIsNavVisible(true);
        } else {
            setIsNavVisible(false);
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Theme handling
  useEffect(() => {
    const applyTheme = () => {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = 
            data.settings.theme === 'dark' || 
            (data.settings.theme === 'system' && isSystemDark);
        
        setIsDarkMode(isDark);
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    applyTheme();

    // Listen for system changes if mode is system
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
        if (data.settings.theme === 'system') {
            applyTheme();
        }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);

  }, [data.settings.theme]);

  // Ensure new settings fields exist on old data
  useEffect(() => {
    if (!data.settings.language || !data.settings.weekStart) {
        setData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                language: prev.settings.language || 'zh',
                weekStart: prev.settings.weekStart || 'sunday'
            }
        }));
    }
  }, []);

  // 同步月历面板选中日期的表单数据
  useEffect(() => {
    if (isCalendarModalOpen && selectedDayHabitId && calendarSelectedDate) {
      const habit = data.habits.find(h => h.id === selectedDayHabitId);
      if (habit) {
        const dateKey = format(calendarSelectedDate, 'yyyy-MM-dd');
        const log = habit.logs[dateKey];
        setLogFormNote(log?.note || '');
      }
    }
  }, [isCalendarModalOpen, selectedDayHabitId, calendarSelectedDate, data.habits]);

  // --- Actions ---

  const toggleTheme = () => {
    // Toggling manually switches out of system mode
    const newTheme = isDarkMode ? 'light' : 'dark';
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, theme: newTheme }
    }));
  };

  const updateSetting = (key: keyof AppData['settings'], value: any) => {
    setData(prev => ({
        ...prev,
        settings: { ...prev.settings, [key]: value }
    }));
  };

  const saveHabit = () => {
    if (!habitFormTitle.trim()) return;
    
    setData(prev => {
        let newHabits = [...prev.habits];
        
        if (editingHabit) {
            // Update existing
            newHabits = newHabits.map(h => 
                h.id === editingHabit.id 
                ? { ...h, title: habitFormTitle, color: habitFormColor }
                : h
            );
        } else {
            // Create new
            const newHabit: Habit = {
                id: generateId(),
                title: habitFormTitle,
                color: habitFormColor,
                createdAt: new Date().toISOString(),
                logs: {},
                archived: false
            };
            newHabits.push(newHabit);
        }
        return { ...prev, habits: newHabits };
    });
    
    closeHabitModal();
  };

  const deleteHabit = (id: string) => {
    setData(prev => ({
        ...prev,
        habits: prev.habits.filter(h => h.id !== id)
    }));
    closeHabitModal();
  }

  const toggleToday = (habitId: string) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const nowIso = new Date().toISOString();
    
    setData(prev => {
      const habits = prev.habits.map(h => {
        if (h.id !== habitId) return h;
        
        const isCompleted = !!h.logs[todayKey]?.completed;
        const newLogs = { ...h.logs };
        
        if (isCompleted) {
          // Toggle off: keep data but mark uncompleted
          if (newLogs[todayKey].note) {
              newLogs[todayKey].completed = false;
          } else {
              delete newLogs[todayKey];
          }
        } else {
          // Toggle On
          newLogs[todayKey] = {
            ...newLogs[todayKey],
            date: todayKey,
            completed: true,
            timestamp: nowIso
          };
          // Play sound
          playCheckSound();
        }
        
        return { ...h, logs: newLogs };
      });
      return { ...prev, habits };
    });
  };

  const saveLogDetails = () => {
    if (!selectedDayHabitId || !selectedDate) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');

    setData(prev => {
        const habits = prev.habits.map(h => {
            if (h.id !== selectedDayHabitId) return h;
            
            const existingLog: DailyLog = h.logs[dateKey] || { date: dateKey, completed: false };
            
            // If adding a note, we assume it implies completion or tracking
            const newLog: DailyLog = {
                ...existingLog,
                note: logFormNote,
                completed: existingLog.completed || true,
                timestamp: existingLog.timestamp || new Date().toISOString()
            };

            return {
                ...h,
                logs: { ...h.logs, [dateKey]: newLog }
            };
        });
        return { ...prev, habits };
    });
    closeLogModal();
  };

  const deleteLog = () => {
    if (!selectedDayHabitId || !selectedDate) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');

    setData(prev => {
        const habits = prev.habits.map(h => {
            if (h.id !== selectedDayHabitId) return h;
            const newLogs = { ...h.logs };
            // Using delete operator on the object key to remove it completely
            delete newLogs[dateKey]; 
            return { ...h, logs: newLogs };
        });
        return { ...prev, habits };
    });
    closeLogModal();
  };

  // --- Modals ---

  const openHabitModal = (habit?: Habit) => {
    if (habit) {
      setEditingHabit(habit);
      setHabitFormTitle(habit.title);
      setHabitFormColor(habit.color);
    } else {
      setEditingHabit(null);
      setHabitFormTitle('');
      setHabitFormColor(HABIT_COLORS[0].value);
    }
    setIsHabitModalOpen(true);
  };

  const closeHabitModal = () => {
    setIsHabitModalOpen(false);
    setEditingHabit(null);
  };

  const openLogModal = (habitId: string, date: Date) => {
    const habit = data.habits.find(h => h.id === habitId);
    if (!habit) return;

    const dateKey = format(date, 'yyyy-MM-dd');
    const log = habit.logs[dateKey];

    setSelectedDayHabitId(habitId);
    setSelectedDate(date);
    setLogFormNote(log?.note || '');
    setIsLogModalOpen(true);
  };

  const openCalendarModal = (habitId: string, date: Date) => {
    setSelectedDayHabitId(habitId);
    setCalendarSelectedDate(date);
    const habit = data.habits.find(h => h.id === habitId);
    if (!habit) return;
    const dateKey = format(date, 'yyyy-MM-dd');
    const log = habit.logs[dateKey];
    setLogFormNote(log?.note || '');
    setIsCalendarModalOpen(true);
  };

  const closeCalendarModal = () => {
    setIsCalendarModalOpen(false);
    // 保存当前选中日期的备注和评分
    if (selectedDayHabitId && calendarSelectedDate) {
      saveCalendarLogDetails();
    }
  };

  // 选中日期（单击）
  const selectDate = (date: Date) => {
    // 不能选择未来日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    if (dateToCheck > today) return;
    setCalendarSelectedDate(date);
  };

  // 快速打卡/取消打卡（长按）
  const toggleDateCompletion = (date: Date) => {
    if (!selectedDayHabitId) return;
    // 不能打卡未来日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    if (dateToCheck > today) return;
    
    const dateKey = format(date, 'yyyy-MM-dd');
    const nowIso = new Date().toISOString();
    
    // 先更新选中日期（这会触发月份自动切换）
    setCalendarSelectedDate(date);
    
    setData(prev => {
      const habits = prev.habits.map(h => {
        if (h.id !== selectedDayHabitId) return h;
        
        const isCompleted = !!h.logs[dateKey]?.completed;
        const newLogs = { ...h.logs };
        
        if (isCompleted) {
          // 取消打卡：如果有备注，保留但标记为未完成；否则删除
          if (newLogs[dateKey].note) {
            newLogs[dateKey].completed = false;
          } else {
            delete newLogs[dateKey];
          }
        } else {
          // 打卡：保留现有的备注
          newLogs[dateKey] = {
            ...newLogs[dateKey],
            date: dateKey,
            completed: true,
            timestamp: nowIso,
            note: newLogs[dateKey]?.note || logFormNote || undefined,
          };
          playCheckSound();
        }
        
        return { ...h, logs: newLogs };
      });
      return { ...prev, habits };
    });
  };

  // 保存月历面板中的备注
  const saveCalendarLogDetails = (note?: string) => {
    if (!selectedDayHabitId || !calendarSelectedDate) return;
    const dateKey = format(calendarSelectedDate, 'yyyy-MM-dd');
    const noteToSave = note !== undefined ? note : logFormNote;

    setData(prev => {
        const habits = prev.habits.map(h => {
            if (h.id !== selectedDayHabitId) return h;
            
            const existingLog: DailyLog = h.logs[dateKey] || { date: dateKey, completed: false };
            
            // 如果备注为空，且未完成，则不创建记录
            if (!noteToSave.trim() && !existingLog.completed) {
                return h;
            }
            
            const newLog: DailyLog = {
                ...existingLog,
                note: noteToSave.trim() || undefined,
                completed: existingLog.completed || noteToSave.trim().length > 0,
                timestamp: existingLog.timestamp || new Date().toISOString()
            };

            return {
                ...h,
                logs: { ...h.logs, [dateKey]: newLog }
            };
        });
        return { ...prev, habits };
    });
  };

  const closeLogModal = () => {
    setIsLogModalOpen(false);
    setSelectedDayHabitId(null);
    setSelectedDate(null);
  };

  // --- FAB Drag Logic ---
  const handleFabPointerDown = (e: React.PointerEvent) => {
    // Prevent default to stop scrolling/text selection on mobile
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    isDragging.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleFabPointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    
    // Threshold for drag detection
    isDragging.current = true;
    
    let x = e.clientX - dragOffset.current.x;
    let y = e.clientY - dragOffset.current.y;
    
    // Bounds checking
    const el = e.currentTarget as HTMLElement;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    
    // Use documentElement.clientXXX to exclude scrollbars if any
    const maxX = document.documentElement.clientWidth - width;
    const maxY = document.documentElement.clientHeight - height;

    // Clamp values
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));
    
    setFabPos({ x, y });
  };

  const handleFabPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
    
    if (!isDragging.current) {
        // If it wasn't a drag, treat as click
        if (view === 'dashboard') openHabitModal();
    }
    isDragging.current = false;
  };

  // --- Helper for Date Title ---
  const formatDateTitle = (date: Date | null) => {
    if (!date) return t(lang, 'details');
    
    // Default time is current time
    let timeStr = format(new Date(), 'HH:mm');
    
    if (selectedDayHabitId) {
       const habit = data.habits.find(h => h.id === selectedDayHabitId);
       const dateKey = format(date, 'yyyy-MM-dd');
       const log = habit?.logs[dateKey];
       
       // If record exists, use record time
       if (log?.timestamp) {
           timeStr = format(new Date(log.timestamp), 'HH:mm');
       }
    }

    if (lang === 'zh') {
        const ymd = format(date, 'yyyy/MM/dd');
        // Use Intl for localized weekday (e.g., "周二")
        const week = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date);
        return `${ymd} ${timeStr} ${week}`;
    }
    
    // Improved English display: Date + Time
    return `${format(date, 'EEEE, MMM do')} · ${timeStr}`;
  };

  // --- Render ---

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-zinc-200 dark:selection:bg-zinc-700">
      
      {/* Sidebar / Navigation 
          Updated logic: 
          - Mobile: Fixed at top. Translates Y to hide when not at top. 
          - Desktop: Sticky at left. md:translate-y-0 overrides the hiding logic.
      */}
      <nav 
        className={`
            w-full md:w-20 md:h-screen bg-white dark:bg-zinc-900 
            border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 
            flex md:flex-col items-center justify-between p-4 md:py-8 
            fixed md:sticky top-0 z-40
            transition-transform duration-300
            ${isNavVisible ? 'translate-y-0' : '-translate-y-full'} 
            md:translate-y-0
        `}
      >
        <div className="flex items-center gap-2 md:flex-col">
          <div className="w-10 h-10 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-zinc-500/10">
            H
          </div>
          <span className="md:hidden font-bold text-lg tracking-tight ml-2 dark:text-white">HabitPulse</span>
        </div>

        <div className="flex md:flex-col gap-6 items-center">
          <button 
            onClick={() => setView('dashboard')}
            className={`p-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
          >
            <LayoutGrid size={24} />
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`p-3 rounded-xl transition-all ${view === 'settings' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
          >
            <SettingsIcon size={24} />
          </button>
        </div>

        <div className="flex md:flex-col gap-4">
           <button 
            onClick={toggleTheme}
            className="p-3 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      {/* Updated padding: 
          - pt-24 (96px) for mobile to ensure gap between fixed nav (approx 80px) and banner.
          - md:pt-4 for desktop to reduce top spacing.
      */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 pt-24 md:pt-4 max-w-7xl mx-auto w-full">
        
        {/* Header Removed as requested */}

        {view === 'dashboard' && <StatsBanner data={data} lang={lang} />}

        {/* View Content */}
        {view === 'settings' ? (
          <SettingsView 
            data={data} 
            onImport={(newData) => {
                // Merge imported data with initial settings to ensure all fields exist
                const mergedData: AppData = {
                    ...newData,
                    settings: {
                        ...INITIAL_DATA.settings, // Defaults
                        ...newData.settings,      // Imported overrides defaults
                        // Explicitly ensure splitMonths is present if missing in imported data
                        splitMonths: newData.settings?.splitMonths ?? INITIAL_DATA.settings.splitMonths
                    }
                };
                setData(mergedData);
            }}
            onReset={() => setData(INITIAL_DATA)}
            onUpdateSetting={updateSetting}
          />
        ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 pb-20 relative">
            {data.habits.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center relative mt-2">
                    {/* Placeholder Card - Matching HabitCard dimensions more closely */}
                    <div className="w-full h-40 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <LayoutGrid size={24} className="mb-2 opacity-50"/>
                        <p className="text-sm font-medium">{t(lang, 'noHabits')}</p>
                    </div>
                </div>
            ) : (
                data.habits.map(habit => (
                    <HabitCard 
                        key={habit.id}
                        habit={habit}
                        todayLog={habit.logs[format(new Date(), 'yyyy-MM-dd')]}
                        onToggleToday={toggleToday}
                        onOpenDetail={openHabitModal}
                        onDayClick={(habitId, date) => openCalendarModal(habitId, date)}
                        lang={lang}
                        weekStart={data.settings.weekStart || 'sunday'}
                        splitMonths={data.settings.splitMonths ?? false}
                    />
                ))
            )}
            </div>
        )}
      </main>

      {/* Floating Action Button - Draggable */}
      {view === 'dashboard' && (
        <button 
            onPointerDown={handleFabPointerDown}
            onPointerMove={handleFabPointerMove}
            onPointerUp={handleFabPointerUp}
            style={fabPos 
                ? { left: fabPos.x, top: fabPos.y, bottom: 'auto', right: 'auto', touchAction: 'none' } 
                : { bottom: '2rem', right: '2rem', touchAction: 'none' }
            }
            className={`
                fixed z-50 shadow-2xl shadow-zinc-900/40 dark:shadow-black/50
                bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900
                transition-transform hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing
                flex items-center justify-center gap-2
                p-4 md:px-6 md:py-3 rounded-full
            `}
        >
            <Plus size={24} strokeWidth={2.5} />
            <span className="hidden md:inline font-bold tracking-tight text-sm">
                {t(lang, 'newHabit')}
            </span>
        </button>
      )}

      {/* Create/Edit Habit Modal */}
      <Modal 
        isOpen={isHabitModalOpen} 
        onClose={closeHabitModal}
        title={editingHabit ? t(lang, 'details') : t(lang, 'create')}
      >
        <div className="space-y-6">
            {/* View Stats if editing */}
            {editingHabit && (
                 <div className="mb-8 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-700">
                    <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">History</h4>
                    <div className="overflow-x-auto">
                            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {Object.values(editingHabit.logs).filter((l: DailyLog) => l.completed).length} <span className="text-base font-normal text-zinc-500">{t(lang, 'totalCompletions')}</span>
                            </div>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t(lang, 'habitName')}</label>
                <input 
                    type="text" 
                    value={habitFormTitle}
                    onChange={(e) => setHabitFormTitle(e.target.value)}
                    placeholder="e.g. Read for 20 mins"
                    className="w-full px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition-all dark:text-white"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">{t(lang, 'accentColor')}</label>
                <div className="flex flex-wrap gap-3">
                    {HABIT_COLORS.map(c => (
                        <button
                            key={c.name}
                            onClick={() => setHabitFormColor(c.value)}
                            className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${habitFormColor === c.value ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 dark:ring-offset-zinc-900 scale-110' : 'hover:scale-105'}`}
                            style={{ backgroundColor: c.value }}
                        >
                            {habitFormColor === c.value && <Check className="text-white drop-shadow-md" size={16} />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button 
                    onClick={saveHabit}
                    disabled={!habitFormTitle.trim()}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-opacity ${
                        !habitFormTitle.trim() 
                            ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-500 cursor-not-allowed' 
                            : 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90'
                    }`}
                >
                    {editingHabit ? t(lang, 'save') : t(lang, 'create')}
                </button>
                {editingHabit && (
                     <LongPressButton
                        onComplete={() => deleteHabit(editingHabit.id)}
                        className="px-4 py-3 rounded-lg text-rose-500 bg-rose-50/50 dark:bg-rose-900/10 hover:bg-rose-50 dark:hover:bg-rose-900/15 border-2 border-rose-400 dark:border-rose-400 transition-colors font-medium min-w-[120px] flex items-center justify-center"
                        duration={3000}
                     >
                        <Trash2 size={20} />
                     </LongPressButton>
                )}
            </div>
        </div>
      </Modal>

      {/* Log Details Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={closeLogModal}
        title={formatDateTitle(selectedDate)}
      >
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t(lang, 'notes')}</label>
                <textarea
                    rows={4}
                    value={logFormNote}
                    onChange={(e) => setLogFormNote(e.target.value)}
                    placeholder="..."
                    className="w-full px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition-all dark:text-white resize-none"
                />
            </div>

            <div className="pt-4 flex gap-3">
                <button
                    onClick={saveLogDetails}
                    disabled={!logFormNote.trim()}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-opacity ${
                        !logFormNote.trim()
                            ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-500 cursor-not-allowed' 
                            : 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90'
                    }`}
                >
                    {t(lang, 'saveLog')}
                </button>
                 {selectedDayHabitId && selectedDate && (
                     <LongPressButton
                        onComplete={deleteLog}
                        className="px-4 py-3 rounded-lg text-rose-400 bg-rose-50/50 dark:bg-rose-900/5 hover:bg-rose-50 dark:hover:bg-rose-900/15 border-2 border-rose-300 dark:border-rose-400 transition-colors font-medium min-w-[120px] flex items-center justify-center"
                        duration={3000}
                     >
                        <Trash2 size={20} />
                     </LongPressButton>
                )}
            </div>
        </div>
      </Modal>

      {/* Calendar Panel Modal */}
      <Modal
        isOpen={isCalendarModalOpen}
        onClose={closeCalendarModal}
        title={(() => {
          const habit = data.habits.find(h => h.id === selectedDayHabitId);
          if (!habit) return t(lang, 'details');
          return habit.title;
        })()}
      >
        {selectedDayHabitId && (() => {
          const habit = data.habits.find(h => h.id === selectedDayHabitId);
          if (!habit) return null;

          const dateKey = format(calendarSelectedDate, 'yyyy-MM-dd');
          const currentLog = habit.logs[dateKey];

          return (
            <div className="space-y-6">
              {/* 备注编辑区域 */}
              <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    {t(lang, 'notes')} ({format(calendarSelectedDate, lang === 'zh' ? 'yyyy/MM/dd' : 'MMM d, yyyy')})
                  </label>
                  <textarea
                    rows={3}
                    value={logFormNote}
                    onChange={(e) => setLogFormNote(e.target.value)}
                    onBlur={() => saveCalendarLogDetails(logFormNote)}
                    placeholder="..."
                    className="w-full px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition-all dark:text-white resize-none"
                  />
                </div>
              </div>

              {/* 月历面板 */}
              <CalendarPanel
                habit={habit}
                selectedDate={calendarSelectedDate}
                onDateClick={selectDate}
                onDateLongPress={toggleDateCompletion}
                lang={lang}
                weekStart={data.settings.weekStart || 'sunday'}
              />
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

export default App;


import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Plus, LayoutGrid, Settings as SettingsIcon, Moon, Sun, Check, Trash2 } from 'lucide-react';

import { useLocalStorage } from './hooks/useLocalStorage';
import { AppData, Habit, HABIT_COLORS, ViewState, DailyLog } from './types';
import { HabitCard } from './components/HabitCard';
import { Modal } from './components/Modal';
import { SettingsView } from './components/SettingsView';
import { StatsBanner } from './components/StatsBanner';
import { t } from './utils/i18n';
import { playCheckSound } from './utils/sound';

// Simple ID generator since we can't easily import uuid without package manager in this constraint
const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_DATA: AppData = {
  habits: [],
  settings: {
    theme: 'system',
    userName: 'User',
    language: 'en',
    weekStart: 'sunday',
  },
};

// --- Long Press Button Component ---
interface LongPressButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onComplete: () => void;
  duration?: number; // ms
  children: React.ReactNode;
}

const LongPressButton: React.FC<LongPressButtonProps> = ({ 
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
  
  // Modal States
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedDayHabitId, setSelectedDayHabitId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Form States
  const [habitFormTitle, setHabitFormTitle] = useState('');
  const [habitFormColor, setHabitFormColor] = useState(HABIT_COLORS[0].value);
  const [logFormNote, setLogFormNote] = useState('');
  const [logFormRating, setLogFormRating] = useState<number>(0);

  const lang = data.settings.language || 'en';

  // --- Effects ---

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
                language: prev.settings.language || 'en',
                weekStart: prev.settings.weekStart || 'sunday'
            }
        }));
    }
  }, []);

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
            
            // If adding a note/rating, we assume it implies completion or tracking
            const newLog: DailyLog = {
                ...existingLog,
                note: logFormNote,
                rating: logFormRating as any,
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
    setLogFormRating(log?.rating || 0);
    setIsLogModalOpen(true);
  };

  const closeLogModal = () => {
    setIsLogModalOpen(false);
    setSelectedDayHabitId(null);
    setSelectedDate(null);
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
      
      {/* Sidebar / Navigation */}
      <nav className="w-full md:w-20 md:h-screen bg-white dark:bg-zinc-900 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex md:flex-col items-center justify-between p-4 md:py-8 fixed md:sticky top-0 z-40">
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
      {/* Adjusted padding: pt-28 for mobile to account for fixed nav and provide spacing */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 pt-28 md:pt-8 max-w-7xl mx-auto w-full">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-10 animate-in fade-in duration-500">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {view === 'dashboard' ? t(lang, 'dashboard') : t(lang, 'settings')}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
               {view === 'dashboard' ? `${data.habits.length} ${t(lang, 'activeHabits')}` : t(lang, 'managePreferences')}
            </p>
          </div>
          
          {view === 'dashboard' && (
            <button 
              onClick={() => openHabitModal()}
              className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-5 py-3 rounded-xl font-semibold shadow-lg shadow-zinc-900/10 hover:translate-y-[-2px] hover:shadow-xl transition-all active:scale-95"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">{t(lang, 'newHabit')}</span>
            </button>
          )}
        </div>

        {view === 'dashboard' && <StatsBanner data={data} lang={lang} />}

        {/* View Content */}
        {view === 'settings' ? (
          <SettingsView 
            data={data} 
            onImport={(newData) => setData(newData)}
            onReset={() => setData(INITIAL_DATA)}
            onUpdateSetting={updateSetting}
          />
        ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
            {data.habits.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-zinc-400">
                    <LayoutGrid size={48} className="mb-4 opacity-50"/>
                    <p>{t(lang, 'noHabits')}</p>
                </div>
            ) : (
                data.habits.map(habit => (
                    <HabitCard 
                        key={habit.id}
                        habit={habit}
                        todayLog={habit.logs[format(new Date(), 'yyyy-MM-dd')]}
                        onToggleToday={toggleToday}
                        onOpenDetail={openHabitModal}
                        onDayClick={openLogModal}
                        lang={lang}
                        weekStart={data.settings.weekStart || 'sunday'}
                    />
                ))
            )}
            </div>
        )}
      </main>

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
                    className="flex-1 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                    {editingHabit ? t(lang, 'save') : t(lang, 'create')}
                </button>
                {editingHabit && (
                     <LongPressButton
                        onComplete={() => deleteHabit(editingHabit.id)}
                        className="px-4 py-3 rounded-lg text-rose-500 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors font-medium min-w-[120px]"
                        duration={3000}
                     >
                        {t(lang, 'holdToDelete')}
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
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t(lang, 'rating')}</label>
                <div className="flex justify-between gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    {[1, 2, 3, 4, 5].map(rating => (
                        <button
                            key={rating}
                            onClick={() => setLogFormRating(rating)}
                            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${logFormRating === rating ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            {rating}
                        </button>
                    ))}
                </div>
            </div>

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

            <div className="flex gap-3">
                <button 
                    onClick={saveLogDetails}
                    className="flex-1 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                    {t(lang, 'saveLog')}
                </button>
                
                <LongPressButton
                    onComplete={deleteLog}
                    className="px-4 py-3 rounded-lg border border-rose-200 bg-transparent text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors font-medium dark:border-rose-900"
                    title={t(lang, 'deleteLog')}
                    duration={3000}
                >
                    <Trash2 size={20} />
                </LongPressButton>
            </div>
        </div>
      </Modal>

    </div>
  );
}

export default App;

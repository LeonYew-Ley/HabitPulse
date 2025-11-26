
import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Calendar, Moon, Sun, Monitor, GalleryHorizontal } from 'lucide-react';
import { AppData, Language, WeekStart } from '../types';
import { t } from '../utils/i18n';
import { LongPressButton } from '../App';

interface SettingsViewProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onReset: () => void;
  onUpdateSetting: (key: keyof AppData['settings'], value: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ data, onImport, onReset, onUpdateSetting }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const lang = data.settings.language;

  const handleExport = () => {
    // Clean up data before export: remove deprecated fields (rating, color) from logs
    const cleanData = JSON.parse(JSON.stringify(data)); // Deep clone
    if (cleanData.habits) {
      cleanData.habits.forEach((habit: any) => {
        if (habit.logs) {
          Object.keys(habit.logs).forEach((dateKey) => {
            const log = habit.logs[dateKey];
            // Remove deprecated fields
            delete log.rating;
            delete log.color;
          });
        }
      });
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `habitpulse_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          if (event.target?.result) {
            const parsed = JSON.parse(event.target.result as string);
            // Basic validation
            if (parsed && Array.isArray(parsed.habits)) {
              onImport(parsed);
              setImportStatus('success');
              setTimeout(() => setImportStatus('idle'), 3000);
            } else {
              throw new Error("Invalid format");
            }
          }
        } catch (err) {
          setImportStatus('error');
          setTimeout(() => setImportStatus('idle'), 3000);
        }
      };
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold mb-1">{t(lang, 'settings')}</h2>
        <p className="text-zinc-500 text-sm mb-8">{t(lang, 'managePreferences')}</p>

        <div className="grid gap-6">

          {/* Language & Preferences */}
          <div className="space-y-4">
             {/* Language */}
             <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <Globe size={18} className="text-zinc-500"/>
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t(lang, 'language')}</h3>
                    </div>
                </div>
                <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded-lg p-1">
                    {(['en', 'zh'] as Language[]).map((l) => (
                        <button
                            key={l}
                            onClick={() => onUpdateSetting('language', l)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${data.settings.language === l ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                        >
                            {l === 'en' ? t(lang, 'english') : t(lang, 'chinese')}
                        </button>
                    ))}
                </div>
             </div>

             {/* Theme */}
             <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <Sun size={18} className="text-zinc-500"/>
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t(lang, 'theme')}</h3>
                    </div>
                </div>
                <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded-lg p-1">
                    {[
                      { value: 'light', label: t(lang, 'light'), icon: Sun },
                      { value: 'dark', label: t(lang, 'dark'), icon: Moon },
                      { value: 'system', label: t(lang, 'systemTheme'), icon: Monitor }
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => onUpdateSetting('theme', opt.value)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${data.settings.theme === opt.value ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                            title={opt.label}
                        >
                            <opt.icon size={12} className="hidden sm:block"/>
                            {opt.label}
                        </button>
                    ))}
                </div>
             </div>

             {/* Week Start */}
             <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-zinc-500"/>
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t(lang, 'weekStart')}</h3>
                    </div>
                </div>
                <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded-lg p-1">
                    {(['sunday', 'monday'] as WeekStart[]).map((w) => (
                        <button
                            key={w}
                            onClick={() => onUpdateSetting('weekStart', w)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${data.settings.weekStart === w ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                        >
                            {w === 'sunday' ? t(lang, 'sunday') : t(lang, 'monday')}
                        </button>
                    ))}
                </div>
             </div>

             {/* Split Months */}
             <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <GalleryHorizontal size={18} className="text-zinc-500"/>
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t(lang, 'splitMonths')}</h3>
                        <p className="text-xs text-zinc-500">{t(lang, 'splitMonthsDesc')}</p>
                    </div>
                </div>
                <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded-lg p-1">
                    <button
                        onClick={() => onUpdateSetting('splitMonths', false)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!data.settings.splitMonths ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                    >
                        {t(lang, 'disabled')}
                    </button>
                    <button
                        onClick={() => onUpdateSetting('splitMonths', true)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${data.settings.splitMonths ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                    >
                        {t(lang, 'enabled')}
                    </button>
                </div>
             </div>
          </div>

          <hr className="border-zinc-100 dark:border-zinc-800" />

          {/* Export */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t(lang, 'export')}</h3>
              <p className="text-xs text-zinc-500 mt-1">{t(lang, 'exportDesc')}</p>
            </div>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border-2 border-zinc-500 dark:border-zinc-500 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Download size={16} />
              {t(lang, 'exportBtn')}
            </button>
          </div>

          {/* Import */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
             <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t(lang, 'import')}</h3>
              <p className="text-xs text-zinc-500 mt-1">{t(lang, 'importDesc')}</p>
              {importStatus === 'success' && <p className="text-emerald-500 text-xs mt-1 flex items-center gap-1"><CheckCircle2 size={12}/> {t(lang, 'importSuccess')}</p>}
              {importStatus === 'error' && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1"><AlertTriangle size={12}/> {t(lang, 'importError')}</p>}
            </div>
            <div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json"
                onChange={handleImportFile}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border-2 border-zinc-500 dark:border-zinc-500 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Upload size={16} />
                {t(lang, 'importBtn')}
              </button>
            </div>
          </div>

           {/* Reset */}
           <div className="mt-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <LongPressButton
              onComplete={onReset}
              className="flex items-center gap-2 px-4 py-2 text-rose-500 bg-rose-50/50 dark:bg-rose-900/10 hover:bg-rose-50 dark:hover:bg-rose-900/15 border-2 border-rose-300 dark:border-rose-400 transition-colors font-medium w-full justify-center sm:w-auto rounded-lg text-sm"
              duration={3000}
            >
              <Trash2 size={16} />
              {t(lang, 'holdToReset')}
            </LongPressButton>
          </div>
        </div>
      </div>
    </div>
  );
};

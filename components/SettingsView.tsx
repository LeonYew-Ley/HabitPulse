
import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Calendar, Moon, Sun, Monitor, GalleryHorizontal, ChevronDown, ChevronRight, Cloud, RefreshCw, Server, Shield, Wifi } from 'lucide-react';
import { AppData, Language, WeekStart } from '../types';
import { t } from '../utils/i18n';
import { LongPressButton } from '../App';
import { createWebDavClient, testWebDavConnection, performBackup } from '../utils/webdav';

interface SettingsViewProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onReset: () => void;
  onUpdateSetting: (key: keyof AppData['settings'], value: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ data, onImport, onReset, onUpdateSetting }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [webDavStatus, setWebDavStatus] = useState<{ type: 'success' | 'error' | 'idle', msg: string }>({ type: 'idle', msg: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const lang = data.settings.language;

  const updateWebDav = (field: string, value: any) => {
    const currentWebDav = data.settings.webDav || {
      enabled: false,
      url: '',
      username: '',
      password: '',
      backupCount: 5,
      autoSync: false
    };
    onUpdateSetting('webDav', { ...currentWebDav, [field]: value });
  };

  const handleTestConnection = async () => {
    const { url, username, password, proxyUrl } = data.settings.webDav || {};
    if (!url || !username || !password) return;
    
    setWebDavStatus({ type: 'idle', msg: '' });
    setIsSyncing(true);
    const client = createWebDavClient(url, username, password, proxyUrl);
    const success = await testWebDavConnection(client);
    setIsSyncing(false);
    
    if (success) {
      setWebDavStatus({ type: 'success', msg: t(lang, 'connectionSuccess') });
    } else {
      setWebDavStatus({ type: 'error', msg: t(lang, 'connectionFailed') });
    }
    setTimeout(() => setWebDavStatus({ type: 'idle', msg: '' }), 3000);
  };

  const handleSyncNow = async () => {
    const { url, username, password, backupCount, proxyUrl } = data.settings.webDav || {};
    if (!url || !username || !password) return;

    setWebDavStatus({ type: 'idle', msg: '' });
    setIsSyncing(true);
    const client = createWebDavClient(url, username, password, proxyUrl);
    try {
      await performBackup(client, data, backupCount || 5);
      setWebDavStatus({ type: 'success', msg: t(lang, 'syncSuccess') });
    } catch (e) {
      console.error(e);
      setWebDavStatus({ type: 'error', msg: t(lang, 'syncFailed') });
    }
    setIsSyncing(false);
    setTimeout(() => setWebDavStatus({ type: 'idle', msg: '' }), 3000);
  };

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

          {/* Advanced Options */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
             <button 
               onClick={() => setShowAdvanced(!showAdvanced)}
               className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
             >
                <div className="flex items-center gap-3">
                    <Shield size={18} className="text-zinc-500"/>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t(lang, 'advancedOptions')}</h3>
                </div>
                {showAdvanced ? <ChevronDown size={16} className="text-zinc-400"/> : <ChevronRight size={16} className="text-zinc-400"/>}
             </button>
             
             {showAdvanced && (
               <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                 
                 {/* WebDAV Enable Toggle */}
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Cloud size={16} className="text-zinc-500"/>
                        <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">{t(lang, 'webDav')}</span>
                    </div>
                    <button
                        onClick={() => updateWebDav('enabled', !data.settings.webDav?.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${data.settings.webDav?.enabled ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${data.settings.webDav?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                 </div>
                 <p className="text-xs text-zinc-500 ml-6">{t(lang, 'webDavDesc')}</p>

                 {data.settings.webDav?.enabled && (
                    <div className="space-y-3 mt-4 ml-2 pl-4 border-l-2 border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                        {/* Server URL */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                                <Server size={12}/> {t(lang, 'serverUrl')}
                            </label>
                            <input 
                                type="text" 
                                value={data.settings.webDav?.url || ''}
                                onChange={(e) => updateWebDav('url', e.target.value)}
                                placeholder="https://dav.example.com/remote.php/webdav/"
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
                            />
                        </div>

                        {/* Proxy URL */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                                <Globe size={12}/> {t(lang, 'proxyUrl')}
                            </label>
                            <input 
                                type="text" 
                                value={data.settings.webDav?.proxyUrl || ''}
                                onChange={(e) => updateWebDav('proxyUrl', e.target.value)}
                                placeholder="https://your-worker.workers.dev"
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
                            />
                            <p className="text-[10px] text-zinc-400">{t(lang, 'proxyUrlDesc')}</p>
                        </div>

                        {/* Username */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                                <Shield size={12}/> {t(lang, 'username')}
                            </label>
                            <input 
                                type="text" 
                                value={data.settings.webDav?.username || ''}
                                onChange={(e) => updateWebDav('username', e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                                <Shield size={12}/> {t(lang, 'password')}
                            </label>
                            <input 
                                type="password" 
                                value={data.settings.webDav?.password || ''}
                                onChange={(e) => updateWebDav('password', e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            {/* Backup Count */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-500">{t(lang, 'backupCount')}</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    max="50"
                                    value={data.settings.webDav?.backupCount || 5}
                                    onChange={(e) => updateWebDav('backupCount', parseInt(e.target.value) || 5)}
                                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
                                />
                            </div>

                            {/* Auto Sync Toggle */}
                            <div className="space-y-1 flex flex-col justify-end pb-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-zinc-500">{t(lang, 'autoSync')}</label>
                                    <button
                                        onClick={() => updateWebDav('autoSync', !data.settings.webDav?.autoSync)}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${data.settings.webDav?.autoSync ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                                    >
                                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${data.settings.webDav?.autoSync ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-zinc-400">{t(lang, 'autoSyncDesc')}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2">
                            <button 
                                onClick={handleTestConnection}
                                disabled={isSyncing}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                            >
                                <Wifi size={14} />
                                {t(lang, 'testConnection')}
                            </button>
                            <button 
                                onClick={handleSyncNow}
                                disabled={isSyncing}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                                {t(lang, 'syncNow')}
                            </button>
                        </div>
                        
                        {/* Status Message */}
                        {webDavStatus.msg && (
                            <div className={`text-xs flex items-center gap-1.5 ${webDavStatus.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {webDavStatus.type === 'success' ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>}
                                {webDavStatus.msg}
                            </div>
                        )}
                    </div>
                 )}
               </div>
             )}
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

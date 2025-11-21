import React, { useState, useEffect } from 'react';
import { Car, FilePlus, ClipboardList, Wrench, Settings as SettingsIcon, Cloud, RefreshCw, Check, Flame, Moon, Sun } from 'lucide-react';
import { CarIntakeTab } from './components/CarIntakeTab';
import { DamageAssessmentTab } from './components/DamageAssessmentTab';
import { DashboardTab } from './components/DashboardTab';
import { ChatAssistant } from './components/ChatAssistant';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { Job, AppSettings } from './types';
import { syncWithFirebase } from './services/firebaseService';
import { v4 as uuidv4 } from 'uuid';

enum Tab {
  INTAKE = 'ingreso',
  DAMAGE = 'valoracion',
  DASHBOARD = 'historial'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.INTAKE);
  const [jobs, setJobs] = useState<Job[]>([]);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({});
  
  // Sync Status
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Load jobs and settings from local storage on mount
  useEffect(() => {
    const savedJobs = localStorage.getItem('taller_jobs');
    const savedSettings = localStorage.getItem('taller_settings');
    
    let initialJobs: Job[] = [];
    let initialSettings: AppSettings = {};

    if (savedJobs) {
      try {
        initialJobs = JSON.parse(savedJobs);
        setJobs(initialJobs);
      } catch (e) {
        console.error("Failed to parse jobs from storage");
      }
    }

    if (savedSettings) {
        try {
            initialSettings = JSON.parse(savedSettings);
            setSettings(initialSettings);
        } catch (e) {
            console.error("Failed to parse settings");
        }
    }

    // INITIAL DATABASE SYNC
    if (initialSettings.firebaseConfig) {
        setSyncStatus('syncing');
        syncWithFirebase(initialJobs, initialSettings)
            .then(mergedJobs => {
                setJobs(mergedJobs);
                setSyncStatus('synced');
                setTimeout(() => setSyncStatus('idle'), 3000);
            })
            .catch(err => {
                console.warn("Initial sync warning:", err.message);
                setSyncStatus('error');
            });
    }

  }, []);

  // Save jobs to local storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('taller_jobs', JSON.stringify(jobs));
    } catch (error) {
      console.error("Error saving to LocalStorage (probably quota exceeded):", error);
    }
  }, [jobs]);

  // Save settings to local storage
  useEffect(() => {
    try {
      localStorage.setItem('taller_settings', JSON.stringify(settings));
    } catch (error) {
       console.error("Error saving settings:", error);
    }
  }, [settings]);

  const performSync = async (currentJobs: Job[], currentSettings: AppSettings) => {
      if (!currentSettings.firebaseConfig) return;
      
      setSyncStatus('syncing');
      try {
          const merged = await syncWithFirebase(currentJobs, currentSettings);
          setJobs(merged);
          setSyncStatus('synced');
          setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (err) {
          console.error("Sync failed", err);
          setSyncStatus('error');
      }
  };

  const handleJobCreated = (newJob: Job) => {
    const updatedJobs = [newJob, ...jobs];
    setJobs(updatedJobs);
    addToast("Vehículo registrado correctamente", "success");
    performSync(updatedJobs, settings);
  };

  const handleUpdateJob = (jobId: string, updates: Partial<Job>) => {
    const updatedJobs = jobs.map(job => job.id === jobId ? { ...job, ...updates } : job);
    setJobs(updatedJobs);
    performSync(updatedJobs, settings);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      if (newSettings.firebaseConfig) {
          setSyncStatus('syncing');
          syncWithFirebase(jobs, newSettings)
            .then((merged) => {
                setJobs(merged);
                setSyncStatus('synced');
                addToast("Conectado y Sincronizado con Firebase", "success");
                setTimeout(() => setSyncStatus('idle'), 3000);
            })
            .catch(err => {
                setSyncStatus('error');
                addToast("Error de sincronización: " + err.message, "error");
            });
      } else {
          addToast("Configuración guardada localmente (Sin Nube)", "info");
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-300">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-blue-500 mr-3" />
              <span className="font-bold text-xl tracking-tight">TallerPro <span className="text-blue-400">AI</span></span>
            </div>
            <div className="flex items-center space-x-3">
                {/* Sync Status Indicator */}
                {settings.firebaseConfig && (
                    <div className="flex items-center mr-2 text-xs font-medium text-gray-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                        {syncStatus === 'syncing' && <><RefreshCw className="animate-spin w-3 h-3 mr-2 text-blue-400"/> Sync...</>}
                        {syncStatus === 'synced' && <><Check className="w-3 h-3 mr-2 text-green-400"/> Al día</>}
                        {syncStatus === 'error' && <><Flame className="w-3 h-3 mr-2 text-red-400"/> Error Sync</>}
                        {syncStatus === 'idle' && <><Flame className="w-3 h-3 mr-2 text-orange-500"/> Firebase ON</>}
                    </div>
                )}
                
                {/* Dark Mode Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-full hover:bg-slate-800 text-gray-300 hover:text-yellow-300 transition-colors"
                  title={darkMode ? "Modo Claro" : "Modo Oscuro"}
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 rounded-full hover:bg-slate-800 text-gray-300 hover:text-white transition-colors"
                    title="Configuración"
                >
                    <SettingsIcon size={20} />
                </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-800 shadow border-b border-gray-200 dark:border-slate-700 sticky top-16 z-30 transition-colors duration-300">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setActiveTab(Tab.INTAKE)}
            className={`flex-1 py-4 px-4 text-center font-medium text-sm flex items-center justify-center border-b-2 transition-colors ${
              activeTab === Tab.INTAKE 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-700/50' 
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            <FilePlus className="w-5 h-5 mr-2" />
            1. Ingreso Vehículo
          </button>
          <button
            onClick={() => setActiveTab(Tab.DAMAGE)}
            className={`flex-1 py-4 px-4 text-center font-medium text-sm flex items-center justify-center border-b-2 transition-colors ${
              activeTab === Tab.DAMAGE 
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-slate-700/50' 
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            <Car className="w-5 h-5 mr-2" />
            2. Valoración Daños
          </button>
          <button
            onClick={() => setActiveTab(Tab.DASHBOARD)}
            className={`flex-1 py-4 px-4 text-center font-medium text-sm flex items-center justify-center border-b-2 transition-colors ${
              activeTab === Tab.DASHBOARD 
                ? 'border-green-500 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-slate-700/50' 
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            <ClipboardList className="w-5 h-5 mr-2" />
            3. Historial
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === Tab.INTAKE && (
          <CarIntakeTab 
            onJobCreated={handleJobCreated} 
            switchToDamageTab={() => setActiveTab(Tab.DAMAGE)} 
          />
        )}
        
        {activeTab === Tab.DAMAGE && (
          <DamageAssessmentTab 
            activeJobs={jobs} 
            onUpdateJob={handleUpdateJob} 
            onShowToast={addToast}
          />
        )}

        {activeTab === Tab.DASHBOARD && (
          <DashboardTab jobs={jobs} onUpdateJob={handleUpdateJob} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 py-6 mt-auto transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 dark:text-slate-600 text-sm">
          &copy; 2025 TallerPro AI. Powered by Google Gemini & Firebase.
        </div>
      </footer>

      <ChatAssistant />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onShowToast={addToast}
      />
    </div>
  );
};

export default App;
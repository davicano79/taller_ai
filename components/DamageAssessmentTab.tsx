import React, { useState, useEffect } from 'react';
import { Job, JobStatus } from '../types';
import { ImageUploader } from './ImageUploader';
import { analyzeDamageFromImage } from '../services/geminiService';
import { Spinner } from './Spinner';
import { Save, AlertTriangle, Wrench, PaintBucket, Car } from 'lucide-react';
import { ToastType } from './Toast';

interface Props {
  activeJobs: Job[];
  onUpdateJob: (jobId: string, updates: Partial<Job>) => void;
  onShowToast: (msg: string, type: ToastType) => void;
}

export const DamageAssessmentTab: React.FC<Props> = ({ activeJobs, onUpdateJob, onShowToast }) => {
  // Filter for relevant jobs
  const intakeJobs = activeJobs.filter(j => j.status === JobStatus.INTAKE || j.status === JobStatus.ASSESSING);
  
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [detectedParts, setDetectedParts] = useState<string[]>([]);
  const [manualPart, setManualPart] = useState('');
  const [notes, setNotes] = useState('');
  const [repairType, setRepairType] = useState<'CHAPA' | 'PINTURA' | 'AMBOS'>('AMBOS');
  const [damageAssessment, setDamageAssessment] = useState<string>('');

  // Effect: Auto-select first job if selection is empty or invalid
  useEffect(() => {
    if (intakeJobs.length > 0) {
      const currentExists = intakeJobs.find(j => j.id === selectedJobId);
      if (!selectedJobId || !currentExists) {
        setSelectedJobId(intakeJobs[0].id);
      }
    }
  }, [intakeJobs, selectedJobId]);

  // Derived selected job
  const selectedJob = activeJobs.find(j => j.id === selectedJobId);

  // Effect: Sync local form state when selected job changes
  useEffect(() => {
    if (selectedJob) {
      setDetectedParts(selectedJob.identifiedParts || []);
      setNotes(selectedJob.manualNotes || '');
      setRepairType(selectedJob.repairType || 'AMBOS');
      setDamageAssessment(''); // Reset temp assessment on switch
    }
  }, [selectedJob?.id]); // Only run when the ID changes

  const handleImageUpload = async (base64: string) => {
    if (!selectedJobId) return;
    
    setLoading(true);
    try {
      const result = await analyzeDamageFromImage(base64);
      
      // Merge new parts with existing ones
      const newParts = [...new Set([...detectedParts, ...(result.detectedParts || [])])];
      setDetectedParts(newParts);
      setDamageAssessment(result.assessment || '');
      
      // Immediately save image and update status to ASSESSING
      onUpdateJob(selectedJobId, { 
        damageImages: [...(selectedJob?.damageImages || []), base64],
        status: JobStatus.ASSESSING,
        identifiedParts: newParts 
      });
      
      onShowToast("Daños analizados y piezas añadidas", "success");

    } catch (error) {
      onShowToast("Error analizando la imagen. Intenta nuevamente.", "error");
    } finally {
      setLoading(false);
    }
  };

  const addManualPart = () => {
    if (manualPart.trim()) {
      setDetectedParts(prev => [...prev, manualPart.trim()]);
      setManualPart('');
    }
  };

  const removePart = (part: string) => {
    setDetectedParts(prev => prev.filter(p => p !== part));
  };

  const saveWorkOrder = () => {
    if (!selectedJobId) return;
    
    onUpdateJob(selectedJobId, {
      identifiedParts: detectedParts,
      manualNotes: notes + (damageAssessment ? `\n[IA Evaluación]: ${damageAssessment}` : ''),
      repairType: repairType,
      status: JobStatus.IN_PROGRESS
    });
    
    onShowToast("Parte de Trabajo guardado. Vehículo en Proceso.", "success");
    
    // Optimistically move to next if available
    const remaining = intakeJobs.filter(j => j.id !== selectedJobId);
    if (remaining.length > 0) {
        setSelectedJobId(remaining[0].id);
    } else {
        setSelectedJobId('');
    }
  };

  if (intakeJobs.length === 0) {
    return (
      <div className="text-center p-10 bg-white dark:bg-slate-800 rounded-xl shadow-sm animate-fade-in transition-colors">
        <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No hay vehículos pendientes de valoración.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Registra un nuevo vehículo en la pestaña "Ingreso".</p>
      </div>
    );
  }

  if (!selectedJob) {
      return <div className="p-10 flex justify-center"><Spinner className="text-blue-600"/></div>;
  }

  return (
    <div className="max-w-6xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 animate-fade-in transition-colors">
      <div className="flex items-center justify-between mb-6">
         <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Valoración de Daños</h2>
         <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-bold uppercase tracking-wide">
            {selectedJob.status}
         </span>
      </div>

      <div className="mb-8 bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600">
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Vehículo Seleccionado</label>
        <select 
          value={selectedJobId} 
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm text-lg font-medium focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {intakeJobs.map(job => (
            <option key={job.id} value={job.id}>
              {job.carDetails?.plate} - {job.carDetails?.make} {job.carDetails?.model}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Images */}
        <div className="lg:col-span-5 space-y-6">
           
           {/* Intake Image (Context) */}
           <div className="bg-white dark:bg-slate-800 p-3 border dark:border-slate-600 rounded-lg shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Foto de Ingreso</h4>
                <div className="h-40 bg-gray-100 dark:bg-slate-700 rounded overflow-hidden flex items-center justify-center">
                    {selectedJob.intakeImage ? (
                        <img src={`data:image/jpeg;base64,${selectedJob.intakeImage}`} className="w-full h-full object-contain" alt="Ingreso" />
                    ) : (
                        <Car className="text-gray-300" />
                    )}
                </div>
           </div>

           {/* Damage Upload */}
           <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Nueva Foto de Daño</h4>
                <ImageUploader onImageSelected={handleImageUpload} label="Subir y Analizar (IA)" />
           </div>
           
           {loading && (
             <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex items-center justify-center animate-pulse">
                <Spinner className="text-blue-600 mr-3" />
                <span className="text-blue-800 dark:text-blue-300 text-sm font-medium">Analizando daños con Gemini...</span>
             </div>
           )}

           {/* Damage Gallery Preview */}
           {selectedJob.damageImages && selectedJob.damageImages.length > 0 && (
             <div>
                 <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Fotos Guardadas ({selectedJob.damageImages.length})</h4>
                 <div className="grid grid-cols-3 gap-2">
                    {selectedJob.damageImages.map((img, idx) => (
                        <img key={idx} src={`data:image/jpeg;base64,${img}`} className="w-full h-20 object-cover rounded border hover:opacity-75 transition-opacity cursor-pointer" alt="daño" />
                    ))}
                 </div>
             </div>
           )}
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-7">
            <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-xl border border-gray-200 dark:border-slate-700 h-full flex flex-col">
                <div className="flex items-center mb-4">
                    <Wrench className="text-gray-400 mr-2" size={20}/>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Definición del Trabajo</h3>
                </div>
                
                {/* Parts Input */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Piezas a Reparar</label>
                    <div className="flex space-x-2 mb-3">
                        <input 
                            type="text" 
                            value={manualPart}
                            onChange={(e) => setManualPart(e.target.value)}
                            placeholder="Ej: Parachoques, Aleta..."
                            className="flex-1 p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && addManualPart()}
                        />
                        <button onClick={addManualPart} className="bg-gray-800 dark:bg-slate-900 text-white px-4 rounded-lg hover:bg-black transition-colors font-medium">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg min-h-[60px] content-start">
                        {detectedParts.map((part, idx) => (
                            <span key={idx} className="inline-flex items-center bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-200 text-sm px-3 py-1 rounded-full shadow-sm animate-fade-in">
                                {part}
                                <button onClick={() => removePart(part)} className="ml-2 text-blue-400 hover:text-red-500 dark:hover:text-red-300 font-bold">&times;</button>
                            </span>
                        ))}
                        {detectedParts.length === 0 && <span className="text-gray-400 text-sm italic self-center">No hay piezas asignadas. Sube una foto o agrega manualmente.</span>}
                    </div>
                </div>

                {/* Repair Type */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Tipo de Intervención</label>
                    <div className="grid grid-cols-3 gap-3">
                        <button 
                            onClick={() => setRepairType('CHAPA')}
                            className={`py-3 px-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                repairType === 'CHAPA' 
                                ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200 ring-1 ring-orange-500' 
                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Wrench size={20} className="mb-1" /> <span className="text-xs font-bold">Chapa</span>
                        </button>
                        <button 
                            onClick={() => setRepairType('PINTURA')}
                            className={`py-3 px-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                repairType === 'PINTURA' 
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200 ring-1 ring-indigo-500' 
                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <PaintBucket size={20} className="mb-1" /> <span className="text-xs font-bold">Pintura</span>
                        </button>
                        <button 
                            onClick={() => setRepairType('AMBOS')}
                            className={`py-3 px-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                repairType === 'AMBOS' 
                                ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-200 ring-1 ring-green-500' 
                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <div className="flex space-x-1 mb-1"><Wrench size={16}/><PaintBucket size={16}/></div> <span className="text-xs font-bold">Ambos</span>
                        </button>
                    </div>
                </div>

                {/* Notes */}
                <div className="mb-6 flex-1">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Observaciones</label>
                    <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm h-32 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder="Detalles adicionales del trabajo..."
                    ></textarea>
                     {damageAssessment && (
                        <div className="mt-3 text-xs text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 p-3 rounded border border-blue-100 dark:border-blue-800 flex items-start">
                            <AlertTriangle size={14} className="mr-2 mt-0.5 flex-shrink-0"/>
                            <div>
                                <span className="font-bold">Sugerencia IA:</span> {damageAssessment}
                            </div>
                        </div>
                    )}
                </div>

                <button 
                    onClick={saveWorkOrder}
                    disabled={loading || detectedParts.length === 0}
                    className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center shadow-lg transition-all mt-auto
                        ${loading || detectedParts.length === 0 ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-1'}
                    `}
                >
                    <Save className="mr-2" /> Confirmar Parte de Trabajo
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
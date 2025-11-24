import React, { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { identifyCarFromImage } from '../services/geminiService';
import { CarDetails, Job, JobStatus } from '../types';
import { Spinner } from './Spinner';
import { ArrowRight, CheckCircle, Keyboard, RefreshCcw, Car, Camera } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onJobCreated: (job: Job) => void;
  switchToDamageTab: () => void;
}

export const CarIntakeTab: React.FC<Props> = ({ onJobCreated, switchToDamageTab }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [carDetails, setCarDetails] = useState<CarDetails | null>(null);

  const handleImageSelected = async (base64: string) => {
    setCurrentImage(base64);
    setLoading(true);
    setError(null);
    
    try {
      const details = await identifyCarFromImage(base64);
      setCarDetails(details);
    } catch (err: any) {
      console.error(err);
      // Show the actual error message to help debug "Safety" or "Quota" issues
      const msg = err.message || "Error desconocido";
      if (msg.includes("SAFETY")) {
        setError("La IA bloqueó la imagen por seguridad (posible matrícula visible). Intenta manual.");
      } else {
        setError(`No se pudo identificar: ${msg}. Ingresa datos manualmente.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    setCarDetails({
      plate: '',
      make: '',
      model: '',
      color: ''
    });
    // We reset current image so user can add one manually if they want, 
    // or we could keep the failed one if we wanted to be smarter, but standard is reset.
    setCurrentImage(null); 
    setError(null);
  };

  const handleManualPhoto = (base64: string) => {
    // Just set the image without running AI analysis
    setCurrentImage(base64);
    setError(null);
  };

  const resetForm = () => {
    setCarDetails(null);
    setCurrentImage(null);
    setError(null);
  };

  const createJob = () => {
    if (!carDetails) return;

    const newJob: Job = {
      id: uuidv4(),
      createdAt: Date.now(),
      status: JobStatus.INTAKE,
      carDetails: carDetails,
      intakeImage: currentImage || undefined, // Image is optional for manual entry
      identifiedParts: [],
      damageImages: [],
      manualNotes: '',
      repairType: 'CHAPA' // Default
    };

    onJobCreated(newJob);
    switchToDamageTab();
  };

  const isFormValid = carDetails && carDetails.plate && carDetails.make && carDetails.model;

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Nuevo Ingreso</h2>
        {carDetails && (
          <button 
            onClick={resetForm}
            className="text-sm text-gray-500 hover:text-red-600 flex items-center transition-colors"
          >
            <RefreshCcw size={14} className="mr-1" /> Reiniciar
          </button>
        )}
      </div>

      {/* INITIAL STATE: Show Upload or Manual Option */}
      {!carDetails && !loading && (
        <div className="animate-fade-in">
          <p className="text-gray-600 dark:text-gray-300 mb-6">Toma una foto de la parte trasera para identificación automática con IA, o ingresa los datos manualmente.</p>

          <div className="mb-8">
            <ImageUploader onImageSelected={handleImageSelected} label="Foto Trasera (Identificación IA)" />
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-slate-600"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">O también puedes</span>
            <div className="flex-grow border-t border-gray-200 dark:border-slate-600"></div>
          </div>

          <div className="mt-6 flex justify-center">
            <button 
              onClick={handleManualEntry}
              className="flex items-center px-6 py-3 bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-white rounded-full font-semibold hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm hover:shadow-md"
            >
              <Keyboard className="mr-2 h-5 w-5" />
              Ingresar Datos Manualmente
            </button>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 bg-blue-50 dark:bg-slate-700 rounded-lg animate-fade-in">
          <Spinner className="text-blue-600 w-8 h-8 mb-4" />
          <span className="text-blue-700 dark:text-blue-300 font-medium text-lg">Gemini está analizando el vehículo...</span>
          <p className="text-blue-400 dark:text-blue-200 text-sm mt-2">Identificando matrícula, marca y modelo</p>
        </div>
      )}

      {/* ERROR STATE */}
      {error && !carDetails && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg mb-4 border border-red-200 dark:border-red-800 animate-fade-in flex justify-between items-center">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="font-bold hover:underline text-sm ml-3 shrink-0">OK</button>
        </div>
      )}

      {/* FORM STATE (Result of AI or Manual) */}
      {carDetails && !loading && (
        <div className="animate-fade-in-up">
          
          {/* Photo / Status Banner */}
          {currentImage ? (
             <div className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-4 mb-6 flex items-center">
                <div className="h-16 w-24 mr-4 rounded overflow-hidden border border-gray-300 dark:border-slate-500 flex-shrink-0 bg-black">
                    <img src={`data:image/jpeg;base64,${currentImage}`} className="w-full h-full object-cover" alt="Ingreso" />
                </div>
                <div>
                    <div className="flex items-center">
                        <CheckCircle className="text-green-600 dark:text-green-400 mr-2 h-5 w-5" />
                        <h3 className="text-lg font-bold text-green-800 dark:text-green-300">
                           Foto Registrada
                        </h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-300">La imagen se guardará con el ingreso.</p>
                </div>
             </div>
          ) : (
             <div className="mb-6 p-4 bg-blue-50 dark:bg-slate-700/50 rounded-lg border border-blue-100 dark:border-slate-600">
                <div className="flex items-center mb-3">
                    <Camera className="text-blue-500 mr-2" size={20} />
                    <span className="text-sm font-bold text-blue-800 dark:text-blue-200">¿Falta la foto? Adjúntala aquí (Opcional)</span>
                </div>
                <ImageUploader onImageSelected={handleManualPhoto} label="Tomar Foto Manualmente" />
             </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Matrícula</label>
              <input 
                type="text" 
                value={carDetails.plate} 
                onChange={(e) => setCarDetails({...carDetails, plate: e.target.value})}
                placeholder="0000 XXX"
                className="w-full text-2xl font-mono font-bold bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 rounded-lg p-3 border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Color</label>
              <input 
                type="text" 
                value={carDetails.color || ''} 
                onChange={(e) => setCarDetails({...carDetails, color: e.target.value})}
                placeholder="Ej: Rojo, Blanco..."
                className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 rounded-lg p-3 border font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Marca</label>
              <input 
                type="text" 
                value={carDetails.make} 
                onChange={(e) => setCarDetails({...carDetails, make: e.target.value})}
                placeholder="Ej: Toyota"
                className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 rounded-lg p-3 border font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Modelo</label>
              <input 
                type="text" 
                value={carDetails.model} 
                onChange={(e) => setCarDetails({...carDetails, model: e.target.value})}
                placeholder="Ej: Corolla"
                className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 rounded-lg p-3 border font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button 
                onClick={resetForm}
                className="flex-1 py-3 px-4 rounded-lg font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={createJob}
                disabled={!isFormValid}
                className={`flex-[2] flex items-center justify-center py-3 px-4 rounded-lg font-semibold text-white transition-all shadow-lg
                    ${isFormValid 
                        ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-0.5' 
                        : 'bg-gray-400 cursor-not-allowed opacity-70'
                    }
                `}
            >
                Confirmar y Pasar a Valoración
                <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
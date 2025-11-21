import React, { useState, useEffect, useRef } from 'react';
import { Job, JobStatus } from '../types';
import { X, Save, Trash2, Plus, Image as ImageIcon, PenTool, Wrench, PaintBucket, RotateCw, Check, RotateCcw, Camera, FileText } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { generateJobPDF } from '../services/pdfService';

interface Props {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Job>) => void;
}

// --- Internal Image Editor Component ---
interface ImageEditorProps {
  base64Image: string;
  onSave: (newBase64: string) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ base64Image, onSave, onCancel }) => {
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);

  const handleRotate = (degrees: number) => {
    setRotation(prev => (prev + degrees) % 360);
  };

  const handleSave = async () => {
    setProcessing(true);
    try {
      const result = await processImage(base64Image, rotation);
      onSave(result);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const processImage = (base64: string, rotationDeg: number): Promise<string> => {
    return new Promise((resolve) => {
      if (rotationDeg === 0) return resolve(base64);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Calculate new dimensions
        if (Math.abs(rotationDeg) % 180 !== 0) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64);

        // Fill white background (prevent transparent corners if rotating)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationDeg * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Remove prefix if present in base64 return
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl.split(',')[1]);
      };
      img.src = `data:image/jpeg;base64,${base64}`;
    });
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col animate-fade-in">
      <div className="p-4 flex justify-between items-center bg-slate-800 text-white shrink-0">
        <h3 className="font-bold flex items-center"><PenTool size={18} className="mr-2"/> Editar Imagen</h3>
        <button onClick={onCancel} className="p-1 hover:bg-slate-700 rounded-full"><X/></button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-black relative">
        <img 
          src={`data:image/jpeg;base64,${base64Image}`} 
          className="max-w-full max-h-full object-contain transition-transform duration-300"
          style={{ transform: `rotate(${rotation}deg)` }}
          alt="Editing"
        />
      </div>

      <div className="p-4 bg-slate-800 shrink-0 flex justify-center space-x-4">
        <button 
            onClick={() => handleRotate(-90)}
            className="p-3 bg-slate-700 text-white rounded-full hover:bg-slate-600 transition-colors"
            title="Rotar Izquierda"
        >
            <RotateCcw size={24} />
        </button>
        <button 
            onClick={() => handleRotate(90)}
            className="p-3 bg-slate-700 text-white rounded-full hover:bg-slate-600 transition-colors"
            title="Rotar Derecha"
        >
            <RotateCw size={24} />
        </button>
        <div className="w-8"></div> {/* Spacer */}
        <button 
            onClick={handleSave}
            disabled={processing}
            className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-500 flex items-center disabled:opacity-50"
        >
            {processing ? 'Procesando...' : <><Check size={20} className="mr-2"/> Guardar</>}
        </button>
      </div>
    </div>
  );
};

// --- Main Modal Component ---

export const JobDetailsModal: React.FC<Props> = ({ job, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Job | null>(null);
  const [newPart, setNewPart] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'photos'>('details');
  
  // Editing State
  const [editingPhoto, setEditingPhoto] = useState<{ index: number, type: 'intake' | 'damage' } | null>(null);

  useEffect(() => {
    if (job) {
      setFormData({ ...job });
      setActiveTab('details'); // Reset tab on open
      setEditingPhoto(null);
    }
  }, [job]);

  if (!isOpen || !formData) return null;

  const handleSave = () => {
    onSave(formData.id, formData);
    onClose();
  };

  const handleExportPDF = () => {
    if (formData) {
      generateJobPDF(formData);
    }
  };

  const handleChange = (field: keyof Job, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleCarChange = (field: string, value: string) => {
    setFormData(prev => prev ? {
      ...prev,
      carDetails: { ...prev.carDetails!, [field]: value }
    } : null);
  };

  const addPart = () => {
    if (newPart.trim()) {
      setFormData(prev => prev ? {
        ...prev,
        identifiedParts: [...(prev.identifiedParts || []), newPart.trim()]
      } : null);
      setNewPart('');
    }
  };

  const removePart = (partToRemove: string) => {
    setFormData(prev => prev ? {
      ...prev,
      identifiedParts: prev.identifiedParts.filter(p => p !== partToRemove)
    } : null);
  };

  // Image Actions
  const deleteDamageImage = (index: number) => {
    if (!confirm('¿Estás seguro de eliminar esta foto?')) return;
    setFormData(prev => {
      if (!prev) return null;
      const newImages = [...(prev.damageImages || [])];
      newImages.splice(index, 1);
      return { ...prev, damageImages: newImages };
    });
  };

  const saveEditedImage = (newBase64: string) => {
    if (!editingPhoto || !formData) return;
    
    if (editingPhoto.type === 'intake') {
      setFormData({ ...formData, intakeImage: newBase64 });
    } else {
      const newImages = [...(formData.damageImages || [])];
      newImages[editingPhoto.index] = newBase64;
      setFormData({ ...formData, damageImages: newImages });
    }
    setEditingPhoto(null);
  };

  const handleAddDamageImage = (base64: string) => {
    setFormData(prev => prev ? {
      ...prev,
      damageImages: [...(prev.damageImages || []), base64]
    } : null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative transition-colors">
        
        {/* Image Editor Overlay */}
        {editingPhoto && formData && (
            <ImageEditor 
                base64Image={editingPhoto.type === 'intake' 
                    ? (formData.intakeImage || '') 
                    : (formData.damageImages?.[editingPhoto.index] || '')
                }
                onCancel={() => setEditingPhoto(null)}
                onSave={saveEditedImage}
            />
        )}

        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold flex items-center">
            <PenTool className="mr-2" size={20} />
            Ficha de Trabajo
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-slate-800 p-1 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
          <button 
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 font-medium text-sm flex items-center justify-center ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-slate-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            <Wrench size={16} className="mr-2" /> Detalles y Piezas
          </button>
          <button 
            onClick={() => setActiveTab('photos')}
            className={`flex-1 py-3 font-medium text-sm flex items-center justify-center ${activeTab === 'photos' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-slate-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            <ImageIcon size={16} className="mr-2" /> Galería de Daños
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-900/50">
          
          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Status & Type Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700 shadow-sm">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Estado del Trabajo</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full p-2 border dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.values(JobStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700 shadow-sm">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Tipo de Reparación</label>
                  <div className="flex space-x-2">
                    {['CHAPA', 'PINTURA', 'AMBOS'].map((type) => (
                      <button
                        key={type}
                        onClick={() => handleChange('repairType', type)}
                        className={`flex-1 py-1 px-2 text-xs font-bold rounded border transition-colors ${
                          formData.repairType === type 
                          ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-500' 
                          : 'bg-white border-gray-200 text-gray-600 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Car Details */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 border-b dark:border-slate-700 pb-2">Datos del Vehículo</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Matrícula</label>
                    <input 
                      value={formData.carDetails?.plate || ''}
                      onChange={(e) => handleCarChange('plate', e.target.value)}
                      className="w-full p-2 border dark:border-slate-600 rounded mt-1 font-mono font-bold bg-white dark:bg-slate-700 text-gray-900 dark:text-white uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Marca</label>
                    <input 
                      value={formData.carDetails?.make || ''}
                      onChange={(e) => handleCarChange('make', e.target.value)}
                      className="w-full p-2 border dark:border-slate-600 rounded mt-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Modelo</label>
                    <input 
                      value={formData.carDetails?.model || ''}
                      onChange={(e) => handleCarChange('model', e.target.value)}
                      className="w-full p-2 border dark:border-slate-600 rounded mt-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Color</label>
                    <input 
                      value={formData.carDetails?.color || ''}
                      onChange={(e) => handleCarChange('color', e.target.value)}
                      className="w-full p-2 border dark:border-slate-600 rounded mt-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Parts */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 border-b dark:border-slate-700 pb-2">Piezas a Reparar (Daños)</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.identifiedParts.map((part, idx) => (
                    <span key={idx} className="inline-flex items-center bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm px-3 py-1 rounded-full">
                      {part}
                      <button onClick={() => removePart(part)} className="ml-2 text-red-400 hover:text-red-500 dark:hover:text-red-300"><X size={14}/></button>
                    </span>
                  ))}
                  {formData.identifiedParts.length === 0 && <span className="text-gray-400 italic text-sm">No hay piezas registradas.</span>}
                </div>
                <div className="flex mt-4">
                  <input 
                    type="text"
                    value={newPart}
                    onChange={(e) => setNewPart(e.target.value)}
                    placeholder="Añadir pieza/daño manualmente..."
                    className="flex-1 p-2 border dark:border-slate-600 rounded-l text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
                    onKeyDown={(e) => e.key === 'Enter' && addPart()}
                  />
                  <button onClick={addPart} className="bg-blue-600 text-white px-4 rounded-r hover:bg-blue-700 flex items-center">
                    <Plus size={16} className="mr-1"/> Añadir
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Escribe el nombre de la pieza o daño y presiona Enter o Añadir.</p>
              </div>

              {/* Notes */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 border-b dark:border-slate-700 pb-2">Observaciones</h3>
                <textarea 
                  value={formData.manualNotes}
                  onChange={(e) => handleChange('manualNotes', e.target.value)}
                  className="w-full p-3 border dark:border-slate-600 rounded h-32 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notas adicionales sobre la reparación..."
                />
              </div>
            </div>
          )}

          {/* PHOTOS TAB */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              {/* Intake Photo */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <span className="bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                  Foto de Ingreso (Identificación)
                </h3>
                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border dark:border-slate-700 shadow-sm inline-block relative group">
                  {formData.intakeImage ? (
                    <>
                        <img 
                        src={`data:image/jpeg;base64,${formData.intakeImage}`} 
                        className="h-64 object-contain rounded bg-black"
                        alt="Ingreso"
                        />
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => setEditingPhoto({ index: 0, type: 'intake' })}
                                className="bg-white p-2 rounded-full shadow text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                                title="Editar Imagen"
                            >
                                <PenTool size={16} />
                            </button>
                        </div>
                    </>
                  ) : (
                    <div className="h-32 w-32 bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400 text-xs">Sin foto</div>
                  )}
                </div>
              </div>

              {/* Damage Photos */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <span className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                  Fotos de Daños y Piezas
                </h3>
                
                {/* Upload New Photo Area */}
                <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-2 uppercase">Agregar Nueva Foto de Daño</h4>
                    <ImageUploader onImageSelected={handleAddDamageImage} label="Subir Foto" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.damageImages && formData.damageImages.length > 0 ? (
                    formData.damageImages.map((img, idx) => (
                      <div key={idx} className="relative group bg-white dark:bg-slate-800 p-2 rounded-lg border dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className="aspect-video rounded bg-gray-100 dark:bg-slate-700 overflow-hidden relative">
                            <img 
                            src={`data:image/jpeg;base64,${img}`} 
                            className="w-full h-full object-cover"
                            alt={`Daño ${idx + 1}`}
                            />
                        </div>
                        
                        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => setEditingPhoto({ index: idx, type: 'damage' })}
                                className="bg-white p-2 rounded-full shadow text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                                title="Editar Imagen"
                            >
                                <PenTool size={14} />
                            </button>
                            <button 
                                onClick={() => deleteDamageImage(idx)}
                                className="bg-white p-2 rounded-full shadow text-gray-700 hover:text-red-600 hover:bg-red-50"
                                title="Eliminar Imagen"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="mt-2 flex justify-between items-center">
                           <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Foto {idx + 1}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 italic text-sm p-4 bg-gray-100 dark:bg-slate-700 rounded col-span-3 text-center">No hay fotos de daños registradas.</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-gray-100 dark:bg-slate-800 border-t dark:border-slate-700 p-4 shrink-0 flex justify-between items-center gap-3">
          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700 transition-all flex items-center text-sm"
            title="Descargar PDF"
          >
            <FileText className="mr-2" size={16} />
            Exportar PDF
          </button>

          <div className="flex space-x-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition-all flex items-center"
            >
                <Save className="mr-2" size={18} />
                Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
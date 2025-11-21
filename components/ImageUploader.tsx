import React, { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
  label?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, label = "Subir Foto" }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so if user selects same file again (after clearing), it triggers onChange
    if (event.target) {
        event.target.value = '';
    }
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Max dimensions for mobile performance (1280px is good balance for HD quality vs memory)
        const MAX_WIDTH = 1280; 
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'white'; // Prevent transparent png turning black
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG at 0.7 quality (drastically reduces size with minimal visual loss)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const cleanBase64 = dataUrl.split(',')[1];
            
            setPreview(dataUrl);
            onImageSelected(cleanBase64);
        }
        setIsProcessing(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      
      {!preview ? (
        <div 
          className={`border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer h-48 ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          {isProcessing ? (
             <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <span className="text-gray-500 text-sm">Procesando imagen...</span>
             </div>
          ) : (
             <>
                <div className="flex space-x-4 mb-3">
                    <Camera className="w-8 h-8 text-gray-400" />
                    <Upload className="w-8 h-8 text-gray-400" />
                </div>
                <span className="text-gray-500 text-sm text-center">Toca para usar cámara o galería</span>
             </>
          )}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden shadow-md bg-black h-64 flex items-center justify-center">
          <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain" />
          <button 
            onClick={clearImage}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
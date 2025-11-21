
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success': return 'bg-white border-l-4 border-green-500 text-gray-800';
      case 'error': return 'bg-white border-l-4 border-red-500 text-gray-800';
      default: return 'bg-white border-l-4 border-blue-500 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className={`${getStyles()} p-4 rounded shadow-lg flex items-center justify-between min-w-[300px] animate-fade-in-up mb-3 transform transition-all hover:scale-102`}>
      <div className="flex items-center">
        {getIcon()}
        <span className="ml-3 text-sm font-medium">{toast.message}</span>
      </div>
      <button onClick={() => onClose(toast.id)} className="text-gray-400 hover:text-gray-600 ml-4">
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[], removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col items-center pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
};

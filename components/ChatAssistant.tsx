import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Search, Zap } from 'lucide-react';
import { sendAssistantMessage } from '../services/geminiService';
import { ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Spinner } from './Spinner';

export const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'Hola. Soy el asistente de TallerPro. ¿Necesitas buscar códigos de pintura o manuales de reparación?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { text, sources } = await sendAssistantMessage(userMsg.text, useSearch);
      
      // Defensive coding: Ensure sources is strictly typed and nulls are removed
      // This fixes the build error even if the service returns mixed types
      const cleanSources = Array.isArray(sources) 
        ? sources.filter((s): s is { uri: string; title: string } => s !== null && typeof s === 'object') 
        : undefined;

      const botMsg: ChatMessage = { 
        id: uuidv4(), 
        role: 'model', 
        text, 
        sources: cleanSources
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { id: uuidv4(), role: 'model', text: 'Lo siento, hubo un error al conectar con el servicio.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-50"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="bg-slate-850 text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
            <div className="bg-blue-500 p-1.5 rounded mr-2">
                <Zap size={16} fill="white" />
            </div>
            <h3 className="font-semibold">Asistente Taller</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Config Bar */}
      <div className="bg-gray-100 p-2 flex items-center justify-between text-xs border-b">
        <span className="text-gray-600 font-medium ml-2">Modelo: {useSearch ? 'Gemini Flash' : 'Gemini Pro'}</span>
        <button 
            onClick={() => setUseSearch(!useSearch)}
            className={`flex items-center px-2 py-1 rounded transition-colors ${useSearch ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-200 text-gray-600'}`}
        >
            <Search size={12} className="mr-1" />
            {useSearch ? 'Búsqueda Google ON' : 'Búsqueda OFF'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map(msg => (
          <div key={msg.id} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-1">Fuentes:</p>
                  {msg.sources.slice(0, 2).map((source, i) => (
                    <a key={i} href={source.uri} target="_blank" rel="noreferrer" className="block text-xs text-blue-500 hover:underline truncate">
                      {source.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start mb-4">
                <div className="bg-white p-3 rounded-lg rounded-bl-none shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2">
                        <Spinner className="text-blue-500 h-4 w-4" />
                        <span className="text-xs text-gray-500">Pensando...</span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-200 flex items-center">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Pregunta sobre piezas, manuales..."
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button 
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="ml-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

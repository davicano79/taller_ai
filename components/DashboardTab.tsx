import React, { useState, useMemo } from 'react';
import { Job, JobStatus } from '../types';
import { CheckCircle, Clock, FileText, Pencil, Eye, Filter, Calendar, X, ArrowRight } from 'lucide-react';
import { JobDetailsModal } from './JobDetailsModal';

interface Props {
  jobs: Job[];
  onUpdateJob: (id: string, updates: Partial<Job>) => void;
}

export const DashboardTab: React.FC<Props> = ({ jobs, onUpdateJob }) => {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const openModal = (job: Job) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const getStatusColor = (status: JobStatus) => {
    switch(status) {
      case JobStatus.INTAKE: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
      case JobStatus.ASSESSING: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300';
      case JobStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      case JobStatus.COMPLETED: return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
      default: return 'bg-gray-100';
    }
  };

  // Filter Logic
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Status Filter
      if (statusFilter !== 'ALL' && job.status !== statusFilter) {
        return false;
      }

      // Date Filter
      const jobDate = new Date(job.createdAt);
      
      if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        if (jobDate < startDate) return false;
      }

      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (jobDate > endDate) return false;
      }

      return true;
    });
  }, [jobs, statusFilter, dateRange]);

  const clearFilters = () => {
    setStatusFilter('ALL');
    setDateRange({ start: '', end: '' });
  };

  const hasFilters = statusFilter !== 'ALL' || dateRange.start !== '' || dateRange.end !== '';

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Historial de Trabajos</h2>

      {/* Summary Cards - Always show global stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 border-blue-500 transition-colors">
            <div className="text-gray-500 dark:text-gray-400 mb-1">En Taller</div>
            <div className="text-3xl font-bold text-gray-800 dark:text-white">
                {jobs.filter(j => j.status !== JobStatus.COMPLETED).length}
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 border-yellow-500 transition-colors">
            <div className="text-gray-500 dark:text-gray-400 mb-1">En Valoración</div>
            <div className="text-3xl font-bold text-gray-800 dark:text-white">
                {jobs.filter(j => j.status === JobStatus.ASSESSING).length}
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 border-green-500 transition-colors">
            <div className="text-gray-500 dark:text-gray-400 mb-1">Completados</div>
            <div className="text-3xl font-bold text-gray-800 dark:text-white">
                {jobs.filter(j => j.status === JobStatus.COMPLETED).length}
            </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm mb-6 border border-gray-100 dark:border-slate-700 transition-colors">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center">
              <Filter size={12} className="mr-1" /> Estado
            </label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'ALL')}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="ALL">Todos los estados</option>
              {Object.values(JobStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center">
              <Calendar size={12} className="mr-1" /> Desde
            </label>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center">
              <Calendar size={12} className="mr-1" /> Hasta
            </label>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {hasFilters && (
            <div className="pb-0.5">
               <button 
                onClick={clearFilters}
                className="flex items-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <X size={16} className="mr-1" /> Limpiar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 transition-colors">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehículo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reparación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Piezas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredJobs.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                        {jobs.length === 0 
                          ? "No hay trabajos registrados aún." 
                          : "No se encontraron trabajos con los filtros seleccionados."}
                    </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                    <tr 
                        key={job.id} 
                        onClick={() => openModal(job)}
                        className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group"
                    >
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded bg-gray-200 dark:bg-slate-600 overflow-hidden border border-gray-200 dark:border-slate-600">
                            {job.intakeImage ? (
                              <img src={`data:image/jpeg;base64,${job.intakeImage}`} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-400"><Car size={16}/></div>
                            )}
                        </div>
                        <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{job.carDetails?.plate}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{job.carDetails?.make} {job.carDetails?.model}</div>
                        </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {job.repairType}
                    </td>
                    <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-300 max-w-xs truncate">
                            {job.identifiedParts.join(', ') || <span className="text-gray-400 italic">-</span>}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="text-gray-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                           <ArrowRight size={18} />
                        </div>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <JobDetailsModal 
        job={selectedJob} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={onUpdateJob}
      />
    </div>
  );
};

// Helper icon for fallback
const Car: React.FC<{size?: number, className?: string}> = ({size, className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M14 14h-5v-3"/></svg>
);
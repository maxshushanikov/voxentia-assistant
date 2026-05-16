import { LayoutGrid, Target, Zap, MoreVertical, Plus } from 'lucide-react';

import { useTranslation } from '../i18n/context';

export default function ProjectPlanningView() {
  const { t } = useTranslation();
  const statusLabel = (s: string) =>
    ({
      "In Progress": t.project_inProgress,
      Planning: t.project_planning,
      Review: t.project_review,
    } as Record<string, string>)[s] ?? s;

  const projects = [
    { title: 'Voxentia Core v3.5', status: 'In Progress', progress: 75, team: 4, tasks: 24 },
    { title: 'Mobile App Integration', status: 'Planning', progress: 12, team: 2, tasks: 8 },
    { title: 'Security Hardening', status: 'Review', progress: 90, team: 3, tasks: 15 },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">{t.project_title}</h1>
          <p className="text-gray-500 text-sm">{t.project_subtitle}</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-[#2979ff] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          {t.project_create}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Statistics row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
           <StatsBox label={t.project_activeProjects} value="12" />
           <StatsBox label={t.project_totalTasks} value="482" />
           <StatsBox label={t.project_teamMembers} value="18" />
           <StatsBox label={t.project_efficiency} value="94%" />
        </div>

        {/* Project cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {projects.map((p, i) => (
             <div key={i} className="glass-card rounded-[8px] p-6 border border-white/5 hover:border-[#2979ff33] transition-all group">
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-[#2979ff]/10 rounded-[4px] flex items-center justify-center border border-[#2979ff]/20">
                         <Target className="w-5 h-5 text-[#2979ff]" />
                      </div>
                      <div>
                         <h4 className="text-white font-medium group-hover:text-[#2979ff] transition-colors">{p.title}</h4>
                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{statusLabel(p.status)}</span>
                      </div>
                   </div>
                   <button className="text-gray-600 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                   </button>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      <span>Completion</span>
                      <span>{p.progress}%</span>
                   </div>
                   <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#2979ff]" style={{ width: `${p.progress}%` }} />
                   </div>
                </div>

                <div className="flex items-center justify-between mt-8">
                   <div className="flex -space-x-2">
                      {Array.from({ length: p.team }).map((_, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-[#161821] border border-white/10 flex items-center justify-center text-[8px] font-bold text-gray-400">
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                   </div>
                   <div className="flex items-center space-x-4">
                      <div className="flex items-center text-[10px] text-gray-600 font-bold uppercase">
                         <LayoutGrid className="w-3 h-3 mr-1" />
                         {p.tasks} Tasks
                      </div>
                      <div className="flex items-center text-[10px] text-emerald-500 font-bold uppercase">
                         <Zap className="w-3 h-3 mr-1" />
                         On Track
                      </div>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

function StatsBox({ label, value }: { label: string, value: string }) {
  return (
    <div className="glass-card rounded-[8px] p-4 border border-white/5 bg-white/2">
       <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-1">{label}</p>
       <p className="text-lg text-white font-medium">{value}</p>
    </div>
  );
}

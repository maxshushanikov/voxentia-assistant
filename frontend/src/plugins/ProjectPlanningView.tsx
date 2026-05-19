import { LayoutGrid, Target, Zap, MoreVertical, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useTranslation } from '../i18n/context';

interface Project {
  title: string;
  status: string;
  progress: number;
  team: number;
  tasks: number;
}

export default function ProjectPlanningView() {
  const { t } = useTranslation();
  const statusLabel = (s: string) =>
    ({
      "In Progress": t.project_inProgress,
      Planning: t.project_planning,
      Review: t.project_review,
    } as Record<string, string>)[s] ?? s;

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('voxentia-projects');
    return saved ? JSON.parse(saved) : [
      { title: 'Voxentia Core v3.5', status: 'In Progress', progress: 75, team: 4, tasks: 24 },
      { title: 'Mobile App Integration', status: 'Planning', progress: 12, team: 2, tasks: 8 },
      { title: 'Security Hardening', status: 'Review', progress: 90, team: 3, tasks: 15 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('voxentia-projects', JSON.stringify(projects));
  }, [projects]);

  const addProject = () => {
    const title = prompt("New Project");
    if (title) setProjects([{ title, status: 'Planning', progress: 0, team: 1, tasks: 0 }, ...projects]);
  };

  const activeCount = projects.filter((p) => p.status !== 'Done').length;
  const totalTasks = projects.reduce((sum, p) => sum + p.tasks, 0);
  const totalTeam = projects.reduce((sum, p) => sum + p.team, 0);
  const avgProgress = projects.length ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0;

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2">{t.project_title}</h1>
          <p className="text-[var(--text-secondary)] text-sm">{t.project_subtitle}</p>
        </div>
        <button onClick={addProject} className="flex items-center px-4 py-2 bg-[var(--accent)] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          {t.project_create}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Statistics row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
           <StatsBox label={t.project_activeProjects} value={activeCount.toString()} />
           <StatsBox label={t.project_totalTasks} value={totalTasks.toString()} />
           <StatsBox label={t.project_teamMembers} value={totalTeam.toString()} />
           <StatsBox label={t.project_efficiency} value={`${avgProgress}%`} />
        </div>

        {/* Project cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {projects.map((p, i) => (
             <div key={i} className="glass-card rounded-[8px] p-6 border border-black/5 dark:border-white/5 hover:border-[var(--accent)]/33 transition-all group">
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-[#2979ff]/10 rounded-[4px] flex items-center justify-center border border-[#2979ff]/20">
                         <Target className="w-5 h-5 text-[#2979ff]" />
                      </div>
                      <div>
                         <h4 className="text-[var(--text-primary)] font-medium group-hover:text-[var(--accent)] transition-colors">{p.title}</h4>
                         <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{statusLabel(p.status)}</span>
                      </div>
                   </div>
                   <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                      <MoreVertical className="w-4 h-4" />
                   </button>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                      <span>Completion</span>
                      <span>{p.progress}%</span>
                   </div>
                   <div className="w-full h-1 bg-black/10 dark:bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#2979ff]" style={{ width: `${p.progress}%` }} />
                   </div>
                </div>

                <div className="flex items-center justify-between mt-8">
                   <div className="flex -space-x-2">
                      {Array.from({ length: p.team }).map((_, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] border border-black/10 dark:border-black/10 dark:border-white/10 flex items-center justify-center text-[8px] font-bold text-gray-400">
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                   </div>
                   <div className="flex items-center space-x-4">
                      <div className="flex items-center text-[10px] text-[var(--text-secondary)] font-bold uppercase">
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
    <div className="glass-card rounded-[8px] p-4 border border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
       <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-1">{label}</p>
       <p className="text-lg text-[var(--text-primary)] font-medium">{value}</p>
    </div>
  );
}

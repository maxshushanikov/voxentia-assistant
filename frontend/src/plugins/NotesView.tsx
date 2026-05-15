import { FileText, CheckCircle2, Circle, Search, Plus } from 'lucide-react';

export default function NotesView() {
  const notes = [
    { title: 'Project Overview', date: 'May 12, 2026', preview: 'The goal is to stabilize the frontend architecture...' },
    { title: 'Meeting Notes', date: 'May 10, 2026', preview: 'Discussed the integration of the new avatar models...' },
    { title: 'Shopping List', date: 'May 08, 2026', preview: 'Milk, Eggs, Coffee, Bread, Fruits...' },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">Notes & Tasks</h1>
          <p className="text-gray-500 text-sm">Organize your thoughts and track your goals.</p>
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-[4px] text-xs focus:outline-none focus:border-[#2979ff55] transition-all text-gray-300"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-[#2979ff] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            NEW NOTE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Notes List */}
        <section>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-[0.2em] mb-4">Recent Notes</h3>
          <div className="space-y-4">
            {notes.map((note, i) => (
              <div key={i} className="glass-card rounded-[8px] p-5 border border-white/5 hover:border-[#2979ff33] transition-all cursor-pointer group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-[#2979ff] mr-3" />
                    <h4 className="text-white font-medium group-hover:text-[#2979ff] transition-colors">{note.title}</h4>
                  </div>
                  <span className="text-[10px] text-gray-600 font-bold uppercase">{note.date}</span>
                </div>
                <p className="text-gray-500 text-sm line-clamp-2">{note.preview}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Task List */}
        <section>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-[0.2em] mb-4">Active Tasks</h3>
          <div className="glass-card rounded-[8px] p-6 border border-white/5">
             <div className="space-y-4">
                <TaskItem title="Refactor Backend Services" completed={true} />
                <TaskItem title="Implement Multi-language Support" completed={true} />
                <TaskItem title="Integrate 3D Avatar Animations" completed={false} />
                <TaskItem title="Update Documentation" completed={false} />
                <TaskItem title="Security Audit" completed={false} />
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TaskItem({ title, completed }: { title: string, completed: boolean }) {
  return (
    <div className="flex items-center group cursor-pointer">
      {completed ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-4 shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-gray-700 group-hover:text-[#2979ff] mr-4 shrink-0" />
      )}
      <span className={clsx(
        "text-sm transition-colors",
        completed ? "text-gray-600 line-through" : "text-gray-300 group-hover:text-white"
      )}>
        {title}
      </span>
    </div>
  );
}

import { clsx } from 'clsx';

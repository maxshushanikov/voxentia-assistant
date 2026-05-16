import { FileText, CheckCircle2, Circle, Search, Plus } from 'lucide-react';
import { useTranslation } from '../i18n/context';

export default function NotesView() {
  const { t } = useTranslation();
  const notes = [
    { title: 'Project Overview', date: 'May 12, 2026', preview: 'The goal is to stabilize the frontend architecture...' },
    { title: 'Meeting Notes', date: 'May 10, 2026', preview: 'Discussed the integration of the new avatar models...' },
    { title: 'Shopping List', date: 'May 08, 2026', preview: 'Milk, Eggs, Coffee, Bread, Fruits...' },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">{t.notes_title}</h1>
          <p className="text-gray-500 text-sm">{t.notes_subtitle}</p>
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder={t.common_search}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-[4px] text-xs focus:outline-none focus:border-[#2979ff55] transition-all text-gray-300"
            />
          </div>
          <button
            type="button"
            className="flex items-center px-4 py-2 bg-[#2979ff] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg uppercase tracking-widest"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.common_newNote}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-[0.2em] mb-4">
            {t.notes_recent}
          </h3>
          <div className="space-y-4">
            {notes.map((note, i) => (
              <div
                key={i}
                className="glass-card rounded-[8px] p-5 border border-white/5 hover:border-[#2979ff33] transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-[#2979ff] mr-3" />
                    <h4 className="text-white font-medium group-hover:text-[#2979ff] transition-colors">
                      {note.title}
                    </h4>
                  </div>
                  <span className="text-[10px] text-gray-600 font-bold uppercase">{note.date}</span>
                </div>
                <p className="text-gray-500 text-sm line-clamp-2">{note.preview}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-[0.2em] mb-4">
            {t.notes_tasks}
          </h3>
          <div className="space-y-3">
            <TaskItem label="Finalize Voxentia branding" done />
            <TaskItem label="Test TTS integration" done={false} />
            <TaskItem label="Update documentation" done={false} />
            <button
              type="button"
              className="w-full py-3 border border-dashed border-white/10 rounded-[4px] text-[10px] font-bold text-gray-600 hover:text-white hover:border-white/20 transition-all uppercase tracking-widest"
            >
              + {t.notes_addTask}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function TaskItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center p-4 glass-card rounded-[4px] border border-white/5 group">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-3" />
      ) : (
        <Circle className="w-4 h-4 text-gray-600 mr-3 group-hover:text-[#2979ff] transition-colors" />
      )}
      <span className={`text-sm ${done ? 'text-gray-600 line-through' : 'text-gray-300'}`}>{label}</span>
    </div>
  );
}

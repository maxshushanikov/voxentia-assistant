import { FileText, CheckCircle2, Circle, Search, Plus, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';

interface Note {
  title: string;
  date: string;
  preview: string;
}

interface Task {
  label: string;
  done: boolean;
}

export default function NotesView() {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('voxentia-notes');
    return saved ? JSON.parse(saved) : [
      { title: 'Project Overview', date: 'May 12, 2026', preview: 'The goal is to stabilize the frontend architecture...' },
      { title: 'Meeting Notes', date: 'May 10, 2026', preview: 'Discussed the integration of the new avatar models...' },
      { title: 'Shopping List', date: 'May 08, 2026', preview: 'Milk, Eggs, Coffee, Bread, Fruits...' },
    ];
  });

  const [query, setQuery] = useState('');

  const [tasks, setTasks] = useState<Task[]>(() => [
    { label: 'Finalize Voxentia branding', done: true },
    { label: 'Test TTS integration', done: false },
    { label: 'Update documentation', done: false },
  ]);

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState('');

  useEffect(() => {
    localStorage.setItem('voxentia-notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('voxentia-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addNote = () => {
    const title = prompt(t.common_newNote || 'New Note');
    if (title) setNotes([{ title, date: new Date().toLocaleDateString(), preview: '...' }, ...notes]);
  };

  const filteredNotes = notes.filter((n) => n.title.toLowerCase().includes(query.toLowerCase()));

  const toggleTask = (index: number) => {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, done: !t.done } : t)));
  };

  const createTask = () => {
    if (newTaskLabel.trim() === '') return;
    setTasks((prev) => [{ label: newTaskLabel.trim(), done: false }, ...prev]);
    setNewTaskLabel('');
    setShowAddTask(false);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2">{t.notes_title}</h1>
          <p className="text-[var(--text-secondary)] text-sm">{t.notes_subtitle}</p>
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.common_search}
              className="pl-10 pr-4 py-2 bg-black/10 dark:bg-black/5 dark:bg-white/5 border border-black/10 dark:border-black/10 dark:border-white/10 rounded-[4px] text-xs focus:outline-none focus:border-[var(--accent)]/55 transition-all text-[var(--text-secondary)]"
            />
          </div>
          <button
            type="button"
            onClick={addNote}
            className="flex items-center px-4 py-2 btn-accent rounded-[4px] text-xs font-bold hover:bg-[var(--accent-hover)] transition-colors shadow-lg uppercase tracking-widest"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.common_newNote}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">
            {t.notes_recent}
          </h3>
          <div className="space-y-4">
            {filteredNotes.map((note, i) => (
              <div
                key={i}
                className="glass-card rounded-[8px] p-5 border border-black/5 dark:border-white/5 hover:border-[var(--accent)]/33 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-[var(--accent)] mr-3" />
                    <h4 className="text-[var(--text-primary)] font-medium group-hover:text-[var(--accent)] transition-colors">
                      {note.title}
                    </h4>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase">{note.date}</span>
                </div>
                <p className="text-[var(--text-secondary)] text-sm line-clamp-2">{note.preview}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">
            {t.notes_tasks}
          </h3>
          <div className="space-y-3">
            {tasks.map((task, i) => (
              <TaskItem key={i} label={task.label} done={task.done} onClick={() => toggleTask(i)} />
            ))}
            <button
              type="button"
              onClick={() => setShowAddTask(true)}
              className="w-full py-3 border border-dashed border-black/10 dark:border-white/10 rounded-[4px] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-all uppercase tracking-widest"
            >
              + {t.notes_addTask}
            </button>
          </div>
        </section>
      </div>
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddTask(false)} />
          <div className="relative w-full max-w-md glass-card rounded-[8px] p-6 border border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--text-primary)]">{t.notes_addTask}</h3>
              <button onClick={() => setShowAddTask(false)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X className="w-4 h-4" /></button>
            </div>
            <input value={newTaskLabel} onChange={(e) => setNewTaskLabel(e.target.value)} placeholder="Task title" className="w-full p-3 rounded border border-black/10 dark:border-white/10 mb-4" />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowAddTask(false)} className="px-4 py-2 text-sm">{t.common_cancel}</button>
              <button onClick={createTask} className="px-4 py-2 btn-accent text-sm">{t.common_create}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskItem({ label, done, onClick }: { label: string; done: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} role="button" tabIndex={0} className={`flex items-center p-4 glass-card rounded-[4px] border border-black/5 dark:border-white/5 group ${onClick ? 'cursor-pointer' : ''}`}>
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-[var(--success)] mr-3" />
      ) : (
        <Circle className="w-4 h-4 text-[var(--text-secondary)] mr-3 group-hover:text-[var(--accent)] transition-colors" />
      )}
      <span className={`text-sm ${done ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-secondary)]'}`}>{label}</span>
    </div>
  );
}

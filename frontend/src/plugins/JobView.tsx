import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  CheckCircle,
  Upload,
  Star,
  Play,
  Briefcase,
  Layers,
  ArrowRight,
  MessageSquare,
  Award,
  Sparkles,
  Clipboard,
} from 'lucide-react';
import Avatar from '../components/Avatar';

type JobMode = 'dashboard' | 'search' | 'cv-upload' | 'tracker' | 'interview';

export default function JobView() {
  const [mode, setMode] = useState<JobMode>('dashboard');
  const [cvUploaded, setCvUploaded] = useState(false);
  const [selectedJobForInterview, setSelectedJobForInterview] = useState<any | null>(null);

  const handleStartInterview = (job: any) => {
    setSelectedJobForInterview(job);
    setMode('interview');
  };

  const renderContent = () => {
    switch (mode) {
      case 'dashboard':
        return (
          <JobDashboard 
            onNavigate={setMode} 
            cvUploaded={cvUploaded} 
            onStartInterview={() => handleStartInterview({
              id: 'custom-ml',
              title: "Senior AI Engineer",
              company: "Voxentia Labs",
              summary: "Senior AI engineering position working with LLM orchestration and embeddings."
            })} 
          />
        );
      case 'search':
        return (
          <JobSearchBoard 
            onBack={() => setMode('dashboard')} 
            onStartInterview={handleStartInterview}
          />
        );
      case 'cv-upload':
        return (
          <CVUploader 
            onBack={() => setMode('dashboard')} 
            onUploadSuccess={() => setCvUploaded(true)} 
          />
        );
      case 'tracker':
        return <BewerbungsTracker onBack={() => setMode('dashboard')} />;
      case 'interview':
        return (
          <InterviewSimulator 
            onBack={() => setMode('dashboard')} 
            selectedJob={selectedJobForInterview} 
          />
        );
      default:
        return <JobDashboard onNavigate={setMode} cvUploaded={cvUploaded} onStartInterview={() => {}} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">
      {renderContent()}
    </div>
  );
}

/* ==========================================
   1. JOB COACH DASHBOARD
   ========================================== */
function JobDashboard({ onNavigate, cvUploaded, onStartInterview }: { onNavigate: (m: JobMode) => void, cvUploaded: boolean, onStartInterview: () => void }) {
  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2">Job Coach</h1>
          <p className="text-[var(--text-secondary)] text-sm">Optimiere deine Bewerbungen, finde passende Stellenangebote und trainiere Interviews.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[var(--accent)] animate-pulse" />
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Powered by Voxentia AI</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <MenuTile
          icon={<Search className="w-6 h-6" />}
          title="Stellensuche"
          description="Durchsuche Stepstone, LinkedIn und Indeed mit Live-Analyse."
          onClick={() => onNavigate('search')}
          color="var(--accent)"
        />
        <MenuTile
          icon={<FileCheck className="w-6 h-6" />}
          title="Profil-Analyse"
          description="Lade deinen Lebenslauf hoch, um deinen Matching-Score zu berechnen."
          onClick={() => onNavigate('cv-upload')}
          color="#10b981"
          badge={cvUploaded ? "Aktiv" : undefined}
        />
        <MenuTile
          icon={<Layers className="w-6 h-6" />}
          title="Bewerbungs-Tracker"
          description="Behalte deine offenen Bewerbungen im Kanban-Board im Blick."
          onClick={() => onNavigate('tracker')}
          color="#fbbf24"
        />
        <MenuTile
          icon={<MessageSquare className="w-6 h-6" />}
          title="Interview-Trainer"
          description="Trainiere das Vorstellungsgespräch im Dialog mit dem 3D-Avatar."
          onClick={onStartInterview}
          color="#f43f5e"
        />
      </div>

      {/* Featured Recruiter Section */}
      <section>
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-6">Empfohlenes Training</h3>
        <div className="glass-card rounded-[12px] p-8 border border-black/5 dark:border-white/5 bg-gradient-to-br from-[var(--accent)]/10 to-transparent relative overflow-hidden group">
          <div className="relative z-10 max-w-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="px-2 py-1 bg-[var(--success)]/20 text-[var(--success)] text-[9px] font-bold uppercase tracking-widest rounded-[2px]">Empfohlen</div>
              <div className="flex text-[var(--warning)]">
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
              </div>
            </div>
            <h2 className="text-2xl text-[var(--text-primary)] mb-3">AI-Recruiter Simulation</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
              Erlebe ein lebensechtes Bewerbungsgespräch. Der AI-Recruiter stellt dir fachliche und persönliche Fragen, 
              analysiert deine Kommunikationsstärke und liefert dir eine fundierte Stärken-Schwächen-Analyse.
            </p>
            <button
              onClick={onStartInterview}
              className="flex items-center px-8 py-3.5 btn-accent rounded-[4px] text-xs font-bold hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent)]/20 uppercase tracking-widest"
            >
              <Play className="w-4 h-4 mr-3 fill-current" /> Simulation starten
            </button>
          </div>
          <div className="absolute right-[5%] top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-15 transition-opacity pointer-events-none">
            <Briefcase className="w-64 h-64 text-[var(--accent)]" />
          </div>
        </div>
      </section>
    </div>
  );
}

function MenuTile({ icon, title, description, onClick, color, badge }: { icon: any, title: string, description: string, onClick: () => void, color: string, badge?: string }) {
  return (
    <div 
      onClick={onClick}
      className="glass-card p-6 border border-black/5 dark:border-white/5 hover:border-[var(--accent)]/30 hover:bg-black/2 dark:hover:bg-white/2 rounded-[12px] cursor-pointer transition-all group flex flex-col h-full relative"
    >
      {badge && (
        <span className="absolute top-4 right-4 px-2 py-0.5 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 rounded-[2px] text-[8px] font-bold uppercase tracking-wider">
          {badge}
        </span>
      )}
      <div 
        className="w-12 h-12 rounded-[6px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {icon}
      </div>
      <h3 className="text-base text-[var(--text-primary)] font-medium mb-2 flex items-center">
        {title}
        <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--accent)]" />
      </h3>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1">{description}</p>
    </div>
  );
}

/* ==========================================
   2. STELLENSUCHE BOARD
   ========================================== */
function JobSearchBoard({ onBack, onStartInterview }: { onBack: () => void, onStartInterview: (job: any) => void }) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [portal, setPortal] = useState('All');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [appliedStatus, setAppliedStatus] = useState<Record<string, boolean>>({});

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSelectedJob(null);
    setCoverLetter(null);

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/v1/jobs/search?query=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&portal=${portal}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateLetter = async (job: any) => {
    setLetterLoading(true);
    setCoverLetter(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/v1/jobs/${job.id}/cover-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          job_id: job.id,
          job_title: job.title,
          job_company: job.company,
          job_summary: job.summary
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCoverLetter(data.cover_letter);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLetterLoading(false);
    }
  };

  const trackJob = async (job: any) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/jobs/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        body: new URLSearchParams({
          job_id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          status: "applied",
          matching_score: job.matching_score ? job.matching_score.toString() : ''
        })
      });
      if (res.ok) {
        setAppliedStatus(prev => ({ ...prev, [job.id]: true }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <button onClick={onBack} className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest mb-4">
          &lt; Zurück zum Dashboard
        </button>
        <h2 className="text-3xl font-light text-[var(--text-primary)]">Stellensuche</h2>
        <p className="text-[var(--text-secondary)] text-sm">Durchsuche mehrere Jobportale gleichzeitig und erhalte deinen individuellen Matching-Score.</p>
      </div>

      {/* Filter Form */}
      <div className="glass-card p-6 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2 mb-8">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block mb-2">Stichwort</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="z.B. React Entwickler, AI Engineer..."
              className="w-full px-4 py-3 rounded-[4px] bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block mb-2">Ort</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Berlin, Remote..."
              className="w-full px-4 py-3 rounded-[4px] bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block mb-2">Portal</label>
            <select
              value={portal}
              onChange={(e) => setPortal(e.target.value)}
              className="w-full px-4 py-3 rounded-[4px] bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="All">Alle Portale</option>
              <option value="Stepstone">Stepstone</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Indeed">Indeed</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 btn-accent rounded-[4px] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent)]/15"
          >
            {loading ? 'Suche...' : <><Search className="w-4 h-4" /> Jobs suchen</>}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Jobs List */}
        <div className="lg:col-span-6 space-y-6">
          {jobs.length === 0 && !loading && (
            <div className="glass-card p-12 text-center border border-black/5 dark:border-white/5 rounded-[12px]">
              <Briefcase className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
              <p className="text-sm text-[var(--text-secondary)]">Suche nach Stellenanzeigen, um Ergebnisse anzuzeigen.</p>
            </div>
          )}
          {loading && (
            <div className="text-center py-12">
              <div className="w-10 h-10 rounded-full border-2 border-t-[var(--accent)] border-r-[var(--accent)] border-b-transparent border-l-transparent animate-spin mx-auto mb-4"></div>
              <p className="text-xs text-[var(--text-secondary)]">Scrape Jobbörsen...</p>
            </div>
          )}
          {jobs.map((job) => (
            <div 
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={`glass-card p-6 border rounded-[12px] cursor-pointer transition-all flex flex-col justify-between
                ${selectedJob?.id === job.id 
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5' 
                  : 'border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15 bg-black/2 dark:bg-white/2'
                }
              `}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg text-[var(--text-primary)] font-medium mb-1">{job.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)]">{job.company} — {job.location}</p>
                </div>
                {job.matching_score !== null && (
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 rounded-[2px] text-[10px] font-bold">
                      {job.matching_score}% Match
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed mb-6">{job.summary}</p>
              
              {/* Score bar */}
              {job.matching_score !== null && (
                <div className="w-full h-1 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-[var(--success)]" 
                    style={{ width: `${job.matching_score}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Job Detail & Cover Letter Generator */}
        <div className="lg:col-span-6">
          {selectedJob ? (
            <div className="glass-card p-6 border border-black/5 dark:border-white/10 rounded-[12px] bg-black/2 dark:bg-white/2 space-y-6 sticky top-4">
              <div>
                <h3 className="text-2xl text-[var(--text-primary)] font-light mb-1">{selectedJob.title}</h3>
                <p className="text-sm text-[var(--accent)] font-medium mb-4">{selectedJob.company} — {selectedJob.location}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => trackJob(selectedJob)}
                    disabled={appliedStatus[selectedJob.id]}
                    className="px-4 py-2 bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[var(--text-secondary)] rounded-[4px] text-[10px] font-bold uppercase tracking-widest hover:text-[var(--text-primary)] hover:bg-black/15 transition-all"
                  >
                    {appliedStatus[selectedJob.id] ? 'Im Tracker' : 'Zum Tracker hinzufügen'}
                  </button>
                  <button
                    onClick={() => onStartInterview(selectedJob)}
                    className="px-4 py-2 border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-[4px] text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Interview üben
                  </button>
                  <button
                    onClick={() => generateLetter(selectedJob)}
                    disabled={letterLoading}
                    className="px-4 py-2 btn-accent rounded-[4px] text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all"
                  >
                    {letterLoading ? 'Generiere...' : 'Anschreiben erstellen'}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-3">Beschreibung</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{selectedJob.summary}</p>
              </div>

              {coverLetter && (
                <div className="border-t border-black/5 dark:border-white/5 pt-6 animate-in fade-in slide-in-from-bottom-2">
                  <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-4 flex items-center justify-between">
                    <span>Generiertes Anschreiben</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(coverLetter)}
                      className="text-[9px] text-[var(--accent)] hover:underline flex items-center gap-1 font-bold tracking-widest lowercase"
                    >
                      <Clipboard className="w-3 h-3" /> Kopieren
                    </button>
                  </h4>
                  <div className="p-5 bg-black/10 dark:bg-black/25 rounded-[8px] text-[11px] text-[var(--text-primary)] font-mono whitespace-pre-line border border-black/5 dark:border-white/5 leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
                    {coverLetter}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2 text-center text-[var(--text-muted)] sticky top-4">
              <Clipboard className="w-12 h-12 opacity-30 mx-auto mb-4" />
              <p className="text-xs">Wähle ein Stellenangebot aus, um Details anzuzeigen und dein Anschreiben zu generieren.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   3. PROFIL ANALYSE (CV UPLOADER)
   ========================================== */
function CVUploader({ onBack, onUploadSuccess }: { onBack: () => void, onUploadSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);
    setSuccess(false);

    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/jobs/cv/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        setSuccess(true);
        onUploadSuccess();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <button onClick={onBack} className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest mb-4">
          &lt; Zurück zum Dashboard
        </button>
        <h2 className="text-3xl font-light text-[var(--text-primary)]">Profil-Analyse</h2>
        <p className="text-[var(--text-secondary)] text-sm">Lade deinen Lebenslauf hoch, um personalisierte Übereinstimmungsanalysen zu aktivieren.</p>
      </div>

      <div className="max-w-md mx-auto w-full glass-card p-10 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2 text-center mt-12">
        {!success ? (
          <>
            <Upload className="w-16 h-16 text-[var(--accent)] mx-auto mb-6" />
            <h3 className="text-xl text-[var(--text-primary)] font-medium mb-4">Lebenslauf hochladen</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-8 leading-relaxed">
              Voxentia analysiert deinen Lebenslauf (PDF oder TXT) und berechnet bei der Jobsuche automatisch deinen individuellen **Matching-Score** per Embedding-Vektorvergleich.
            </p>
            
            <label className="w-full py-4 btn-accent rounded-[4px] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer hover:bg-[var(--accent-hover)] transition-all">
              {loading ? 'Lese Profil...' : 'Lebenslauf auswählen'}
              <input type="file" accept="application/pdf,text/plain" className="hidden" onChange={handleUpload} disabled={loading} />
            </label>
          </>
        ) : (
          <div className="animate-in zoom-in-95">
            <CheckCircle className="w-16 h-16 text-[var(--success)] mx-auto mb-6" />
            <h3 className="text-xl text-[var(--text-primary)] font-medium mb-2">Profil erfolgreich erfasst!</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-8 max-w-xs mx-auto leading-relaxed">
              Dein Lebenslauf wurde erfolgreich analysiert. Ab jetzt wird dir bei jeder Stellensuche dein persönlicher Übereinstimmungswert angezeigt.
            </p>
            <button
              onClick={onBack}
              className="w-full py-3.5 bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[var(--text-secondary)] rounded-[4px] text-xs font-bold uppercase tracking-widest hover:text-[var(--text-primary)] transition-all"
            >
              Zum Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==========================================
   4. BEWERBUNGS TRACKER (KANBAN)
   ========================================== */
interface Application {
  id: number;
  job_id: string;
  title: string;
  company: string;
  location: string;
  status: 'applied' | 'interviewing' | 'offer' | 'rejected';
  matching_score?: number;
}

function BewerbungsTracker({ onBack }: { onBack: () => void }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/jobs/applications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApps(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appId: number, status: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/v1/jobs/applications/${appId}/status?status=${status}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchApps();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const columns = [
    { id: 'applied', title: 'Angewendet', color: 'var(--accent)' },
    { id: 'interviewing', title: 'Gespräch', color: '#fbbf24' },
    { id: 'offer', title: 'Angebot', color: '#10b981' },
    { id: 'rejected', title: 'Abgelehnt', color: '#f43f5e' },
  ];

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <button onClick={onBack} className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest mb-4">
          &lt; Zurück zum Dashboard
        </button>
        <h2 className="text-3xl font-light text-[var(--text-primary)]">Bewerbungs-Tracker</h2>
        <p className="text-[var(--text-secondary)] text-sm">Organisiere deine offenen Stellen in den verschiedenen Stadien des Bewerbungsprozesses.</p>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-muted)]">Lade Tracker...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 min-h-[450px]">
          {columns.map((col) => {
            const colApps = apps.filter(a => a.status === col.id);
            return (
              <div 
                key={col.id} 
                className="glass-card p-4 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2 flex flex-col"
              >
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-black/5 dark:border-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: col.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }}></span>
                    {col.title}
                  </h4>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)]">{colApps.length}</span>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                  {colApps.map((app) => (
                    <div 
                      key={app.id} 
                      className="p-4 bg-[var(--bg-secondary)] border border-black/5 dark:border-white/10 rounded-[8px] shadow-sm hover:border-[var(--accent)]/30 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <h5 className="text-xs font-medium text-[var(--text-primary)] mb-1 leading-snug">{app.title}</h5>
                        <p className="text-[9px] text-[var(--text-secondary)]">{app.company} — {app.location}</p>
                      </div>
                      
                      <div className="mt-4 flex justify-between items-center">
                        {app.matching_score && (
                          <span className="text-[8px] bg-[var(--success)]/10 text-[var(--success)] px-1.5 py-0.5 rounded-[2px] font-bold uppercase">
                            {app.matching_score}% Match
                          </span>
                        )}
                        <select 
                          value={app.status}
                          onChange={(e) => updateStatus(app.id, e.target.value)}
                          className="text-[8px] font-bold uppercase bg-transparent text-[var(--text-secondary)] border-none focus:outline-none cursor-pointer"
                        >
                          <option value="applied">Beworben</option>
                          <option value="interviewing">Gespräch</option>
                          <option value="offer">Angebot</option>
                          <option value="rejected">Abgelehnt</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {colApps.length === 0 && (
                    <div className="text-center py-10 text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
                      Leer
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ==========================================
   5. INTERVIEW SIMULATOR (3D AVATAR SPLIT)
   ========================================== */
function InterviewSimulator({ onBack, selectedJob }: { onBack: () => void, selectedJob: any | null }) {
  const [step, setStep] = useState<'intro' | 'session' | 'feedback'>('intro');
  const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const [avatarEmotion, setAvatarEmotion] = useState<'neutral' | 'happy' | 'sad' | 'thinking'>('neutral');

  const job = selectedJob || {
    id: 'general',
    title: "AI Consultant",
    company: "Voxentia Labs",
    summary: "General software and AI architectural consulting position."
  };

  const startSession = () => {
    setStep('session');
    setAvatarSpeaking(true);
    setAvatarEmotion('happy');
    setMessages([
      { 
        role: 'ai', 
        text: `Herzlich willkommen zum Vorstellungsgespräch für die Position als ${job.title} bei ${job.company}. Mein Name ist Voxentia, und ich werde heute Ihr Gespräch führen. Können Sie mir zu Beginn etwas über Ihren Werdegang erzählen?` 
      }
    ]);
    
    // Simulate speaking timing
    setTimeout(() => {
      setAvatarSpeaking(false);
      setAvatarEmotion('neutral');
    }, 4500);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim()) return;

    const userMsg = currentInput;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setCurrentInput('');
    
    // Set Avatar state to thinking
    setAvatarEmotion('thinking');

    // Simulate recruiter delay & next question
    setTimeout(() => {
      setAvatarSpeaking(true);
      setAvatarEmotion('neutral');
      const questions = [
        "Vielen Dank. Was motiviert Sie besonders an dieser Rolle im Vergleich zu Ihren bisherigen Positionen?",
        "Das klingt sehr gut. Welche Programmiersprachen und Frameworks nutzen Sie am liebsten für AI-Projekte?",
        "Können Sie eine herausfordernde technische Situation beschreiben und wie Sie diese gelöst haben?",
        "Vielen Dank für das tolle Gespräch! Wir sind am Ende der Simulation angelangt. Ich werte nun Ihr Ergebnis aus."
      ];
      const nextQ = questions[Math.min(messages.length - 1, questions.length - 1)];
      setMessages(prev => [...prev, { role: 'ai', text: nextQ }]);
      
      setTimeout(() => {
        setAvatarSpeaking(false);
        setAvatarEmotion('neutral');
        if (messages.length >= 7) {
          setStep('feedback');
        }
      }, 4000);
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden h-full">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest">
          &lt; Training beenden
        </button>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Vorstellungsgespräch läuft</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
        {/* Left Side: Interactive 3D Avatar (Splitscreen) */}
        <div className="lg:col-span-4 flex flex-col h-full bg-black/10 dark:bg-white/2 border border-black/5 dark:border-white/10 rounded-[16px] overflow-hidden relative shadow-lg">
          <Avatar 
            gender="feminine"
            isSpeaking={avatarSpeaking}
            isThinking={avatarEmotion === 'thinking'}
            emotion={avatarEmotion}
            statusLabel={avatarSpeaking ? "Recruiter spricht..." : avatarEmotion === 'thinking' ? "Recruiter analysiert..." : "Recruiter hört zu"}
          />
        </div>

        {/* Right Side: Chat & Transcript UI */}
        <div className="lg:col-span-8 flex flex-col h-full justify-between overflow-hidden">
          {step === 'intro' && (
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8">
              <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto text-[var(--accent)]">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-3xl font-light text-[var(--text-primary)] mb-2">{job.title} Interview</h3>
                <p className="text-sm text-[var(--text-secondary)]">Simuliere ein fachliches HR-Gespräch bei {job.company}.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-black/5 dark:bg-white/2 border border-black/5 dark:border-white/5 rounded-[6px] text-left">
                  <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase block mb-1">Dauer</span>
                  <span className="text-xs text-[var(--text-secondary)]">ca. 5 Minuten</span>
                </div>
                <div className="p-4 bg-black/5 dark:bg-white/2 border border-black/5 dark:border-white/5 rounded-[6px] text-left">
                  <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase block mb-1">Modus</span>
                  <span className="text-xs text-[var(--text-secondary)]">HR & Fachgespräch</span>
                </div>
              </div>

              <button
                onClick={startSession}
                className="py-4 btn-accent rounded-[4px] text-xs font-bold uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all shadow-xl shadow-[var(--accent)]/20"
              >
                Gespräch beginnen
              </button>
            </div>
          )}

          {step === 'session' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden justify-between">
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4 pr-2">
                {messages.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in`}
                  >
                    <div 
                      className={`max-w-xl p-4 rounded-[12px] text-xs leading-relaxed
                        ${m.role === 'user' 
                          ? 'bg-[var(--accent)] text-white shadow-sm' 
                          : 'bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[var(--text-primary)]'
                        }
                      `}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSend} className="flex gap-4 border-t border-black/5 dark:border-white/5 pt-4">
                <input
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Antwort eingeben..."
                  disabled={avatarSpeaking || avatarEmotion === 'thinking'}
                  className="flex-1 px-4 py-3 rounded-[4px] bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="submit"
                  disabled={avatarSpeaking || avatarEmotion === 'thinking'}
                  className="px-8 py-3.5 btn-accent rounded-[4px] text-xs font-bold uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all"
                >
                  Senden
                </button>
              </form>
            </div>
          )}

          {step === 'feedback' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8 text-left animate-in fade-in">
              <div className="flex items-center space-x-3 pb-4 border-b border-black/5 dark:border-white/5">
                <Award className="w-8 h-8 text-[var(--warning)]" />
                <div>
                  <h3 className="text-2xl text-[var(--text-primary)] font-light">Feedback-Report</h3>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Auswertung für {job.title}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <MetricBar label="Kommunikation & Struktur" score={88} />
                  <MetricBar label="Fachwissen & Expertise" score={84} />
                  <MetricBar label="Selbstbewusstsein & Ton" score={92} />
                  <MetricBar label="Satzbau & Redefluss" score={85} />
                </div>
                
                <div className="glass-card p-6 border border-black/5 dark:border-white/10 rounded-[12px] bg-black/2 dark:bg-white/2 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-2">AI-Empfehlung</h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                      "Ihre Antworten waren hervorragend strukturiert und überaus präzise. Fachliche Kenntnisse über Web-Architekturen wurden schlüssig dargestellt. Versuchen Sie beim nächsten Gespräch, noch gezielter auf die Projektmethodiken der Stellenausschreibung einzugehen."
                    </p>
                  </div>
                  <div className="mt-6 flex justify-between items-center border-t border-black/5 dark:border-white/5 pt-4">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Gesamt-Score</span>
                    <span className="text-2xl font-light text-[var(--success)]">87%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onBack}
                className="w-full py-4 bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[var(--text-primary)] rounded-[4px] text-xs font-bold uppercase tracking-widest hover:bg-black/15 transition-all"
              >
                Training beenden
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2">
        <span>{label}</span>
        <span>{score}%</span>
      </div>
      <div className="w-full h-1.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

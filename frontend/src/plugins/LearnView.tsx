import { useState, useEffect } from 'react';
import {
  Brain,
  FileText,
  HelpCircle,
  Plus,
  CheckCircle,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Upload,
  AlertCircle,
  Award,
  Zap,
} from 'lucide-react';

type Mode = 'dashboard' | 'plan' | 'quiz' | 'flashcards' | 'eli5';

export default function LearnView() {
  const [mode, setMode] = useState<Mode>('dashboard');
  const [activePlanTopic, setActivePlanTopic] = useState<string | null>(null);

  const handleStartQuiz = (topic: string) => {
    setActivePlanTopic(topic);
    setMode('quiz');
  };

  const renderContent = () => {
    switch (mode) {
      case 'dashboard':
        return <LearningDashboard onNavigate={setMode} />;
      case 'plan':
        return <LearningPlanPlanner onBack={() => setMode('dashboard')} onStartQuiz={handleStartQuiz} />;
      case 'quiz':
        return <QuizPanel onBack={() => setMode('dashboard')} suggestedTopic={activePlanTopic} />;
      case 'flashcards':
        return <FlashcardDeckView onBack={() => setMode('dashboard')} />;
      case 'eli5':
        return <ELI5Panel onBack={() => setMode('dashboard')} />;
      default:
        return <LearningDashboard onNavigate={setMode} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">
      {renderContent()}
    </div>
  );
}

/* ==========================================
   1. LEARNING DASHBOARD
   ========================================== */
function LearningDashboard({ onNavigate }: { onNavigate: (m: Mode) => void }) {
  const [stats, setStats] = useState({
    words_learned: 250,
    simulations: 0,
    accuracy: '100%',
    streak: '0 Tage',
    daily_goals: [] as any[],
    history: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/learn/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleGoal = async (goalId: number) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/v1/learn/goals/${goalId}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-10 h-10 rounded-full border-2 border-t-[var(--accent)] border-r-[var(--accent)] border-b-transparent border-l-transparent animate-spin mb-4" />
        <p className="text-xs text-[var(--text-secondary)]">Lade Statistiken...</p>
      </div>
    );
  }

  const completedGoals = stats.daily_goals.filter(g => g.completed).length;
  const totalGoals = stats.daily_goals.length;
  const goalProgress = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2">Learning Dashboard</h1>
          <p className="text-[var(--text-secondary)] text-sm">Verfolge deine Ziele, absolviere Quizzes und organisiere deinen Lernfortschritt.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[var(--accent)] animate-pulse" />
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Powered by Voxentia AI</span>
        </div>
      </div>

      {/* Grid Menu Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <MenuTile
          icon={<BookOpen className="w-6 h-6" />}
          title="Lernplaner"
          description="Generiere strukturierte Lernpläne zu beliebigen Themen."
          onClick={() => onNavigate('plan')}
          color="var(--accent)"
        />
        <MenuTile
          icon={<HelpCircle className="w-6 h-6" />}
          title="Quiz-Modus"
          description="Testest dein Wissen mit dynamisch generierten Quizzes."
          onClick={() => onNavigate('quiz')}
          color="#10b981"
        />
        <MenuTile
          icon={<Brain className="w-6 h-6" />}
          title="Karteikarten"
          description="Erstelle PDF-basierte Lernkarten mit 3D-Effekten."
          onClick={() => onNavigate('flashcards')}
          color="#fbbf24"
        />
        <MenuTile
          icon={<FileText className="w-6 h-6" />}
          title="Explain Like I'm 5"
          description="Lass dir komplexe Konzepte extrem einfach erklären."
          onClick={() => onNavigate('eli5')}
          color="#f43f5e"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatsCard label="WÖRTER GELERNT" value={stats.words_learned.toString()} color="var(--accent)" />
        <StatsCard label="SIMULATIONEN" value={stats.simulations.toString()} color="#10b981" />
        <StatsCard label="GENAUIGKEIT" value={stats.accuracy} color="#fbbf24" />
        <StatsCard label="LERN-STRÄHNE" value={stats.streak} color="#f43f5e" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Daily Goals */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="glass-card flex-1 p-6 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Tagesziele</h3>
              <span className="text-[10px] text-[var(--text-secondary)] font-bold">{completedGoals}/{totalGoals} Erledigt</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-[var(--accent)] transition-all duration-500 ease-out" 
                style={{ width: `${goalProgress}%` }}
              />
            </div>

            <div className="space-y-4">
              {stats.daily_goals.map((goal) => (
                <div 
                  key={goal.id} 
                  onClick={() => toggleGoal(goal.id)}
                  className={`flex items-center space-x-4 p-4 rounded-[8px] border transition-all cursor-pointer select-none
                    ${goal.completed 
                      ? 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/2 opacity-65' 
                      : 'border-black/5 dark:border-white/5 hover:border-[var(--accent)]/30 hover:bg-black/2 dark:hover:bg-white/2'
                    }
                  `}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all
                    ${goal.completed 
                      ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]' 
                      : 'border-[var(--text-muted)] text-transparent'
                    }
                  `}>
                    <CheckCircle className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <span className={`text-sm text-[var(--text-primary)] ${goal.completed ? 'line-through text-[var(--text-muted)]' : ''}`}>
                    {goal.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Learning History */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="glass-card flex-1 p-6 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2 max-h-[350px] overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-6">Lernhistorie</h3>
            {stats.history.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-10">Noch keine Aktivitäten aufgezeichnet.</p>
            ) : (
              <div className="space-y-4">
                {stats.history.map((hist) => (
                  <div key={hist.id} className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-secondary)]">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--text-primary)]">{hist.topic}</p>
                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">{hist.action_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] px-2.5 py-1 rounded-full font-bold uppercase">
                      {hist.score_details}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuTile({ icon, title, description, onClick, color }: { icon: any, title: string, description: string, onClick: () => void, color: string }) {
  return (
    <div 
      onClick={onClick}
      className="glass-card p-6 border border-black/5 dark:border-white/5 hover:border-[var(--accent)]/30 hover:bg-black/2 dark:hover:bg-white/2 rounded-[12px] cursor-pointer transition-all group flex flex-col h-full"
    >
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

function StatsCard({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="glass-card rounded-[8px] p-5 border border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2">
      <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-2">{label}</p>
      <p className="text-2xl font-light text-[var(--text-primary)]" style={{ color }}>{value}</p>
    </div>
  );
}

/* ==========================================
   2. LERNPLAN PLANER
   ========================================== */
function LearningPlanPlanner({ onBack, onStartQuiz }: { onBack: () => void, onStartQuiz: (t: string) => void }) {
  const [topic, setTopic] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPlans, setFetchingPlans] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/learn/plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingPlans(false);
    }
  };

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/learn/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic }),
      });
      if (res.ok) {
        setTopic('');
        fetchPlans();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (plan: any, modIndex: number) => {
    const updatedModules = [...plan.modules];
    updatedModules[modIndex].completed = !updatedModules[modIndex].completed;

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/v1/learn/plan/${plan.id}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ modules: updatedModules }),
      });
      if (res.ok) {
        fetchPlans();
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
        <h2 className="text-3xl font-light text-[var(--text-primary)]">Lernplaner</h2>
        <p className="text-[var(--text-secondary)] text-sm">Lass die KI einen maßgeschneiderten modularen Syllabus für dich erstellen.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Generate plan form */}
        <div className="lg:col-span-4">
          <div className="glass-card p-6 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2 sticky top-4">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-4">Neues Thema starten</h3>
            <form onSubmit={createPlan} className="space-y-4">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="z.B. Quantum Computing, React 19..."
                disabled={loading}
                className="w-full px-4 py-3 rounded-[4px] bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 btn-accent rounded-[4px] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent)]/15"
              >
                {loading ? (
                  <>
                    <Plus className="w-4 h-4 animate-spin" /> Generiere...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Plan erstellen
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Existing plans list */}
        <div className="lg:col-span-8 space-y-6">
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em]">Aktive Lernpläne</h3>
          {fetchingPlans ? (
            <p className="text-sm text-[var(--text-muted)]">Lade Pläne...</p>
          ) : plans.length === 0 ? (
            <div className="glass-card p-12 text-center border border-black/5 dark:border-white/5 rounded-[12px]">
              <AlertCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
              <p className="text-sm text-[var(--text-secondary)]">Du hast noch keinen Lernplan erstellt. Beginne links ein neues Thema!</p>
            </div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="glass-card p-6 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl text-[var(--text-primary)] font-medium mb-1">{plan.topic}</h4>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Lernplan #{plan.id}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-light text-[var(--accent)]">{plan.progress}%</span>
                    <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Fortschritt</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden mb-6">
                  <div className="h-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${plan.progress}%` }}></div>
                </div>

                {/* Timeline modules list */}
                <div className="space-y-4 relative pl-4 border-l border-black/10 dark:border-white/10 ml-2">
                  {plan.modules.map((mod: any, idx: number) => (
                    <div key={idx} className="relative group">
                      {/* Timeline dot */}
                      <div 
                        onClick={() => toggleModule(plan, idx)}
                        className={`absolute left-[-21px] top-1 w-3 h-3 rounded-full border-2 cursor-pointer transition-all
                          ${mod.completed 
                            ? 'bg-[var(--accent)] border-[var(--accent)] scale-110 shadow-sm shadow-[var(--accent)]' 
                            : 'bg-[var(--bg-primary)] border-[var(--text-muted)] hover:border-[var(--accent)]'
                          }
                        `}
                      />
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className={`text-sm font-medium ${mod.completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                            {mod.title}
                          </h5>
                          <p className={`text-xs mt-1 ${mod.completed ? 'text-[var(--text-muted)]/60' : 'text-[var(--text-secondary)]'}`}>
                            {mod.description}
                          </p>
                        </div>
                        <button
                          onClick={() => onStartQuiz(plan.topic)}
                          className="text-[9px] text-[var(--accent)] hover:underline uppercase tracking-wider font-bold ml-4 whitespace-nowrap"
                        >
                          Modul-Quiz &gt;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   3. QUIZ MODUS
   ========================================== */
function QuizPanel({ onBack, suggestedTopic }: { onBack: () => void, suggestedTopic: string | null }) {
  const [topic, setTopic] = useState(suggestedTopic || '');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [verifiedResult, setVerifiedResult] = useState<any | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const startQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setQuizFinished(false);
    setScore(0);
    setCurrentIndex(0);
    setSelectedOption(null);
    setVerifiedResult(null);

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/learn/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic, module_title: "General Assessment" }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectOption = async (option: string) => {
    if (verifiedResult) return; // Answer already submitted for this question
    setSelectedOption(option);
    
    const currentQ = questions[currentIndex];
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/learn/quiz/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: currentQ.question,
          user_answer: option,
          correct_answer: currentQ.correct_answer,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVerifiedResult(data);
        if (data.correct) {
          setScore(s => s + 1);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedOption(null);
      setVerifiedResult(null);
    } else {
      setQuizFinished(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <button onClick={onBack} className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest mb-4">
          &lt; Zurück zum Dashboard
        </button>
        <h2 className="text-3xl font-light text-[var(--text-primary)]">Quiz-Modus</h2>
        <p className="text-[var(--text-secondary)] text-sm">Teste dein Wissen und erhalte detailliertes Feedback von Voxentia.</p>
      </div>

      {questions.length === 0 && !loading && (
        <div className="max-w-md mx-auto w-full glass-card p-8 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2 text-center mt-12">
          <HelpCircle className="w-12 h-12 text-[var(--accent)] mx-auto mb-6" />
          <h3 className="text-xl text-[var(--text-primary)] font-medium mb-4">Wissensthema eingeben</h3>
          <form onSubmit={startQuiz} className="space-y-4">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="z.B. Git-Befehle, React Context..."
              className="w-full px-4 py-3 rounded-[4px] bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              className="w-full py-3 btn-accent rounded-[4px] text-xs font-bold uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all"
            >
              Quiz starten
            </button>
          </form>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full border-2 border-t-[var(--accent)] border-r-[var(--accent)] border-b-transparent border-l-transparent animate-spin mb-6"></div>
          <h3 className="text-lg text-[var(--text-primary)] font-medium">Bereite Quizfragen vor...</h3>
          <p className="text-xs text-[var(--text-secondary)]">Unser AI-Lehrer generiert maßgeschneiderte Multiple-Choice-Fragen.</p>
        </div>
      )}

      {questions.length > 0 && !quizFinished && (
        <div className="max-w-2xl mx-auto w-full space-y-6 mt-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Frage {currentIndex + 1} von {questions.length}
            </span>
            <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
              Score: {score}
            </span>
          </div>

          {/* Question Card */}
          <div className="glass-card p-8 border border-black/5 dark:border-white/10 rounded-[12px] bg-black/2 dark:bg-white/2">
            <h3 className="text-xl text-[var(--text-primary)] font-light leading-relaxed mb-8">
              {questions[currentIndex].question}
            </h3>

            <div className="space-y-4">
              {questions[currentIndex].options.map((option: string, idx: number) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === questions[currentIndex].correct_answer;
                
                let btnStyle = 'border-black/10 dark:border-white/10 hover:border-[var(--accent)]/30 hover:bg-black/2 dark:hover:bg-white/2 text-[var(--text-primary)]';
                if (verifiedResult) {
                  if (isCorrect) {
                    btnStyle = 'border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)] font-medium';
                  } else if (isSelected && !verifiedResult.correct) {
                    btnStyle = 'border-rose-500/40 bg-rose-500/10 text-rose-500';
                  } else {
                    btnStyle = 'opacity-50 border-black/5 dark:border-white/5 text-[var(--text-muted)] pointer-events-none';
                  }
                }

                return (
                  <div
                    key={idx}
                    onClick={() => selectOption(option)}
                    className={`p-4 border rounded-[8px] text-sm cursor-pointer transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{option}</span>
                    {verifiedResult && isCorrect && <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--success)]">Korrekt</span>}
                  </div>
                );
              })}
            </div>

            {verifiedResult && (
              <div className="mt-8 p-4 bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[8px] animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center space-x-2 mb-2">
                  <Award className={`w-5 h-5 ${verifiedResult.correct ? 'text-[var(--success)]' : 'text-rose-500'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${verifiedResult.correct ? 'text-[var(--success)]' : 'text-rose-500'}`}>
                    {verifiedResult.correct ? 'Sehr gut!' : 'Erklärung'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {questions[currentIndex].explanation || verifiedResult.explanation}
                </p>

                <button
                  onClick={nextQuestion}
                  className="mt-6 w-full py-3 btn-accent rounded-[4px] text-xs font-bold uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all"
                >
                  {currentIndex < questions.length - 1 ? 'Nächste Frage' : 'Quiz beenden'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {quizFinished && (
        <div className="max-w-md mx-auto w-full glass-card p-8 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2 text-center mt-12 animate-in zoom-in-95">
          <Award className="w-16 h-16 text-[var(--accent)] mx-auto mb-6" />
          <h3 className="text-2xl text-[var(--text-primary)] font-light mb-2">Quiz abgeschlossen!</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-8">Glückwunsch, du hast das Quiz erfolgreich beendet.</p>
          
          <div className="p-6 bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[8px] mb-8">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-1">Dein Score</p>
            <p className="text-4xl font-light text-[var(--text-primary)]">{score} / {questions.length}</p>
          </div>

          <button
            onClick={() => setQuestions([])}
            className="w-full py-3 btn-accent rounded-[4px] text-xs font-bold uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all"
          >
            Neues Quiz starten
          </button>
        </div>
      )}
    </div>
  );
}

/* ==========================================
   4. PDF-BASIERTE LERNKARTEN (3D EFFECT)
   ========================================== */
function FlashcardDeckView({ onBack }: { onBack: () => void }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [decks, setDecks] = useState<any[]>([]);
  const [activeDeck, setActiveDeck] = useState<any | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/learn/flashcards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDecks(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generateFromTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/v1/learn/flashcards/generate?topic=${encodeURIComponent(topic)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setTopic('');
        fetchDecks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/learn/flashcards/pdf', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        fetchDecks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startStudying = (deck: any) => {
    setActiveDeck(deck);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <button onClick={onBack} className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest mb-4">
          &lt; Zurück zum Dashboard
        </button>
        <h2 className="text-3xl font-light text-[var(--text-primary)]">Lernkarten (Flashcards)</h2>
        <p className="text-[var(--text-secondary)] text-sm">Erstelle interaktive Karteikarten durch PDF-Upload oder Textthemen.</p>
      </div>

      {!activeDeck && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Card Creators */}
          <div className="lg:col-span-4 space-y-6">
            {/* From PDF */}
            <div className="glass-card p-6 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[var(--accent)]" /> PDF hochladen
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">Voxentia extrahiert den Text aus deinem PDF und generiert maßgeschneiderte Karteikarten.</p>
              
              <label className="w-full py-3 bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[var(--text-secondary)] rounded-[4px] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer hover:text-[var(--text-primary)] hover:bg-black/15 transition-all">
                {loading ? 'Extrahiere...' : 'PDF auswählen'}
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} disabled={loading} />
              </label>
            </div>

            {/* From Text Topic */}
            <div className="glass-card p-6 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-4">Aus Thema generieren</h3>
              <form onSubmit={generateFromTopic} className="space-y-4">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="z.B. Scrum Grundlagen, HSL Farben..."
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-[4px] bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 btn-accent rounded-[4px] text-xs font-bold uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all"
                >
                  {loading ? 'Generiere...' : 'Erstellen'}
                </button>
              </form>
            </div>
          </div>

          {/* Existing decks */}
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em]">Deine Karteikarten</h3>
            {decks.length === 0 ? (
              <div className="glass-card p-12 text-center border border-black/5 dark:border-white/5 rounded-[12px]">
                <Brain className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-sm text-center text-[var(--text-secondary)]">Noch keine Karteikartendecks vorhanden. Erstelle rechts dein erstes Deck!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {decks.map((deck) => (
                  <div 
                    key={deck.id}
                    onClick={() => startStudying(deck)}
                    className="glass-card p-6 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2 hover:border-[var(--accent)]/30 hover:bg-black/3 dark:hover:bg-white/3 cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="text-lg text-[var(--text-primary)] font-medium mb-1 truncate">{deck.topic}</h4>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Deck #{deck.id}</p>
                    </div>
                    <div className="mt-8 flex justify-between items-center border-t border-black/5 dark:border-white/5 pt-4">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">{deck.cards.length} Karten</span>
                      <span className="text-[10px] text-[var(--accent)] font-bold uppercase tracking-widest flex items-center gap-1">
                        Lernen <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeDeck && (
        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col justify-between min-h-[450px] mt-6">
          {/* Deck study header */}
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => setActiveDeck(null)}
              className="text-[9px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest"
            >
              &lt; Schließen
            </button>
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              Karte {currentIndex + 1} von {activeDeck.cards.length}
            </span>
          </div>

          {/* 3D Flip Card Container */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full aspect-[4/3] relative cursor-pointer select-none group"
            style={{ perspective: '1000px' }}
          >
            <div 
              className="w-full h-full duration-500 ease-out transition-transform"
              style={{ 
                transformStyle: 'preserve-3d', 
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
              }}
            >
              {/* Front Side */}
              <div 
                className="absolute inset-0 w-full h-full glass-card p-10 rounded-[16px] border border-black/5 dark:border-white/10 bg-black/2 dark:bg-white/2 shadow-xl flex flex-col justify-between text-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Klicken zum Wenden</div>
                <div className="flex-1 flex items-center justify-center">
                  <h3 className="text-2xl text-[var(--text-primary)] font-light leading-snug">
                    {activeDeck.cards[currentIndex].front}
                  </h3>
                </div>
                <div className="text-[9px] text-[var(--accent)] font-bold uppercase tracking-widest">Vorderseite</div>
              </div>

              {/* Back Side */}
              <div 
                className="absolute inset-0 w-full h-full glass-card p-10 rounded-[16px] border border-black/5 dark:border-white/10 bg-black/2 dark:bg-white/2 shadow-xl flex flex-col justify-between text-center"
                style={{ 
                  backfaceVisibility: 'hidden', 
                  transform: 'rotateY(180deg)' 
                }}
              >
                <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Klicken zum Wenden</div>
                <div className="flex-1 flex items-center justify-center p-4">
                  <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                    {activeDeck.cards[currentIndex].back}
                  </p>
                </div>
                <div className="text-[9px] text-[var(--success)] font-bold uppercase tracking-widest">Rückseite</div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between gap-4 mt-8">
            <button
              onClick={() => {
                if (currentIndex > 0) {
                  setCurrentIndex(currentIndex - 1);
                  setIsFlipped(false);
                }
              }}
              disabled={currentIndex === 0}
              className="flex-1 py-3 bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[var(--text-secondary)] hover:bg-black/15 hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none rounded-[4px] text-xs font-bold uppercase tracking-widest transition-all"
            >
              Vorherige
            </button>
            <button
              onClick={() => {
                if (currentIndex < activeDeck.cards.length - 1) {
                  setCurrentIndex(currentIndex + 1);
                  setIsFlipped(false);
                } else {
                  setActiveDeck(null);
                }
              }}
              className="flex-1 py-3 btn-accent rounded-[4px] text-xs font-bold uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all"
            >
              {currentIndex < activeDeck.cards.length - 1 ? 'Nächste Karte' : 'Lernen beenden'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================
   5. EXPLAIN LIKE I'M 5
   ========================================== */
function ELI5Panel({ onBack }: { onBack: () => void }) {
  const [concept, setConcept] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');

  const handleExplain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim()) return;
    setLoading(true);
    setResponse('');

    try {
      const token = localStorage.getItem('token') || '';
      // Inject ELI5 prompt inside message history
      const prompt = `Erkläre mir folgendes Konzept so, als wäre ich 5 Jahre alt (ELI5): '${concept}'`;
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: prompt,
          session_id: "eli5_temp",
          personality: "teacher",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResponse(data.text);
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
        <h2 className="text-3xl font-light text-[var(--text-primary)]">Explain like I'm 5 (ELI5)</h2>
        <p className="text-[var(--text-secondary)] text-sm">Die Kunst der einfachen Erklärung. Perfekt für komplexe Fachbegriffe.</p>
      </div>

      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="glass-card p-6 border border-black/5 dark:border-white/5 rounded-[12px] bg-black/2 dark:bg-white/2">
          <form onSubmit={handleExplain} className="flex gap-4">
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Welches Konzept soll einfach erklärt werden? (z.B. Blockchains, Relativitätstheorie...)"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-[4px] bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 btn-accent rounded-[4px] text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--accent-hover)] transition-all"
            >
              {loading ? (
                <>
                  <Zap className="w-4 h-4 animate-spin" /> Denke...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Erklären!
                </>
              )}
            </button>
          </form>
        </div>

        {response && (
          <div className="glass-card p-8 border border-black/5 dark:border-white/10 rounded-[12px] bg-[var(--accent)]/5 animate-in fade-in slide-in-from-bottom-3 leading-relaxed text-sm text-[var(--text-primary)] prose prose-invert max-w-none">
            <h4 className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse" /> Einfache Erklärung
            </h4>
            {response.split('\n\n').map((para, i) => (
              <p key={i} className="mb-4 text-base leading-relaxed text-[var(--text-secondary)]">{para}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

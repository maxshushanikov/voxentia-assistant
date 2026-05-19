import { useState } from 'react';
import {
  FileCheck,
  FileText,
  Search,
  Mic,
  MessageSquare,
  ArrowRight,
  Award,
  Play,
  Star,
} from 'lucide-react';

import { useTranslation } from '../i18n/context';
import PluginPlaceholder from './PluginPlaceholder';

type JobMode = 'dashboard' | 'cv-check' | 'cover-letter' | 'job-search' | 'interview';

export default function JobView() {
  const [mode, setMode] = useState<JobMode>('dashboard');

  const renderContent = () => {
    switch (mode) {
      case 'dashboard':
        return <Dashboard onSelect={setMode} />;
      case 'interview':
        return <InterviewSimulation onBack={() => setMode('dashboard')} />;
      default:
        return <PluginPlaceholder onBack={() => setMode('dashboard')} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">{renderContent()}</div>
  );
}

function Dashboard({ onSelect }: { onSelect: (m: JobMode) => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-12">
        <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2">{t.job_title}</h1>
        <p className="text-[var(--text-secondary)] text-sm">{t.job_subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <JobTile
          icon={<FileCheck className="w-6 h-6" />}
          title={t.job_cvCheck}
          description={t.job_cvCheckDesc}
          onClick={() => onSelect('cv-check')}
        />
        <JobTile
          icon={<FileText className="w-6 h-6" />}
          title={t.job_coverLetter}
          description={t.job_coverLetterDesc}
          onClick={() => onSelect('cover-letter')}
        />
        <JobTile
          icon={<Search className="w-6 h-6" />}
          title={t.job_jobSearch}
          description={t.job_jobSearchDesc}
          onClick={() => onSelect('job-search')}
        />
      </div>

      <section>
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-6">
          {t.job_interviewTraining}
        </h3>
        <div className="glass-card rounded-[12px] p-8 border border-black/5 dark:border-white/5 bg-gradient-to-br from-[#2979ff]/10 to-transparent relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="px-2 py-1 bg-emerald-500/20 text-emerald-500 text-[9px] font-bold uppercase tracking-widest rounded-[2px]">
                {t.common_recommended}
              </div>
              <div className="flex text-amber-400">
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
              </div>
            </div>
            <h2 className="text-2xl text-[var(--text-primary)] mb-3">{t.job_aiInterview}</h2>
            <p className="text-[var(--text-secondary)] max-w-xl mb-8">{t.job_aiInterviewDesc}</p>

            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => onSelect('interview')}
                className="flex items-center px-8 py-3 bg-[var(--accent)] text-[var(--text-primary)] rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest"
              >
                <Play className="w-4 h-4 mr-3 fill-current" />
                {t.job_startSimulation}
              </button>
              <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">
                {t.job_langsAvailable}
              </div>
            </div>
          </div>

          <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Mic className="w-64 h-64 text-[#2979ff]" />
          </div>
        </div>
      </section>
    </div>
  );
}

function JobTile({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="glass-card rounded-[8px] p-6 border border-black/5 dark:border-white/5 hover:border-[var(--accent)]/33 hover:bg-black/2 dark:hover:bg-black/2 dark:bg-white/2 transition-all cursor-pointer group"
    >
      <div className="w-12 h-12 bg-black/10 dark:bg-black/5 dark:bg-white/5 rounded-[4px] flex items-center justify-center text-[#2979ff] mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-[var(--text-primary)] font-medium mb-2 flex items-center">
        {title}
        <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </h3>
      <p className="text-[var(--text-secondary)] text-sm">{description}</p>
    </div>
  );
}

function InterviewSimulation({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'intro' | 'session' | 'feedback'>('intro');

  return (
    <div className="flex-1 flex flex-col p-8">
      <div className="flex items-center justify-between mb-12">
        <button
          type="button"
          onClick={onBack}
          className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest flex items-center"
        >
          &lt; {t.job_exitSimulation}
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            {t.job_liveSession}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center">
        {step === 'intro' && (
          <div>
            <div className="w-20 h-20 bg-[#2979ff]/10 rounded-full flex items-center justify-center mb-8 mx-auto">
              <MessageSquare className="w-10 h-10 text-[#2979ff]" />
            </div>
            <h2 className="text-3xl font-light text-[var(--text-primary)] mb-4">{t.job_recruiterSim}</h2>
            <p className="text-[var(--text-secondary)] mb-12">{t.job_recruiterIntro}</p>

            <div className="grid grid-cols-2 gap-4 mb-12">
              <div className="p-4 bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5 rounded-[4px] text-left">
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">{t.job_metrics}</p>
                <p className="text-xs text-gray-300">{t.job_metricsDesc}</p>
              </div>
              <div className="p-4 bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5 rounded-[4px] text-left">
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">{t.job_duration}</p>
                <p className="text-xs text-gray-300">{t.job_durationDesc}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep('session')}
              className="px-12 py-4 bg-[var(--accent)] text-[var(--text-primary)] rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 uppercase tracking-widest"
            >
              {t.job_beginInterview}
            </button>
          </div>
        )}

        {step === 'session' && (
          <div className="w-full">
            <div className="w-32 h-32 relative mx-auto mb-12">
              <div className="absolute inset-0 bg-[#2979ff] opacity-20 rounded-full animate-ping" />
              <div className="relative w-full h-full bg-[var(--bg-secondary)] rounded-full border-2 border-[#2979ff] flex items-center justify-center">
                <Mic className="w-12 h-12 text-[#2979ff]" />
              </div>
            </div>
            <p className="text-xl text-[var(--text-primary)] mb-4">{t.job_sampleQuestion}</p>
            <div className="flex justify-center space-x-1 mb-12">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-[#2979ff]"
                  style={{
                    height: `${Math.random() * 40 + 10}px`,
                    opacity: Math.random() * 0.5 + 0.5,
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep('feedback')}
              className="px-8 py-2 border border-rose-500/30 text-rose-500 rounded-[4px] text-[10px] font-bold hover:bg-rose-500/10 transition-all uppercase tracking-widest"
            >
              {t.job_endSession}
            </button>
          </div>
        )}

        {step === 'feedback' && (
          <div className="w-full text-left">
            <div className="flex items-center space-x-3 mb-8">
              <Award className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl text-[var(--text-primary)] font-light">{t.job_performanceReport}</h2>
            </div>

            <div className="space-y-6 mb-12">
              <MetricBar label={t.job_metricClarity} score={85} />
              <MetricBar label={t.job_metricConfidence} score={92} />
              <MetricBar label={t.job_metricExpertise} score={78} />
              <MetricBar label={t.job_metricFlow} score={88} />
            </div>

            <div className="glass-card rounded-[8px] p-6 border border-black/5 dark:border-white/5 bg-black/2 dark:bg-white/2 mb-12">
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3">
                {t.job_aiFeedback}
              </p>
              <p className="text-gray-300 text-sm italic leading-relaxed">{t.job_feedbackSample}</p>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="w-full py-4 bg-black/10 dark:bg-black/5 dark:bg-white/5 border border-black/10 dark:border-black/10 dark:border-white/10 text-[var(--text-primary)] rounded-[4px] text-xs font-bold hover:bg-black/10 dark:hover:bg-black/10 dark:bg-white/10 transition-all uppercase tracking-widest"
            >
              {t.job_returnDashboard}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2">
        <span>{label}</span>
        <span>{score}%</span>
      </div>
      <div className="w-full h-1 bg-black/10 dark:bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-[#2979ff]" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

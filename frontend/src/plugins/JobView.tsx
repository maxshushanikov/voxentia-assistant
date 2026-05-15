import { useState } from 'react';
import { 
  FileCheck, FileText, Search, Mic, MessageSquare, 
  ArrowRight, Award, Activity, Play, Star
} from 'lucide-react';

type JobMode = 'dashboard' | 'cv-check' | 'cover-letter' | 'job-search' | 'interview';

export default function JobView() {
  const [mode, setMode] = useState<JobMode>('dashboard');

  const renderContent = () => {
    switch (mode) {
      case 'dashboard': return <Dashboard onSelect={setMode} />;
      case 'interview': return <InterviewSimulation onBack={() => setMode('dashboard')} />;
      default: return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
           <div className="w-16 h-16 bg-[#2979ff]/10 rounded-full flex items-center justify-center mb-6">
              <Activity className="w-8 h-8 text-[#2979ff] animate-pulse" />
           </div>
           <h2 className="text-2xl font-light text-white mb-2">Feature in Development</h2>
           <p className="text-gray-500 max-w-md mb-8">This module is currently being integrated with our advanced LLM backend. Please check back shortly.</p>
           <button 
             onClick={() => setMode('dashboard')}
             className="px-6 py-2 border border-white/10 rounded-[4px] text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
           >
             BACK TO DASHBOARD
           </button>
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0e14] overflow-hidden">
       {renderContent()}
    </div>
  );
}

function Dashboard({ onSelect }: { onSelect: (m: JobMode) => void }) {
  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-12">
        <h1 className="text-3xl font-light text-white mb-2">Job Assistant</h1>
        <p className="text-gray-500 text-sm">Professional career management and interview preparation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <JobTile 
          icon={<FileCheck className="w-6 h-6" />} 
          title="CV Check" 
          description="AI-powered analysis of your resume against target job descriptions."
          onClick={() => onSelect('cv-check')}
        />
        <JobTile 
          icon={<FileText className="w-6 h-6" />} 
          title="Cover Letter" 
          description="Generate tailored cover letters that highlight your unique strengths."
          onClick={() => onSelect('cover-letter')}
        />
        <JobTile 
          icon={<Search className="w-6 h-6" />} 
          title="Job Search" 
          description="Real-time scraper for the latest vacancies in your field."
          onClick={() => onSelect('job-search')}
        />
      </div>

      <section>
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-[0.2em] mb-6">Interview Training</h3>
        <div className="glass-card rounded-[12px] p-8 border border-white/5 bg-gradient-to-br from-[#2979ff]/10 to-transparent relative overflow-hidden group">
           <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-4">
                 <div className="px-2 py-1 bg-emerald-500/20 text-emerald-500 text-[9px] font-bold uppercase tracking-widest rounded-[2px]">Highly Recommended</div>
                 <div className="flex text-amber-400"><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /></div>
              </div>
              <h2 className="text-2xl text-white mb-3">AI Interview Simulation</h2>
              <p className="text-gray-400 max-w-xl mb-8">Practice with Voxentia playing the role of a professional recruiter. Get real-time feedback on your clarity, confidence, and subject matter expertise.</p>
              
              <div className="flex items-center space-x-4">
                 <button 
                   onClick={() => onSelect('interview')}
                   className="flex items-center px-8 py-3 bg-[#2979ff] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                 >
                    <Play className="w-4 h-4 mr-3 fill-current" />
                    START SIMULATION
                 </button>
                 <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    Available in: English, German, Russian
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

function JobTile({ icon, title, description, onClick }: { icon: any, title: string, description: string, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="glass-card rounded-[8px] p-6 border border-white/5 hover:border-[#2979ff33] hover:bg-white/2 transition-all cursor-pointer group"
    >
       <div className="w-12 h-12 bg-white/5 rounded-[4px] flex items-center justify-center text-[#2979ff] mb-6 group-hover:scale-110 transition-transform">
          {icon}
       </div>
       <h3 className="text-white font-medium mb-2 flex items-center">
          {title}
          <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
       </h3>
       <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}

function InterviewSimulation({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'intro' | 'session' | 'feedback'>('intro');

  return (
    <div className="flex-1 flex flex-col p-8">
       <div className="flex items-center justify-between mb-12">
          <button onClick={onBack} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest flex items-center">
             &lt; Exit Simulation
          </button>
          <div className="flex items-center space-x-2">
             <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Audio Session</span>
          </div>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center">
          {step === 'intro' && (
             <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-[#2979ff]/10 rounded-full flex items-center justify-center mb-8 mx-auto">
                   <MessageSquare className="w-10 h-10 text-[#2979ff]" />
                </div>
                <h2 className="text-3xl font-light text-white mb-4">Recruiter Simulation</h2>
                <p className="text-gray-500 mb-12">Voxentia will now assume the role of a Senior HR Manager. Speak clearly and answer the questions as you would in a real interview.</p>
                
                <div className="grid grid-cols-2 gap-4 mb-12">
                   <div className="p-4 bg-white/2 border border-white/5 rounded-[4px] text-left">
                      <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">Metrics</p>
                      <p className="text-xs text-gray-300">Confidence, Clarity, Technical Depth</p>
                   </div>
                   <div className="p-4 bg-white/2 border border-white/5 rounded-[4px] text-left">
                      <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">Duration</p>
                      <p className="text-xs text-gray-300">~ 15 Minutes</p>
                   </div>
                </div>

                <button 
                  onClick={() => setStep('session')}
                  className="px-12 py-4 bg-[#2979ff] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20"
                >
                   BEGIN INTERVIEW
                </button>
             </div>
          )}

          {step === 'session' && (
             <div className="w-full">
                <div className="w-32 h-32 relative mx-auto mb-12">
                   <div className="absolute inset-0 bg-[#2979ff] opacity-20 rounded-full animate-ping"></div>
                   <div className="relative w-full h-full bg-[#161821] rounded-full border-2 border-[#2979ff] flex items-center justify-center">
                      <Mic className="w-12 h-12 text-[#2979ff]" />
                   </div>
                </div>
                <p className="text-xl text-white mb-4">"Tell me about a difficult technical challenge you've faced..."</p>
                <div className="flex justify-center space-x-1 mb-12">
                   {[...Array(20)].map((_, i) => (
                      <div key={i} className="w-1 bg-[#2979ff]" style={{ height: `${Math.random() * 40 + 10}px`, opacity: Math.random() * 0.5 + 0.5 }}></div>
                   ))}
                </div>
                <button 
                  onClick={() => setStep('feedback')}
                  className="px-8 py-2 border border-rose-500/30 text-rose-500 rounded-[4px] text-[10px] font-bold hover:bg-rose-500/10 transition-all uppercase tracking-widest"
                >
                   End Session & View Feedback
                </button>
             </div>
          )}

          {step === 'feedback' && (
             <div className="w-full text-left animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center space-x-3 mb-8">
                   <Award className="w-6 h-6 text-amber-400" />
                   <h2 className="text-2xl text-white font-light">Performance Report</h2>
                </div>
                
                <div className="space-y-6 mb-12">
                   <MetricBar label="Clarity" score={85} />
                   <MetricBar label="Confidence" score={92} />
                   <MetricBar label="Subject Expertise" score={78} />
                   <MetricBar label="Language Flow" score={88} />
                </div>

                <div className="glass-card rounded-[8px] p-6 border border-white/5 bg-white/2 mb-12">
                   <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">AI Feedback</p>
                   <p className="text-gray-300 text-sm italic leading-relaxed">
                      "You demonstrated exceptional confidence and flow. However, your explanation of the technical challenge could be more specific. Try to use the STAR method (Situation, Task, Action, Result) to provide more concrete evidence of your skills."
                   </p>
                </div>

                <button 
                  onClick={onBack}
                  className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-[4px] text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                   Return to Career Dashboard
                </button>
             </div>
          )}
       </div>
    </div>
  );
}

function MetricBar({ label, score }: { label: string, score: number }) {
  return (
    <div>
       <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
          <span>{label}</span>
          <span>{score}%</span>
       </div>
       <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-[#2979ff]" style={{ width: `${score}%` }}></div>
       </div>
    </div>
  );
}

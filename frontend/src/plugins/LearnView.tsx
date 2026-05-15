import { BookOpen, GraduationCap, Play, Clock, BarChart3 } from 'lucide-react';

export default function LearnView() {
  const courses = [
    { title: 'Advanced React Patterns', progress: 65, lessons: 12, time: '4h 30m' },
    { title: 'Machine Learning Basics', progress: 30, lessons: 8, time: '6h 15m' },
    { title: 'UI/UX Principles', progress: 90, lessons: 15, time: '3h 45m' },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">Learn Assistant</h1>
          <p className="text-gray-500 text-sm">Expand your knowledge with AI-driven learning paths.</p>
        </div>
        <div className="flex space-x-4">
           <div className="glass-card px-4 py-2 rounded-[4px] border border-white/5 flex items-center">
             <BarChart3 className="w-4 h-4 text-[#2979ff] mr-3" />
             <div>
               <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Learning Points</p>
               <p className="text-white text-sm font-bold">1,250</p>
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <section>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-[0.2em] mb-4">Your Courses</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, i) => (
              <div key={i} className="glass-card rounded-[8px] p-6 border border-white/5 hover:border-[#2979ff33] transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <GraduationCap className="w-16 h-16" />
                </div>
                
                <h4 className="text-white font-medium mb-4 group-hover:text-[#2979ff] transition-colors">{course.title}</h4>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#2979ff] transition-all duration-500" 
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-3">
                    <div className="flex items-center text-[10px] text-gray-600 font-bold uppercase">
                      <BookOpen className="w-3 h-3 mr-1" />
                      {course.lessons}
                    </div>
                    <div className="flex items-center text-[10px] text-gray-600 font-bold uppercase">
                      <Clock className="w-3 h-3 mr-1" />
                      {course.time}
                    </div>
                  </div>
                  <button className="p-2 bg-white/5 rounded-full hover:bg-[#2979ff] hover:text-white transition-all">
                    <Play className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-[8px] p-8 border border-white/5 bg-[#2979ff]/5">
           <div className="max-w-2xl">
              <h3 className="text-xl text-white mb-2 font-medium">Continue where you left off</h3>
              <p className="text-gray-400 text-sm mb-6">You were recently studying "Advanced React Patterns". Would you like to resume with the next lesson on "Higher Order Components"?</p>
              <button className="px-6 py-2.5 bg-[#2979ff] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg">
                RESUME LEARNING
              </button>
           </div>
        </section>
      </div>
    </div>
  );
}

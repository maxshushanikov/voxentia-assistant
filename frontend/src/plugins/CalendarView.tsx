import { Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';

export default function CalendarView() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dates = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">Calendar</h1>
          <p className="text-gray-500 text-sm">Manage your schedule and appointments.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-[#2979ff] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          NEW EVENT
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Calendar Card */}
        <div className="lg:col-span-2 glass-card rounded-[8px] p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-medium text-white">May 2026</h3>
             <div className="flex space-x-2">
               <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><CalendarIcon className="w-4 h-4" /></button>
             </div>
          </div>
          
          <div className="grid grid-cols-7 gap-2 text-center mb-4">
            {days.map(day => (
              <div key={day} className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {dates.map(date => (
              <div 
                key={date} 
                className={`aspect-square flex items-center justify-center text-sm rounded-[4px] transition-all cursor-pointer
                  ${date === 15 ? 'bg-[#2979ff] text-white font-bold' : 'text-gray-400 hover:bg-white/5'}
                `}
              >
                {date}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar / Upcoming Events */}
        <div className="space-y-6">
          <div className="glass-card rounded-[8px] p-6 border border-white/5">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Upcoming Events</h3>
            <div className="space-y-4">
              <EventItem time="10:00 AM" title="Strategy Meeting" color="#2979ff" />
              <EventItem time="02:30 PM" title="Design Review" color="#f43f5e" />
              <EventItem time="04:00 PM" title="Client Call" color="#10b981" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventItem({ time, title, color }: { time: string, title: string, color: string }) {
  return (
    <div className="flex items-start space-x-4 p-3 rounded-[4px] hover:bg-white/5 transition-colors cursor-pointer group">
      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: color }}></div>
      <div>
        <p className="text-white text-sm font-medium group-hover:text-[#2979ff] transition-colors">{title}</p>
        <div className="flex items-center text-gray-500 text-[10px] mt-1">
          <Clock className="w-3 h-3 mr-1" />
          {time}
        </div>
      </div>
    </div>
  );
}

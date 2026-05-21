import { useState } from 'react';
import { Clock, Plus, LayoutGrid, List, X, MapPin, AlignLeft, ChevronLeft, ChevronRight } from 'lucide-react';

import { asStringArray } from '../i18n';
import { useTranslation } from '../i18n/context';

type CalendarTab = 'calendar' | 'events';
type CalendarViewMode = 'day' | 'week' | 'month';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  description: string;
  color: string;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Get Monday of the week for a given date
function getMondayOfWeek(d: Date): Date {
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  return monday;
}

export default function CalendarView() {
  const { t } = useTranslation();
  const MONTHS = asStringArray(t.cal_months);
  const WEEKDAYS_SHORT = asStringArray(t.cal_weekdaysShort);
  const WEEKDAYS_LONG = asStringArray(t.cal_weekdaysLong);
  const [activeTab, setActiveTab] = useState<CalendarTab>('calendar');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Canonical "current" date used for navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [events] = useState<CalendarEvent[]>([
    { id: '1', title: 'Strategy Meeting', date: toISO(new Date()), time: '10:00 AM', location: 'Meeting Room A', description: 'Quarterly strategy planning.', color: '#2979ff' },
    { id: '2', title: 'Design Review', date: toISO(new Date()), time: '02:30 PM', location: 'Virtual', description: 'Reviewing the new avatar models.', color: '#f43f5e' },
    { id: '3', title: 'Workshop', date: toISO(new Date(new Date().getTime() - 2*86400000)), time: '11:00 AM', location: 'Slack', description: 'Team building workshop.', color: '#10b981' }
  ]);

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const navigate = (delta: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + delta);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + delta * 7);
    } else {
      d.setDate(d.getDate() + delta);
    }
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  // ─── Header label ─────────────────────────────────────────────────────────────

  const getHeaderLabel = () => {
    if (viewMode === 'month') {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === 'week') {
      const monday = getMondayOfWeek(currentDate);
      const sunday = new Date(monday.getTime() + 6*86400000);
      const wn = getWeekNumber(currentDate);
      return `Week ${wn} — ${MONTHS[monday.getMonth()].slice(0,3)} ${monday.getDate()} – ${monday.getMonth() !== sunday.getMonth() ? MONTHS[sunday.getMonth()].slice(0,3) + ' ' : ''}${sunday.getDate()}, ${sunday.getFullYear()}`;
    } else {
      const dow = WEEKDAYS_LONG[(currentDate.getDay() + 6) % 7];
      return `${dow}, ${MONTHS[currentDate.getMonth()].slice(0,3)} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    }
  };

  const todayLabel = viewMode === 'week' ? t.common_thisWeek : t.common_today;

  // ─── Month view data ──────────────────────────────────────────────────────────

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0).getDate();
  const startPad = (monthStart.getDay() + 6) % 7; // Mon=0
  const monthDates: (number|null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  // ─── Week view data ───────────────────────────────────────────────────────────

  const weekMonday = getMondayOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekMonday.getTime() + i*86400000);
    return d;
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const today = new Date();
  const todayISO = toISO(today);

  // ─── Nav bar (shared by all views) ───────────────────────────────────────────

  const NavBar = () => (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-black/10 dark:hover:bg-black/10 dark:bg-white/10 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-medium text-[var(--text-primary)] min-w-[260px] text-center select-none">
          {getHeaderLabel()}
        </h3>
        <button
          onClick={() => navigate(1)}
          className="w-8 h-8 flex items-center justify-center rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-black/10 dark:hover:bg-black/10 dark:bg-white/10 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <button
        onClick={goToToday}
        className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] hover:text-blue-400 transition-colors px-3 py-1 rounded-[4px] border border-[var(--accent)]/33 hover:border-[var(--accent)]/66"
      >
        {todayLabel}
      </button>
    </div>
  );

  // ─── Views ───────────────────────────────────────────────────────────────────

  const renderView = () => {
    if (viewMode === 'day') {
      const dayISO = toISO(currentDate);
      const dayEvents = events.filter(e => e.date === dayISO);
      return (
        <div className="w-full glass-card rounded-[8px] p-8 border border-black/5 dark:border-white/5">
          <NavBar />
          <div className="space-y-0 divide-y divide-black/5 dark:divide-white/5">
            {Array.from({ length: 24 }).map((_, i) => {
              const hour = i;
              const label = `${hour.toString().padStart(2,'0')}:00`;
              return (
                <div
                  key={i}
                  className="flex py-3 group cursor-pointer"
                  onDoubleClick={openCreateModal}
                >
                  <div className="w-16 shrink-0 text-[10px] font-bold text-[var(--text-secondary)] uppercase pt-1">{label}</div>
                  <div className="flex-1 min-h-[56px] rounded-[4px] hover:bg-black/2 dark:hover:bg-black/2 dark:bg-white/2 transition-all p-1 space-y-1">
                    {dayEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={(e) => handleEventClick(ev, e)}
                        className="px-3 py-1.5 rounded-[4px] text-xs font-medium text-white cursor-pointer hover:brightness-110 transition-all"
                        style={{ backgroundColor: `${ev.color}33`, borderLeft: `3px solid ${ev.color}` }}
                      >
                        <span className="font-bold">{ev.time}</span> · {ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (viewMode === 'week') {
      return (
        <div className="w-full glass-card rounded-[8px] border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="p-8 border-b border-black/5 dark:border-white/5">
            <NavBar />
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-8 divide-x divide-black/5 dark:divide-white/5 border-b border-black/5 dark:border-white/5">
            <div className="p-3 bg-black/2 dark:bg-white/2" />
            {weekDays.map((day, i) => {
              const isToday = toISO(day) === todayISO;
              return (
                <div key={i} className="p-3 text-center bg-black/2 dark:bg-white/2">
                  <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase mb-1">{WEEKDAYS_SHORT[i]}</p>
                  <p className={`text-sm font-bold ${isToday ? 'text-[#2979ff]' : 'text-white'}`}>{day.getDate()}</p>
                </div>
              );
            })}
          </div>
          {/* Time slots */}
          <div className="grid grid-cols-8 divide-x divide-black/5 dark:divide-white/5 max-h-[520px] overflow-y-auto custom-scrollbar">
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="h-16 p-2 text-[9px] font-bold text-[var(--text-secondary)] text-right">{i.toString().padStart(2,'0')}:00</div>
              ))}
            </div>
            {weekDays.map((day, i) => {
              const dayISO = toISO(day);
              const dayEvents = events.filter(e => e.date === dayISO);
              const isToday = dayISO === todayISO;
              return (
                <div
                  key={i}
                  className={`divide-y divide-black/5 dark:divide-white/5 relative ${isToday ? 'bg-[#2979ff06]' : ''}`}
                  onDoubleClick={openCreateModal}
                >
                  {Array.from({ length: 24 }).map((_, j) => (
                    <div key={j} className="h-16 hover:bg-black/2 dark:hover:bg-black/2 dark:bg-white/2 transition-colors relative">
                      {j === 0 && dayEvents.length > 0 && dayEvents.map(ev => (
                        <div
                          key={ev.id}
                          onClick={(e) => handleEventClick(ev, e)}
                          className="absolute left-1 right-1 top-1 px-2 py-1 rounded-[2px] text-[9px] font-bold text-white cursor-pointer z-10 truncate"
                          style={{ backgroundColor: `${ev.color}cc` }}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Month view (default)
    return (
      <div className="w-full glass-card rounded-[8px] p-8 border border-black/5 dark:border-white/5">
        <NavBar />
        <div className="grid grid-cols-7 text-center mb-0">
          {WEEKDAYS_SHORT.map(day => (
            <div key={day} className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest py-3 border-b border-black/5 dark:border-white/5">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-t border-black/5 dark:border-white/5">
          {monthDates.map((date, i) => {
            const dateStr = date
              ? `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(date).padStart(2,'0')}`
              : '';
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = dateStr === todayISO;

            return (
              <div
                key={i}
                onDoubleClick={() => date && openCreateModal()}
                className={`aspect-square flex flex-col items-start p-2 border-r border-b border-black/5 dark:border-white/5 transition-all cursor-pointer
                  ${date ? 'hover:bg-black/2 dark:hover:bg-black/2 dark:bg-white/2' : 'bg-black/10 dark:bg-black/5'}
                  ${isToday ? 'bg-[#2979ff]/5' : ''}
                `}
              >
                {date && (
                  <>
                    <span className={`text-[10px] mb-1 font-medium ${isToday ? 'text-[#2979ff] font-bold' : 'text-[var(--text-secondary)]'}`}>{date}</span>
                    <div className="w-full space-y-0.5 overflow-hidden">
                      {dayEvents.map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => handleEventClick(event, e)}
                          className="w-full px-1.5 py-0.5 rounded-[2px] text-[8px] font-bold truncate text-white/90"
                          style={{ backgroundColor: `${event.color}33`, borderLeft: `2px solid ${event.color}` }}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">
      <div className="p-8 pb-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2">{t.cal_title}</h1>
            <p className="text-[var(--text-secondary)] text-sm">{t.cal_subtitle}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex bg-black/10 dark:bg-black/5 dark:bg-black/10 dark:bg-black/5 dark:bg-white/5 border border-black/10 dark:border-black/10 dark:border-white/10 rounded-[4px] p-1">
              <ViewButton active={viewMode === 'day'} onClick={() => setViewMode('day')} label={t.common_day} />
              <ViewButton active={viewMode === 'week'} onClick={() => setViewMode('week')} label={t.common_week} />
              <ViewButton active={viewMode === 'month'} onClick={() => setViewMode('month')} label={t.common_month} />
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center px-4 py-2 bg-[var(--accent)] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.cal_newEvent}
            </button>
          </div>
        </div>

        <div className="flex border-b border-black/5 dark:border-white/5">
          <TabButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<LayoutGrid className="w-4 h-4" />} label={t.cal_tabCalendar} />
          <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={<List className="w-4 h-4" />} label={t.cal_tabEvents} />
        </div>
      </div>

      <div className="flex-1 p-8 pt-4 overflow-y-auto custom-scrollbar">
        {activeTab === 'calendar' ? renderView() : (
          <div className="max-w-4xl space-y-4">
            {events.map(event => (
              <EventListItem
                key={event.id}
                date={event.date}
                time={event.time}
                title={event.title}
                location={event.location}
                color={event.color}
                onClick={(e) => handleEventClick(event, e)}
              />
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <EventModal
          event={selectedEvent}
          onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }}
          defaultDate={toISO(currentDate)}
        />
      )}
    </div>
  );
}

function EventModal({ event, onClose, defaultDate }: { event: CalendarEvent | null, onClose: () => void, defaultDate: string }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-card rounded-[12px] border border-black/10 dark:border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/2 dark:bg-white/2">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">{event ? '{t.cal_eventDetails}' : '{t.cal_createEvent}'}</h3>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">{t.cal_eventTitle}</label>
            <input
              type="text"
              defaultValue={event?.title || ''}
              placeholder={t.cal_eventTitlePh}
              className="w-full bg-black/10 dark:bg-black/5 dark:bg-white/5 border border-black/10 dark:border-black/10 dark:border-white/10 rounded-[4px] p-3 text-sm text-white focus:outline-none focus:border-[var(--accent)]/55 transition-all"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">{t.common_date}</label>
              <input type="date" defaultValue={event?.date || defaultDate} className="w-full bg-black/10 dark:bg-black/5 dark:bg-white/5 border border-black/10 dark:border-black/10 dark:border-white/10 rounded-[4px] p-3 text-xs text-white focus:outline-none focus:border-[var(--accent)]/55 transition-all [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">{t.cal_time}</label>
              <input type="time" defaultValue={event?.time || '10:00'} className="w-full bg-black/10 dark:bg-black/5 dark:bg-white/5 border border-black/10 dark:border-black/10 dark:border-white/10 rounded-[4px] p-3 text-xs text-white focus:outline-none focus:border-[var(--accent)]/55 transition-all [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">{t.cal_location}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input type="text" defaultValue={event?.location || ''} placeholder={t.cal_locationPh} className="w-full bg-black/10 dark:bg-black/5 dark:bg-white/5 border border-black/10 dark:border-black/10 dark:border-white/10 rounded-[4px] p-3 pl-10 text-sm text-white focus:outline-none focus:border-[var(--accent)]/55 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">{t.cal_description}</label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-[var(--text-secondary)]" />
              <textarea defaultValue={event?.description || ''} placeholder={t.cal_descriptionPh} className="w-full bg-black/10 dark:bg-black/5 dark:bg-white/5 border border-black/10 dark:border-black/10 dark:border-white/10 rounded-[4px] p-3 pl-10 text-sm text-white focus:outline-none focus:border-[var(--accent)]/55 transition-all h-24 resize-none" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-black/2 dark:bg-white/2 border-t border-black/5 dark:border-white/5 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest">{t.common_cancel}</button>
          <button className="px-6 py-2 bg-[var(--accent)] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest">
            {event ? t.common_update : t.common_create}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all relative ${active ? 'text-[#2979ff]' : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)]'}`}>
      <span className="mr-3">{icon}</span>
      {label}
      {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2979ff]" />}
    </button>
  );
}

function ViewButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button onClick={onClick} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-[2px] transition-all ${active ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
      {label}
    </button>
  );
}

function EventListItem({ date, time, title, location, color, onClick }: { date: string, time: string, title: string, location: string, color: string, onClick: (e: React.MouseEvent) => void }) {
  return (
    <div onClick={onClick} className="glass-card rounded-[8px] p-5 border border-black/5 dark:border-white/5 hover:border-[var(--accent)]/33 transition-all cursor-pointer group flex items-center space-x-6">
      <div className="w-1 h-12 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1">
        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-1">{date}</p>
        <h4 className="text-[var(--text-primary)] font-medium group-hover:text-[var(--accent)] transition-colors">{title}</h4>
      </div>
      <div className="text-right">
        <div className="flex items-center justify-end text-[var(--text-secondary)] text-xs mb-1">
          <Clock className="w-3 h-3 mr-2" />
          {time}
        </div>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest">{location}</p>
      </div>
    </div>
  );
}

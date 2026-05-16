from pathlib import Path

path = Path(__file__).resolve().parents[1] / "frontend/src/plugins/CalendarView.tsx"
c = path.read_text(encoding="utf-8")

if "useTranslation" not in c:
    c = c.replace(
        "import { Clock, Plus, LayoutGrid, List, X, MapPin, AlignLeft, ChevronLeft, ChevronRight } from 'lucide-react';",
        "import { Clock, Plus, LayoutGrid, List, X, MapPin, AlignLeft, ChevronLeft, ChevronRight } from 'lucide-react';\n\n"
        "import { asStringArray } from '../i18n';\n"
        "import { useTranslation } from '../i18n/context';",
    )

old_const = """const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const WEEKDAYS_LONG = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

"""
c = c.replace(old_const, "")

needle = "export default function CalendarView() {"
if "const { t } = useTranslation()" not in c:
    c = c.replace(
        needle,
        needle
        + "\n  const { t } = useTranslation();\n"
        + "  const MONTHS = asStringArray(t.cal_months);\n"
        + "  const WEEKDAYS_SHORT = asStringArray(t.cal_weekdaysShort);\n"
        + "  const WEEKDAYS_LONG = asStringArray(t.cal_weekdaysLong);",
    )

repls = [
    ("const todayLabel = viewMode === 'week' ? 'This Week' : 'Today';", "const todayLabel = viewMode === 'week' ? t.common_thisWeek : t.common_today;"),
    ("Professional scheduling and event management.", "{t.cal_subtitle}"),
    (">Calendar</h1>", ">{t.cal_title}</h1>"),
    ('label="Day"', "label={t.common_day}"),
    ('label="Week"', "label={t.common_week}"),
    ('label="Month"', "label={t.common_month}"),
    ("NEW EVENT", "{t.cal_newEvent}"),
    ('label="Calendar"', "label={t.cal_tabCalendar}"),
    ('label="Events"', "label={t.cal_tabEvents}"),
    ("Event Details", "{t.cal_eventDetails}"),
    ("Create New Event", "{t.cal_createEvent}"),
    ("Event Title", "{t.cal_eventTitle}"),
    ('placeholder="e.g. Weekly Sync"', "placeholder={t.cal_eventTitlePh}"),
    (">Date</label>", ">{t.common_date}</label>"),
    (">Time</label>", ">{t.cal_time}</label>"),
    (">Location</label>", ">{t.cal_location}</label>"),
    ('placeholder="Add location"', "placeholder={t.cal_locationPh}"),
    (">Description</label>", ">{t.cal_description}</label>"),
    ('placeholder="Add details..."', "placeholder={t.cal_descriptionPh}"),
    (">Cancel</button>", ">{t.common_cancel}</button>"),
    ("{event ? 'Update' : 'Create'}", "{event ? t.common_update : t.common_create}"),
]
for a, b in repls:
    c = c.replace(a, b)

if "function EventModal" in c and "const { t } = useTranslation();" not in c.split("function EventModal")[1][:300]:
    c = c.replace(
        "function EventModal({ event, onClose, defaultDate }: { event: CalendarEvent | null, onClose: () => void, defaultDate: string }) {",
        "function EventModal({ event, onClose, defaultDate }: { event: CalendarEvent | null, onClose: () => void, defaultDate: string }) {\n  const { t } = useTranslation();",
    )

path.write_text(c, encoding="utf-8")
print("patched", path)

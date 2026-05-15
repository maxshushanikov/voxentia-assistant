import {
  Calendar, FileText, BookOpen, Briefcase, FolderRoot, Target
} from 'lucide-react';
import CalendarView from './CalendarView';
import NotesView from './NotesView';
import LearnView from './LearnView';
import JobView from './JobView';
import DocumentView from './DocumentView';
import ProjectPlanningView from './ProjectPlanningView';
import type { ReactNode } from 'react';

export interface PluginDefinition {
  id: string;
  nameKey: string; // Key for translations or literal name
  icon: ReactNode;
  component: ReactNode;
}

export const plugins: PluginDefinition[] = [
  {
    id: 'calendar',
    nameKey: 'calendar',
    icon: <Calendar className="w-4 h-4" />,
    component: <CalendarView />
  },
  {
    id: 'learn',
    nameKey: 'learn',
    icon: <BookOpen className="w-4 h-4" />,
    component: <LearnView />
  },
  {
    id: 'jobs',
    nameKey: 'jobs',
    icon: <Briefcase className="w-4 h-4" />,
    component: <JobView />
  },
  {
    id: 'docs',
    nameKey: 'docs',
    icon: <FolderRoot className="w-4 h-4" />,
    component: <DocumentView />
  },
  {
    id: 'notes',
    nameKey: 'notes',
    icon: <FileText className="w-4 h-4" />,
    component: <NotesView />
  },
  {
    id: 'project',
    nameKey: 'project',
    icon: <Target className="w-4 h-4" />,
    component: <ProjectPlanningView />
  }
];

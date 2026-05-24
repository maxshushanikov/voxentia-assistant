import {
  Brain,
  Calendar,
  BookOpen,
  Briefcase,
  FolderRoot,
  FileText,
  Package,
  Target,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import CalendarView from './CalendarView';
import LearnView from './LearnView';
import JobView from './JobView';
import DocumentView from './DocumentView';
import NotesView from './NotesView';
import ProjectPlanningView from './ProjectPlanningView';
import KnowledgeView from './KnowledgeView';
import MarketplaceView from './MarketplaceView';

export interface PluginQuickCommand {
  id: string;
  labelKey: string;
  keywords: string[];
}

export interface PluginDefinition {
  id: string;
  nameKey: string;
  icon: ReactNode;
  component: ComponentType;
  quickCommands?: PluginQuickCommand[];
}

export const plugins: PluginDefinition[] = [
  {
    id: 'calendar',
    nameKey: 'calendar',
    icon: <Calendar className="w-4 h-4" />,
    component: CalendarView,
  },
  {
    id: 'learn',
    nameKey: 'learn',
    icon: <BookOpen className="w-4 h-4" />,
    component: LearnView,
    quickCommands: [
      { id: 'learn-flashcards', labelKey: 'cmd_learn_flashcards', keywords: ['flashcard', 'karteikarten', 'learn'] },
      { id: 'learn-summarize', labelKey: 'cmd_learn_summarize', keywords: ['summarize', 'zusammenfassung', 'summary'] },
      { id: 'learn-quiz', labelKey: 'cmd_learn_quiz', keywords: ['quiz', 'test', 'abfrage'] },
    ],
  },
  {
    id: 'jobs',
    nameKey: 'jobs',
    icon: <Briefcase className="w-4 h-4" />,
    component: JobView,
  },
  {
    id: 'docs',
    nameKey: 'docs',
    icon: <FolderRoot className="w-4 h-4" />,
    component: DocumentView,
  },
  {
    id: 'notes',
    nameKey: 'notes',
    icon: <FileText className="w-4 h-4" />,
    component: NotesView,
  },
  {
    id: 'project',
    nameKey: 'project',
    icon: <Target className="w-4 h-4" />,
    component: ProjectPlanningView,
  },
  {
    id: 'knowledge',
    nameKey: 'knowledge',
    icon: <Brain className="w-4 h-4" />,
    component: KnowledgeView,
  },
  {
    id: 'marketplace',
    nameKey: 'marketplace',
    icon: <Package className="w-4 h-4" />,
    component: MarketplaceView,
  },
];

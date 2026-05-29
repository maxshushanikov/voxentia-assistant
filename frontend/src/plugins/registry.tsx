import {
  Brain,
  Calendar,
  BookOpen,
  Briefcase,
  FolderRoot,
  FileText,
  Package,
  Target,
  Eye,
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
import VisionView from './VisionView';

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
  badge?: string;
  descriptionKey?: string;
  status?: string;
  capabilities?: string[];
  triggers?: string[];
}

export const plugins: PluginDefinition[] = [
  {
    id: 'calendar',
    nameKey: 'calendar',
    icon: <Calendar className="w-4 h-4" />,
    component: CalendarView,
    badge: '3',
  },
  {
    id: 'learn',
    nameKey: 'learn',
    icon: <BookOpen className="w-4 h-4" />,
    component: LearnView,
    badge: '2',
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
    badge: '4',
  },
  {
    id: 'docs',
    nameKey: 'docs',
    icon: <FolderRoot className="w-4 h-4" />,
    component: DocumentView,
    badge: '1',
  },
  {
    id: 'notes',
    nameKey: 'notes',
    icon: <FileText className="w-4 h-4" />,
    component: NotesView,
    badge: '7',
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
    badge: 'New',
  },
  {
    id: 'vision',
    nameKey: 'vision',
    icon: <Eye className="w-4 h-4" />,
    component: VisionView,
    badge: 'Beta',
  },
  {
    id: 'marketplace',
    nameKey: 'marketplace',
    icon: <Package className="w-4 h-4" />,
    component: MarketplaceView,
    badge: 'Pro',
  },
];

export type RemotePluginMetadata = {
  id: string;
  name?: string;
  version?: string;
  status?: string;
  enabled?: boolean;
  description?: string;
  intents?: string[];
  capabilities?: string[];
  triggers?: string[];
  permissions?: string[];
};

export const getPluginDefinition = (id: string) => plugins.find((plugin) => plugin.id === id);

export const getPluginDisplayName = (id: string, remotePlugins: RemotePluginMetadata[]) => {
  const meta = remotePlugins.find((plugin) => plugin.id === id);
  return meta?.name || id;
};

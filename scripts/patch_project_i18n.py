from pathlib import Path

path = Path(__file__).resolve().parents[1] / "frontend/src/plugins/ProjectPlanningView.tsx"
c = path.read_text(encoding="utf-8")

if "useTranslation" not in c:
    c = c.replace(
        "import { LayoutGrid, Target, Zap, MoreVertical, Plus } from 'lucide-react';\n\n",
        "import { LayoutGrid, Target, Zap, MoreVertical, Plus } from 'lucide-react';\n\n"
        "import { useTranslation } from '../i18n/context';\n\n",
    )
    c = c.replace(
        "export default function ProjectPlanningView() {",
        "export default function ProjectPlanningView() {\n"
        "  const { t } = useTranslation();\n"
        "  const statusLabel = (s: string) =>\n"
        "    ({\n"
        '      "In Progress": t.project_inProgress,\n'
        "      Planning: t.project_planning,\n"
        "      Review: t.project_review,\n"
        "    } as Record<string, string>)[s] ?? s;\n",
    )
    c = c.replace("Project Planning", "{t.project_title}")
    c = c.replace("Strategic roadmap and project orchestration.", "{t.project_subtitle}")
    c = c.replace("CREATE PROJECT", "{t.project_create}")
    c = c.replace('label="ACTIVE PROJECTS"', "label={t.project_activeProjects}")
    c = c.replace('label="TOTAL TASKS"', "label={t.project_totalTasks}")
    c = c.replace('label="TEAM MEMBERS"', "label={t.project_teamMembers}")
    c = c.replace('label="EFFICIENCY"', "label={t.project_efficiency}")
    c = c.replace(
        '<span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{p.status}</span>',
        '<span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{statusLabel(p.status)}</span>',
    )

path.write_text(c, encoding="utf-8")
print("done project")

import { Download, Trash2, Upload, FileText, FileCode } from 'lucide-react';
import { useTranslation } from '../i18n/context';

export default function DocumentView() {
  const { t } = useTranslation();
  const documents = [
    { name: 'Research_Paper_v2.pdf', size: '4.2 MB', type: 'PDF', date: 'May 14, 2026' },
    { name: 'System_Architecture.png', size: '1.8 MB', type: 'IMG', date: 'May 12, 2026' },
    { name: 'main_controller.py', size: '12 KB', type: 'CODE', date: 'May 10, 2026' },
    { name: 'Budget_Q2.xlsx', size: '850 KB', type: 'XLS', date: 'May 08, 2026' },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">{t.docs_title}</h1>
          <p className="text-gray-500 text-sm">{t.docs_subtitle}</p>
        </div>
        <button
          type="button"
          className="flex items-center px-4 py-2 bg-[#2979ff] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg uppercase tracking-widest"
        >
          <Upload className="w-4 h-4 mr-2" />
          {t.common_uploadFile}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label={t.docs_totalStorage} value="2.4 GB" sub={t.docs_storageSub} />
        <StatCard label={t.docs_files} value="128" sub={t.docs_filesSub} />
        <StatCard label={t.docs_folders} value="14" sub={t.docs_foldersSub} />
      </div>

      <div className="glass-card rounded-[8px] border border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/2">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                {t.common_name}
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                {t.common_size}
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                {t.common_date}
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] text-right">
                {t.common_actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {documents.map((doc, i) => (
              <tr key={i} className="hover:bg-white/2 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {getFileIcon(doc.type)}
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors ml-3">
                      {doc.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">{doc.size}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{doc.date}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      className="p-2 text-gray-600 hover:text-[#2979ff] transition-colors rounded-full hover:bg-[#2979ff]/10"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-gray-600 hover:text-red-500 transition-colors rounded-full hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass-card rounded-[8px] p-5 border border-white/5">
      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl text-white font-light mb-1">{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}

function getFileIcon(type: string) {
  switch (type) {
    case 'CODE':
      return <FileCode className="w-4 h-4 text-amber-500" />;
    default:
      return <FileText className="w-4 h-4 text-[#2979ff]" />;
  }
}

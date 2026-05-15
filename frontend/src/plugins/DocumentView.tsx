import { File, Download, Trash2, Upload, FileText, FileCode } from 'lucide-react';

export default function DocumentView() {
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
          <h1 className="text-3xl font-light text-white mb-2">Document Manager</h1>
          <p className="text-gray-500 text-sm">Store, organize and analyze your personal assets.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-[#2979ff] text-white rounded-[4px] text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg">
          <Upload className="w-4 h-4 mr-2" />
          UPLOAD FILE
        </button>
      </div>

      <div className="glass-card rounded-[8px] border border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/2">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Name</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Size</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Date</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {documents.map((doc, i) => (
              <tr key={i} className="hover:bg-white/2 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {getFileIcon(doc.type)}
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{doc.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">{doc.size}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{doc.date}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button className="p-2 text-gray-600 hover:text-[#2979ff] transition-colors rounded-full hover:bg-[#2979ff]/10">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-red-500 transition-colors rounded-full hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
         <StatsCard label="TOTAL STORAGE" value="1.2 GB" sub="of 5 GB used" />
         <StatsCard label="FILES" value="124" sub="+12 this month" />
         <StatsCard label="FOLDERS" value="8" sub="organized" />
      </div>
    </div>
  );
}

function getFileIcon(type: string) {
  switch (type) {
    case 'PDF': return <FileText className="w-4 h-4 text-red-500 mr-3" />;
    case 'CODE': return <FileCode className="w-4 h-4 text-emerald-500 mr-3" />;
    case 'IMG': return <File className="w-4 h-4 text-purple-500 mr-3" />;
    default: return <File className="w-4 h-4 text-[#2979ff] mr-3" />;
  }
}

function StatsCard({ label, value, sub }: { label: string, value: string, sub: string }) {
  return (
    <div className="glass-card rounded-[8px] p-6 border border-white/5">
       <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">{label}</p>
       <p className="text-2xl text-white font-light mb-1">{value}</p>
       <p className="text-[10px] text-gray-500">{sub}</p>
    </div>
  );
}

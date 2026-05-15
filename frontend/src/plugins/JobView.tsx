import { Briefcase, MapPin, DollarSign, ExternalLink, Filter } from 'lucide-react';

export default function JobView() {
  const jobs = [
    { title: 'Senior Frontend Engineer', company: 'TechNova', location: 'Remote / Berlin', salary: '$90k - $120k', tags: ['React', 'TypeScript', 'Node.js'] },
    { title: 'Product Designer', company: 'CreativeFlow', location: 'London, UK', salary: '£60k - £85k', tags: ['Figma', 'UI/UX', 'Prototyping'] },
    { title: 'Full Stack Developer', company: 'Global Solutions', location: 'Remote', salary: '$80k - $110k', tags: ['Next.js', 'PostgreSQL', 'AWS'] },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">Job Assistant</h1>
          <p className="text-gray-500 text-sm">Discover career opportunities tailored to your profile.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-[4px] text-xs font-bold hover:text-white transition-colors">
          <Filter className="w-4 h-4 mr-2" />
          FILTER
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {jobs.map((job, i) => (
          <div key={i} className="glass-card rounded-[8px] p-6 border border-white/5 hover:border-[#2979ff33] transition-all group">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start space-x-5">
                <div className="w-12 h-12 bg-white/5 rounded-[4px] flex items-center justify-center border border-white/10 shrink-0">
                   <Briefcase className="w-6 h-6 text-[#2979ff]" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-white group-hover:text-[#2979ff] transition-colors">{job.title}</h4>
                  <p className="text-[#2979ff] text-sm mb-2">{job.company}</p>
                  
                  <div className="flex flex-wrap gap-4 mt-3">
                    <div className="flex items-center text-[10px] text-gray-600 font-bold uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 mr-1.5" />
                      {job.location}
                    </div>
                    <div className="flex items-center text-[10px] text-gray-600 font-bold uppercase tracking-wider">
                      <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                      {job.salary}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:items-end justify-between gap-4">
                 <div className="flex flex-wrap gap-2 lg:justify-end">
                    {job.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-white/5 text-gray-500 rounded-[4px] text-[10px] font-bold uppercase border border-white/5">
                        {tag}
                      </span>
                    ))}
                 </div>
                 <button className="flex items-center px-6 py-2 bg-[#2979ff] text-white rounded-[4px] text-[10px] font-bold hover:bg-blue-600 transition-colors shadow-lg">
                    APPLY NOW
                    <ExternalLink className="w-3 h-3 ml-2" />
                 </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

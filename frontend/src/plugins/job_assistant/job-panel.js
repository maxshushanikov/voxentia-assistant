/**
 * UI-Komponente für den Job-Assistenten.
 */
export const JobAssistantUI = {
    metadata: {
        name: "job_assistant",
        display_name: "Job Suche",
        handled_intents: ["job_search"]
    },

    render(data, container) {
        if (!data || !data.jobs) return;

        const { jobs, query, location } = data;
        
        container.innerHTML = `
            <div class="job-results-info">
                Ergebnisse für <strong>${query}</strong> in <strong>${location}</strong>:
            </div>
            <div class="job-list">
                ${jobs.map(job => `
                    <div class="job-card">
                        <h4>${job.title}</h4>
                        <div class="company">🏢 ${job.company}</div>
                        <div class="details">
                            <span>📍 ${job.location}</span><br>
                            <span>💰 ${job.salary || 'n.a.'}</span>
                        </div>
                        <a href="${job.url}" target="_blank" class="job-link">Details ansehen</a>
                    </div>
                `).join('')}
            </div>
        `;

        // Öffne das Plugin-Panel
        document.getElementById('plugin-container').classList.remove('hidden');
    }
};

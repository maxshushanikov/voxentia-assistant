import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'frontend' / 'src'
patterns = [r'>\s*([^<>\n]{2,}?)\s*<', r'placeholder=\"([^\"]{2,}?)\"', r'aria-label=\"([^\"]{2,}?)\"', r'title=\"([^\"]{2,}?)\"']
files = list(root.rglob('*.tsx')) + list(root.rglob('*.ts')) + list(root.rglob('*.jsx')) + list(root.rglob('*.js'))
results = {}

for f in files:
    text = f.read_text(encoding='utf-8', errors='ignore')
    matches = set()
    for pat in patterns:
        for m in re.findall(pat, text):
            s = m.strip()
            # filter out import/export and JSX tags like <div>
            if len(s) < 3:
                continue
            # ignore strings that look like code or contain '{' or '}'
            if '{' in s or '}' in s or '\\n' in s:
                continue
            # ignore single words that are likely variables
            if re.match(r'^[A-Za-z0-9_\-]+$', s):
                continue
            matches.add(s)
    if matches:
        results[str(f.relative_to(root))] = sorted(matches)

out = Path(__file__).resolve().parents[1] / 'frontend' / 'i18n_extraction_report.json'
out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote report: {out}')

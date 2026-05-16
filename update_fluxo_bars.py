import re
import os

file_path = 'src/App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Fluxo Semanal bar
content = re.sub(
    r'(<Bar dataKey="count" name="Total".*?/>)', 
    r'<Bar dataKey="suporte" name="Suporte Técnico" fill="var(--brand-blue)" radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 9, fill: "var(--text-dim)", fontWeight: 700 }} />\n                            <Bar dataKey="cadastro" name="Cadastro" fill="var(--brand-orange)" radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 9, fill: "var(--text-dim)", fontWeight: 700 }} />', 
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

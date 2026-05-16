import re
import os

file_path = 'src/App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Avaliação Semanal & Fluxo Semanal to use Red/Orange
# Suporte -> Red, Cadastro -> Orange
content = re.sub(
    r'(<Bar dataKey="suporte" name="Suporte Técnico" fill=")(var\(--brand-blue\))(")', 
    r'\1var(--brand-red)\3', 
    content
)
content = re.sub(
    r'(<Bar dataKey="cadastro" name="Cadastro" fill=")(var\(--brand-orange\)|var\(--brand-pink\))(")', 
    r'\1var(--brand-orange)\3', 
    content
)

# 2. Update Tipos de Chamado (Stacked Bar)
# Use the full brand palette for distinction
content = re.sub(
    r'(<Bar dataKey="ATHENAS" stackId="a" fill=")(var\(--brand-blue\))(")', 
    r'\1var(--brand-red)\3', 
    content
)
content = re.sub(
    r'(<Bar dataKey="PDV" stackId="a" fill=")(var\(--brand-orange\))(")', 
    r'\1var(--brand-orange)\3', 
    content
)
content = re.sub(
    r'(<Bar dataKey="SISTEMAS" stackId="a" fill=")(var\(--brand-red\))(")', 
    r'\1var(--brand-blue)\3', 
    content
)
# Outros stays Brown

# 3. Update Pie Chart (Triagem) to start with Red
content = re.sub(
    r"(fill=\['var\(--brand-red\)', 'var\(--brand-blue\)', 'var\(--brand-orange\)', 'var\(--brand-green\)'\]\[index % 4\])", 
    r"fill={['var(--brand-red)', 'var(--brand-orange)', 'var(--brand-blue)', 'var(--brand-green)'][index % 4]}", 
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

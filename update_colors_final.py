import re
import os

file_path = 'src/App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Tipos de Chamado
content = re.sub(
    r'(<Bar dataKey="ATHENAS".*?/>\s+<Bar dataKey="PDV".*?)(fill="var\(--brand-blue\)")(.*?/>\s+<Bar dataKey="SISTEMAS".*?)(fill="var\(--brand-pink\)")(.*?/>\s+<Bar dataKey="OUTROS".*?)(fill="var\(--text-dim\)")', 
    r'\1fill="var(--brand-orange)"\3fill="var(--brand-red)"\5fill="var(--brand-brown)"', 
    content, 
    flags=re.DOTALL
)

# 2. Avaliação Semanal
content = re.sub(
    r'(<Bar dataKey="cadastro" name="Cadastro" )(fill="var\(--brand-pink\)")', 
    r'\1fill="var(--brand-orange)"', 
    content
)

# 3. Performance por Técnico
content = re.sub(
    r'(<div style={{ height: "100%", width: `\${agent\["CSAT \(%\)"\]}%`, background: ")(var\(--brand-blue\))(")', 
    r'\1var(--brand-green)\3', 
    content
)

# 4. Distribuição por Origem (Triagem)
content = re.sub(
    r'(<Cell key={`cell-\${index}`} fill=\[)(.*?)( \]\s+/>)', 
    r"\1'var(--brand-red)', 'var(--brand-blue)', 'var(--brand-orange)', 'var(--brand-green)'\3", 
    content, 
    flags=re.DOTALL
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

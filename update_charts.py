import re
import os

file_path = 'src/App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. PieChart Legend
content = re.sub(
    r'(<RePieChart>.*?<Tooltip />)', 
    r'\1\n                              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "9px", textTransform: "uppercase" }} />', 
    content, 
    flags=re.DOTALL
)

# 2. Fluxo Semanal BarChart (Legend + Label)
content = re.sub(
    r'(<BarChart data={weekData}>.*?<Tooltip.*?/>)', 
    r'\1\n                            <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "10px" }} />', 
    content, 
    flags=re.DOTALL
)
content = re.sub(
    r'(<BarChart data={weekData}>.*?<Bar dataKey="count".*?)( />)', 
    r'\1 label={{ position: "top", fontSize: 10, fill: "var(--text-dim)", fontWeight: 700 }}\2', 
    content, 
    flags=re.DOTALL
)

# 3. Tipos de Chamado (Stacked BarChart Legend)
content = re.sub(
    r'(<BarChart data={userTypeRanking}.*?<Tooltip.*?/>)', 
    r'\1\n                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }} />', 
    content, 
    flags=re.DOTALL
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

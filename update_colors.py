import os
import re

file_path = 'src/App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    r'#ef4444': 'var(--brand-red)',
    r'#f29900': 'var(--brand-orange)',
    r'#fabb05': 'var(--brand-orange)',
    r'#34a853': 'var(--brand-green)',
    r'#10b981': 'var(--brand-green)',
    r'#4285f4': 'var(--brand-blue)',
    r'#8ab4f8': 'var(--brand-blue)',
    r'#3b82f6': 'var(--brand-blue)',
    r'#8b5cf6': 'var(--brand-pink)',
    r'#9333ea': 'var(--brand-pink)',
    r'#9aa0a6': 'var(--brand-brown)',
    r'#94a3b8': 'var(--text-dim)',
}

# Update COLORS array
content = re.sub(
    r"const COLORS = \['#8ab4f8', '#f29900', '#34a853', '#4285f4', '#9333ea', '#fabb05', '#12b886', '#ec4899'\];",
    r"const COLORS = ['var(--brand-red)', 'var(--brand-orange)', 'var(--brand-blue)', 'var(--brand-green)', 'var(--brand-pink)', 'var(--brand-brown)', 'var(--brand-beige)', 'var(--text-dim)'];",
    content
)

for old, new in replacements.items():
    content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

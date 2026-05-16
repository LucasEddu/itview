import re
path = 'src/App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="two-col-grid" style={{ gridTemplateColumns: \'1.2fr 1fr\' }}', 'className="equal-col-grid"')
content = content.replace('className="two-col-grid" style={{ marginTop: \'1.5rem\' }}', 'className="equal-col-grid" style={{ marginTop: \'1.5rem\' }}')
content = content.replace('className="two-col-grid"', 'className="equal-col-grid"')
content = content.replace('className="equal-col-grid" style={{ marginTop: \'1.5rem\', display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'1.5rem\' }}', 'className="equal-col-grid" style={{ marginTop: \'1.5rem\' }}')
content = content.replace('className="equal-col-grid" style={{ gridTemplateColumns: \'1fr 1.5fr\' }}', 'className="equal-col-grid"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

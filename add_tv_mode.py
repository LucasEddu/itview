import re

path = 'src/App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state and useEffect for TV Mode
state_hook = """  const [selectedUser, setSelectedUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [tvSlideIndex, setTvSlideIndex] = useState(0);

  useEffect(() => {
    let interval;
    if (isTvMode) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
      }
      interval = setInterval(() => {
        setTvSlideIndex(prev => (prev + 1) % 4);
      }, 15000);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log(err));
      }
      setTvSlideIndex(0);
    }
    return () => clearInterval(interval);
  }, [isTvMode]);
"""
content = content.replace("  const [selectedUser, setSelectedUser] = useState(null);\n  const [isSidebarOpen, setIsSidebarOpen] = useState(true);", state_hook)

# 2. Hide Sidebar
content = content.replace('<aside className="sidebar" style={{ width: isSidebarOpen ? \'280px\' : \'0px\'', '<aside className="sidebar" style={{ display: isTvMode ? \'none\' : \'flex\', width: isSidebarOpen ? \'280px\' : \'0px\'')

# 3. Hide Header
content = content.replace('<header className="header">', '<header className="header" style={{ display: isTvMode ? \'none\' : \'flex\' }}>')

# 4. Hide Filter Bar
content = content.replace('<div className="filter-bar animate-fade">', '<div className="filter-bar animate-fade" style={{ display: isTvMode ? \'none\' : \'flex\' }}>')

# 5. Wrap Sections
s0_start = '{/* SECTION 0: VISÃO GERAL */}'
s0_wrap_start = '{(!isTvMode || tvSlideIndex === 0) && (\n<div className="tv-slide animate-fade">\n{/* SECTION 0: VISÃO GERAL */}'
content = content.replace(s0_start, s0_wrap_start)

s1_start = '{/* SECTION 1: VOLUME POR CHAMADOS */}'
s1_wrap = '</div>\n)}\n{(!isTvMode || tvSlideIndex === 1) && (\n<div className="tv-slide animate-fade" style={{ paddingTop: isTvMode ? "2rem" : 0 }}>\n{/* SECTION 1: VOLUME POR CHAMADOS */}'
content = content.replace(s1_start, s1_wrap)

s2_start = '{/* SECTION 2: SATISFAÇÃO & SLA */}'
s2_wrap = '</div>\n)}\n{(!isTvMode || tvSlideIndex === 2) && (\n<div className="tv-slide animate-fade" style={{ paddingTop: isTvMode ? "2rem" : 0 }}>\n{/* SECTION 2: SATISFAÇÃO & SLA */}'
content = content.replace(s2_start, s2_wrap)

s3_start = '{/* SECTION 3: CHAMADOS POR USUÁRIO */}'
s3_wrap = '</div>\n)}\n{(!isTvMode || tvSlideIndex === 3) && (\n<div className="tv-slide animate-fade" style={{ paddingTop: isTvMode ? "2rem" : 0 }}>\n{/* SECTION 3: CHAMADOS POR USUÁRIO */}'
content = content.replace(s3_start, s3_wrap)

# End of S3
s3_end = """             </section>
          </>"""
s3_end_wrap = """             </section>
</div>
)}
          </>"""
content = content.replace(s3_end, s3_end_wrap)

# 6. Remove old TV Mode and add TV controls
old_tv_start = '<AnimatePresence>'
old_tv_end = '</AnimatePresence>'

tv_controls = """      {isTvMode && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '1rem', zIndex: 50 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: tvSlideIndex === i ? 'var(--brand-red)' : 'rgba(255,255,255,0.2)', transition: '0.3s' }}></div>
          ))}
        </div>
      )}
      {isTvMode && (
        <button onClick={() => setIsTvMode(false)} style={{ position: 'fixed', top: '2rem', right: '2rem', background: 'var(--brand-red)', border: 'none', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', zIndex: 50, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(218,13,23,0.3)' }}>
          <X size={16} /> SAIR DO MODO TV
        </button>
      )}"""

# We'll use regex to remove the AnimatePresence block that contains tv-mode
pattern = re.compile(r'<AnimatePresence>\s*\{\s*isTvMode.*?</AnimatePresence>', re.DOTALL)
content = pattern.sub('', content)

# Inject tv controls right before the final closing tags
content = content.replace('    </>\n  );\n}', tv_controls + '\n    </>\n  );\n}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("TV Mode implementation complete.")

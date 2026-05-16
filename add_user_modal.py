import re
import sys

path = 'src/App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert State
state_str = """
  // Date Filtering State"""
new_state_str = """
  // Modal State
  const [selectedUser, setSelectedUser] = useState(null);

  const selectedUserStats = useMemo(() => {
    if (!selectedUser) return null;
    
    const userTickets = filteredTickets.filter(t => t.user === selectedUser);
    if (userTickets.length === 0) return null;

    const total = userTickets.length;
    const avgWait = userTickets.reduce((acc, t) => acc + t.wait, 0) / (total || 1);
    const avgTotal = userTickets.reduce((acc, t) => acc + t.total, 0) / (total || 1);

    const csatWeights = { 'Muito Satisfeito': 100, 'Satisfeito': 75, 'Indiferente': 50, 'Insatisfeito': 25 };
    const rated = userTickets.filter(t => t.csat && csatWeights[t.csat] !== undefined);
    const totalScore = rated.reduce((sum, t) => sum + csatWeights[t.csat], 0);
    const csatScore = rated.length > 0 ? (totalScore / rated.length) : 0;

    // Áreas Mais Abertas
    const categoryCounts = userTickets.reduce((acc, t) => {
      const cat = t.category || t.main_category || 'Sem categoria';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name: name.length > 40 ? name.substring(0, 40) + '...' : name, count }));

    // Histórico de Volume
    const monthCounts = userTickets.reduce((acc, t) => {
      if (!t.month) return acc;
      acc[t.month] = (acc[t.month] || 0) + 1;
      return acc;
    }, {});
    
    const history = Object.entries(monthCounts)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));

    const company = userTickets[0].company || 'N/A';

    return { total, avgWait, avgTotal, csatScore, topCategories, history, company };
  }, [selectedUser, filteredTickets]);

  // Date Filtering State"""
content = content.replace(state_str, new_state_str)

# 2. Update userRanking to slice 20 instead of 10
content = content.replace('.slice(0, 10);', '.slice(0, 20);')

# 3. Replace the DETALHAMENTO DE USUÁRIOS section
section_pattern = re.compile(r'\{/\* SECTION 3: RANKINGS & USUÁRIOS \*/\}.*?</section>', re.DOTALL)

new_section = """            {/* SECTION 3: CHAMADOS POR USUÁRIO */}
            <div className="section-header" style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '2.5rem' }}>
               <div className="section-prefix">
                  <LayoutGrid size={14} />
                  <Diamond size={12} style={{ color: 'var(--brand-orange)' }} />
               </div>
               <h2 className="section-title">CHAMADOS POR USUÁRIO</h2>
               <div className="section-line"></div>
            </div>
            <section className="section-anchor">
               <div className="equal-col-grid">
                  <div className="card" style={{ padding: '1.5rem', maxHeight: '500px', overflowY: 'auto' }}>
                     <div className="card-label" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Trophy size={14} color="var(--brand-orange)" /> 
                        <span style={{ fontWeight: 700, textTransform: 'none' }}>Top 20 Usuários</span>
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400, textTransform: 'none' }}>— {metrics.uniqueUsers} usuários</span>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {userRanking.map((user, i) => (
                           <div key={i} onClick={() => setSelectedUser(user.name)} style={{ cursor: 'pointer', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: i < 3 ? 'var(--brand-orange)' : 'var(--text-dim)', width: '20px', textAlign: 'center' }}>
                                 {i + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                 <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{user.name}</div>
                                 <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem', marginTop: '0.2rem', textTransform: 'uppercase' }}>{user.company}</div>
                              </div>
                              <div style={{ width: '80px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                                   <div style={{ height: '100%', width: `${user.percent}%`, background: 'var(--brand-red)', borderRadius: '10px' }}></div>
                                </div>
                                <span style={{ color: 'var(--brand-red)', fontWeight: 800, fontSize: '0.85rem' }}>{user.count}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="card" style={{ padding: '1.5rem' }}>
                     <div className="card-label" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart2 size={14} color="var(--brand-blue)" /> 
                        <span style={{ fontWeight: 700, textTransform: 'none' }}>Top 10 Usuários</span>
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400, textTransform: 'none' }}>(volume)</span>
                     </div>
                     <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={userRanking.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={10} width={100} />
                           <Tooltip 
                             contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px' }}
                             cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                           />
                           <Bar dataKey="count" fill="var(--brand-red)" radius={[0, 4, 4, 0]} onClick={(data) => setSelectedUser(data.name)} style={{ cursor: 'pointer' }}>
                              {userRanking.slice(0, 10).map((entry, index) => {
                                 const colors = ['#DA0D17', '#DA5513', '#4F7043', '#265D7C', '#F29C94', '#56331B', '#b45309', '#15803d', '#1e3a8a'];
                                 return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </section>"""

content = section_pattern.sub(new_section, content)

# 4. Add the Modal JSX at the end, just before the closing </div> of <div className="app-container">
# Wait, it's easier to add it before the final `</div>` of the component.
# Let's find the closing tag. It's `<div className="app-container"> ... </div>` at the very root.

modal_jsx = """
      {/* Modal Usuário */}
      {selectedUser && selectedUserStats && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Users size={24} color="var(--brand-blue)" />
                  </div>
                  <div>
                     <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-red)' }}>{selectedUser}</h2>
                     <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selectedUserStats.company}</div>
                  </div>
               </div>
               <button onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-dim)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  [ FECHAR ESC ]
               </button>
            </div>
            
            {/* Modal Content */}
            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: 'var(--bg-dark)' }}>
               {/* KPIs */}
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.5rem' }}>Total Chamados</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedUserStats.total}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.5rem' }}>Resolução Média</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-green)' }}>{formatTime(selectedUserStats.avgTotal)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.5rem' }}>Fila Média</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-orange)' }}>{formatTime(selectedUserStats.avgWait)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.5rem' }}>Satisfação Média</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-red)' }}>{selectedUserStats.csatScore > 0 ? selectedUserStats.csatScore.toFixed(1) + '%' : 'N/A'}</div>
                  </div>
               </div>

               {/* Charts */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Folder size={14} color="var(--brand-orange)" /> Áreas Mais Abertas
                     </div>
                     <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={selectedUserStats.topCategories} layout="vertical" margin={{ left: 20 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={9} width={120} />
                           <Tooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-dim)', borderRadius: '8px' }} />
                           <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={14} color="var(--brand-blue)" /> Histórico de Volume
                     </div>
                     <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={selectedUserStats.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <defs>
                              <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} />
                           <YAxis stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} />
                           <Tooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-dim)', borderRadius: '8px' }} />
                           <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorHistory)" dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: 'var(--bg-card)' }} />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace('</div>\n    </div>\n  );\n}\n\nexport default App;', modal_jsx + '</div>\n    </div>\n  );\n}\n\nexport default App;')

# Also add Keyboard listener for ESC to close modal
effect_str = """
  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);"""
new_effect_str = """
  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setSelectedUser(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);"""
content = content.replace(effect_str, new_effect_str)

# Ensure icons like Folder, Trophy, Users are imported
# Check if they exist in the import, if not, add them
lucide_import_pattern = re.compile(r"import\s+\{([^}]+)\}\s+from\s+'lucide-react';")
lucide_match = lucide_import_pattern.search(content)
if lucide_match:
    icons = set([i.strip() for i in lucide_match.group(1).split(',')])
    icons.update(['Folder', 'Trophy', 'Users', 'BarChart2'])
    new_lucide_import = f"import {{ {', '.join(sorted(icons))} }} from 'lucide-react';"
    content = content.replace(lucide_match.group(0), new_lucide_import)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

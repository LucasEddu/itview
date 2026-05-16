import re

path = 'src/App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

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
                           <Tooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-dim)', borderRadius: '8px' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
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

if 'Modal Usuário' not in content:
    content = content.replace('      <AnimatePresence>', modal_jsx + '\n      <AnimatePresence>')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Modal injected.')
else:
    print('Modal already there.')

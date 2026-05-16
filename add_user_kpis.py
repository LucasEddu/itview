import re
path = 'src/App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new content
new_section = """             {/* SECTION 0: VISÃO GERAL */}
             <div className="section-header">
                <div className="section-prefix">
                   <LayoutGrid size={14} />
                   <Diamond size={12} style={{ color: 'var(--brand-red)' }} />
                </div>
                <h2 className="section-title">KPIS PRINCIPAIS</h2>
                <div className="section-line"></div>
             </div>
             <section className="section-anchor">
               <div className="kpi-grid">
                 <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-red)' }}>
                   <div className="card-label">Total de Chamados</div>
                   <div className="card-value" style={{ color: 'var(--brand-red)' }}>{metrics.total.toLocaleString()}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>chamados resolvidos</div>
                 </div>
                 <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-green)' }}>
                   <div className="card-label">Tempo Médio Resolução</div>
                   <div className="card-value" style={{ color: 'var(--brand-green)' }}>{formatTime(metrics.avgTotal)}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>por chamado</div>
                 </div>
                 <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-orange)' }}>
                   <div className="card-label">Tempo Médio na Fila</div>
                   <div className="card-value" style={{ color: 'var(--brand-orange)' }}>{formatTime(metrics.avgWait)}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>aguardando atendimento</div>
                 </div>
                 <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-blue)' }}>
                   <div className="card-label">CSAT Score</div>
                   <div className="card-value" style={{ color: 'var(--brand-blue)' }}>{metrics.csatScore.toFixed(1)}%</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>{metrics.ratedCount} avaliações</div>
                 </div>
               </div>
             </section>

             {/* SECTION 0.1: USUÁRIOS EM DESTAQUE */}
             <div className="section-header" style={{ marginTop: '2rem' }}>
                <div className="section-prefix">
                   <LayoutGrid size={14} />
                   <Diamond size={12} style={{ color: 'var(--brand-orange)' }} />
                </div>
                <h2 className="section-title">USUÁRIOS EM DESTAQUE</h2>
                <div className="section-line"></div>
             </div>
             <section className="section-anchor">
               <div className="kpi-grid">
                 <div className="card animate-fade">
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div className="card-label">Total de Usuários</div>
                      <div style={{ fontSize: '0.6rem', padding: '2px 6px', border: '1px solid var(--border-dim)', borderRadius: '4px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Ver Todos</div>
                   </div>
                   <div className="card-value">{metrics.uniqueUsers.toLocaleString()}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>usuários únicos</div>
                 </div>
                 <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-orange)' }}>
                   <div className="card-label">Usuário Mais Ativo</div>
                   <div className="card-value" style={{ fontSize: '1.2rem', marginTop: '0.5rem', color: 'var(--brand-orange)' }}>{metrics.mostActiveUser[0]}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>{metrics.mostActiveUser[1]} chamados</div>
                 </div>
                 <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-red)' }}>
                   <div className="card-label">Média por Usuário</div>
                   <div className="card-value" style={{ color: 'var(--brand-red)' }}>{Math.round(metrics.avgTicketsPerUser)}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>chamados/usuário</div>
                 </div>
                 <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-green)' }}>
                   <div className="card-label">Empresa Mais Ativa</div>
                   <div className="card-value" style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--brand-green)', fontWeight: 800 }}>{metrics.mostActiveCompany[0]}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>{metrics.mostActiveCompany[1]} chamados</div>
                 </div>
               </div>
             </section>"""

# Replace the block
pattern = re.compile(r'\{/\* SECTION 0: VISÃO GERAL \*/\}.*?</section>', re.DOTALL)
content = pattern.sub(new_section, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

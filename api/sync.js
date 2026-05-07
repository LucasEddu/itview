import { list, put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// Configurações e endpoints
const BASE_URL = 'https://sanpaolo.api-atendimento.athenas.online';

// Função para formatar o nome com letras iniciais maiúsculas (Title Case)
function toTitleCase(str) {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Permite apenas requisições POST ou GET (para acionamento direto ou cron)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('[Sync Serverless] Iniciando sincronização via API...');

  const email = process.env.ATHENAS_EMAIL;
  const password = process.env.ATHENAS_PASSWORD;

  if (!email || !password) {
    return res.status(500).json({ error: 'Credenciais ATHENAS_EMAIL ou ATHENAS_PASSWORD ausentes nas variáveis de ambiente.' });
  }

  try {
    // 1. Autenticação na API Athenas
    console.log(`[Sync] Autenticando usuário ${email}...`);
    const authResponse = await fetch(`${BASE_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15000)
    });

    if (!authResponse.ok) {
      const errText = await authResponse.text();
      throw new Error(`Falha na autenticação (${authResponse.status}): ${errText}`);
    }

    const authData = await authResponse.json();
    const token = authData.token;
    if (!token) {
      throw new Error('Token JWT não retornado pela API Athenas.');
    }
    console.log('[Sync] Autenticação realizada com sucesso!');

    // 2. Carregar avaliações de satisfação (CSAT)
    console.log('[Sync] Buscando avaliações CSAT...');
    const ratingsResponse = await fetch(`${BASE_URL}/SupportRatings/report`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(20000)
    });

    const ratingsMap = {};
    if (ratingsResponse.ok) {
      const ratingsData = await ratingsResponse.json();
      const rows = ratingsData.rows || [];
      console.log(`[Sync] Carregadas ${rows.length} avaliações CSAT.`);
      
      const csatMapping = {
        '3': 'Muito Satisfeito',
        '2': 'Satisfeito',
        '1': 'Indiferente',
        '0': 'Insatisfeito'
      };

      for (const r of rows) {
        const supportId = r.supportId;
        const rate = String(r.rate || '').trim();
        if (supportId && csatMapping[rate]) {
          ratingsMap[parseInt(supportId)] = csatMapping[rate];
        }
      }
    } else {
      console.error('[Sync] Falha ao carregar CSAT. Continuando sem notas...');
    }

    // 3. Buscar chamados dos últimos 30 dias
    const days = 30;
    const startDt = new Date();
    startDt.setDate(startDt.getDate() - days);
    
    // Formatar data como YYYY-MM-DD
    const dateInitial = startDt.toISOString().split('T')[0];
    const dateFinish = new Date().toISOString().split('T')[0];

    console.log(`[Sync] Buscando chamados de ${dateInitial} até ${dateFinish}...`);
    const ticketsResponse = await fetch(`${BASE_URL}/report/generateFull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sectors: [],
        users: [],
        dateInitial,
        dateFinish
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!ticketsResponse.ok) {
      const errText = await ticketsResponse.text();
      throw new Error(`Falha ao buscar chamados (${ticketsResponse.status}): ${errText}`);
    }

    const apiTickets = await ticketsResponse.json();
    console.log(`[Sync] API retornou ${apiTickets.length} chamados.`);

    // 4. Carregar dados existentes (histórico)
    let existingData = { tickets: [], agents: [], sectors: [], stores: [] };
    let loadedFromBlob = false;

    // Tenta carregar do Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        console.log('[Sync] Buscando dados históricos no Vercel Blob...');
        const blobs = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
        const dataBlob = blobs.blobs.find(b => b.pathname === 'data.json');
        if (dataBlob) {
          const blobRes = await fetch(dataBlob.url);
          if (blobRes.ok) {
            existingData = await blobRes.json();
            loadedFromBlob = true;
            console.log(`[Sync] Carregados ${existingData.tickets?.length || 0} chamados históricos do Vercel Blob.`);
          }
        }
      } catch (blobErr) {
        console.error('[Sync] Aviso: Erro ao ler histórico do Vercel Blob:', blobErr);
      }
    }

    // Se não carregou do Blob, carrega do arquivo local do repositório
    if (!loadedFromBlob) {
      try {
        const localPath = path.join(process.cwd(), 'src', 'assets', 'data.json');
        if (fs.existsSync(localPath)) {
          const raw = fs.readFileSync(localPath, 'utf8');
          existingData = JSON.parse(raw);
          console.log(`[Sync] Carregados ${existingData.tickets?.length || 0} chamados históricos do arquivo local.`);
        }
      } catch (localErr) {
        console.error('[Sync] Aviso: Erro ao ler histórico local:', localErr);
      }
    }

    // Monta mapa de chamados existentes para atualização in-place
    const ticketsMap = {};
    const existingTickets = existingData.tickets || [];
    for (const t of existingTickets) {
      if (t && t.id) {
        ticketsMap[parseInt(t.id)] = t;
      }
    }

    let newCount = 0;
    let updatedCount = 0;

    // 5. Processar e mesclar chamados da API
    for (const t of apiTickets) {
      const ticketId = parseInt(t.id || 0);
      if (ticketId === 0) continue;

      const statusName = t.Status?.name || 'Finalizado';
      
      // Nome do Atendente mapeado de forma segura e elegante
      let agent = 'Não Atribuído';
      if (t.User && t.User.name) {
        agent = toTitleCase(t.User.name);
      }
      if (['', 'nan', 'null'].includes(agent.toLowerCase())) {
        agent = 'Não Atribuído';
      }

      const sector = t.Sector?.name || 'Não Informado';
      
      let company = 'N/A';
      if (t.Contact && t.Contact.company) {
        company = String(t.Contact.company).trim().toUpperCase();
      }
      if (['', 'nan', 'null'].includes(company.toLowerCase())) {
        company = 'N/A';
      }

      let contactName = 'Desconhecido';
      if (t.Contact && t.Contact.name) {
        contactName = toTitleCase(t.Contact.name);
      }
      if (['', 'nan', 'null'].includes(contactName.toLowerCase())) {
        contactName = 'Desconhecido';
      }

      // Processar datas e tempos de atendimento
      const createdAtStr = t.createdAt;
      const startSupportAtStr = t.startSupportAt;
      const updatedAtStr = t.updatedAt;

      let waitSeconds = 0;
      if (startSupportAtStr && createdAtStr) {
        const created = new Date(createdAtStr);
        const started = new Date(startSupportAtStr);
        waitSeconds = Math.floor((started - created) / 1000);
        if (waitSeconds < 0) waitSeconds = 0;
      }

      let totalSeconds = 0;
      if (statusName === 'Finalizado' && updatedAtStr && createdAtStr) {
        const created = new Date(createdAtStr);
        const updated = new Date(updatedAtStr);
        totalSeconds = Math.floor((updated - created) / 1000);
        if (totalSeconds < 0) totalSeconds = 0;
      }

      // Detalhes da data de criação
      let dateStr = '';
      let monthStr = '';
      let hour = -1;
      let weekday = -1;

      if (createdAtStr) {
        const created = new Date(createdAtStr);
        // Formata data local como YYYY-MM-DD
        const year = created.getUTCFullYear();
        const month = String(created.getUTCMonth() + 1).padStart(2, '0');
        const day = String(created.getUTCDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
        monthStr = `${year}-${month}`;
        
        // Usar horas em fuso horário do Brasil (UTC-3)
        // Adiciona 3 horas ou converte adequadamente
        const brDate = new Date(created.getTime() - 3 * 3600 * 1000);
        hour = brDate.getUTCHours();
        weekday = brDate.getUTCDay();
      }

      // Categorização baseada no Setor
      const sectorUpper = sector.toUpperCase();
      let mainCategory = 'OUTROS';
      if (sectorUpper.includes('SUPORTE TECNICO -> ATHENAS')) {
        mainCategory = 'ATHENAS';
      } else if (sectorUpper.includes('DEGUST') || sectorUpper.includes('RESHOP')) {
        mainCategory = 'PDV';
      } else if (['TRILOGO', 'EMAIL', 'PCP', 'TEMPER'].some(x => sectorUpper.includes(x))) {
        mainCategory = 'SISTEMAS';
      }

      // CSAT
      const csatVal = ratingsMap[ticketId] || 'Sem Avaliação';

      const ticketObj = {
        id: ticketId,
        agent,
        sector,
        main_category: mainCategory,
        company,
        user: contactName,
        wait: waitSeconds,
        total: totalSeconds,
        date: dateStr,
        month: monthStr,
        hour,
        weekday,
        csat: csatVal,
        status: statusName,
        created_at: createdAtStr
      };

      // Inserção ou atualização in-place
      if (ticketsMap[ticketId]) {
        const existing = ticketsMap[ticketId];
        // Atualiza se estiver aberto no histórico ou se o status mudou para finalizado
        if (existing.status !== 'Finalizado' || statusName === 'Finalizado') {
          ticketsMap[ticketId] = ticketObj;
          updatedCount++;
        }
      } else {
        ticketsMap[ticketId] = ticketObj;
        newCount++;
      }
    }

    // 6. Converter de volta para lista e ordenar por data decrescente
    const mergedRecords = Object.values(ticketsMap);
    mergedRecords.sort((a, b) => {
      // Ordenação primária por data decrescente, secundária por ID decrescente
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.id - a.id;
    });

    // 7. Extrair agentes e setores únicos
    const uniqueAgents = Array.from(new Set(
      mergedRecords
        .map(r => r.agent)
        .filter(name => name && !['Não Atribuído', 'Sistema'].includes(name))
    )).sort();

    const uniqueSectors = Array.from(new Set(
      mergedRecords.map(r => r.sector).filter(Boolean)
    )).sort();

    // 8. Montar o JSON final
    // Mantém as geolocalizações das lojas antigas se disponíveis
    const stores = existingData.stores || [];
    
    // Formata a data atual no fuso horário local de Brasília (UTC-3)
    const options = { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const lastUpdated = new Intl.DateTimeFormat('pt-BR', options).format(new Date());

    const outputData = {
      tickets: mergedRecords,
      agents: uniqueAgents,
      sectors: uniqueSectors,
      categories: ['ATHENAS', 'PDV', 'SISTEMAS', 'OUTROS'],
      stores,
      last_updated: lastUpdated
    };

    // 9. Salvar os dados compilados
    // Salva no Vercel Blob se o token estiver ativo
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      console.log('[Sync] Salvando os dados sincronizados no Vercel Blob...');
      await put('data.json', JSON.stringify(outputData), {
        access: 'public',
        addRandomSuffix: false, // Mantém o nome estático "data.json"
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      console.log('[Sync] Upload no Vercel Blob finalizado com sucesso!');
    }

    // Salva localmente também (útil para desenvolvimento local)
    try {
      const localPath = path.join(process.cwd(), 'src', 'assets', 'data.json');
      fs.writeFileSync(localPath, JSON.stringify(outputData, null, 2), 'utf8');
      console.log('[Sync] Arquivo local src/assets/data.json atualizado.');
    } catch (localWriteErr) {
      console.log('[Sync] Aviso: Não foi possível atualizar o arquivo local (normal em ambiente Vercel read-only).');
    }

    console.log(`[Sync] Sincronização Serverless finalizada! Novos: ${newCount} | Atualizados: ${updatedCount} | Total: ${mergedRecords.length} chamados.`);
    
    return res.status(200).json({
      success: true,
      message: 'Sincronização concluída com sucesso!',
      stats: {
        novos: newCount,
        atualizados: updatedCount,
        total: mergedRecords.length,
        ultima_atualizacao: lastUpdated
      }
    });

  } catch (error) {
    console.error('[Sync Serverless Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Falha durante a sincronização serverless',
      details: error.message
    });
  }
}

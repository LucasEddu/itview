import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(express.json());

// --- ACRONIS API PROXY CONFIG ---
const ACRONIS_BASE_URL = process.env.ACRONIS_BASE_URL; // e.g. https://br1-cloud.acronis.com
const ACRONIS_CLIENT_ID = process.env.ACRONIS_CLIENT_ID;
const ACRONIS_CLIENT_SECRET = process.env.ACRONIS_CLIENT_SECRET;

let acronisToken = null;
let tokenExpiry = null;

async function getAcronisToken() {
  if (acronisToken && tokenExpiry && Date.now() < tokenExpiry) {
    return acronisToken;
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    
    const auth = Buffer.from(`${ACRONIS_CLIENT_ID}:${ACRONIS_CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post(`${ACRONIS_BASE_URL}/api/2/idp/token`, params, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    acronisToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return acronisToken;
  } catch (error) {
    console.error('[Acronis Auth Error]:', error.response?.data || error.message);
    throw error;
  }
}

// Acronis Proxy Routes
app.get('/api/acronis/resources', async (req, res) => {
  if (!ACRONIS_CLIENT_ID || !ACRONIS_BASE_URL) {
    return res.status(200).json({ mock: true, message: 'Configurações Acronis ausentes no .env' });
  }
  
  try {
    const token = await getAcronisToken();
    const response = await axios.get(`${ACRONIS_BASE_URL}/api/resource_management/v4/resource_statuses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/acronis/agents', async (req, res) => {
  try {
    const token = await getAcronisToken();
    const response = await axios.get(`${ACRONIS_BASE_URL}/api/agent_manager/v2/agents`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/acronis/alerts', async (req, res) => {
  try {
    const token = await getAcronisToken();
    const response = await axios.get(`${ACRONIS_BASE_URL}/api/alert_manager/v1/alerts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/acronis/backup/:machineId', async (req, res) => {
  try {
    const token = await getAcronisToken();
    const response = await axios.post(`${ACRONIS_BASE_URL}/api/backup_manager/v1/backups`, {
      machine_id: req.params.machineId
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});
// --------------------------------

// Endpoint to fetch the current processed data
app.get('/api/data', (req, res) => {
  const dataPath = path.join(__dirname, 'src', 'assets', 'data.json');
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(404).json({ error: 'Data not found' });
  }
});

// Endpoint to trigger the full sync (download + update)
// Robust helper to spawn python processes with automatic command fallback
function spawnPython(args) {
  const commands = ['python', 'py', 'python3'];
  let currentCmdIdx = 0;
  let child = null;
  
  const listeners = {
    stdout: [],
    stderr: [],
    close: [],
    error: []
  };

  function trySpawn() {
    const cmd = commands[currentCmdIdx];
    let spawnErrorOccurred = false;
    
    try {
      child = spawn(cmd, args);
      
      child.stdout.on('data', (data) => {
        listeners.stdout.forEach(cb => cb(data));
      });
      
      child.stderr.on('data', (data) => {
        listeners.stderr.forEach(cb => cb(data));
      });
      
      child.on('close', (code) => {
        if (!spawnErrorOccurred) {
          listeners.close.forEach(cb => cb(code));
        }
      });
      
      child.on('error', (err) => {
        if (err.code === 'ENOENT') {
          spawnErrorOccurred = true;
          console.warn(`[Aviso]: Comando de Python "${cmd}" não foi encontrado no sistema.`);
          currentCmdIdx++;
          if (currentCmdIdx < commands.length) {
            console.log(`[System]: Tentando comando alternativo: "${commands[currentCmdIdx]}"...`);
            trySpawn();
          } else {
            console.error('=== ERRO CRÍTICO ===');
            console.error('Nenhum comando Python (python, py, python3) foi encontrado no PATH do sistema!');
            console.error('Certifique-se de que o Python está instalado e a opção "Add Python to PATH" foi marcada.');
            console.error('====================');
            listeners.error.forEach(cb => cb(err));
          }
        } else {
          listeners.error.forEach(cb => cb(err));
        }
      });
    } catch (err) {
      console.error('[System Spawn Catch Error]:', err);
      listeners.error.forEach(cb => cb(err));
    }
  }

  // Start spawning asynchronously
  setTimeout(trySpawn, 0);

  return {
    stdout: {
      on: (event, cb) => { if (event === 'data') listeners.stdout.push(cb); }
    },
    stderr: {
      on: (event, cb) => { if (event === 'data') listeners.stderr.push(cb); }
    },
    on: (event, cb) => {
      if (event === 'close') listeners.close.push(cb);
      if (event === 'error') listeners.error.push(cb);
    }
  };
}

// Endpoint to trigger the full sync (download + update)
app.post('/api/sync', (req, res) => {
  console.log('Starting full sync process...');
  
  const pythonProcess = spawnPython(['-u', 'sync_data.py']);
  
  let output = '';
  let errorOutput = '';

  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
    console.log(`[Python]: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.error(`[Python Error]: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    if (code === 0) {
      res.json({ message: 'Sync completed successfully', output });
    } else {
      res.status(500).json({ error: 'Sync failed', details: errorOutput });
    }
  });

  pythonProcess.on('error', (err) => {
    res.status(500).json({ 
      error: 'Python not found', 
      details: 'Nenhum comando Python (python, py, python3) foi localizado neste servidor. Por favor, certifique-se de que o Python está instalado e adicionado ao PATH do sistema.' 
    });
  });
});

// Background Auto-Sync: Run the sync script every 2 minutes to fetch new/updated tickets
const AUTO_SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes

const triggerSync = () => {
  console.log('[Background Worker]: Triggering synchronization...');
  const pythonProcess = spawnPython(['-u', 'sync_data.py']);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Background Worker stdout]: ${data.toString().trim()}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Background Worker stderr]: ${data.toString().trim()}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`[Background Worker]: Sync process exited with code ${code}`);
  });

  pythonProcess.on('error', (err) => {
    console.error('[Background Worker Error]: Falha ao iniciar processo de sincronização:', err.message);
  });
};

// Trigger initial sync on startup
triggerSync();

// Schedule regular syncs
setInterval(triggerSync, AUTO_SYNC_INTERVAL);

// Serve static files from the React build in production
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Fallback for SPA routing to serve index.html for any other route
  app.get('{*path}', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
  console.log(`Production dashboard available at http://localhost:${PORT}`);
});


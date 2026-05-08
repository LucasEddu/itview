import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(express.json());

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
app.post('/api/sync', (req, res) => {
  console.log('Starting full sync process...');
  
  // We run sync_data.py which handles both download and processing
  const pythonProcess = spawn('python', ['sync_data.py']);
  
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
});

// Background Auto-Sync: Run the sync script every 10 minutes to fetch new/updated tickets
const AUTO_SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes
setInterval(() => {
  console.log('[Background Worker]: Triggering scheduled synchronization...');
  const pythonProcess = spawn('python', ['sync_data.py']);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Background Worker stdout]: ${data.toString().trim()}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Background Worker stderr]: ${data.toString().trim()}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`[Background Worker]: Sync process exited with code ${code}`);
  });
}, AUTO_SYNC_INTERVAL);

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


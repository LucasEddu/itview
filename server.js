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
const PORT = 3008;

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

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});

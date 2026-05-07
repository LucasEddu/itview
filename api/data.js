import { list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Configuração de CORS para permitir acesso de qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Tenta carregar do Vercel Blob se o token estiver configurado
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blobs = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
      const dataBlob = blobs.blobs.find(b => b.pathname === 'data.json');
      if (dataBlob) {
        const blobResponse = await fetch(dataBlob.url);
        if (blobResponse.ok) {
          const data = await blobResponse.json();
          return res.status(200).json(data);
        }
      }
    } catch (error) {
      console.error('[Vercel Blob Fetch Error]:', error);
    }
  }

  // Fallback local: lê o arquivo local do repositório (ideal para dev local ou deploy inicial)
  try {
    const localPath = path.join(process.cwd(), 'src', 'assets', 'data.json');
    if (fs.existsSync(localPath)) {
      const raw = fs.readFileSync(localPath, 'utf8');
      return res.status(200).json(JSON.parse(raw));
    }
    return res.status(404).json({ error: 'Nenhum dado encontrado no local ou no Vercel Blob.' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

// POST /api/generate — inicia geração de imagem
app.post('/api/generate', async (req, res) => {
  if (!REPLICATE_TOKEN) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN não configurado no servidor.' });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt vazio.' });

  const VERSION = 'da77bc59ee60423279fd632efb4795ab731d9e3ca9078d39d751131ca6a99f00';

  try {
    const r = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: VERSION,
        input: {
          prompt: prompt + ', nude, nsfw, photorealistic, 8k',
          negative_prompt: 'deformed, ugly, bad anatomy, blurry, low quality, watermark, text, cartoon, clothed',
          width: 768,
          height: 1024,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 30,
          disable_safety_checker: true,
        },
      }),
    });

    const prediction = await r.json();
    if (!r.ok) return res.status(500).json({ error: prediction.detail || JSON.stringify(prediction) });
    return res.status(200).json({ id: prediction.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/poll — verifica status da predição
app.get('/api/poll', async (req, res) => {
  if (!REPLICATE_TOKEN) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN não configurado no servidor.' });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id obrigatório.' });

  try {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/video — inicia animação de imagem para vídeo
app.post('/api/video', async (req, res) => {
  if (!REPLICATE_TOKEN) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN não configurado no servidor.' });
  }

  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl obrigatório.' });

  const VIDEO_VERSION = '3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438';

  try {
    const r = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: VIDEO_VERSION,
        input: {
          input_image: imageUrl,
          video_length: 'LONG_GENERATION',
          sizing_strategy: 'maintain_aspect_ratio',
          frames_per_second: 6,
          motion_bucket_id: 127,
          cond_aug: 0.02,
        },
      }),
    });

    const prediction = await r.json();
    if (!r.ok) return res.status(500).json({ error: prediction.detail || JSON.stringify(prediction) });
    return res.status(200).json({ id: prediction.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

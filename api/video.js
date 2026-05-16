module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'REPLICATE_API_TOKEN não configurado no Vercel.' });

  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl obrigatório.' });

  try {
    const create = await fetch('https://api.replicate.com/v1/models/stability-ai/stable-video-diffusion/predictions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          input_image: imageUrl,
          sizing_strategy: 'maintain_aspect_ratio',
          motion_bucket_id: 127,
          fps_id: 8,
          cond_aug: 0.02,
          video_length: '25_frames_with_svd_xt',
        },
      }),
    });

    const prediction = await create.json();
    if (!create.ok) return res.status(500).json({ error: prediction.detail || JSON.stringify(prediction) });

    return res.status(200).json({ id: prediction.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

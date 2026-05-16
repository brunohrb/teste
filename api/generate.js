module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'REPLICATE_API_TOKEN não configurado no Vercel.' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt vazio.' });

  const VERSION = 'da77bc59ee60423279fd632efb4795ab731d9e3ca9078d39d751131ca6a99f00';

  try {
    const create = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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

    const prediction = await create.json();
    if (!create.ok) return res.status(500).json({ error: prediction.detail || JSON.stringify(prediction) });

    return res.status(200).json({ id: prediction.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

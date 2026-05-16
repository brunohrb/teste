export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'REPLICATE_API_TOKEN não configurado no Vercel.' });

  const { prompt, model = 'flux-schnell' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt vazio.' });

  const models = {
    'flux-schnell': { owner: 'black-forest-labs', name: 'flux-schnell' },
    'flux-dev':     { owner: 'black-forest-labs', name: 'flux-dev' },
    'sdxl':         { owner: 'stability-ai',      name: 'sdxl' },
  };
  const m = models[model] || models['flux-schnell'];

  try {
    // Cria predição
    const create = await fetch(`https://api.replicate.com/v1/models/${m.owner}/${m.name}/predictions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          prompt,
          negative_prompt: 'deformed, ugly, bad anatomy, blurry, low quality, watermark, text, cartoon',
          aspect_ratio: '3:4',
          output_format: 'webp',
          output_quality: 90,
          num_outputs: 1,
          disable_safety_checker: true,
        },
      }),
    });

    const prediction = await create.json();
    if (!create.ok) return res.status(500).json({ error: prediction.detail || JSON.stringify(prediction) });

    // Poll até terminar (máx 120s)
    let result = prediction;
    for (let i = 0; i < 40; i++) {
      if (result.status === 'succeeded') break;
      if (result.status === 'failed') return res.status(500).json({ error: result.error || 'Falhou' });
      await new Promise(r => setTimeout(r, 3000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      result = await poll.json();
    }

    const output = Array.isArray(result.output) ? result.output : [result.output];
    return res.status(200).json({ images: output });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

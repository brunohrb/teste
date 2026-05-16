export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'REPLICATE_API_TOKEN não configurado no Vercel.' });

  const { prompt, model = 'minimax' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt vazio.' });

  const models = {
    // texto → vídeo
    'minimax': { owner: 'minimax', name: 'video-01',
      input: p => ({ prompt: p, prompt_optimizer: true }) },
    'wan':     { owner: 'wavespeedai', name: 'wan-2.1-t2v-480p',
      input: p => ({ prompt: p, num_frames: 81, frames_per_second: 16, guidance_scale: 5 }) },
  };

  const m = models[model] || models['minimax'];

  try {
    const create = await fetch(`https://api.replicate.com/v1/models/${m.owner}/${m.name}/predictions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: m.input(prompt) }),
    });

    const prediction = await create.json();
    if (!create.ok) return res.status(500).json({ error: prediction.detail || JSON.stringify(prediction) });

    // Poll até terminar (máx 5 min)
    let result = prediction;
    for (let i = 0; i < 100; i++) {
      if (result.status === 'succeeded') break;
      if (result.status === 'failed') return res.status(500).json({ error: result.error || 'Falhou' });
      await new Promise(r => setTimeout(r, 3000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      result = await poll.json();
    }

    const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    return res.status(200).json({ video: videoUrl });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

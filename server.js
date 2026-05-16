require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/generate', async (req, res) => {
  const {
    nome,
    idade,
    etnia,
    altura,
    corporal,
    cabelo,
    olhos,
    personalidade,
    cenario,
    extras,
  } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API Key não configurada no servidor.' });
  }

  const prompt = `Você é um escritor especializado em conteúdo adulto criativo e sensual para adultos (+18). Crie uma descrição detalhada e envolvente baseada nas seguintes características:

**Personagem:**
- Nome: ${nome || 'Sem nome definido'}
- Idade: ${idade || 'adulta'} anos
- Etnia/Aparência: ${etnia || 'não especificada'}
- Altura: ${altura || 'não especificada'}
- Tipo corporal: ${corporal || 'não especificado'}
- Cabelo: ${cabelo || 'não especificado'}
- Olhos: ${olhos || 'não especificados'}
- Personalidade: ${personalidade || 'não especificada'}

**Cenário/Contexto:** ${cenario || 'Sem cenário definido'}

**Detalhes extras:** ${extras || 'Nenhum'}

Crie uma narrativa adulta (+18), sensual e detalhada com:
1. Descrição física vívida da personagem
2. Apresentação da personalidade e carisma dela
3. Desenvolvimento do cenário proposto
4. Narrativa envolvente e explícita adequada para adultos

Escreva de forma literária, criativa e apaixonante. A narrativa deve ter pelo menos 400 palavras.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0].text;
    res.json({ content });
  } catch (error) {
    console.error('Erro na API Anthropic:', error.message);
    res.status(500).json({ error: `Erro ao gerar conteúdo: ${error.message}` });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

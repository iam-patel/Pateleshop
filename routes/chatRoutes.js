import express from 'express';
import Groq from 'groq-sdk';
import Product from '../models/product.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const { message } = req.body;

    // Fetch products from your DB
    const products = await Product.find().limit(20);
    const productList = products.map(p =>
      `${p.name} - ₹${p.price} (${p.category})`
    ).join('\n');

    const systemPrompt = `
You are a helpful AI assistant for Patel Shop, an Indian e-commerce store.
Always reply in English only, even if customer writes in Hindi.
Keep answers short and to the point - maximum 2-3 sentences.
Only answer what is asked, nothing extra.

Our Products:
${productList}

FAQs:
- Delivery takes 3-5 business days
- We accept UPI, cards, and Cash on Delivery
- Returns accepted within 7 days
- Contact support: pateshop@gmail.com

Rules:
- Only answer questions related to our store and products.
- If you don't know something, say "Please contact us at pateshop@gmail.com".
- Never make up product prices or details that are not listed above.
- Keep replies short and simple.

Only answer questions related to our store and products.
If you don't know something, politely say you will connect them to human support.
    `;

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 150
    });

    res.json({ reply: response.choices[0].message.content });

  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
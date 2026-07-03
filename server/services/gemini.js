import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT,
  location: 'asia-south1',
});

const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * Call Gemini 2.5 Flash via Vertex AI.
 * @param {Object} opts
 * @param {string} opts.systemPrompt - The system/persona prompt
 * @param {Array<{author: string, content: string}>} opts.history - Messages to send
 * @param {number} [opts.maxOutputTokens=1200] - Max response tokens
 * @returns {Promise<{text: string|null, usage: object, error: string|null}>}
 */
export async function callGemini({ systemPrompt, history, maxOutputTokens = 1200 }) {
  // Build contents array from history
  const contents = [];

  // Map history: user1/user2 -> user, ai -> model
  for (const msg of history) {
    contents.push({
      role: msg.author === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  try {
    const result = await model.generateContent({
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        maxOutputTokens,
        temperature: 0.9,
      },
    });

    const candidate = result.response?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || null;

    return { text, usage: {}, error: null };
  } catch (err) {
    return { text: null, usage: {}, error: `Vertex AI error: ${err.message}` };
  }
}

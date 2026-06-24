const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Call Gemini 1.5 Flash API.
 * @param {Object} opts
 * @param {string} opts.systemPrompt - The system/persona prompt
 * @param {Array<{author: string, content: string}>} opts.history - Messages to send
 * @param {number} [opts.maxOutputTokens=1200] - Max response tokens
 * @returns {Promise<{text: string|null, usage: object, error: string|null}>}
 */
export async function callGemini({ systemPrompt, history, maxOutputTokens = 1200 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { text: null, usage: {}, error: 'GEMINI_API_KEY not set in .env' };
  }

  // Build contents array: system prompt as first user message + model acknowledgment
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I will play this role.' }] },
  ];

  // Map history: user1/user2 -> user, ai -> model
  for (const msg of history) {
    contents.push({
      role: msg.author === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens,
          temperature: 0.9,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { text: null, usage: {}, error: `Gemini API error ${response.status}: ${errText}` };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    const usage = data?.usageMetadata || {};

    return { text, usage, error: null };
  } catch (err) {
    return { text: null, usage: {}, error: `Network error: ${err.message}` };
  }
}

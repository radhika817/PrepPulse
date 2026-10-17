import { getAiConfig } from '../../config/ai.config.js';

/**
 * Provider Call Implementation: Groq
 * Endpoint: https://api.groq.com/openai/v1/chat/completions (POST)
 * Compatible with OpenAI chat completions format.
 * Documentation: https://console.groq.com/docs/openai & https://console.groq.com/docs/text-chat
 */
const callGroq = async ({ messages, config, jsonMode = false }) => {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  const requestBody = {
    model: config.model,
    messages,
    temperature: 0.2,
  };

  if (jsonMode) {
    // Groq OpenAI-compatible JSON mode
    requestBody.response_format = { type: 'json_object' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = new Error(`LLM provider responded with status ${response.status}`);
      err.code = 'AI_UNAVAILABLE';
      err.statusCode = 502;
      throw err;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      const err = new Error('LLM provider returned an empty response');
      err.code = 'AI_INVALID_OUTPUT';
      err.statusCode = 502;
      throw err;
    }

    return content;
  } catch (error) {
    if (error.name === 'AbortError' || error.code === 'ABORT_ERR') {
      const timeoutError = new Error('LLM provider request timed out');
      timeoutError.code = 'AI_TIMEOUT';
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    if (!error.statusCode) {
      error.code = 'AI_UNAVAILABLE';
      error.statusCode = 502;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Single function entry point for calling the configured LLM provider.
 * Keeps provider specifics behind this module.
 *
 * @param {Object} params
 * @param {string} params.systemPrompt - Instructions for the model
 * @param {string} params.userPrompt - Structured input containing delimited data
 * @param {boolean} [params.jsonMode=true] - Whether to enforce JSON mode
 * @returns {Promise<string>} Model output content
 */
export const callLLM = async ({ systemPrompt, userPrompt, jsonMode = true }) => {
  const config = getAiConfig();

  if (!config.apiKey) {
    const err = new Error('AI service is not configured');
    err.code = 'AI_DISABLED';
    err.statusCode = 503;
    throw err;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  switch (config.provider) {
    case 'groq':
    default:
      return await callGroq({ messages, config, jsonMode });
  }
};

export default {
  callLLM,
};

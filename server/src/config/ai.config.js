/**
 * AI & LLM Provider Configuration
 * Reads provider settings from environment variables with sensible defaults.
 * The API key is kept exclusively on the server and never exposed to client or logs.
 */

export const getAiConfig = () => {
  const provider = (process.env.LLM_PROVIDER || 'groq').trim().toLowerCase();
  const apiKey = (process.env.LLM_API_KEY || process.env.GROQ_API_KEY || '').trim();
  const model = (process.env.LLM_MODEL || 'llama-3.3-70b-versatile').trim();
  const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '20000', 10);
  const dailyLimit = parseInt(process.env.AI_DAILY_LIMIT || '15', 10);

  return {
    provider,
    apiKey,
    model,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000,
    dailyLimit: Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : 15,
  };
};

/**
 * Returns null if configured, or a descriptive reason string if disabled:
 * 'missing_key' | 'missing_model' | 'unknown_provider'
 */
export const getAiConfigReason = () => {
  const config = getAiConfig();
  if (config.provider !== 'groq') {
    return 'unknown_provider';
  }
  if (!config.apiKey || config.apiKey.length === 0) {
    return 'missing_key';
  }
  if (!config.model || config.model.length === 0) {
    return 'missing_model';
  }
  return null;
};

/**
 * Checks whether AI features are fully configured and ready to be used.
 * Returns true only when LLM_API_KEY and model are set and non-empty.
 */
export const isAiConfigured = () => {
  return getAiConfigReason() === null;
};

export default {
  getAiConfig,
  getAiConfigReason,
  isAiConfigured,
};

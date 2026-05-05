const { configSchema } = require('./schema');

function loadConfig() {
  // Load .env in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }

  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Configuration validation failed:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid configuration. Check environment variables.');
  }

  return result.data;
}

module.exports = loadConfig();

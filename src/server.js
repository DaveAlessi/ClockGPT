const { createApp } = require('./app');

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const { app } = await createApp();
  app.listen(PORT, () => {
    console.log('\n🌍 Timezone Test Application Running!');
    console.log(`📍 Local URL: http://localhost:${PORT}`);
    console.log('\nPress Ctrl+C to stop the server.\n');
  });
}

if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

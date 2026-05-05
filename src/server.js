const { createApp } = require('./app');

const PORT = Number(process.env.PORT || 3000);

if (require.main === module) {
  const { app } = createApp();
  app.listen(PORT, () => {
    console.log('\n🌍 Timezone Test Application Running!');
    console.log(`📍 Local URL: http://localhost:${PORT}`);
    console.log('\nPress Ctrl+C to stop the server.\n');
  });
}

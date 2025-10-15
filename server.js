const app = require('./src/app');
const prisma = require('./src/config/database');

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {

     // Test des variables d'environnement
    console.log("✅ PORT:", process.env.PORT);
    console.log("✅ NODE_ENV:", process.env.NODE_ENV);
    console.log("✅ FRONT_URL:", process.env.FRONT_URL);
    console.log("✅ KEYCLOAK_SERVER_URL:", process.env.KEYCLOAK_BASE_URL);
    console.log("✅ SMTP_HOST:", process.env.SMTP_HOST);
    console.log("✅ SMTP_USER:", process.env.SMTP_USER);


    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection established successfully.');

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔐 Keycloak integrated: ${process.env.KEYCLOAK_SERVER_URL}`);
      console.log('📋 Ready to handle demandes!');
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

startServer();
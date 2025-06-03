// const app = require('./src/app');

// const sequelize = require('./src/config/database');


// const PORT = process.env.PORT || 3001;


// const startServer = async ()=>{
//     try{
        
//         await sequelize.authenticate();
//         console.log('✅ Database connection established successfully.');

//         // Sync all models
//         await sequelize.sync({force : false});
//         console.log('✅ Database synchronized successfully.');

//         app.listen(PORT , ()=> {
//             console.log(`🚀 Server is running on port ${PORT}`);
//             console.log(`📍 Environment: ${process.env.NODE_ENV}`);
//             console.log(`🔐 Keycloak integrated: ${process.env.KEYCLOAK_SERVER_URL}`);
//             console.log(`📋 Ready to handle demandes!`);
//         });

//     }catch(error){
//         console.error('❌ Unable to start server:', error);
//         process.exit(1);
//     }
// }


// startServer();



const app = require('./src/app');
const prisma = require('./src/config/database');

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
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
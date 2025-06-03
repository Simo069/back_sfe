// const {Sequelize} = require('sequelize');

// require('dotenv').config();

// const sequelize = new Sequelize({
//     host : process.env.DB_HOST,
//     port : process.env.DB_PORT,
//     username : process.env.DB_USER,
//     database: process.env.DB_NAME,
//     password: process.env.DB_PASSWORD,
//     dialect : 'postgres',


//     pool : {
//         max:10,
//         miin:0,
//         acquire:30000,
//         idle:10000
//     },


//     logging : process.env.NODE_ENV==='development' ? console.log : false,

//     timezone:'+00:00'


// });


// module.exports=sequelize;



const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : [],
});

module.exports = prisma;

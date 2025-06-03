// // models/User.js
// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');

// const User = sequelize.define('User', {
//   id: {
//     type: DataTypes.UUID,
//     defaultValue: DataTypes.UUIDV4,
//     primaryKey: true
//   },
//   keycloakId: {
//     type: DataTypes.STRING,
//     unique: true,
//     allowNull: false,
//     field: 'keycloak_id'
//   },
//   email: {
//     type: DataTypes.STRING,
//     unique: true,
//     allowNull: false,
//     validate: {
//       isEmail: true
//     }
//   },
//   firstName: {
//     type: DataTypes.STRING,
//     allowNull: true,
//     field: 'first_name'
//   },
//   lastName: {
//     type: DataTypes.STRING,
//     allowNull: true,
//     field: 'last_name'
//   },
//   username: {
//     type: DataTypes.STRING,
//     unique: true,
//     allowNull: false
//   },
//   isActive: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: true,
//     field: 'is_active'
//   },
//   lastLogin: {
//     type: DataTypes.DATE,
//     allowNull: true,
//     field: 'last_login'
//   }
// }, {
//   tableName: 'users',
//   timestamps: true,
//   underscored: true
// });

// module.exports = User;


// // models/User.js
// const { DataTypes } = require("sequelize");
// const sequelize = require("../config/database");

// const User = sequelize.define(
//   "User",
//   {
//     id: {
//       type: DataTypes.UUID,
//       defaultValue: DataTypes.UUIDV4,
//       primaryKey: true,
//     },
//     keycloakId: {
//       type: DataTypes.STRING,
//       unique: true,
//       allowNull: false,
//       field: "keycloak_id",
//     },
//     email: {
//       type: DataTypes.STRING,
//       unique: true,
//       allowNull: false,
//       validate: {
//         isEmail: true,
//       },
//     },
//     firstName: {
//       type: DataTypes.STRING,
//       allowNull: true,
//       field: "first_name",
//     },
//     lastName: {
//       type: DataTypes.STRING,
//       allowNull: true,
//       field: "last_name",
//     },
//     username: {
//       type: DataTypes.STRING,
//       unique: true,
//       allowNull: false,
//     },
//     isActive: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: true,
//       field: "is_active",
//     },
//     lastLogin: {
//       type: DataTypes.DATE,
//       allowNull: true,
//       field: "last_login",
//     },
//   },
//   {
//     tableName: "users",
//     timestamps: true,
//     underscored: true,
//   }
// );

// module.exports = User;
// ===== 1. models/User.js (Updated) =====


// const { DataTypes } = require("sequelize");
// const sequelize = require("../config/database");

// const User = sequelize.define(
//   "User",
//   {
//     id: {
//       type: DataTypes.UUID,
//       defaultValue: DataTypes.UUIDV4,
//       primaryKey: true,
//     },
//     keycloakId: {
//       type: DataTypes.STRING,
//       unique: true,
//       allowNull: false,
//       field: "keycloak_id",
//     },
//     email: {
//       type: DataTypes.STRING,
//       unique: true,
//       allowNull: false,
//       validate: {
//         isEmail: true,
//       },
//     },
//     firstName: {
//       type: DataTypes.STRING,
//       allowNull: true,
//       field: "first_name",
//     },
//     lastName: {
//       type: DataTypes.STRING,
//       allowNull: true,
//       field: "last_name",
//     },
//     username: {
//       type: DataTypes.STRING,
//       unique: true,
//       allowNull: false,
//     },
//     isActive: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: true,
//       field: "is_active",
//     },
//     lastLogin: {
//       type: DataTypes.DATE,
//       allowNull: true,
//       field: "last_login",
//     },
//     roles : {
//         type : DataTypes.ARRAY(DataTypes.STRING),
//         defaultValue:['user'],
//         allowNull:false
//     }
//   },
//   {
//     tableName: "users",
//     timestamps: true,
//     underscored: true,
//   }
// );

// // Instance methods for role checking
// User.prototype.isAdmin = function() {
//   return this.role === 'admin';
// };

// User.prototype.isManager = function() {
//   return this.role === 'manager';
// };

// User.prototype.isUser = function() {
//   return this.role === 'user';
// };

// User.prototype.hasRoleOrAbove = function(role) {
//   const hierarchy = { user: 1, manager: 2, admin: 3 };
//   return hierarchy[this.role] >= hierarchy[role];
// };

// module.exports = User;


const prisma = require('../config/database');

class User {
  static async findOrCreate({ where, defaults }) {
    let user = await prisma.user.findUnique({
      where: { keycloakId: where.keycloakId }
    });
    
    let created = false;
    if (!user) {
      user = await prisma.user.create({
        data: defaults
      });
      created = true;
    }
    
    return [user, created];
  }

  static async findOne({ where }) {
    return await prisma.user.findUnique({
      where: where
    });
  }

  static async create(data) {
    return await prisma.user.create({
      data: data
    });
  }

  static async findByPk(id) {
    return await prisma.user.findUnique({
      where: { id: id }
    });
  }

  // Instance methods - these would be added to individual user objects
  static addInstanceMethods(user) {
    if (!user) return user;
    
    user.isAdmin = function() {
      return this.roles.includes('admin');
    };

    user.isManager = function() {
      return this.roles.includes('manager');
    };

    user.isUser = function() {
      return this.roles.includes('user');
    };

    user.hasRoleOrAbove = function(role) {
      const hierarchy = { user: 1, manager: 2, admin: 3 };
      const userMaxRole = Math.max(...this.roles.map(r => hierarchy[r] || 0));
      return userMaxRole >= hierarchy[role];
    };

    user.save = async function() {
      return await prisma.user.update({
        where: { id: this.id },
        data: this
      });
    };

    return user;
  }
}

module.exports = User;
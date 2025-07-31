


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
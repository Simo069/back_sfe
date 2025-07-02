// // middleware/roleMiddleware.js
// const User = require('../models/User');

// // Middleware to check user roles
// const requireRole = (allowedRoles) => {
//   return async (req, res, next) => {
//     try {
//       // Get user from Keycloak token
//       if (!req.kauth || !req.kauth.grant) {
//         return res.status(401).json({
//           success: false,
//           message: 'Authentication required'
//         });
//       }

//       const keycloakId = req.kauth.grant.access_token.content.sub;

//       // Get user from database
//       const user = await User.findOne({ where: { keycloakId } });

//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           message: 'User not found'
//         });
//       }

//       // Check if user has any of the required roles
//       const userRoles = user.roles || [];
//       const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

//       if (!hasRequiredRole) {
//         return res.status(403).json({
//           success: false,
//           message: 'Insufficient permissions'
//         });
//       }

//       // Add user to request object for use in routes
//       req.user = user;
//       next();
//     } catch (error) {
//       console.error('Role middleware error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   };
// };

// // Specific role checkers
// const requireAdmin = requireRole(['admin']);
// const requireManager = requireRole(['admin', 'manager']);
// const requireUser = requireRole(['admin', 'manager', 'user']);

// module.exports = {
//   requireRole,
//   requireAdmin,
//   requireManager,
//   requireUser
// };

// middleware/roleMiddleware.js
const prisma = require('../config/database');

// Middleware to check user roles
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
      try {
        // Get user from Keycloak token
        if (!req.kauth || !req.kauth.grant) {
          return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
          });
        }

        const keycloakId = req.kauth.grant.access_token.content.sub;
        
        // Get user from database using Prisma
        const user = await prisma.user.findUnique({ 
          where: { keycloakId } 
        });
        
        if (!user) {
          return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
          });
        }

        // Check if user has any of the required roles
        const userRoles = user.roles || [];
        const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
          return res.status(403).json({ 
            success: false, 
            message: 'Insufficient permissions',
            required: allowedRoles,
            userRoles: userRoles
          });
        }

        // Add user to request object for use in routes
        req.user = user;
        next();
      } catch (error) {
        console.error('Role middleware error:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Internal server error' 
        });
      }
    };
};

// Specific role checkers
const requireAdmin = requireRole(['admin']);
const requireManager = requireRole(['admin', 'manager']);
const requireUser = requireRole(['admin', 'manager', 'user']);
const requireDashboardViewer = requireRole(['admin', 'dashboard_viewer']);

// Helper function to check if user has specific role
const hasRole = (user, role) => {
  return user.roles && user.roles.includes(role);
};

// Helper function to check if user has role or above in hierarchy
const hasRoleOrAbove = (user, role) => {
  const hierarchy = { user: 1, manager: 2, admin: 3 };
  const userMaxRole = Math.max(...(user.roles || []).map(r => hierarchy[r] || 0));
  return userMaxRole >= hierarchy[role];
};

module.exports = {
  requireRole,
  requireAdmin,
  requireManager,
  requireUser,
  requireDashboardViewer,
  hasRole,
  hasRoleOrAbove
};
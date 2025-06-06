// // routes/auth.js
// const express = require('express');
// const jwt = require('jsonwebtoken');
// const axios = require('axios');
// const { keycloak } = require('../config/keycloak');
// const User = require('../models/User');

// const router = express.Router();


// // Login route
// router.post('/login', async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     // Get token from Keycloak
//     const tokenResponse = await axios.post(
//       `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
//       new URLSearchParams({
//         grant_type: 'password',
//         client_id: process.env.KEYCLOAK_CLIENT_ID,
//         client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
//         username,
//         password
//       }),
//       {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded'
//         }
//       }
//     );

//     const { access_token, refresh_token } = tokenResponse.data;

//     // Decode token to get user info
//     const decodedToken = jwt.decode(access_token);
//     console.log("decodedoken", decodedToken);

//     // Create or update user in local database
//     const [user, created] = await User.findOrCreate({
//       where: { keycloakId: decodedToken.sub },
//       defaults: {
//         keycloakId: decodedToken.sub,
//         email: decodedToken.email,
//         firstName: decodedToken.given_name,
//         lastName: decodedToken.family_name,
//         username: decodedToken.preferred_username,
//         lastLogin: new Date()
//       }
//     });

//     if (!created) {
//       user.lastLogin = new Date();
//       await user.save();
//     }

//     res.json({
//       success: true,
//       user: {
//         id: user.id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         username: user.username
//       },
//       tokens: {
//         access_token,
//         refresh_token
//       }
//     });

//   } catch (error) {
//     console.error('Login error:', error.response?.data || error.message);
//     res.status(401).json({
//       success: false,
//       message: 'Invalid credentials'
//     });
//   }
// });

// // Register route
// router.post('/register', async (req, res) => {
//   try {
//     const { username, email, password, firstName, lastName , role = "user" } = req.body;

//     // Create user in Keycloak
//     const adminToken = await getAdminToken();
    
//     const userPayload = {
//       username,
//       email,
//       firstName,
//       lastName,
//       enabled: true,
//       credentials: [{
//         type: 'password',
//         value: password,
//         temporary: false
//       }]
//     };

//     const createUserResponse = await axios.post(
//       `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`,
//       userPayload,
//       {
//         headers: {
//           'Authorization': `Bearer ${adminToken}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     // Get the created user's ID from Location header
//     const locationHeader = createUserResponse.headers.location;
//     const keycloakUserId = locationHeader.split('/').pop();

//     // Create user in local database
//     const user = await User.create({
//       keycloakId: keycloakUserId,
//       email,
//       firstName,
//       lastName,
//       username
//     });

//     res.json({
//       success: true,
//       message: 'User registered successfully',
//       user: {
//         id: user.id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         username: user.username
//       }
//     });

//   } catch (error) {
//     console.error('Registration error:', error.response?.data || error.message);
//     res.status(400).json({
//       success: false,
//       message: 'Registration failed',
//       error: error.response?.data?.errorMessage || error.message
//     });
//   }
// });

// // Get admin token for Keycloak admin operations
// async function getAdminToken() {
//   try {
//     const response = await axios.post(
//       getTokenUrl(),
//       new URLSearchParams({
//         grant_type: "client_credentials",
//         client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID,
//         client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );
//     return response.data.access_token;
//   } catch (error) {
//     console.error(
//       "Failed to get admin token:",
//       error.response?.data || error.message
//     );
//     throw new Error("Failed to obtain admin token");
//   }
// }


// // Logout route
// router.post('/logout', keycloak.protect(), async (req, res) => {
//   try {
//     req.kauth.logout();
//     res.json({ success: true, message: 'Logged out successfully' });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Logout failed' });
//   }
// });

// // Verify token route
// router.get('/verify', keycloak.protect(), async (req, res) => {
//   try {
//     const keycloakId = req.kauth.grant.access_token.content.sub;
//     const user = await User.findOne({ where: { keycloakId } });
    
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     res.json({
//       success: true,
//       user: {
//         id: user.id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         username: user.username
//       }
//     });
//   } catch (error) {
//     res.status(401).json({ success: false, message: 'Invalid token' });
//   }
// });

// module.exports = router;


// routes/auth.js



// const express = require('express');
// const jwt = require('jsonwebtoken');
// const axios = require('axios');
// const { keycloak } = require('../config/keycloak');
// const User = require('../models/User');

// const router = express.Router();


// // Login route
// router.post('/login', async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     // Get token from Keycloak
//     const tokenResponse = await axios.post(
//       `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
//       new URLSearchParams({
//         grant_type: 'password',
//         client_id: process.env.KEYCLOAK_CLIENT_ID,
//         client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
//         username,
//         password
//       }),
//       {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded'
//         }
//       }
//     );

//     const { access_token, refresh_token } = tokenResponse.data;

//     // Decode token to get user info
//     const decodedToken = jwt.decode(access_token);
//     console.log("decodedoken", decodedToken);

//     // Extract roles from Keycloak token
//     const keycloakRoles = decodedToken.realm_access?.roles || [];
//     const appRoles = keycloakRoles.filter((role) =>
//       ["user", "manager", "admin"].includes(role)
//     );

//     // Create or update user in local database
//     const [user, created] = await User.findOrCreate({
//       where: { keycloakId: decodedToken.sub },
//       defaults: {
//         keycloakId: decodedToken.sub,
//         email: decodedToken.email,
//         firstName: decodedToken.given_name,
//         lastName: decodedToken.family_name,
//         username: decodedToken.preferred_username,
//         roles: appRoles.length > 0 ? appRoles : ["user"],
//         lastLogin: new Date()
//       }
//     });

//     if (!created) {
//       user.lastLogin = new Date();
//       await user.save();
//     }

//     res.json({
//       success: true,
//       user: {
//         id: user.id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         username: user.username,
//         roles: user.roles,
//       },
//       tokens: {
//         access_token,
//         refresh_token
//       }
//     });

//   } catch (error) {
//     console.error('Login error:', error.response?.data || error.message);
//     res.status(401).json({
//       success: false,
//       message: 'Invalid credentials'
//     });
//   }
// });

// // Register route
// router.post('/register', async (req, res) => {
//   try {
//     const {  email, password, firstName, lastName , role = "user" } = req.body;
//     const username = email;
//     // Validate role
//     const validRoles = ["user", "manager", "admin"];
//     if (!validRoles.includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid role specified",
//       });
//     }
//     // Create user in Keycloak
//     const adminToken = await getAdminToken();
    
//     const userPayload = {
//       username,
//       email,
//       firstName,
//       lastName,
//       enabled: true,
//       credentials: [{
//         type: 'password',
//         value: password,
//         temporary: false
//       }]
//     };
//     console.log("test2");
//     // First check if user exists
//     const checkResponse = await axios.get(
//       `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?username=${username}`,
//       {
//         headers: {
//           Authorization: `Bearer ${adminToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );
//     console.log("test3");

//     if (checkResponse.data && checkResponse.data.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Username already exists",
//       });
//     }

//     const createUserResponse = await axios.post(
//       `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`,
//       userPayload,
//       {
//         headers: {
//           'Authorization': `Bearer ${adminToken}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     // Get the created user's ID from Location header
//     const locationHeader = createUserResponse.headers.location;
//     const keycloakUserId = locationHeader.split('/').pop();

//     await assignKeycloakRole(adminToken, keycloakUserId, role);



//     // Create user in local database
//     const user = await User.create({
//       keycloakId: keycloakUserId,
//       email,
//       firstName,
//       lastName,
//       username,
//       roles:[role]
//     });

//     res.json({
//       success: true,
//       message: 'User registered successfully',
//       user: {
//         id: user.id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         username: user.username,
//         roles: user.roles,
//       }
//     });

//   } catch (error) {
//     console.error('Registration error:', error.response?.data || error.message);
//     res.status(400).json({
//       success: false,
//       message: 'Registration failed',
//       error: error.response?.data?.errorMessage || error.message
//     });
//   }
// });
// // Assign role to user in Keycloak
// async function assignKeycloakRole(adminToken, userId, roleName) {
//   try {
//     // First, get the role ID
//     const rolesResponse = await axios.get(
//       `http://localhost:4000/admin/realms/realmsfe/roles`,
//       {
//         headers: {
//           Authorization: `Bearer ${adminToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const role = rolesResponse.data.find((r) => r.name === roleName);
//     if (!role) {
//       throw new Error(`Role ${roleName} not found`);
//     }

//     // Assign role to user
//     await axios.post(
//       `http://localhost:4000/admin/realms/realmsfe/users/${userId}/role-mappings/realm`,
//       [role],
//       {
//         headers: {
//           Authorization: `Bearer ${adminToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );
//   } catch (error) {
//     console.error(
//       "Error assigning role:",
//       error.response?.data || error.message
//     );
//     throw error;
//   }
// }
// // Get admin token for Keycloak admin operations
// async function getAdminToken() {
//   try {
//     const response = await axios.post(
//       `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
//       new URLSearchParams({
//         grant_type: "client_credentials",
//         client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID,
//         client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );
//     return response.data.access_token;
//   } catch (error) {
//     console.error(
//       "Failed to get admin token:",
//       error.response?.data || error.message
//     );
//     throw new Error("Failed to obtain admin token");
//   }
// }


// // Logout route
// router.post('/logout', keycloak.protect(), async (req, res) => {
//   try {
//     req.kauth.logout();
//     res.json({ success: true, message: 'Logged out successfully' });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Logout failed' });
//   }
// });

// // Verify token route
// router.get('/verify', keycloak.protect(), async (req, res) => {
//   try {
//     const keycloakId = req.kauth.grant.access_token.content.sub;
//     const user = await User.findOne({ where: { keycloakId } });
    
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     res.json({
//       success: true,
//       user: {
//         id: user.id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         username: user.username,
//         roles: user.roles,
//       }
//     });
//   } catch (error) {
//     res.status(401).json({ success: false, message: 'Invalid token' });
//   }
// });

// module.exports = router;



const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { keycloak } = require('../config/keycloak');
const User = require('../models/User');
const prisma = require('../config/database');

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get token from Keycloak (same as before)
    const tokenResponse = await axios.post(
      `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'password',
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        username,
        password
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;
    const decodedToken = jwt.decode(access_token);

    const keycloakRoles = decodedToken.realm_access?.roles || [];
    const appRoles = keycloakRoles.filter((role) =>
      ["user", "manager", "admin"].includes(role)
    );

    // Prisma findOrCreate equivalent
    let user = await prisma.user.findUnique({
      where: { keycloakId: decodedToken.sub }
    });

    let created = false;
    if (!user) {
      user = await prisma.user.create({
        data: {
          keycloakId: decodedToken.sub,
          email: decodedToken.email,
          firstName: decodedToken.given_name,
          lastName: decodedToken.family_name,
          username: decodedToken.preferred_username,
          roles: appRoles.length > 0 ? appRoles : ["user"],
          lastLogin: new Date()
        },
        include : {departement:true}
      });
      created = true;
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
        include : {departement:true}
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        roles: user.roles,
        departement: user.departement
      },
      tokens: {
        access_token,
        refresh_token
      }
    });

  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = "user" , departementId} = req.body;
    const username = email;

    const validRoles = ["user", "manager", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }
    // Si c'est un user normal, ignorer le departementId même s'il est fourni
    if (role === 'user' && departementId) {
      departementId = null; // Les users normaux n'appartiennent pas à un département
    }
    const adminToken = await getAdminToken();
    
    const userPayload = {
      username,
      email,
      firstName,
      lastName,
      enabled: true,
      credentials: [{
        type: 'password',
        value: password,
        temporary: false
      }]
    };

    // Check if user exists in Keycloak
    const checkResponse = await axios.get(
      `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?username=${username}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (checkResponse.data && checkResponse.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    const createUserResponse = await axios.post(
      `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`,
      userPayload,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const locationHeader = createUserResponse.headers.location;
    const keycloakUserId = locationHeader.split('/').pop();

    await assignKeycloakRole(adminToken, keycloakUserId, role);

    // Create user with Prisma
    const user = await prisma.user.create({
      data: {
        keycloakId: keycloakUserId,
        email,
        firstName,
        lastName,
        username,
        roles: [role],
        
      },
      include: {
        departement: true 
      }
    });

    res.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        roles: user.roles,
        departement: user.departement
      }
    });

  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    res.status(400).json({
      success: false,
      message: 'Registration failed',
      error: error.response?.data?.errorMessage || error.message
    });
  }
});

// Verify token route
router.get('/verify', keycloak.protect(), async (req, res) => {
  try {
    const keycloakId = req.kauth.grant.access_token.content.sub;
    const user = await prisma.user.findUnique({ 
      where: { keycloakId }, 
      include: {departement: true}
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        roles: user.roles,
        departement : user.departement
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Keep other functions the same (getAdminToken, assignKeycloakRole, logout)
async function getAdminToken() {
  try {
    const response = await axios.post(
      `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    return response.data.access_token;
  } catch (error) {
    console.error(
      "Failed to get admin token:",
      error.response?.data || error.message
    );
    throw new Error("Failed to obtain admin token");
  }
}

async function assignKeycloakRole(adminToken, userId, roleName) {
  try {
    const rolesResponse = await axios.get(
      `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/roles`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const role = rolesResponse.data.find((r) => r.name === roleName);
    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    await axios.post(
      `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`,
      [role],
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error assigning role:",
      error.response?.data || error.message
    );
    throw error;
  }
}

router.post('/logout', keycloak.protect(), async (req, res) => {
  try {
    req.kauth.logout();
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});






module.exports = router;
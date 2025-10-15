// const express = require("express");
// const jwt = require("jsonwebtoken");
// const axios = require("axios");
// const { keycloak } = require("../config/keycloak");
// const User = require("../models/User");
// const prisma = require("../config/database");

// const router = express.Router();
// const {
//   requireAdmin,
//   requireManager,
//   requireUser,
//   hasRole,
// } = require("../middleware/roleMiddlewar");
// // Login route
// router.post("/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     // Get token from Keycloak
//     const tokenResponse = await axios.post(
//       `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
//       new URLSearchParams({
//         grant_type: "password",
//         client_id: process.env.KEYCLOAK_CLIENT_ID,
//         client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
//         username,
//         password,
//       }),
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       }
//     );

//     const { access_token, refresh_token } = tokenResponse.data;
//     const decodedToken = jwt.decode(access_token);

//     const keycloakRoles = decodedToken.realm_access?.roles || [];
//     const appRoles = keycloakRoles.filter((role) =>
//       ["user", "manager", "admin"].includes(role)
//     );

//     // Prisma findOrCreate equivalent
//     let user = await prisma.user.findUnique({
//       where: { keycloakId: decodedToken.sub },
//     });

//     let created = false;
//     if (!user) {
//       user = await prisma.user.create({
//         data: {
//           keycloakId: decodedToken.sub,
//           email: decodedToken.email,
//           firstName: decodedToken.given_name,
//           lastName: decodedToken.family_name,
//           username: decodedToken.preferred_username,
//           roles: appRoles.length > 0 ? appRoles : ["user"],
//           lastLogin: new Date(),
//         },
//         include: { departement: true },
//       });
//       created = true;
//     } else {
//       user = await prisma.user.update({
//         where: { id: user.id },
//         data: { lastLogin: new Date() },
//         include: { departement: true },
//       });
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
//         departement: user.departement,
//       },
//       tokens: {
//         access_token,
//         refresh_token,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error.response?.data || error.message);
//     res.status(401).json({
//       success: false,
//       message: "Invalid credentials",
//     });
//   }
// });

// // Register route
// router.post("/register", async (req, res) => {
//   try {
//     const {
//       email,
//       password,
//       firstName,
//       lastName,
//       role = "user",
//       departementId,
//     } = req.body;
//     const username = email;

//     const validRoles = ["user", "manager", "admin"];
//     if (!validRoles.includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid role specified",
//       });
//     }
//     // Si c'est un user normal, ignorer le departementId même s'il est fourni
//     if (role === "user" && departementId) {
//       departementId = null; 
//     }
//     const adminToken = await getAdminToken();

//     const userPayload = {
//       username,
//       email,
//       firstName,
//       lastName,
//       enabled: true,
//       credentials: [
//         {
//           type: "password",
//           value: password,
//           temporary: false,
//         },
//       ],
//     };

//     // Check if user exists in Keycloak
//     const checkResponse = await axios.get(
//       `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?username=${username}`,
//       {
//         headers: {
//           Authorization: `Bearer ${adminToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

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
//           Authorization: `Bearer ${adminToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const locationHeader = createUserResponse.headers.location;
//     const keycloakUserId = locationHeader.split("/").pop();

//     await assignKeycloakRole(adminToken, keycloakUserId, role);

//     // Create user with Prisma
//     const user = await prisma.user.create({
//       data: {
//         keycloakId: keycloakUserId,
//         email,
//         firstName,
//         lastName,
//         username,
//         roles: [role],
//       },
//       include: {
//         departement: true,
//       },
//     });

//     res.json({
//       success: true,
//       message: "User registered successfully",
//       user: {
//         id: user.id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         username: user.username,
//         roles: user.roles,
//         departement: user.departement,
//       },
//     });
//   } catch (error) {
//     console.error("Registration error:", error.response?.data || error.message);
//     res.status(400).json({
//       success: false,
//       message: "Registration failed",
//       error: error.response?.data?.errorMessage || error.message,
//     });
//   }
// });

// // Verify token route
// router.get("/verify", keycloak.protect(), async (req, res) => {
//   try {
//     const keycloakId = req.kauth.grant.access_token.content.sub;
//     const user = await prisma.user.findUnique({
//       where: { keycloakId },
//       include: { departement: true },
//     });

//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
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
//         departement: user.departement,
//       },
//     });
//   } catch (error) {
//     res.status(401).json({ success: false, message: "Invalid token" });
//   }
// });


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

// async function assignKeycloakRole(adminToken, userId, roleName) {
//   try {
//     const rolesResponse = await axios.get(
//       `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/roles`,
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

//     await axios.post(
//       `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`,
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

// router.post("/logout", keycloak.protect(), async (req, res) => {
//   try {
//     req.kauth.logout();
//     res.json({ success: true, message: "Logged out successfully" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Logout failed" });
//   }
// });


// module.exports = router;





// test du forget password et reset passwd

const express = require("express");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { keycloak } = require("../config/keycloak");
const prisma = require("../config/database");
const crypto = require("crypto");
const { sendEmail } = require("../utils/mailer");

const router = express.Router();
const {
  requireAdmin,
  requireManager,
  requireUser,
  requireDashboardViewer,
  hasRole,
} = require("../middleware/roleMiddlewar");

// ---------------------- LOGIN ----------------------
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const tokenResponse = await axios.post(
      `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: "password",
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        username,
        password,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token } = tokenResponse.data;
    const decodedToken = jwt.decode(access_token);

    const keycloakRoles = decodedToken.realm_access?.roles || [];
    const appRoles = keycloakRoles.filter((role) =>
      ["user", "manager", "admin", "dashboard_viewer"].includes(role)
    );

    let user = await prisma.user.findUnique({
      where: { keycloakId: decodedToken.sub },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          keycloakId: decodedToken.sub,
          email: decodedToken.email,
          firstName: decodedToken.given_name,
          lastName: decodedToken.family_name,
          username: decodedToken.preferred_username,
          roles: appRoles.length > 0 ? appRoles : ["user"],
          lastLogin: new Date(),
        },
        include: { departement: true },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
        include: { departement: true },
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
        departement: user.departement,
      },
      tokens: {
        access_token,
        refresh_token,
      },
    });
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }
});

// ---------------------- REGISTER ----------------------
router.post("/register", async (req, res) => {
  try {
    let {
      email,
      password,
      firstName,
      lastName,
      role = "user",
      departementId,
    } = req.body;
    const username = email;

    const validRoles = ["user", "manager", "admin", "dashboard_viewer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    if (role === "user" || role === "dashboard_viewer") {
      departementId = null;
    }

    const adminToken = await getAdminToken();

    const userPayload = {
      username,
      email,
      firstName,
      lastName,
      enabled: true,
      credentials: [
        {
          type: "password",
          value: password,
          temporary: false,
        },
      ],
    };

    const checkResponse = await axios.get(
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?username=${username}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (checkResponse.data && checkResponse.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    const createUserResponse = await axios.post(
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`,
      userPayload,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const locationHeader = createUserResponse.headers.location;
    const keycloakUserId = locationHeader.split("/").pop();

    await assignKeycloakRole(adminToken, keycloakUserId, role);

    const userData = {
      keycloakId: keycloakUserId,
      email,
      firstName,
      lastName,
      username,
      roles: [role],
    };
    if (departementId) userData.departementId = departementId;

    const user = await prisma.user.create({
      data: userData,
      include: { departement: true },
    });

    res.json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error.response?.data || error.message);
    res.status(400).json({
      success: false,
      message: "Registration failed",
      error: error.response?.data?.errorMessage || error.message,
    });
  }
});

// ---------------------- VERIFY TOKEN ----------------------
router.get("/verify", keycloak.protect(), async (req, res) => {
  try {
    const keycloakId = req.kauth.grant.access_token.content.sub;
    const user = await prisma.user.findUnique({
      where: { keycloakId },
      include: { departement: true },
    });

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
});

// ---------------------- KEYCLOAK UTILS ----------------------
async function getAdminToken() {
  try {
    const response = await axios.post(
      `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
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
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/roles`,
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
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`,
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

// ---------------------- FORGOT PASSWORD ----------------------
const resetTokens = new Map();

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requis" });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1h

    // stocker token dans la Map
    resetTokens.set(token, { email, expires });

    const resetLink = `${process.env.FRONT_URL}/reset-password/${token}`;

    await sendEmail(
      email,
      "Réinitialisation de votre mot de passe",
      `<p>Bonjour,</p>
       <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
       <a href="${resetLink}">Réinitialiser mon mot de passe</a>
       <p>Ce lien est valable 1 heure.</p>`
    );

    res.json({ message: "Email de réinitialisation envoyé" });
  } catch (error) {
    console.error("Erreur forgot-password:", error.message);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ---------------------- RESET PASSWORD ----------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const data = resetTokens.get(token);

    if (!data) return res.status(400).json({ message: "Lien invalide ou expiré" });
    if (Date.now() > new Date(data.expires)) {
      resetTokens.delete(token);
      return res.status(400).json({ message: "Lien expiré" });
    }

    const adminToken = await getAdminToken();

    const userResponse = await axios.get(
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?email=${data.email}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const userId = userResponse.data[0]?.id;
    if (!userId) return res.status(404).json({ message: "Utilisateur introuvable" });

    await axios.put(
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${userId}/reset-password`,
      {
        type: "password",
        value: newPassword,
        temporary: false,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    resetTokens.delete(token);
    res.json({ message: "Mot de passe mis à jour avec succès" });
  } catch (error) {
    console.error("Erreur reset-password:", error.message);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ---------------------- LOGOUT ----------------------
router.post("/logout", keycloak.protect(), async (req, res) => {
  try {
    req.kauth.logout();
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Logout failed" });
  }
});

module.exports = router;























// code khedam sans reset password 

// const express = require("express");
// const jwt = require("jsonwebtoken");
// const axios = require("axios");
// const { keycloak } = require("../config/keycloak");
// const User = require("../models/User");
// const prisma = require("../config/database");

// const router = express.Router();
// const {
//   requireAdmin,
//   requireManager,
//   requireUser,
//   requireDashboardViewer,
//   hasRole,
// } = require("../middleware/roleMiddlewar");

// // Login route
// router.post("/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     const tokenResponse = await axios.post(
//       `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
//       new URLSearchParams({
//         grant_type: "password",
//         client_id: process.env.KEYCLOAK_CLIENT_ID,
//         client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
//         username,
//         password,
//       }),
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       }
//     );

//     const { access_token, refresh_token } = tokenResponse.data;
//     const decodedToken = jwt.decode(access_token);

//     const keycloakRoles = decodedToken.realm_access?.roles || [];
//     const appRoles = keycloakRoles.filter((role) =>
//       ["user", "manager", "admin", "dashboard_viewer"].includes(role)
//     );

//     let user = await prisma.user.findUnique({
//       where: { keycloakId: decodedToken.sub },
//     });

//     let created = false;
//     if (!user) {
//       user = await prisma.user.create({
//         data: {
//           keycloakId: decodedToken.sub,
//           email: decodedToken.email,
//           firstName: decodedToken.given_name,
//           lastName: decodedToken.family_name,
//           username: decodedToken.preferred_username,
//           roles: appRoles.length > 0 ? appRoles : ["user"],
//           lastLogin: new Date(),
//         },
//         include: { departement: true },
//       });
//       created = true;
//     } else {
//       user = await prisma.user.update({
//         where: { id: user.id },
//         data: { lastLogin: new Date() },
//         include: { departement: true },
//       });
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
//         departement: user.departement,
//       },
//       tokens: {
//         access_token,
//         refresh_token,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error.response?.data || error.message);
//     res.status(401).json({
//       success: false,
//       message: "Invalid credentials",
//     });
//   }
// });

// // Register route
// router.post("/register", async (req, res) => {
//   try {
//     let {
//       email,
//       password,
//       firstName,
//       lastName,
//       role = "user",
//       departementId,
//     } = req.body;
//     const username = email;

//     const validRoles = ["user", "manager", "admin", "dashboard_viewer"];
//     if (!validRoles.includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid role specified",
//       });
//     }

//     // Gestion departement selon rôle
//     if (role === "user") {
//       departementId = null; // Les users normaux n'appartiennent pas à un département
//     }
//     // Par exemple, si dashboard_viewer ne doit pas avoir de département:
//     if (role === "dashboard_viewer") {
//       departementId = null;  // décommenter si pas de département pour ce rôle
//     }

//     const adminToken = await getAdminToken();

//     const userPayload = {
//       username,
//       email,
//       firstName,
//       lastName,
//       enabled: true,
//       credentials: [
//         {
//           type: "password",
//           value: password,
//           temporary: false,
//         },
//       ],
//     };

//     // Check if user exists in Keycloak
//     const checkResponse = await axios.get(
//       `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?username=${username}`,
//       {
//         headers: {
//           Authorization: `Bearer ${adminToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

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
//           Authorization: `Bearer ${adminToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const locationHeader = createUserResponse.headers.location;
//     const keycloakUserId = locationHeader.split("/").pop();

//     await assignKeycloakRole(adminToken, keycloakUserId, role);

//     // Créer utilisateur dans la base avec ou sans département selon valeur
//     const userData = {
//       keycloakId: keycloakUserId,
//       email,
//       firstName,
//       lastName,
//       username,
//       roles: [role],
//     };
//     if (departementId) userData.departementId = departementId;

//     const user = await prisma.user.create({
//       data: userData,
//       include: {
//         departement: true,
//       },
//     });

//     res.json({
//       success: true,
//       message: "User registered successfully",
//       user: {
//         id: user.id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         username: user.username,
//         roles: user.roles,
//         departement: user.departement,
//       },
//     });
//   } catch (error) {
//     console.error("Registration error:", error.response?.data || error.message);
//     res.status(400).json({
//       success: false,
//       message: "Registration failed",
//       error: error.response?.data?.errorMessage || error.message,
//     });
//   }
// });

// // Verify token route
// router.get("/verify", keycloak.protect(), async (req, res) => {
//   try {
//     const keycloakId = req.kauth.grant.access_token.content.sub;
//     const user = await prisma.user.findUnique({
//       where: { keycloakId },
//       include: { departement: true },
//     });

//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
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
//         departement: user.departement,
//       },
//     });
//   } catch (error) {
//     res.status(401).json({ success: false, message: "Invalid token" });
//   }
// });

// // Fonctions getAdminToken, assignKeycloakRole, logout restent inchangées
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

// async function assignKeycloakRole(adminToken, userId, roleName) {
//   try {
//     const rolesResponse = await axios.get(
//       `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/roles`,
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

//     await axios.post(
//       `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`,
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

// router.post("/logout", keycloak.protect(), async (req, res) => {
//   try {
//     req.kauth.logout();
//     res.json({ success: true, message: "Logged out successfully" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Logout failed" });
//   }
// });

// module.exports = router;
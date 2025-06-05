const express = require("express");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { keycloak } = require("../config/keycloak");
const {
  requireAdmin,
  requireManager,
  requireUser,
  hasRole,
} = require("../middleware/roleMiddlewar");
const prisma = require("../config/database");
const { use } = require("./demandes");
const { create } = require("../models/User");

const router = express.Router();

// Ajouter un manager (Admin seulement)
router.post("/managers", keycloak.protect(), requireAdmin, async (req, res) => {
  try {
    const { email, password, firstName, lastName, departemetId } = req.body;
    const username = email;

    //Verifications
    if (!email || !password || !firstName || !lastName || !departemetId) {
      return res.status(400).json({
        success: false,
        message:
          "Tous les champs sont requis email, password, firstName, lastName, departement ",
      });
    }

    const departement = await prisma.departement.findUnique({
      where: { id: departemetId, isActive: true },
    });

    if (!departement) {
      return res.status(400).json({
        success: false,
        message: "Département non trouvé ou inactif",
      });
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

    // Vérifier si l'utilisateur existe déjà dans Keycloak
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
        message: "Un utilisateur avec cet email existe déjà",
      });
    }

    // Créer l'utilisateur dans Keycloak
    const createUserResponse = await axios.post(
      `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`,
      userPayload,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const locationHeader = createUserResponse.headers.location;
    const keycloakUserId = locationHeader.split("/").pop();

    // Assigner le rôle manager dans Keycloak
    await assignKeycloakRole(adminToken, keycloakUserId, "manager");

    // Créer l'utilisateur dans la base de données avec le département
    const user = await prisma.user.create({
      data: {
        keycloakId: keycloakUserId,
        email,
        firstName,
        lastName,
        username,
        roles: ["manager"],
        departementId,
      },
      include: {
        departement: true,
      },
    });

    res.json({
      success: true,
      message: "Manager créé avec succès",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        roles: user.roles,
        departement: user.departement,
      },
    });
  } catch (error) {
    console.error(
      "Erreur création manager:",
      error.response?.data || error.message
    );
    res.status(400).json({
      success: false,
      message: "Erreur lors de la création du manager",
      error: error.response?.data?.errorMessage || error.message,
    });
  }
});

// Lister tous les utilisateurs avec leurs rôles et départements (Admin seulement)
router.get("/users", keycloak.protect(), requireAdmin, async (req, res) => {
  try {
    const { role } = req.query;

    let whereClause = {
      isActive: true,
    };

    if (role && ["user", "admin", "manager"].includes(role)) {
      whereClause.roles = { has: role };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        departement: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    // Grouper les utilisateurs par rôle pour une meilleure organisation
    const usersByRole = {
      admins: [],
      managers: [],
      users: [],
    };

    users.forEach((user) => {
      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        roles: user.roles,
        departement: user.departement,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      };
      if (user.roles.includes("admin")) {
        usersByRole.users.push(userData);
      } else if (user.roles.includes("manager")) {
        usersByRole.managers.push(userData);
      } else {
        usersByRole.users.push(userData);
      }
    });

    res.json({
      success: true,
      data: role
        ? users.map((user) => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            roles: user.roles,
            departement: user.departement,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
          }))
        : usersByRole,
      total: users.length,
    });
  } catch (error) {
    console.error("Erreur récupération utilisateurs:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des utilisateurs",
    });
  }
});

router.get("/managers", keycloak.protect(), requireAdmin, async (req, res) => {
  try {
    const managers = await prisma.user.findMany({
      where: {
        roles: { has: "managers" },
        isActive: true,
      },
      include: {
        departement: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    res.json({
      success: true,
      managers: managers.map((manager) => ({
        id: manager.id,
        email: manager.email,
        firstName: manager.firstName,
        lastName: manager.lastName,
        username: manager.username,
        departement: manager.departement,
        lastLogin: manager.lastLogin,
        createdAt: manager.createdAt,
      })),
    });
  } catch (error) {
    console.error("Erreur récupération managers:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des managers",
    });
  }
});

// Modifier l'affectation d'un manager à un département
router.put(
  "/managers/:id/departement",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { departementId } = req.body;

      // Vérifications
      if (!departementId) {
        return res.status(400).json({
          success: false,
          message: "L'ID du département est requis",
        });
      }

      // Vérifier que le département existe
      const departement = await prisma.departement.findUnique({
        where: { id: departementId, isActive: true },
      });

      if (!departement) {
        return res.status(400).json({
          success: false,
          message: "Departement npn touve ou inactif",
        });
      }

      // Vérifier que l'utilisateur est un manager
      const manager = await prisma.user.findUnique({
        where: { id },
      });

      if (!manager || !manager.roles.includes("manager")) {
        return res.status(400).json({
          success: false,
          message: "Utilisateur non trouvé ou n'est pas un manager",
        });
      }

      // Mettre à jour l'affectation
      const updatedManager = await prisma.user.update({
        where: { id },
        data: { departementId },
        include: { departement: true },
      });

      res.json({
        success: true,
        message: "Affectation du manager mise à jour avec succès",
        manager: {
          id: updatedManager.id,
          email: updatedManager.email,
          firstName: updatedManager.firstName,
          lastName: updatedManager.lastName,
          departement: updatedManager.departement,
        },
      });
    } catch (error) {
      console.error("Erreur modification affectation manager:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la modification de l'affectation",
      });
    }
  }
);

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



// // Statistiques des utilisateurs (Admin seulement)
// router.get('/users/stats', keycloak.protect(), requireAdmin, async (req, res) => {
//   try {
//     const [totalUsers, totalManagers, totalAdmins, totalDepartements] = await Promise.all([
//       prisma.user.count({ 
//         where: { 
//           roles: { has: 'user' },
//           isActive: true 
//         } 
//       }),
//       prisma.user.count({ 
//         where: { 
//           roles: { has: 'manager' },
//           isActive: true 
//         } 
//       }),
//       prisma.user.count({ 
//         where: { 
//           roles: { has: 'admin' },
//           isActive: true 
//         } 
//       }),
//       prisma.departement.count({ 
//         where: { isActive: true } 
//       })
//     ]);

//     // Statistiques par département
//     const departementStats = await prisma.departement.findMany({
//       where: { isActive: true },
//       include: {
//         _count: {
//           select: {
//             managers: {
//               where: {
//                 roles: { has: 'manager' },
//                 isActive: true
//               }
//             }
//           }
//         }
//       }
//     });

//     res.json({
//       success: true,
//       stats: {
//         totalUsers,
//         totalManagers,
//         totalAdmins,
//         totalDepartements,
//         totalActiveUsers: totalUsers + totalManagers + totalAdmins,
//         departementsWithManagers: departementStats.map(dept => ({
//           id: dept.id,
//           nom: dept.nom,
//           managersCount: dept._count.managers
//         }))
//       }
//     });

//   } catch (error) {
//     console.error('Erreur récupération statistiques:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Erreur lors de la récupération des statistiques'
//     });
//   }
// });



module.exports= router;
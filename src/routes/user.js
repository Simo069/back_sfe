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
router.post(
  "/add-manager",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {
      const { email, password, firstName, lastName, departemetId , orders } = req.body;
      const username = email;

      //Verifications
      if (!email || !password || !firstName || !lastName || !departemetId || !orders) {
        return res.status(400).json({
          success: false,
          message:
            "Tous les champs sont requis email, password, firstName, lastName, departement , orders ",
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
          departementId: departemetId,
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
  }
);

// helper function
const formatDate = (date) => {
  const options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // 24-hour format
  };

  return new Date(date).toLocaleString("fr-FR", options).replace(",", "");
};

// Lister tous les utilisateurs avec leurs rôles et départements (Admin seulement)
router.get("/all-users", keycloak.protect(), requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const offset = (pageNumber - 1) * pageSize;

    // Build the where clause for filtering normal users (excluding admins and managers)
    let whereClause = {
      isActive: true,
      AND: [
        {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        },
        {
          NOT: {
            roles: {
              hasSome: ["admin", "manager"],
            },
          },
        },
      ],
    };

    // Get normal users with pagination and total count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          departement: true,
          _count: {
            select: {
              demandes: true, // Include the count of demandes for each user
            },
          },
        },
        skip: offset,
        take: pageSize,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(total / pageSize);

    // Map user data to return necessary fields
    const usersData = users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      roles: user.roles,
      departement: user.departement,
      demandesCount: user._count.demandes,
      lastLogin: user.lastLogin ? formatDate(user.lastLogin) : null,
      createdAt: formatDate(user.createdAt),
    }));

    // Respond with the filtered users, pagination info, and total count
    res.json({
      success: true,
      users: usersData,
      total,
      totalPages,
      page: pageNumber,
      limit: pageSize,
    });
  } catch (error) {
    console.error("Erreur récupération des utilisateurs normaux:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des utilisateurs normaux",
    });
  }
});

//Lister les managers avec leurs departements 
router.get("/managers", keycloak.protect(), requireAdmin, async (req, res) => {
  try {
    const { departementId } = req.query;
    const managers = await prisma.user.findMany({
      where: {
        roles: { has: "manager" },
        isActive: true,
        ...(departementId && { departementId }), 
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

//Supprimer une manager (mais vraiment rend le compte desactiver pas supprimer immediatement)
router.delete(
  "/delete-user/:id",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id },
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Manager non trouvé ou l'utilisateur n'est pas un manager",
        });
      }

      // Supprimer dans Keycloak
      const adminToken = await getAdminToken();
      await axios.delete(
        `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${user.keycloakId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Supprimer dans la base de données
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: "Manager supprimé avec succès",
      });
    } catch (error) {
      console.error(
        "Erreur suppression manager:",
        error.response?.data || error.message
      );
      res.status(500).json({
        success: false,
        message: "Erreur lors de la suppression du manager",
        error: error.response?.data?.errorMessage || error.message,
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


//Change Password Route
router.put(
  "/change-password",
  keycloak.protect(),
  requireUser,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required",
        });
      }
      const keycloakId = req.kauth.grant.access_token.content.sub;
      const username = req.kauth.grant.access_token.content.preferred_username;

      // Verify current password by attempting login
      try {
        await axios.post(
          `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
          new URLSearchParams({
            grant_type: "password",
            client_id: process.env.KEYCLOAK_CLIENT_ID,
            client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
            username,
            password: currentPassword,
          }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
      } catch (verifyError) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Update password in Keycloak
      const adminToken = await getAdminToken();

      await axios.put(
        `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}/reset-password`,
        {
          type: "password",
          value: newPassword,
          temporary: false,
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error(
        "Change password error:",
        error.response?.data || error.message
      );
      res.status(500).json({
        success: false,
        message: "Failed to change password",
      });
    }
  }
);

// Reset Password Route (Send reset email)
router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        suceess: false,
        message: "Email is required",
      });
    }

    const adminToken = await getAdminToken();

    // Find user by email in Keycloak
    // Find user by email in Keycloak
    const usersResponse = await axios.get(
      `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?email=${email}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!usersResponse.data || usersResponse.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const keycloakUser = usersResponse.data[0];

    // Send password reset email
    await axios.put(
      `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakUser.id}/execute-actions-email`,
      ["UPDATE_PASSWORD"],
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Failed to send reset password email",
    });
  }
});

// Update Profile Route
router.put("/profile", keycloak.protect(), requireUser, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    console.log(firstName);
    const keycloakId = req.kauth.grant.access_token.content.sub;
    // Get current user from database
    const currentUser = await prisma.user.findUnique({
      where: { keycloakId },
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    // Prepare updates for Keycloak
    const keycloakUpdates = {};
    if (firstName) keycloakUpdates.firstName = firstName;
    if (lastName) keycloakUpdates.lastName = lastName;
    if (email && email !== currentUser.email) {
      // Check if email already exists
      const adminToken = await getAdminToken();
      const emailCheckResponse = await axios.get(
        `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users?email=${email}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (emailCheckResponse.data && emailCheckResponse.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
      keycloakUpdates.email = email;
      keycloakUpdates.username = email;
    }
    // Update in Keycloak if there are changes
    if (Object.keys(keycloakUpdates).length > 0) {
      const adminToken = await getAdminToken();
      await axios.put(
        `${process.env.KEYCLOAK_SERVER_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${keycloakId}`,
        keycloakUpdates,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Prepare updates for local database
    const dbUpdates = {};
    if (firstName) dbUpdates.firstName = firstName;
    if (lastName) dbUpdates.lastName = lastName;
    if (email) {
      dbUpdates.email = email;
      dbUpdates.username = email;
    }

    // Update in local database
    const updatedUser = await prisma.user.update({
      where: { keycloakId },
      data: dbUpdates,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        username: updatedUser.username,
        roles: updatedUser.roles,
      },
    });
  } catch (error) {
    console.error(
      "Update profile error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

//Get profile Route Information
router.get("/profile", keycloak.protect(), requireUser, async (req, res) => {
  try {
    const keycloakId = req.kauth.grant.access_token.content.sub;
    const user = await prisma.user.findUnique({
      where: { keycloakId },
      include: { departement: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
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
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
    });
  }
});

module.exports = router;

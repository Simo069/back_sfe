const express = require("express");
const multer = require("multer");
const path = require("path");
const prisma = require("../config/database");

const { keycloak } = require("../config/keycloak");

const router = express.Router();

const {
  requireAdmin,
  requireManager,
  requireUser,
  hasRole,
} = require("../middleware/roleMiddlewar");

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

// cree departement
router.post(
  "/add-departement",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Le nom du département est requis",
        });
      }
      const departement = await prisma.departement.create({
        data: {
          nom: name,
          description: description || null,
        },
      });

      res.json({
        success: true,
        message: "Département créé avec succès",
        departement,
      });
    } catch (error) {
      console.error("Erreur création département:", error);
      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          message: "Un département avec ce nom existe déjà",
        });
      }
      res.status(500).json({
        success: false,
        message: "Erreur lors de la création du département",
      });
    }
  }
);

// Lister els prisma.departements
router.get(
  "/get-departements",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {
      const departementsRaw = await prisma.departement.findMany({
        where: { isActive: true },
        include: {
          managers: {
            where: {
              roles: { has: "manager" },
              isActive: true,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              username: true,
            },
          },
        },
        orderBy: { nom: "asc" },
      });

      const departements = departementsRaw.map((dept) => ({
        ...dept,
        createdAt: formatDate(dept.createdAt),
      }));

      res.json({
        success: true,
        departements,
      });
    } catch (error) {
      console.error("Erreur récupération départements:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des départements",
      });
    }
  }
);

// Modifier un département (Admin seulement)
router.put(
  "/departements/:id",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nom, description } = req.body;
      const departement = await prisma.departement.update({
        where: { id },
        data: {
          ...(nom && { nom }),
          ...(description !== undefined && { description }),
        },
      });

      res.json({
        success: true,
        message: "Département modifié avec succès",
        departement,
      });
    } catch (error) {
      console.error("Erreur modification département:", error);
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Département non trouvé",
        });
      }
      res.status(500).json({
        success: false,
        message: "Erreur lors de la modification du département",
      });
    }
  }
);

//Supprimer departement
router.delete(
  "/delete-departements/:id",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      // Vérifie si le département existe
      const existing = await prisma.departement.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Département non trouvé",
        });
      }

      await prisma.departement.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({
        success: true,
        message: "Département supprimé avec succès",
      });
    } catch (error) {
      console.error("Erreur suppression département:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la suppression du département",
      });
    }
  }
);

module.exports = router;

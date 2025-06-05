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

// cree departement

router.post(
  "/departements",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {
      const { nom, description } = req.body;
      if (!nom) {
        return res.status(400).json({
          success: false,
          message: "Le nom du département est requis",
        });
      }
      const departement = await prisma.departement.create({
        data: {
          nom,
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
router.get("/departements", keycloak.protect(), async (req, res) => {
  try {
    const departements = await prisma.departement.findMany({
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
      orderBy: { nom: "Asc" },
    });
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
});

// Modifier un département (Admin seulement)
router.put(
  "/departements/:id",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nom, description, isActive } = req.body;
      const departement = await prisma.departement.update({
        where: { id },
        data: {
          ...(nom && { nom }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
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


module.exports= router;
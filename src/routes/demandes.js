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

// Configuration de multer pour les fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post(
  "/create",
  keycloak.protect(),
  requireUser,
  upload.single("attachment"),
  async (req, res) => {
    try {
      const userId = req.kauth.grant.access_token.content.sub;

      const user = await prisma.user.findUnique({
        where: { keycloakId: userId },
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Utilisateur non trouve" });
      }

      const demandeData = {
        demandeur: req.body.demandeur,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        detailsUsage: req.body.Details_usage,
        dureeAcces: req.body.Duree_acces,
        businessOwner: req.body.bussiness_owner,
        dateDebut: new Date(req.body.date_debut),
        dateFin: new Date(req.body.date_fin),
        direction: req.body.direction,
        directionBu: req.body.directionBu,
        environnement: req.body.environnement,
        extraction: req.body.extraction,
        finaliteAccess: req.body.finalite_access,
        interneExterne: req.body.interneExterne,
        schema: req.body.schema,
        userId: user.id,
        attachmentName: req.file ? req.file.originalname : null,
        attachmentPath: req.file ? req.file.path : null,
      };
      // Créer la demande
      const demande = await prisma.demande.create({
        data: demandeData,
      });

      // Créer les 4 validations nécessaires
      const validations = [];
      for (let i = 1; i <= 4; i++) {
        validations.push({
          ordre: i,
          demandeId: demande.id,
        });
      }

      await prisma.validation.createMany({
        data: validations,
      });

      res.json({
        success: true,
        message: "Demande créée avec succès",
        demande: demande,
      });
    } catch (error) {
      console.error("Erreur création demande:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la création de la demande",
      });
    }
  }
);

// router.get('/mes-demandes', keycloak.protect() , async (req, res)=>{
//   try{
//     const userId = req.kauth.grant.access_token.content.sub;
//     const user = await prisma.user.findUnique({
//       where : {keycloakId: userId}
//     });

//     const demandes = await prisma.demande.findMany({
//       where : {userId: userId},
//       include : {
//         validations : {
//           include: {
//             validateur : {
//               select : {
//                 firstName: true ,
//                 lastName:true ,
//                 email:true
//               }
//             }
//           },
//           orderBy : {ordre:'asc'}
//         }
//       },
//       orderBy : {createdAt : 'desc'}
//     });

//     res.json({
//       success:true,
//       demandes : demandes
//     });
//   }catch(error){
//     console.error('Erreur récupération demandes:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Erreur lors de la récupération des demandes'
//     });
//   }
// });

// Récupérer toutes les demandes d'un utilisateur
// router.get(
//   "/mes-demandes",
//   keycloak.protect(),
//   requireUser,
//   async (req, res) => {
//     try {
//       const userId = req.kauth.grant.access_token.content.sub;

//       const user = await prisma.user.findUnique({
//         where: { keycloakId: userId },
//       });

//       const demandes = await prisma.demande.findMany({
//         where: { userId: user.id },
//         include: {
//           validations: {
//             include: {
//               validateur: {
//                 select: {
//                   firstName: true,
//                   lastName: true,
//                   email: true,
//                 },
//               },
//             },
//             orderBy: { ordre: "asc" },
//           },
//         },
//         orderBy: { createdAt: "desc" },
//       });

//       res.json({
//         success: true,
//         demandes: demandes,
//       });
//     } catch (error) {
//       console.error("Erreur récupération demandes:", error);
//       res.status(500).json({
//         success: false,
//         message: "Erreur lors de la récupération des demandes",
//       });
//     }
//   }
// );

router.get(
  "/mes-demandes",
  keycloak.protect(),
  requireUser,
  async (req, res) => {
    try {
      const userId = req.kauth.grant.access_token.content.sub;
      const { page = 1, limit = 10, search, status } = req.query;

      const user = await prisma.user.findUnique({
        where: { keycloakId: userId },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur introuvable",
        });
      }

      let whereClause = {
        userId: user.id,
      };

      if (status) {
        whereClause.status = status;
      }

      if (search) {
        whereClause.OR = [
          { demandeur: { contains: search, mode: "insensitive" } },
          { direction: { contains: search, mode: "insensitive" } },
          { businessOwner: { contains: search, mode: "insensitive" } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const totalCount = await prisma.demande.count({
        where: whereClause,
      });

      const demandes = await prisma.demande.findMany({
        where: whereClause,
        include: {
          validations: {
            include: {
              validateur: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: { ordre: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: skip,
        take: take,
      });

      res.json({
        success: true,
        demandes: demandes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Erreur récupération demandes:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des demandes",
      });
    }
  }
);

router.get(
  "/all-demandes",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {
      const { status, page = 1, limit = 10, search } = req.query;

      let whereClause = {};
      if (status) {
        whereClause.status = status;
      }

      if (search) {
        whereClause.OR = [
          { demandeur: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { direction: { contains: search, mode: "insensitive" } },
          { businessOwner: { contains: search, mode: "insensitive" } },
        ];
      }
      //calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);
      //Get total count for pagination
      const totalCount = await prisma.demande.count({ where: whereClause });

      //get demandes with pagination
      const demandes = await prisma.demande.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              username: true,
            },
          },
          validations: {
            include: {
              validateur: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: { ordre: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: skip,
        take: take,
      });
      res.json({
        success: true,
        demandes: demandes,
        pagination: {
          page: parseInt(page),
          limi: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Erreur récupération toutes les demandes:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des demandes",
      });
    }
  }
);

router.get(
  "/demande-a-valider",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {
      const keycloakId = req.kauth.grant.access_token.content.sub;
      const user = await prisma.user.findUnique({
        where: { keycloakId },
      });

      const { page = 1, limit = 10, search } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      let whereClause = {
        validateurId: user.id,
        status: "EN_ATTENTE",
        demande: {},
      };

      if (search) {
        whereClause.demande = {
          OR: [
            { demandeur: { contains: search, mode: "insensitive" } },
            { direction: { contains: search, mode: "insensitive" } },
            { businessOwner: { contains: search, mode: "insensitive" } },
          ],
        };
      }

      const totalCount = await prisma.validation.count({
        where: whereClause,
      });

      // Récupérer les validations avec la demande liée
      const validations = await prisma.validation.findMany({
        where: whereClause,
        include: {
          demande: {
            include: {
              validations: {
                include: {
                  validateur: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
                orderBy: { ordre: "asc" },
              },
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });

      // Formatage des résultats
      const demandes = validations.map((v) => ({
        validationId: v.id,
        ordre: v.ordre,
        demande: v.demande,
        statusValidation: v.status,
        dateAction: v.dateAction,
      }));

      res.json({
        success: true,
        demandes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des demandes à valider :",
        error
      );
      res.status(500).json({
        success: false,
        message: "Erreur serveur",
      });
    }
  }
);

//A - Valider
router.get(
  "/a-valider",
  keycloak.protect(),
  requireManager,
  async (req, res) => {
    try {
      const managerId = req.kauth.grant.access_token.content.sub;
      const user = await prisma.user.findUnique({
        where: { keycloakId: managerId },
      });
      if (!user.roles.includes("admin")) {
        res.status(400).json({
          success: false,
          message: "vous avez pas les droits pour recuperer ces informations",
        });
        return;
      }

      const demandes = await prisma.demande.findMany({
        where: {
          status: {
            in: ["EN_ATTENTE", "EN_COURS_VALIDATION"],
          },
          // Au moins une validation en attente
          validations: {
            some: {
              status: "EN_ATTENTE",
            },
          },
          // Pas encore validé par ce manager
          NOT: {
            validations: {
              some: {
                validateurId: managerId,
              },
            },
          },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              username: true,
            },
          },
          validations: {
            include: {
              validateur: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: { ordre: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({
        success: true,
        demandes: demandes,
        count: demandes.length,
      });
    } catch (error) {
      console.error("Erreur récupération demandes à valider:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des demandes",
      });
    }
  }
);

//valider demandes par manager
router.post(
  "/valider/:demandeId",
  keycloak.protect(),
  requireManager,
  async (req, res) => {
    try {
      const { demandeId } = req.params;
      const { action, commentaire } = req.body;
      const managerId = req.user.id;

      // Vérifier que l'action est valide
      if (!["APPROUVEE", "REJETEE"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Action invalide. Utilisez APPROUVEE ou REJETEE",
        });
      }

      // Récupérer la demande avec ses validations
      const demande = await prisma.demande.findUnique({
        where: { id: demandeId },
        include: {
          validations: {
            orderBy: { ordre: "asc" },
          },
        },
      });

      if (!demande) {
        return res.status(404).json({
          success: false,
          message: "Demande non trouvée",
        });
      }

      // Vérifier si ce manager a déjà validé cette demande
      const validationExistante = demande.validations.find(
        (v) => v.validateurId === managerId
      );

      if (validationExistante) {
        return res.status(400).json({
          success: false,
          message: "Vous avez déjà validé cette demande",
        });
      }

      // Trouver une validation EN_ATTENTE disponible pour ce manager
      const validationDisponible = demande.validations.find(
        (v) => v.status === "EN_ATTENTE" && !v.validateurId
      );

      if (!validationDisponible) {
        return res.status(400).json({
          success: false,
          message: "Aucune validation disponible pour cette demande",
        });
      }

      // Cas 1: REJET - Une seule rejection suffit pour rejeter toute la demande
      if (action === "REJETEE") {
        // Vérifier qu'un commentaire est fourni pour le rejet
        if (!commentaire || commentaire.trim() === "") {
          return res.status(400).json({
            success: false,
            message: "Un commentaire est obligatoire pour rejeter une demande",
          });
        }

        // Mettre à jour la validation avec le rejet
        await prisma.validation.update({
          where: { id: validationDisponible.id },
          data: {
            status: "REJETEE",
            commentaire: commentaire,
            dateAction: new Date(),
            validateurId: managerId,
          },
        });

        // Rejeter immédiatement toute la demande
        await prisma.demande.update({
          where: { id: demandeId },
          data: {
            status: "REJETEE",
            commentaireRejet: commentaire,
          },
        });

        return res.json({
          success: true,
          message: "Demande rejetée avec succès",
          finalStatus: "REJETEE",
        });
      }

      // Cas 2: APPROBATION
      if (action === "APPROUVEE") {
        // Mettre à jour la validation avec l'approbation
        await prisma.validation.update({
          where: { id: validationDisponible.id },
          data: {
            status: "APPROUVEE",
            commentaire: commentaire || null,
            dateAction: new Date(),
            validateurId: managerId,
          },
        });

        // Vérifier si toutes les validations sont maintenant complètes
        const validationsRestantes = await prisma.validation.count({
          where: {
            demandeId: demandeId,
            status: "EN_ATTENTE",
          },
        });

        let finalStatus;
        let message;

        if (validationsRestantes === 0) {
          // Toutes les validations sont faites, approuver définitivement la demande
          await prisma.demande.update({
            where: { id: demandeId },
            data: { status: "APPROUVEE" },
          });

          finalStatus = "APPROUVEE";
          message =
            "Demande approuvée définitivement ! Toutes les validations sont complètes.";
        } else {
          // Il reste des validations, garder le statut EN_ATTENTE
          // Pas besoin de changer le statut car la demande reste en attente d'autres validations
          finalStatus = "EN_ATTENTE";
          message = `Validation approuvée avec succès. Il reste ${validationsRestantes} validation(s) à effectuer.`;
        }

        return res.json({
          success: true,
          message: message,
          finalStatus: finalStatus,
          validationsRestantes: validationsRestantes,
        });
      }
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la validation de la demande",
      });
    }
  }
);

module.exports = router;

const express = require("express");
const multer = require("multer");
const path = require("path");
const prisma = require("../config/database");

const { envoyerEmailApprobation, envoyerEmailRejet, testerConfigurationEmail }= require("../../services/emailService.js");

const { keycloak } = require("../config/keycloak");

// Imports nécessaires
const fs = require('fs');
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


// create demande  
// router.post(
//   "/create",
//   keycloak.protect(),
//   requireUser,
//   upload.single("attachment"),
//   async (req, res) => {
//     try {
//       const userId = req.kauth.grant.access_token.content.sub;
//       const user = await prisma.user.findUnique({
//         where: { keycloakId: userId },
//       });
//       if (!user) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Utilisateur non trouve" });
//       }
//       // Parse schema if it's a string 
//       let schema = req.body.schema;
//       if (typeof schema === 'string') {
//         try {
//           schema = JSON.parse(schema);
//         } catch (e) {
//           schema = [schema]; // If it's not valid JSON, treat as single value
//         }
//       }
//       const demandeData = {
//         demandeur: req.body.demandeur,
//         firstName: req.body.firstName,
//         lastName: req.body.lastName,
//         detailsUsage: req.body.Details_usage,
//         dureeAcces: req.body.Duree_acces,
//         businessOwner: req.body.bussiness_owner,
//         dateDebut: new Date(req.body.date_debut),
//         dateFin: new Date(req.body.date_fin),
//         direction: req.body.direction,
//         directionBu: req.body.directionBu,
//         environnement: req.body.environnement,
//         extraction: req.body.extraction,
//         finaliteAccess: req.body.finalite_access,
//         interneExterne: req.body.interneExterne,
//         schema: schema, // Use the parsed schema
//         userId: user.id,
//         attachmentName: req.file ? req.file.originalname : null,
//         attachmentPath: req.file ? req.file.path : null,
//       };
//       // Créer la demande
//       const demande = await prisma.demande.create({
//         data: demandeData,
//       });
//       // Créer les 4 validations nécessaires
//       const MANAGER_1_ID = "uuid-du-manager-1"; // Remplacez par vrais IDs
//       const MANAGER_2_ID = "uuid-du-manager-2"; 
//       const MANAGER_3_ID = "uuid-du-manager-3";
//       const validations = [];
//       for (let i = 1; i <= 4; i++) {
//         validations.push({
//           ordre: i,
//           demandeId: demande.id,
//         });
//       }
//       await prisma.validation.createMany({
//         data: validations,
//       });
//       res.json({
//         success: true,
//         message: "Demande créée avec succès",
//         demande: demande,
//       });
//     } catch (error) {
//       console.error("Erreur création demande:", error);
//       res.status(500).json({
//         success: false,
//         message: "Erreur lors de la création de la demande",
//         error: error.message, // Add error details for debugging
//       });
//     }
//   }
// );
// get the demandes for user with ID with pagination
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
//all demande for admin but with pagination
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
// all demande for dashboard admin
router.get(
  "/allDemandes",
  keycloak.protect(),
  requireAdmin,
  async (req, res) => {
    try {

      //get demandes with pagination
      const demandes = await prisma.demande.findMany({
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

//Recuppere les demandes a valider pour une manager
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


//Recuppere les demandes a valider pour une manager (actuellement)

// router.get(
//   "/a-valider",
//   keycloak.protect(),
//   requireManager,
//   async (req, res) => {
//     try {
//       const managerId = req.kauth.grant.access_token.content.sub;
//       console.log("🔍 Manager ID from token:", managerId);
      
//       // Check if the manager has the right roles
//       const user = await prisma.user.findUnique({
//         where: { keycloakId: managerId },
//       });
//       console.log("👤 User found:", user);

//       if (!user || !user.roles.includes("manager")) {
//         return res.status(403).json({
//           success: false,
//           message: "vous n'avez pas les droits pour récupérer ces informations",
//         });
//       }

//       // Debug: Vérifier s'il y a des demandes du tout
//       const totalDemandes = await prisma.demande.count();
//       console.log("📊 Total demandes in DB:", totalDemandes);

//       // Debug: Vérifier s'il y a des validations pour ce manager
//       const validationsForManager = await prisma.validation.findMany({
//         where: { validateurId: user.id }, // Utiliser user.id au lieu de managerId
//         include: { demande: true }
//       });
//       console.log("✅ Validations for this manager:", validationsForManager.length);
//       console.log("🎯 Manager user.id:", user.id);

//       // Debug: Vérifier toutes les validations EN_ATTENTE
//       const allPendingValidations = await prisma.validation.findMany({
//         where: { status: "EN_ATTENTE" },
//         include: { 
//           demande: { select: { id: true, status: true } },
//           validateur: { select: { id: true, firstName: true, lastName: true } }
//         }
//       });
//       console.log("🔄 All pending validations:", allPendingValidations.length);
//       console.log("📋 Pending validations details:", allPendingValidations.map(v => ({
//         id: v.id,
//         ordre: v.ordre,
//         validateurId: v.validateurId,
//         validateurName: v.validateur ? `${v.validateur.firstName} ${v.validateur.lastName}` : 'Non assigné',
//         demandeId: v.demandeId,
//         demandeStatus: v.demande.status
//       })));

//       // Extract search and filterStatus from query parameters
//       const { search, filterStatus } = req.query;

//       // Initialize the where conditions object
//       let whereConditions = {
//         status: {
//           in: ["EN_ATTENTE", "EN_COURS_VALIDATION"],
//         },
//         validations: {
//           some: {
//             status: "EN_ATTENTE", // Il y a des validations en attente
//           },
//         },
//         // MAIS ce manager n'a pas encore de validation sur cette demande
//         NOT: {
//           validations: {
//             some: {
//               validateurId: user.id, // Exclure les demandes où ce manager a déjà une validation
//             },
//           },
//         },
//       };

//       console.log("🔎 Where conditions:", JSON.stringify(whereConditions, null, 2));

//       // Add search term to filter demandes by text search (if provided)
//       if (search) {
//         whereConditions.OR = [
//           {
//             user: {
//               firstName: {
//                 contains: search,
//                 mode: "insensitive",
//               },
//             },
//           },
//           {
//             user: {
//               lastName: {
//                 contains: search,
//                 mode: "insensitive",
//               },
//             },
//           },
//           {
//             user: {
//               username: {
//                 contains: search,
//                 mode: "insensitive",
//               },
//             },
//           },
//           {
//             user: {
//               email: {
//                 contains: search,
//                 mode: "insensitive",
//               },
//             },
//           },
//         ];
//       }

//       // Add filterStatus to filter by demande status (if provided)
//       if (filterStatus) {
//         whereConditions.status = filterStatus;
//       }

//       // Query the database with the constructed where conditions
//       const demandes = await prisma.demande.findMany({
//         where: whereConditions,
//         include: {
//           user: {
//             select: {
//               firstName: true,
//               lastName: true,
//               email: true,
//               username: true,
//             },
//           },
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
//             orderBy: {
//               ordre: "asc",
//             },
//           },
//         },
//         orderBy: {
//           createdAt: "desc",
//         },
//       });

//       res.json({
//         success: true,
//         demandes: demandes,
//         count: demandes.length,
//       });
//     } catch (error) {
//       console.error("Erreur récupération demandes à valider:", error);
//       res.status(500).json({
//         success: false,
//         message: "Erreur lors de la récupération des demandes",
//       });
//     }
//   }
// );

// valider une demande par une manager
// router.post(
//   "/valider/:demandeId",
//   keycloak.protect(),
//   requireManager,
//   async (req, res) => {
//     try {
//       const { demandeId } = req.params;
//       const { action, commentaire, spocData } = req.body;
//       const managerId = req.user.id;

//       // Vérifier que l'action est valide
//       if (!["APPROUVEE", "REJETEE"].includes(action)) {
//         return res.status(400).json({
//           success: false,
//           message: "Action invalide. Utilisez APPROUVEE ou REJETEE",
//         });
//       }

//       // Récupérer la demande avec ses validations
//       const demande = await prisma.demande.findUnique({
//         where: { id: demandeId },
//         include: {
//           validations: {
//             orderBy: { ordre: "asc" },
//           },
//         },
//       });

//       if (!demande) {
//         return res.status(404).json({
//           success: false,
//           message: "Demande non trouvée",
//         });
//       }

//       // Vérifier si ce manager a déjà validé cette demande
//       const validationExistante = demande.validations.find(
//         (v) => v.validateurId === managerId
//       );

//       if (validationExistante) {
//         return res.status(400).json({
//           success: false,
//           message: "Vous avez déjà validé cette demande",
//         });
//       }

//       // Trouver une validation EN_ATTENTE disponible pour ce manager
//       const validationDisponible = demande.validations.find(
//         (v) => v.status === "EN_ATTENTE" && !v.validateurId
//       );

//       if (!validationDisponible) {
//         return res.status(400).json({
//           success: false,
//           message: "Aucune validation disponible pour cette demande",
//         });
//       }

//       // Cas 1: REJET - Une seule rejection suffit pour rejeter toute la demande
//       if (action === "REJETEE") {
//         // Vérifier qu'un commentaire est fourni pour le rejet
//         if (!commentaire || commentaire.trim() === "") {
//           return res.status(400).json({
//             success: false,
//             message: "Un commentaire est obligatoire pour rejeter une demande",
//           });
//         }

//         // Mettre à jour la validation avec le rejet
//         await prisma.validation.update({
//           where: { id: validationDisponible.id },
//           data: {
//             status: "REJETEE",
//             commentaire: commentaire,
//             dateAction: new Date(),
//             validateurId: managerId,
//           },
//         });

//         // Préparer les données à mettre à jour pour la demande
//         const updateData = {
//           status: "REJETEE",
//           commentaireRejet: commentaire,
//         };

//         // Ajouter spocData si fourni et non vide
//         if (spocData && spocData.trim() !== "") {
//           updateData.spocData = spocData.trim();
//         }

//         // Rejeter immédiatement toute la demande
//         await prisma.demande.update({
//           where: { id: demandeId },
//           data: updateData,
//         });

//         return res.json({
//           success: true,
//           message: "Demande rejetée avec succès",
//           finalStatus: "REJETEE",
//         });
//       }

//       // Cas 2: APPROBATION
//       if (action === "APPROUVEE") {
//         // Mettre à jour la validation avec l'approbation
//         await prisma.validation.update({
//           where: { id: validationDisponible.id },
//           data: {
//             status: "APPROUVEE",
//             commentaire: commentaire || null,
//             dateAction: new Date(),
//             validateurId: managerId,
//           },
//         });

//         // Vérifier si toutes les validations sont maintenant complètes
//         const validationsRestantes = await prisma.validation.count({
//           where: {
//             demandeId: demandeId,
//             status: "EN_ATTENTE",
//           },
//         });

//         let finalStatus;
//         let message;

//         if (validationsRestantes === 0) {
//           // Préparer les données à mettre à jour pour la demande
//           const updateData = {
//             status: "APPROUVEE",
//           };

//           // Ajouter spocData si fourni et non vide
//           if (spocData && spocData.trim() !== "") {
//             updateData.spocData = spocData.trim();
//           }

//           // Toutes les validations sont faites, approuver définitivement la demande
//           await prisma.demande.update({
//             where: { id: demandeId },
//             data: updateData,
//           });

//           finalStatus = "APPROUVEE";
//           message =
//             "Demande approuvée définitivement ! Toutes les validations sont complètes.";
//         } else {
//           // Il reste des validations, garder le statut EN_ATTENTE
//           // Mais on peut quand même mettre à jour spocData si fourni
//           if (spocData && spocData.trim() !== "") {
//             await prisma.demande.update({
//               where: { id: demandeId },
//               data: {
//                 spocData: spocData.trim(),
//               },
//             });
//           }

//           finalStatus = "EN_ATTENTE";
//           message = `Validation approuvée avec succès. Il reste ${validationsRestantes} validation(s) à effectuer.`;
//         }

//         return res.json({
//           success: true,
//           message: message,
//           finalStatus: finalStatus,
//           validationsRestantes: validationsRestantes,
//         });
//       }
//     } catch (error) {
//       console.error("Erreur lors de la validation:", error);
//       res.status(500).json({
//         success: false,
//         message: "Erreur lors de la validation de la demande",
//       });
//     }
//   }
// );

// router.post('/valider/:demandeId', keycloak.protect(), requireManager, async (req, res) => {
//   try {
//     const { demandeId } = req.params;
//     const { action, commentaire } = req.body; // action = "APPROUVEE" ou "REJETEE"
    
//     const userId = req.kauth.grant.access_token.content.sub;
//     const user = await prisma.user.findUnique({
//       where: { keycloakId: userId },
//     });
    
//     const demandeData = await prisma.demande.findUnique({
//       where: {
//         id : demandeId
//       }
//     })

//     if (!user) {
//       return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
//     }
    
//     // Trouver la validation en cours pour ce manager
//     const validationEnCours = await prisma.validation.findFirst({
//       where: {
//         demandeId: demandeId,
//         validateurId: user.id,
//         status: 'EN_ATTENTE'
//       },
//       orderBy: { ordre: 'asc' }
//     });
    
//     if (!validationEnCours) {
//       return res.status(400).json({
//         success: false,
//         message: "Aucune validation en attente pour vous sur cette demande"
//       });
//     }
    
//     // Vérifier que c'est bien son tour
//     const validationsPrecedentes = await prisma.validation.findMany({
//       where: {
//         demandeId: demandeId,
//         ordre: { lt: validationEnCours.ordre }
//       }
//     });
    
//     const toutesApprouvees = validationsPrecedentes.every(v => v.status === 'APPROUVEE');
//     if (!toutesApprouvees) {
//       return res.status(400).json({
//         success: false,
//         message: "Ce n'est pas encore votre tour de valider"
//       });
//     }
    
//     // Mettre à jour la validation
//     await prisma.validation.update({
//       where: { id: validationEnCours.id },
//       data: {
//         status: action,
//         commentaire: commentaire,
//         dateAction: new Date()
//       }
//     });
    
//     if (action === 'REJETEE') {
//       // Rejeter toute la demande
//       await prisma.demande.update({
//         where: { id: demandeId },
//         data: { 
//           status: 'REJETEE',
//           commentaireRejet: commentaire 
//         }
//       });
//       try {
//         await envoyerEmailRejet(
//           demandeData, 
//           user, 
//           commentaire
//         );
//         emailEnvoye = true;
//         console.log('📧 Email de rejet envoyé au client');
//       } catch (emailErr) {
//         emailError = emailErr.message;
//         console.error('❌ Erreur envoi email rejet:', emailErr);
//       }
      
//       res.json({
//         success: true,
//         message: "Demande rejetée avec succès",
//         action: "REJETEE",
//         emailEnvoye,
//         emailError
//       });
//     } else {
//       // Vérifier s'il reste des validations
//       const validationsRestantes = await prisma.validation.findMany({
//         where: {
//           demandeId: demandeId,
//           status: 'EN_ATTENTE'
//         }
//       });
      
//       if (validationsRestantes.length === 0) {
//         // Toutes approuvées = demande approuvée
//         await prisma.demande.update({
//           where: { id: demandeId },
//           data: { status: 'APPROUVEE' }
//         });

//         try {
//           await envoyerEmailApprobation(
//             demandeData, 
//             user
//           );
//           emailEnvoye = true;
//           console.log('📧 Email d\'approbation envoyé au client');
//         } catch (emailErr) {
//           emailError = emailErr.message;
//           console.error('❌ Erreur envoi email approbation:', emailErr);
//         }
        
//         res.json({
//           success: true,
//           message: "Demande approuvée définitivement ! Email de notification envoyé au client.",
//           action: "APPROUVEE_FINALE",
//           emailEnvoye,
//           emailError
//         });
//       }
//     }
    
//     res.json({
//       success: true,
//       message: `Demande ${action.toLowerCase()} avec succès`
//     });
    
//   } catch (error) {
//     console.error("Erreur validation:", error);
//     res.status(500).json({
//       success: false,
//       message: "Erreur lors de la validation",
//       error: error.message
//     });
//   }
// });

router.post('/valider/:demandeId', keycloak.protect(), requireManager, async (req, res) => {
  // Declare email status variables
  let emailEnvoye = false;
  let emailError = null;

  try {
    const { demandeId } = req.params;
    const { action, commentaire } = req.body;
    
    // Validate action
    if (!['APPROUVEE', 'REJETEE'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either APPROUVEE or REJETEE'
      });
    }

    // Get user and demande data
    const userId = req.kauth.grant.access_token.content.sub;
    
    // Fetch user and demande with related user's email
    const [user, demandeData] = await Promise.all([
      prisma.user.findUnique({ where: { keycloakId: userId } }),
      prisma.demande.findUnique({
        where: { id: demandeId },
        include: {
          user: { // Include the related user to get their email
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
    ]);

    if (!demandeData?.user?.email) {
      return res.status(400).json({
        success: false,
        message: "No email address found for the requester"
      });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Utilisateur non trouvé" 
      });
    }

    const demandeForEmail = {
      ...demandeData,
      email: demandeData.user.email, // Map user email to demande object
      firstName: demandeData.firstName,
      lastName: demandeData.lastName,
      // Include any other fields needed for the email template
      direction: demandeData.direction,
      environnement: demandeData.environnement,
      dateDebut: demandeData.dateDebut,
      dateFin: demandeData.dateFin,
      finaliteAccess: demandeData.finaliteAccess,
      schema: demandeData.schema,
      demandeur: demandeData.demandeur,
      id: demandeData.id
    };

    // Find pending validation
    const validationEnCours = await prisma.validation.findFirst({
      where: {
        demandeId: demandeId,
        validateurId: user.id,
        status: 'EN_ATTENTE'
      },
      orderBy: { ordre: 'asc' }
    });
    
    if (!validationEnCours) {
      return res.status(400).json({
        success: false,
        message: "Aucune validation en attente pour vous sur cette demande"
      });
    }
    
    // Check if it's their turn
    const validationsPrecedentes = await prisma.validation.findMany({
      where: {
        demandeId: demandeId,
        ordre: { lt: validationEnCours.ordre }
      }
    });
    
    const toutesApprouvees = validationsPrecedentes.every(v => v.status === 'APPROUVEE');
    if (!toutesApprouvees) {
      return res.status(400).json({
        success: false,
        message: "Ce n'est pas encore votre tour de valider"
      });
    }
    
    // Update the validation
    await prisma.validation.update({
      where: { id: validationEnCours.id },
      data: {
        status: action,
        commentaire: commentaire,
        dateAction: new Date()
      }
    });
    
    if (action === 'REJETEE') {
      // Reject the entire request
      await prisma.demande.update({
        where: { id: demandeId },
        data: { 
          status: 'REJETEE',
          commentaireRejet: commentaire 
        }
      });
      console.log("envoi email rejet 0");
      // Send rejection email
      try {
        console.log("envoi email rejet 1");
        await envoyerEmailRejet(demandeForEmail, user, commentaire);
        console.log("envoi email rejet 2");
        emailEnvoye = true;
      } catch (error) {
        emailError = error.message;
        console.error('Email rejection error:', error);
      }
      console.log("envoi email rejet 4");
      return res.json({
        success: true,
        message: "Demande rejetée avec succès",
        action: "REJETEE",
        emailEnvoye,
        emailError
      });
    } else {
      // Check remaining validations
      const validationsRestantes = await prisma.validation.findMany({
        where: {
          demandeId: demandeId,
          status: 'EN_ATTENTE'
        }
      });
      
      if (validationsRestantes.length === 0) {
        // All approved - final approval
        await prisma.demande.update({
          where: { id: demandeId },
          data: { status: 'APPROUVEE' }
        });

        // Send approval email
        try {
          await envoyerEmailApprobation(demandeForEmail, user);
          emailEnvoye = true;
        } catch (error) {
          emailError = error.message;
          console.error('Email approval error:', error);
        }
        
        return res.json({
          success: true,
          message: "Demande approuvée définitivement",
          action: "APPROUVEE_FINALE",
          emailEnvoye,
          emailError
        });
      } else {
        // Intermediate approval
        return res.json({
          success: true,
          message: "Validation approuvée, en attente des autres validateurs",
          action: "APPROUVEE_ETAPE",
          validationsRestantes: validationsRestantes.length
        });
      }
    }
    
  } catch (error) {
    console.error("Erreur validation:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la validation",
      error: error.message
    });
  }
});


// route for open the file  wothout downloading 
router.get(
  "/file/:demandeId",
  keycloak.protect(),
  requireUser,
  async (req, res) => {
    try {
      const userId = req.kauth.grant.access_token.content.sub;
      const demandeId = req.params.demandeId;

      // Verify user has access to this demande
      const user = await prisma.user.findUnique({
        where: { keycloakId: userId },
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
      }

      // Get the demande with file info
      const demande = await prisma.demande.findFirst({
        where: {
          id: demandeId ,
          // userId: user.id, // Ensure user owns this demande
        },
      });

      if (!demande) {
        return res.status(404).json({ success: false, message: "Demande non trouvée" });
      }

      if (!demande.attachmentPath) {
        return res.status(404).json({ success: false, message: "Aucun fichier attaché" });
      }

      // Check if file exists
      const filePath = path.resolve(demande.attachmentPath);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "Fichier non trouvé sur le serveur" });
      }

      // Get file info
      const fileName = demande.attachmentName || path.basename(filePath);
      const fileExtension = path.extname(fileName).toLowerCase();

      // Set appropriate headers based on file type
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
      };

      const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';
      
      // Check if client wants to download or view
      const download = req.query.download === 'true';
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', 
        download ? `attachment; filename="${fileName}"` : `inline; filename="${fileName}"`
      );

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error("Erreur lors de la récupération du fichier:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération du fichier",
      });
    }
  }
);
// Route to get file info without downloading
router.get(
  "/file-info/:demandeId",
  keycloak.protect(),
  requireUser,
  async (req, res) => {
    try {
      const userId = req.kauth.grant.access_token.content.sub;
      const demandeId = parseInt(req.params.demandeId);

      const user = await prisma.user.findUnique({
        where: { keycloakId: userId },
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
      }

      const demande = await prisma.demande.findFirst({
        where: {
          id: demandeId,
          userId: user.id,
        },
        select: {
          id: true,
          attachmentName: true,
          attachmentPath: true,
        },
      });

      if (!demande) {
        return res.status(404).json({ success: false, message: "Demande non trouvée" });
      }

      if (!demande.attachmentPath) {
        return res.json({ 
          success: true, 
          hasFile: false,
          message: "Aucun fichier attaché" 
        });
      }

      // Check if file exists and get file stats
      const filePath = path.resolve(demande.attachmentPath);
      if (!fs.existsSync(filePath)) {
        return res.json({ 
          success: true, 
          hasFile: false,
          message: "Fichier non trouvé sur le serveur" 
        });
      }

      const stats = fs.statSync(filePath);
      const fileExtension = path.extname(demande.attachmentName || '').toLowerCase();
      
      res.json({
        success: true,
        hasFile: true,
        fileInfo: {
          name: demande.attachmentName,
          size: stats.size,
          extension: fileExtension,
          uploadDate: stats.birthtime,
          canPreview: ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.txt'].includes(fileExtension),
        },
      });
      
    } catch (error) {
      console.error("Erreur lors de la récupération des infos du fichier:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des informations du fichier",
      });
    }
  }
);
// Route to get all demandes with file info for dashboard
router.get(
  "/list",
  keycloak.protect(),
  requireUser,
  async (req, res) => {
    try {
      const userId = req.kauth.grant.access_token.content.sub;

      const user = await prisma.user.findUnique({
        where: { keycloakId: userId },
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
      }

      const demandes = await prisma.demande.findMany({
        where: { userId: user.id },
        include: {
          validations: {
            orderBy: { ordre: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Add file info to each demande
      const demandesWithFileInfo = demandes.map(demande => ({
        ...demande,
        hasAttachment: !!demande.attachmentPath,
        attachmentName: demande.attachmentName,
      }));

      res.json({
        success: true,
        demandes: demandesWithFileInfo,
      });
      
    } catch (error) {
      console.error("Erreur lors de la récupération des demandes:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des demandes",
      });
    }
  }
);





router.get(
  "/a-valider",
  keycloak.protect(),
  requireManager,
  async (req, res) => {
    try {
      const managerId = req.kauth.grant.access_token.content.sub;
      console.log("🔍 Manager ID from token:", managerId);
      
      // Check if the manager has the right roles
      const user = await prisma.user.findUnique({
        where: { keycloakId: managerId },
      });
      console.log("👤 User found:", user);

      if (!user || !user.roles.includes("manager")) {
        return res.status(403).json({
          success: false,
          message: "vous n'avez pas les droits pour récupérer ces informations",
        });
      }

      // Extract search and filterStatus from query parameters
      const { search, filterStatus } = req.query;

      // NOUVELLE LOGIQUE : Trouver les demandes où c'est le tour de ce manager
      
      // 1. Récupérer toutes les validations EN_ATTENTE pour ce manager
      let validationsEnAttente = await prisma.validation.findMany({
        where: {
          validateurId: user.id,
          status: "EN_ATTENTE"
        },
        include: {
          demande: {
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
                orderBy: {
                  ordre: "asc",
                },
              },
            }
          }
        },
        orderBy: {
          ordre: "asc"
        }
      });

      console.log("✅ Validations EN_ATTENTE pour ce manager:", validationsEnAttente.length);

      // 2. Filtrer celles où c'est vraiment le tour du manager
      const demandesAValider = [];

      for (const validation of validationsEnAttente) {
        const demande = validation.demande;
        
        // Vérifier si toutes les validations précédentes sont approuvées
        const validationsPrecedentes = demande.validations.filter(v => v.ordre < validation.ordre);
        const toutesApprouvees = validationsPrecedentes.every(v => v.status === 'APPROUVEE');
        
        console.log(`📋 Demande ${demande.id} - Ordre ${validation.ordre}:`);
        console.log(`   Validations précédentes: ${validationsPrecedentes.length}`);
        console.log(`   Toutes approuvées: ${toutesApprouvees}`);
        
        if (toutesApprouvees) {
          // Appliquer les filtres de recherche
          let inclureDemande = true;
          
          // Filtre par recherche textuelle
          if (search) {
            const searchLower = search.toLowerCase();
            const userMatch = 
              demande.user.firstName?.toLowerCase().includes(searchLower) ||
              demande.user.lastName?.toLowerCase().includes(searchLower) ||
              demande.user.username?.toLowerCase().includes(searchLower) ||
              demande.user.email?.toLowerCase().includes(searchLower);
            
            inclureDemande = userMatch;
          }
          
          // Filtre par statut
          if (filterStatus && demande.status !== filterStatus) {
            inclureDemande = false;
          }
          
          if (inclureDemande) {
            // Ajouter des infos utiles pour le frontend
            const demandeAvecInfo = {
              ...demande,
              validationEnCours: {
                id: validation.id,
                ordre: validation.ordre,
                isFirstValidation: validation.ordre === 1,
                isFinalValidation: validation.ordre === 4,
                totalValidations: demande.validations.length
              }
            };
            
            demandesAValider.push(demandeAvecInfo);
          }
        }
      }

      console.log(`🎯 Demandes où c'est le tour du manager: ${demandesAValider.length}`);

      res.json({
        success: true,
        demandes: demandesAValider,
        count: demandesAValider.length,
        debug: {
          managerId: user.id,
          totalValidationsEnAttente: validationsEnAttente.length,
          demandesFiltered: demandesAValider.length
        }
      });

    } catch (error) {
      console.error("Erreur récupération demandes à valider:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des demandes",
        error: error.message
      });
    }
  }
);


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
        return res.status(404).json({ success: false, message: "Utilisateur non trouve" });
      }
      
      // Parse schema if it's a string 
      let schema = req.body.schema;
      if (typeof schema === 'string') {
        try {
          schema = JSON.parse(schema);
        } catch (e) {
          schema = [schema];
        }
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
        schema: schema,
        userId: user.id,
        attachmentName: req.file ? req.file.originalname : null,
        attachmentPath: req.file ? req.file.path : null,
        // status: 'EN_COURS_VALIDATION' // ← CHANGEMENT ICI
      };
      
      // Créer la demande
      const demande = await prisma.demande.create({
        data: demandeData,
      });
      
      // ========== PARTIE NOUVELLE ==========
      // Définir vos 3 managers (À ADAPTER selon vos besoins)
      const MANAGER_1_ID = "c047fcee-0242-40cb-af80-9f73761a7da4"; // Remplacez par vrais IDs
      const MANAGER_2_ID = "79445600-ea12-4e56-85e9-16e4a5a2bb0d"; 
      const MANAGER_3_ID = "6123e99f-8d3c-4fdd-adac-da4c768b63b3";
      
      // Créer les 4 validations AVEC les managers assignés
      const validations = [
        {
          ordre: 1,
          demandeId: demande.id,
          validateurId: MANAGER_1_ID // ← Manager 1 commence
        },
        {
          ordre: 2,
          demandeId: demande.id,
          validateurId: MANAGER_2_ID // ← Manager 2 
        },
        {
          ordre: 3,
          demandeId: demande.id,
          validateurId: MANAGER_3_ID // ← Manager 3
        },
        {
          ordre: 4,
          demandeId: demande.id,
          validateurId: MANAGER_1_ID // ← Manager 1 termine
        }
      ];
      
      await prisma.validation.createMany({
        data: validations,
      });
      // ========== FIN PARTIE NOUVELLE ==========
      
      res.json({
        success: true,
        message: "Demande créée avec validation hiérarchique",
        demande: demande,
      });
      
    } catch (error) {
      console.error("Erreur création demande:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la création de la demande",
        error: error.message,
      });
    }
  }
);























module.exports = router;

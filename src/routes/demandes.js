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
router.get(
  "/mes-demandes",
  keycloak.protect(),
  requireUser,
  async (req, res) => {
    try {
      const userId = req.kauth.grant.access_token.content.sub;

      const user = await prisma.user.findUnique({
        where: { keycloakId: userId },
      });

      const demandes = await prisma.demande.findMany({
        where: { userId: user.id },
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
      });

      res.json({
        success: true,
        demandes: demandes,
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

module.exports = router;

const prisma = require('../src/config/database'); 
const fs = require('fs');
const path = require('path');

async function exportDemandes() {
  try {
    const demandes = await prisma.demande.findMany({
      include: {
        validations: true,
        user: true, 
      },
    });

    const filePath = path.join(__dirname, 'demandes.json');
    fs.writeFileSync(filePath, JSON.stringify(demandes, null, 2), 'utf-8');
    console.log(' Données exportées vers', filePath);
  } catch (err) {
    console.error(' Erreur lors de l\'export des demandes :', err);
  } finally {
    await prisma.$disconnect();
  }
}

exportDemandes();
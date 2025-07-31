// import nodemailer from 'nodemailer';

// class EmailService {
//     constructor() {
//       // Configuration du transporteur email (à adapter selon votre fournisseur)
//       this.transporter = nodemailer.createTransporter({
//         // Option 1: Gmail
//         service: 'gmail',
//         // auth: {
//         //   user: process.env.EMAIL_USER, // votre-email@gmail.com
//         //   pass: process.env.EMAIL_PASSWORD // mot de passe d'application
//         // }
        
//         // Option 2: SMTP personnalisé
        
//         host: process.env.SMTP_HOST,
//         port: process.env.SMTP_PORT,
//         secure: false, // true pour 465, false pour autres ports
//         auth: {
//           user: process.env.SMTP_USER,
//           pass: process.env.SMTP_PASSWORD
//         }
        
        
//         // Option 3: Outlook/Hotmail
//         /*
//         service: 'hotmail',
//         auth: {
//           user: process.env.EMAIL_USER,
//           pass: process.env.EMAIL_PASSWORD
//         }
//         */
//       });
//     }
  
//     /**
//      * Envoyer un email de notification de demande approuvée
//      */
//     async envoyerEmailApprobation(demande, validateur) {
//       const htmlContent = `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <meta charset="utf-8">
//           <style>
//             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//             .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//             .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
//             .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
//             .success { color: #28a745; font-weight: bold; }
//             .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #28a745; }
//             .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="header">
//               <h1>✅ Demande d'Accès Approuvée</h1>
//             </div>
            
//             <div class="content">
//               <p>Bonjour <strong>${demande.firstName} ${demande.lastName}</strong>,</p>
              
//               <p class="success">Excellente nouvelle ! Votre demande d'accès a été approuvée par tous les validateurs.</p>
              
//               <div class="details">
//                 <h3>📋 Détails de votre demande :</h3>
//                 <ul>
//                   <li><strong>Demandeur :</strong> ${demande.demandeur}</li>
//                   <li><strong>Direction :</strong> ${demande.direction}</li>
//                   <li><strong>Environnement :</strong> ${demande.environnement}</li>
//                   <li><strong>Période d'accès :</strong> Du ${new Date(demande.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(demande.dateFin).toLocaleDateString('fr-FR')}</li>
//                   <li><strong>Finalité :</strong> ${demande.finaliteAccess}</li>
//                   <li><strong>Schémas/Tables :</strong> ${demande.schema.join(', ')}</li>
//                 </ul>
//               </div>
              
//               <p><strong>Prochaines étapes :</strong></p>
//               <ul>
//                 <li>Votre accès sera configuré dans les prochaines 24-48h</li>
//                 <li>Vous recevrez vos identifiants par email sécurisé</li>
//                 <li>Une formation peut être nécessaire selon votre profil</li>
//               </ul>
              
//               <p>Si vous avez des questions, n'hésitez pas à contacter l'équipe IT.</p>
              
//               <div class="footer">
//                 <p>Demande approuvée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
//                 <p>Validateur final : ${validateur.firstName} ${validateur.lastName}</p>
//                 <p>Référence : ${demande.id}</p>
//               </div>
//             </div>
//           </div>
//         </body>
//         </html>
//       `;
  
//       const mailOptions = {
//         from: `"Système de Gestion d'Accès" <${process.env.EMAIL_USER}>`,
//         to: demande.demandeur,
//         cc: process.env.EMAIL_CC, // Optionnel : copie à l'équipe IT
//         subject: `✅ Demande d'accès approuvée - Ref: ${demande.id}`,
//         html: htmlContent
//       };
  
//       try {
//         const result = await this.transporter.sendMail(mailOptions);
//         console.log('✅ Email d\'approbation envoyé:', result.messageId);
//         return { success: true, messageId: result.messageId };
//       } catch (error) {
//         console.error('❌ Erreur envoi email approbation:', error);
//         throw error;
//       }
//     }
  
//     /**
//      * Envoyer un email de notification de demande rejetée
//      */
//     async envoyerEmailRejet(demande, validateur, commentaire) {
//       const htmlContent = `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <meta charset="utf-8">
//           <style>
//             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//             .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//             .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
//             .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
//             .error { color: #dc3545; font-weight: bold; }
//             .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #dc3545; }
//             .comment { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
//             .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="header">
//               <h1>❌ Demande d'Accès Rejetée</h1>
//             </div>
            
//             <div class="content">
//               <p>Bonjour <strong>${demande.firstName} ${demande.lastName}</strong>,</p>
              
//               <p class="error">Nous sommes désolés de vous informer que votre demande d'accès a été rejetée.</p>
              
//               <div class="details">
//                 <h3>📋 Détails de votre demande :</h3>
//                 <ul>
//                   <li><strong>Demandeur :</strong> ${demande.demandeur}</li>
//                   <li><strong>Direction :</strong> ${demande.direction}</li>
//                   <li><strong>Environnement :</strong> ${demande.environnement}</li>
//                   <li><strong>Période demandée :</strong> Du ${new Date(demande.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(demande.dateFin).toLocaleDateString('fr-FR')}</li>
//                   <li><strong>Finalité :</strong> ${demande.finaliteAccess}</li>
//                 </ul>
//               </div>
              
//               ${commentaire ? `
//               <div class="comment">
//                 <h3>💬 Raison du rejet :</h3>
//                 <p><em>"${commentaire}"</em></p>
//               </div>
//               ` : ''}
              
//               <p><strong>Que faire maintenant ?</strong></p>
//               <ul>
//                 <li>Consultez les commentaires ci-dessus pour comprendre les raisons du rejet</li>
//                 <li>Corrigez les points mentionnés</li>
//                 <li>Soumettez une nouvelle demande si nécessaire</li>
//                 <li>Contactez votre manager ou l'équipe IT pour plus d'informations</li>
//               </ul>
              
//               <p>Si vous pensez qu'il s'agit d'une erreur, n'hésitez pas à contacter l'équipe de validation.</p>
              
//               <div class="footer">
//                 <p>Demande rejetée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
//                 <p>Rejetée par : ${validateur.firstName} ${validateur.lastName}</p>
//                 <p>Référence : ${demande.id}</p>
//               </div>
//             </div>
//           </div>
//         </body>
//         </html>
//       `;
  
//       const mailOptions = {
//         from: `"Système de Gestion d'Accès" <${process.env.EMAIL_USER}>`,
//         to: demande.demandeur,
//         cc: process.env.EMAIL_CC,
//         subject: `❌ Demande d'accès rejetée - Ref: ${demande.id}`,
//         html: htmlContent
//       };
  
//       try {
//         const result = await this.transporter.sendMail(mailOptions);
//         console.log('✅ Email de rejet envoyé:', result.messageId);
//         return { success: true, messageId: result.messageId };
//       } catch (error) {
//         console.error('❌ Erreur envoi email rejet:', error);
//         throw error;
//       }
//     }
  
//     /**
//      * Tester la configuration email
//      */
//     async testerConfiguration() {
//       try {
//         await this.transporter.verify();
//         console.log('✅ Configuration email OK');
//         return { success: true, message: 'Configuration email valide' };
//       } catch (error) {
//         console.error('❌ Erreur configuration email:', error);
//         return { success: false, error: error.message };
//       }
//     }
//   }
  
//   export default new EmailService();


// services/emailService.js
import nodemailer from 'nodemailer';

// Create transporter (configure once)
const transporter = nodemailer.createTransport({
  // Option 1: Gmail
  service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER, // votre-email@gmail.com
//     pass: process.env.EMAIL_PASSWORD // mot de passe d'application
//   }
  
  // Option 2: SMTP personnalisé
  
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true pour 465, false pour autres ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
  
  
  // Option 3: Outlook/Hotmail
  /*
  service: 'hotmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
  */
});

/**
 * Envoyer un email de notification de demande approuvée
 */
export async function envoyerEmailApprobation(demande, validateur) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
        .success { color: #28a745; font-weight: bold; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #28a745; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Demande d'Accès Approuvée</h1>
        </div>
        
        <div class="content">
          <p>Bonjour <strong>${demande.firstName} ${demande.lastName}</strong>,</p>
          
          <p class="success">Excellente nouvelle ! Votre demande d'accès a été approuvée par tous les validateurs.</p>
          
          <div class="details">
            <h3>📋 Détails de votre demande :</h3>
            <ul>
              <li><strong>Demandeur :</strong> ${demande.user.email}</li>
              <li><strong>Direction :</strong> ${demande.direction}</li>
              <li><strong>Environnement :</strong> ${demande.environnement}</li>
              <li><strong>Période d'accès :</strong> Du ${new Date(demande.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(demande.dateFin).toLocaleDateString('fr-FR')}</li>
              <li><strong>Finalité :</strong> ${demande.finaliteAccess}</li>
              <li><strong>Schémas/Tables :</strong> ${demande.schema.join(', ')}</li>
            </ul>
          </div>
          
          <p><strong>Prochaines étapes :</strong></p>
          <ul>
            <li>Votre accès sera configuré dans les prochaines 24-48h</li>
            <li>Vous recevrez vos identifiants par email sécurisé</li>
            <li>Une formation peut être nécessaire selon votre profil</li>
          </ul>
          
          <p>Si vous avez des questions, n'hésitez pas à contacter l'équipe IT.</p>
          
          <div class="footer">
            <p>Demande approuvée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
            <p>Validateur final : ${validateur.firstName} ${validateur.lastName}</p>
            <p>Référence : ${demande.id}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Système de Gestion d'Accès" <${process.env.EMAIL_USER}>`,
    to: demande.user.email,
    // cc: process.env.EMAIL_CC, // Optionnel : copie à l'équipe IT
    subject: `✅ Demande d'accès approuvée - Ref: ${demande.id}`,
    html: htmlContent
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email d\'approbation envoyé:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email approbation:', error);
    throw error;
  }
}

/**
 * Envoyer un email de notification de demande rejetée
 */
export async function envoyerEmailRejet(demande, validateur, commentaire) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
        .error { color: #dc3545; font-weight: bold; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #dc3545; }
        .comment { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Demande d'Accès Rejetée</h1>
        </div>
        
        <div class="content">
          <p>Bonjour <strong>${demande.firstName} ${demande.lastName}</strong>,</p>
          
          <p class="error">Nous sommes désolés de vous informer que votre demande d'accès a été rejetée.</p>
          
          <div class="details">
            <h3>📋 Détails de votre demande :</h3>
            <ul>
              <li><strong>Demandeur :</strong> ${demande.user.email}</li>
              <li><strong>Direction :</strong> ${demande.direction}</li>
              <li><strong>Environnement :</strong> ${demande.environnement}</li>
              <li><strong>Période demandée :</strong> Du ${new Date(demande.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(demande.dateFin).toLocaleDateString('fr-FR')}</li>
              <li><strong>Finalité :</strong> ${demande.finaliteAccess}</li>
            </ul>
          </div>
          
          ${commentaire ? `
          <div class="comment">
            <h3>💬 Raison du rejet :</h3>
            <p><em>"${commentaire}"</em></p>
          </div>
          ` : ''}
          
          <p><strong>Que faire maintenant ?</strong></p>
          <ul>
            <li>Consultez les commentaires ci-dessus pour comprendre les raisons du rejet</li>
            <li>Corrigez les points mentionnés</li>
            <li>Soumettez une nouvelle demande si nécessaire</li>
            <li>Contactez votre manager ou l'équipe IT pour plus d'informations</li>
          </ul>
          
          <p>Si vous pensez qu'il s'agit d'une erreur, n'hésitez pas à contacter l'équipe de validation.</p>
          
          <div class="footer">
            <p>Demande rejetée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
            <p>Rejetée par : ${validateur.firstName} ${validateur.lastName}</p>
            <p>Référence : ${demande.id}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Système de Gestion d'Accès" <${process.env.EMAIL_USER}>`,
    to: demande.user.email,
    // cc: process.env.EMAIL_CC,
    subject: `❌ Demande d'accès rejetée - Ref: ${demande.id}`,
    html: htmlContent
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email de rejet envoyé:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email rejet:', error);
    throw error;
  }
}

/**
 * Tester la configuration email
 */
export async function testerConfigurationEmail() {
  try {
    await transporter.verify();
    console.log('✅ Configuration email OK');
    return { success: true, message: 'Configuration email valide' };
  } catch (error) {
    console.error('❌ Erreur configuration email:', error);
    return { success: false, error: error.message };
  }
}
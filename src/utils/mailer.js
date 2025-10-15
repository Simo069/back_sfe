// const nodemailer = require("nodemailer");

// exports.sendResetEmail = async (email, token) => {
//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.MAIL_USER, // Ton email
//       pass: process.env.MAIL_PASS, // Mot de passe d’application Gmail
//     },
//   });

//   const resetLink = `http://localhost:5173/reset-password?token=${token}`;

//   await transporter.sendMail({
//     from: `"SFE Support" <${process.env.MAIL_USER}>`,
//     to: email,
//     subject: "Réinitialisation de votre mot de passe",
//     html: `
//       <h2>Réinitialisation de votre mot de passe</h2>
//       <p>Bonjour,</p>
//       <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien suivant pour en créer un nouveau :</p>
//       <a href="${resetLink}">${resetLink}</a>
//       <p>⚠️ Ce lien expirera dans 30 minutes.</p>
//     `,
//   });
// };



const nodemailer = require("nodemailer");
require("dotenv").config();

// Créer le transporteur SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true si port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Vérifier que le SMTP est opérationnel
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP connection error:", err);
  } else {
    console.log("✅ SMTP is ready to send messages");
  }
});

/**
 * Envoyer un email
 * @param {string} to - destinataire
 * @param {string} subject - sujet
 * @param {string} html - contenu HTML
 */
const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Inwi SFE" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Email non envoyé");
  }
};

module.exports = { sendEmail };

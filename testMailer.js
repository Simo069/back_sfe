require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // true si port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Vérification de la connexion SMTP
    await transporter.verify();
    console.log('✅ SMTP is ready to send messages');

    // Test d'envoi
    const info = await transporter.sendMail({
      from: `"Test Nodemailer" <${process.env.SMTP_USER}>`,
      to: 'hibabity10@gmail.com', // remplace par ton email
      subject: 'Test Nodemailer',
      text: 'Si tu reçois cet email, Nodemailer fonctionne !',
    });

    console.log('✅ Email sent:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

testEmail();

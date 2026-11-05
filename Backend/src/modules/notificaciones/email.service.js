const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Usamos el servicio predefinido de Gmail
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Debe ser una contraseña de aplicación (App Password)
      },
    });
  }

  async enviarCorreo(destinatario, asunto, cuerpo_html) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Sistema de Aulas" <${process.env.SMTP_USER}>`,
        to: destinatario,
        subject: asunto,
        html: cuerpo_html,
      });
      console.log(`✅ Correo enviado a ${destinatario}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error al enviar correo a ${destinatario}:`, error.message);
      return false;
    }
  }
}

module.exports = new EmailService();

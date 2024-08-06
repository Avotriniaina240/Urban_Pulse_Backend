
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });

async function sendResetEmail(email, token) {

    console.log({
        service: 'Gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        }
      })
    const mailOptions = {
      from: 'rabotosonavotriniaina@gmail.com',
      to: email,
      subject: 'Réinitialisation du mot de passe',
      text: `Vous recevez cet email car vous avez demandé la réinitialisation du mot de passe de votre compte.\n\n
             Cliquez sur le lien suivant pour réinitialiser votre mot de passe:\n\n
             http://localhost:3000/reset-password/${token}\n\n
             Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email et votre mot de passe restera inchangé.\n`
    };
  
    try{
      await transporter.sendMail(mailOptions);
    }catch(error){
      console.log(error) 
    }
  }

  module.exports = sendResetEmail
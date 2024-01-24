const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");
require("dotenv").config();

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 589,
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendEmail = (templatePath,receiver, subject, content) => {
  
  ejs.renderFile(templatePath, { receiver, content }, (err, data) => {
    if (err) {
      throw new Error(err.message);
    } else {
      var mailOptions = {
        from: process.env.SMTP_MAIL,
        to: receiver,
        subject: subject,
        html: data,
      };

      transport.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error)
          throw new Error("Error from sendMail(ejs).");
        }
        console.log("Email sended successfully.");
      });
    }
  });
};

module.exports = {
  sendEmail,
};

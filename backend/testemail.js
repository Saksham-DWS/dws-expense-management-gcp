import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const send = async () => {
  try {
    console.log("Sending test mail...");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "SMTP Test",
      text: "SMTP working!",
    });

    console.log("Test mail sent!");
  } catch (e) {
    console.log("ERROR:", e);
  }
};

await send();   // important: wait for the async send to finish

import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("Email settings are missing. Check EMAIL_USER and EMAIL_PASS in .env.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

try {
  await transporter.verify();
  console.log("Gmail connection successful!");

  const result = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: "Event Management System - Test Email",
    text: "Email sending is working!",
  });

  console.log("Test email sent successfully. Message ID:", result.messageId);
  console.log("Check the inbox for:", process.env.EMAIL_USER);
} catch (error) {
  console.error("Email test failed:", error.message);
  process.exitCode = 1;
}

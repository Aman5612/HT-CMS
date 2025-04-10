import nodemailer from 'nodemailer';

interface SendEmailProps {
  to: string;
  subject: string;
  html: string;
}

// Initialize Nodemailer transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    // Create reusable transporter object using Gmail SMTP
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NEXT_PUBLIC_SMTP_EMAIL || 'amankumartiwari392@gmail.com',
        pass: process.env.NEXT_PUBLIC_SMTP_PASSWORD || 'yrwj pebc bepb nakm'
      }
    });
  }
  return transporter;
}

/**
 * Send an email using Nodemailer with Gmail
 */
export async function sendEmail({ to, subject, html }: SendEmailProps): Promise<void> {
  try {
    const from = process.env.NEXT_PUBLIC_SMTP_EMAIL || 'amankumartiwari392@gmail.com';
    
    // Get or create transporter
    const mailTransporter = getTransporter();
    
    // Send mail with defined transport object
    const info = await mailTransporter.sendMail({
      from: `"CMS Admin" <${from}>`,
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, '') // Simple HTML to plain text conversion
    });

    console.log('Email sent successfully, ID:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw so the application can continue if email fails
    // This is especially important for invitation emails
    
    // In development, log the email that would have been sent
    if (process.env.NODE_ENV !== 'production') {
      console.log('Would have sent:');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${html}`);
    }
  }
}

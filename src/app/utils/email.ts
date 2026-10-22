import fs from "fs";
import path from "path";
import ejs from "ejs";
import nodemailer from "nodemailer";
import config from "../config";

const transporter = nodemailer.createTransport({
    host: config.email.smtp_host,
    port: config.email.smtp_port,
    secure: config.email.smtp_port === 465,
    auth: {
        user: config.email.smtp_user,
        pass: config.email.smtp_pass,
    },
});

const getTemplatePath = (templateName: string): string => {
    const localSrcPath = path.join(process.cwd(), "src", "app", "templates", `${templateName}.ejs`);
    if (fs.existsSync(localSrcPath)) {
        return localSrcPath;
    }
    const distPath = path.join(__dirname, "..", "templates", `${templateName}.ejs`);
    if (fs.existsSync(distPath)) {
        return distPath;
    }
    return localSrcPath;
};

const renderEmailTemplate = async (templateName: string, data: Record<string, any>): Promise<string | null> => {
    try {
        const templatePath = getTemplatePath(templateName);
        if (fs.existsSync(templatePath)) {
            return await ejs.renderFile(templatePath, data);
        }
    } catch (err) {
        console.warn(`Failed to render EJS template ${templateName}:`, err);
    }
    return null;
};

export interface IAppointmentEmailPayload {
    patientName: string;
    doctorName: string;
    appointmentDate: string;
    startTime?: string;
    endTime?: string;
    paymentStatus?: string;
    videoCallingId?: string;
    reason?: string;
}

export const sendOtpEmail = async (to: string, otp: string, name?: string): Promise<void> => {
    try {
        const renderedHtml = await renderEmailTemplate("otp", { otp, name });
        const fallbackHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #2563eb; text-align: center;">PH Healthcare Verification Code</h2>
                <p>Hello,</p>
                <p>Your one-time verification code is:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e40af; background: #eff6ff; padding: 12px 24px; border-radius: 6px; border: 1px dashed #3b82f6;">${otp}</span>
                </div>
                <p style="color: #dc2626; font-size: 14px;"><strong>Note:</strong> This OTP is valid for exactly <strong>2 minutes</strong>. Please do not share it with anyone.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="color: #6b7280; font-size: 12px; text-align: center;">If you did not request this email, please disregard it.</p>
            </div>
        `;

        await transporter.sendMail({
            from: config.email.from,
            to,
            subject: "Your Verification OTP - PH Healthcare",
            html: renderedHtml || fallbackHtml,
        });
    } catch (error) {
        console.warn("Failed to send email via SMTP, logging OTP for development:", otp);
    }
};

export const sendResetPasswordEmail = async (to: string, resetLink: string, name?: string): Promise<void> => {
    try {
        const renderedHtml = await renderEmailTemplate("resetPassword", { resetLink, name });
        const fallbackHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #2563eb; text-align: center;">Reset Your Password</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password. Click the link below to set a new password:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">If you cannot click the button, copy and paste this URL into your browser:</p>
                <p style="word-break: break-all; color: #3b82f6;">${resetLink}</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="color: #6b7280; font-size: 12px; text-align: center;">This link will expire in 15 minutes.</p>
            </div>
        `;

        await transporter.sendMail({
            from: config.email.from,
            to,
            subject: "Reset Your Password - PH Healthcare",
            html: renderedHtml || fallbackHtml,
        });
    } catch (error) {
        console.warn("Failed to send reset email via SMTP, logging link for development:", resetLink);
    }
};

export const sendAppointmentConfirmationEmail = async (to: string, data: IAppointmentEmailPayload): Promise<void> => {
    try {
        const renderedHtml = await renderEmailTemplate("appointmentConfirmation", data);
        if (renderedHtml) {
            await transporter.sendMail({
                from: config.email.from,
                to,
                subject: "Appointment Confirmed - PH Healthcare",
                html: renderedHtml,
            });
        }
    } catch (error) {
        console.warn("Failed to send appointment confirmation email:", error);
    }
};

export const sendAppointmentCancellationEmail = async (to: string, data: IAppointmentEmailPayload): Promise<void> => {
    try {
        const renderedHtml = await renderEmailTemplate("appointmentCancellation", data);
        if (renderedHtml) {
            await transporter.sendMail({
                from: config.email.from,
                to,
                subject: "Appointment Cancelled - PH Healthcare",
                html: renderedHtml,
            });
        }
    } catch (error) {
        console.warn("Failed to send appointment cancellation email:", error);
    }
};

export const EmailUtils = {
    sendOtpEmail,
    sendResetPasswordEmail,
    sendAppointmentConfirmationEmail,
    sendAppointmentCancellationEmail,
};


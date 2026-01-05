/**
 * Email Adapter
 * Wraps external email service (Resend)
 * Infrastructure layer - external services
 */

const { Resend } = require('resend');

class EmailAdapter {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@jaaiye.com';
    this.logoUrl = 'https://res.cloudinary.com/djrmprmup/image/upload/v1763066733/IMG_8264_mittgk.png';
  }

  /**
   * Send verification email
   * @param {Object} data - Email data { to, name, code }
   * @returns {Promise<void>}
   */
  async sendVerificationEmail({ to, name, code }) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Verify Your Email - Jaaiye',
        html: this._buildVerificationEmailHtml(name, code)
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {Object} data - Email data { to, name, code }
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmail({ to, name, code }) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Reset Your Password - Jaaiye',
        html: this._buildPasswordResetEmailHtml(name, code)
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email
   * @param {Object} data - Email data { to, name }
   * @returns {Promise<void>}
   */
  async sendWelcomeEmail({ to, name }) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Welcome to Jaaiye!',
        html: this._buildWelcomeEmailHtml(name)
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  /**
   * Build verification email HTML
   * @private
   */
  _buildVerificationEmailHtml(name, code) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f9f9f9; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
            <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #eee;">
              <img src="${this.logoUrl}" alt="Jaaiye" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />
            </div>
            <div style="padding: 30px 20px;">
              <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email</h2>
              <p style="margin-bottom: 15px;">Hi ${name},</p>
              <p style="margin-bottom: 15px;">Thank you for registering with Jaaiye! Please use the verification code below to complete your registration:</p>
              <div style="font-size: 32px; font-weight: bold; color: #007bff; text-align: center; padding: 20px; background: #f4f4f4; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">${code}</div>
              <p style="margin-bottom: 15px;">This code will expire in 10 minutes.</p>
              <p style="margin-bottom: 15px;">If you didn't create an account, please ignore this email.</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Jaaiye. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Build password reset email HTML
   * @private
   */
  _buildPasswordResetEmailHtml(name, code) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f9f9f9; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
            <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #eee;">
              <img src="${this.logoUrl}" alt="Jaaiye" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />
            </div>
            <div style="padding: 30px 20px;">
              <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
              <p style="margin-bottom: 15px;">Hi ${name},</p>
              <p style="margin-bottom: 15px;">We received a request to reset your password. Use the code below to proceed:</p>
              <div style="font-size: 32px; font-weight: bold; color: #dc3545; text-align: center; padding: 20px; background: #f4f4f4; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">${code}</div>
              <p style="margin-bottom: 15px;">This code will expire in 10 minutes.</p>
              <p style="margin-bottom: 15px;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Jaaiye. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Build welcome email HTML
   * @private
   */
  _buildWelcomeEmailHtml(name) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f9f9f9; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
            <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #eee;">
              <img src="${this.logoUrl}" alt="Jaaiye" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />
            </div>
            <div style="padding: 30px 20px;">
              <h2 style="color: #333; margin-bottom: 20px;">Welcome to Jaaiye! 🎉</h2>
              <p style="margin-bottom: 15px;">Hi ${name},</p>
              <p style="margin-bottom: 15px;">Welcome aboard! We're excited to have you join the Jaaiye community.</p>
              <p style="margin-bottom: 15px;">Start exploring events, managing your calendar, and connecting with others!</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Jaaiye. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

module.exports = EmailAdapter;


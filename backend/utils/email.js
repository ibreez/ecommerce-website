const nodemailer = require('nodemailer');
const { getSettings } = require('../models/Settings');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  async initializeTransporter() {
    try {
      const settings = await getSettings();
      
      if (!settings.smtp_host || !settings.smtp_username || !settings.smtp_password) {
        console.log('SMTP settings not configured');
        return false;
      }

      this.transporter = nodemailer.createTransporter({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: settings.smtp_username,
          pass: settings.smtp_password,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      return false;
    }
  }

  async sendOrderConfirmation(order, userEmail) {
    try {
      if (!this.transporter) {
        const initialized = await this.initializeTransporter();
        if (!initialized) return false;
      }

      const settings = await getSettings();
      const siteName = settings.site_name || 'Electronics Store';
      const siteEmail = settings.site_email || 'noreply@store.com';

      const orderItemsHtml = order.items.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `).join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Order Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #2563eb; margin: 0;">${siteName}</h1>
              <h2 style="color: #374151; margin: 10px 0;">Order Confirmation</h2>
            </div>
            
            <p>Dear ${order.user_name},</p>
            <p>Thank you for your order! We've received your order and it's being processed.</p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Order Details</h3>
              <p><strong>Order ID:</strong> #${order.id}</p>
              <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
              <p><strong>Payment Method:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}</p>
              <p><strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</p>
            </div>

            <h3>Order Items</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #e5e7eb;">
                  <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #d1d5db;">Product</th>
                  <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #d1d5db;">Qty</th>
                  <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #d1d5db;">Price</th>
                  <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #d1d5db;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderItemsHtml}
              </tbody>
              <tfoot>
                <tr style="background: #f9fafb; font-weight: bold;">
                  <td colspan="3" style="padding: 12px 8px; text-align: right; border-top: 2px solid #d1d5db;">Total Amount:</td>
                  <td style="padding: 12px 8px; text-align: right; border-top: 2px solid #d1d5db;">$${order.total_amount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Shipping Address</h3>
              <p style="margin: 0;">${order.shipping_address}</p>
            </div>

            ${order.notes ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Order Notes</h3>
              <p style="margin: 0;">${order.notes}</p>
            </div>
            ` : ''}

            <p>We'll send you another email when your order ships. If you have any questions, please contact us.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
              <p>Thank you for shopping with ${siteName}!</p>
              ${settings.site_phone ? `<p>Phone: ${settings.site_phone}</p>` : ''}
              <p>Email: ${siteEmail}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"${siteName}" <${siteEmail}>`,
        to: userEmail,
        subject: `Order Confirmation #${order.id} - ${siteName}`,
        html: emailHtml,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Order confirmation email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send order confirmation email:', error);
      return false;
    }
  }

  async sendAdminNotification(order) {
    try {
      if (!this.transporter) {
        const initialized = await this.initializeTransporter();
        if (!initialized) return false;
      }

      const settings = await getSettings();
      const siteName = settings.site_name || 'Electronics Store';
      const siteEmail = settings.site_email || 'noreply@store.com';

      const orderItemsText = order.items.map(item =>
        `- ${item.product_name} (Qty: ${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`
      ).join('\n');

      const emailText = `
New Order Received - ${siteName}

Order Details:
- Order ID: #${order.id}
- Customer: ${order.user_name} (${order.user_email})
- Phone: ${order.phone}
- Total Amount: $${order.total_amount.toFixed(2)}
- Payment Method: ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}
- Status: ${order.status}
- Order Date: ${new Date(order.created_at).toLocaleString()}

Items:
${orderItemsText}

Shipping Address:
${order.shipping_address}

${order.notes ? `Notes: ${order.notes}` : ''}

Please process this order in the admin panel.
      `;

      const mailOptions = {
        from: `"${siteName}" <${siteEmail}>`,
        to: siteEmail,
        subject: `New Order #${order.id} - ${siteName}`,
        text: emailText,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Admin notification email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send admin notification email:', error);
      return false;
    }
  }

  async sendContactEmail(name, email, message) {
    try {
      if (!this.transporter) {
        const initialized = await this.initializeTransporter();
        if (!initialized) return false;
      }

      const settings = await getSettings();
      const siteName = settings.site_name || 'Electronics Store';
      const siteEmail = settings.site_email || 'noreply@store.com';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Contact Form Message</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #2563eb; margin: 0;">${siteName}</h1>
              <h2 style="color: #374151; margin: 10px 0;">New Contact Form Message</h2>
            </div>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Contact Details</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Message</h3>
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
              <p>This message was sent from the ${siteName} contact form.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"${siteName} Contact Form" <${siteEmail}>`,
        to: siteEmail,
        replyTo: email,
        subject: `Contact Form Message from ${name} - ${siteName}`,
        html: emailHtml,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Contact email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send contact email:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
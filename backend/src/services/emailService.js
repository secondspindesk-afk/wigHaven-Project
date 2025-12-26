import { queueEmail } from '../jobs/emailQueue.js';
import { validateEmailData } from '../utils/emailValidator.js';
import { sendEmailDirectly } from '../utils/emailSender.js';
import { renderEmailTemplate } from './emailTemplates.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Helper: Queue email with direct-send fallback for critical emails
 */
const safeQueueEmail = async (emailData, isCritical = false) => {
  try {
    const validation = validateEmailData(emailData);
    if (!validation.valid) {
      logger.error('Invalid email data:', validation.errors);
      return { success: false, errors: validation.errors };
    }

    return await queueEmail(emailData);
  } catch (error) {
    logger.error(`Failed to queue email (${emailData.type}):`, error);

    if (isCritical) {
      logger.info(`⚠️ Attempting direct send fallback for critical email: ${emailData.type}`);
      try {
        // Render template here since worker won't do it
        const content = await renderEmailTemplate(emailData.template, emailData.variables);

        await sendEmailDirectly({
          to: emailData.to_email,
          subject: emailData.subject,
          html: content.html,
          text: content.text
        });

        logger.info(`✅ Direct send successful for ${emailData.type}`);
        return { success: true, method: 'direct_fallback' };
      } catch (directError) {
        logger.error('❌ Direct send also failed:', directError);
        return { success: false, error: directError.message };
      }
    }

    return { success: false, error: error.message };
  }
};

/**
 * Send order confirmation email
 */
export const sendOrderConfirmation = async (order) => {
  const emailData = {
    type: 'order_confirmation',
    to_email: order.customerEmail,
    subject: `Order Confirmation - ${order.orderNumber}`,
    template: 'orderConfirmation',
    variables: {
      customer_name: order.shippingAddress?.name || 'Valued Customer',
      order_number: order.orderNumber,
      created_at: order.createdAt,
      items: order.items || order.orderItems,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      discount: order.discount,
      coupon_code: order.couponCode,
      total: order.total,
      shipping_address: order.shippingAddress,
      tracking_link: `${process.env.FRONTEND_URL}/orders/${order.orderNumber}`,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, resetToken, resetLink) => {
  const settings = await (await import('./settingsService.js')).default.getAllSettings();
  const emailData = {
    type: 'password_reset',
    to_email: email,
    subject: `Password Reset Request - ${settings.siteName}`,
    template: 'passwordReset',
    variables: {
      site_name: settings.siteName,
      name: email.split('@')[0],
      reset_link: resetLink,
      expiry_time: '1 hour',
    },
  };

  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send payment confirmation email
 */
export const sendPaymentConfirmation = async (order) => {
  const emailData = {
    type: 'payment_confirmation',
    to_email: order.customerEmail,
    subject: `Payment Confirmed - ${order.orderNumber}`,
    template: 'paymentConfirmation',
    variables: {
      site_name: settings.siteName,
      customer_name: order.shippingAddress?.name || 'Valued Customer',
      order_number: order.orderNumber,
      amount: order.total,
      payment_method: 'Paystack',
      confirmation_time: new Date(),
      order_link: `${settings.siteUrl || process.env.FRONTEND_URL}/orders/${order.orderNumber}`,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};


/**
 * Send payment failed email
 */
export const sendPaymentFailed = async (order) => {
  const emailData = {
    type: 'payment_failed',
    to_email: order.customerEmail,
    subject: `Payment Failed - ${order.orderNumber}`,
    template: 'paymentFailed',
    variables: {
      customer_name: order.shippingAddress?.name || 'Valued Customer',
      order_number: order.orderNumber,
      retry_link: `${process.env.FRONTEND_URL}/checkout/${order.id}`,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send abandoned cart email
 */
export const sendAbandonedCartEmail = async (user, cart) => {
  try {
    const prisma = getPrisma();

    const prefs = await prisma.emailPreferences.findUnique({ where: { email: user.email } });
    if (prefs?.unsubscribedFromAll || prefs?.abandonedCartEmails === false) {
      return { success: false, reason: 'User unsubscribed' };
    }

    const settings = await (await import('./settingsService.js')).default.getAllSettings();
    const emailData = {
      type: 'abandoned_cart',
      to_email: user.email,
      subject: `Your Cart is Waiting! - ${settings.siteName}`,
      template: 'abandonedCart',
      variables: {
        site_name: settings.siteName,
        name: user.firstName || 'Valued Customer',
        items: cart.items,
        total: cart.total,
        cart_link: `${settings.siteUrl || process.env.FRONTEND_URL}/cart`,
        discount_code: 'COMEBACK10',
        unsubscribe_link: `${settings.siteUrl || process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(user.email)}`,
      },
    };

    return await safeQueueEmail(emailData, false); // Marketing
  } catch (error) {
    logger.error('Failed to prepare abandoned cart email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send back-in-stock alert
 */
export const sendBackInStockAlert = async (user, variant) => {
  try {
    const prisma = getPrisma();

    const prefs = await prisma.emailPreferences.findUnique({ where: { email: user.email } });
    if (prefs?.unsubscribedFromAll || prefs?.backInStockEmails === false) {
      return { success: false, reason: 'User unsubscribed' };
    }

    const emailData = {
      type: 'back_in_stock',
      to_email: user.email,
      subject: `${variant.product.name} is Back in Stock!`,
      template: 'backInStock',
      variables: {
        name: user.firstName || 'Valued Customer',
        product_name: variant.product.name,
        price: variant.price,
        stock_status: 'In Stock Now!',
        link: `${process.env.FRONTEND_URL}/products/${variant.productId}`,
        product_image: variant.product.images?.[0] || null,
        unsubscribe_link: `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(user.email)}`,
      },
    };
    return await safeQueueEmail(emailData, false); // Marketing
  } catch (error) {
    logger.error('Failed to prepare back-in-stock email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send low stock alert (admin)
 */
export const sendLowStockAlert = async (adminEmail, products) => {
  const emailData = {
    type: 'low_stock_alert',
    to_email: adminEmail,
    subject: `Low Stock Alert - ${products.length} Items`,
    template: 'lowStockAlert',
    variables: {
      count: products.length,
      products: products.map(p => ({
        product_name: p.productName,
        sku: p.sku,
        stock: p.stock,
        threshold: p.threshold || 5,
      })),
      link: `${process.env.FRONTEND_URL}/admin/inventory`,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical (Admin)
};

/**
 * Send email verification email
 */
export const sendVerificationEmail = async (email, verificationToken) => {
  const settings = await (await import('./settingsService.js')).default.getAllSettings();
  const verificationLink = `${settings.siteUrl || process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  const emailData = {
    type: 'email_verification',
    to_email: email,
    subject: `Verify Your Email - ${settings.siteName}`,
    template: 'emailVerification',
    variables: {
      site_name: settings.siteName,
      name: 'User',
      verification_link: verificationLink,
      expiry_time: '24 hours',
    },
  };

  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (user) => {
  const settings = await (await import('./settingsService.js')).default.getAllSettings();
  const emailData = {
    type: 'welcome',
    to_email: user.email,
    subject: `Welcome to ${settings.siteName}! ✨`,
    template: 'welcome',
    variables: {
      site_name: settings.siteName,
      name: user.firstName,
      email: user.email,
      shop_link: `${settings.siteUrl || process.env.FRONTEND_URL}/shop`,
      account_link: `${settings.siteUrl || process.env.FRONTEND_URL}/account`,
      support_link: `${settings.siteUrl || process.env.FRONTEND_URL}/support`,
    },
  };

  return await safeQueueEmail(emailData, false); // Non-critical
};

/**
 * Send email change confirmation
 */
export const sendEmailChangeConfirmation = async (user, token) => {
  const emailData = {
    type: 'email_change_confirmation',
    to_email: user.newEmail,
    subject: 'Confirm Email Change 🔒',
    template: 'emailChangeConfirmation',
    variables: {
      name: user.firstName,
      old_email: user.email,
      new_email: user.newEmail,
      confirmation_link: `${process.env.FRONTEND_URL}/confirm-email-change?token=${token}`,
      expiry_time: '1 hour',
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send password changed email
 */
export const sendPasswordChangedEmail = async (email, firstName) => {
  const settings = await (await import('./settingsService.js')).default.getAllSettings();
  const emailData = {
    type: 'password_changed',
    to_email: email,
    subject: `Your Password Has Been Changed - ${settings.siteName}`,
    template: 'passwordChanged',
    variables: {
      site_name: settings.siteName,
      name: firstName,
      reset_link: `${settings.siteUrl || process.env.FRONTEND_URL}/login`,
      expiry_time: 'never',
    },
  };

  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send shipping notification email
 */
export const sendShippingNotification = async (order, trackingInfo = {}) => {
  const emailData = {
    type: 'shipping_notification',
    to_email: order.customerEmail,
    subject: `Your Order Has Shipped! - ${order.orderNumber}`,
    template: 'shippingNotification',
    variables: {
      customer_name: order.shippingAddress?.name || 'Valued Customer',
      order_number: order.orderNumber,
      tracking_number: trackingInfo.trackingNumber || 'N/A',
      carrier: trackingInfo.carrier || 'Standard Shipping',
      estimated_delivery: trackingInfo.estimatedDelivery || 'Within 3-5 business days',
      tracking_link: trackingInfo.trackingUrl || `${process.env.FRONTEND_URL}/orders/${order.orderNumber}`,
      order_link: `${process.env.FRONTEND_URL}/orders/${order.orderNumber}`,
      items: order.items || order.orderItems || [],
      total: order.total,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

// --- NEW FUNCTIONS ---

/**
 * Send order cancellation email
 */
export const sendOrderCancellation = async (order, reason) => {
  const emailData = {
    type: 'order_cancellation',
    to_email: order.customerEmail,
    subject: `Order Cancelled - ${order.orderNumber}`,
    template: 'orderCancellation',
    variables: {
      customer_name: order.shippingAddress?.name || 'Valued Customer',
      order_number: order.orderNumber,
      reason: reason || 'Customer request',
      refund_status: order.paymentStatus === 'refunded' ? 'Refund processed' : 'Refund pending',
      support_link: `${process.env.FRONTEND_URL}/support`,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send order refund email
 */
export const sendOrderRefund = async (order, refundAmount) => {
  const emailData = {
    type: 'order_refund',
    to_email: order.customerEmail,
    subject: `Refund Processed - ${order.orderNumber}`,
    template: 'orderRefund',
    variables: {
      customer_name: order.shippingAddress?.name || 'Valued Customer',
      order_number: order.orderNumber,
      refund_amount: refundAmount || order.total,
      original_payment_method: 'Paystack',
      support_link: `${process.env.FRONTEND_URL}/support`,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send order delivered email
 */
export const sendOrderDelivered = async (order) => {
  const emailData = {
    type: 'order_delivered',
    to_email: order.customerEmail,
    subject: `Delivered! Your Order Has Arrived - ${order.orderNumber}`,
    template: 'orderDelivered',
    variables: {
      customer_name: order.shippingAddress?.name || 'Valued Customer',
      order_number: order.orderNumber,
      delivery_date: new Date().toLocaleDateString(),
      review_link: `${process.env.FRONTEND_URL}/orders/${order.orderNumber}/review`,
      support_link: `${process.env.FRONTEND_URL}/support`,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send order status update email
 */
export const sendOrderStatusUpdate = async (order, oldStatus, newStatus) => {
  const emailData = {
    type: 'order_status_update',
    to_email: order.customerEmail,
    subject: `Order Update - ${order.orderNumber}`,
    template: 'orderStatusUpdate',
    variables: {
      customer_name: order.shippingAddress?.name || 'Valued Customer',
      order_number: order.orderNumber,
      old_status: oldStatus,
      new_status: newStatus,
      order_link: `${process.env.FRONTEND_URL}/orders/${order.orderNumber}`,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send support ticket created email
 */
export const sendSupportTicketCreated = async (ticket, user) => {
  const emailData = {
    type: 'support_ticket_created',
    to_email: user.email,
    subject: `Support Ticket Received - #${ticket.ticketNumber}`,
    template: 'supportTicketCreated',
    variables: {
      name: user.firstName || 'Valued Customer',
      ticket_number: ticket.ticketNumber,
      subject: ticket.subject,
      message: ticket.message,
      ticket_link: `${process.env.FRONTEND_URL}/account/support/${ticket.id}`,
    },
  };
  return await safeQueueEmail(emailData, false); // Non-critical
};

/**
 * Send support ticket reply email
 */
export const sendSupportTicketReply = async (ticket, replyMessage, user) => {
  const emailData = {
    type: 'support_ticket_reply',
    to_email: user.email,
    subject: `New Reply to Ticket #${ticket.ticketNumber}`,
    template: 'supportTicketReply',
    variables: {
      name: user.firstName || 'Valued Customer',
      ticket_number: ticket.ticketNumber,
      message_preview: replyMessage.substring(0, 150),
      ticket_link: `${process.env.FRONTEND_URL}/account/support/${ticket.id}`,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send guest support ticket reply email
 * For guests who submitted contact form but have no account
 */
export const sendGuestTicketReply = async (ticket, replyMessage, guest) => {
  const emailData = {
    type: 'guest_ticket_reply',
    to_email: guest.email,
    subject: `Response to Your Inquiry - Ticket #${ticket.ticketNumber}`,
    template: 'guestTicketReply',
    variables: {
      name: guest.name || 'Valued Customer',
      ticket_number: ticket.ticketNumber,
      ticket_subject: ticket.subject?.replace('[GUEST] ', '') || 'Your Inquiry',
      reply_message: replyMessage,
      contact_link: `${process.env.FRONTEND_URL}/contact`,
      support_email: process.env.SUPPORT_EMAIL || 'support@wighaven.com',
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send review approved email
 */
export const sendReviewApproved = async (review, user, product) => {
  const emailData = {
    type: 'review_approved',
    to_email: user.email,
    subject: 'Your Review is Live! ⭐',
    template: 'reviewApproved',
    variables: {
      name: user.firstName || 'Reviewer',
      product_name: product.name,
      review_title: review.title,
      product_link: `${process.env.FRONTEND_URL}/products/${product.id}`,
    },
  };
  return await safeQueueEmail(emailData, false); // Non-critical
};

/**
 * Send review rejected email
 */
export const sendReviewRejected = async (review, user, product, reason) => {
  const emailData = {
    type: 'review_rejected',
    to_email: user.email,
    subject: 'Update on Your Review',
    template: 'reviewRejected',
    variables: {
      name: user.firstName || 'Reviewer',
      product_name: product.name,
      reason: reason || 'Does not meet community guidelines',
      guidelines_link: `${process.env.FRONTEND_URL}/review-guidelines`,
    },
  };
  return await safeQueueEmail(emailData, false); // Non-critical
};

/**
 * Send account deactivated email
 */
export const sendAccountDeactivated = async (user, reason) => {
  const settings = await (await import('./settingsService.js')).default.getAllSettings();
  const emailData = {
    type: 'account_deactivated',
    to_email: user.email,
    subject: `Account Deactivated - ${settings.siteName}`,
    template: 'accountDeactivated',
    variables: {
      name: user.firstName || 'User',
      reason: reason || 'Violation of terms',
      support_link: `${process.env.FRONTEND_URL}/support`,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send ticket resolved email to logged-in users
 * @param {object} ticket - Support ticket with ticketNumber
 * @param {object} user - User object with email
 */
export const sendTicketResolved = async (ticket, user) => {
  const settings = await (await import('./settingsService.js')).default.getAllSettings();
  const emailData = {
    type: 'ticket_resolved',
    to_email: user.email,
    subject: `Ticket #${ticket.ticketNumber} Resolved - ${settings.siteName}`,
    template: 'ticketResolved',
    variables: {
      name: user.firstName || 'Valued Customer',
      ticket_number: ticket.ticketNumber,
      subject: ticket.subject,
      ticket_link: `${process.env.FRONTEND_URL}/account/support/${ticket.id}`,
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

/**
 * Send ticket resolved email to guest users
 * @param {object} ticket - Support ticket with ticketNumber, guestName, guestEmail
 */
export const sendGuestTicketResolved = async (ticket) => {
  if (!ticket.guestEmail) {
    return { success: false, reason: 'No guest email' };
  }

  const settings = await (await import('./settingsService.js')).default.getAllSettings();
  const emailData = {
    type: 'guest_ticket_resolved',
    to_email: ticket.guestEmail,
    subject: `Ticket #${ticket.ticketNumber} Resolved - ${settings.siteName}`,
    template: 'guestTicketResolved',
    variables: {
      guest_name: ticket.guestName || 'Valued Customer',
      ticket_number: ticket.ticketNumber,
      subject: ticket.subject?.replace('[GUEST] ', '') || 'Your Inquiry',
    },
  };
  return await safeQueueEmail(emailData, true); // Critical
};

export default {
  sendOrderConfirmation,
  sendPasswordResetEmail,
  sendPaymentConfirmation,
  sendPaymentFailed,
  sendAbandonedCartEmail,
  sendBackInStockAlert,
  sendLowStockAlert,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendEmailChangeConfirmation,
  sendShippingNotification,
  sendOrderCancellation,
  sendOrderRefund,
  sendOrderDelivered,
  sendOrderStatusUpdate,
  sendSupportTicketCreated,
  sendSupportTicketReply,
  sendGuestTicketReply,
  sendTicketResolved,
  sendGuestTicketResolved,
  sendReviewApproved,
  sendReviewRejected,
  sendAccountDeactivated,
};


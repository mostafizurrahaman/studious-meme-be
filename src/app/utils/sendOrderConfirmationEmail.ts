import httpStatus from 'http-status';
import nodemailer from 'nodemailer';
import path from 'path';
import config from '../config';
import AppError from './AppError';

type OrderConfirmationItem = {
  title: string;
  sku: string;
  quantity: number;
  lineTotal: number;
};

type SendOrderConfirmationEmailPayload = {
  email: string;
  customerName: string;
  orderId: string;
  paymentMethod: 'CASH_ON_DELIVERY' | 'PORTPOS';
  confirmationKind: 'order' | 'payment';
  items: OrderConfirmationItem[];
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  city: string;
  address: string;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const getPaymentMethodLabel = (
  value: SendOrderConfirmationEmailPayload['paymentMethod'],
) => (value === 'CASH_ON_DELIVERY' ? 'Cash on Delivery' : 'PortPOS');

const getConfirmationCopy = (
  kind: SendOrderConfirmationEmailPayload['confirmationKind'],
) =>
  kind === 'payment'
    ? {
        title: 'Payment confirmed',
        subtitle:
          'We received your payment successfully. Your order is now confirmed and ready for processing.',
        subject: 'Payment confirmed',
      }
    : {
        title: 'Order confirmed',
        subtitle:
          'We received your order successfully. Our team will process it shortly.',
        subject: 'Order confirmed',
      };

const sendOrderConfirmationEmail = async (
  payload: SendOrderConfirmationEmailPayload,
) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.nodemailer.email,
        pass: config.nodemailer.password,
      },
    });

    const copy = getConfirmationCopy(payload.confirmationKind);

    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f6f8fb;
            margin: 0;
            padding: 0;
          }
          .container {
            width: 100%;
            max-width: 640px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            padding: 28px;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 1px solid #edf0f5;
          }
          .header img {
            max-width: 160px;
            margin-bottom: 16px;
          }
          .title {
            color: ${config.emailColor};
            font-size: 28px;
            font-weight: 800;
            margin: 0;
          }
          .subtitle {
            color: #475467;
            font-size: 15px;
            line-height: 1.7;
            margin: 10px 0 0;
          }
          .panel {
            margin-top: 20px;
            padding: 18px;
            background: #f9fbff;
            border: 1px solid #e8eef8;
            border-radius: 14px;
          }
          .meta {
            display: grid;
            gap: 8px;
            margin-top: 12px;
            color: #344054;
            font-size: 14px;
          }
          .meta strong {
            color: #101828;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 14px;
          }
          th, td {
            padding: 10px 8px;
            border-bottom: 1px solid #eaecf0;
            text-align: left;
          }
          th {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #667085;
          }
          .summary {
            margin-top: 18px;
            background: #fff;
            border: 1px solid #eaecf0;
            border-radius: 14px;
            padding: 16px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 8px;
            color: #344054;
            font-size: 14px;
          }
          .summary-row strong {
            color: #101828;
          }
          .total {
            margin-top: 10px;
            padding-top: 12px;
            border-top: 1px solid #eaecf0;
            font-size: 16px;
            font-weight: 800;
            color: ${config.emailColor};
          }
          .footer {
            text-align: center;
            color: #667085;
            font-size: 12px;
            margin-top: 22px;
            padding-top: 18px;
            border-top: 1px solid #edf0f5;
          }
          @media only screen and (max-width: 600px) {
            .container { padding: 20px; }
            .title { font-size: 24px; }
            table, .summary-row { font-size: 13px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="cid:malamal_logo" alt="${config.preffered_website_name} logo" />
            <h2 class="title">${copy.title}</h2>
            <p class="subtitle">${copy.subtitle}</p>
          </div>

          <div class="panel">
            <div><strong>Hello ${payload.customerName},</strong></div>
            <div class="meta">
              <div><strong>Order ID:</strong> ${payload.orderId}</div>
              <div><strong>Payment Method:</strong> ${getPaymentMethodLabel(payload.paymentMethod)}</div>
              <div><strong>Delivery Address:</strong> ${payload.address}, ${payload.city}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              ${payload.items
                .map(
                  (item) => `
                    <tr>
                      <td>
                        <div><strong>${item.title}</strong></div>
                        <div style="color:#667085;font-size:12px;">SKU: ${item.sku}</div>
                      </td>
                      <td>${item.quantity}</td>
                      <td>৳${formatMoney(item.lineTotal)}</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row"><span>Subtotal</span><strong>৳${formatMoney(payload.subtotal)}</strong></div>
            <div class="summary-row"><span>Discount</span><strong>- ৳${formatMoney(payload.discount)}</strong></div>
            <div class="summary-row"><span>Delivery</span><strong>৳${formatMoney(payload.delivery)}</strong></div>
            <div class="summary-row total"><span>Total</span><span>৳${formatMoney(payload.total)}</span></div>
          </div>

          <div class="footer">
            <p>Thank you for shopping with ${config.preffered_website_name}.</p>
            <p>If you have any questions about this order, please reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `${config.preffered_website_name} <${config.nodemailer.email}>`,
      to: payload.email,
      subject: `${copy.subject} — ${payload.orderId}`,
      html: htmlTemplate,
      attachments: [
        {
          filename: 'logo.png',
          path:
            config.NODE_ENV === 'production'
              ? 'https://res.cloudinary.com/dweesppci/image/upload/v1777476137/1777476137166-KHALED-SIDDIQUE.png'
              : path.join(__dirname, 'assets', 'logo.png'),
          cid: 'malamal_logo',
        },
      ],
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send order confirmation email',
    );
  }
};

export default sendOrderConfirmationEmail;

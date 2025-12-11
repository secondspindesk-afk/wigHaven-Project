---
title: WigHaven Backend API
emoji: 💇
colorFrom: purple
colorTo: pink
sdk: docker
pinned: false
---

# WigHaven Backend API

A production-ready e-commerce backend API for a premium wig and hair extensions store.

## Features

- 🛒 **Complete E-commerce**: Products, carts, orders, payments
- 💳 **Mobile Money Payments**: Paystack integration (MTN, Vodafone, Tigo)
- 📧 **Email Notifications**: Order confirmations, shipping updates
- 🔐 **Authentication**: JWT-based auth with role-based access
- 📊 **Admin Dashboard**: Analytics, inventory management, order tracking
- 🔔 **Real-time Updates**: WebSocket notifications
- 🖼️ **Media Management**: ImageKit cloud storage integration
- 💱 **Multi-currency**: GHS, USD, EUR, GBP support

## Tech Stack

- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon/Supabase)
- **ORM**: Prisma
- **Payments**: Paystack
- **Storage**: ImageKit
- **Email**: SMTP (Nodemailer)

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/products` | List products |
| `POST /api/auth/login` | User login |
| `POST /api/orders` | Create order |
| `GET /api/admin/dashboard` | Admin analytics |

## Environment Variables

Required environment variables (configure in HuggingFace Space settings):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `PAYSTACK_SECRET_KEY` - Paystack API secret
- `PAYSTACK_PUBLIC_KEY` - Paystack public key
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email config
- `EMAIL_FROM` - Sender email address
- `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` - ImageKit config
- `FRONTEND_URL` - Frontend application URL

## License

MIT

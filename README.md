# Blog CMS

A modern content management system for blogs built with Next.js, Prisma, and PostgreSQL.

## Getting Started

### Prerequisites

- Node.js 18.x or later
- PostgreSQL database
- npm or yarn package manager
- AWS Account (for S3 and CloudFront)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Database Setup

1. Create a PostgreSQL database
2. Update the database connection URL in your `.env` file:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/your_database_name"
   ```
3. Run database migrations and generate Prisma client:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3001"

# API URL
NEXT_PUBLI_APP_URL="http://localhost:3001"
BASE_URL="http://localhost:3001"

# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/your_database_name"
POSTGRES_DB="your_database_name"
POSTGRES_PASSWORD="your_password"
POSTGRES_USER="your_username"

# AWS S3 and CloudFront Configuration
AWS_BUCKET_NAME="your-bucket-name"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="your-region"
S3_BASE_URL="https://your-bucket.s3.your-region.amazonaws.com"
NEXT_PUBLIC_CLOUDFRONT_DISTRIBUTION_ID="your-distribution-id"
NEXT_PUBLIC_CLOUDFRONT_DOMAIN="your-cloudfront-domain"

# Email Configuration (Optional)
# RESEND_API_KEY="re_123456789"  # Uncomment and add your Resend API key for email functionality
```

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
2. Open [http://localhost:3001](http://localhost:3001) in your browser

### Default Login Credentials

For first-time setup, you can use these default credentials to log in:

```
Email: amankumartiwari392@gmail.com
Password: 201501@newP
```

**Note:** It's recommended to change these credentials after your first login for security purposes.

## Features

- User authentication and authorization
- Role-based access control
- Blog post management
- User invitations via email
- Modern and responsive UI
- AWS S3 integration for file storage
- CloudFront CDN for content delivery

## Email Setup

For email functionality setup, please refer to [README-EMAIL.md](README-EMAIL.md).

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 
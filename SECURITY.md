# InvestGhanaHub Security Documentation

## Overview

This document outlines the comprehensive security measures implemented in InvestGhanaHub to protect user data, prevent attacks, and ensure compliance with Ghana's data protection regulations.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Input Validation & Sanitization](#input-validation--sanitization)
3. [Password Security](#password-security)
4. [Data Protection](#data-protection)
5. [API Security](#api-security)
6. [Rate Limiting](#rate-limiting)
7. [Logging & Monitoring](#logging--monitoring)
8. [Ghana-Specific Compliance](#ghana-specific-compliance)

---

## Authentication & Authorization

### JWT Token-Based Authentication

- **Token Generation**: Secure JWT tokens with HS256 algorithm
- **Token Storage**: HttpOnly cookies with secure flags in production
- **Token Expiration**: 7-day expiration with automatic refresh
- **Cookie Security**:
  - `httpOnly: true` - Prevents XSS attacks
  - `secure: true` (production) - HTTPS only
  - `sameSite: 'strict'` (production) - CSRF protection

### Role-Based Access Control (RBAC)

Three user roles with distinct permissions:

1. **INVESTOR**
   - View investment opportunities
   - Make investments
   - Manage wallet
   - Submit KYC

2. **BUSINESS_OWNER**
   - Create business profiles
   - Create investment opportunities
   - Link bank accounts
   - Receive profit distributions

3. **ADMIN**
   - Approve/reject KYC submissions
   - Approve/reject businesses
   - Monitor all transactions
   - Access audit logs

---

## Input Validation & Sanitization

### Joi Schema Validation

All API endpoints use Joi schemas for comprehensive validation:

#### Registration Validation
```typescript
- Email: Valid email format, lowercase, max 255 chars
- Password: Min 8 chars, uppercase, lowercase, number, special character
- Phone: Ghana format (+233XXXXXXXXX or 0XXXXXXXXX)
- Names: Min 2 chars, max 50 chars, trimmed
```

#### KYC Validation
```typescript
- Ghana Card: Format GHA-XXXXXXXXX-X
- Date of Birth: Must be 18+ years old
- Region: Valid Ghana region (16 regions)
- Address: Min 10 chars, max 200 chars
```

#### Investment Validation
```typescript
- Amount: Positive number, min GHS 10, max GHS 1,000,000
- Opportunity ID: Valid UUID format
```

### Multi-Layer Sanitization

1. **NoSQL Injection Protection**
   - `express-mongo-sanitize` removes $ and . from user input
   - Prevents MongoDB operator injection

2. **XSS Protection**
   - Custom middleware removes dangerous HTML/script tags
   - Sanitizes `<script>`, `<iframe>`, `javascript:`, `on*=` patterns
   - Applied to body, query, and params

3. **SQL Injection Protection**
   - Prisma ORM provides parameterized queries
   - Additional regex-based detection layer
   - Blocks common SQL injection patterns

4. **HTTP Parameter Pollution (HPP)**
   - Prevents duplicate parameter attacks
   - Whitelist for allowed array parameters

---

## Password Security

### Password Requirements

**Minimum Requirements:**
- At least 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&)
- Maximum 128 characters

### Password Storage

- **Hashing Algorithm**: bcrypt with salt rounds
- **Salt**: Automatically generated per password
- **No Plain Text**: Passwords never stored in plain text
- **No Logging**: Passwords never logged or exposed in errors

### Password Change Policy

- Requires current password verification
- New password must meet all requirements
- Forces re-authentication after change
- Audit log entry created

---

## Data Protection

### Sensitive Data Encryption

#### Ghana Card Numbers
- Encrypted at rest using AES-256
- Encryption key stored in environment variables
- 32-character encryption key required
- Decryption only for authorized operations

#### Personal Information
- Names, addresses, phone numbers stored securely
- Access controlled by authentication
- Audit trail for all access

### Data Access Controls

1. **User Data**: Users can only access their own data
2. **KYC Data**: Admins only for verification
3. **Financial Data**: Encrypted in transit and at rest
4. **Audit Logs**: Immutable, admin-only access

---

## API Security

### Security Headers

Implemented via Helmet.js and custom middleware:

```typescript
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### CORS Configuration

- **Production**: Whitelist specific frontend URL
- **Development**: Allow localhost
- **Credentials**: Enabled for cookie-based auth
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, X-Requested-With, X-CSRF-Token

### Request Size Limits

- **Body Size**: 10MB maximum
- **JSON Payload**: 10MB maximum
- **URL Encoded**: 10MB maximum
- **File Uploads**: Validated separately per route

---

## Rate Limiting

### Global Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Applies To**: All endpoints except /health
- **Response**: 429 Too Many Requests

### Endpoint-Specific Limits

#### Authentication Endpoints
- **Window**: 15 minutes
- **Max Requests**: 5 per IP
- **Endpoints**: /api/auth/login, /api/auth/register
- **Purpose**: Prevent brute force attacks

#### Upload Endpoints
- **Window**: 1 hour
- **Max Requests**: 10 per IP
- **Endpoints**: /api/upload/*
- **Purpose**: Prevent abuse of file upload

#### API Endpoints
- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Endpoints**: All /api/* routes
- **Purpose**: General API protection

---

## Logging & Monitoring

### Winston Structured Logging

#### Log Levels
1. **Error**: System errors, exceptions
2. **Warn**: Security warnings, suspicious activity
3. **Info**: Normal operations, successful requests
4. **HTTP**: All HTTP requests/responses
5. **Debug**: Detailed debugging information

#### Log Storage
- **Error Logs**: `logs/error.log` (5MB max, 5 files)
- **Combined Logs**: `logs/combined.log` (5MB max, 5 files)
- **Console**: Development environment only

#### Security Event Logging

Automatically logged events:
- Failed login attempts
- Suspicious activity detection
- Rate limit exceeded
- Fraud alerts
- KYC submissions and approvals
- Investment transactions
- Profit distributions
- Admin actions

### Audit Trail

All critical operations create audit log entries:

```typescript
{
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  details: JSON,
  ipAddress: string,
  userAgent: string,
  timestamp: DateTime
}
```

---

## Ghana-Specific Compliance

### Ghana Card Validation

- **Format**: GHA-XXXXXXXXX-X (11 digits)
- **Verification**: Format validation only (no external API)
- **Storage**: Encrypted at rest
- **Access**: KYC verification only

### Ghana Phone Number Validation

- **Formats Accepted**:
  - +233XXXXXXXXX (international)
  - 0XXXXXXXXX (local)
- **Network Codes**: 2X, 3X, 4X, 5X (MTN, Vodafone, AirtelTigo)
- **Length**: 10 digits (excluding country code)

### Ghana Regions

All 16 administrative regions supported:
- Greater Accra
- Ashanti
- Western
- Eastern
- Central
- Northern
- Upper East
- Upper West
- Volta
- Bono
- Bono East
- Ahafo
- Western North
- Oti
- North East
- Savannah

### Data Protection Compliance

- **User Consent**: Required for data collection
- **Data Access**: Users can view their data
- **Data Deletion**: Users can request deletion
- **Data Portability**: Export functionality available
- **Breach Notification**: Automated alerts for admins

---

## Security Best Practices

### For Developers

1. **Never commit secrets** to version control
2. **Use environment variables** for all sensitive config
3. **Validate all input** before processing
4. **Sanitize all output** before rendering
5. **Use parameterized queries** (Prisma handles this)
6. **Log security events** but never log sensitive data
7. **Keep dependencies updated** regularly
8. **Review code** for security issues before merging

### For Administrators

1. **Rotate secrets** regularly (JWT_SECRET, ENCRYPTION_KEY)
2. **Monitor logs** for suspicious activity
3. **Review audit trails** regularly
4. **Keep backups** of database and logs
5. **Test disaster recovery** procedures
6. **Update dependencies** promptly
7. **Review user permissions** regularly
8. **Respond to security alerts** immediately

### For Users

1. **Use strong passwords** meeting all requirements
2. **Enable two-factor authentication** (when available)
3. **Don't share credentials** with anyone
4. **Report suspicious activity** immediately
5. **Keep contact information** up to date
6. **Review account activity** regularly
7. **Use secure networks** for transactions
8. **Log out** after using shared devices

---

## Incident Response

### Security Incident Procedure

1. **Detection**: Automated alerts or manual report
2. **Assessment**: Determine severity and impact
3. **Containment**: Isolate affected systems
4. **Investigation**: Analyze logs and audit trail
5. **Remediation**: Fix vulnerability
6. **Recovery**: Restore normal operations
7. **Post-Incident**: Document and improve

### Contact Information

For security issues, contact:
- **Email**: security@investghanahub.com
- **Emergency**: +233 XXX XXX XXX

---

## Security Updates

This document is regularly updated to reflect new security measures and best practices.

**Last Updated**: 2024
**Version**: 1.0.0
**Next Review**: Quarterly

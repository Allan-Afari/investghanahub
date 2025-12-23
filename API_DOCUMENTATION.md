# InvestGhanaHub API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

Or the token is automatically set as an HttpOnly cookie on successful registration/login.

---

## 1. AUTHENTICATION ENDPOINTS

### Register as Investor
**POST** `/auth/register/investor`

Registers a new investor account.

**Request Body:**
```json
{
  "email": "investor@example.com",
  "password": "SecurePass@123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+233244444444"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Investor account created successfully...",
  "data": {
    "user": {
      "id": "uuid",
      "email": "investor@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "INVESTOR",
      "isActive": true,
      "createdAt": "2024-12-17T00:00:00Z"
    },
    "token": "jwt_token_here",
    "nextSteps": [
      "1. Complete KYC verification",
      "2. Browse available investment opportunities",
      "3. Make your first investment",
      "4. Track your portfolio"
    ]
  }
}
```

---

### Register as Business Owner
**POST** `/auth/register/business-owner`

Registers a new business owner account for capital raising.

**Request Body:**
```json
{
  "email": "owner@example.com",
  "password": "SecurePass@123",
  "firstName": "Sarah",
  "lastName": "Smith",
  "phone": "+233255555555"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Business owner account created successfully...",
  "data": {
    "user": {
      "id": "uuid",
      "email": "owner@example.com",
      "firstName": "Sarah",
      "lastName": "Smith",
      "role": "BUSINESS_OWNER",
      "isActive": true,
      "createdAt": "2024-12-17T00:00:00Z"
    },
    "token": "jwt_token_here",
    "nextSteps": [
      "1. Complete personal KYC verification",
      "2. Register your business details",
      "3. Wait for admin business verification",
      "4. Create investment opportunities",
      "5. Start raising capital"
    ]
  }
}
```

---

### Login
**POST** `/auth/login`

Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass@123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "INVESTOR",
      "kycStatus": "PENDING",
      "isActive": true
    },
    "token": "jwt_token_here"
  }
}
```

---

### Get Profile
**GET** `/auth/profile` (Protected)

Retrieves the current authenticated user's profile.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+233244444444",
    "role": "INVESTOR",
    "kycStatus": "PENDING",
    "isActive": true,
    "createdAt": "2024-12-17T00:00:00Z",
    "profileImage": null
  }
}
```

---

### Update Profile
**PUT** `/auth/profile` (Protected)

Updates the current user's profile information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+233244444444"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+233244444444"
  }
}
```

---

### Change Password
**POST** `/auth/change-password` (Protected)

Changes the authenticated user's password.

**Request Body:**
```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 2. KYC VERIFICATION ENDPOINTS

### Submit KYC
**POST** `/kyc/submit` (Protected)

Submits KYC information for verification.

**Request Body:**
```json
{
  "ghanaCardNumber": "GH-123456789A",
  "dateOfBirth": "1990-05-15",
  "address": "123 Main Street, Accra",
  "city": "Accra",
  "region": "Greater Accra",
  "occupation": "Software Engineer",
  "sourceOfFunds": "Employment"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "KYC submitted for review",
  "data": {
    "id": "kyc-uuid",
    "userId": "user-uuid",
    "status": "PENDING",
    "documentUrl": null,
    "selfieUrl": null,
    "dateOfBirth": "1990-05-15",
    "createdAt": "2024-12-17T00:00:00Z"
  }
}
```

---

### Get KYC Status
**GET** `/kyc/status` (Protected)

Retrieves the current user's KYC status.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "PENDING",
    "age": 34,
    "isAbove18": true,
    "documentUrl": null,
    "selfieUrl": null,
    "verifiedAt": null,
    "rejectionReason": null
  }
}
```

---

### Upload KYC Images
**POST** `/kyc/verify-with-images` (Protected)

Uploads Ghana card and selfie photos for automatic KYC verification.

**Form Data (multipart/form-data):**
- `ghanaCardPhoto` (File): Ghana card image
- `selfiePhoto` (File): Selfie photo

**Response (200 OK):**
```json
{
  "success": true,
  "message": "KYC verification completed",
  "data": {
    "status": "APPROVED",
    "age": 28,
    "isAbove18": true,
    "faceMatchScore": 92.5,
    "cardValid": true,
    "cardExpiry": "2025-12-31",
    "nextSteps": [
      "Your KYC has been approved",
      "You can now invest in opportunities"
    ]
  }
}
```

---

## 3. BUSINESS ENDPOINTS

### Register Business (Capital Raising)
**POST** `/capital-raising/register`

Simplified one-shot registration for business owners to start capital raising.

**Request Body:**
```json
{
  "email": "owner@example.com",
  "password": "SecurePass@123",
  "firstName": "Sarah",
  "lastName": "Smith",
  "phone": "+233255555555",
  "businessName": "Tech Startup Ghana",
  "businessDescription": "A tech startup focusing on mobile solutions",
  "businessCategory": "startup",
  "businessLocation": "Accra",
  "businessRegion": "Greater Accra",
  "targetCapital": 500000,
  "ghanaCardNumber": "GH-123456789A"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Capital raising registration initiated...",
  "data": {
    "user": {...},
    "kyc": {
      "id": "kyc-uuid",
      "status": "PENDING",
      "message": "Upload Ghana card and selfie to complete KYC"
    },
    "business": {
      "id": "business-uuid",
      "name": "Tech Startup Ghana",
      "status": "PENDING",
      "targetAmount": 500000,
      "message": "Business awaiting KYC approval, then admin review"
    },
    "nextSteps": [
      "1. Complete KYC verification (upload Ghana card + selfie)",
      "2. Admin will review KYC (age verification required)",
      "3. Admin will review and approve your business",
      "4. Create investment opportunities to raise capital"
    ]
  }
}
```

---

### Get Capital Raising Status
**GET** `/capital-raising/status/:userId` (Protected)

Gets the status of capital raising registration and business setup.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "owner@example.com",
      "role": "BUSINESS_OWNER"
    },
    "kyc": {
      "status": "PENDING",
      "age": 28,
      "isAbove18": true
    },
    "businesses": [
      {
        "id": "business-uuid",
        "name": "Tech Startup Ghana",
        "status": "PENDING",
        "targetAmount": 500000
      }
    ],
    "overallStatus": "KYC_PENDING"
  }
}
```

---

## 4. INVESTMENT ENDPOINTS

### Create Investment Opportunity
**POST** `/investments/opportunities` (Protected, Business Owner Only)

Creates a new investment opportunity for the business.

**Request Body:**
```json
{
  "businessId": "business-uuid",
  "title": "Tech Startup Investment Round",
  "description": "Series A funding round",
  "targetAmount": 500000,
  "minInvestment": 1000,
  "expectedReturn": 25,
  "duration": 36,
  "riskLevel": "MEDIUM",
  "category": "Technology"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Investment opportunity created",
  "data": {
    "id": "opportunity-uuid",
    "businessId": "business-uuid",
    "title": "Tech Startup Investment Round",
    "status": "ACTIVE",
    "targetAmount": 500000,
    "raisedAmount": 0,
    "investorCount": 0,
    "createdAt": "2024-12-17T00:00:00Z"
  }
}
```

---

### List Investment Opportunities
**GET** `/investments/opportunities`

Lists all active investment opportunities.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `category`: Filter by category
- `minReturn`: Minimum expected return
- `riskLevel`: Filter by risk level

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "id": "opportunity-uuid",
        "businessId": "business-uuid",
        "businessName": "Tech Startup Ghana",
        "title": "Tech Startup Investment Round",
        "description": "Series A funding",
        "targetAmount": 500000,
        "raisedAmount": 150000,
        "investorCount": 15,
        "expectedReturn": 25,
        "duration": 36,
        "riskLevel": "MEDIUM",
        "status": "ACTIVE",
        "progressPercentage": 30
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

### Invest in Opportunity
**POST** `/investments` (Protected, Investor Only)

Invests in an opportunity after KYC approval.

**Request Body:**
```json
{
  "opportunityId": "opportunity-uuid",
  "amount": 10000
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Investment successful",
  "data": {
    "id": "investment-uuid",
    "userId": "user-uuid",
    "opportunityId": "opportunity-uuid",
    "amount": 10000,
    "investedAt": "2024-12-17T00:00:00Z",
    "expectedReturn": 2500,
    "maturityDate": "2027-12-17T00:00:00Z",
    "status": "ACTIVE"
  }
}
```

---

### Get My Investments
**GET** `/investments/my-investments` (Protected, Investor Only)

Gets all investments made by the current user.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "investments": [
      {
        "id": "investment-uuid",
        "businessName": "Tech Startup Ghana",
        "amount": 10000,
        "investedAt": "2024-12-17T00:00:00Z",
        "status": "ACTIVE",
        "expectedReturn": 2500,
        "maturityDate": "2027-12-17T00:00:00Z",
        "currentValue": 10500
      }
    ],
    "summary": {
      "totalInvested": 50000,
      "totalReturn": 12500,
      "activeCount": 3,
      "matureCount": 1
    }
  }
}
```

---

## 5. WALLET & PAYMENT ENDPOINTS

### Get Wallet Balance
**GET** `/wallet/balance` (Protected)

Gets the current wallet balance.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "balance": 50000.50,
    "currency": "GHS",
    "lastUpdated": "2024-12-17T00:00:00Z"
  }
}
```

---

### Initiate Payment
**POST** `/wallet/payment/initiate` (Protected)

Initiates a payment via Paystack.

**Request Body:**
```json
{
  "amount": 10000,
  "email": "user@example.com",
  "description": "Investment funding"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/...",
    "reference": "paystack-reference-code",
    "amount": 10000
  }
}
```

---

## 6. ADMIN ENDPOINTS

### Approve Business
**POST** `/admin/businesses/:businessId/approve` (Protected, Admin Only)

Approves a business for capital raising.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Business approved",
  "data": {
    "id": "business-uuid",
    "name": "Tech Startup Ghana",
    "status": "APPROVED",
    "approvedAt": "2024-12-17T00:00:00Z"
  }
}
```

---

### Approve KYC
**POST** `/admin/kyc/:kycId/approve` (Protected, Admin Only)

Approves a KYC submission.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "KYC approved",
  "data": {
    "id": "kyc-uuid",
    "status": "APPROVED",
    "approvedAt": "2024-12-17T00:00:00Z"
  }
}
```

---

## ERROR RESPONSES

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "message": "Invalid email or password",
  "category": "AUTHENTICATION_ERROR"
}
```

### Authorization Error (403)
```json
{
  "success": false,
  "message": "Access denied - Admin role required",
  "category": "AUTHORIZATION_ERROR"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Resource not found",
  "category": "NOT_FOUND"
}
```

### Conflict (409)
```json
{
  "success": false,
  "message": "A record with this email already exists",
  "category": "CONFLICT"
}
```

### Rate Limit (429)
```json
{
  "success": false,
  "message": "Too many requests - please wait before trying again",
  "category": "RATE_LIMIT"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error",
  "category": "SERVER_ERROR"
}
```

---

## PAGINATION

List endpoints support pagination with query parameters:

```
GET /api/investments/opportunities?page=2&limit=20

Response includes:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## FILTERING & SORTING

List endpoints support filtering and sorting:

```
GET /api/investments/opportunities?category=Technology&sort=-createdAt&minReturn=20

Query Parameters:
- filter[field]: Filter by field value
- sort: Sort by field (prefix with - for descending)
- search: Full-text search
```

---

## WEBHOOKS

### Investment Opportunity Created
```
Event: investment.opportunity.created
Body: {
  "opportunityId": "uuid",
  "businessId": "uuid",
  "amount": 500000,
  "timestamp": "2024-12-17T00:00:00Z"
}
```

### Investment Made
```
Event: investment.made
Body: {
  "investmentId": "uuid",
  "userId": "uuid",
  "amount": 10000,
  "timestamp": "2024-12-17T00:00:00Z"
}
```

---

## RATE LIMITS

- Auth endpoints: 5 requests per 15 minutes per IP
- General endpoints: 100 requests per 15 minutes per user
- Upload endpoints: 10 requests per 15 minutes per user

---


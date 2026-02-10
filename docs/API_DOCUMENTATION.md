# API Documentation

## Base URL

```
http://localhost:5000/api
```

## Authentication Endpoints

### POST /api/auth/register

Register a new user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

### POST /api/auth/login

Login with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /api/auth/logout

Logout and invalidate tokens.

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Prediction Endpoints

### POST /api/predictions

Make a plant health prediction (Authenticated users).

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

```
image: <file> (PNG/JPEG, max 10MB)
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "prediction": "Pest_Fungal",
    "confidence": 0.94,
    "imageUrl": "/uploads/image-1234567890.jpg",
    "timestamp": "2026-02-04T10:30:00Z",
    "userId": 1
  }
}
```

### POST /api/guest/predict

Make a prediction without authentication (Guest mode).

**Request Body (Form Data):**

```
image: <file> (PNG/JPEG, max 10MB)
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "prediction": "Healthy",
    "confidence": 0.97,
    "message": "Limited guest prediction. Register for full features."
  }
}
```

**Rate Limit:** 10 requests per hour per IP

## History Endpoints

### GET /api/history

Get user's prediction history.

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Query Parameters:**

```
?page=1&limit=10&sort=createdAt&order=DESC
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "id": 123,
        "prediction": "Healthy",
        "confidence": 0.97,
        "imageUrl": "/uploads/image-123.jpg",
        "createdAt": "2026-02-04T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
}
```

### GET /api/history/:id

Get specific prediction details.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "prediction": "Pest_Fungal",
    "confidence": 0.94,
    "imageUrl": "/uploads/image-123.jpg",
    "metadata": {
      "imageSize": "224x224",
      "processingTime": "1.2s"
    },
    "createdAt": "2026-02-04T10:30:00Z"
  }
}
```

### DELETE /api/history/:id

Delete a prediction from history.

**Response (200):**

```json
{
  "success": true,
  "message": "Prediction deleted successfully"
}
```

### GET /api/history/:id/pdf

Download prediction result as PDF.

**Response:**

- Content-Type: application/pdf
- PDF file download

## System Endpoints

### GET /health

Check service health status.

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2026-02-04T10:30:00Z",
  "service": "plant-health-backend",
  "environment": "production",
  "uptime": 3600
}
```

### GET /api/system/status

Get detailed system status (Admin only).

**Response (200):**

```json
{
  "success": true,
  "data": {
    "database": "connected",
    "redis": "connected",
    "aiWorkers": {
      "poolSize": 3,
      "activeWorkers": 3,
      "totalPredictions": 150,
      "successRate": 0.98
    },
    "uptime": 3600,
    "memoryUsage": {
      "heapUsed": 45.2,
      "heapTotal": 60.1
    }
  }
}
```

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "success": false,
  "error": "Error message",
  "errorCode": "ERROR_CODE",
  "statusCode": 400
}
```

**Common Error Codes:**

- `VALIDATION_ERROR` - Invalid request data
- `AUTHENTICATION_ERROR` - Invalid or missing auth token
- `AUTHORIZATION_ERROR` - Insufficient permissions

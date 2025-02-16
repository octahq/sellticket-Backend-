
# Email OTP Authentication with Session Keys

This documentation explains how the system works, the user journey, and how session keys replace traditional JWT tokens for authentication. It is designed for a NestJS engineer who may not have blockchain expertise.

## Overview

The system provides a secure authentication flow using email OTP (One-Time Password) and leverages session keys for blockchain-based authentication. Session keys are temporary cryptographic keys that enable users to interact securely with blockchain applications without exposing their main wallet credentials.

## Key Concepts

### 1. Email OTP Authentication
- Users authenticate by entering their email and a 6-digit OTP sent to their email
- The OTP is valid for 5 minutes and can only be used once

### 2. Session Keys
- A session key is a temporary cryptographic key generated for each user session
- It allows users to sign transactions and interact with the blockchain securely
- Session keys have limited permissions (e.g., spending limits, expiration times) for enhanced security

### 3. Modular Account V2
- A smart contract wallet that supports session keys and advanced permission management
- Deployed on the Sepolia testnet (Ethereum test network)

### 4. Why Use Session Keys Instead of JWTs?

✅ Enhanced Security: Session keys are cryptographically secure and cannot be forged
✅ Blockchain Integration: Session keys enable direct transaction signing
✅ Granular Permissions: Unlike JWTs, session keys enforce smart contract-based limits

## User Journey

### 1. User Requests OTP
- The user enters their email and requests an OTP
- The system generates a 6-digit OTP, stores it securely, and sends it to the user's email

### 2. User Verifies OTP
- The user enters the OTP received via email
- If valid, the system:
  - New Users: Creates a new wallet and generates a session key
  - Existing Users: If a valid session key exists, the user continues using it; otherwise, a new session key is generated
- The session key address is returned to the frontend

### 3. User Interacts with the Application
- The frontend uses the session key to sign transactions and interact with the blockchain
- The session key enforces security constraints (e.g., max spending limit per transaction)

### 4. Session Expiry & Renewal
- The session key expires after a predefined time (e.g., 1 hour)
- The user must re-authenticate to generate a new session key

## System Architecture

### Chain Configuration
- **Production**: Ethereum Mainnet (NODE_ENV=production)
- **Development**: Sepolia Testnet (NODE_ENV=development)

### Authentication Flow

📌 Endpoints:
- POST /auth/initiate-otp → Sends an OTP to the user's email
- POST /auth/verify-otp → Verifies OTP & generates a session key

### Session Key Management

🔑 Endpoints:
- POST /session-keys/add/:email → Adds a new session key with predefined permissions
- PUT /session-keys/rotate/:email → Rotates an expired session key
- PUT /session-keys/permissions/:email → Updates session key permissions

### Transaction Execution

🚀 Endpoint:
- POST /session-keys/execute/:email → Executes a transaction via session key

## Code Structure

### 1. Types (`types.ts`)
- Defines interfaces for auth details, parameters, and key store data
- Implements SmartAccountSigner interface for blockchain integration

### 2. Key Store Service (`keystore.service.ts`)
- Manages secure storage of session keys and permissions
- Provides methods for key updates and retrieval

### 3. Auth Service (`auth.service.ts`)
- Handles OTP generation and verification
- Manages email sending via MailerService
- Creates and manages session keys

### 4. Custom Auth Signer (`custom-auth.signer.ts`)
- Implements blockchain transaction signing
- Manages session key authentication
- Handles message and typed data signing

### 5. Account Client Factory (`account-client.factory.ts`)
- Creates and configures blockchain client instances
- Manages session key plugin installation
- Sets up permissions and access controls
- Handles chain selection based on environment

### 6. Controllers
- `auth.controller.ts`: Handles authentication endpoints
- `session-keys.controller.ts`: Manages session key operations

## Example API Usage

### 1. Request OTP
```http
POST /auth/initiate-otp
{
  "email": "user@example.com"
}
```

### 2. Verify OTP & Get Session Key
```http
POST /auth/verify-otp
{
  "email": "user@example.com",
  "otp": "123456"
}

Response:
{
  "sessionKeyAddress": "0xSessionKeyAddress",
  "walletAddress": "0xWalletAddress"
}
```

### 3. Execute Transaction
```http
POST /session-keys/execute/user@example.com
{
  "to": "0xRecipientAddress",
  "value": "0.1",
  "data": "0x",
  "sessionKeyAddress": "0xSessionKeyAddress"
}

Response:
{
  "txHash": "0xTransactionHash"
}
```

## Security Considerations

### 1. OTP Security
✅ OTPs are valid for 5 minutes and single-use only
✅ OTPs are stored securely and deleted after verification

### 2. Session Key Security
✅ Session keys are stored securely in the backend
✅ Permissions limit spending, expiration, and allowed actions

### 3. Blockchain Security
✅ Transactions are signed using session keys, not user private keys
✅ Session keys enforce smart contract-based security constraints

## Error Handling

Common errors and their solutions:

| Error Code | Description | Solution |
|------------|-------------|----------|
| 400 | Invalid OTP | Ensure OTP is correct and not expired |
| 401 | Unauthorized session key | Re-authenticate and request a new session key |
| 403 | Session key expired | Request a new session key |
| 500 | Internal server error | Check server logs |

## Environment Configuration

Required environment variables:
```env
NODE_ENV=development|production
ALCHEMY_API_KEY=your_api_key
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASSWORD=your_password
```

## Best Practices

### 🚀 Frontend Integration
- Store session key hashes securely
- Handle session expiration gracefully
- Implement proper error handling

### 🔐 Security
- Use environment variables for sensitive data
- Implement rate limiting for OTP requests
- Regular session key rotation

### ⚡ Performance
- Optimize blockchain interactions
- Implement caching where appropriate
- Monitor transaction gas costs
```

This documentation provides a comprehensive overview of the auth module, including the chain configuration for different environments. It's organized in a clear, readable format and includes all necessary information for developers to understand and work with the system.

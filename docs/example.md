# Checkout.com Getting Started

## Introduction

Checkout.com provides a suite of payment solutions that enable businesses to accept payments online, in-app, and in-store. Our platform offers a comprehensive range of payment methods and services to help businesses grow and scale globally.

## API Overview

The Checkout.com API is a RESTful API that allows you to:

- Process payments
- Create and manage customers
- Handle refunds and disputes
- Set up recurring payments
- And much more

## Authentication

All API requests must be authenticated with an API key. You can generate API keys in the Checkout.com Dashboard.

Example API request:

```bash
curl -X POST https://api.checkout.com/payments
  -H "Authorization: Bearer sk_test_your_secret_key"
  -H "Content-Type: application/json"
  -d '{
    "source": {
      "type": "card",
      "number": "4242424242424242",
      "expiry_month": 6,
      "expiry_year": 2025,
      "cvv": "100"
    },
    "amount": 2000,
    "currency": "USD",
    "reference": "ORDER-123"
  }'
```

## Payment Methods

Checkout.com supports a wide range of payment methods, including:

- Credit and debit cards (Visa, Mastercard, American Express, etc.)
- Digital wallets (Apple Pay, Google Pay, etc.)
- Bank transfers
- Alternative payment methods (PayPal, Klarna, etc.)

## Error Handling

The API returns appropriate HTTP status codes for different types of errors:

- 400: Bad Request - The request was invalid
- 401: Unauthorized - Invalid or missing API key
- 404: Not Found - The requested resource does not exist
- 422: Unprocessable Entity - The request was valid but could not be processed
- 500: Server Error - An error occurred on our servers

Each error response includes a detailed error message to help you debug the issue. 
# Rate Limit Retry API

A prototype API project for testing rate limiting and retry mechanisms.

## Overview

This API demonstrates rate limiting implementation and retry strategies for handling rate-limited requests gracefully.

## Features

- Rate limiting middleware
- Automatic retry mechanisms
- Request throttling
- Error handling for rate limit scenarios

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# API Configuration
API_BASE_URL=https://your-api-domain.com/api
VTEX_APP_KEY=your-vtex-app-key
VTEX_APP_TOKEN=your-vtex-app-token

# Rate Limit Test Configuration
TEST_RATE_LIMIT_URL=/your/test/endpoint
TEST_RATE_LIMIT_LOOPS=500
TEST_RATE_LIMIT_REQUESTS_PER_INTERVAL=50
TEST_RATE_LIMIT_INTERVAL=2000

# Logging Configuration
LOG_DIR=logs

```

## Usage

### Start the server

```bash
npm start
```

### Development mode

```bash
npm run dev
```

## API Endpoints

### Rate Limited Endpoint
- **GET** `/test-rate-limit`
- Demonstrates rate limiting behavior
- Returns data with retry headers

## Rate Limiting

The API implements rate limiting with the following default settings:
- Window: 15 minutes
- Max requests per window: 100
- Headers included in response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Retry Strategy

When rate limits are exceeded:
1. Returns 429 status code
2. Includes `Retry-After` header
3. Client should implement exponential backoff

## Testing

```bash
npm test
```

### Load Testing

```bash
npm run test:load
```

## Dependencies

- Express.js for server framework
- Rate limiting middleware
- Retry utilities

## Contributing

This is a prototype project for testing rate limiting strategies.

## License

Internal HEB prototype - Not for external distribution

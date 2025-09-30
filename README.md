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
PORT=3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RETRY_ATTEMPTS=3
RETRY_DELAY=1000
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

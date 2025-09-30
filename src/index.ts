import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import express, { Request, Response } from "express";
import { MainService } from "./main.service";
import { HttpService } from "./http.service";
import {
  API_BASE_URL,
  API_HEADERS,
  TEST_RATE_LIMIT_URL,
  TEST_RATE_LIMIT_LOOPS,
  TEST_RATE_LIMIT_REQUESTS_PER_INTERVAL,
  TEST_RATE_LIMIT_INTERVAL,
} from "./configs";
import logger from "./logger";

const app = express();
const PORT = process.env.PORT || 3000;

const httpService = new HttpService(API_BASE_URL, {
  headers: API_HEADERS,
});
const mainService = new MainService(httpService);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Express TypeScript API is running!" });
});

app.get("/test-rate-limit", (req: Request, res: Response) => {
  const {
    loops,
    delay,
    requestsPerInterval,
    interval,
    maxRetries,
    retryDelay,
  } = req.query;

  mainService.fetchLoops({
    url: TEST_RATE_LIMIT_URL,
    loops: Number(loops) || TEST_RATE_LIMIT_LOOPS,
    delay: Number(delay) || 1000,
    requestsPerInterval:
      Number(requestsPerInterval) || TEST_RATE_LIMIT_REQUESTS_PER_INTERVAL,
    interval: Number(interval) || TEST_RATE_LIMIT_INTERVAL,
    maxRetries: Number(maxRetries) || 3,
    retryDelay: Number(retryDelay) || 1000,
  });
  res.json({ message: "Test rate limit endpoint" });
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});

export default app;

import { HttpService, HttpResponse } from "./http.service";
import logger from "./logger";

interface FetchLoopsParams {
  url: string;
  loops: number;
  delay: number;
  requestsPerInterval: number;
  interval: number;
  maxRetries: number;
  retryDelay: number;
}

interface RequestState {
  isRateLimited: boolean;
  retryDelay: number;
  attempts: number;
  rateLimitTimeout?: NodeJS.Timeout;

  rlWindow?: {
    startAt: number; // ms timestamp
    endAt?: number; // ms timestamp
    hits: number;
    attempts: number;
    maxPending: number;
    lastDelayMs: number;
  }

}

export class MainService {
  constructor(private httpService: HttpService) {}

  private readonly MAX_ATTEMPTS = 5;
  private readonly BASE_RETRY_DELAY = 6000;

  requestsPending = [] as Promise<HttpResponse | null>[];


  private beginRateLimitWindow(state: RequestState): void {
    if (!state.rlWindow) {
      const now = Date.now();
      state.rlWindow = {
        startAt: now,
        hits: 0,
        attempts: 0,
        maxPending: 0,
        lastDelayMs: 0,
      };
      logger.warn("[rl_window:start] Starting new rate limit window.");
    }
  }

  private recordRateLimitHit(state: RequestState): void {
    this.beginRateLimitWindow(state);
    state.rlWindow!.hits += 1;
    state.rlWindow!.maxPending = Math.max(
      state.rlWindow!.maxPending,
      this.requestsPending.length
    );
  }

  private recordRetryAttempt(state: RequestState, delayMs: number): void {
    this.beginRateLimitWindow(state);
    state.rlWindow!.attempts += 1;
    state.rlWindow!.lastDelayMs = delayMs;
  }

  private endRateLimitWindow(state: RequestState): void {
    if (state.rlWindow) {
      state.rlWindow.endAt = Date.now();
      const duration = state.rlWindow.endAt - state.rlWindow.startAt;
      logger.info(
        `[rl_window:end] Rate limit window ended. Duration: ${duration}ms, Hits: ${state.rlWindow.hits}, Attempts: ${state.rlWindow.attempts}, Max Pending: ${state.rlWindow.maxPending}, Last Delay: ${state.rlWindow.lastDelayMs}ms`
      );
      state.rlWindow = undefined;
    }
  }

  async fetchLoops(params: FetchLoopsParams): Promise<HttpResponse[]> {
    const { url, loops, requestsPerInterval, interval, retryDelay } = params;

    return new Promise((resolve, reject) => {
      const results: HttpResponse[] = [];
      const state: RequestState = {
        isRateLimited: false,
        retryDelay: retryDelay || this.BASE_RETRY_DELAY,
        attempts: 0,
      };

      const batchInterval = setInterval(async () => {
        try {
          if (state.isRateLimited) {
            logger.warn(
              `Rate limited. Waiting ${
                state.rlWindow!.lastDelayMs / 1000
              }s before next batch...`
            );
            return;
          }

          const remainingRequests = loops - results.length;
          if (remainingRequests <= 0) {
            clearInterval(batchInterval);
            this.cleanupState(state);
            if (results.length > loops) results.splice(loops);
            resolve(results);
            return;
          }

          const batchSize = Math.min(requestsPerInterval, remainingRequests);
          logger.info(`Starting batch of ${batchSize} requests...`);

          const batchResults = await this.processBatch({
            url,
            batchSize,
            state,
            requestsPending: this.requestsPending,
          });

          const toTake = Math.min(batchResults.length, loops - results.length);
          if (toTake > 0) results.push(...batchResults.slice(0, toTake));

          logger.info(
            `Completed batch. Total results: ${results.length}/${loops}`
          );
        } catch (error) {
          clearInterval(batchInterval);
          this.cleanupState(state);
          reject(error);
        }
      }, interval);

      // Cleanup on timeout (optional safety measure)
      setTimeout(() => {
        clearInterval(batchInterval);
        this.cleanupState(state);
        resolve(results);
      }, 300000); // 5 minutes max
    });
  }

  private async processBatch({
    url,
    batchSize,
    state,
    requestsPending = [],
  }: {
    url: string;
    batchSize: number;
    state: RequestState;
    requestsPending?: Promise<HttpResponse | null>[];
  }): Promise<HttpResponse[]> {
    if (state.isRateLimited) {
      return [];
    }

    const requests =
      requestsPending.length > 0
        ? requestsPending
        : Array.from({ length: batchSize }, (x: unknown, i: number) =>
            this.sendRequestWithRetry({ url, state, queryNumber: i + 1 })
          );

    if (requestsPending.length > 0) {
      logger.info(
        `Processing ${requestsPending.length} pending requests from queue...`
      );
      this.requestsPending = [];
    }

    const settledResults = await Promise.allSettled(requests);

    return settledResults
      .filter(
        (result): result is PromiseFulfilledResult<HttpResponse> =>
          result.status === "fulfilled" && result.value !== null
      )
      .map((result) => result.value);
  }

  private async sendRequestWithRetry({
    url,
    state,
    queryNumber,
    currentAttempt = 0,
  }: {
    url: string;
    state: RequestState;
    queryNumber: number;
    currentAttempt?: number;
  }): Promise<HttpResponse | null> {
    try {
      // set _to between 0 to 250 based on queryNumber
      const _to = Math.min(250, queryNumber * 50);
      // set rand number between 0 to 250 but not greater than _to
      const _from = Math.max(0, _to - Math.floor(Math.random() * 100) - 1);

      const response = await this.httpService.get(
        `${url}?_from=${_from}&_to=${_to}`
      );

      // Reset attempts on success
      if (state.attempts > 0) {
        state.attempts = 0;
        state.retryDelay = this.BASE_RETRY_DELAY;
      }

      return response;
    } catch (error: any) {
      if (error.response?.status === 429) {
        // Record a 429 hit for current RL window
        this.recordRateLimitHit(state);
        this.addToQueuePending({ url, state, queryNumber, currentAttempt });
        // logger.warn(`Rate limit encountered for ${url}`);
        return null;
      }

      // For non-rate-limit errors, you might want to retry or throw
      logger.error(
        `Request failed: ${url} ${
          error.response?.message || error.response?.data || error.message
        } error code[${error.response.status}]`
      );
      throw error;
    }
  }

  private addToQueuePending({
    url,
    state,
    queryNumber,
    currentAttempt,
  }: {
    url: string;
    state: RequestState;
    queryNumber?: number;
    currentAttempt: number;
  }) {
    const request = this.handleRateLimit({
      url,
      state,
      queryNumber,
      currentAttempt,
    });
    this.requestsPending.push(request);
  }

  private async handleRateLimit({
    url,
    state,
    queryNumber,
    currentAttempt,
  }: {
    url: string;
    state: RequestState;
    queryNumber?: number;
    currentAttempt: number;
  }): Promise<HttpResponse | null> {
    if (currentAttempt >= this.MAX_ATTEMPTS) {
      logger.error(`Max retry attempts reached for ${url}`);
      return null;
    }

    const attemptRetryDelay = state.retryDelay + currentAttempt * 2000;

    this.recordRetryAttempt(state, attemptRetryDelay);

    // Set rate limit flag to pause other requests
    state.isRateLimited = true;

    // Clear existing timeout if any
    if (state.rateLimitTimeout) {
      clearTimeout(state.rateLimitTimeout);
    }

    // Set timeout to resume requests
    state.rateLimitTimeout = setTimeout(() => {
      state.isRateLimited = false;
      this.endRateLimitWindow(state);
    }, attemptRetryDelay);

    // Wait for the retry delay
    await this.sleep(attemptRetryDelay);

    // Retry the request
    return this.sendRequestWithRetry({
      url,
      state,
      queryNumber: queryNumber || 1,
      currentAttempt: currentAttempt + 1,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private cleanupState(state: RequestState): void {
    if (state.rateLimitTimeout) {
      clearTimeout(state.rateLimitTimeout);
      state.rateLimitTimeout = undefined;
    }
  }
}

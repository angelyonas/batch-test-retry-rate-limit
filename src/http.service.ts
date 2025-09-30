// Create an HTTP service adapter using axios
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export type HttpResponse = AxiosResponse<any>;

export class HttpService {
    private client: AxiosInstance;

    constructor(baseURL: string, config?: AxiosRequestConfig) {
        this.client = axios.create({ baseURL, ...config });
    }

    async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.get<T>(url, config);
    }

    async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.post<T>(url, data, config);
    }

    // Add other HTTP methods as needed (put, delete, etc.)

    // Add interceptors if needed
    addRequestInterceptor(onFulfilled: (value: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>, onRejected?: (error: any) => any) {
        this.client.interceptors.request.use(onFulfilled, onRejected);
    }

    addResponseInterceptor(onFulfilled: (value: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>, onRejected?: (error: any) => any) {
        this.client.interceptors.response.use(onFulfilled, onRejected);
    }
}

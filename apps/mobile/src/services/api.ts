import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import { getItem, setItem, removeItem } from "./storage";
import { getStoredServerUrl, setStoredServerUrl } from "./localDatabase";

// Default host based on platform
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export const DEFAULT_HOST =
  configuredApiBaseUrl ||
  Platform.select({
    android: "http://10.0.2.2:5000/api/v1",
    ios: "http://localhost:5000/api/v1",
    default: "http://localhost:5000/api/v1",
  });

export const api = axios.create({
  baseURL: DEFAULT_HOST,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 8000,
});

export async function getCurrentBaseUrl(): Promise<string> {
  const custom = await getStoredServerUrl();
  return custom && custom.trim() ? custom.trim() : DEFAULT_HOST;
}

export async function updateBaseUrl(newUrl: string): Promise<void> {
  const cleanUrl = newUrl.trim().replace(/\/+$/, ""); // Remove trailing slash
  await setStoredServerUrl(cleanUrl);
  api.defaults.baseURL = cleanUrl;
}

// Interceptor to inject token and dynamically set base URL
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const customUrl = await getStoredServerUrl();
  if (customUrl && customUrl.trim()) {
    config.baseURL = customUrl.trim();
  }

  const tokensStr = await getItem("auth_tokens");
  if (tokensStr) {
    try {
      const tokens = JSON.parse(tokensStr);
      if (tokens.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const tokensStr = await getItem("auth_tokens");
        if (!tokensStr) return Promise.reject(error);

        const currentHost = await getCurrentBaseUrl();
        const { refreshToken } = JSON.parse(tokensStr);
        const refreshRes = await axios.post(`${currentHost}/auth/refresh`, {
          refreshToken,
        });

        const newTokens = refreshRes.data.data;
        await setItem("auth_tokens", JSON.stringify(newTokens));

        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        await removeItem("auth_tokens");
        await removeItem("auth_user");
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  },
);

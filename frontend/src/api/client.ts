import axios from "axios";

import { environment } from "../constants/environment";
import { AUTH_TOKEN_STORAGE_KEY, UNAUTHORIZED_EVENT } from "../constants/storage";

export const apiClient = axios.create({
  baseURL: environment.apiBaseUrl,
  headers: { "Content-Type": "application/json" }
});

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    return Promise.reject(error);
  }
);

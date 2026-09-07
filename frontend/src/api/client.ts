import axios from "axios";

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined" && window.location.port === "5173") {
    return `http://${window.location.hostname}:8000/api/v1`;
  }
  return "/api/v1";
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
});

// Interceptor para injeção automática de Bearer JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("app_token");
  if (token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratamento de 401 (desautenticação)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("app_token");
      localStorage.removeItem("app_user");
      window.dispatchEvent(new Event("auth-changed"));
    }
    return Promise.reject(error);
  }
);

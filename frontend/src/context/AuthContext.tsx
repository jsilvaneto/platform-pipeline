import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "../types";
import { api } from "../api/client";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("app_token"));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("app_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem("app_token");
    localStorage.removeItem("app_user");
    setToken(null);
    setUser(null);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("app_token", newToken);
    localStorage.setItem("app_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const refreshUser = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await api.get<User>("/auth/me");
      setUser(response.data);
      localStorage.setItem("app_user", JSON.stringify(response.data));
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleAuthChange = () => {
      setToken(localStorage.getItem("app_token"));
      const savedUser = localStorage.getItem("app_user");
      setUser(savedUser ? JSON.parse(savedUser) : null);
    };

    window.addEventListener("auth-changed", handleAuthChange);
    return () => window.removeEventListener("auth-changed", handleAuthChange);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
};

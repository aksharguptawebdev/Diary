import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AuthTokens, LoginInput, RegisterInput } from "@notes/shared";
import { api } from "../services/api";
import { getItem, setItem, removeItem } from "../services/storage";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const userStr = await getItem("auth_user");
      const tokensStr = await getItem("auth_tokens");

      if (userStr && tokensStr) {
        setUser(JSON.parse(userStr));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (input: LoginInput) => {
    const res = await api.post("/auth/login", input);
    const { user: loggedInUser, tokens } = res.data.data;
    setUser(loggedInUser);
    await setItem("auth_user", JSON.stringify(loggedInUser));
    await setItem("auth_tokens", JSON.stringify(tokens));
  };

  const register = async (input: RegisterInput) => {
    const res = await api.post("/auth/register", input);
    const { user: registeredUser, tokens } = res.data.data;
    setUser(registeredUser);
    await setItem("auth_user", JSON.stringify(registeredUser));
    await setItem("auth_tokens", JSON.stringify(tokens));
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      setUser(null);
      await removeItem("auth_user");
      await removeItem("auth_tokens");
    }
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (!user) return;
    const combined = { ...user, ...updatedUser };
    setUser(combined);
    setItem("auth_user", JSON.stringify(combined));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useMobileAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useMobileAuth must be used within an AuthProvider");
  }
  return context;
}

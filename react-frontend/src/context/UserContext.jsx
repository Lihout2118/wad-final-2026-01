
import { createContext, useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checking = useRef(false);

  async function refreshUser() {
    try {
      const response = await fetch(`${API_URL}/user`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setUser(null);
        return null;
      }

      const data = await response.json();
      setUser(data);
      return data;
    } catch (error) {
      console.error("Failed to get current user:", error);
      setUser(null);
      return null;
    }
  }

  async function login(username, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  }

  useEffect(() => {
    if (checking.current) return;

    checking.current = true;

    refreshUser().finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <UserContext.Provider
      value={{ user, setUser, loading, login, logout, refreshUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

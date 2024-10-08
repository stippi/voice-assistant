import React, { createContext, useState, useEffect, ReactNode } from "react";
import { GeoLocation, User } from "@shared/types";
import { useLocation } from "../hooks";

export type AppContextType = {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  location: GeoLocation | undefined;
  idle: boolean;
  setIdle: (idle: boolean) => void;
};

export const AppContext = createContext<AppContextType>({
  users: [],
  setUsers: () => {},
  location: undefined,
  idle: false,
  setIdle: () => {},
});

function getStorageItem<T>(key: string, fallback: T): T {
  const item = localStorage.getItem(key);
  if (item) {
    return JSON.parse(item);
  }
  return fallback;
}

const initialUsers = getStorageItem<User[]>("voice-assistant-users", []);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState(initialUsers);
  useEffect(() => {
    localStorage.setItem("voice-assistant-users", JSON.stringify(users));
  }, [users]);

  const { location } = useLocation();

  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let inactivityTimeout: number;
    function resetInactivityTimeout() {
      setIdle(false);
      clearTimeout(inactivityTimeout);
      inactivityTimeout = window.setTimeout(() => {
        setIdle(true);
      }, 15000);
    }

    document.addEventListener("mousemove", resetInactivityTimeout);
    document.addEventListener("keydown", resetInactivityTimeout);
    document.addEventListener("touchstart", resetInactivityTimeout);

    resetInactivityTimeout();

    return () => {
      document.removeEventListener("mousemove", resetInactivityTimeout);
      document.removeEventListener("keydown", resetInactivityTimeout);
      document.removeEventListener("touchstart", resetInactivityTimeout);
      clearTimeout(inactivityTimeout);
    };
  }, []);

  return <AppContext.Provider value={{ users, setUsers, location, idle, setIdle }}>{children}</AppContext.Provider>;
};

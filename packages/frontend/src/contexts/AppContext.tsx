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
  setUsers: () => { },
  location: undefined,
  idle: false,
  setIdle: () => { },
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

  // Idle mode is now explicitly controlled via setIdle
  const [idle, setIdle] = useState(false);

  return <AppContext.Provider value={{ users, setUsers, location, idle, setIdle }}>{children}</AppContext.Provider>;
};

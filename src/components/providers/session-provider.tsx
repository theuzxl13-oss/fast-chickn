"use client";

import { createContext, useContext } from "react";
import type { Address, UserRole } from "@/types";

export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
}

interface SessionValue {
  user: SessionUser | null;
  defaultAddress: Address | null;
}

const SessionContext = createContext<SessionValue>({ user: null, defaultAddress: null });

export function SessionProvider({ value, children }: { value: SessionValue; children: React.ReactNode }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

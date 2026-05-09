"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { getDisplayName } from "@/lib/identity";

import { IdentityModal } from "./IdentityModal";

type EnsureFn = () => Promise<string | null>;

type Ctx = {
  displayName: string | null;
  ensureDisplayName: EnsureFn;
};

const IdentityContext = createContext<Ctx | null>(null);

export function useIdentity(): Ctx {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used inside IdentityProvider");
  return ctx;
}

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [displayName, setName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const resolversRef = useRef<Array<(v: string | null) => void>>([]);

  // Hydrate from localStorage post-mount.
  useEffect(() => {
    setName(getDisplayName());
  }, []);

  const ensureDisplayName = useCallback<EnsureFn>(() => {
    if (displayName) return Promise.resolve(displayName);
    return new Promise<string | null>((resolve) => {
      resolversRef.current.push(resolve);
      setOpen(true);
    });
  }, [displayName]);

  const handleSaved = (name: string) => {
    setName(name);
    setOpen(false);
    const queued = resolversRef.current;
    resolversRef.current = [];
    for (const r of queued) r(name);
  };

  const handleClose = () => {
    setOpen(false);
    const queued = resolversRef.current;
    resolversRef.current = [];
    for (const r of queued) r(null);
  };

  return (
    <IdentityContext.Provider value={{ displayName, ensureDisplayName }}>
      {children}
      <IdentityModal
        open={open}
        onClose={handleClose}
        onSaved={handleSaved}
        required
      />
    </IdentityContext.Provider>
  );
}

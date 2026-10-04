import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BUSINESS_ID, BUSINESS_NAME, TIMEZONE } from "../lib/firebase";
import { getActiveBranches, getBusiness } from "../services/business";
import type { Branch, Business } from "../types";

interface BusinessContextValue {
  business: Business;
  branches: Branch[];
  selectedBranch: Branch | null;
  selectedBranchId: string | null;
  setSelectedBranchId: (branchId: string) => void;
  loading: boolean;
  error: string;
}

const fallbackBusiness: Business = {
  id: BUSINESS_ID,
  name: BUSINESS_NAME,
  timezone: TIMEZONE,
  currency: "IDR",
  active: true,
};

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);
const STORAGE_KEY = "barber-online:branch";

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business>(fallbackBusiness);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getBusiness(), getActiveBranches()])
      .then(([b, bs]) => {
        if (b) setBusiness(b);
        setBranches(bs);
        const saved = localStorage.getItem(STORAGE_KEY);
        const next = saved && bs.some(x => x.id === saved) ? saved : bs[0]?.id ?? null;
        setSelectedBranchIdState(next);
        if (next) localStorage.setItem(STORAGE_KEY, next);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Gagal memuat data bisnis."))
      .finally(() => setLoading(false));
  }, []);

  function setSelectedBranchId(branchId: string) {
    setSelectedBranchIdState(branchId);
    localStorage.setItem(STORAGE_KEY, branchId);
  }

  const selectedBranch = useMemo(
    () => branches.find(branch => branch.id === selectedBranchId) ?? null,
    [branches, selectedBranchId]
  );

  return <BusinessContext.Provider value={{ business, branches, selectedBranch, selectedBranchId, setSelectedBranchId, loading, error }}>
    {children}
  </BusinessContext.Provider>;
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used inside BusinessProvider");
  return ctx;
}

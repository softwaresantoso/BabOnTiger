import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BUSINESS_ID, BUSINESS_NAME, TIMEZONE } from "../lib/firebase";
import {
  getActiveBranches,
  getBusiness,
} from "../services/business";
import type { Branch, Business } from "../types";

interface BusinessContextValue {
  business: Business;
  branches: Branch[];
  selectedBranch: Branch | null;
  selectedBranchId: string | null;
  setSelectedBranchId: (branchId: string) => void;
  loading: boolean;
  error: string;
  refreshBranches: () => Promise<void>;
}

const fallbackBusiness: Business = {
  id: BUSINESS_ID,
  name: BUSINESS_NAME,
  timezone: TIMEZONE,
  currency: "IDR",
  active: true,
};

const BusinessContext =
  createContext<BusinessContextValue | undefined>(undefined);

const STORAGE_KEY = "barber-online:branch";

export function BusinessProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [business, setBusiness] =
    useState<Business>(fallbackBusiness);

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const [selectedBranchId, setSelectedBranchIdState] =
    useState<string | null>(() => {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadBranches = async () => {
    const bs = await getActiveBranches();

    setBranches(bs);

    let saved: string | null = null;

    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }

    const next =
      saved && bs.some((branch) => branch.id === saved)
        ? saved
        : bs[0]?.id ?? null;

    setSelectedBranchIdState(next);

    try {
      if (next) {
        localStorage.setItem(STORAGE_KEY, next);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage errors.
    }
  };

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [businessData, activeBranches] =
          await Promise.all([
            getBusiness(),
            getActiveBranches(),
          ]);

        if (!mounted) return;

        if (businessData) {
          setBusiness(businessData);
        }

        setBranches(activeBranches);

        let saved: string | null = null;

        try {
          saved = localStorage.getItem(STORAGE_KEY);
        } catch {
          saved = null;
        }

        const next =
          saved &&
          activeBranches.some(
            (branch) => branch.id === saved
          )
            ? saved
            : activeBranches[0]?.id ?? null;

        setSelectedBranchIdState(next);

        try {
          if (next) {
            localStorage.setItem(
              STORAGE_KEY,
              next
            );
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          // Ignore localStorage errors.
        }
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Gagal memuat data bisnis."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  function setSelectedBranchId(
    branchId: string
  ) {
    setSelectedBranchIdState(branchId);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        branchId
      );
    } catch {
      // Ignore localStorage errors.
    }
  }

  const selectedBranch = useMemo(
    () =>
      branches.find(
        (branch) =>
          branch.id === selectedBranchId
      ) ?? null,
    [branches, selectedBranchId]
  );

  async function refreshBranches() {
    try {
      setError("");

      await loadBranches();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data cabang."
      );
    }
  }

  return (
    <BusinessContext.Provider
      value={{
        business,
        branches,
        selectedBranch,
        selectedBranchId,
        setSelectedBranchId,
        refreshBranches,
        loading,
        error,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(
    BusinessContext
  );

  if (!context) {
    throw new Error(
      "useBusiness must be used inside BusinessProvider"
    );
  }

  return context;
}
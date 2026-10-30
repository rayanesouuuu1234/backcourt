"use client";

import { useCallback, useEffect, useState } from "react";
import type { Site } from "./api";

export interface LedgerItem {
  team_id: string;
  name: string;
  conference: string;
  site: Site;
  date: string;
}

const KEY = "backcourt.ledger.v1";

function read(): LedgerItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LedgerItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: LedgerItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("ledger"));
  } catch {
    /* storage can be unavailable (private mode); the ledger just won't persist */
  }
}

export function useLedger() {
  const [items, setItems] = useState<LedgerItem[]>([]);

  useEffect(() => {
    setItems(read());
    const sync = () => setItems(read());
    window.addEventListener("ledger", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ledger", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((next: LedgerItem[]) => {
    setItems(next);
    write(next);
  }, []);

  return { items, save };
}

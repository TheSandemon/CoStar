"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AccountType } from "@/lib/profile";
import {
  getConnection,
  requestConnection,
  getConnectionLabel,
  type ConnectionStatus,
} from "@/lib/connections";

interface ProfileCTAProps {
  targetId: string;
  targetRole: AccountType;
}

export default function ProfileCTA({ targetId, targetRole }: ProfileCTAProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    if (user.uid === targetId) {
      setLoading(false);
      return; // Own profile
    }

    getConnection(user.uid, targetId)
      .then((conn) => {
        if (conn) setStatus(conn.status);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.uid, targetId]);

  if (!user?.uid || user.uid === targetId) {
    return null; // Don't show CTA to unauthenticated users or on own profile
  }

  const viewerRole = (user.accountType || "talent") as AccountType;
  const label = getConnectionLabel(viewerRole, targetRole, status);
  const isOneWay =
    (viewerRole === "talent" && targetRole === "business") ||
    (viewerRole === "business" && targetRole === "talent");

  const handleAction = async () => {
    if (status === "accepted" || (status === "pending" && isOneWay)) return;
    setActionLoading(true);
    try {
      // For one-way connections (Track, Shortlist), auto-accept immediately for UX simplicity.
      // Alternatively, leave as pending. The plan says "One-way follow for updates" so we can auto-accept.
      await requestConnection(user.uid, targetId, viewerRole, targetRole, isOneWay);
      setStatus(isOneWay ? "accepted" : "pending");
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <button disabled className="inline-flex h-10 w-24 items-center justify-center rounded-lg bg-slate-800 px-4 font-medium text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </button>
    );
  }

  // If pending and not one-way, we might want to show "Pending"
  if (status === "pending" && !isOneWay) {
    return (
      <button disabled className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-500/50 bg-slate-800/50 px-4 font-medium text-amber-500/70 transition-colors">
        Pending
      </button>
    );
  }

  const isConnected = status === "accepted";

  return (
    <button
      onClick={handleAction}
      disabled={isConnected || actionLoading}
      className={`inline-flex h-10 items-center justify-center rounded-lg px-4 font-medium transition-colors ${
        isConnected
          ? "border border-amber-500/50 bg-slate-800/50 text-amber-500/70"
          : "bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-50"
      }`}
    >
      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}

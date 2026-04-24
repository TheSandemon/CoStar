'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getConnectionStatus,
  sendConnect,
  acceptConnect,
  removeConnect,
  type Connection,
} from '@/lib/connections';
import { UserPlus, UserCheck, UserX, Clock } from 'lucide-react';

interface ConnectButtonProps {
  targetUid: string;
  className?: string;
}

type ButtonState = 'none' | 'pending-sent' | 'pending-received' | 'connected' | 'loading';

export default function ConnectButton({ targetUid, className = '' }: ConnectButtonProps) {
  const { user } = useAuth();
  const [state, setState] = useState<ButtonState>('loading');

  useEffect(() => {
    if (!user) return;
    getConnectionStatus(user.uid, targetUid)
      .then((conn) => setState(resolveState(conn, user.uid)))
      .catch(() => setState('none'));
  }, [user, targetUid]);

  if (!user || user.uid === targetUid) return null;

  async function handleClick() {
    if (!user) return;
    setState('loading');
    try {
      if (state === 'none') {
        await sendConnect(user.uid, targetUid);
        setState('pending-sent');
      } else if (state === 'pending-received') {
        await acceptConnect(user.uid, targetUid);
        setState('connected');
      } else if (state === 'pending-sent' || state === 'connected') {
        await removeConnect(user.uid, targetUid);
        setState('none');
      }
    } catch {
      // Re-fetch current state on error
      const conn = await getConnectionStatus(user.uid, targetUid).catch(() => null);
      setState(resolveState(conn, user.uid));
    }
  }

  const config = buttonConfig[state];

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${config.classes} ${className}`}
    >
      <config.Icon size={16} />
      {config.label}
    </button>
  );
}

function resolveState(conn: Connection | null, currentUid: string): ButtonState {
  if (!conn) return 'none';
  if (conn.status === 'connected') return 'connected';
  return conn.initiatedBy === currentUid ? 'pending-sent' : 'pending-received';
}

const buttonConfig: Record<ButtonState, { label: string; Icon: any; classes: string }> = {
  loading: {
    label: 'Loading...',
    Icon: Clock,
    classes: 'bg-slate-700 text-slate-400 cursor-not-allowed',
  },
  none: {
    label: 'Connect',
    Icon: UserPlus,
    classes: 'bg-amber-500 hover:bg-amber-400 text-slate-900',
  },
  'pending-sent': {
    label: 'Request Sent',
    Icon: Clock,
    classes: 'bg-slate-700 hover:bg-red-500/20 hover:text-red-300 text-slate-300 border border-slate-600',
  },
  'pending-received': {
    label: 'Accept',
    Icon: UserCheck,
    classes: 'bg-green-500 hover:bg-green-400 text-white',
  },
  connected: {
    label: 'Connected',
    Icon: UserCheck,
    classes: 'bg-slate-700 hover:bg-red-500/20 hover:text-red-300 text-slate-300 border border-slate-600',
  },
};

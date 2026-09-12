import { useEffect, useState } from 'react';
import AuthPage from './pages/AuthPage';
import PatientShell from './pages/PatientShell';
import StaffShell from './pages/StaffShell';
import type { Session } from './queue/types';

const SESSION_KEY = 'sanctuary-hospital-session-v1';

function loadSession(): Session {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session): void {
  try {
    if (session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    /* Ignore storage errors. */
  }
}

export default function App() {
  const [session, setSession] = useState<Session>(loadSession);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  const handleLogout = () => {
    setSession(null);
  };

  if (!session) {
    return <AuthPage onAuthenticated={setSession} />;
  }

  if (session.role === 'patient') {
    return (
      <PatientShell
        session={session}
        onLogout={handleLogout}
        onSessionChange={setSession}
      />
    );
  }

  return (
    <StaffShell
      session={session}
      onLogout={handleLogout}
      onSessionChange={setSession}
    />
  );
}

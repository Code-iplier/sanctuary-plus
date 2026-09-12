export type AuthUser = {
  sub: string;
  role: 'patient' | 'staff';
  patientId?: string;
  displayName?: string;
  username?: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  user: AuthUser;
};

async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || `Authentication failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function loginStaff(
  username: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('staff/login', { username, password });
}

export function loginPatient(input: {
  patientId: string;
  phone?: string;
  name?: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('patient/login', input);
}

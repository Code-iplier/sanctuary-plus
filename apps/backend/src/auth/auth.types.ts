export type AuthRole = 'patient' | 'staff';

export type AuthUser = {
  sub: string;
  role: AuthRole;
  patientId?: string;
  displayName?: string;
  username?: string;
};

export type StaffLoginInput = {
  username: string;
  password: string;
};

export type PatientLoginInput = {
  patientId: string;
  phone?: string;
  name?: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  user: AuthUser;
};

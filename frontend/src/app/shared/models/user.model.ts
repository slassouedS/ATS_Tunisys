export type UserRole = 'MANAGER' | 'RH' | 'RECRUTEUR' | 'TECH' | 'ADMIN';

export interface AuthUser {
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

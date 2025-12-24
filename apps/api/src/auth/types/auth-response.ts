export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthPayload {
  sub: string;
  email: string;
  roles: string[];
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    phone?: string | null;
    fullName: string;
    locale: string;
    roles: string[];
  };
  tokens: AuthTokens;
}

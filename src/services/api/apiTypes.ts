export type AuthUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  isEmailVerified: boolean;
  avatar?: string | null;
  gender?: 'male' | 'female' | null;
  bio?: string;
};

export type AuthResult = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type AuthTokens = Pick<AuthResult, 'accessToken' | 'refreshToken'>;
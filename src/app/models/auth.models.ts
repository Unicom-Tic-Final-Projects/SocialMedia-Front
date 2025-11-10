// Authentication models matching backend DTOs

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  tenantName: string;
  tenantType: 'Agency' | 'Individual';
  userName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserDto;
}

export interface UserDto {
  userId: string; // GUID as string
  email: string;
  role: string;
  createdAt: string;
  tenantId?: string;
  tenantName?: string;
  tenantType?: 'Agency' | 'Individual';
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}


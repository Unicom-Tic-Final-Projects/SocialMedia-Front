import { UserDto } from './auth.models';

export interface ClientUser extends UserDto {
  clientId?: string;
}

export interface CreateClientUserRequest {
  clientId: string;
  email: string;
  password?: string; // Optional - will be auto-generated if not provided
}


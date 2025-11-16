export interface Client {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  status: 'Active' | 'Inactive' | 'Archived';
  createdAt: string;
  updatedAt?: string;
  hasUserAccount?: boolean; // Indicates if client has a user account
  userAccountId?: string; // User account ID if exists
}

export interface CreateClientRequest {
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
}

export interface UpdateClientRequest extends CreateClientRequest {
  status?: 'Active' | 'Inactive' | 'Archived';
}


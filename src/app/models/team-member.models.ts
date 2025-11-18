// Team member models matching backend DTOs

export interface TeamMember {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  tenantId?: string;
  tenantName?: string;
  tenantType?: string;
}

export interface CreateTeamMemberRequest {
  email: string;
  password: string;
  role?: 'Admin' | 'Editor';
}

export interface UpdateTeamMemberRequest {
  email?: string;
  role?: 'Admin' | 'Editor';
}


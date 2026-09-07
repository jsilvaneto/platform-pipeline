export type ItemStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";

export interface User {
  id: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Item {
  id: string;
  title: string;
  description: string | null;
  status: ItemStatus;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemCreateInput {
  title: string;
  description?: string;
  status?: ItemStatus;
}

export interface ItemUpdateInput {
  title?: string;
  description?: string;
  status?: ItemStatus;
}

export interface ItemFilterParams {
  status?: ItemStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ApiErrorDetail {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>;
}

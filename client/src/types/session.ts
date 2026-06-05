export interface Session {
  id: string;
  schoolId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  terms?: Term[];
}

export interface Term {
  id: string;
  sessionId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CreateSessionData {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface UpdateSessionData extends Partial<CreateSessionData> {
  isActive?: boolean;
}

export interface CreateTermData {
  sessionId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdateTermData extends Partial<Omit<CreateTermData, 'sessionId'>> {}
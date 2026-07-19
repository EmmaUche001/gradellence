export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  body: string | null;
  date: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateAnnouncementData {
  title: string;
  body?: string;
  date: string;
}

export interface UpdateAnnouncementData extends Partial<CreateAnnouncementData> {}

export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
export type CourseLanguage = 'en' | 'am';

export type Course = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string | null;
  language: CourseLanguage;
  thumbnailUrl: string | null;
  tags: string[];
  estimatedDurationMinutes: number | null;
  status: CourseStatus;
  rejectionReason: string | null;
  createdAt: Date;
  publishedAt: Date | null;
};

export type CourseFields = {
  title?: string | undefined;
  description?: string | undefined;
  category?: string | null | undefined;
  language?: CourseLanguage | undefined;
  thumbnailUrl?: string | null | undefined;
  tags?: string[] | undefined;
  estimatedDurationMinutes?: number | null | undefined;
};

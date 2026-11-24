export type Mentor = {
  id: number;
  full_name: string;
  subject: string | null;
  bio: string | null;
  photo_url: string | null;
  sort_order: number;
};

export const MENTOR_FIELDS = "id, full_name, subject, bio, photo_url, sort_order";
export const MENTOR_PHOTO_BUCKET = "mentor-photos";
export const MENTOR_PHOTO_MAX_MB = 3;

/** Faqat https havolalarni rasm sifatida ko'rsatamiz */
export function safePhoto(url: string | null | undefined) {
  return url && /^https:\/\//i.test(url) ? url : null;
}

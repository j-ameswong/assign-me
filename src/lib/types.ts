export type EventStatus = "open" | "closed" | "allocated";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  join_code: string;
  admin_token: string;
  status: EventStatus;
  email_verification: boolean;
  created_at: string;
  expires_at: string;
}

export interface Option {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  capacity: number;
  sort_order: number;
}

export interface Submission {
  id: string;
  event_id: string;
  email: string;
  rankings: string[];
  verified: boolean;
  submitted_at: string;
}

export interface VerificationCode {
  id: string;
  submission_id: string;
  code: string;
  expires_at: string;
}

export interface Allocation {
  id: string;
  event_id: string;
  submission_id: string;
  option_id: string | null;
}

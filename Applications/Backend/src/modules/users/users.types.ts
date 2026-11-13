import type { Actor } from '../../core/actor.js';

export type User = Actor & {
  email: string;
  name: string | null;
  status: 'active' | 'suspended';
  createdAt: Date;
};

export type FirebaseProfile = {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

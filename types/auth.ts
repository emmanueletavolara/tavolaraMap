export interface UserProfile {
  id: string;
  name: string;
  email: string;
  travel_preferences: {
    pets: boolean;
    family: boolean;
    accessibility: boolean;
  };
}

export interface AuthError {
  message: string;
}
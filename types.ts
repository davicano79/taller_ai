export enum JobStatus {
  INTAKE = 'Ingreso',
  ASSESSING = 'Valoración',
  IN_PROGRESS = 'En Proceso',
  COMPLETED = 'Terminado'
}

export interface CarDetails {
  plate: string;
  make: string;
  model: string;
  year?: string;
  color?: string;
}

export interface DamagePart {
  name: string;
  confidence: number;
  description?: string;
}

export interface Job {
  id: string;
  createdAt: number;
  status: JobStatus;
  carDetails?: CarDetails;
  intakeImage?: string; // Base64
  damageImages?: string[]; // Base64
  identifiedParts: string[];
  manualNotes: string;
  repairType: 'CHAPA' | 'PINTURA' | 'AMBOS';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  sources?: Array<{ uri: string; title: string }>;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export interface AppSettings {
  // We replace specific Sheet fields with a generic firebase config object
  firebaseConfig?: FirebaseConfig; 
  // Keep these for backward compatibility if needed, or remove. 
  // For this update, we assume we are moving fully to Firebase.
  googleSheetId?: string; 
  googleAccessToken?: string;
}
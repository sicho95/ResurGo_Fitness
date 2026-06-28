export type Id = string;

export type Level =
  | 'R0' | 'R1' | 'R2' | 'R3' | 'R4'
  | 'P0' | 'P1' | 'P2' | 'P3' | 'P4'
  | 'T0' | 'T1' | 'T2' | 'T3' | 'T4'
  | 'J0' | 'J1' | 'J2' | 'J3' | 'J4'
  | 'G0' | 'G1' | 'G2' | 'G3' | 'G4'
  | 'L0' | 'L1' | 'L2' | 'L3' | 'L4'
  | 'M0' | 'M1' | 'M2' | 'M3' | 'M4';

export type ExerciseFamily = 'core' | 'push' | 'pull' | 'legs' | 'mobility' | 'agility' | 'cardio' | 'warmup' | 'cooldown';
export type ExerciseLevel = 'starter' | 'beginner' | 'intermediate' | 'advanced';
export type SessionState = 'planned' | 'preview_exercise' | 'exercise_running' | 'resting' | 'logging_result' | 'exercise_completed' | 'exercise_replaced' | 'session_completed' | 'session_aborted';
export type AdaptationColor = 'green' | 'blue' | 'orange' | 'red';
export type DataSourceKind = 'manual' | 'json_import' | 'mock_garmin' | 'mock_apple_health';

export interface PainFlags {
  back: number | null;
  knee: number | null;
  hip: number | null;
  tendon: number | null;
  shoulder: number | null;
  irradiating?: boolean;
  neurological?: boolean;
}

export interface Profile {
  id: Id;
  name: string;
  createdAt: string;
  age?: number;
  birthYear?: number;
  heightCm?: number | null;
  equipment: string[];
  availabilityDays: number;
  sportsHistory: string;
  goals: {
    mode: 'fat_loss_strength_mobility' | 'maintenance' | 'recomposition';
    startWeightKg: number;
    targetWeightKg: number;
    targetDate: string;
  };
  healthContext: {
    backHistory?: string;
    kneeHistory?: string;
    shoulderHistory?: string;
    activitiesToAvoid?: string;
    medicalNotes?: string;
    painFlags: PainFlags;
  };
  initialLevels: {
    running: Level | null;
    push: Level | null;
    pull: Level | null;
    legs: Level | null;
    frontCore: Level | null;
    sideCore: Level | null;
    mobility: Level | null;
  };
  dataPreferences: {
    primaryActivities: 'garmin' | 'apple_health' | 'manual' | 'none';
    primaryWeight: 'garmin_index_s2' | 'apple_health' | 'manual' | 'none';
    secondary: 'apple_health_optional' | 'garmin_optional' | 'none';
    manualFallback: boolean;
    deduplication: boolean;
  };
}

export interface Exercise {
  id: Id;
  name: string;
  family: ExerciseFamily;
  level: ExerciseLevel;
  goals: string[];
  muscles: string[];
  media: {
    onlineVideoUrl: string;
    videoSourceName: string;
    offlineDiagram: string;
    thumbnail?: string;
  };
  description: {
    short: string;
    benefits: string[];
    keyPoints: string[];
    commonMistakes: string[];
    risks: string[];
    contraindications: string[];
    regression: string[];
    progression: string[];
  };
  replacements: {
    easier: Id[];
    harder: Id[];
    equivalent: Id[];
    backSensitive: Id[];
  };
  prescription: {
    type: 'reps' | 'time' | 'distance';
    defaultSets: number;
    defaultReps?: number;
    defaultSeconds?: number;
    side?: 'none' | 'left' | 'right' | 'both';
    restSeconds: number;
  };
  voiceCues: {
    intro: string;
    keyCue: string;
    safetyCue: string;
    halfway: string;
    lastSeconds: string;
    completed: string;
  };
}

export interface PlannedExercise {
  exerciseId: Id;
  sets: number;
  reps?: number;
  seconds?: number;
  restSeconds: number;
  note?: string;
}

export interface PlannedSession {
  id: Id;
  profileId: Id;
  date: string;
  title: string;
  type: 'strength' | 'run' | 'mobility' | 'cardio' | 'minimal';
  durationMinutes: number;
  phase: number;
  weekNumber: number;
  exercises: PlannedExercise[];
  isShortVersion?: boolean;
  completedAt?: string;
}

export interface SessionLogSet {
  setIndex: number;
  success: 'yes' | 'partial' | 'no';
  actualReps?: number;
  actualSeconds?: number;
  difficulty: 'easy' | 'ok' | 'hard' | 'too_hard';
  pain: number;
  painZone?: string;
  comment?: string;
}

export interface SessionRun {
  id: Id;
  profileId: Id;
  plannedSessionId: Id;
  state: SessionState;
  currentExerciseIndex: number;
  currentSetIndex: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  setLogs: Record<Id, SessionLogSet[]>;
  safetyAlerts: string[];
}

export interface BodyMetric {
  id: Id;
  profileId: Id;
  source: DataSourceKind;
  measuredAt: string;
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  boneMassKg?: number;
  bodyWaterPct?: number;
  waistCm?: number;
  hipCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
}

export interface ActivityEvent {
  id: Id;
  profileId: Id;
  source: DataSourceKind;
  type: 'run' | 'walk' | 'strength' | 'mobility' | 'bike' | 'cardio';
  startedAt: string;
  durationSeconds: number;
  distanceMeters?: number;
  externalId?: string;
}

export interface WeeklySignal {
  adherencePercent: number;
  backPain: number;
  kneeTendonPain: number;
  fatigue: number;
  weightTrendKg28d: number;
  sessionsDone: number;
  sessionsPlanned: number;
  runDone: boolean;
  mobilityDone: boolean;
  irradiatingPain?: boolean;
  neurologicalSymptoms?: boolean;
}

export interface TtsSettings {
  enabled: boolean;
  language: string;
  voiceId: string | null;
  rate: number;
  pitch: number;
  volume: number;
  verbosityLevel: 'silent' | 'minimal' | 'normal' | 'complete' | 'motivation';
  countdownEnabled: boolean;
  countdownSeconds: number;
  announceRest: boolean;
  announceNextExercise: boolean;
  announceTechnicalCues: boolean;
  announceMotivation: 'never' | 'sometimes' | 'often';
  safetyAlertsAlwaysOn: boolean;
  repTempoVoice: boolean;
  announceHalfway: boolean;
  announceLastSeconds: boolean;
}

export interface AppSettings {
  activeProfileId: Id | null;
  theme: 'light' | 'dark' | 'system';
  tts: TtsSettings;
}

export interface DataSourceConfig {
  id: Id;
  kind: DataSourceKind;
  enabled: boolean;
  priority: number;
  label: string;
  lastSyncAt?: string;
}

export interface SyncEvent {
  id: Id;
  source: DataSourceKind;
  happenedAt: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export interface AppExport {
  schemaVersion: '1.0.0';
  exportedAt: string;
  appSettings: AppSettings;
  profiles: Profile[];
  exerciseLibrary: Exercise[];
  sessions: PlannedSession[];
  sessionRuns: SessionRun[];
  metrics: BodyMetric[];
  activities: ActivityEvent[];
  dataSources: DataSourceConfig[];
  syncEvents: SyncEvent[];
}

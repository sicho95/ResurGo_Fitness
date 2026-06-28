import { z } from 'zod';

const painFlagsSchema = z.object({
  back: z.number().min(0).max(5).nullable(),
  knee: z.number().min(0).max(5).nullable(),
  hip: z.number().min(0).max(5).nullable(),
  tendon: z.number().min(0).max(5).nullable(),
  shoulder: z.number().min(0).max(5).nullable(),
  irradiating: z.boolean().optional(),
  neurological: z.boolean().optional()
});

export const profileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.string(),
  age: z.number().optional(),
  birthYear: z.number().optional(),
  heightCm: z.number().nullable().optional(),
  equipment: z.array(z.string()),
  availabilityDays: z.number().min(1).max(7),
  sportsHistory: z.string(),
  goals: z.object({
    mode: z.enum(['fat_loss_strength_mobility', 'maintenance', 'recomposition']),
    startWeightKg: z.number(),
    targetWeightKg: z.number(),
    targetDate: z.string()
  }),
  healthContext: z.object({
    backHistory: z.string().optional(),
    kneeHistory: z.string().optional(),
    shoulderHistory: z.string().optional(),
    activitiesToAvoid: z.string().optional(),
    medicalNotes: z.string().optional(),
    painFlags: painFlagsSchema
  }),
  initialLevels: z.object({
    running: z.string().nullable(),
    push: z.string().nullable(),
    pull: z.string().nullable(),
    legs: z.string().nullable(),
    frontCore: z.string().nullable(),
    sideCore: z.string().nullable(),
    mobility: z.string().nullable()
  }),
  dataPreferences: z.object({
    primaryActivities: z.enum(['garmin', 'apple_health', 'manual', 'none']),
    primaryWeight: z.enum(['garmin_index_s2', 'apple_health', 'manual', 'none']),
    secondary: z.enum(['apple_health_optional', 'garmin_optional', 'none']),
    manualFallback: z.boolean(),
    deduplication: z.boolean()
  })
});

export const appExportSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  exportedAt: z.string(),
  appSettings: z.unknown(),
  profiles: z.array(profileSchema),
  exerciseLibrary: z.array(z.unknown()),
  sessions: z.array(z.unknown()),
  sessionRuns: z.array(z.unknown()),
  metrics: z.array(z.unknown()),
  activities: z.array(z.unknown()),
  dataSources: z.array(z.unknown()),
  syncEvents: z.array(z.unknown())
});

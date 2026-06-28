import type { AdaptationColor, PlannedSession, Profile, WeeklySignal } from './types';

export interface WeeklyDecision {
  color: AdaptationColor;
  label: string;
  reason: string;
  action: 'progress' | 'repeat' | 'simplify' | 'protect';
  allowSecondRun: boolean;
  safetyAlert?: string;
}

export function adherenceGrade(percent: number): 'A' | 'B' | 'C' | 'D' {
  if (percent >= 85) return 'A';
  if (percent >= 65) return 'B';
  if (percent >= 40) return 'C';
  return 'D';
}

export function decideWeek(profile: Profile, signal: WeeklySignal): WeeklyDecision {
  const grade = adherenceGrade(signal.adherencePercent);
  const painMax = Math.max(signal.backPain, signal.kneeTendonPain);

  if (signal.irradiatingPain || signal.neurologicalSymptoms || painMax >= 3 || signal.fatigue >= 5) {
    return {
      color: 'red',
      label: 'Protection',
      reason: 'Douleur ou fatigue incompatible avec une progression.',
      action: 'protect',
      allowSecondRun: false,
      safetyAlert: signal.irradiatingPain || signal.neurologicalSymptoms
        ? 'Stop. Douleur irradiée, faiblesse ou engourdissement : avis médical recommandé.'
        : 'Réduire la charge, remplacer la course par marche/mobilité et surveiller la douleur.'
    };
  }

  if (grade === 'D' || signal.fatigue >= 4 || signal.weightTrendKg28d > 1) {
    return {
      color: 'orange',
      label: 'Correction',
      reason: 'Assiduité basse, fatigue élevée ou tendance poids défavorable.',
      action: 'simplify',
      allowSecondRun: false
    };
  }

  const improving = signal.weightTrendKg28d <= 0 || signal.sessionsDone >= signal.sessionsPlanned;
  if ((grade === 'A' || grade === 'B') && painMax <= 2 && signal.fatigue <= 3 && improving) {
    return {
      color: 'green',
      label: 'Progression',
      reason: 'Régularité solide, douleur faible et tendance acceptable.',
      action: 'progress',
      allowSecondRun: canMoveToTwoRuns(profile, signal)
    };
  }

  return {
    color: 'blue',
    label: 'Maintien',
    reason: 'Semaine correcte sans signal clair de progression.',
    action: 'repeat',
    allowSecondRun: false
  };
}

export function canMoveToTwoRuns(profile: Profile, signal: WeeklySignal): boolean {
  const latestWeight = profile.goals.startWeightKg + signal.weightTrendKg28d;
  return (
    latestWeight <= 92 &&
    signal.backPain <= 1 &&
    signal.kneeTendonPain <= 1 &&
    signal.fatigue <= 3 &&
    signal.runDone &&
    adherenceGrade(signal.adherencePercent) !== 'C' &&
    adherenceGrade(signal.adherencePercent) !== 'D'
  );
}

export function restartStrategy(daysStopped: number): string {
  if (daysStopped <= 7) return 'Reprise normale';
  if (daysStopped <= 14) return 'Semaine allégée';
  if (daysStopped <= 28) return 'Retour au palier précédent';
  if (daysStopped <= 62) return 'Mini-test de reprise';
  return 'Nouveau bilan complet';
}

export function makeMinimalWeek(session: PlannedSession): PlannedSession {
  return {
    ...session,
    id: `${session.id}_short`,
    title: `${session.title} courte`,
    type: 'minimal',
    durationMinutes: Math.min(session.durationMinutes, 25),
    isShortVersion: true,
    exercises: session.exercises.slice(0, 4).map((item) => ({
      ...item,
      sets: Math.max(1, Math.min(item.sets, 2)),
      restSeconds: Math.min(item.restSeconds, 45)
    }))
  };
}

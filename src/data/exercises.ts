import type { Exercise } from '../core/types';

const videoBase = 'https://example.com/resurgo-videos';

export const exerciseSeed: Exercise[] = [
  {
    id: 'bird_dog',
    name: 'Bird-dog',
    family: 'core',
    level: 'starter',
    goals: ['gainage profond', 'stabilité lombaire'],
    muscles: ['transverse', 'lombaires', 'fessiers'],
    media: { onlineVideoUrl: `${videoBase}/bird-dog`, videoSourceName: 'Placeholder ResurGo', offlineDiagram: '/assets/exercises/bird_dog.svg' },
    description: {
      short: 'Stabilisation à quatre pattes, bras et jambe opposés.',
      benefits: ['Renforce le dos sans charge', 'Améliore le contrôle du bassin'],
      keyPoints: ['Dos long', 'Bassin stable', 'Mouvement lent'],
      commonMistakes: ['Cambrer', 'Lever trop haut', 'Tourner le bassin'],
      risks: ['Stop si douleur irradiée'],
      contraindications: ['Douleur neurologique ou forte'],
      regression: ['Lever seulement un bras ou une jambe'],
      progression: ['Pause de 2 secondes en extension']
    },
    replacements: { easier: [], harder: ['dead_bug'], equivalent: ['dead_bug'], backSensitive: ['dead_bug'] },
    prescription: { type: 'reps', defaultSets: 3, defaultReps: 8, side: 'both', restSeconds: 40 },
    voiceCues: { intro: 'Bird-dog. Cherche la stabilité avant l’amplitude.', keyCue: 'Bassin stable, respiration calme.', safetyCue: 'Stop si la douleur descend dans la jambe.', halfway: 'Moitié du travail.', lastSeconds: 'Encore quelques répétitions propres.', completed: 'Bien. Dos stable.' }
  },
  {
    id: 'dead_bug',
    name: 'Dead bug',
    family: 'core',
    level: 'starter',
    goals: ['gainage profond', 'protection dos'],
    muscles: ['abdominaux profonds', 'fléchisseurs hanche'],
    media: { onlineVideoUrl: `${videoBase}/dead-bug`, videoSourceName: 'Placeholder ResurGo', offlineDiagram: '/assets/exercises/dead_bug.svg' },
    description: {
      short: 'Gainage dorsal au sol, bras et jambe opposés.',
      benefits: ['Très contrôlable', 'Apprend à verrouiller le tronc'],
      keyPoints: ['Bas du dos neutre', 'Expire en allongeant', 'Amplitude adaptée'],
      commonMistakes: ['Décoller les lombaires', 'Aller trop vite'],
      risks: ['Réduire amplitude si tiraillement'],
      contraindications: ['Douleur vive'],
      regression: ['Talons touchent le sol'],
      progression: ['Bras et jambe plus bas']
    },
    replacements: { easier: [], harder: ['bird_dog'], equivalent: ['bird_dog'], backSensitive: ['bird_dog'] },
    prescription: { type: 'reps', defaultSets: 3, defaultReps: 8, side: 'both', restSeconds: 40 },
    voiceCues: { intro: 'Dead bug. Lent et propre.', keyCue: 'Expire, garde les côtes basses.', safetyCue: 'Stop si douleur vive.', halfway: 'Moitié.', lastSeconds: 'Dernières répétitions.', completed: 'Contrôle validé.' }
  },
  {
    id: 'incline_pushup',
    name: 'Pompes inclinées',
    family: 'push',
    level: 'beginner',
    goals: ['force push', 'technique'],
    muscles: ['pectoraux', 'triceps', 'épaules'],
    media: { onlineVideoUrl: `${videoBase}/incline-pushup`, videoSourceName: 'Placeholder ResurGo', offlineDiagram: '/assets/exercises/incline_pushup.svg' },
    description: {
      short: 'Pompes mains sur support haut.',
      benefits: ['Dose facilement la difficulté', 'Prépare aux pompes classiques'],
      keyPoints: ['Corps gainé', 'Coudes contrôlés', 'Poitrine vers support'],
      commonMistakes: ['Tête en avant', 'Bassin qui tombe'],
      risks: ['Épaule douloureuse'],
      contraindications: ['Douleur épaule forte'],
      regression: ['Support plus haut'],
      progression: ['Support plus bas']
    },
    replacements: { easier: [], harder: ['split_squat'], equivalent: [], backSensitive: [] },
    prescription: { type: 'reps', defaultSets: 3, defaultReps: 10, side: 'none', restSeconds: 60 },
    voiceCues: { intro: 'Pompes inclinées.', keyCue: 'Corps en bloc.', safetyCue: 'Stop si épaule douloureuse.', halfway: 'Mi-série.', lastSeconds: 'Garde la ligne.', completed: 'Série terminée.' }
  },
  {
    id: 'band_row',
    name: 'Rowing élastique',
    family: 'pull',
    level: 'beginner',
    goals: ['tirage', 'posture'],
    muscles: ['dos', 'biceps', 'arrière épaules'],
    media: { onlineVideoUrl: `${videoBase}/band-row`, videoSourceName: 'Placeholder ResurGo', offlineDiagram: '/assets/exercises/band_row.svg' },
    description: {
      short: 'Tirage horizontal avec élastique.',
      benefits: ['Renforce le haut du dos', 'Équilibre le push'],
      keyPoints: ['Épaules basses', 'Tirer les coudes', 'Contrôle retour'],
      commonMistakes: ['Hausser les épaules', 'Cambrer'],
      risks: ['Ancrage instable'],
      contraindications: ['Douleur épaule vive'],
      regression: ['Élastique léger'],
      progression: ['Élastique plus dur']
    },
    replacements: { easier: [], harder: [], equivalent: [], backSensitive: [] },
    prescription: { type: 'reps', defaultSets: 3, defaultReps: 12, side: 'none', restSeconds: 50 },
    voiceCues: { intro: 'Rowing élastique.', keyCue: 'Épaules basses, tire les coudes.', safetyCue: 'Vérifie l’ancrage.', halfway: 'Moitié.', lastSeconds: 'Contrôle le retour.', completed: 'Dos actif.' }
  },
  {
    id: 'sit_to_stand',
    name: 'Assis-debout',
    family: 'legs',
    level: 'starter',
    goals: ['jambes', 'reprise progressive'],
    muscles: ['quadriceps', 'fessiers'],
    media: { onlineVideoUrl: `${videoBase}/sit-to-stand`, videoSourceName: 'Placeholder ResurGo', offlineDiagram: '/assets/exercises/sit_to_stand.svg' },
    description: {
      short: 'Se lever et se rasseoir proprement.',
      benefits: ['Renforce sans impact', 'Mesure le niveau jambes'],
      keyPoints: ['Pieds stables', 'Genoux alignés', 'Descente contrôlée'],
      commonMistakes: ['Genoux vers intérieur', 'Tomber sur la chaise'],
      risks: ['Douleur genou'],
      contraindications: ['Douleur aiguë genou'],
      regression: ['Chaise plus haute'],
      progression: ['Tempo lent']
    },
    replacements: { easier: [], harder: ['split_squat'], equivalent: [], backSensitive: [] },
    prescription: { type: 'reps', defaultSets: 3, defaultReps: 12, side: 'none', restSeconds: 60 },
    voiceCues: { intro: 'Assis-debout.', keyCue: 'Genoux alignés, descente lente.', safetyCue: 'Stop si douleur genou forte.', halfway: 'Mi-série.', lastSeconds: 'Reste propre.', completed: 'Jambes validées.' }
  },
  {
    id: 'split_squat',
    name: 'Fente statique assistée',
    family: 'legs',
    level: 'intermediate',
    goals: ['force fonctionnelle', 'équilibre'],
    muscles: ['quadriceps', 'fessiers', 'mollets'],
    media: { onlineVideoUrl: `${videoBase}/split-squat`, videoSourceName: 'Placeholder ResurGo', offlineDiagram: '/assets/exercises/split_squat.svg' },
    description: {
      short: 'Fente sur place avec support si besoin.',
      benefits: ['Renforce jambe par jambe', 'Améliore stabilité'],
      keyPoints: ['Buste haut', 'Appui stable', 'Amplitude sans douleur'],
      commonMistakes: ['Forcer amplitude', 'Genou instable'],
      risks: ['Genou/tendon'],
      contraindications: ['Douleur tendon qui augmente'],
      regression: ['Amplitude réduite'],
      progression: ['Tempo ou charge légère']
    },
    replacements: { easier: ['sit_to_stand'], harder: [], equivalent: [], backSensitive: ['sit_to_stand'] },
    prescription: { type: 'reps', defaultSets: 2, defaultReps: 8, side: 'both', restSeconds: 60 },
    voiceCues: { intro: 'Fente statique assistée.', keyCue: 'Contrôle et stabilité.', safetyCue: 'Pas de douleur qui augmente.', halfway: 'Change bientôt de côté.', lastSeconds: 'Dernières propres.', completed: 'Très bien.' }
  },
  {
    id: 'hip_flexor_mobility',
    name: 'Mobilité psoas',
    family: 'mobility',
    level: 'starter',
    goals: ['mobilité hanche', 'dos'],
    muscles: ['psoas', 'quadriceps'],
    media: { onlineVideoUrl: `${videoBase}/hip-flexor`, videoSourceName: 'Placeholder ResurGo', offlineDiagram: '/assets/exercises/hip_flexor_mobility.svg' },
    description: {
      short: 'Fente basse douce pour ouvrir la hanche.',
      benefits: ['Réduit raideur hanche', 'Aide la posture'],
      keyPoints: ['Bassin rétroversé', 'Respiration', 'Douceur'],
      commonMistakes: ['Cambrer', 'Forcer'],
      risks: ['Tiraillement excessif'],
      contraindications: ['Douleur vive hanche'],
      regression: ['Position plus haute'],
      progression: ['Bras levé côté étiré']
    },
    replacements: { easier: [], harder: [], equivalent: [], backSensitive: [] },
    prescription: { type: 'time', defaultSets: 2, defaultSeconds: 35, side: 'both', restSeconds: 20 },
    voiceCues: { intro: 'Mobilité psoas.', keyCue: 'Bassin rentré, respiration lente.', safetyCue: 'Ne force jamais.', halfway: 'Respire.', lastSeconds: 'Relâche.', completed: 'Mobilité terminée.' }
  },
  {
    id: 'easy_run',
    name: 'Course facile',
    family: 'cardio',
    level: 'beginner',
    goals: ['endurance', 'perte de poids durable'],
    muscles: ['cardio', 'jambes'],
    media: { onlineVideoUrl: `${videoBase}/easy-run`, videoSourceName: 'Placeholder ResurGo', offlineDiagram: '/assets/exercises/easy_run.svg' },
    description: {
      short: 'Footing en aisance respiratoire.',
      benefits: ['Construit la base', 'Faible intensité durable'],
      keyPoints: ['Tu dois pouvoir parler', 'Foulée souple', 'Arrêt si douleur'],
      commonMistakes: ['Partir trop vite', 'Ignorer les tendons'],
      risks: ['Genou, tendon, dos'],
      contraindications: ['Douleur irradiée ou tendon qui empire'],
      regression: ['Marche-course'],
      progression: ['Ajouter 5 minutes']
    },
    replacements: { easier: [], harder: [], equivalent: [], backSensitive: [] },
    prescription: { type: 'time', defaultSets: 1, defaultSeconds: 1800, side: 'none', restSeconds: 0 },
    voiceCues: { intro: 'Course facile.', keyCue: 'Reste en aisance.', safetyCue: 'Stop si douleur qui descend ou tendon qui augmente.', halfway: 'Mi-parcours.', lastSeconds: 'Retour au calme bientôt.', completed: 'Course terminée.' }
  }
];

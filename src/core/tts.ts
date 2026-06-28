import type { TtsSettings } from './types';

export class CoachVoice {
  private settings: TtsSettings;

  constructor(settings: TtsSettings) {
    this.settings = settings;
  }

  update(settings: TtsSettings) {
    this.settings = settings;
  }

  speak(text: string, priority: 'safety' | 'timer' | 'transition' | 'technique' | 'motivation' = 'transition') {
    const isSafety = priority === 'safety';
    if ((!this.settings.enabled || this.settings.verbosityLevel === 'silent') && !isSafety) return;
    if (!('speechSynthesis' in window)) return;
    if (!isSafety && priority === 'motivation' && this.settings.announceMotivation === 'never') return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.settings.language;
    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;
    const voice = window.speechSynthesis.getVoices().find((item) => item.voiceURI === this.settings.voiceId);
    if (voice) utterance.voice = voice;
    if (isSafety) window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}

export const defaultTtsSettings: TtsSettings = {
  enabled: true,
  language: 'fr-FR',
  voiceId: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  verbosityLevel: 'normal',
  countdownEnabled: true,
  countdownSeconds: 5,
  announceRest: true,
  announceNextExercise: true,
  announceTechnicalCues: true,
  announceMotivation: 'sometimes',
  safetyAlertsAlwaysOn: true,
  repTempoVoice: true,
  announceHalfway: true,
  announceLastSeconds: true
};

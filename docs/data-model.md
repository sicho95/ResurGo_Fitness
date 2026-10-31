# Modèle de données JSON

Export racine :

```json
{
  "exportedAt": "2026-06-28T00:00:00.000Z",
  "schemaVersion": "1.0.0-vanilla",
  "activeProfileId": "profile_x",
  "profiles": [],
  "assessments": [],
  "plans": [],
  "sessionRuns": [],
  "metrics": [],
  "activities": [],
  "exerciseVideos": {},
  "sources": [],
  "settings": {
    "theme": "auto",
    "tts": {},
    "workerUrl": "",
    "workerToken": "",
    "videoBase": "https://musclewiki.com"
  }
}
```

## Profile

```json
{
  "id": "profile_x",
  "name": "Profil principal",
  "gender": "male",
  "age": 40,
  "heightCm": 180,
  "startWeightKg": 100,
  "targetWeightKg": 85,
  "availabilityDays": 3,
  "equipment": "élastique, chaise, tapis",
  "health": {
    "backPain": 1,
    "kneePain": 0,
    "tendonPain": 0,
    "fatigue": 2,
    "irradiating": false,
    "neurological": false
  },
  "levels": {
    "running": "R2",
    "push": "P2",
    "pull": "T1",
    "legs": "J2",
    "frontCore": "G2",
    "sideCore": "L1",
    "mobility": "M2"
  }
}
```

## SessionRun

```json
{
  "id": "run_x",
  "profileId": "profile_x",
  "sessionId": "session_x",
  "exerciseIndex": 0,
  "setIndex": 0,
  "logs": [
    {
      "exerciseId": "dead_bug",
      "set": 1,
      "success": "yes",
      "difficulty": "ok",
      "pain": 0,
      "at": "2026-06-28T00:00:00.000Z"
    }
  ],
  "startedAt": "2026-06-28T00:00:00.000Z",
  "completedAt": null
}
```

## Metric

```json
{
  "id": "metric_x",
  "profileId": "profile_x",
  "source": "manual",
  "measuredAt": "2026-06-28T00:00:00.000Z",
  "weightKg": 100,
  "bodyFatPct": 28,
  "waterPct": 48,
  "bmi": 30.8,
  "boneKg": 3.2,
  "muscleKg": 62,
  "waistCm": 105
}
```

## Activity

```json
{
  "id": "activity_x",
  "profileId": "profile_x",
  "source": "manual",
  "type": "run",
  "startedAt": "2026-06-29T00:00:00.000Z",
  "distanceKm": 5.2,
  "durationSeconds": 2100,
  "avgSpeedKmh": 8.9,
  "hrAvg": 145,
  "hrMax": 171,
  "feeling": 6,
  "pain": 1
}
```

## Exercise Videos

```json
{
  "exerciseVideos": {
    "dead_bug": "https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-dead-bug-side.mp4"
  }
}
```

Les valeurs remplacent l'URL vidéo fournie par défaut pour un exercice. Utiliser de préférence une URL directe `.mp4` pour intégration dans l'app.

## Settings

`settings.theme` accepte `auto`, `dark` ou `light`. `auto` suit le thème système de l'appareil.

## Session Rest

Pendant une séance, `sessionRuns[].mode` peut valoir `work`, `resting` ou `done`. Quand `mode` vaut `resting`, `restNext` indique la prochaine série ou le prochain exercice, mais la reprise reste manuelle.

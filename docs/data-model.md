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
  "sources": [],
  "settings": {}
}
```

## Profile

```json
{
  "id": "profile_x",
  "name": "Damien",
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
  "waistCm": 105
}
```

# Modèle De Données JSON

Export complet :

```json
{
  "schemaVersion": "1.0.0",
  "exportedAt": "2026-06-28T00:00:00.000Z",
  "appSettings": {},
  "profiles": [],
  "exerciseLibrary": [],
  "sessions": [],
  "sessionRuns": [],
  "metrics": [],
  "activities": [],
  "dataSources": [],
  "syncEvents": []
}
```

Principes :

- `profiles` contient objectifs, contexte santé déclaratif, niveaux par domaine et préférences de sources.
- `sessions` contient le plan généré.
- `sessionRuns` contient l’état dynamique sauvegardé après chaque action.
- `metrics` contient poids/composition/mensurations.
- `activities` contient course, marche, renfo, mobilité, cardio.
- `dataSources` décrit manuel, import, Garmin mock/proxy et Apple futur.

Les secrets Worker ne sont pas inclus dans l’export par défaut.

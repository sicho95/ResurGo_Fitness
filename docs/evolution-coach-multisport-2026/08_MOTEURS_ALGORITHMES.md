# Moteurs de calcul et de décision — spécifications algorithmiques

**Statut : PROPOSITION d'implémentation déterministe, à tester.** Les principes de comportement énoncés dans `01_SPEC_FONCTIONNELLE.md` sont confirmés. Aucun coefficient empirique, seuil cardio, prédiction ou durée de récupération n'est validé ici sans données et essais.

## 1. Découpage logique : pipeline à fonctions pures

```text
Incoming SensorSamples
   → validateTimestampAndUnits
   → qualityAndAnomalyFilter
   → metricSourceArbiter
   → continuityAccumulator
   → computeTemporalFeatures
   → estimateTerrainState
   → estimateSportEffortAndConfidence
   → updateActivityPhaseAndPlanDeviation
   → produceCoachCandidates
   → prioritizeSafetyAndCooldowns
   → chooseVoiceAsset
   → output CoachDecision + Snapshot + EventTrace
```

Chaque fonction reçoit des entrées typées, une configuration **versionnée** et un temps courant injecté ; aucune lecture globale du navigateur ou des capteurs dans les fonctions pures. Rejeu identique des mêmes événements = mêmes décisions, sous la même version de configuration.

## 2. Fréquence d'exécution et unités

- Ingérer chaque notification reçue, ne pas supposer que tous les capteurs échantillonnent à la même cadence.
- Construire des snapshots en temps logique régulier ou à événement significatif ; ne pas « bloquer » une boucle sur l'absence de FC.
- Unités internes SI (m, s, m/s, altitude m, Hz si utile, W, bpm) et conversions UI (min/km, km/h, pas/min).
- Le `timestamp` d'acquisition doit être conservé ; une mesure reçue tardivement peut être intégrée à l'historique mais ne peut pas justifier un conseil immédiat comme si elle était actuelle.
- Traiter séparément vitesse instantanée, vitesse lissée, vitesse moyenne, allure de tour et vitesse équivalente terrain plat estimée ; chaque valeur a des champs `source`, `quality` et `derived`.

## 3. Contrôle qualité et score de source

Le rang initial des sources par métrique vient de `02_ARCHITECTURE_TECHNIQUE.md`. Son poids n'est **pas** une loi inconditionnelle.

**Proposition** de qualité qualitative ordonnée :
- `VALID` : fraîche, source reconnue, qualité compatible et cohérente.
- `SUSPECT` : précision faible, dérive, échantillon aberrant, relayage ambigu ou donnée périmée.
- `STALE` : aucun renouvellement au-delà de la politique spécifique capteur.
- `LOST` : déconnectée ou permission retirée.
- `UNKNOWN` : source non caractérisée, pas utilisée pour décisions critiques sans confirmation.

Pour les sources valides, score de sélection proposé :
```text
score(metric, source, now) =
    priorReliability(metric, source)
  + calibrationEvidence(metric, source)
  + signalQuality(metric, source, now)
  + recentConsistency(metric, source)
  - agePenalty(metric, source, now)
  - instabilityPenalty(metric, source)
  - duplicateOriginPenalty(metric, source)
```

Tous les termes sont à calibrer et auditer sur traces, pas à remplir avec nombres arbitraires. Une condition `STALE/LOST` rend la source inadmissible quelle que soit sa réputation.

### Basculement
- Si source favorite passe `STALE/LOST`, choisir immédiatement la meilleure candidate **valide**.
- Si favorite revient, exiger stabilisation et cohérence, puis basculer ; pour éviter l'oscillation, seuil et temporisation différenciés.
- Conserver raison, temps de bascule et mesures de raccordement ; notification seulement si cela affecte le coaching.
- Si toutes sources absentes : métrique `UNAVAILABLE`, aucune substitution silencieuse par zéro/valeur passée.
- Ne pas attribuer un gain de confiance à deux flux issus d'une même origine physique.

## 4. Distance, altitude et pente

### Distance
La distance de séance est **canonique** et ne doit pas régresser pendant une phase active. Elle est intégrée à partir d'incréments valides ou de points GPS cohérents ; la distance brute de chaque source est conservée à titre de référence.

```text
deltaDistance = validateAndClampPhysicalDelta(candidate, previousSample)
canonicalDistance = previousCanonicalDistance + deltaDistance
onSourceSwitch: alignSourceBaselineWithoutRewritingDistance()
```

`validateAndClampPhysicalDelta` ne doit pas imposer de plafond de vitesse universaliste : vélo, sprints, descente, transports, GPS aberrant nécessitent des règles par discipline et qualité. Les arrêts temporaires aux feux ne doivent pas devenir de fausses distances.

### Altitude et D+/D-
Gérer niveau de référence, offset du baromètre, dérive et lissage. `elevationGain` ne cumule que des variations filtrées plausibles. Une bascule baromètre montre → téléphone à un niveau absolu différent ne doit créer ni montée ni descente fictive.

### Pente
`grade = filteredAltitudeChange / filteredHorizontalDistance` sur une fenêtre de distance adéquate, non calculée à chaque saut GPS. Si distance trop faible, vitesse lente ou imprécision excessive : signaler `terrainConfidenceLow` et ne pas changer d'objectif par pente seule.

### Allure corrigée du relief
On peut calculer un indice `gradeAdjustedEffort` ou `equivalentFlatPace`, **estimatif** et dépendant du sport, à apprendre/calibrer ; pas de table naïve 1 % = X secondes pour tous. Ne pas afficher comme allure mesurée.

## 5. Machine de terrain et mémoire de côte

États possibles : `UNKNOWN`, `FLAT`, `CLIMB_APPROACH` (si parcours connu), `CLIMB`, `CREST`, `DESCENT`, `POST_CLIMB_RECOVERY`, `NORMALIZED`.

Transitions fondées sur gradient lissé, durée, distance et confiance, avec hystérésis ; une brusque erreur altimétrique ne doit pas déclencher « sommet atteint ».

### Règles de conduite
- `CLIMB` : remplacer contrôle d'allure plate par contrôle de charge, rappeler raccourcissement naturel des pas, regard quelques mètres devant, progression à petites étapes, souffle normal ; ne pas fixer une cadence, une pose du pied ou une fréquence respiratoire.
- `CREST` : inscrire `climbLoadMemory`, interdire immédiatement consigne « rattrape le temps perdu ».
- `DESCENT` : tenir compte d'accélération naturelle, recommander contrôle et récupération si cela reste compatible avec le terrain ; ne pas présenter une descente rapide comme preuve d'amélioration.
- `POST_CLIMB_RECOVERY` : attente d'une période de régularisation du ressenti et, si disponible, de tendance cardio/puissance ; ne pas exiger que FC revienne à une valeur chiffrée universelle ; les consignes sont prudentes.
- `NORMALIZED` : reprendre les objectifs de phase adaptés progressivement.

`climbLoadMemory` peut être une fonction à décroissance empirique du cumul d'effort, de la longueur/pente de la côte, du contexte sportif et de la réponse observée. Sa forme et ses coefficients sont **À CALIBRER**.

## 6. Intensité et état d'effort selon les données réellement reçues

**GPS seul extérieur** : distance, allure, terrain si altitude suffisamment fiable, changement d'allure, temps, charge externe approximative et ressenti déclaré. Ne pas conclure au niveau cardio ni à la fatigue physiologique exacte.

**GPS + FC** : intégrer la réponse cardio individualisée, dérive possible, retard de FC, stabilité sur périodes comparables et ressenti. Les pics ou FC max de formule sans validation ne fondent pas une consigne risquée.

**FC + puissance vélo** : puissance mesure utile de charge mécanique, FC réponse physiologique ; elles ne sont pas interchangeables. En intérieur, machine fournit au minimum progression valide, watts/cadence selon compatibilité.

**Respiration** : microphone expérimental uniquement après consentement et qualité reconnue ; jamais une entrée requise pour ce moteur.

**Historique** : comparer uniquement des contextes suffisamment proches (sport, durée, terrain, température si connue, type de séance). Différencier mesure directe et indice statistique.

## 7. Modèle d'historique, records et prédictions

Étapes :
1. Mettre en quarantaine les entrées sans date ou provenance fiable ; permettre les enregistrements historiques déclarés avec étiquette « déclaratif ».
2. Conserver records historiques, meilleures performances récentes, séances faciles et répétitions spécifiques séparés.
3. Estimer une fourchette de capacité à la date courante ; ne jamais extrapoler un marathon fiable d'un seul 3 000 m ancien.
4. Calculer projections par combinaison de performance récente, volume et durée soutenable, dérive d'effort, contexte et incertitude.
5. Faire évoluer les paramètres à la suite des entraînements réellement effectués, pas seulement du calendrier prévu.
6. Proposer un nouveau chrono seulement avec explication et possibilité de refus ; une compétition peut avoir plusieurs objectifs mais cela reste une proposition UX.

### Progression
Comparer vitesse à effort comparable et inversement, en ajustant pente et origine du capteur ; absence de cardio signifie une incertitude plus grande. Les jours non enregistrés ne sont pas assimilés à zéro effort si données incompletes. Ne pas tirer de conclusion d'une unique bonne/mauvaise séance.

## 8. Moteur de programme et récupération

Entrées : `profile`, `goal`, `history`, `availability`, `injuryFlags` **déclarés** et `feedback`. Le moteur produit des semaines avec séances, repos, mobilité, renforcement, retours au calme et périodes d'allègement.

```text
for each upcomingDay:
  candidate = proposeSession(goal, periodization, sport)
  candidate = adaptToCompletedLoad(candidate, previousDays)
  candidate = gateOnFeedbackAndSymptoms(candidate)
  candidate = adaptToEquipmentAndAvailability(candidate)
  if candidate unsafeOrUncertain:
      suggestRestOrLowLoadAlternative()
  attachWarmupRecoveryCooldownAndMobilityIfAppropriate()
explainEveryChange()
```

La charge totale intègre endurance + renforcement ; ne pas considérer vélo et course comme charge identique de tissus. Une journée de repos est planifiée positivement. Le signal de douleur ou d'aggravation peut geler la progression et proposer conseil professionnel ; **pas** de prescription de rééducation automatique d'une maladie diagnostiquée.

## 9. Compétition, ravitaillements et stratégie

Événements : `RACE_START`, `SEGMENT_TRANSITION`, `AID_STATION_APPROACH`, `AID_STATION_PASS`, `RACE_FINISH`, `STOP`, `GOAL_REVIEW`.

Prioriser :
1. Sécurité et signes anormaux.
2. Respect d'un effort soutenable et des phases initiales/conservatrices.
3. Gestion des dénivelés, terrain et récupérations.
4. Plans de ravitaillement réellement saisis/testés ; aucune obligation générale de boire/manger sur 10 km ou moins.
5. Gestion de l'avance/retard chrono à distance/temps restant, en ne demandant pas de « rattraper » brutalement dans une descente.
6. Encouragements contextualisés et bilan factuel.

### Saisie ravitaillement
`AidStation` = `raceId`, `distanceM`, `types[]`, `confidence` (annoncé/confirmé), `planUser`, `notes`. La présence d'un ravito ne prouve ni un besoin hydrique ni une disponibilité de glucides. On ne suppose pas un horaire exact si position incertaine.

## 10. Choix d'un message : règles de priorité

```text
function chooseCoachMessage(activity, metrics, model, plan, now):
  if safetyStopOrUrgentConcern(activity): return SafetyCandidate
  candidates = [
     planPhaseTransition(activity),
     effortDeviation(metrics, model, plan),
     terrainAndPostClimb(metrics, model),
     raceAndAidStation(activity, plan),
     positiveSupport(activity, model)
  ]
  candidates = candidates.filter(isGroundedInFreshEvidence)
  candidates = candidates.filter(notContradictingSafetyOrRecovery)
  candidates = candidates.filter(notRepeatedTooRecently)
  candidates = sortByPriorityAndRelevance(candidates)
  return candidates.first ?? SILENCE
```

Choisir `SILENCE` est une décision normale. Exemples d'exclusions : pas de message « accélère » si phase `POST_CLIMB_RECOVERY` ; pas de « cardio parfait » sans FC ; pas de « record » sans comparaison confirmée ; pas de conseils sonores détaillés en danger immédiat.

## 11. Feedback, audit et contrôle humain

Chaque activité conserve :
- les données réellement mesurées et leur provenance ;
- les indicateurs calculés et leur version de règle ;
- les décisions proposées, délivrées, empêchées ;
- le ressenti de l'utilisateur, les changements demandés et événements importants ;
- un bilan valorisant, ainsi que les raisons des conseils.

L'utilisateur doit pouvoir déclarer qu'un conseil était inutile/agaçant, désactiver un type de message, changer de voix ou corriger une séance ; ces retours alimentent les préférences et les paramètres statistiques sans créer un système opaque.

## 12. Tests d'algorithme obligatoires

- Aucune source : pas de valeur inventée ; GPS seul : moteur limité mais fonctionnel extérieur.
- Pente sans FC : guidance de terrain non médicale ; FC sans pente : pas de faux sommet.
- Déconnexion/reconnexion : continuité du temps/distance/D+, pas de messages contradictoires.
- Même montre/ceinture relayées : provenance unique.
- Training planned vs actual : respect jours de récupération, douleur, report de séance.
- Course jour J : ravito signalé, pas de prise universelle, message positif final.
- Contradictions intentionnelles : système priorise sécurité, reporte félicitations si une urgence doit être traitée d'abord.
- Rejeu déterministe : mêmes entrées et version → mêmes décisions, y compris tirage de variante vocale avec graine de sélection stable.

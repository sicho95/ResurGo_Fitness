# Architecture technique cible et moteur de décision

Statut : **PROPOSITION d'architecture** mettant en œuvre les exigences confirmées `01_SPEC_FONCTIONNELLE.md`. Aucune API Garmin, Apple ni Bluetooth n'est considérée disponible sans test réel.

## 1. Principes d'architecture

- Conserver `main` comme source d'application ; `WebApp` est uniquement le build généré, jamais modifié directement.
- Isoler le calcul sportif pur de la présentation (JavaScript testable sans navigateur) ; pas de LLM, ni moteur distant nécessaire.
- Garder PWA pour profils/plans/analyses, et introduire **compagnon iOS natif** pour capteurs, séance écran verrouillé, HealthKit, connexion BLE et audio. watchOS constitue un composant séparé.
- Conserver IndexedDB offline-first et les exports multi-profils ; nouveau schéma versionné avec migration non destructive.
- Unification par événements immuables, horodatés et liés à une `activityId` canonique.
- Adapter les algorithmes de dépense/charge à la discipline ; « moteur commun » signifie règles de supervision et interface, pas équations physiques universelles.

## 2. Découpage cible (ne pas créer avant validation)

```text
app/
  endurance/
    domain/{activity,goals,plan,recovery,session,records}
    sensors/{interfaces,registry,source-policy,quality,continuity,bt-profiles}
    analysis/{windows,grade,terrain,effort,load,form,confidence}
    coaching/{policy,events,selection,voice-catalog,race,feedback}
    infra/{storage,migrations,export,trace,replay}
    ui/{today,plan,live,history,settings}
native/
  ios/       # GPS background, BLE Central, AVAudioSession, HealthKit, Watch bridge
  watchos/   # workout local, mirroring, audio/haptics, cache vocal
  android/   # futur, non requis pour la première livraison iOS
docs/evolution-coach-multisport-2026/
tests/endurance/{unit,integration,replay,fixtures,regression}
```

**CONTRAINTE BUILD** : `scripts/build-static.mjs` possède actuellement `appBuildOrder` codé en dur ; tout nouveau module doit être explicitement ajouté à l'ordre de compilation ou faire l'objet d'une refonte du bundling couverte par tests de non-régression. Ne pas simplement créer un dossier en supposant qu'il sera chargé.

## 3. Contrats de données

**`SensorSample`** — une mesure atomique, jamais une simple valeur nue :

```json
{
  "schemaVersion": 2,
  "activityId": "activity_uuid",
  "sensorId": "sensor_unique",
  "physicalOriginId": "hrmproplus_001",
  "transportPath": ["ble", "iphone"],
  "metric": "heart_rate_bpm",
  "value": 149,
  "unit": "bpm",
  "measuredAt": "2026-10-30T12:00:01.400Z",
  "receivedAt": "2026-10-30T12:00:01.700Z",
  "accuracy": null,
  "quality": {"status": "valid", "confidence": null, "flags": []},
  "calibrationRef": null,
  "provenance": "direct"
}
```

Champs distincts : temps de **mesure** vs temps de **réception** ; support de trames retardées, de réordonnancement et d'un décalage d'horloge déterminé. Provenance directe/relayée/dérivée. Ne pas copier une précision de GPS à un signal cardio.

**`LiveActivity`** inclut `activityId`, `profileId`, `sport` (`run_outdoor`, `bike_outdoor`, `run_treadmill`, `run_elliptical`, `bike_indoor`), `status`, `recordingOwner`, `startedAt`, `pausedMs`, `sampleRefs`, `sourceSelections`, `planRef`, `routeRef`, `alerts`, `coachEvents`, `distances`, `lastCheckpoint`, `endReason`. Les entrées sont append-only autant que possible, agrégats reconstruisibles.

**`MetricSelection`** : `metric`, `chosenSource`, `candidates`, `lastValidAt`, `confidence`, `selectionReason`, `switchCount`, `alignmentOffset`. Ne pas enregistrer un champ « 0 » quand la mesure n'existe pas.

**`CoachDecision`** : `at`, `intent`, `priority`, `evidence[]` (références temporelles), `rulesTriggered[]`, `stateSnapshot`, `confidence`, `reasonCode`, `phraseId`, `suppressedReason` si non parlé, `deliveredTo`, `playedAt`.

**`TrainingRecord`** : distance, durée, date, course/entraînement, profil et provenance ; record personnel à confirmer. Les données historiques et estimées sont stockées séparément.

## 4. Registry de capteurs et compatibilité

Un `SensorAdapter` propose : `discover`, `connect`, `capabilities`, `startStream`, `stopStream`, `disconnect`, `health` et `onSample` ; aucune logique métier dans l'adaptateur. Un `DeviceDescriptor` identifie protocole, fabricant, modèle, firmware si disponible, transport, fonctionnalités vérifiées, permissions et limites de fréquence.

Adaptateurs envisagés :
- `PhoneLocation` : GPS et altitude/baromètre si API native disponible.
- `BleHeartRate` : service Heart Rate 0x180D, mesure 0x2A37.
- `BleCyclingPower` : Cycling Power Service ; vélos.
- `BleCyclingCadenceSpeed` : CSC.
- `BleFitnessMachine` : FTMS 0x1826 ; tapis, vélo, elliptique selon fonctions annoncées et mesures réellement reçues.
- `AppleWorkoutMirroring` : app ResurGo watchOS, HealthKit session, communication bidirectionnelle.
- `GarminBroadcast` : FC émise en BLE, ou protocole standard vérifié, non pas données complètes présumées.
- `GarminConnectIQField` : adaptateur expérimental pour recevoir activité Garmin si diffusion sans app Garmin impossible.
- `ExternalSensor` : capteurs de foulée, fréquence de pas, puissance et cadence avec reconnaissance explicite des profils standard/propriétaires.

La connexion à une **machine intérieure** doit annoncer son type et transmettre des mesures exploitables, pas seulement annoncer le service FTMS. Le mode lecture seule est l'objectif initial : ne pas piloter la résistance/vitesse automatiquement.

## 5. Hiérarchie initiale des sources, par type de mesure

Ordre **CONFIRMÉ en principe**, révisable par santé du signal :
- FC : ceinture thoracique directe > montre > machine (si réellement diffusée).
- GPS/position extérieure : montre dont le flux est disponible > téléphone.
- Vitesse/distance extérieures : source sportive montre > téléphone ; source spécifique de foulée calibrée peut surpasser GPS pour allure instantanée **PROPOSITION à valider**.
- Altitude : montre avec baromètre valide > téléphone baromètre valide > GPS altimétrique filtré.
- Course cadence/foulée : capteur de foulée compatible > montre > estimation téléphone ; utiliser seulement métriques disponibles.
- Vélo puissance : capteur de puissance dédié > machine en intérieur ; autres estimations étiquetées « estimé ».
- Vélo cadence : capteur dédié > machine > montre si mesure pertinente.
- Intérieur vitesse/distance/progression : machine BLE active obligatoire ; d'autres capteurs affinent, pas de repli en coaching intérieur fondé seulement sur cardio ou temps.

Critères du `SourceArbiter` : (a) capacité pour la métrique, (b) fraîcheur mesurée, (c) disponibilité, (d) qualité intrinsèque, (e) précision signalée, (f) cohérence physique, (g) calibration, (h) stabilité, (i) identité physique/provenance. Une source réputée moins précise mais valide surpasse une source favorite périmée/invalide.

**Hystérésis proposée**, seuils *non validés* : détection de source périmée selon cadence normale du capteur ; secours immédiat si flux inexploitable ; retour à la source favorite après séquence de mesures cohérentes stables ; fenêtre initiale de 10–15 s à tester, différente pour GPS/FC/cadence.

## 6. Continuité et fusion

- Ne pas fusionner deux FC qui proviennent en réalité d'une même HRM-Pro Plus relayée par la montre et reçue directement en BLE : enregistrer `physicalOriginId` / `transportPath`.
- GPS : choisir une trajectoire active ; au changement, calculer distance incrémentale valide et recalage de compteur ; jamais transférer naïvement la distance cumulée brute d'une autre source.
- Altitude : gérer offset initial, dérive barométrique et filtres ; D+/D− uniquement sur changements réalistes ; changement de source sans gain d'altitude fictif.
- Allure : distinguer allure instantanée, lissée sur fenêtre et allure du tour ; la voix utilise une valeur stable adaptée au contexte, pas un pic GPS.
- Durée active : temps monotone rattaché à la machine maîtresse, pause exclue du chrono actif selon sport ; consigner corrections d'horloge ; jamais recomposer du temps de course en recopiant deux activités.
- Connectivité : pas de rétro-calcul sur un paquet GPS périmé ; ne pas tenter de « reconstituer » une fréquence cardiaque si flux perdu ; affichage « indisponible ».
- Raccrochage : journaliser le basculement et, si approprié, prévenir sans bavardage inutile.

## 7. Machine d'états de la séance

```text
IDLE → PREFLIGHT → READY → RECORDING ↔ PAUSED
                           ↘ DEGRADED ↗
                  RECORDING → FINISHING → SAVED
                        ↘ ABORTED (avec bilan/raison)
PREFLIGHT → BLOCKED si intérieur sans machine/données de progression
```

Les états doivent être pilotés par une autorité explicite :
- Apple Watch mode ResurGo : la séance watchOS est propriétaire de son enregistrement ; iPhone miroir, gestion de reprise et fermeture coordonnées selon API Apple.
- Garmin natif : la séance Garmin est maître, ResurGo reçoit les changements disponibles ; si le flux d'état n'est pas accessible, synchronisation au départ depuis ResurGo reste une dégradation **À TESTER**.
- Téléphone seul : ResurGo iPhone maître.
- Une seule activité canonique ; le couple montre/téléphone ne double pas l'entraînement dans les statistiques.
- Une activité intérieure passe en `DEGRADED` à la perte des métriques machine ; le coach cesse les consignes d'allure/distance fondées sur ces mesures. Le sort du chrono et la reprise automatique restent **QUESTION À DAMIEN**.

## 8. Calcul et prédiction sans LLM

Pipeline déterministe, chaque étape testable :
1. Ingestion horodatée ; rejet anomalies/doublons ; évaluation qualité.
2. `SourceArbiter` par métrique ; raccordement.
3. Extraction d'indicateurs temporels (fenêtres courtes, moyennes, longues, configurables), tendance FC/vitesse/cadence/pente ; charge par phase.
4. Modèle terrain : pente lissée, vitesse corrigée par grade **estimative**, côte persistante, sommet, descente, récupération post-côte. Ne pas interpréter la pente uniquement à partir d'une position verticale instable.
5. Modèle d'effort propre au sport : course (allure, temps, FC si présente, altitude) ; vélo (puissance si disponible, FC, terrain, cadence) ; intérieur (métriques de machine).
6. Modèle d'historique : plus de poids aux observations comparables et récentes, sans effacer les records ; tendances plutôt que prescriptions rigides.
7. Génération de `CoachCandidate` : respecter séance, préserver effort, rappeler ravitaillement, aider mentalement, signaler transition, avertir danger.
8. Arbitration : priorité sécurité > consigne de séance > terrain/récupération > informations > encouragement ; délais anti-répétition et exclusions mutuelles.
9. Phrase choisie depuis catalogue stable avec intonation et périphérique audio ; accusé de lecture.
10. Persistance décision, explication et indicateurs, puis résumé post-séance.

**Important :** la forme actuelle n'est jamais connue parfaitement à partir d'une FC ou d'un GPS. Exposer un score/intervalle de confiance plutôt que traiter une prédiction comme mesure. Les seuils individuels ne doivent pas se baser aveuglément sur une FC max arbitraire (la fonction `hrZones` actuelle utilise par défaut 190 si absent : à corriger dans la migration).

## 9. Terrain et récupération post-côte

Machine de phases : `FLAT`, `CLIMB_APPROACH`, `CLIMB`, `CREST`, `DESCENT`, `POST_CLIMB_RECOVERY`, `NORMALIZED` (proposition). La transition utilise pente mesurée/filtrée, charge cumulée, durée et confiance ; pas de changement violent d'une phase à la suivante.

Comportements :
- En montée : conserver un effort compatible avec le plan, regarder quelques mètres devant (obstacles), étapes courtes, foulée plus courte si naturel, souffle confortable.
- En haut : ne pas ordonner d'accélération pour retrouver instantanément l'allure planifiée.
- En descente : détecter gain de vitesse attendu sans supposer une récupération totale, éviter poussée inutile et vitesse dangereuse.
- Au retour au plat : laisser se stabiliser l'effort et réévaluer ensuite.
- Mémoire d'effort après côte même si pente revenue à zéro, plus importante après montée prolongée.
- Si tracé/altitude préchargés fiables, anticiper relief à venir ; sinon réaction uniquement aux observations.

## 10. Audio et voix

`VoiceCatalog` : version, locale, voiceId, sex/timbre, style/émotion, phraseId, intention, conditions, langue, durée, audioAsset, checksums, texte de repli. Voix masculine/féminine indépendantes du sexe du coureur. Assets locaux, pré-générés, avec ton authentique et constante identité, petits segments numériques maîtrisés.

`VoiceScheduler` : file de priorité, interruption d'annonce si risque, cooldowns, impossibilité de parler de deux données incompatibles, test de sortie audio, événements d'appel, mode silence/vibreur et volume. iOS `AVAudioSession` mix/ducking pour musique externe, sous restrictions OS/app ; watchOS stockage local et lecture durant séance active ; essais sur véritables AirPods/casques.

## 11. Plateformes

### iPhone / PWA
- PWA : plans, historiques, profils, tableau de bord, statistiques et réglages.
- iOS native : GPS arrière-plan avec autorisation, BLE Central, éventuellement BLE Peripheral **expérimental**, traitement du verrouillage, audio, HealthKit et échanges avec watchOS. Ne pas prétendre que Safari/PWA peut remplacer tous les modes d'exécution natifs.
- Une décision technique **À VALIDER** : Capacitor/bridge natif ou application SwiftUI avec logique JS partagée ; interfaces/types définis avant choix.

### Apple Watch
- Une application ResurGo watchOS utilise `HKWorkoutSession`, `HKLiveWorkoutBuilder` et Workout Mirroring pour données et commandes bidirectionnelles.
- Une séance démarrée dans l'app Exercice native Apple n'est **pas** supposée accessible librement en temps réel.
- Lecture de courts clips et haptique dans une séance active ; haut-parleur watchOS seulement si matériel/OS le permet et mode audio valide.
- En cas de perte téléphone : la séance watchOS doit rester fiable et poursuivre un coaching local simplifié **PROPOSITION**, stockage/rattrapage ultérieur.

### Garmin
- La montre Enduro 2 et toute Garmin compatible restent maîtresses de leurs séances natives.
- Tester réception HRM-Pro Plus BLE directe ; diffusion FC montre possible avec option activée selon modèle.
- **À TESTER** : émulation d'équipement/profil BLE avec liaison dans le bon sens ; « Extended Display » ou ANT+ ne sont pas automatiquement disponibles via Bluetooth iOS.
- **À TESTER** : champ de données Connect IQ et communication vers compagnon iPhone ; compatibilité modèles/fréquence/background non garanties. L'accès au Garmin Health SDK commercial n'est pas requis comme socle.
- La liaison Garmin Connect post-séance ne sert pas de flux temps réel ; elle pourra fournir un import différé après autorisation.

## 12. Données, protection et migration

- Tables/collections additives : `records`, `trainingGoals`, `trainingBlocks`, `recoveryEntries`, `deviceRegistry`, `sensorSamples`, `liveActivities`, `coachDecisions`, `routeProfiles`, `fuelPlan`, `voiceSettings`, `dataConsents` ; schéma, révisions et tests de migration.
- Migration depuis `schemaVersion=1.0.0-vanilla` sans perte de `profiles`, `assessments`, `plans`, `sessionRuns`, `metrics`, `activities` et anciens réglages ; anciens exports toujours importables.
- Références d'activité uniques et stratégie de réconciliation Garmin/HealthKit/export pour empêcher doublons.
- Données physiologiques locales par défaut ; consentements précis pour Apple Santé, microphone expérimental et synchronisation distante ; permissions révocables.
- Éviter stockage de données brutes micro sauf consentement explicite spécifique, limité dans le temps ; module respiratoire inactif par défaut.
- Télémétrie de fonctionnement anonymisée uniquement si acceptée ; secrets et tokens jamais en source publique.
- Export/effacement des données du profil sans toucher à celles des autres profils.

## 13. Architecture de synchronisation multi-appareils (actualisation)

- **CONFIRMÉ** : synchronisation automatique multi-appareils demandée dès le premier lot ; offline-first demeure non négociable.
- **PROPOSITION privilégiée** : backend Docker sur NAS QNAP, indépendant d'AlphaTerminal, inspiré de son pattern Python/FastAPI + SQLite WAL, authentification par appareil, appairage, journal de mutations, révisions par entité, conflits non destructifs.
- **CONTRAINTE PWA iOS** : synchronisation sur ouverture/retour premier plan/activité ; ne pas promettre un cron d'arrière-plan PWA fermée. App native et watchOS peuvent s'appuyer sur mécanismes OS séparés à tester.
- **BLOCAGE de sécurité** : le Worker Cloudflare actuel ne réalise que push/pull de snapshots sans gestion de conflits et accepte les requêtes si token partagé absent ; ne pas le considérer comme serveur de sync automatique prêt pour données réelles.
- Les détails de contrats, procédures de pairing, politiques de convergence, sauvegardes, Tailscale Serve vs Funnel et recette sont définis dans `10_SYNCHRONISATION_NAS.md`.
- **Audit réel NAS** toujours nécessaire avant installation : aucune modification de conteneurs existants n'est couverte par cette documentation.

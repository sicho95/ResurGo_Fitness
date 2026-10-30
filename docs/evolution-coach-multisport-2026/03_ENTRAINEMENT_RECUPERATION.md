# Moteur de planification, récupération, mobilité et prévention des surcharges

Statut : périmètre produit **CONFIRMÉ** ; algorithmes et dosages spécifiques **PROPOSÉS/À VALIDER**. Ce document définit la logique d'application et ne constitue pas un protocole médical personnalisé.

## 1. Point de départ : l'entraînement ne se limite pas aux kilomètres

Chaque plan doit comporter une charge totale cohérente avec :
- les entraînements d'endurance, musculation/renforcement, mobilité, séances spécifiques et activités quotidiennes saisies ;
- la récupération **passive** (repos), **active** (marche facile, pédalage facile, mobilité douce si adaptée), **intra-séance** (intervalle entre répétitions), et la récupération **post-séance** ;
- la tolérance réelle rapportée par le sportif, l'historique, le sommeil/fatigue si disponible et les douleurs ;
- les contraintes d'agenda, événements, compétitions et surfaces/terrains, et la variabilité du matériel.

**À NE PAS FAIRE :** déduire qu'une tendinopathie rotulienne ou une douleur de voûte plantaire est causée par un défaut d'étirements. Un problème de surcharge tendineuse est multifactoriel. La récupération et la gestion progressive de la charge sont importantes ; les étirements n'ont pas, seuls, une efficacité préventive ou curative universellement démontrée.

## 2. Modèle des séances et du calendrier

```json
{
  "trainingWeek": {
    "weekId": "week_uuid",
    "profileId": "profile_uuid",
    "sportGoals": ["running-5k"],
    "availableDays": ["tue", "thu", "sat"],
    "sessions": [
      {"id":"a","type":"run_easy","day":"tue","durationMin":30,
       "phases":["warmup","main","cooldown","mobility_optional"],
       "intensity": {"basis":"RPE","target":"easy"}},
      {"id":"b","type":"active_recovery","day":"wed","durationMin":null,
       "intensity":{"basis":"RPE","target":"very_easy"}}
    ],
    "recoveryConstraints": [],
    "generatedAt": "2026-10-30T00:00:00Z",
    "policyVersion": "draft"
  }
}
```

Les valeurs de cet exemple sont fictives, non des obligations. Les jours de repos, journées de récupération active et journées de renforcement apparaissent explicitement dans le calendrier, même si la durée n'est pas renseignée.

**Types d'objets à distinguer** :
- `rest_day` : pas de séance sportive chargée imposée ; activité habituelle libre si compatible.
- `active_recovery` : effort très facile, optionnel, avec possibilité de substitution par repos complet.
- `warmup` : échauffement général progressif + mouvements dynamiques ciblés.
- `run_easy` / `bike_easy` : développement aérobie adapté ; pas « cardio élevé pour brûler davantage ».
- `interval_session` : efforts / récupérations programmées, type repos marche ou footing.
- `long_session` : durée selon niveau et objectif, avec adaptation de terrain/ravitaillement.
- `strength_session` : jambes/tronc/hanche/pied/haut du corps selon programme et tolérance.
- `mobility_session` : amplitude active, coordination, souplesse optionnelle adaptée.
- `cooldown` : diminution progressive de l'intensité puis bilan.
- `rehab_support` : module d'exercices uniquement s'il est autorisé par professionnel ou contenu général approprié, jamais diagnostic autonome.

## 3. Génération de plan : entrées, décisions, sorties

### Entrées
`Profile` : expérience, âge si connu, corpulence si utile, disponibilité, sport, objectifs, matériel, records datés, historique réel, ressenti, état douloureux volontairement décrit, contraintes d'activité et autorisations ; aucun record obligatoire.

`Goal` : finir / chrono, distance et date facultative ; activité régulière, reprise ou objectif d'activité dans cadre de gestion de poids ; préparation d'une course avec profil de terrain et stations.

`History` : durée et volume de sorties, intensité perçue, sessions réussies/écourtées, sommeil/fatigue si partagé, dynamique de récupération à 24–48 h lorsque disponible, douleur/irritabilité, arrêts précédents, cardio/power/cadence si disponibles.

### Transformation déterministe proposée
1. Classer le niveau de départ à partir des données déclarées et observées ; si incertain, choisir une entrée plus prudente et un premier test progressif non maximal.
2. Estimer une **charge tolérable**, non un taux d'augmentation universel. Utiliser durée, fréquence, difficulté, historique récent et état de récupération ; séparer volumes course et vélo.
3. Prévoir les blocs de base, développement, spécifique, affûtage et récupération selon la distance/expérience ; pas de durée de phase imposée à tout le monde.
4. Disposer les séances difficiles en tenant compte des charges des jambes, de la fatigue et des jours disponibles ; mettre le repos et la mobilité dans le plan dès le départ.
5. Construire chacune avec échauffement, bloc principal, repos entre répétitions, retour au calme et **mobilité/renforcement pertinent** ; adapter à la personne.
6. Évaluer la faisabilité du plan ; si séances manquées ou douleur aggravée, redéfinir la suite plutôt qu'empiler les séances reportées.
7. Après activité : comparer objectif réalisé, ressenti, symptômes et tendances ; actualiser les hypothèses et recommander une adaptation motivée.
8. Produire une explication courte : « sortie facile réduite car fatigue signalée », « séance de force décalée car charge précédente encore mal tolérée », etc.

### Priorité des contraintes
Sécurité/symptômes > repos et contraintes médicales signalées > matériel/sports disponibles > progressivité > objectifs sportifs. Un objectif de date/chrono ne contourne pas les protections.

## 4. Repos et récupération active : règles de coaching

### Repos complet
Une journée de repos n'est pas un échec ou une séance « perdue ». Le moteur ne cherche pas à compenser automatiquement. Pas de notification culpabilisante ; possibilité de valider « journée de récupération respectée » et de suivre la régularité de récupération.

### Récupération active
Proposer, si approprié, une marche facile, un vélo très léger ou une mobilité douce ; le coureur peut choisir repos complet. Ne jamais rendre la récupération active obligatoire, surtout si symptômes aggravés.

### Entre efforts de fractionné
Séquences `work`/`recovery`/`work` avec durée/transition déclenchées depuis l'autorité de séance ; repos marchant, trottiné, pédalage facile ou immobile selon sport/programme. Indiquer quand reprendre et proposer une prolongation manuelle si tolérance insuffisante. La récupération « dynamique » n'est pas nécessairement optimale pour tous les objectifs.

### Récupération immédiate post-course
Conseiller la diminution progressive d'intensité si sûre, la marche lente, l'hydratation selon besoin, puis bilan et éventuel protocole d'assouplissements non douloureux. Ne pas forcer d'étirement agressif sur tissu douloureux/fatigué. Le coach félicite toujours, même après un arrêt prudent.

## 5. Échauffement et mobilisation

Avant une course/séance intense : mise en mouvement progressive et spécifique, par exemple marche/trot facile, mobilité active des chevilles et des hanches, quelques mouvements dynamiques et progressions compatibles avec niveau. Le volume exact n'est pas fixé dans cette spécification.

La phase d'échauffement est indispensable à la **structure logique** d'une séance intense, mais son dosage dépend de l'activité et du sportif. Les étirements statiques longs immédiatement avant un effort intense ne doivent pas être imposés comme passage obligé. L'existence d'une séance de mobilité séparée n'annule pas l'échauffement.

Un utilisateur de vélo peut avoir des mouvements spécifiques, tandis que pour l'elliptique la phase de montée en charge se fait avec résistance/intensité faible si machine pilotable manuellement.

## 6. Bibliothèque de mobilité, étirements et renforcement

### Catalogue minimum souhaité

Chaque fiche doit posséder : `exerciseId`, zone(s), objectif, matériel, instructions par étapes, durée/répétitions **à valider**, alternatives plus faciles, phase permise (échauffement, post-séance, jour de repos), contre-indications générales, douleur de référence, niveau, illustration/animation offline et statut clinique de validation. Aucun mouvement ne doit être rendu obligatoire à tous.

| Zone / groupe | Exemples de familles d'exercices à documenter | Précautions |
|---|---|---|
| Fléchisseurs de hanche, psoas-iliaque | Mobilité de hanche, étirement doux du fléchisseur de hanche en position adaptée | Ne pas cambrer excessivement le bas du dos |
| Chaîne antérieure | Mobilité hanche/quadriceps/torse, extension douce adaptée | Dissocier l'étirement de la compression douloureuse du genou |
| Quadriceps | Mobilité contrôlée, étirement sans forcer, charge musculaire progressive | Prudence douleur antérieure du genou ; une tendinopathie demande gestion de charge |
| Chaîne postérieure | Ischio-jambiers, fessiers, mobilité de hanche | Éviter tension agressive ou douleur nerveuse irradiée |
| Mollet/gastrocnémien | Mobilité cheville, étirement genou tendu adapté, exercices de force du mollet | Ne pas confondre douleur d'effort et douleur tendineuse |
| Soléaire | Mobilité/étirement genou fléchi, renforcement contrôlé | Dosage individualisé |
| Voûte plantaire/aponévrose | Étirement spécifique fascia plantaire, mobilité orteils/cheville, force muscles intrinsèques du pied | Ne pas reproduire ou accentuer douleur au talon |
| Dos/tronc | Mobilité douce de hanche/rachis, respiration normale, gainage progressif selon tolérance | Éviter flexions/rotations imposées en cas de symptômes lombaires/neurologiques |
| Pied/cheville | Proprioception, force, contrôle cheville, appui | Tenir compte des surfaces et chaussures |
| Hanches/fessiers | Renforcement progressif, stabilité du bassin | Adapter à la tolérance et charge course/vélo |

**Important** : cette table est un **cahier des besoins de bibliothèque** ; elle ne constitue pas une ordonnance ni des séries/durations cliniques. Les exercices douloureux, contre-indiqués ou inadaptés au cas individuel doivent être retirés ou modifiés.

### Fiches enrichies

Ajouter à la bibliothèque actuelle :
- Nature : mobilité dynamique / souplesse statique / force / proprioception / renforcement pied/cheville / retour au calme.
- Effet recherché et niveau de preuve ; éviter « empêche la tendinite » ou « soigne la fasciite » sans nuance.
- Modalités alternatives (assis, debout, sol), déroulement avec vidéo offline si disponible, zones musculaires, feedback utilisateur.
- Position tolérée et gestes d'arrêt, une description accessible pour malvoyants.
- Séances adaptées par sport ; tenir compte d'une aggravation des douleurs au cours ou au lendemain.

## 7. Tendon rotulien / douleur plantaire : règles spécifiques de sécurité

La tendinopathie rotulienne est une pathologie de charge ; les recommandations cliniques récentes mettent au premier plan **la progression individualisée du chargement** plutôt que de compter sur les étirements seuls. Pour la douleur plantaire compatible avec fasciopathie, les recommandations 2023 soutiennent les étirements du fascia et des mollets et le renforcement pied/cheville comme composantes possibles d'une approche multimodale. Une consultation permet de confirmer la cause et d'adapter l'effort.

**Pour ResurGo :**
- Ne jamais inférer un diagnostic à partir d'un questionnaire et ne pas prétendre qu'un manque d'étirements a « causé » une douleur.
- Proposer un suivi volontaire du site, intensité, contexte, évolution et retentissement fonctionnel ; sauvegarde locale privée.
- Interroger, si accepté, la réponse après séance et au lendemain (douleur au réveil/au premier pas, gêne dans les escaliers, raideur, fatigue), sans exiger une réponse chaque fois.
- Si douleur nouvelle, croissante ou persistante : éviter augmentation de volume, vitesse, pente, sauts/impacts et conseiller évaluation adaptée ; interrompre en cas de symptômes inquiétants.
- Le professionnel de santé peut définir les exercices de mise en charge/rééducation et leur progression ; l'application peut les rappeler et enregistrer l'exécution sans remplacer ce professionnel.
- Ne pas prescrire automatiquement des étirements du quadriceps agressifs sur un tendon irritable ni des étirements de voûte plantaire douloureux.
- Suivre le ressenti le jour suivant plutôt que seulement « j'ai réussi la séance » ; différencier fatigue normale et réaction défavorable.
- Les règles de retour à l'activité sont basées sur la tolérance et, si nécessaire, l'avis clinique ; ne pas programmer automatiquement « reprise course » après délai standard.

**Question à Damien :** souhaite-t-il seulement des séances générales de prévention/mobilité, ou aussi pouvoir saisir un programme prescrit par un kinésithérapeute avec ses consignes précises ? Ce point n'est pas arbitré.

## 8. Gestion de la charge et symptômes

Variables proposées : volume endurance, distribution d'intensité, charge de renforcement, douleur par zone, fatigue, contraintes d'agenda, stabilité de récupération. Éviter un score de charge « médical » trompeur ; utiliser indicateurs lisibles et explications.

- État `GREEN` : séance prévue compatible selon données/ressenti disponibles.
- État `AMBER` : données manquantes ou inconfort/fatigue ; proposition de baisse/décalage, demande de ressenti.
- État `RED` : symptômes alarmants ou incapacité déclarée ; ne pas lancer d'effort intensif, arrêt et orientation appropriée.

Ces couleurs et déclencheurs sont des **propositions UX**, non des catégories diagnostiques. Les seuils à utiliser doivent être validés et ne doivent pas transformer des scores de douleur isolés en autorisations médicales.

## 9. Personnalisation selon la distance

- Reprise / 5 km : priorité régularité, progressivité, marche-course, maîtrise des efforts, jours de repos visibles.
- 3 000 m : base aérobie + travail intensif spécifique seulement quand toléré ; davantage d'importance pour vitesse, récupérations et préparation de l'effort soutenu.
- 8/10 km : endurance, seuil et allure spécifique adaptés à niveau ; prévenir dérive de charge.
- 15/20/semi : durée croissante, sorties longues et économie de course ; inclure entraînement à l'alimentation si durée pertinente.
- 30/marathon : tolérance volume, longues sorties progressives, stratégie de ravitaillement, repos/affûtage et risques de surcharge ; aucune longue sortie obligatoire arbitraire.
- Vélo : distribution charge selon temps/FC/puissance si présente, repos dynamique sur faible résistance, travail spécifique côte en watts/cadence lorsque mesuré.

Aucun pourcentage fixe « 80/20 » ni augmentation hebdomadaire « +10 % » ne s'applique universellement ; ce sont éventuellement des repères de conception, à valider selon profil.

## 10. Algorithme de microplanification (pseudocode non exécutable)

```text
function buildWeek(profile, goal, history, symptoms, calendar):
  readiness = inferReadiness(history, symptoms, missingData)
  demand = estimateCurrentTolerance(history, sport)
  sessions = proposeSportSpecificSessions(goal, demand)
  sessions += strengthMobilityCompatible(profile, symptoms)
  slots = placeAroundAvailabilityAndRecovery(sessions, calendar)
  slots += explicitRestAndOptionalActiveRecovery(slots)
  for each slot:
      attachWarmupMainRecoveryCooldown(slot)
      validateLoadAndSafety(slot, symptoms, readiness)
  return Plan(slots, reasons, uncertainty, alternatives)

function afterSession(session, observed, feedback):
  persistObservedAndFeedback()
  if redFlag(feedback): suppressPerformanceEscalation(); adviseAppropriateAction()
  else if worseningSymptoms(): reduceOrPostponeUpcomingLoad()
  else: updatePersonalModelIncrementally()
  preserveRestDaysAndDoNotAutoCatchUpMissedSessions()
```

La charge de travail et les réponses à la douleur seront testées sur des scénarios ; le moteur conserve le choix utilisateur et un droit de pause/report explicite.

## 11. Sécurité et limites du coaching

- Douleur thoracique, malaise, vertiges, essoufflement anormal, faiblesse neurologique ou douleur aiguë importante : arrêt de la recherche de performance et message adapté, avec recours aux services médicaux urgents si indiqué. Jamais d'objectif chrono prioritaire.
- Le coach n'est pas un dispositif médical, ne fournit ni diagnostic ni garantie de prévention de blessure.
- Protection des données : questionnaires et douleurs locaux par défaut, jamais documentés nominativement dans le dépôt GitHub public.
- Les supports d'exercices doivent distinguer conseils sportifs généraux et programmes personnalisés par professionnels.
- L'utilisateur peut cacher les rappels de mobilité ; une séance de compétition ne doit pas être encombrée de questions de rééducation sans pertinence immédiate.

## 12. Sources cliniques utilisées pour cadrer, à réévaluer périodiquement

- JOSPT/APTA, `Heel Pain – Plantar Fasciitis: Revision 2023` : https://doi.org/10.2519/jospt.2023.0303
- Dutch multidisciplinary guideline for patellar tendinopathy (2024/2025) : https://pmc.ncbi.nlm.nih.gov/articles/PMC11792096/
- Review 2026 on structured progressive loading for patellar tendinopathy : https://pmc.ncbi.nlm.nih.gov/articles/PMC13608764/
- Revue clinique sur le rôle de la rééducation progressive : https://bmjopensem.bmj.com/content/7/4/e001110

Ces sources ne doivent pas devenir une validation médicale automatique de protocoles individuels ; l'application reste un coach sportif.

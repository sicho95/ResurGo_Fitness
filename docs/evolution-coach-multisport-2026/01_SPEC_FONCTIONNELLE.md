# Spécification fonctionnelle — ResurGo Endurance & Coach

Statut : **CONFIRMÉ** sauf mentions contraires. Référence : `00_INDEX.md`.

## 1. Profils, démarrage et historique

**FON-001** Le premier lancement conserve le profil sportif existant (nom/pseudonyme, âge, sexe si renseigné, taille, poids, disponibilité, niveau, douleurs, restrictions). Aucun capteur ni record ne conditionne l'accès aux activités extérieures.

**FON-002** Onboarding endurance facultatif par utilisateur : sport (course/vélo), pratique actuelle, dernière séance, disponibilité hebdomadaire, environnement habituel, historique de blessures uniquement si volontairement communiqué, objectif, date de course optionnelle, temps disponible, ressenti, matériel associé. Ne pas inventer de valeurs manquantes.

**FON-003** Saisie libre de records par distance (3 000 m / 5 / 8 / 10 / 15 / 20 km / semi / 30 km / marathon), temps, date approximative, terrain, compétition/entraînement, fiabilité, altitude/dénivelé si connu. Record historique ≠ niveau actuel ≠ chrono cible. Une estimation de performance ne peut pas se présenter comme un record.

**FON-004** Reconnaître les séances existantes dans `activities[]`, permettre imports futurs, corriger doublons, ne jamais écraser un historique ni réécrire silencieusement un record confirmé.

**FON-005** Suivre évolution de forme à partir des dernières séances, tendances d'allure à effort comparable, charge et récupération, environnement et terrain. L'algorithme indique une plage d'incertitude lorsque possible. Le sexe, taille et poids servent seulement là où pertinents pour les calculs autorisés ; pas de seuil simpliste de performance fondé sur le sexe.

## 2. Sélection de l'activité

**FON-010** Activités extérieures : course/marche-course et vélo ; GPS téléphone seul suffisant ; montre et capteurs ajoutent des métriques si effectivement reçues.

**FON-011** Activités intérieures : tapis de course, elliptique (famille « course intérieure »), vélo d'intérieur, seulement si connexion Bluetooth d'une machine et réception de données de progression exploitables. Précondition vérifiée AVANT « Démarrer » ; cardio seul et minuterie sans machine ne donnent pas accès au coaching intérieur.

**FON-012** Mesures de progression admissibles en intérieur : données continues de vitesse/distance du tapis ; valeurs pertinentes issues d'un elliptique (cadence, distance, puissance ou autre mesure de progression, à valider selon matériel) ; cadence et puissance/vitesse/résistance selon vélo. **À VALIDER** : ensemble minimal exact de champs par classe de machine. En cas de perte de données, pause du conseil dépendant de ces métriques et affichage « signal perdu ».

**FON-013** Une activité ne peut avoir qu'un seul cycle logique démarrer → pause/reprise → terminer/abandon ; les interfaces téléphone/montre se synchronisent sans créer deux séances.

## 3. Objectifs et planification

**FON-020** Reprise course / retrouver une activité régulière / activité orientée perte de poids durable / préparer un objectif de distance sans chrono / préparer distance avec chrono / entretenir sa forme. Ne pas faire de ResurGo un service de régime alimentaire.

**FON-021** Distances confirmées : 3 000 m, 5, 8, 10, 15, 20, 21,0975, 30, 42,195 km ; potentiel de distances paramétrables : **PROPOSITION**, non requis à ce stade.

**FON-022** En mode chronométrique : saisir temps cible et date si connue ; afficher allure correspondante, faisabilité *estimée* et éventuellement trois stratégies prudente/réaliste/ambitieuse (**PROPOSITION**). Ne pas promettre un résultat.

**FON-023** Le plan tient compte des jours disponibles, contraintes de la semaine, historique, spécificité de l'épreuve, fatigue, douleurs, préférences et possibilité de repos. Réévaluation après séance et bilan hebdomadaire ; changements justifiés et visibles.

**FON-024** Types de séances : marche-course, endurance facile, durée/distance libre, fractionné, intervalle en temps/distance, récupération entre répétitions, tempo/seuil, côtes, sortie longue, renforcement, mobilité, repos, récupération active, retour au calme, préparation spécifique et affûtage.

**FON-025** Une séance planifiée comprend : intention, durée/distance, consignes d'intensité, plages personnalisées, échauffement, séquences structurées, récupération entre efforts, retour au calme, suggestions adaptées de mobilité/renforcement. Une séance non accomplie ne doit pas provoquer automatiquement un rattrapage dangereux.

**FON-026** Conserver le programme de reprise sportive, gainage et mobilité actuel ; intégrer les séances endurance à un calendrier commun, en évitant les conflits de charges d'effort (par exemple séance très exigeante juste après lourde sollicitation des jambes). Se référer au document `03_ENTRAINEMENT_RECUPERATION.md`.

## 4. Séance en direct et coaching

**FON-030** Au lancement : vérifier sport/extérieur ou machine intérieure, sources disponibles, GPS et qualité, cardio éventuel, audio, batterie/permissions utiles, programme et plan ; ne pas bloquer l'extérieur pour absence de cardio.

**FON-031** Mesures en direct : durée active, distance, allure/vitesse, altitude/pente, cumul D+/D-, FC si présente, cadence, puissance si présente, phase d'intervalle, régularité et ressenti ponctuel. Signaler origine/fiabilité et valeurs absentes.

**FON-032** Boucle décisionnelle sans LLM. Calcul des tendances sur des fenêtres paramétrables, filtrage des anomalies, comparaison plan/réalité, spécificités de terrain, fatigue estimée et réponse aux séances précédentes. Inutile de parler à chaque mesure.

**FON-033** Chaque conseil comporte : raison, priorité, métriques contributrices, compatibilité avec l'objectif, degré de confiance, expiration, délai anti-répétition et phrase audio. Le coach ne fabrique jamais de diagnostic.

**FON-034** Montée : reconnaître le gradient et la charge résiduelle ; ne pas imposer l'allure du plat ; proposer petits pas / foulée naturellement raccourcie, regard quelques mètres devant pour sécurité, progression pas à pas, relâchement et respiration confortable ; ne pas imposer une pose de pied plate ni une cadence fixe.

**FON-035** Sommet/plat/descente : phase de récupération active, ne pas demander immédiatement un rattrapage du temps perdu ; en descente éviter la suraccélération liée à la gravité, adapter la foulée et l'impact, laisser FC/effort retrouver une tendance soutenable avant éventuelle relance.

**FON-036** Ne pas prendre vitesse accrue en descente pour preuve de forme exceptionnelle, ni vitesse abaissée en côte pour signe de défaillance. Tenir compte de la pente et de la durée d'effort.

**FON-037** Respiration : conseils simples sans estimation inventée ; microphone = module de recherche optionnel explicitement consenti, non activé par défaut. Une baisse du niveau sonore ne prouve pas une apnée. Ne jamais utiliser la détection acoustique seule pour prescrire une intensité.

**FON-038** Si un sportif déclare un essoufflement inhabituel, douleur aiguë, malaise, vertige ou symptômes alarmants, priorité à une consigne de sécurité et à l'arrêt selon gravité, et non à l'objectif chrono. Si capteur absent : dégradation de conseils, pas d'inférence de « FC normale ».

## 5. Compétition et entraînement extérieur

**FON-040** Jour J : choix de course/objectif, parcours GPX facultatif (**PROPOSITION** de format), profil D+ connu ou inconnu, température si donnée disponible, stations de ravitaillement saisies (position kilométrique, catégorie et disponibilité connues), objectifs sans/avec chrono.

**FON-041** Phases : attente, départ, installation, milieu, difficultés, derniers kilomètres/mètres, arrivée/arrêt. Gestion de l'avance/retard à la cible avec plafonnement des sollicitations, cohérence effort/terrain et absence de stratégie agressive par défaut.

**FON-042** Ravitaillements : notifier leur approche, proposer arrêt ou non selon besoin et durée prévisionnelle, tolérance connue, météo et contexte ; ne pas imposer une prise d'eau ou de glucides à chaque point. Les apports énergétiques en course longue doivent être testés pendant la préparation ; pas de nutrition quotidienne ni prescription automatique universelle.

**FON-043** Au terme d'une séance, **toujours** un encouragement sincère adapté : terminé, record confirmé, écart à l'objectif, écourté ou arrêt prudent. Puis proposer récupération, retour au calme et bilan de ressenti. Ne jamais déclarer « terminé » pour un abandon, ni « nouveau record » sans preuve.

## 6. Matériel et choix des sources

**FON-050** HR : ceinture thoracique reçue en direct > montre reçue en direct > machine reçue en direct, sous réserve qualité ; Garmin HRM-Pro Plus peut coexister avec la montre par ANT+ et transmettre FC au téléphone via BLE si disponibilité réelle.

**FON-051** GPS/position/allure/distance extérieurs : montre si données effectivement accessibles et fiables > téléphone, avec possibilité de préférer capteur de foulée calibré pour allure instantanée si démontré. Altitude : baromètre de montre > baromètre téléphone > GPS filtré, selon qualité.

**FON-052** Des périphériques supplémentaires BLE (cadence/foulée/vélo/puissance) enrichissent le modèle ; aucun capteur unique ne devient prérequis pour l'extérieur.

**FON-053** Changement de source quand ajout, coupure, détérioration du signal ; valeur manquante ≠ zéro ; distance et altitude raccordées sans discontinuités ; même source physique relayée par deux appareils ≠ deux témoignages indépendants.

**FON-054** Apple Watch : application ResurGo watchOS + iOS, mesures et commandes bidirectionnelles ; possibilité de lecture locale de consignes sur haut-parleur compatible, sinon écouteurs/téléphone. Garmin : enregistrement maître sur l'activité native ; recherche prioritaire de protocoles standards ou périphérique émulé sans installation ; champ de données Connect IQ seulement si nécessaire et faisable.

## 7. Voix, musique, personnalité

**FON-060** Coaching audio superposé à la musique d'une autre application sans intégration obligatoire Spotify/Deezer/Apple Music. « Ducking » temporaire sur périphériques compatibles, puis volume rétabli ; appels et alertes système prioritaires.

**FON-061** Deux identités vocales stables, homme/femme, **voix naturelles synthétisées et prégénérées par lot**, chaleureuses et encourageantes ; **mémoriser identité, fournisseur/modèle, référence de locuteur/paramètres de prosodie et recettes versionnées** pour pouvoir produire de nouveaux clips avec les mêmes voix. Catalogue de fichiers audio offline avec intonations et variantes pour départ, allure, côte, récupération, rythme, avertissement, hydratation, fractionné, difficulté, arrivée. Rendu des chiffres variables et assemblage testés pour éviter un effet robotique. Aucun rendu audio n'est considéré livré avant génération réelle et validation.

**FON-062** Nombreux encouragements variés, jamais injonctions culpabilisantes ; répétition limitée ; modes de fréquence de parole discret/équilibré/intensif : **PROPOSITION** de paramétrage ; jamais au détriment d'une alerte importante.

**FON-063** Aucun LLM dans la boucle de coaching, pas de synthèse vocale distante au moment de la séance ; voix et messages lisibles hors ligne.

## 8. Fonctionnalités de reprise et récupération existantes

**FON-070** Toute semaine comporte des unités de repos et récupération potentiellement actives, explicitement représentées dans le plan (et non « trous » implicites). Voir `03_ENTRAINEMENT_RECUPERATION.md`.

**FON-071** Mobilité/étirements par zone (fléchisseurs de hanche/psoas-iliaque, chaînes antérieure et postérieure, quadriceps, mollets, dos, plante du pied), accompagnés de précautions, alternatives, ressentis et intégration aux charges du reste de la semaine.

**FON-072** Tendinopathie rotulienne et douleur plantaire/aponévrose : exemples de restrictions à gérer, sans en déduire une cause par manque d'étirements ni donner un traitement médical personnalisé. Des exercices de mise en charge progressive et des adaptations nécessitent une validation clinique selon le cas.

## 9. Hors périmètre à ce stade

- Coaching intérieur sans données machine en direct ; un cardio seul ne suffit pas.
- LLM opérationnel, dépendance internet, abonnements IA imposés.
- Diffusion/stockage par défaut de microphones de respiration ou de données de santé dans le cloud.
- Télécommande automatique de tapis/vélo pour changer vitesse/résistance en direct.
- Modification de la séance native Garmin par ResurGo ; Garmin reste autorité d'enregistrement.
- Imposition universelle d'une cadence de 180 pas/min, d'une respiration comptée ou d'une « technique pied plat ».
- Suppression des fonctions actuelles de renforcement/reprise.

# Plan de réalisation, migration et recette / cahier de tests

**Statut : PROPOSITION de delivery, aucun développement exécuté.**
**Objectif :** permettre ultérieurement une mise à jour importante de ResurGo tout en conservant son cœur de reprise sportive et sans casser le fonctionnement offline.

## 1. Stratégie : spécifier tout le périmètre, intégrer par lots vérifiés

Il est possible de préparer la conception complète avant de développer. **Mais une livraison monolithique sans essais sur matériel réel n'est pas acceptable** : Garmin/BLE, audio verrouillé et Apple Watch exigent des expérimentations contrôlées. L'app ne doit pas promettre des fonctions non éprouvées.

Phases proposées et portes de sortie :
1. **Audit fonctionnel et gel de référence** — exporter profil/historique actuels, relever version, capture état UI, exécuter parcours existants ; établir tests de régression.
2. **Socle des données** — schéma additif, migrations IndexedDB, activité canonique, planification unifiée, adaptateurs simulés, moteur rejouable.
3. **Planification + récupération** — objectifs de distance/chrono, records datés, repos et récupération actifs, bibliothèque mobilité/renforcement, contrôles douleur, réévaluation hebdomadaire.
4. **Acquisition extérieure iPhone + BLE standard** — GPS/background natif, HRM-Pro Plus FC, capteurs standards, classement qualité, secours, continuité; valider sans montre.
5. **Apple Watch** — application watchOS ResurGo HealthKit mirroring, commande bidirectionnelle, audio et haptique, interruption et reconnexion.
6. **Garmin Enduro 2** — essayer protocoles standards sans installation ; si impossible, banc Connect IQ champ de données + iOS ; garder Garmin propriétaire de sa séance, fallback sans la télémétrie native.
7. **FTMS intérieur** — tapis/elliptique/vélo connectés, contrôle de capacités et fonctionnement en coupure ; pas de coach indoor sans machine.
8. **Coaching live et compétition** — terrain/pente, état d'effort, règles d'arbitrage, audio préenregistré, compétition, ravitaillements et félicitations.
9. **Refonte UI iOS native-like** — appliquer design system et revoir navigation sur prototype validé avant bascule, sans suppression de fonctionnalités.
10. **Recette et publication maîtrisées** — builds, tests d'endurance, revue confidentialité, publication, sauvegarde et procédure de rollback.

Il est permis de construire plusieurs lots parallèlement, mais leur **validation finale** reste ordonnée par dépendances (capteurs ⇒ données fiables ⇒ règles ⇒ audio).

## 2. Matrice de tests fonctionnels (Given / When / Then)

### TF-01 : extérieur sans accessoire [FON-010/030]
Given un iPhone avec GPS autorisé, aucune montre/ceinture ; When lancer course extérieure ; Then séance démarre, vitesse/distance viennent du téléphone, FC affichée indisponible, coaching non cardiaque fonctionne, résultat sauvegardé.

### TF-02 : pas de machine intérieure [FON-011]
Given aucune machine diffusant des mesures BLE ; When sélectionner tapis/elliptique/vélo intérieur ; Then le lancement guidé est bloqué avec explication ; aucune vitesse/distance inventée.

### TF-03 : ceinture + montre + machine [FON-050/053]
Given des flux FC valides de ceinture, montre, appareil ; When tous disponibles ; Then FC ceinture retenue ; When ceinture disparaît ; Then montre ; When montre disparaît ; Then appareil ; en log chaque sélection est expliquée.

### TF-04 : source favorite invalide [FON-053]
Given montre GPS prioritaire et iPhone valide ; When précision montre devient mauvaise ; Then iPhone est retenu malgré le rang théorique inférieur. Une reconnexion instable ne génère pas des basculements permanents.

### TF-05 : distance continue [FON-053]
Given Garmin/phone distances cumulées discordantes (exemple fictif : 4,02 vs 3,96 km) ; When bascule ; Then la distance canonique reste monotone et ne saute pas de 60 m.

### TF-06 : altitude continue [FON-035/053]
Given deux altitudes séparées par un offset ; When bascule ; Then aucun D+ artificiel, gradients et message de récupération restent cohérents.

### TF-07 : FC relayée [FON-053]
Given une même ceinture reçue directement et relayée par une montre ; When les deux valeurs arrivent ; Then une seule origine physique, pas deux confirmations indépendantes.

### TF-08 : marche/course et intervalles [FON-024/025]
Given plan alternance effort/récupération ; When étapes s'achèvent ; Then la bonne consigne et le bon compte à rebours sont lus sans chevauchement ni perte d'état pause.

### TF-09 : côte et descente [FON-034/036]
Given GPX/trace synthétique comprenant montée, sommet, descente et plat ; When allure baisse en montée puis augmente en descente ; Then pas de reproche de lenteur ni relance brutale ; récupération conseillée, réévaluation après stabilisation ; une FC manquante ne bloque pas le terrain.

### TF-10 : Apple Watch bidirectionnelle [FON-054]
Given app ResurGo watchOS et iOS compagnons ; When démarrage, pause, reprise, fin depuis montre ; Then état unifié, données reçues au téléphone, commande inverse selon contraintes de session Apple ; une seule activité conservée. Test avec écran iPhone verrouillé.

### TF-11 : Garmin native en maître [FON-054]
Given séance Course Garmin démarrée sur Enduro 2 ; When liaison candidate testée ; Then données et événements réellement disponibles remontent, sans modifier la séance Garmin ; si non disponible, pas de fausse indication « connecté en direct », fallback téléphone.

### TF-12 : capteur BLE supplémentaire [FON-052]
Given capteur de puissance ou cadence compatible ajouté en cours de séance ; When messages valides ; Then nouvelle métrique enrichit le coach sans couper GPS/FC ; suppression du capteur ne détruit pas séance.

### TF-13 : HRM-Pro Plus multi-connexion [FON-050]
Given ceinture ANT+ vers Garmin et BLE vers iPhone ; When course native active ; Then FC directe côté téléphone, course Garmin enregistrée, la donnée dupliquée n'est pas double-comptée. Mesurer interférences/pertes.

### TF-14 : machine FTMS [FON-011]
Given tapis/elliptique/vélo **réellement** compatible ; When connexion et réception de mesures continues ; Then les métriques de progression spécifiques à cette classe sont utilisées. Débrancher : plus de conseil de vitesse/distance tant que non reconnecté.

### TF-15 : voix et musique [FON-060]
Given musique Spotify/Apple Music/Deezer via application tierce ; When coach parle ; Then voix intelligible, musique abaissée si OS le permet, revenue ensuite, pas de double consigne. Tester interruptions appels, notifications et casque déconnecté.

### TF-16 : sortie haut-parleur Apple Watch [FON-054/061]
Given matériel/watchOS supportés, séance ResurGo watchOS active ; When message reçu depuis iPhone ; Then clip embarqué joué localement, sans écouteurs, et non émission artificielle de son iPhone vers watchOS ; sinon repli clair.

### TF-17 : progrès et records [FON-003/005]
Given records historiques anciens et séances récentes plus lentes ; When plan proposé ; Then niveau actuel distinct des records historiques ; projections marquées « estimées » ; progression observée actualise les tendances.

### TF-18 : programme et repos [FON-023/026/070]
Given semaine avec force jambes, endurance et séance exigeante ; When générateur planifie ; Then repos/actif visibles, charges non superposées aveuglément ; report d'une séance ne provoque pas de rattrapage destructeur.

### TF-19 : douleurs [FON-071/072]
Given douleur signalée s'aggravant au lendemain ; When prochaine semaine calculée ; Then progression d'intensité non forcée, proposition adaptée ou avis professionnel ; aucune affirmation « tendinite due aux étirements manqués ».

### TF-20 : distances et ravitaillements [FON-040/042]
Given course de 10 km avec ravitos km 2,5/5/7,5 ; When ravito proche ; Then signalement et choix contextualisé, pas d'ordre de boire systématique. Course longue : rappeler uniquement protocole testé/renseigné.

### TF-21 : arrivée positive / sécurité [FON-038/043]
Given chrono manqué / abandon / record / problème de santé ; When séance se termine ; Then félicitations positives adaptées et factuelles ; conseil santé prime sur chrono ; ni record inventé ni « course terminée » lors d'abandon.

### TF-22 : offline / PWA [FON-060]
Given mode avion après mise en cache ; When séance avec capacités locales possibles ; Then catalogue voix disponible, plans et données consultables ; aucune dépendance LLM ; mode natif maintient fonctions pour lesquelles permissions accordées.

### TF-23 : migration [RF-001]
Given export d'un profil actuel en version `1.0.0-vanilla` ; When importer/migrer ; Then exercices, plans, poids, activités, séances, vidéos, réglages et profils retrouvés ; aucune création de doublon silencieuse.

### TF-24 : non-régression existant [RF-001]
Given version actuelle ; When lancer des sessions de musculation, mobilité, timer, TTS, récupération entre séries ; Then tous les parcours historiques restent fonctionnels avec mêmes données.

### TF-25 : accessibilité / affichage [04_UX]
Given iPhone compact, grand texte, VoiceOver, dark mode ; When naviguer depuis Aujourd'hui jusqu'à fin course ; Then commandes atteignables, labels lus, chiffres et graphes compréhensibles, aucun contrôle critique hors écran.

### TF-26 : confidentialité
Given aucune permission micro/HealthKit ; When utiliser course extérieure GPS ; Then séance possible dans limites de permissions GPS, pas de demande de micro ; aucune donnée physiologique envoyée dans le cloud. Export/suppression profil individuels vérifiés.

### TF-27 : synchro NAS hors ligne et convergence [FON-080]
Given deux appareils du même profil ont modifié hors réseau des entités indépendantes ; When le NAS redevient disponible et les PWA sont ouvertes ; Then les modifications sont synchronisées sans perte et les curseurs convergent.

### TF-28 : conflit simultané et rollback [FON-081]
Given le même plan édité offline sur deux appareils ; When la synchronisation reprend ; Then une révision conflictuelle est détectée et aucune version n'est écrasée silencieusement ; une ancienne exportation valide peut être restaurée.

### TF-29 : authentification et séparation des profils [FON-081]
Given deux utilisateurs et trois appareils ; When un appareil demande les données d'un profil non autorisé ; Then requête refusée ; révocation d'un appareil valide testée, tokens jamais fournis dans l'interface publique.

### TF-30 : PWA iOS fermée et reconnexion [FON-082]
Given iPhone PWA fermée, NAS inaccessible ; When des opérations restent en outbox puis la PWA se rouvre ; Then synchro au premier plan et aucune promesse mensongère de background ; coach et historique restent disponibles hors ligne.

### TF-31 : déduplication Garmin/HealthKit [FON-080]
Given la même sortie importée Garmin et HealthKit puis enregistrée par ResurGo ; When les appareils synchronisent ; Then une seule activité canonique, références des sources conservées, ambiguïtés soumises à validation.

### TF-32 : isolation des services NAS [FON-081]
Given Docker ResurGo Sync installé séparément ; When on le stoppe, redémarre ou restaure ; Then AlphaTerminal, Forgejo, Home Assistant et autres services existants restent inchangés.

## 3. Tests du moteur par rejeu

Établir fixtures anonymisées/synthétiques :
- côte courte + côte longue, descente avec accélération gravitaire, retour au plat ;
- capteur cardio figé sur ancienne valeur, coupure de 1/5/30 secondes et reconnexion ;
- GPS avec dérive, tunnels, arrêts aux feux, sauts de position, différence d'altitude ;
- ceinture avec valeurs aberrantes, cadence doublée, puissance cycliste non disponible ;
- fractionné 30/30, 5 x N, pauses longues, coupure en plein intervalle ;
- débutant en marche-course, reprise après interruption, coureur aguerri 3 000 m, semi et marathon ;
- fatigue rapportée, douleur aggravée au lendemain, arrêt médical prudent ;
- musique externe, notifications OS, perte écouteurs, choix voix homme/femme.

Chaque replay doit produire une séquence déterministe de `CoachDecision` comparée à un golden file (version règles + métriques d'entrée + source + raison), puis faire vérifier les changements par revue.

## 4. Critères de qualité avant publication

Critères à fixer et mesurer, **aucune valeur cible chiffrée n'est arbitrairement validée ici** :
- taux d'échantillons valides et fraîcheur par source ;
- délai entre événement de terrain et instruction pertinente ;
- continuité distance/dénivelé et absence d'allures aberrantes ;
- latence de commande montre ⇄ iPhone, tolérance aux reconnexions ;
- consommation batterie sur 30 min / 2 h / sorties longues avec écran verrouillé ;
- fréquence de parole acceptable et absence de saturation de la musique ;
- taille du catalogue vocal téléchargé/offline, espace disque, cache et mises à jour ;
- temps d'ouverture, performance stats, stabilité IndexedDB ;
- compatibilité iOS/watchOS/appareils FTMS réellement possédés ;
- couverture tests unitaires/integration/régression à convenir ;
- lisibilité sur petits écrans et tests d'accessibilité.

Un produit qui parle et affiche des données mais qui perd la mesure en arrière-plan n'est pas « terminé ».

## 5. Stratégie de migration

- Sauvegarde export JSON avant modification.
- Introduire `schemaVersion` nouveau **sans changer** le format des données anciennes en place ni confondre les migrations avec version d'application.
- Prévoir tables/vues de compatibilité entre anciens `plans[]` / `sessionRuns[]` et nouvelles `trainingBlocks[]` / `liveActivities[]`.
- Feature flags par sous-système (coaching, nouveau plan, UI, Apple Watch, Garmin, FTMS, respiration recherche).
- Ne pas ré-écrire les anciennes activités en les classant toutes « course » ; mapping explicite.
- IDs d'activités externes et signatures temporelles pour déduplication ; demande de choix utilisateur en cas de conflit ambigu.
- Déployer sur branche de test et appareil réel ; validation avant mise à jour `main` et publication `WebApp`.
- Rollback : version précédente stable, sauvegarde de données et procédure de rétrocompatibilité ou export lisible.
- Contrôler les anciennes préférences TTS pour ne pas perdre la voix ou le mode silence choisi.
- Les nouveaux assets vocaux ne doivent pas gonfler sans contrôle le téléchargement initial ; installation/cache progressifs et possibilité d'usage offline sans re-télécharger à chaque séance.

## 6. Risques et portes de décision

| Risque | Porte de validation |
|---|---|
| Garmin sans flux BLE course complète | Prototyper « sans installation » ; accepter fallback GPS iPhone/HRM ; Connect IQ uniquement si tests concluants |
| Apple Watch haut-parleur selon matériel/OS | Tester modèle et audio en vrai, sans garantie universelle |
| Musique interrompue par micro ou TTS | Tester AVAudioSession et périphériques spécifiques ; option de désactiver micro |
| FTMS hétérogène | Vérifier chaque machine et ses caractéristiques ; liste de compatibilité par modèle |
| PWA iOS en arrière-plan | Isoler logique critique dans composant natif et tester sur écran verrouillé |
| Conseils de santé trop catégoriques | Validation experte, règles de sécurité, pas de diagnostic ni protocole curatif imposé |
| Formule « tout développer d'un coup » | Spécification globale, intégration par lots isolés, tests et rollback |
| Régression de l'app de reprise | Comparaison états/snapshots et tests actuels avant fusion |

## 7. Critères de clôture du projet

- Tous les RF confirmés implémentés ou exception explicitement acceptée par Damien.
- Les fonctions non prouvées (protocole Garmin, respiration acoustique) ne sont pas présentées comme garanties.
- Garmin reste maître de sa séance native ; Apple Watch ResurGo fonctionne dans les deux sens sur appareils pris en charge.
- GPS seul efficace dehors, pas de coaching indoor sans machine live.
- Repos/mobilité et renforcement intégrés à la planification existante, et non à une deuxième application.
- Documentation et règles de décision réutilisables avec tests et traçabilité.
- Consentements/sauvegardes fonctionnels, données personnelles respectées.
- Validation des écrans et voix par Damien avant bascule visuelle globale.

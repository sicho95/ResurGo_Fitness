# Registre d'arbitrage, hypothèses, questions et références

Version du registre : 2026-10-30 ; statut : **travail préparatoire**.

## 1. Décisions explicitement confirmées

| ID | Décision / contrainte |
|---|---|
| DEC-001 | Étendre l'application existante de reprise sportive à l'endurance sans supprimer les fonctions de musculation, mobilité, programmes et statistiques. |
| DEC-002 | Course extérieure et vélo extérieur possibles avec téléphone et GPS seuls ; tous les accessoires optionnels. |
| DEC-003 | Intérieur uniquement si machine connectée par Bluetooth au téléphone et transmet des mesures de progression pertinentes ; cardio seul ne suffit pas. |
| DEC-004 | Elliptique classé « course intérieure », avec modèle de mesures propre ; tapis course intérieure ; vélo d'intérieur en famille vélo. |
| DEC-005 | Moteur déterministe/statistique auto-adaptatif, sans LLM ni générateur de conseils distant à l'exécution ; historique et records initialement saisis pris en compte. |
| DEC-006 | Plans reprise/activité orientée perte de poids, 3 000 m à marathon, distance seule ou temps cible, y compris entraînement et jour de compétition. |
| DEC-007 | Planification inclut repos, récupération active, entre-répétitions, échauffement, retour au calme, renforcement, mobilité et étirements adaptés. |
| DEC-008 | Priorité FC : ceinture thoracique > montre > machine de sport, sauf signal invalide. |
| DEC-009 | Priorité GPS/vitesse/distance/altitude extérieurs : montre reçue en direct > téléphone, avec jugement de précision, altitude barométrique si disponible et continuité. |
| DEC-010 | Toutes sources optionnelles se connectent, enrichissent mesures et se remplacent automatiquement en cas de coupure/erreur ; aucune donnée absente inventée. |
| DEC-011 | Apple Watch : app ResurGo connectée à l'iPhone dans les deux sens, montre pouvant jouer la voix localement si compatible. |
| DEC-012 | Garmin reste maître de son activité native, sans intervention/installation obligatoire sur la montre si solution standard disponible ; expérimenter l'émulation d'équipement. |
| DEC-013 | HRM-Pro Plus Garmin utilisable comme source cardio supplémentaire en BLE, tout en restant associée Garmin par ANT+ si pris en charge. |
| DEC-014 | Musique externe indépendante ; **deux identités vocales naturelles masculine/féminine, SYNTHÉTISÉES en amont (prégénérées), conservées et versionnées pour régénérer les futurs messages à identité constante** ; diffusion de fichiers audio offline, tonalités variées ; clarification explicite de Damien le 2026-10-30. |
| DEC-015 | Positive attitude et encouragements toujours ; félicitations systématiques adaptées à la situation réelle même si temps non atteint ou séance interrompue. |
| DEC-016 | Terrain : montée en effort adapté, regard quelques mètres devant/une foulée après l'autre ; au sommet/descente récupération avant relance, éviter « rattraper le chrono » immédiat. |
| DEC-017 | Ravitaillements du jour J saisis par position/infos, conseil contextuel sans arrêt imposé, hydratation/alimentation proportionnée à durée et contexte. |
| DEC-018 | Analyse du souffle au micro uniquement si technique réalisable ; ne pas considérer qu'un casque donne automatiquement une mesure respiratoire fiable. |
| DEC-019 | Envisager une refonte graphique iOS native-like propre ; aucune maquette ou organisation d'onglets finalisée. |
| DEC-020 | Produire et conserver une spécification détaillée pour développement ultérieur ; ne pas modifier l'application à ce stade. |

### Actualisation du 30 octobre 2026 : décisions additionnelles

- **DEC-021 (CONFIRMÉ)** Synchronisation automatique multi-appareils dès le premier lot, sans bloquer le fonctionnement local-first.
- **DEC-022 (PROPOSITION de Damien)** Si nécessaire, un **Docker sur le NAS QNAP**, à la manière d'AlphaTerminal, comme serveur de convergence ; à prototyper avant décision finale sur l'hébergement.
- **DEC-023 (CONFIRMÉ)** Refonte iOS native-like en préservant l'identité ResurGo.
- **DEC-024 (CONFIRMÉ)** Voix naturelles **prégénérées par synthèse** avec profils d'identités vocale masculine et féminine persistants ; pas d'enregistrements manuels imposés.
- **DEC-025 (CONFIRMÉ)** Catalogue général de mobilité avec suivi personnel, sans protocoles thérapeutiques prescrits automatiquement.
- **DEC-026 (CONFIRMÉ)** Damien souhaite déploiement automatique sur l'application actuelle et une évolution complète ; cela ne constitue pas une preuve de compatibilité matérielle ni une dispense de sécurité et de recette.
- **DEC-027 (CONFIRMÉ)** Duplication intégrale des spécifications dans SichoBrain KOS autorisée par Damien.

Voir `10_SYNCHRONISATION_NAS.md` et `11_ARBITRAGES_2026-10-30.md` pour détails et matériel déclaré.

## 2. Options proposées mais non approuvées

- `PROP-001` Navigation bas à cinq onglets (Aujourd'hui, Programme, Démarrer, Progrès, Profil) ; alternative quatre onglets à tester.
- `PROP-002` architecture JS métier partagé + compagnon iOS natif et watchOS ; choix SwiftUI complet vs Capacitor bridge non arrêté.
- `PROP-003` simulation des profils d'effort par fenêtres courtes/moyennes/longues et étapes `TerrainStateMachine` ; détails seuils non approuvés.
- `PROP-004` modes voix discret/équilibré/intensif et catalogue minimum d'environ 150–200 formulations ; nombre exact, fréquence et tonalités à valider. La prégénération naturelle et la conservation du manifeste d'identité sont, elles, confirmées.
- `PROP-005` parcours GPX importable et trois stratégies chrono ; modalités concrètes non arrêtées.
- `PROP-006` score de confiance et priorité avec hystérésis ; plages de délai et poids statistique à calibrer sur traces réelles.
- `PROP-007` formulaire facultatif de récupération au lendemain, suivi local des zones douloureuses ; politique de conservation à valider.
- `PROP-008` prise en charge Android future ; priorité produit non fixée.
- `PROP-009` journal de décision et protocole de replay avec golden files ; méthode recommandée pour explicabilité.

## 3. Hypothèses techniques interdites sans essais

**TECH-001 Garmin :** un capteur ANT+ « Extended Display » ou un équipement d'elliptique ne peut pas être émulé automatiquement par le Bluetooth LE standard de l'iPhone. L'iPhone n'a pas d'interface ANT+ native exposée ; il faut identifier le profil réellement utilisé. Le support du mode « Course virtuelle » ne garantit pas le flux GPS d'une activité extérieure.

**TECH-002 Apple Watch :** les données Live sont accessibles pour la propre séance ResurGo watchOS/HealthKit, pas nécessairement pour une séance standard « Exercice » simplement ouverte dans Apple Watch. Le haut-parleur dépend du modèle et de la version OS.

**TECH-003 HRM-Pro Plus :** la FC en BLE est une piste solide ; toutes les dynamiques de foulée Garmin ne sont pas forcément exposées dans le profil standard BLE cardio. Le firmware 8.90 n'implique pas l'accès Bluetooth à tous les champs.

**TECH-004 FTMS :** la publicité Bluetooth de l'équipement ne suffit pas ; vérifier les caractéristiques et notifications réellement fournies par modèle et firmware.

**TECH-005 Respiration :** microphone des écouteurs = source potentiellement bruitée/filtrée, risque de dégradation musique en profil micro. Aucun diagnostic d'apnée ou consigne cardio automatique ne doit dépendre d'une simple baisse acoustique.

**TECH-006 PWA :** lecture TTS, réception GPS/BLUETOOTH et audio en arrière-plan sur iPhone ne sont pas équivalentes aux API natives ; valider les comportements écran verrouillé sur appareil physique.

**TECH-007 Physiologie :** modèle statistique ≠ mesure directe de la réserve physique, du risque de blessure ou d'un diagnostic. Ne pas annoncer ces propriétés sans validation.

## 4. Questions à Damien, sans bloquer la rédaction

1. **Matériel intérieur exact** : marque, référence et firmware du tapis, elliptique ou vélo utilisé ; comment l'Enduro 2 y est couplée actuellement ?
2. **Apple Watch** : modèle et version watchOS de la montre de Claire ; souhaite-t-elle utiliser une application ResurGo watchOS dédiée plutôt que l'app Exercice native (nécessaire pour certaines fonctions) ?
3. **Enduro 2** : confirmer configuration actuelle des modes Bluetooth/ANT+, équipement « écran étendu » et le modèle du téléphone utilisé pendant les courses.
4. **Sorties audio** : priorité si téléphone, casque et haut-parleur de montre sont disponibles simultanément ; audio multilingue souhaité ou français d'abord ? Le principe de voix naturelles prégénérées et persistantes est confirmé, mais pas le fournisseur ni les timbres exacts.
5. **Voix** : écouter et sélectionner les identités homme/femme à timbre unique ; ton précis, variantes et nombre de phrases avant validation d'enregistrements.
6. **UI** : choisir 4 ou 5 onglets après prototype ; identité de couleurs et niveau de rupture graphique par rapport à l'application 1.3.4.
7. **Intérieur** : minimum acceptable de métriques par machine (exemple elliptique seulement cadence + résistance vs distance réellement nécessaire). Une machine « connectée » ne doit pas passer sans contrôle de ses données.
8. **Récupération** : souhaite-t-il une bibliothèque générale d'exercices uniquement, ou la saisie d'un protocole de kinésithérapeute avec consignes/validations spécifiques ?
9. **Santé/confidentialité** : quelles informations cliniques individuelles souhaite-t-il stocker uniquement sur téléphone, exporter chiffrées, ou éviter complètement ? Jamais dans ce dépôt public par défaut.
10. **Politique de séance** : si la machine intérieure perd le signal, faut-il mettre automatiquement l'activité en pause ou seulement suspendre les conseils jusqu'à reconnexion ?
11. **Notifications et météo** : usage d'une météo externe facultative pour chaleur et ravitaillements ou uniquement saisie manuelle/historique local ?
12. **Ordre de plateforme** : iPhone + Apple Watch/Garmin d'abord (proposition), Android/Wear OS ensuite, ou exigence simultanée ?
13. **Mode compétition** : privilégier plan d'allure global ou stratégie segmentée par dénivelé quand un GPX fiable existe ; acceptation des objectifs prudent/réaliste/ambitieux ?
14. **Sources forcées** : autoriser override manuel du classement des capteurs pour diagnostic, ou garder un mode automatique strict ?
15. **Voix enregistrées** : accord/licences des modèles vocaux et des fichiers générés ; pas de clonage de voix réelle sans autorisation.

Ces questions sont conservées ici ; elles n'ont pas été remplies par hypothèses.

## 5. Références de conception et limites

### Sources applicatives actuelles
- Dépôt : https://github.com/sicho95/ResurGo_Fitness
- `README.md`, `docs/architecture.md`, `docs/data-model.md`, `static/version.json` sur branche `main`, consultés le 2026-10-30.
- `scripts/build-static.mjs` et `.github/workflows/publish-webapp.yml` documentent le déploiement automatique de `main` vers `WebApp`.

### Apple
- Multidevice workout mirroring iOS/watchOS : https://developer.apple.com/documentation/healthkit/building-a-multidevice-workout-app
- Séances et audio dans session active : https://developer.apple.com/documentation/healthkit/running-workout-sessions
- Audio mix/ducking : https://developer.apple.com/documentation/avfaudio/avaudiosession
- iOS Core Bluetooth : https://developer.apple.com/documentation/corebluetooth

### Garmin et Bluetooth
- Enduro 2, liaison capteurs ANT+/Bluetooth : https://www8.garmin.com/manuals/webhelp/GUID-2CD92989-7336-4BF3-96CC-50DDBD63B109/FR-FR/GUID-0AA57B88-BA13-4983-ADAC-7EA7DABC735D.html
- Connect IQ SDK et API : https://developer.garmin.com/connect-iq/overview/
- Garmin Health SDK **distinct** de Connect IQ : https://developer.garmin.com/health-sdk/overview/
- Fitness Machine Service FTMS : https://www.bluetooth.com/specifications/specs/fitness-machine-service-1-0/
- GATT service directory : https://www.bluetooth.com/specifications/assigned-numbers/

### Planification et récupération
- Recommandations APTA/JOSPT 2023 sur douleurs plantaires : https://doi.org/10.2519/jospt.2023.0303
- Guidelines douleur du tendon rotulien : https://pmc.ncbi.nlm.nih.gov/articles/PMC11792096/
- Synthèse 2026 sur chargement progressif tendineux : https://pmc.ncbi.nlm.nih.gov/articles/PMC13608764/
- NHS Couch to 5K (référence pour structurer une reprise, non programme universel) : https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/

### Principe de traçabilité
Chaque évolution ultérieure doit référencer une exigence RF/FON/DEC/TECH, indiquer la version de règles et les tests correspondants. Les sources officielles peuvent évoluer et devront être revérifiées lors du développement.

## 6. Raccordement à SichoBrain KOS

**À intégrer dans SichoBrain**, dossier conseillé `200_PROJECTS/`, sous un index ResurGo Fitness référençant cette branche documentaire et sa future fusion validée. Ne pas copier de données nominatives de santé dans le dépôt public. Les décisions de portée générale pourront être reprises dans `800_DECISIONS/` après validation explicite.

**État :** Les documents de spécification sont destinés à une copie dans le dépôt privé SichoBrain ; vérifier la copie effective avant de déclarer sa réalisation. La version applicative publiée reste distincte de cette documentation.

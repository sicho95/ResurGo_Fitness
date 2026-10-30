# ResurGo Fitness — Dossier de spécification pour l'évolution coaching multisport

**Statut :** spécification de référence de travail, sans développement ni déploiement.
**Établi le :** 2026-10-30.
**Produit actuel audité :** ResurGo Fitness PWA, version déclarée 1.3.4, branche `main`.
**Version du dossier :** SPEC-MULTISPORT 0.3.0 (ajout des arbitrages et de la synchronisation NAS proposée).
**Propriétaire des arbitrages :** Damien. **Source de vérité produit :** dépôt `sicho95/ResurGo_Fitness` ; SichoBrain KOS est la mémoire personnelle officielle, mais n'a pas été modifié par ce dossier.

## A. Mode d'emploi et valeur normative

- **CONFIRMÉ** = consigne explicitement exprimée au fil des échanges ; elle s'impose à la future implémentation.
- **CONTRAINTE TECHNIQUE VÉRIFIÉE** = documentée par des API ou la base actuelle, mais à retester sur versions et matériels réels.
- **PROPOSITION** = décision d'architecture ou UX recommandée, à ne pas assimiler à une validation de Damien.
- **À TESTER** = fonction plausible mais non démontrée en situation réelle.
- **QUESTION À DAMIEN** = information ou arbitrage indisponible ; n'inventer aucune réponse.
- **HORS PÉRIMÈTRE** = exclusion explicite.
- Les exemples chiffrés dans les spécifications sont fictifs et non des seuils sportifs ou médicaux validés.

## B. Documents de ce dossier

1. `01_SPEC_FONCTIONNELLE.md` — profils, objectifs, séances, capteurs facultatifs, séances jour J, coaching, audio, encouragements.
2. `02_ARCHITECTURE_TECHNIQUE.md` — collecte, arbitrage des sources, algorithmes, états, Apple Watch, Garmin, Bluetooth, modèles et confidentialité.
3. `03_ENTRAINEMENT_RECUPERATION.md` — générateur de plans, repos, repos actifs, échauffement, mobilité, souplesse, renforcement, douleur et précautions cliniques.
4. `04_UX_IOS.md` — refonte graphique native-like, parcours, écran de séance, accessibilité et continuité avec la PWA actuelle.
5. `05_RECETTE_MIGRATION.md` — phasage, exigences de qualité, essais appareil réel, migrations, non-régression, critères d'acceptation.
6. `06_DECISIONS_QUESTIONS_SOURCES.md` — registre de décisions, points ouverts, sources de référence.
7. `07_CATALOGUE_VOCAL.md` — grammaire hors ligne, production des voix et 80 formulations candidates à valider.
8. `08_MOTEURS_ALGORITHMES.md` — pipeline déterministe détaillé, qualité capteurs, terrain, prédictions et arbitrage des conseils.
9. `09_BIBLIOTHEQUE_PREVENTION_MOBILITE.md` — catalogue générique détaillé des étirements, mobilité, renforcement et séparation d'avec les soins encadrés.
10. `10_SYNCHRONISATION_NAS.md` — architecture proposée de synchronisation locale multi-appareils via Docker dédié QNAP, inspirée d'AlphaTerminal.
11. `11_ARBITRAGES_2026-10-30.md` — décisions confirmées par Damien, matériel déclaré, objectif de livraison et questions restantes.
12. `12_SAUVEGARDE_RESTAURATION.md` — export JSON sécurisé, code d'association sans administrateur et récupération NAS depuis sauvegarde chiffrée.

## C. Périmètre confirmé

### L'application doit rester une application de préparation sportive complète

**RF-001** Préserver la reprise du sport, l'évaluation initiale, le renforcement, la mobilité, la planification hebdomadaire, les séances guidées, le suivi corporel et la progression existants. Ne pas reconstruire le produit en « running-only ».

**RF-002** Ajouter le coaching d'endurance course à pied et vélo, avec objectifs de reprise et perte de poids orientés activité physique durable, et préparations de 3 000 m, 5 km, 8 km, 10 km, 15 km, 20 km, semi-marathon, 30 km et marathon ; mode « terminer » ou « chrono » ; l'utilisateur peut ne renseigner aucun record.

**RF-003** L'extérieur est autorisé avec **GPS du téléphone seul** ; tout autre capteur est facultatif.

**RF-004** L'intérieur est autorisé **uniquement si une machine de sport connectée au téléphone fournit en direct les mesures de progression nécessaires** (pas de simple chronomètre+cardio sans machine). Tapis et elliptique appartiennent au groupe « course intérieure » ; vélo d'intérieur au groupe « vélo ». Le modèle biomécanique de l'elliptique reste distinct.

**RF-005** Le moteur de coaching doit fonctionner sans LLM, avec règles déterministes, calculs statistiques, paramètres individualisés et apprentissage non génératif depuis l'historique.

**RF-006** Chaque métrique possède des sources classées, une qualité/fraîcheur évaluée en continu, un secours automatique et un raccordement sans saut de distance ou de dénivelé.

**RF-007** L'Apple Watch doit pouvoir enregistrer une séance ResurGo et dialoguer bidirectionnellement avec l'iPhone. Si compatible, les messages vocaux peuvent sortir par la montre sans écouteurs.

**RF-008** Garmin conserve autant que possible sa propre activité native comme enregistrement maître ; exploiter les méthodes sans installation sur montre en premier, Connect IQ en solution à tester si nécessaire. Ne pas prétendre qu'une simple association Bluetooth rend toutes les mesures Garmin accessibles.

**RF-009** Audio avec Spotify/Apple Music/autre application indépendante, musique abaissée temporairement pour la voix. Voix homme et femme de timbre cohérent, messages préenregistrés offline, intonations adaptées, lexique important et messages positifs variés.

**RF-010** Tout résultat de fin de séance reçoit un message de félicitation sincère ; les records sont célébrés lorsqu'ils sont confirmés ; une séance écourtée ou une interruption douloureuse n'est jamais présentée comme un échec.

**RF-011** Gestion intelligente des montées, descentes, effort résiduel après la côte, récupération sur le plat et en descente, guidage mental (« quelques mètres devant, un pas après l'autre »), foulée naturellement raccourcie et respiration confortable sans injonction dangereuse.

**RF-012** Compétitions avec profil de parcours si disponible, positions des ravitaillements saisies, temps cible facultatif, ajustements contextuels, récupération et bilan. Les apports ne sont ni obligatoires ni identiques pour tout le monde.

**RF-013** Plans composés de séances, jours de repos, repos actifs, échauffement, retour au calme, renforcement et mobilité/étirements adaptés à la tolérance et aux retours de douleur.

**RF-014** Interface propre et cohérente inspirée des conventions iOS natives, sur iPhone/PWA et application native future ; conserver l'accessibilité et les thèmes clairs/sombres.

## D. Architecture existante à préserver

Les fichiers vérifiés dans `main` : `README.md`, `docs/architecture.md`, `docs/data-model.md`, `app/planning-state.js`, `app/app-init.js`, `app/views-settings-stats.js`, `static/styles.css`, `scripts/build-static.mjs` et `.github/workflows/publish-webapp.yml`.

- Source unique des modules dans `app/`, publication construite par ordre explicite dans `scripts/build-static.mjs`.
- Application distribuée dans branche `WebApp`, générée après modification des chemins surveillés sur `main`.
- Base locale IndexedDB, export/import JSON, multi-profils, sources manuelles et Worker Cloudflare optionnel.
- PWA actuelle : TTS navigateur ; saisie manuelle course ; pas d'accès HealthKit direct et Garmin Connect réel non intégré.
- Le modèle JSON actuel a `schemaVersion: 1.0.0-vanilla` ; ne pas confondre cette version de schéma avec la version produit 1.3.4.

**Protection du produit :** tout ce dossier est enregistré sur une branche documentaire isolée. Aucun changement de code, version, schéma existant ou déploiement n'est autorisé par cette spécification seule.

## E. Exigences transversales

- Fonctionnement offline-first ; secret de compte jamais intégré dans le bundle. **Décision confirmée : synchronisation automatique multi-appareils**, et **proposition à prototyper : Docker NAS indépendant, comme AlphaTerminal**, sans accès réseau requis pour le coach ; voir `10_SYNCHRONISATION_NAS.md`.
- Les données de santé et les dossiers individuels restent privés ; ne pas inscrire de diagnostic personnel dans le dépôt public.
- Toutes les données affichées doivent disposer d'une source et d'une ancienneté vérifiables ; absence de capteur ≠ valeur zéro.
- Pas de double comptabilisation d'une même activité par Garmin, Apple Santé, téléphone et application.
- Les règles sensibles doivent être explicables et testées sur activités rejouées.
- Une consigne motivante ne peut pas dépasser une règle de sécurité ni transformer une estimation en fait.
- Les seuils cardio, intensité, douleur, volume, charge et hydratation sont individualisés ou à paramétrer et valider, jamais fixés comme universels sans base.

## F. Definition of done du dossier

Ce dossier est « prêt à programmer » lorsqu'il identifie chaque exigence, son entrée, sortie, état dégradé, test, dépendance et arbitrage restant. Il **ne prouve pas** encore que l'Enduro 2 diffuse ses données de course complètes en direct au téléphone, que l'équipement intérieur est FTMS, ni que des écouteurs commerciaux rendent la respiration mesurable.

Voir le registre des questions dans `06_DECISIONS_QUESTIONS_SOURCES.md`.

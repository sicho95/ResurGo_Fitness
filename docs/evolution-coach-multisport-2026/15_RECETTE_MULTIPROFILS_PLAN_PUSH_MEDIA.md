# ResurGo — continuité multi-profils, coach global, Web Push et médias d'exercices

**Date : 2026-10-30 — statut : partie réalisée, partie à implémenter et recetter.**
Ce document est un cahier de recette et d'évolution de ResurGo, **pas** une affirmation que toutes les fonctions décrites sont déployées sur le NAS.
Arbitrage produit : **un plan d'entraînement global par profil**, multi-activités, et **un compte NAS pouvant héberger plusieurs profils sportifs**.

## 1. Synchronisation complète sans perte

### Réalisé dans la PWA

- Le créateur d'un compte NAS peut pousser **tous les profils de son application locale** et les objets appartenant à chacun (plans, activités, poids/mesures, séances, évaluations).
- Les appareils qui s'associent à un compte NAS existant récupèrent les profils et les objets publiés dans ce compte ; ils ne publient **pas automatiquement** un profil provisoire de leur propre navigateur.
- Les entités sont fusionnées par ID, sans effacer les autres profils locaux ; écrasements concurrents = conflit visible, non résolution automatique.
- Le statut mentionne le nombre de profils distants détectés, le nombre de profils locaux, les opérations en attente et les conflits.
- Le backup JSON chiffré conserve indépendamment un snapshot complet des profils/états ; il ne remplace pas une bonne synchronisation NAS.

### Recette obligatoire iPhone → NAS → iMac (avant vraies données sensibles)

1. **Exporter une sauvegarde chiffrée depuis l'iPhone**, avant toute nouvelle synchronisation.
2. Vérifier visuellement les deux profils sur l'iPhone et choisir le compte NAS **créé initialement depuis cet appareil**.
3. Synchroniser depuis l'iPhone, attendre la fin des opérations en attente et relever **2 profils NAS détectés**.
4. Sur iMac appairé au même compte, synchroniser et vérifier les deux profils, leurs plans, séances, poids et historiques individuellement ; aucun doublon.
5. Modifier une mesure sur un profil, synchroniser sur l'autre appareil, puis vérifier que le second profil reste strictement inchangé.
6. Simuler une coupure NAS puis reconnexion, et deux modifications concurrentes d'une même activité pour vérifier le conflit.
7. Vérifier les suppressions, les données propres à chaque profil et le comportement des profils provisoires sur un appareil nouvellement associé.
8. Conserver les exports initiaux tant que la recette réelle Safari/iOS n'est pas terminée. Le changement de version PWA n'efface pas IndexedDB.

**Limites actuelles :** l'auto-inscription d'un compte NAS crée un conteneur de profils ; elle **ne** donne **pas** accès aux comptes NAS d'autres personnes. Le partage de plusieurs profils dans **un même compte NAS** implique que ses appareils autorisés peuvent consulter les données de ces profils. À confirmer comme règle de confidentialité pour un usage familial. Les profils créés ultérieurement sur un appareil secondaire nécessiteront un mécanisme d'association explicite au compte, et non une publication automatique.

## 2. Objectif prioritaire et planification unique

### Réalisé dans la PWA

Le questionnaire de création et les réglages d'un profil proposent la priorité :
**Global**, **Course à pied**, **Vélo**, **Remise en forme**, **Perte de poids / activité durable**, **Musculation au poids du corps**.

Le planificateur conserve une **seule allocation hebdomadaire par profil** avec, selon la priorité, deux séances d'endurance (course ou vélo), du renforcement, de la mobilité et des temps libres, dans la limite de la disponibilité, des données santé rapportées et des garde-fous genou/dos/fatigue. Les jours sans séance sont visibles comme repos planifié. Les séances cardio restent de type historique commun pour garder la compatibilité avec les données existantes.

### À développer au-delà de cette première adaptation

- Questionnaire multi-objectifs pondérés (priorité + objectifs secondaires), préférences des jours, durée, terrains/matériel, trajets à vélo déjà effectués, niveau réel.
- Allocation de charge unifiée exprimée en **durée, intensité perçue, répartition musculaire et récupération**, sans faire comme si une séance vélo et une séance de musculation avaient la même charge.
- Éviter les blocs difficiles consécutifs, limiter la progression selon tolérance et douleur ; substituer un repos complet lorsque nécessaire.
- Séances de course/ vélo **prescrites et enregistrées** dans le plan global ; le GPS/FTMS est un mode d'exécution de ces séances, non un module séparé avec son propre calendrier.
- Échauffement, retour au calme, mobilité, récupération, progression et bilan hebdomadaire explicites.
- Aucun ajustement nutritionnel personnalisé automatisé sur la seule base du poids ; perte de poids comme finalité sportive, en concertation avec un professionnel si besoin.

## 3. Notifications Web Push NAS, modèle AlphaTerminal

**À implémenter — aucune livraison Web Push ResurGo revendiquée.**

À reprendre dans AlphaTerminal : VAPID avec clés **propres à ResurGo**, enregistrement de l'abonnement push par appareil, stockage d'une boîte de réception dans IndexedDB du service worker, notification OS avec identifiant durable, et clic qui **ouvre la notification précise dans ResurGo**.

Architecture proposée :
- Endpoints authentifiés sur l'API publique (association requise) : clé VAPID publique, abonnement, désabonnement et statut ; jamais l'administration.
- Worker Docker **ResurGo dédié**, partageant uniquement la base SQLite ResurGo, avec sortie HTTPS vers les services de push Apple/Google/Mozilla. Ne pas réutiliser les clés VAPID ni la base d'AlphaTerminal.
- Une notification de séance due uniquement si une session non terminée est planifiée ; **déduplication par appareil, séance et date** et gestion du fuseau horaire du profil.
- Programme de rattrapage selon règle de coach (sans culpabiliser) ; pas de répétition infinie et aucune notification quotidienne sur jour de repos sauf opt-in explicite.
- Payload minimal : identifiant non sensible de notification et de séance, titre générique ; pas de poids, pathologie, fréquence cardiaque ni jeton.
- Événement `push` du service worker : stocker la notification dans une boîte locale fiable, appeler `showNotification`. Sur `notificationclick` : rouvrir/centrer la PWA sur **le détail de la notification concernée** et proposer d'ouvrir la séance liée.
- Permission uniquement après clic utilisateur. iPhone : Web Push exige une **application installée sur l'écran d'accueil** et l'autorisation des notifications ; service non garanti en toutes circonstances (restrictions système, connectivité, batterie).
- Vérifier les statuts VAPID, abonnement, dernier envoi, dernier succès, dernier échec, et prévoir un bouton de test.
- Ne pas exposer une route admin ni un endpoint de push arbitraire à Internet.

Recette : Android + iOS (application installée), navigateur fermé, livraison, clic direct, déduplication, refus permission, désabonnement, appareil révoqué, absence de notification pour séance terminée, plusieurs profils sur un même compte, arrêt/reprise du NAS. **À recetter sur vrais appareils**, non couvert par les tests unitaires seuls.

## 4. Bibliothèque vocale

**Réalisé :** deux voix Edge pré-générées, **80 clips par voix**, 160 fichiers en tout, jouables sans réseau une fois téléchargés ; féminine jugée acceptable à l'essai, masculine jugée mauvaise et **non validée**.

**À faire :** rechoisir/faire auditionner une voix masculine plus naturelle **avant remplacement** (l'identité d'une voix ne doit pas changer silencieusement), élargir le catalogue au-delà des 80 phrases actuelles avec intents `départ`, `vitesse`, `distance`, `montée`, `récupération`, `vélo`, `course`, `renforcement`, `étirement`, `fin`, `sécurité`. Préparer des unités numériques et transitions vocales réellement réutilisables, et une politique anti-répétition/anti-spam. Vérifier chaque fichier généré contre le texte et les négations sensibles. Ne pas utiliser de synthèse réseau pendant l'effort.

## 5. Médias des exercices — refonte visuelle

**Constat utilisateur :** les avatars actuels paraissent filaires et souvent identiques, même lorsque les exercices sont différents.

**Audit de structure :** catalogue source de **37 exercices** dont certains utilisent une vraie vidéo externe ; le fallback SVG `motionKind` regroupe de nombreux exercices par famille. Il peut donc présenter des mouvements génériques non fiables pour l'exercice précis.

**Cible qualitative** :
- Un média **spécifique à chaque exercice** (et au besoin à sa variante), jamais une illustration générique trompeuse.
- Priorité à une **courte séquence de démonstration 3D/personnage habillé réaliste et lisible**, vue 3/4 ou latérale selon l'exercice.
- Solution de repli : **triptyque d'images PNG/WebP** dédiées (position de départ, phase active, retour) avec flèches d'amplitude, points de posture, noms de phase, alternatives genou/dos et contre-indications.
- Gros personnage, éclairage/contraste fort, fond neutre, équipement correctement représenté (élastique, chaise, vélo, tapis), peau et tenue différenciées, anatomie plausible et positions contrôlables.
- Médias téléchargés et mis en cache **offline-first**, aucun recours obligatoire à la vidéo distante.
- Registre `exerciseMedia[exerciseId]` avec `type` (`video`, `animated_webp`, `storyboard_webp`), `src`, `verified`, `variant`, `version`.
- S'il n'existe pas de média vérifié, afficher les **consignes écrites explicites** et un état « illustration à compléter », plutôt qu'un faux mouvement identique à d'autres.
- Audit visuel et recette de posture exercice par exercice avant remplacement du fallback actuel. Ne pas prétendre qu'un rendu SVG simplement ombré est une vraie démonstration 3D.

### Ordre de production recommandé

D'abord les exercices souvent planifiés et sans vidéo fiable : `dead_bug`, `bird_dog`, `glute_bridge`, `quad_set`, `straight_leg_raise`, `clamshell`, `hip_abduction_side`, `hip_flexor`, `thoracic_rotation`, `ankle_wall`, `easy_run`, `easy_bike`. Puis compléter **tout le catalogue**. Le contenu doit être correctement interprétable sur petit iPhone.

## 6. Règles de livraison

1. Les changements PWA passent les tests de portée du bundle et de sauvegarde/synchronisation.
2. Les changements NAS passent les tests API/SQLite et la recette de sécurité.
3. Les médias, voix et notifications sont testés sur iPhone/iMac réels.
4. **Aucune migration destructive ni suppression automatique de profil** ; sauvegarde chiffrée recommandée avant évolution.
5. Le code GitHub est la source du logiciel ; le dépôt SichoBrain distinct constitue la mémoire officielle des décisions, à mettre à jour seulement sur demande.

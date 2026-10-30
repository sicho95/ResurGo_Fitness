# Spécification UX / UI — Refonte « native-like iOS » sans perdre l'identité ResurGo

**Statut : PROPOSITION, pas une maquette validée.** L'objectif confirmé est une interface propre, lisible, naturelle sur iPhone, reprenant l'esprit des applications natives sans prétendre copier une interface système d'Apple. Une validation visuelle reste indispensable.

## 1. Diagnostic de l'existant (audit de code)

Dans `static/styles.css` de `main` : thèmes clair/sombre/auto déjà présents, CSS responsive, safe-area iOS, bandeau supérieur fixé, barre du bas à **six** onglets, nombreuses cartes et sections, palette actuelle incluant vert vif, boutons et accentuation ; `app/views-settings-stats.js` contient statistiques, modales et réglages ; `app/app-init.js` gère DOM, service worker et saisie.

L'interface n'est pas à supprimer. Elle doit être **réorganisée** pour absorber le coaching endurance et conserver musculation/mobilité sans écrans surchargés. Un projet « tout course à pied » serait contraire au cahier des charges.

## 2. Principes proposés

1. **Hiérarchie claire** : l'objectif du jour et la prochaine action priment, graphiques secondaires accessibles sans défilement infini.
2. **Native-like** : typographie système iOS, grandes zones tactiles, feuilles modales (« sheets »), barre basse simple, espaces cohérents, safe areas et retour naturel.
3. **Thèmes** : auto/clair/sombre, couleurs accessibles contrastées, accent ResurGo conservé mais moins omniprésent ; jamais information critique portée par couleur seule.
4. **Cohérence** : mêmes cartes, jauges, sélecteurs, onglets, barres de progression et feuilles de configuration sur tous les sports.
5. **Action sportive prioritaire** : démarrer, pause, reprise et fin facilement identifiables ; interaction sans regarder si montre/écouteurs disponibles.
6. **Faible charge cognitive en course** : écran live à lecture immédiate, pas de textes longs ni réglages complexes en mouvement.
7. **Conservation** des graphiques, bibliothèque exercices, statistiques, suivi du poids, douleur/ressenti, multi-profils, import/export et modes offline.
8. **Accessibilité** : VoiceOver, Dynamic Type ou taille texte ajustable, labels accessibles, contraste, réduction des animations, vibrations compatibles.

## 3. Architecture de navigation **PROPOSÉE**

En remplacement des six onglets de bas actuels, **option A** à confronter aux usages :
- `Aujourd'hui` : état de préparation, séance prévue, récupération prescrite, prochaine course, rappel volontaire.
- `Programme` : calendrier unifié endurance + renforcement + mobilité + repos.
- `Démarrer` : action centrale de sélection course/vélo extérieur ou intérieur connecté, séance libre/plan/compétition.
- `Progrès` : historiques, records, tendances, charge, forme, activités, mesures corporelles.
- `Profil` : profils, capteurs, voix, consentements, préférences et sauvegardes.

**À VALIDER** : 5 onglets vs 4 onglets + profil dans le bandeau. Ne pas changer la navigation avant prototype cliquable et test d'utilisation.

Chaque espace dispose de sous-sections contenues dans des segments ou onglets locaux (pas de longues pages cumulant toutes les statistiques).

## 4. Écrans cibles et informations minimales

### 4.1 Aujourd'hui
- Carte « prochaine séance » : type, durée prévue, objectif simple, effort attendu, bouton « Préparer » ; éventuelle carte repos actif / jour de repos.
- Carte « état rapporté » : fatigue, douleur/limitations de façon facultative et discrète, sans injonction médicale.
- Vue semaine : endurance, force, mobilité, récupération avec codes distincts et légende.
- Résumé progrès non anxiogène : régularité, sorties, bonne récupération ; ne pas afficher de faux scores de santé précis.
- Mini-état du matériel connu : pas besoin de coupler les capteurs pour planifier.

### 4.2 Programme
- Agenda par semaine avec séances et jours de récupération explicites.
- Détail séance : intention, phases, intensité, échauffement, repos entre répétitions, retour au calme, mobilité et alternatives.
- Modifier/report/écourter avec explication d'impact ; ne jamais déplacer automatiquement toutes les séances manquées pour « rattraper ».
- Vue « cycle vers objectif » par bloc ; date course éventuelle et statut de préparation estimé.

### 4.3 Préparer et démarrer une séance
Ordre :
1. Choisir extérieur/intérieur, course/vélo ; si elliptique, « course intérieure — elliptique ».
2. Libre / séance du programme / compétition.
3. Vérifier source position en extérieur, machine Bluetooth active en intérieur ; FC/montre/cadence facultatives.
4. Audio : écouteurs, iPhone, montre compatible ; réglage vocal; tester « bonjour » à volume sûr si demandé.
5. Démarrer avec contrôle univoque de l'autorité (`Garmin native`, `ResurGo watchOS` ou `iPhone`).
6. Compte à rebours seulement si choisi. Les autorisations iOS demandées au besoin et expliquées.

**À BLOQUER** : intérieure sans machine connectée et sans données de progression. Le bouton affiche pourquoi et comment corriger (reconnexion FTMS).
**À DÉGRADER sans bloquer** : GPS seul extérieur sans cardio, absence de musique, absence de montre.

### 4.4 Live séance extérieur
- Une métrique principale à grand caractère : allure course ou vitesse vélo, plus durée/distance.
- Mesures secondaires adaptatives : FC/zone si valable, cadence, D+, pente, watts, étape du plan.
- Indicateur source par mesure accessible via une feuille, état de signal compact (aucune valeur périmée non signalée).
- Phase de terrain ou d'entraînement et prochaine transition (côte/descente/intervalle/ravitaillement).
- Contrôles sécurisés pause/fin, protégés contre appui accidentel ; pas d'activation de fin par glissement involontaire.
- Mode écran verrouillé et/ou Live Activity native quand faisable ; priorité à l'audio.

### 4.5 Live séance intérieur
- Source machine, connexion BLE, mesures de progression compatibles en gros.
- Pas de GPS fictif ; pas de distance estimée automatiquement lorsque machine n'en délivre pas.
- Perte machine : bannière « appareil déconnecté », consignes performance suspendues, reconnexion, état de séance explicite.
- Pendant reconnexion, ne pas supposer que le sportif continue même vitesse/résistance.

### 4.6 Apple Watch
- Écran ultra-lisible : chrono, métrique principale, FC si présente, phase et commande pause/reprise.
- Retour haptique des transitions ; sortie audio par montre si prise en charge et sélection.
- Compte rendu de connexion iPhone, synchronisation et mode sans téléphone ; pas d'éléments trop petits.
- Propre app ResurGo watchOS nécessaire pour mirroring; ne pas imiter ou promettre le contrôle de l'app Exercice Apple.

### 4.7 Garmin
- Aucun écran « installer Garmin » obligatoire pour commencer en mode GPS iPhone.
- Associer les capteurs accessibles au téléphone, puis montrer les capacités réellement reçues.
- Si lien natif Garmin disponible : afficher état de la séance Garmin ; si non : expliquer le contrôle indépendant iPhone.
- Présenter un chemin Connect IQ facultatif uniquement si prototype validé.

### 4.8 Compétition
- Fiche « jour J » : distance, cible facultative, parcours/dénivelé, ravitaillements réels, trois stratégies **proposées**, activation coach.
- Pendant : grand chrono/distances, projection non garantie, prochain ravitaillement, statut effort et phase.
- À la fin : célébration sincère, résultat clair, objectifs atteints ou non, récupération, ressenti, analyse différée.
- Les messages de félicitations arrivent même si abandon, avec formulation adaptée ; aucune culpabilisation.

### 4.9 Récupération et mobilité
- Vue distincte des seuls « entraînements réussis » : repos programmé, récupération active optionnelle, progression de la mobilité.
- Bibliothèque structurée par région : hanche/psoas-iliaque, chaîne antérieure/postérieure, quadriceps, mollets, dos, voûte plantaire, pied/cheville, gainage.
- Fiche exercice : étapes, démonstration offline, « ressenti aujourd'hui ? », alternatives, prudences ; ne pas confondre conseil sportif et soin prescrit.
- Suivi volontaire de symptôme limité, local et privé ; messages sans alarmisme ni pseudo-diagnostic.

### 4.10 Capteurs et sources
- Liste groupée : « Connectés », « Disponibles », « Non disponibles » et « Nécessitent une action ».
- Pour chaque métrique : source retenue, autres candidates, dernière mesure, confiance, raison d'un basculement.
- Priorités par sport et type de mesure, « Automatique » par défaut ; commande forcer manuellement facultative.
- Recherche de machine intérieure et validation en préflight ; ne jamais vendre « compatible » sur seule base du nom Bluetooth.

### 4.11 Statistiques et historique
- Affichage des performances observées, records validés, prévisions et tendances **avec distinction visuelle claire**.
- Vues séances simples, détails et comparaisons à terrain/effort similaires, programme vs réalisé, sommeil/fatigue si partagé, et signaux incertains.
- Ne pas créer de compétition malsaine de « score unique » de santé ; félicitations sur assiduité et effort.

## 5. Système visuel proposé

- Palette : surfaces claires profondes en contraste, verts existants avec saturation maîtrisée, bleu pour actions informatives ; rouge réservé aux alertes, pas à la séance non réussie.
- Typographie : system-ui / SF Pro quand disponible, tailles relatives, titres hiérarchiques et valeurs tabulaires pour chrono.
- Spacing : grille régulière, fonds de panneaux subtils, arrondis cohérents ; ne pas empiler les cadres de couleur.
- Icônes simples sémantiques ; zones de clic confortables y compris avec gants fins ou fatigue.
- États : chargement, attente GPS, permissions, connexion BT, panne, pause, sync différée, export, offline, reprise de séance. États non ambigus.
- Animations discrètes et désactivables ; aucune animation ne doit retarder pause/fin.
- Écrans 320/375/393/430 px iPhone, paysage limité, tablettes/desktop via adaptation responsive et test clavier.
- Contrôle volume et voix accessibles avant la séance, non bloquant au moment du départ.

## 6. Parcours utilisateurs critiques

### Parcours A : débutant sans montre
Créer profil → objectif courir 5 km sans temps → plan avec jours de repos/force/mobilité → extérieur course → GPS téléphone → audio si souhaité → séance guidée → félicitations et récupération.

### Parcours B : Enduro 2 + HRM-Pro Plus
Préparer course ResurGo → monter ceinture ANT+ Garmin et BLE iPhone → démarrer Garmin native → si protocole validé synchroniser état/mesures → ResurGo privilégie ceinture pour FC, montre pour GPS si *reçu*, iPhone en secours → résultat canonique unique.

### Parcours C : Apple Watch sans casque
Sélection séance → démarrer via app ResurGo watchOS → données miroir iPhone → consigne transmise à montre et lue sur haut-parleur *si compatible* → contrôle pause/reprise cohérent → sauvegarde unique.

### Parcours D : tapis Bluetooth
Sélection course intérieure → scan FTMS → capacité et données validées → démarrage → perte de connexion → suspendre les conseils vitesse/distance et avertir → reprise seulement après retour de mesures exploitables.

### Parcours E : semaine avec douleur
Check volontaire → programme ajusté (suspendre hausse charge, proposer repos/mobilité tolérable) → séance de renforcement si adaptée et choisie → suivi lendemain → explication de l'adaptation sans diagnostic.

## 7. Validation UX requise avant le développement global

- Prototype de 5 écrans clefs : Aujourd'hui, Programme, Préflight, Live, Récupération ; état clair et sombre.
- Tests avec débutant, coureur, cycliste, personne âgée/vision réduite ; scénario séance arrêtée, GPS indisponible, audio absent.
- Validation par Damien : navigation, style couleur, position des actions, écran de profil, identité vocale.
- Aucun texte à caractère médical trop affirmatif ; montrer clairement « mesure » vs « estimation ».

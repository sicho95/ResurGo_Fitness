# Catalogue vocal et grammaire de coaching — cahier de production audio

**Statut :** personnalité chaleureuse et encourageante, **deux voix naturelles PRÉGÉNÉRÉES par synthèse vocale**, fichiers audio locaux offline et identités masculine/féminine pérennes = **CONFIRMÉ par Damien le 2026-10-30**. Textes, choix de fournisseur, modèle et paramètres exacts = **À VALIDER**.

## 1. Principes

- Pas de LLM dans ResurGo et pas de génération de phrase ou de voix via un service pendant l'activité.
- Les clips sont **synthétisés à l'avance** par un moteur vocal naturel, en lots de production, **non enregistrés manuellement**. La génération des nouveaux clips doit réutiliser **exactement la même identité de voix masculine ou féminine** et la même recette de génération lorsque c'est techniquement possible. Les clips sont produits une fois par version, puis distribués pour exécution locale.
- Sélection du timbre indépendante du profil/sexe ; voix naturelles, chaleureuses, sincères, jamais culpabilisantes ni monotones.
- Déclencheur sportif explicite et vérifiable, priorité sécurité et anti-répétition ; les encouragements ne doivent pas se multiplier simplement parce qu'un temps s'écoule.
- Chaque fin de séance possède au moins une phrase positive adaptée au résultat réel.
- Aucune phrase ne dit « record » sans record confirmé ; « tout va bien » sans mesure n'est pas une assurance médicale.
- Les valeurs numériques variables sont traitées par grammaire audio soignée, avec raccords prosodiques ; repli TTS local uniquement si utilisateur l'accepte et lorsque le fichier manque, pas une dépendance produit.

## 2. Modèle d'une intention vocale

```json
{
  "phraseId": "hill_recovery_001",
  "intent": "POST_CLIMB_RECOVERY",
  "locale": "fr-FR",
  "text": "La montée est derrière toi. Profite de cette portion facile pour récupérer.",
  "tone": "warm_reassuring",
  "priority": "advice",
  "requires": ["terrain_recent_climb", "safe_signal"],
  "forbids": ["safety_alert_active", "interval_sprint_active"],
  "minGapByIntentSec": null,
  "maxUsesPerActivity": null,
  "assets": {
    "voice_feminine_v1": "voice/fem/hill_recovery_001.m4a",
    "voice_masculine_v1": "voice/masc/hill_recovery_001.m4a"
  }
}
```

Le `phraseId`, la version et les conditions sont stables. Le moteur renvoie des intentions non des chaînes de texte libres. Les compteurs, cool-downs et durées de silence sont **à calibrer** avec des séances réelles.

## 3. Banques d'intentions et exemples

Chaque ligne est un **texte candidat** à relire/valider avant enregistrement. Une phrase de secours/sécurité doit rester factuelle.

### A. Départ et mise en rythme — START / SETTLE

1. « C'est parti. Prends le temps de trouver ton rythme. »
2. « On commence tranquillement. Tu as toute la séance devant toi. »
3. « Voilà, installe-toi dans une allure confortable. »
4. « Laisse le souffle se mettre en place progressivement. »
5. « Prends tes repères, inutile de partir trop vite. »
6. « Très bien, profite des premières minutes pour te mettre en route. »
7. « Garde une foulée souple, ton rythme viendra naturellement. »
8. « On avance à ton rythme, un pas après l'autre. »

### B. Endurance facile et constance — EASY / STABLE

9. « C'est bien, le rythme est régulier. »
10. « Tu gères ton effort, continue comme ça. »
11. « Rien à forcer pour le moment, garde cette facilité. »
12. « La régularité d'aujourd'hui construit les progrès de demain. »
13. « Prends plaisir à cette allure, elle a toute son utilité. »
14. « Une sortie facile compte vraiment dans ta progression. »
15. « Reste détendu, c'est une belle séance de travail. »
16. « Très bien, laisse les kilomètres défiler naturellement. »

### C. Montée et gestion mentale — CLIMB

17. « La pente commence. Ajuste ton effort, pas besoin de garder l'allure du plat. »
18. « Regarde quelques mètres devant toi. Une foulée après l'autre. »
19. « Ne cherche pas le sommet tout de suite, avance progressivement. »
20. « Tu peux raccourcir naturellement tes pas si c'est plus confortable. »
21. « Garde un rythme qui te permet de maîtriser ton souffle. »
22. « Tu avances, c'est ce qui compte dans cette montée. »
23. « Ne te bats pas contre le relief, adapte-toi à lui. »
24. « Reste relâché autant que possible, on progresse pas à pas. »

### D. Sommet, descente et récupération — CREST / DESCENT / POST_CLIMB

25. « La montée est passée. Prends quelques instants pour souffler. »
26. « Profite du plat pour retrouver un effort confortable. »
27. « Pas besoin de rattraper le temps perdu tout de suite. »
28. « La descente t'aide déjà à avancer. N'en rajoute pas. »
29. « Laisse ta foulée revenir sans forcer. »
30. « Bien joué pour cette côte, prends le temps de récupérer. »
31. « Relâche les épaules, retrouve progressivement tes sensations. »
32. « Très bien, si l'effort se stabilise, on reprendra tranquillement. »

### E. Difficulté et ajustement — STRUGGLE / ADJUST

33. « Si ce rythme devient trop dur, on peut lever légèrement le pied. »
34. « Concentre-toi sur le prochain petit objectif, pas sur toute la distance. »
35. « Tu peux ralentir, l'important est de bien gérer ton effort. »
36. « On reste patient, il n'y a rien à gagner à tout donner d'un coup. »
37. « Prends quelques respirations naturelles et retrouve ton confort. »
38. « Tu as le droit d'adapter ta séance, c'est aussi bien s'entraîner. »
39. « Un passage difficile ne résume pas toute ta course. »
40. « Garde le mouvement le plus confortable possible. »

### F. Fractionné et récupérations — INTERVAL / REST

41. « Le prochain effort approche. Prépare-toi progressivement. »
42. « Encore quelques instants, garde le contrôle de ton allure. »
43. « Fin de répétition. On passe en récupération. »
44. « Récupère à ton rythme, ne force pas l'allure de repos. »
45. « Tu peux prolonger la récupération si tu en as besoin. »
46. « Très bien, cette répétition est terminée. »
47. « La prochaine séquence commence dans quelques instants. »
48. « C'est reparti, retrouve progressivement l'intensité prévue. »

### G. Ravitaillement et stratégie — AID / RACE

49. « Un ravitaillement approche, décide selon tes besoins. »
50. « Tu connais ce point d'eau, il arrive bientôt. »
51. « Reste concentré sur ton effort, pas seulement sur le chrono. »
52. « Cette partie est exigeante, gère ton énergie pour la suite. »
53. « Tu es à mi-parcours, continue de suivre tes sensations. »
54. « Si tu as prévu un apport testé à l'entraînement, vérifie ton plan. »
55. « La fin approche, garde un effort contrôlé. »
56. « Tu peux ajuster l'objectif, l'essentiel est de finir en sécurité. »

### H. Motivation et bien-être — POSITIVE

57. « Tu prends du temps pour toi, et c'est précieux. »
58. « Aujourd'hui, tu construis quelque chose pour la suite. »
59. « Il n'y a pas de petit effort quand on avance avec régularité. »
60. « Tu fais du bon travail, même sans courir plus vite. »
61. « Très bien, profite simplement de ce moment. »
62. « Tu peux être fier de la constance que tu construis. »
63. « Chaque séance a sa place dans ton parcours. »
64. « Ce n'est pas une compétition contre les autres. »

### I. Fin de séance — FINISH_SUCCESS / FINISH_MISSED / FINISH_STOP

65. « Bravo, tu as terminé ta séance. Savoure cet instant ! »
66. « Félicitations, quelle belle régularité aujourd'hui. »
67. « C'est fini pour aujourd'hui. Tu peux être content de cet effort. »
68. « Nouveau record confirmé ! Bravo, profite de ce résultat. »
69. « Tu n'as pas atteint le chrono espéré, mais cet effort compte. Bravo. »
70. « Aujourd'hui était plus difficile. Merci d'avoir écouté tes sensations. »
71. « Tu as préféré t'arrêter, et c'était peut-être le choix le plus prudent. Prends soin de toi. »
72. « Bravo pour ton engagement. On analysera le résultat tranquillement. »
73. « Le chrono ne raconte pas toute la séance. Félicitations pour ce que tu as fait. »
74. « Prends le temps de récupérer et de savourer ce moment. »

### J. Récupération, mobilité, repos — RECOVERY

75. « Aujourd'hui, la récupération fait partie de ton entraînement. »
76. « Une journée plus douce peut aussi faire progresser sur la durée. »
77. « Fais les mouvements tranquillement, sans chercher à forcer l'amplitude. »
78. « Respecte les sensations de ton corps, les progrès prennent du temps. »
79. « Tu peux choisir le repos complet si la récupération active ne te convient pas. »
80. « Bien joué d'avoir pris ce temps pour bouger avec douceur. »

## 4. Messages de sécurité réservés — SAFETY

Ils ne sont **pas** des encouragements et ne doivent jamais être choisis uniquement pour varier le style.

- « Arrête l'effort. Les symptômes que tu as indiqués nécessitent de privilégier ta sécurité. »
- « Si tu as un malaise, une douleur thoracique ou des difficultés importantes à respirer, arrête-toi et demande de l'aide. »
- « Je ne reçois plus de mesure cardiaque fiable. Je ne peux plus te conseiller à partir de ton cardio. »
- « La connexion à la machine est interrompue, les consignes d'allure sont suspendues. »
- « La précision GPS est insuffisante. Je ne vais pas te donner de consigne de vitesse pour l'instant. »

**Validation médicale et de sécurité nécessaire** avant diffusion, avec localisation des instructions de secours.

## 5. Production et stockage

- Générer **par synthèse naturelle** 2 jeux de clips, chacun avec une même identité sonore et plusieurs tonalités autorisées ; ne pas confondre génération initiale et lecture locale.
- Enregistrer un **VoiceIdentityManifest** immuable par voix : `voiceId`, `genderPresentation`, `locale`, `ttsProvider`, `ttsModel`, `modelVersion`, `providerVoiceId`, `speakerReferenceId` ou `speakerEmbeddingRef` si utilisable et légal, `stylePreset`, `prosodyParams`, `pronunciationLexiconVersion`, `generationPromptVersion`, `sampleRate`, `codec`, `license`, `createdAt`, `revision`, `goldenSampleChecksums` et versions de recettes.
- Les paramètres déterministes tels que `seed`/`speakerId` sont sauvegardés **seulement si le modèle les expose**. Une simple graine ne garantit pas une voix identique si le fournisseur change de modèle ou supprime le preset ; conserver les rendus masters et références autorisées. Aucun clonage de personne réelle sans consentement et droits adaptés.
- Toute nouvelle phrase est générée en réutilisant le manifeste d'identité et le rendu de référence, puis comparée à des échantillons de contrôle pour cohérence de timbre, articulation, accent et intensité émotionnelle.
- Conserver les **masters audio**, les fichiers compressés prêts à distribuer, le manifeste et le catalogue des textes avec checksums, licences et politique de versionnage. Ne pas exposer des embeddings ou secrets de fournisseur dans le bundle public.
- Les phrases complètes sont préférées pour les conseils courants ; bibliothèque numérique (mètres, kilomètres, chrono, battements, watts) à construire avec enchaînements naturels.
- Convention de version `voicePack/fr-FR/feminine-v1`, `voicePack/fr-FR/masculine-v1` ; checksum et taille ; droits/licences explicites.
- Catalogue offline téléchargé ou intégré, cache avec intégrité, préchargement des messages de sécurité et de fin ; si téléchargement échoue et pas de voix disponible, affichage/haptique et signal d'indisponibilité honnête.
- Ne pas inclure de voix clonée d'une personne réelle sans autorisation explicite.
- Test de volume en présence de musique externe, de casque/micro, sur iPhone et Apple Watch.

## 6. Arbitrage vocal : exemple

À chaque événement :
1. Filtrer les candidats dont les preuves sont absentes ou périmées.
2. Bloquer toute consigne de performance si sécurité active.
3. Écarter les intentions incompatibles (« accélère » et « récupère » simultanés).
4. Prioriser sécurité > phase > terrain/charge > ravitaillement > information > encouragement.
5. Éviter répétitions de même `phraseId` ou `intent` ; choisir variation validée.
6. Résoudre nombre/distance dans une phrase pré-assemblée si prononciation testée.
7. Jouer au bon endroit et tracer `deliveredTo` / `playedAt` ; si impossible, ne pas marquer « entendu ».

Les valeurs de cooldown, intensité de parole et proportion de motivation restent **Question à Damien / essais utilisateurs** ; ne jamais fixer une cadence bavarde arbitraire.

## 7. Points à faire valider

- Les 80 formulations ci-dessus sont des **exemples candidats**, non une approbation de leur texte exact.
- La demande explicite « voix naturelles prégénérées par l'assistant, identité vocale masculine et féminine conservée pour les prochaines générations » ne signifie **pas** que les fichiers audio existent déjà : leur génération réelle et un contrôle qualité doivent précéder la livraison de cette fonctionnalité.
- Choix des 2 voix réelles, tonalités, débit, accent, saturation et équilibre avec la musique.
- Ajout ultérieur de catalogues par discipline (vélo, elliptique, marche-course) avec mêmes intentions et langage adapté.
- Une bibliothèque d'environ 150–200 formules distinctes est suggérée, pas une contrainte décidée quant au nombre.

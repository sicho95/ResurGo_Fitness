# Arbitrage confirmé : ResurGo PWA exclusivement, montres comme capteurs facultatifs — 30/10/2026

**Statut : DÉCISION EXPLICITE de Damien.** Ce document **remplace** toutes les intentions incompatibles d'un compagnon natif iOS ou watchOS dans les documents antérieurs ; ces intentions sont conservées comme **historique abandonné**, pas comme roadmap active.

## Décision utilisateur — non négociable

1. **Une seule PWA ResurGo Fitness sur le téléphone**, avec interface très soignée inspirée des conventions iOS natives, mais **pas d'application iOS native ResurGo**.
2. **Pas d'application watchOS ResurGo à développer, signer, diffuser ni renouveler.** Damien n'a pas de compte Apple Developer et refuse une solution dépendant du renouvellement périodique d'un certificat de développement gratuit.
3. L'Apple Watch Series 11 de Claire **accompagne son iPhone**. Elle peut être traitée comme un **capteur facultatif** selon les protocoles réellement exposés, à l'image des Garmin et autres montres compatibles.
4. Le téléphone reste **le moteur et le GPS de référence en extérieur** lorsqu'une meilleure source validée n'est pas effectivement accessible ; la séance ResurGo ne dépend d'aucune montre, ceinture ou appareil complémentaire.
5. La priorité théorique de la source montre par rapport au GPS du téléphone n'implique **pas** que la montre diffuse ses coordonnées, altitude ou vitesse : chaque métrique est distincte et doit être disponible par un protocole vérifié.
6. L'Apple Watch **ne doit pas être proposée comme écran autonome ResurGo**, ni comme source de diffusion des messages vocaux ResurGo ; les messages partent de la PWA sur iPhone et de sa sortie audio autorisée.
7. L'absence de connexion capteur ne bloque **jamais** la course/vélo extérieur, mais bloque bien un coaching d'intérieur si aucune machine ne transmet réellement des mesures de progression pertinentes (FC seule insuffisante).

## Limites vérifiées des plateformes (30/10/2026)

### Safari PWA iOS

Safari iOS 26.x et 27 ne proposent pas nativement **Web Bluetooth** (`navigator.bluetooth`) pour l'accès GATT. Donc aucune PWA ResurGo standard sur les iPhone de Damien/Claire ne peut promettre une lecture directe des profils BLE FC, FTMS, cadence/puissance depuis la page, même si le hardware Bluetooth existe.

Référence : https://caniuse.com/web-bluetooth ; https://webkit.org/status/ ; https://bugs.webkit.org/show_bug.cgi?id=101034

### Extensions tierces Safari

Il existe des extensions natives tierces qui ajoutent `navigator.bluetooth` dans **Safari** (exemple **beacio**, iOS 26.2+). Cela peut permettre de tester le **même code PWA Web Bluetooth** dans Safari si l'utilisateur **installe lui-même** l'extension via App Store, sans créer ni signer une app ResurGo. **Attention : ne pas promettre le fonctionnement dans la PWA lancée depuis l'icône d'accueil** ; tester précisément Safari onglet vs mode standalone. Les permissions Bluetooth et les périphériques compatibles restent nécessaires.

Référence : https://beacio.com/product.html ; https://apps.apple.com/fr/app/beacio/id6761301368

### Garmin

Garmin confirme qu'une Enduro 2 peut diffuser la **fréquence cardiaque** sur Bluetooth (sur modèles compatibles et mode activé). Cela ne prouve pas que la Garmin expose simultanément par le même profil BLE son GPS, son altitude barométrique, sa vitesse ou sa distance native dans une séance normale. Elle **reste propriétaire de l'enregistrement d'activité Garmin** ; la PWA reçoit uniquement les métriques disponibles.

Référence : https://support.garmin.com/fr-FR/?faq=Zj1947s6pqAHzBCAhLhrC9

### Apple Watch

L'Apple Watch standard **ne se transforme pas automatiquement en ceinture cardiaque Bluetooth générique**, et la PWA Safari ne peut pas lire directement HealthKit. L'utilisateur peut **facultativement** installer une application **déjà distribuée via l'App Store** qui diffuse la fréquence cardiaque Apple Watch par BLE Heart Rate Service, sans compte développeur ResurGo ni signature manuelle (ex. HeartBLE ou équivalent). Cette option introduit **une application tierce**, un coût/licence possible et nécessite toujours un navigateur/extension PWA effectivement capable de capter BLE.

Références : https://apps.apple.com/fr/app/heartble-heart-rate-monitor/id6758879454?platform=watch ; https://developer.apple.com/health-fitness/ ; https://caniuse.com/web-bluetooth

### Intérieur / machines

L'adaptateur FTMS `0x1826` peut être implémenté dans la PWA mais reste **indisponible sur Safari natif** tant que Web Bluetooth n'est pas exposé. Une extension tierce peut constituer une piste de test sur navigateur, pas une compatibilité assurée. Un équipement dit « Bluetooth » n'est pas nécessairement FTMS ; le modèle exact et ses caractéristiques GATT sont à vérifier. N'ouvrir aucune séance intérieure sans données machine validées.

## Implémentation ciblée PWA

- L'application montre un panneau **Sources des données** : GPS téléphone disponible / FC externe non accessible / adaptateur BLE détecté et disponible / machine non connectée.
- Les adaptateurs métriques portent un état `UNSUPPORTED`, `UNAVAILABLE`, `CONNECTING`, `LIVE`, `STALE`, `LOST`, jamais d'affichage fictif « connecté ».
- Les sources disponibles peuvent enrichir FC, vitesse, cadence, puissance, inclinaison, etc. selon profils réellement supportés et priorité qualité/fraîcheur.
- En absence de BLE sur iPhone, afficher un **message technique clair**, proposer l'usage GPS téléphone et éventuellement le parcours externe de compatibilité **optionnel**, sans obliger l'utilisateur à installer quelque chose pour courir.
- La voix est lue sur l'iPhone/casque; aucune promesse de son via haut-parleur Apple Watch.
- Pas de cible watchOS autonome dans les builds et feuilles de route. Aucun renouvellement de certificat requis pour **l'application ResurGo**.

## Différences capitales entre souhait et disponibilité

| Souhait | État démontrable |
|---|---|
| PWA iPhone seule + GPS et coaching extérieur | Réalisable dans les limites du suivi en arrière-plan Safari |
| Récupérer FC de Garmin Enduro 2 | La montre sait diffuser, mais **PWA Safari standard ne peut pas l'écouter** en BLE |
| Récupérer FC Apple Watch | App tierce App Store de diffusion nécessaire, et navigateur/extension prenant en charge BLE |
| Récupérer GPS/altitude/vitesse native des montres en direct | **Non établi** par la simple diffusion FC BLE, ne pas promettre |
| Indoor FTMS BLE sur PWA Safari standard | **Non pris en charge nativement** |
| App watchOS ResurGo et audio au haut-parleur montre | **Hors périmètre confirmé**, même si un développement natif serait autrement possible |

## Critères de recette

- Aucun écran ne promet l'Apple Watch comme application ResurGo autonome ni « connectée » sans flux valide.
- Garmin / Apple Watch : distinguer montre détectée, profil FC standard disponible, FC réellement reçue, session GPS native non accessible.
- iPhone Safari sans extension : coaching course/vélo extérieur fonctionnel GPS seul; bouton Bluetooth doit expliquer indisponibilité sans faux appairage.
- Si l'utilisateur teste une extension Safari et une application de diffusion tierce : mesurer vraie présence de `navigator.bluetooth`, qualité FC, interruptions, comportement PWA installée, et compatibilité iOS 26 / 27 ; pas de succès inventé.
- Interior : interdiction du coaching sans caractéristiques machine prouvées.
- Pas d'intégration native non signable ni de compte Apple Developer demandés par le produit.
- Afficher le mode GPS seul et les conséquences du verrouillage de l'iPhone.

## Remarque sur la continuité documentaire

En cas de conflit avec `01_SPEC_FONCTIONNELLE.md` (ancien FON-054), `02_ARCHITECTURE_TECHNIQUE.md` (anciens compagnons iOS/watchOS), `06_DECISIONS_QUESTIONS_SOURCES.md` (DEC-011), **cette décision du 30/10/2026 est la plus récente et fait autorité**. Les anciennes propositions restent lisibles pour traçabilité seulement. À refléter dans la copie privée SichoBrain KOS.

# ResurGo — Bluefy, cardio BLE et machines FTMS (PWA exclusivement)

**Statut : développement et tests simulés sur branche `feature/resurgo-sync-funnel-20261030`, sans test sur appareil iPhone/Bluefy physique.** Dernière mise à jour : 2026-10-30.

## Décisions utilisateur

- Aucune application iPhone/watchOS à signer. ResurGo reste PWA à apparence iOS native.
- Utiliser **Bluefy** comme navigateur iOS disposant de Web Bluetooth, lorsqu'un utilisateur souhaite accéder à un capteur Bluetooth compatible.
- Le GPS téléphone suffit pour lancer course et vélo **extérieurs**.
- L'**intérieur** n'est guidé que si une vraie machine transmet des mesures de vitesse/distance via Bluetooth ; un cardio seul est insuffisant.
- Les préférences de source restent ceinture FC > montre FC > machine FC, et montre GPS/altitude > iPhone **uniquement pour les mesures réellement disponibles**.
- Le mode PWA autonome Apple Watch, le Bluetooth GATT natif Safari et l'émulation Web d'une machine FTMS par l'iPhone ne sont pas pris en charge.

## Ce qui a été codé dans la PWA

- `app/ble-bluefy.js` : connexion GATT **lecture seule** à Heart Rate Service `0x180D` / Heart Rate Measurement `0x2A37`, y compris formats FC 8 et 16 bits, absence de valeur fictive ; et Fitness Machine Service `0x1826` pour tapis `0x2ACD`, cross-trainer/elliptique `0x2ACE`, vélo intérieur `0x2AD2`, uniquement en notifications de caractéristiques réellement présentes.
- `app/sensor-fusion.js` : choix d'une source par **métrique**, ordre de fiabilité, fraîcheur des échantillons, invalidation au-delà de la durée de vie (par défaut 9 secondes pour BLE).
- `app/views-settings-stats.js` : section **« Capteurs Bluetooth · Bluefy ⓘ »**, qui comprend étapes pratiques Bluefy, lien App Store, adresse HTTPS PWA calculée depuis l'URL ouverte, bouton de copie, sélecteur du type FC et du type machine, connexion/déconnexion et indicateur de statut. Un raccourci **ⓘ** est aussi dans le coach en direct.
- `app/coach-live.js` : précontrôle intérieur exige une **mesure fraîche de vitesse/distance** et la bonne catégorie de machine. Déconnexion ou mesures périmées = **suspension des instructions fondées sur l'avancement** ; reprise manuelle après reconnexion. Distance réelle cumulée quand la machine l'émet ; estimation explicite par intégration des vitesses mesurées dans le cas contraire. Pas de GPS fictif à l'intérieur.
- `scripts/build-static.mjs` : modules inclus dans le bundle PWA ; `app/app-init.js` connecte tous les boutons à des événements utilisateur, nécessaires pour déclencher le sélecteur Bluetooth.

### Guide d'utilisation (repris dans le ⓘ de l'application)

1. Activer Bluetooth sur l'iPhone ; allumer la ceinture, la Garmin en mode diffusion cardio, la montre équipée d'un relais BLE, ou la machine FTMS.
2. Installer [Bluefy](https://apps.apple.com/fr/app/bluefy-web-ble-browser/id1492822055) depuis l'App Store.
3. **Ouvrir directement l'adresse HTTPS de ResurGo dans Bluefy**. Ne pas essayer d'appairer dans la PWA autonome Safari : ce sont deux contextes de navigateur distincts et Safari iOS n'expose pas Web Bluetooth natif.
4. Dans ResurGo ouvert dans Bluefy, ouvrir Réglages → **Capteurs Bluetooth · Bluefy ⓘ**, sélectionner `ceinture` ou `montre` et cliquer `Connecter le cardio`. Autoriser l'appareil dans la fenêtre Bluetooth.
5. Pour la machine intérieure, choisir tapis / elliptique / vélo puis `Connecter machine FTMS`. Vérifier le statut : connecté ne suffit pas si aucune vitesse/distance n'est publiée. Démarrer l'intérieur seulement si le flux progressif est actif.
6. En cas de coupure, les mesures deviennent indisponibles et les recommandations dépendant du signal s'arrêtent. Le téléphone continue de faire GPS seul en extérieur.

**Important :** Bluefy dispose du contexte local de son propre navigateur, différent de Safari/PWA écran d'accueil. La convergence des profils passe par la synchronisation NAS **si installée et correctement configurée** ou l'export/import chiffré. Aucune synchronisation automatique entre Bluefy et Safari n'est supposée par l'installation de Bluefy seule.

## Limites sur les montres

- Garmin Enduro 2 et HRM-Pro Plus peuvent diffuser le cardio via profils standards dans les modes prévus, mais la diffusion du GPS/altitude Garmin n'est **pas démontrée** par la seule liaison cardio BLE.
- Une Apple Watch ne diffuse pas automatiquement sa FC comme une ceinture. Un logiciel tiers App Store capable d'émettre le profil GATT 0x180D peut éventuellement fournir la FC ; réception dans Bluefy doit être vérifiée sur matériel. Aucun compagnon watchOS ResurGo.
- L'iPhone exécutant une PWA Web Bluetooth joue le rôle de **central/client** GATT. Ce code ne l'émule pas comme machine Fitness GymKit/FTMS ; une API web générique ne publie pas un périphérique GATT serveur visible par la montre.
- Le comportement en écran verrouillé / arrière-plan, la reconnexion automatique, la lecture vocale et l'accès GPS continu sous Bluefy exigent une recette réelle sur iPhone : **non garantis**.
- Les appareils Decathlon, Concept2 ou autres doivent diffuser le vrai FTMS ; marque « Bluetooth » ne suffit pas. Les réglages de résistance, inclinaison et cadence **ne sont pas pilotés** par ResurGo.

## Champs FTMS traités

Le décodeur vérifie la longueur des paquets et les bits de présence. Pour tapis et vélo, les flags font 2 octets, pour elliptique/cross trainer 3 octets ; vitesse instantanée lorsqu'elle est présente, vitesse moyenne lorsque fournie, distance totale optionnelle, cadence optionnelle vélo. Les autres champs (puissance, résistance, inclinaison, fréquence cardiaque machine, métriques propres aux fabricants) ne sont pas encore implémentés et **ne sont pas inventés**. La distance estimée depuis la vitesse est explicitement étiquetée.

## Validation automatisée vs validation réelle

Tests dans `tests/resurgo-bluefy.test.mjs` : décodage FC 8/16 bits, rejet de troncature et de valeurs incohérentes, décodage tapis/vélo/elliptique, formats FTMS tronqués, hiérarchie FC et source périmée, visibilité de l'aide, simulation d'un appareil GATT et d'un flux de vitesse/distance. Workflow GitHub : `.github/workflows/resurgo-sync-candidate-tests.yml`, qui lance également les tests serveur, les tests backup/sync et le contrôle syntaxique du bundle.

**L'exécution CI confirme uniquement le code et les flux simulés. Aucun test physique n'a été fait sur Bluefy, HRM-Pro Plus, Enduro 2, Apple Watch Series 11 ni équipements intérieurs. Aucun déploiement NAS/Funnel n'est effectué à cette étape.** On ne considère pas la fonction entièrement « validée » avant la recette réelle.

## Sources techniques

- [Bluefy — guide officiel](https://bluefy.app/guide.html)
- [Bluefy — navigateur BLE iOS](https://bluefy.app/)
- [App Store Bluefy](https://apps.apple.com/fr/app/bluefy-web-ble-browser/id1492822055)
- [Bluetooth SIG — Fitness Machine Service 1.0.1](https://www.bluetooth.com/specifications/specs/fitness-machine-service-1-0-1/)
- [FTMS Cross Trainer Data, description des flags à 3 octets](https://aifitnessapi.com/bluetooth-fitness/cross-trainer-data)

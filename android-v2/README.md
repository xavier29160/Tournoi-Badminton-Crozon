# Tournoi Badminton Crozon V2

Application Android hors connexion, issue du projet V3 du ZIP original.

Version 2.2 : impression dédiée des feuilles de poules depuis Matchs, Classement ou Plus. Choix d’une poule ou de toutes les poules de la catégorie active ; une page A4 par poule avec équipes, matchs, scores et classement. Modes avec résultats actuels ou vierge à remplir à la main. Impression Android ou enregistrement PDF depuis le dialogue système. Les feuilles sont réduites automatiquement si nécessaire pour tenir sur une page.

Version 2.1 : interface sportive avec typographie Barlow intégrée hors connexion, tableau de bord, navigation inférieure sur téléphone, réglages repliables, tableaux principal/consolante à onglets et scores alignés sans perte de focus. Le menu Plus donne accès au répertoire et aux sauvegardes. Les données 2.0 sont conservées lors d’une mise à jour signée avec le même certificat.

## Préservation de la V1

Le ZIP `Projet_Android_Tournoi_Crozon_V3.zip` et son workflow restent inchangés.
La V2 utilise l’identifiant Android `fr.crozon.badminton.v2` : les deux applications peuvent coexister et leurs stockages sont séparés. Pour reprendre des résultats de la V1, exporter son JSON puis le restaurer dans la V2. Aucune application ne peut lire automatiquement le stockage privé de l’autre.

## Fonctionnement

- Plusieurs tournois nommés ; catégories SH, SD, DH, DD, DM indépendantes.
- Les 18 équipes d’origine sont reprises dans le premier DM, dont Erwan / Maëlys en poule D.
- Création, modification, import en masse et déplacement d’équipes ; navigation par poule.
- Scores au meilleur de trois sets, classement conservé (victoires, confrontation directe, différences de sets et points). Le nombre de points reste libre comme dans la base ; aucun règlement fédéral n’est imposé.
- Matchs à jouer, en cours, terminés ; progression par poule et globale.
- Principal et consolante, 2 qualifiés par poule par défaut, réglable de 1 à 8. Qualifications provisoires avant la fin des poules.
- Exemptions automatiques, échange de têtes de série sans doublons, score de finale ou choix manuel du vainqueur. Modification d’un qualifié invalide les résultats qui en dépendent.
- Répertoire partagé classé par club ; recherche insensible aux accents ; propositions de joueurs et anciennes équipes dès la première lettre. Le champ de recherche d’anciennes équipes figure dans l’écran d’ajout d’équipe.
- Sauvegarde locale automatique et copie précédente ; export/restauration JSON de l’ensemble ; import des anciens JSON ; CSV de la catégorie active ; impression Android.
- Clair `#EDF0F3`, sombre `#292D33`, boutons `#214E87`.

Les clubs inconnus des listes initiales figurent dans « Sans club ». Les données ne sont pas synchronisées entre appareils. Exporter le JSON avant de désinstaller ou d’effacer les données Android.

## Compilation et contrôles

Android 8.0+ (API 26), SDK de compilation/cible 35, JDK 17, Gradle 8.9, Android Gradle Plugin 8.7.3.

Depuis la racine : `npm ci --ignore-scripts && npm test`.
Depuis `android-v2` : `gradle :app:assembleDebug :app:lintDebug --no-daemon`.

Le workflow **Android V2 — Tests et APK** exécute les tests, compile et publie `Tournoi-Crozon-V2-APK`. L’APK de développement est installable ; il ne constitue pas une version signée pour publication sur le Play Store. Le certificat debug généré par GitHub peut changer entre compilations ; conserver un export JSON avant une réinstallation.

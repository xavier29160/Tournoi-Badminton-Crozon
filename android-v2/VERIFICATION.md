# Vérification — 23 octobre 2026

## Résultats

- 16 tests automatisés réussis : moteur, interface intégrée, anciennes sauvegardes, tournois/catégories, répertoire, suggestions, scores et exemptions.
- Contrôle dans Chromium : formats 412 × 915 et 1366 × 900, navigation par poule, recherche sans accents, suggestions, tableaux, thème sombre et persistance après réouverture ; aucune erreur JavaScript ni débordement horizontal mobile.
- Compilation Android locale : `:app:assembleDebug :app:lintDebug`, JDK 17, Gradle 8.9, API 35 : réussite.
- Signature APK vérifiée avec `apksigner verify`.
- APK : `fr.crozon.badminton.v2`, version 2.0 (200), Android 8.0 minimum, cible Android 15.
- Analyse lint : 0 erreur, 2 avertissements attendus (JavaScript requis par l’interface locale ; attribut Retour réservé à Android 13 et versions suivantes).
- ZIP d’origine, README initial et workflow V1 inchangés.

## Limites et dépôt distant

Aucun essai sur téléphone Android physique n’a été effectué. Les dialogues système d’installation, d’export/import et d’impression restent à vérifier sur appareil.

L’accès au dépôt a été autorisé le 23 octobre 2026. La V2 est préparée sur la branche séparée `codex/android-v2`. Le workflow **Android V2 — Tests et APK** vérifie les sources et produit l’APK à chaque envoi ; consulter GitHub Actions pour son résultat. La branche principale et la V1 restent inchangées.

L’APK est une version de développement signée, installable à côté de la V1. Les sauvegardes de la V1 se transfèrent par fichier JSON, Android isolant le stockage privé des deux applications.

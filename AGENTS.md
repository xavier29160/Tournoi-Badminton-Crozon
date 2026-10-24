# Livraison Android

- L’application Android est dans `android-v2`. Garder son applicationId `fr.crozon.badminton.v2` et préserver le format des sauvegardes.
- Depuis la V2.2.2, tout APK remis à Xavier doit utiliser la même clé de signature permanente. L’archive privée `Tournoi-Crozon-signature-privee.zip` est conservée dans ses fichiers ChatGPT. Elle contient le keystore PKCS12 et les paramètres de signature. La récupérer pour signer les prochaines versions ; ne jamais régénérer une clé pour une simple mise à jour.
- Empreinte SHA-256 du certificat permanent : `42d65ad059d6a5b3ed1f76c3164e652a40668cb5161c519661f82cad26d5a3d3`.
- Ne jamais ajouter le keystore, son mot de passe ni cette archive au dépôt public. Les APK debug produits par GitHub Actions servent aux tests ; ne pas les distribuer directement, car leur certificat change d’une compilation à l’autre.
- Vérifier la signature de l’APK final avant livraison. Les anciens APK 2.2 et 2.2.1 avaient des certificats différents : la transition vers 2.2.2 nécessite une sauvegarde JSON puis une réinstallation unique. Les versions suivantes doivent s’installer comme mises à jour avec le certificat permanent.
- L’impression demandée est un bouton `Imprimer` directement à côté du titre de chaque poule, dans Équipes, Matchs et Classement. Il imprime uniquement cette poule sur une page A4 avec équipes, matchs et classement. Ne pas remplacer ce parcours par un passage dans Plus ou Sauvegardes.
- Validation : `npm test`, compilation et lint Android, puis test instrumenté `PoolPrintTest` sur Android 15 avec un WebView récent. Le test vérifie le bouton affiché et le document HTML dédié du pont Android, sans envoyer de tâche à une imprimante physique.

# Docker — Front (La Chaise du Savoir)

Checklist rapide
- [ ] Vérifier la présence d'un lockfile à la racine (`package-lock.json`, `yarn.lock` ou `pnpm-lock.yaml`).
- [ ] Construire l'image Docker.
- [ ] Lancer le conteneur en exposant le port (3000 par défaut).
- [ ] Fournir les variables d'environnement nécessaires (via `.env` ou `--env`).

Prérequis
- Docker installé et démarré.
- Placer-vous à la racine du projet (là où se trouve le `Dockerfile`).
- Un des lockfiles suivants doit être présent : `package-lock.json`, `yarn.lock` ou `pnpm-lock.yaml`.

1) Construire l'image (production)

Par défaut le `Dockerfile` utilise un argument `NODE_VERSION`. Exemple de build avec PowerShell :

```powershell
docker build --build-arg NODE_VERSION=24.13.0-slim -t la-chaise-front .
```

2) Lancer le conteneur (production)

Le conteneur écoute le port 3000. Exemples :

Démarrer en avant-plan :

```powershell
docker run --rm -p 3000:3000 --name la-chaise-front la-chaise-front
```

Démarrer en arrière-plan avec un fichier `.env` :

```powershell
docker run -d --name la-chaise-front -p 3000:3000 --env-file .env la-chaise-front
```

Consulter les logs :

```powershell
docker logs -f la-chaise-front
```

Arrêter et supprimer :

```powershell
docker stop la-chaise-front; docker rm la-chaise-front
```

3) Variables d'environnement importantes
- `PORT` — port exposé côté application (par défaut 3000 dans le `Dockerfile`).
- `NEXT_TELEMETRY_DISABLED=1` — désactive la télémétrie Next.js si souhaité.
- Toute variable spécifique à votre application doit être fournie au runtime (le `Dockerfile` ne copie pas automatiquement `.env`).

4) Erreurs courantes & solutions rapides
- "No lockfile found." → ajouter un lockfile à la racine.
- Build qui échoue localement → lancer `npm run build`/`yarn build` localement pour diagnostiquer.
- Port déjà utilisé → changer le mapping hôte:conteneur, ex. `-p 4000:3000`.
- `server.js` introuvable à l'exécution → vérifier que le build Next.js en mode `standalone` a bien généré le fichier `server.js` dans `.next/standalone`.

5) Rebuild et nettoyage

Rebuild sans cache :

```powershell
docker build --no-cache -t la-chaise-front .
```

Supprimer l'image :

```powershell
docker rmi la-chaise-front
```

6) Exemple minimal `docker-compose.yml` (optionnel)

Créer `docker-compose.yml` à la racine :

```yaml
version: "3.8"
services:
  front:
    build:
      context: .
      args:
        NODE_VERSION: 24.13.0-slim
    image: la-chaise-front
    ports:
      - "3000:3000"
    env_file:
      - .env
```

Démarrer avec compose :

```powershell
docker compose up --build
```

7) Notes sur le `Dockerfile` fourni
- Multi-stage build (stages `dependencies`, `builder`, `runner`) pour une image finale plus légère.
- Le stage `dependencies` détecte et utilise le lockfile présent (npm/yarn/pnpm).
- L'image finale exécute l'application en mode "standalone" via `node server.js` et tourne sous l'utilisateur non-root `node`.

8) Commandes utiles
- Lister images : `docker images`
- Lister conteneurs : `docker ps -a`
- Ouvrir un shell dans le conteneur (si démarré) :

```powershell
docker exec -it la-chaise-front sh
```

Si vous voulez que je :
- génère un `docker-compose.yml` personnalisé, 
- ajoute un exemple `.env.example`, 
- ou fournisse des commandes pour le développement (live-reload dans Docker),
précisez quoi et je l'ajoute.


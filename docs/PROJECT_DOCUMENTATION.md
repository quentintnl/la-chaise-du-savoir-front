# La Chaise du Savoir - Documentation Projet

## 📋 Résumé du Projet

**La Chaise du Savoir** est une application de jeu de culture générale basée sur des **duels multiplayer en temps réel**.

## Build sur Docker

Démarrer Docker Desktop
Lancer depuis un terminal de commande
"docker build -t la-chaise-du-savoir-front ."  
"docker run --name la-chaise-du-savoir-front -d -p 8080:80 la-chaise-du-savoir-front"

### Fonctionnalités Principales

- 🔐 **Authentification** : Inscription et connexion des utilisateurs
- 🎮 **Mode Duel** : Deux joueurs répondent à des questions de culture générale
- 📊 **Classement** : Suivi des points globaux et des win streaks
- ❓ **Questions Dynamiques** : Intégration avec une API externe de quizz

### Stack Technique

- **Backend** : Spring Boot (Java)
- **Base de Données** : MySQL (Docker)
- **Architecture** : REST API avec JWT pour l'authentification
- **API Externe** : Intégration avec une API de questions de quizz

---

## 🏗️ Architecture Générale

### Flux d'Utilisation

```
1. INSCRIPTION/CONNEXION
   ↓
   [Utilisateur obtient un JWT Token]
   ↓
2. ACCUEIL
   [Voir le classement, ses stats]
   ↓
3. CRÉER OU REJOINDRE UNE PARTIE
   ↓
   - Créer : Obtenir un code d'invitation (4 caractères)
   - Rejoindre : Entrer le code d'un ami
   ↓
4. ATTENDRE L'ADVERSAIRE
   ↓
5. JOUER
   [Recevoir les questions, répondre rapidement]
   ↓
6. RÉSULTATS
   [Voir qui a gagné, points gagnés, streak mis à jour]
```

### Composants Clés

| Composant | Rôle |
|-----------|------|
| **AuthService** | Gestion inscription/connexion, JWT |
| **MatchService** | Création de parties, gestion des duels |
| **QuestionService** | Récupération des questions depuis l'API externe |
| **RankingService** | Calcul des classements et points |

---

## 🔌 Endpoints de l'API Backend

### Base URL
```
http://localhost:8080/api
```

### 1️⃣ AUTHENTIFICATION (`/api/auth`)

#### **POST** `/signup`
Créer un nouveau compte utilisateur.

**Body :**
```json
{
  "login": "string (6-20 caractères)",
  "password": "string (6-20 caractères)"
}
```

**Response (201 Created) :**
```json
{
  "apiToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erreurs :**
- `400 Bad Request` : Données invalides ou utilisateur existant
- `500 Internal Server Error` : Erreur serveur

---

#### **POST** `/login`
Se connecter avec ses identifiants.

**Body :**
```json
{
  "login": "string",
  "password": "string"
}
```

**Response (200 OK) :**
```json
{
  "apiToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erreurs :**
- `401 Unauthorized` : Identifiants incorrects
- `500 Internal Server Error` : Erreur serveur

---

#### **POST** `/logout`
Se déconnecter (nécessite authentification).

**Headers :**
```
Authorization: Bearer <apiToken>
```

**Response (200 OK) :**
```json
{
  "message": "Déconnexion réussie"
}
```

---

### 2️⃣ QUESTIONS (`/api/questions`)

#### **GET** `/`
Récupérer les questions du quizz depuis l'API externe.

**Headers :**
```
Authorization: Bearer <apiToken>
```

**Response (200 OK) :**
```json
[
  {
    "type": "multiple",
    "difficulty": "easy|medium|hard",
    "category": "Science",
    "question": "Quel est le plus grand océan ?",
    "correct_answer": "Pacifique",
    "incorrect_answer": ["Atlantique", "Indien", "Arctique"]
  },
  ...
]
```

---

### 3️⃣ MATCHES / DUELS (`/api/match`)

#### **POST** `/create`
Créer une nouvelle partie de duel.

**Headers :**
```
Authorization: Bearer <apiToken>
```

**Response (200 OK) :**
```json
{
  "id": 1,
  "inviteCode": "A7K2",
  "status": false,
  "message": "Partie créée avec succès. Partagez le code d'invitation."
}
```

**Erreurs :**
- `401 Unauthorized` : Token invalide/expiré
- `500 Internal Server Error` : Erreur lors de la création

---

#### **POST** `/join`
Rejoindre une partie existante via un code d'invitation.

Une fois le second joueur connecté, le backend passe la partie en mode actif en mettant `status` à `true`.
Le front peut alors considérer que le duel peut commencer.

**Headers :**
```
Authorization: Bearer <apiToken>
```

**Query Parameters :**
- `inviteCode` : Code d'invitation (4 caractères)

**Response (200 OK) :**
```json
{
  "id": 1,
  "inviteCode": "A7K2",
  "status": true,
  "message": "Vous avez rejoint la partie avec succès."
}
```

**Erreurs :**
- `400 Bad Request` : Code invalide ou partie pleine
- `401 Unauthorized` : Token invalide

---

#### **GET** `/{matchId}/question`
Récupérer la liste des questions du duel.

Dans l'état actuel du backend, cet endpoint ne renvoie pas une question liée au `matchId`.
Il récupère les questions depuis l'API externe, les convertit en DTO et renvoie la liste complète.
Le front doit donc sélectionner et enchaîner les questions côté client.

**Headers :**
```
Authorization: Bearer <apiToken>
```

**URL Parameters :**
- `matchId` : ID de la partie

**Response (200 OK) :**
```json
{
  "type": "multiple",
  "difficulty": "medium",
  "category": "Histoire",
  "question": "En quelle année l'homme a-t-il marché sur la Lune ?",
  "correct_answer": "1969",
  "incorrect_answer": ["1967", "1971", "1965"]
}
```

---

#### **POST** `/{matchId}/winner`
Déclarer le gagnant du match.

Le backend actuel ne valide pas les réponses question par question sur cet endpoint.
Il incrémente simplement les points globaux du joueur authentifié de `1` et renvoie un message texte.
La logique de calcul des bonnes réponses, du temps de réponse et du score par manche doit donc être gérée côté front ou dans une évolution future du backend.

**Headers :**
```
Authorization: Bearer <apiToken>
```

**URL Parameters :**
- `matchId` : ID de la partie

**Response (200 OK) :**
```text
Match 1 won by user alice (total points: 42)
```

---

### Déroulé réel du duel

1. Un joueur crée une partie avec `POST /api/match/create`.
1. Le backend génère un code d'invitation à 4 chiffres et crée le match avec `status = false`.
1. Le second joueur rejoint avec `POST /api/match/join?inviteCode=XXXX`.
1. Si la partie n'est pas déjà pleine, le backend assigne `user2` et passe `status` à `true`.
1. Le front peut alors charger les questions avec `GET /api/match/{matchId}/question`.
1. Cet endpoint renvoie une liste de questions issues de l'API externe, pas une question persistée par match.
1. Le front gère l'ordre d'affichage, les réponses, le timer et le calcul du score.
1. Quand le duel est terminé, le front appelle `POST /api/match/{matchId}/winner` pour enregistrer le vainqueur.
1. Dans l'implémentation actuelle, ce dernier appel ajoute seulement `1` point global au joueur authentifié.

---

### 4️⃣ CLASSEMENTS (`/api/ranking`)

#### **GET** `/global`
Obtenir le classement global de tous les joueurs (par points).

**Headers :**
```
Authorization: Bearer <apiToken>
```

**Response (200 OK) :**
```json
[
  {
    "rank": 1,
    "login": "player1",
    "globalPoints": 5000,
    "userWinstreak": 12
  },
  {
    "rank": 2,
    "login": "player2",
    "globalPoints": 4500,
    "userWinstreak": 8
  },
  ...
]
```

---

#### **GET** `/winstreak`
Obtenir le classement des win streaks (meilleure série de victoires).

**Headers :**
```
Authorization: Bearer <apiToken>
```

**Response (200 OK) :**
```json
[
  {
    "rank": 1,
    "login": "player1",
    "globalPoints": 5000,
    "userWinstreak": 25
  },
  ...
]
```

---

#### **GET** `/user/{userId}`
Obtenir le rang et stats d'un utilisateur spécifique.

**Headers :**
```
Authorization: Bearer <apiToken>
```

**URL Parameters :**
- `userId` : ID de l'utilisateur

**Response (200 OK) :**
```json
{
  "rank": 5,
  "login": "player1",
  "globalPoints": 4200,
  "userWinstreak": 15
}
```

**Erreurs :**
- `404 Not Found` : Utilisateur non trouvé

---

#### **POST** `/user/{userId}/add-points`
Ajouter des points à un utilisateur (usage interne backend).

**Headers :**
```
Authorization: Bearer <apiToken>
```

**URL Parameters :**
- `userId` : ID de l'utilisateur

**Query Parameters :**
- `points` : Nombre de points à ajouter (integer)

**Response (200 OK) :**
```json
{
  "id": 1,
  "login": "player1",
  "globalPoints": 4210,
  "userWinstreak": 15
}
```

---

## 📊 Modèles de Données

### Entités JPA (Base de Données)

#### **User**
```java
{
  id: Integer (PK),
  login: String (unique, 50 chars max),
  password: String (255 chars),
  userWinstreak: Integer (défaut: 0),
  globalPoints: Integer (défaut: 0)
}
```

**Utilité** : Représente un compte utilisateur avec ses stats.

---

#### **GameMatch**
```java
{
  id: Integer (PK),
  user1: User (FK),
  user2: User (FK, nullable - peut être seul au départ),
  inviteCode: String (4 chars, unique),
  created_at: Date,
  status: Boolean (true = en cours, false = terminée)
}
```

**Utilité** : Représente une partie (duel) entre deux joueurs.

---

#### **Rounds**
```java
{
  id: Integer (PK),
  match: GameMatch (FK),
  round_number: Integer,
  total_question: Integer
}
```

**Utilité** : Représente un round (série de questions) dans une partie.

---

#### **RoundAnswer**
```java
{
  id: Integer (PK),
  round_id: Rounds (FK),
  player_id: Integer,
  correct_answers: Integer
}
```

**Utilité** : Enregistre les réponses d'un joueur dans un round.

---

#### **Session**
```java
{
  id: Integer (PK),
  user: User (FK),
  apiToken: String (JWT),
  created_at: Date,
  expires_at: Date
}
```

**Utilité** : Gère les sessions authentifiées (tokens JWT).

---

#### **Win**
```java
{
  id: Integer (PK),
  match: GameMatch (FK),
  winner: User (FK),
  points_earned: Integer
}
```

**Utilité** : Enregistre les victoires et points gagnés.

---

#### **WinSession**
```java
{
  id: Integer (PK),
  session: Session (FK),
  win: Win (FK)
}
```

**Utilité** : Relie les sessions aux victoires.

---

### DTOs (Data Transfer Objects)

#### **AuthRequestDto**
```json
{
  "login": "string (6-20 chars, required)",
  "password": "string (6-20 chars, required)"
}
```

**Utilisation** : Inscription/Connexion

---

#### **AuthResponseDto**
```json
{
  "apiToken": "string (JWT token)"
}
```

**Utilisation** : Réponse après signup/login

---

#### **QuestionDto**
```json
{
  "type": "string (ex: 'multiple')",
  "difficulty": "string (easy|medium|hard)",
  "category": "string",
  "question": "string",
  "correct_answer": "string",
  "incorrect_answer": ["string", "string", "string"]
}
```

**Utilisation** : Récupération des questions depuis l'API

---

#### **MatchResponseDto**
```json
{
  "id": "integer",
  "inviteCode": "string (4 chars)",
  "status": "boolean",
  "message": "string"
}
```

**Utilisation** : Création/Réaction d'une partie

---

#### **RankingDTO**
```json
{
  "rank": "integer",
  "login": "string",
  "globalPoints": "integer",
  "userWinstreak": "integer"
}
```

**Utilisation** : Affichage des classements

---

#### **ErrorResponseDto**
```json
{
  "error": "string"
}
```

**Utilisation** : Réponses d'erreur

---

## 🔐 Authentification & Sécurité

### JWT Token
- **Format** : Bearer token
- **Headers à utiliser** : `Authorization: Bearer <token>`
- **Validation** : Le token est validé via `JwtAuthenticationFilter`
- **Expiration** : À définir dans la config

### Sécurité
- Les passwords sont hashés (bcrypt)
- Les endpoints protégés nécessitent une authentification JWT
- Les détails utilisateurs proviennent du token dans le contexte de sécurité Spring

---

## 💡 Guide d'Intégration Frontend

### 1. Authentification (Priorité 1)
```
[Page Signup/Login] → POST /api/auth/signup ou /api/auth/login
     ↓
  [Stocker le token JWT dans localStorage]
     ↓
  [Ajouter le header Authorization à toutes les requêtes]
```

### 2. Interface d'Accueil (Priorité 2)
```
[Afficher le classement] ← GET /api/ranking/global
[Afficher les stats de l'utilisateur] ← GET /api/ranking/user/{userId}
```

### 3. Création/Réaction Partie (Priorité 3)
```
[Bouton "Créer partie"] → POST /api/match/create
     ↓
[Afficher code d'invitation]

OU

[Input code] → POST /api/match/join?inviteCode=XXXX
```

### 4. Gameplay (Priorité 4)
```
[Attendre 2 joueurs] → `status = true` quand le second joueur rejoint

[Charger la liste de questions] ← GET /api/match/{matchId}/question
     ↓
[Le front enchaîne les questions et valide les réponses localement]
     ↓
[Déclarer le gagnant] → POST /api/match/{matchId}/winner
     ↓
[Actualiser le classement si besoin]
```

### 5. Résultats (Priorité 5)
```
[Afficher le gagnant et les points finaux]
[Actualiser le classement]
```

---

## 🎯 Points Importants pour le Frontend

- ✅ L'app doit être **la plus simple possible**
- ✅ Ajouter TOUJOURS le header `Authorization: Bearer <token>` sur tous les endpoints protégés (tout sauf `signup` et `login`)
- ✅ Stocker le token JWT de manière sécurisée (localStorage/sessionStorage)
- ✅ Gérer les erreurs HTTP (401 = ré-authentification, 400 = données invalides)
- ✅ Les questions viennent d'une API externe via le backend
- ✅ Le timing, l'ordre des questions et le calcul du score ne sont pas gérés par le backend sur l'endpoint match actuel
- ✅ Le backend expose surtout l'ouverture du duel, la récupération des questions et la déclaration du gagnant
- ✅ Le classement est disponible via les endpoints `/api/ranking`

---

## 📝 Exemple de Flux Complet

### Scénario : Alice vs Bob

```
1. Alice crée un compte
   POST /api/auth/signup
   Body: {"login": "alice", "password": "password123"}
   Response: {"apiToken": "token_alice"}

2. Bob crée un compte et se connecte
   POST /api/auth/signup
   Body: {"login": "bob", "password": "password456"}
   Response: {"apiToken": "token_bob"}

3. Alice crée une partie
   POST /api/match/create (avec token_alice)
  Response: {"id": 1, "inviteCode": "A7K2", "status": false}

4. Alice voit le code "A7K2" et le partage à Bob

5. Bob rejoint la partie
   POST /api/match/join?inviteCode=A7K2 (avec token_bob)
   Response: {"id": 1, "inviteCode": "A7K2", "status": true}

6. Le match commence (2 joueurs présents)
  Le front charge la liste des questions
   GET /api/match/1/question

7. Le front affiche les questions et calcule les réponses localement

8. Quand le duel est terminé, le front déclare le gagnant
  POST /api/match/1/winner

9. Le backend incrémente les points du vainqueur
  Alice gagne +1 point global dans l'implémentation actuelle
   GET /api/ranking/global pour voir le nouveau classement

10. Les deux joueurs voient le résultat et retournent à l'accueil
```

---

## 🚀 Prochaines Étapes

Pour le développement frontend :
1. Cloner le repo et mettre en place l'authentification
2. Implémenter les pages : Authentification → Accueil → Création/Réaction partie → Gameplay
3. Tester tous les endpoints avec le backend local (docker-compose up)
4. Gérer les états de l'application et le refresh du JWT si nécessaire

---

## 📞 Notes Techniques

- L'API utilise **Spring Boot**
- La base de données est en **MySQL** (accessible via Docker)
- Les endpoints retournent du **JSON**
- Les erreurs sont retournées avec des **codes HTTP standards**
- Les questions viennent d'une **API externe** (à intégrer au backend)
- La port par défaut est probablement **8080**

---

**Dernière mise à jour** : 5 juin 2026

# Contexte fondamental

## 1. SQL Supabase

Ouvre le **SQL Editor** de ton projet Supabase et exécute le fichier
[`supabase/migrations/20261121000000_fundamental_context.sql`](../supabase/migrations/20261121000000_fundamental_context.sql).
C’est la migration complète. Si tu appliques déjà les migrations avec `supabase db push`, ce fichier est pris en compte par ce flux.

La table `fundamental_context_blocks` stocke un enregistrement par utilisateur, lundi ISO et bloc. Les formulaires écrivent leur bloc indépendamment. Les règles RLS limitent chaque lecture et écriture au propriétaire connecté.

Dans **Authentication → Users**, crée un utilisateur avec une adresse e-mail confirmée et un mot de passe, ou utilise un compte existant qui accepte la connexion par e-mail et mot de passe. Les identifiants sont saisis uniquement dans la page.

Configure ces deux variables sur le service qui construit l’application, puis relance la compilation. Pour un test local, tu peux les définir avant de démarrer Vite.

```sh
export VITE_SUPABASE_URL='https://<reference-du-projet>.supabase.co'
export VITE_SUPABASE_PUBLISHABLE_KEY='<cle-publiable>'
npm ci
npm run dev
```

Utilise la clé publiable du projet Supabase. Les clés `service_role` et les clés secrètes sont réservées au serveur.

## 2. Fichiers complets

Les fichiers du dépôt contiennent l’implémentation complète. Les chemins sont relatifs à la racine du projet.

| Fichier | Rôle |
| --- | --- |
| [`supabase/migrations/20261121000000_fundamental_context.sql`](../supabase/migrations/20261121000000_fundamental_context.sql) | Table et politiques RLS |
| [`src/lib/fundamentalContext.ts`](../src/lib/fundamentalContext.ts) | Client Supabase, données et calcul de semaine |
| [`src/pages/FundamentalContext.tsx`](../src/pages/FundamentalContext.tsx) | Page, connexion et lecture des blocs |
| [`src/components/fundamental/ContextEditor.tsx`](../src/components/fundamental/ContextEditor.tsx) | Modales de saisie |
| [`src/App.tsx`](../src/App.tsx) | Route `/contexte-fondamental` et restauration de la dernière page |
| [`src/components/trading/AppLayout.tsx`](../src/components/trading/AppLayout.tsx) | Intégration dans la mise en page Trading |
| [`src/components/trading/TopNav.tsx`](../src/components/trading/TopNav.tsx) | Lien dans la barre latérale |
| [`src/hooks/useNavConfig.ts`](../src/hooks/useNavConfig.ts) | Entrée configurable du menu |
| [`package.json`](../package.json) et [`package-lock.json`](../package-lock.json) | Dépendance Supabase et versions verrouillées |

## 3. Étapes de test

1. Connecte le fichier Track Record comme d’habitude, puis ouvre **Contexte fondamental** dans le menu Trading. Connecte-toi sur cette page avec le compte Supabase.
2. Sur une semaine vide, vérifie que les neuf blocs ont un bouton **Modifier**. Enregistre un régime, un biais de paire, la prochaine réunion d’une banque centrale et une note. Recharge et vérifie que les valeurs sont toujours présentes.
3. Ajoute deux événements à impact fort dans des devises différentes. Vérifie l’ordre par date et heure et les colonnes prévision, précédent et réel. Les heures saisies sont celles de Paris. Modifie un résultat, puis retire un événement.
4. Change de semaine et reviens à la semaine initiale. Chaque semaine garde ses propres données. Avec un second compte Supabase, vérifie que ses données et celles du premier compte sont isolées.
5. Sur mobile, vérifie que les blocs s’empilent en une colonne et que le tableau du calendrier défile dans son bloc. Sur ordinateur, vérifie les lignes de trois, trois, deux et un blocs. Reviens dans Trades et vérifie l’alignement du tableau et l’état de ses filtres.

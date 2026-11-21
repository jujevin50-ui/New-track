# Contexte fondamental

## Démarrage

Connecte ton fichier Track Record comme d’habitude, puis ouvre **Contexte fondamental** dans le menu Trading. Les champs sont modifiables dès l’ouverture. **Enregistrer** apparaît dans un bloc dès que tu le modifies et applique les changements à la semaine affichée.

Les enregistrements sont regroupés par semaine dans la section `fundamentalWeeks` du fichier Track Record. Un ancien fichier démarre avec un contexte vide. Si l’application utilise son mode local de repli, le contexte est enregistré dans le navigateur avec les autres données du journal.

Le calendrier est réservé aux événements à impact fort en USD, EUR, GBP et AUD. Les heures saisies sont celles de Paris. Chaque annonce peut contenir une capture enregistrée avec le reste du fichier Track Record.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| [`src/lib/fileStorage.ts`](../src/lib/fileStorage.ts) | Format des données et compatibilité des anciens fichiers |
| [`src/lib/fundamentalContext.ts`](../src/lib/fundamentalContext.ts) | Types et calcul de semaine |
| [`src/pages/FundamentalContext.tsx`](../src/pages/FundamentalContext.tsx) | Page et sauvegarde des blocs dans le fichier |
| [`src/components/fundamental/ContextEditor.tsx`](../src/components/fundamental/ContextEditor.tsx) | Formulaires intégrés aux blocs |

## Étapes de test

1. Ouvre un fichier Track Record existant, puis accède à **Contexte fondamental**. Vérifie que les neuf blocs sont accessibles et peuvent être modifiés.
2. Enregistre un régime, un biais de paire, une réunion de banque centrale et une note. Recharge l’app ou reconnecte le même fichier et vérifie que les valeurs sont présentes.
3. Ajoute des événements dans deux devises différentes. Vérifie l’ordre par date et heure, puis modifie un résultat, joins une capture et vérifie qu’elle s’agrandit au clic après rechargement.
4. Change de semaine et reviens à la semaine initiale. Chaque semaine garde ses propres données. Connecte un autre fichier pour vérifier qu’il affiche son propre contexte.
5. Sur mobile, vérifie que les blocs et les champs du calendrier s’empilent sans débordement horizontal.

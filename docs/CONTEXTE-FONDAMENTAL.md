# Contexte fondamental

## Démarrage

Connecte ton fichier Track Record comme d’habitude, puis ouvre **Contexte fondamental** dans le menu Trading. Le bouton crayon **Modifier**, en haut à droite du bloc, affiche les champs à cet endroit. **Enregistrer** affiche **Pris en compte** et sauvegarde le bloc en arrière-plan pour la semaine affichée. Une sauvegarde interrompue peut être relancée depuis la notification.

Les enregistrements sont regroupés par semaine dans la section `fundamentalWeeks` du fichier Track Record. Un ancien fichier démarre avec un contexte vide. Si l’application utilise son mode local de repli, le contexte est enregistré dans le navigateur avec les autres données du journal.

Dans le formulaire de modification de **Banques centrales**, **Reporter à la semaine suivante** copie les taux, réunions et biais du formulaire dans les champs encore vides de la semaine qui suit celle affichée, puis ouvre cette semaine. **Enregistrer** garde les modifications pour la semaine en cours d’édition.

Dans **Calendrier éco**, copie une image du calendrier puis clique sur **Coller l’image**. La capture s’affiche immédiatement et s’enregistre en arrière-plan pour la semaine affichée. Si le navigateur bloque l’accès au presse-papiers, sélectionne le bouton et utilise Ctrl+V ou ⌘V. Un clic sur la capture permet de l’agrandir.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| [`src/lib/fileStorage.ts`](../src/lib/fileStorage.ts) | Format des données et compatibilité des anciens fichiers |
| [`src/lib/fundamentalContext.ts`](../src/lib/fundamentalContext.ts) | Types et calcul de semaine |
| [`src/pages/FundamentalContext.tsx`](../src/pages/FundamentalContext.tsx) | Page et sauvegarde des blocs dans le fichier |
| [`src/components/fundamental/ContextEditor.tsx`](../src/components/fundamental/ContextEditor.tsx) | Formulaires intégrés aux blocs |

## Étapes de test

1. Ouvre un fichier Track Record existant, puis accède à **Contexte fondamental**. Vérifie que les blocs texte sont modifiables et que le calendrier propose le bouton **Coller l’image**.
2. Enregistre un régime, une réunion de banque centrale et une note. Recharge l’app ou reconnecte le même fichier et vérifie que les valeurs sont présentes.
3. Colle une capture du calendrier et vérifie qu’elle s’agrandit au clic après rechargement. Colle une seconde capture pour vérifier qu’elle remplace la première.
4. Change de semaine et reviens à la semaine initiale. Chaque semaine garde ses propres données. Connecte un autre fichier pour vérifier qu’il affiche son propre contexte.
5. Sur mobile, vérifie que les blocs s’empilent en une colonne et que la capture reste dans la largeur du calendrier.

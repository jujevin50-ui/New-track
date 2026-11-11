# Refonte UX/UI — Trading et Finance

## 1. Audit de l’existant

| Gravité | Constat | Réponse implémentée |
|---|---|---|
| Majeur | Fermer le formulaire de trade effaçait la saisie ; les formulaires Finance repartaient de leurs valeurs initiales. | Brouillons distincts dans le stockage de l’onglet, sans toucher au fichier métier. Suppression uniquement après un enregistrement réussi. |
| Majeur | Plusieurs actions de 28–36 px étaient difficiles à toucher sur mobile. | Socle à 44 px, 48 px sur mobile ; agrandissement des actions brutes des pages et des boutons de fermeture. |
| Majeur | Libellés Finance non associés et erreurs globales via toast uniquement. | `FormField` associe libellé, contrôle et erreur ; focus sur la première erreur, puis correction mise à jour pendant la saisie. |
| Majeur | Finance ne présentait pas d’état d’attente et pouvait lancer plusieurs écritures sur des clics rapprochés. | Verrou pendant l’enregistrement, champs désactivés, libellé et indicateur de chargement. Les fonctions de persistance restent les mêmes. |
| Majeur | Certaines couleurs d’accent personnalisées rendaient le texte blanc illisible. | Choix noir/blanc par luminance pour les boutons d’accent ; encre dérivée plus contrastée pour les petits textes d’accent. |
| Mineur | Animations de navigation de 580–820 ms et arrivée de page avec flou. | Navigation ramenée à 220–290 ms ; entrées de page en translation et opacité, sans flou. |
| Mineur | Spinner central ne réservant pas l’espace du contenu. | Skeleton de filtres, indicateurs et graphique aux dimensions stables. |
| Mineur | Fenêtres, listes déroulantes et fermetures de tailles et de durées variables. | Règles communes de dimensionnement, défilement interne, entrée à 220 ms et sortie à 150 ms. |

Aucun blocage métier nouveau identifié dans les parcours testés. Cet audit porte sur les écrans et interactions de l’application, pas sur une certification exhaustive WCAG ni sur les documents PDF/HTML importés.

## 2. Direction et design tokens

Conserver la surface unie, les sections sans cartes ni séparateurs et les indicateurs alignés : cela maintient la direction validée et réserve l’attention aux données.

Source : `src/styles/interaction-system.css`.

| Token | Valeur | Pourquoi |
|---|---|---|
| Espacements | 4, 8, 12, 16, 24, 32 px | Rythme prévisible entre libellés, contrôles et sections. |
| Contrôles | 44 px ; 48 px sur mobile | Limiter les erreurs de toucher sans agrandir les tableaux inutilement sur desktop. |
| Rayon des contrôles | 10 px | Même silhouette pour les filtres et les formulaires. |
| Rayon des fenêtres | 16 px | Distinguer une surface de saisie d’un simple contrôle. |
| Durées | 150 / 220 / 280 ms | Retour immédiat, entrée lisible et changement de rubrique fluide. |
| Accélération d’entrée | `cubic-bezier(.22,1,.36,1)` | Arrivée rapide puis stabilisation douce. |
| Accélération de sortie | `cubic-bezier(.4,0,1,1)` | Retirer rapidement les éléments devenus inutiles. |
| Couleurs | Variables de thème et couleurs sémantiques existantes | Conserver le choix utilisateur et les significations financières. |

L’introduction « Welcome back » conserve sa séquence de plusieurs secondes explicitement demandée auparavant ; les durées ci-dessus concernent les interactions ordinaires. La préférence de réduction des animations désactive les mouvements, les pulsations et les transitions non essentielles.

## 3. Avant / après par écran

| Écran | Avant | Après et justification |
|---|---|---|
| Navigation Trading / Finance | Pastille lente et focus discret. | Transition élastique courte, cibles tactiles agrandies et accès direct au contenu au clavier : le changement d’espace reste perceptible sans ralentir le parcours. |
| Dashboard | Arrivée floutée et chargement réduit à un spinner. | Entrée légère sans flou, skeleton stable et filtres plus faciles à toucher : les données restent le premier repère. |
| Discipline | Contrôles et champs de tailles différentes. | Champs, switches et choix plus accessibles au toucher ; arrivée de page homogène : faciliter le bilan quotidien sans modifier les règles ni le calcul de discipline. |
| Calendar | Navigation et actions compactes. | Cibles de navigation agrandies, focus visible et champs harmonisés : sélectionner un jour et saisir son bilan demande moins de précision. L’exclusion des week-ends reste inchangée. |
| Trades | Saisie structurée mais perdue à la fermeture. | Brouillon par compte et par trade, sommaire des trois sections, erreurs de date/risque proches du champ et récapitulatif conservé : permettre une saisie interrompue sans transformer le modèle des trades. |
| Reports | Sélection et éditeur utilisant des contrôles hétérogènes. | Même socle de contrôles, fenêtres et focus ; aperçu PDF direct et zoom 50 % conservés : ne pas changer le parcours de lecture validé. |
| Stratégie | Import et lecture déjà séparés, contrôles compacts. | Commandes communes et cibles mobiles agrandies ; sandbox HTML et lecteurs PDF/Word conservés : rendre la consultation plus confortable sans toucher à l’isolation des documents. |
| Accounts | Filtres et fenêtre avec petits contrôles. | Champs et fenêtres harmonisés, fermeture accessible et focus visible : améliorer la gestion des comptes sans réintroduire un filtre de compte. |
| Payout | Formulaire dédié déjà structuré. | Boutons, champs, états désactivés et confirmations suivent les composants communs : préserver le traitement existant du cycle et des devises. |
| AI Assistant | Zone de saisie et actions compactes. | Saisie et actions plus accessibles sur mobile et focus homogène : conserver les conversations et l’analyse sans ajouter d’appels IA. |
| Finance · Vue d’ensemble | Mise en page minimaliste récemment alignée. | Contrôles et chargement communs, cibles mobiles agrandies : garder les graphiques et les indicateurs à leur place. |
| Finance · Transactions | Erreurs globales, libellés non reliés, pas de verrou de soumission. | Formulaire à champs associés, erreurs locales, brouillon, validation au clavier et état d’enregistrement : savoir quoi corriger sans quitter la saisie. |
| Finance · Comptes | Fenêtre à deux colonnes serrée sur téléphone. | Une colonne sur mobile, deux sur desktop et brouillon distinct en création/édition : améliorer la lecture des champs sans changer les soldes. |
| Finance · Invest | Lecture d’actifs, détails et PDF déjà disponibles. | Contrôles, fenêtres et focus harmonisés ; grand graphique d’évolution conservé : préserver le parcours de consultation validé. |
| Finance · Abonnements | Champs compacts et erreurs par toast. | Libellés associés, récupération de saisie et erreurs proches des champs : faciliter le suivi sans toucher aux fréquences ni aux calculs. |
| Finance · Virements | Formulaire dense et validation globale. | Regroupement source/destination puis montant/date, option de récurrence libellée, erreur de comptes identiques localisée : rendre le sens du transfert explicite. |
| Paramètres | Contrôles de taille variable et fermeture compacte. | Fenêtre commune, cible de fermeture de 44 px et commandes mobiles de 48 px : améliorer l’accès sans déplacer le sélecteur de fichier. |

## 4. Composants et implémentation

- `Button` : tailles communes ; prop `loading` pour désactiver la soumission et afficher l’attente en conservant le libellé. Ne change pas implicitement le type d’un bouton existant.
- `Input`, `Textarea`, `Select` : dimensions, focus et état `aria-invalid` cohérents.
- `FormField` : génère des identifiants uniques et associe `Label`, `aria-describedby` et message d’erreur. Utilisable avec des champs natifs et les sélecteurs Radix.
- `Dialog`, `AlertDialog`, `Sheet` : animations sur opacité/transform, fermeture accessible, taille bornée par le viewport et préférence de mouvement réduit.
- `PageSkeleton` : squelette annoncé par un unique statut ; les formes décoratives sont cachées aux lecteurs d’écran.
- `useDialogDraft` et `formDrafts` : récupération de saisie dans l’onglet et repli en mémoire si le navigateur refuse le stockage. L’utilisateur voit le statut de conservation.
- `foregroundForHsl` : choix d’un premier plan noir ou blanc selon la luminance de l’accent.

### Exemple — champ accessible

```tsx
// src/components/ui/form-field.tsx — utilisation
<FormField label="Montant" required error={amountError}>
  {field => <Input {...field} type="number" inputMode="decimal" value={amount} />}
</FormField>
```

### Exemple — retour d’enregistrement

```tsx
// src/components/ui/button.tsx — utilisation
<Button type="submit" loading={saving}>
  {saving ? 'Enregistrement…' : 'Enregistrer'}
</Button>
```

Aucune dépendance ajoutée. Pas de migration, de nouvelle table métier ni de changement des calculs, du format JSON exporté, des commissions, des week-ends, des payouts ou des imports documentaires.

## 5. Points d’attention et améliorations futures

- Un brouillon dans `sessionStorage` appartient à cet onglet : il résiste à une actualisation, pas à la fermeture définitive de la session du navigateur. Si le stockage est plein, la conservation est en mémoire et l’interface l’indique ; ne pas la présenter comme une sauvegarde durable.
- Les brouillons ne sont pas une synchronisation entre appareils. Les formulaires des rapports disposent déjà de protections de modifications non enregistrées ; les éditeurs non intégrés aux nouveaux brouillons gardent leur comportement existant.
- Les champs et boutons sont agrandis ; les cases du calendrier restent dimensionnées pour afficher sept colonnes et nécessitent une vérification tactile sur appareils réels.
- Les documents importés et les légendes de graphiques dépendent aussi de leur contenu. Un audit WCAG complet avec lecteur d’écran et plusieurs thèmes personnalisés reste une vérification complémentaire.
- Le contrôle TypeScript global possède des erreurs préexistantes hors des fichiers modifiés ; elles sont à traiter dans une intervention dédiée.

## 6. Vérification

Les résultats exécutés pour cette modification sont consignés dans le récapitulatif de livraison. Les contrôles couvrent les parcours de récupération, les erreurs, la soumission, le clavier, les thèmes et les principales largeurs ; les limites ci-dessus restent explicites.

### Résultats des parcours navigateur

- Validation Finance avec erreurs locales et libellés associés ; soumission enregistrée une seule fois.
- Brouillons de transaction et de trade récupérés après fermeture et actualisation ; suppression du brouillon après succès.
- Saisie décimale de trade et erreur de risque corrigée dans le champ.
- Échec de persistance simulé : données précédentes conservées, formulaire disponible, nouvel essai réussi.
- Création de compte, brouillon d’abonnement et virement avec validation source/destination.
- Formulaire de création de compte à nouveau vierge après l’enregistrement précédent.
- Huit pages Trading et six rubriques Finance consultées à 320, 390, 1 024 et 1 440 px, sans débordement horizontal du document.
- Fenêtres contenues dans le viewport, champs mobiles d’au moins 48 px, lien d’évitement au clavier, mode sombre et absence d’erreurs JavaScript dans ces parcours.

### Checklist de livraison

- [x] Ergonomie : regroupement des champs, erreurs locales, brouillons et protection des soumissions.
- [x] Accessibilité : libellés associés, focus visible, erreurs explicites, accès direct au contenu et réduction des animations.
- [x] Performance : transitions ordinaires sur `transform`/`opacity`, absence de dépendance supplémentaire, build de production réussi. Aucun engagement de 60 fps n’est déduit du seul build.
- [x] Responsive : parcours navigateur à 320, 390, 1 024 et 1 440 px ; fenêtres et contrôles mobiles vérifiés.
- [x] Régression : 58 tests réussis dans 17 fichiers, dont récupération après quota de stockage et choix du contraste d’accent.
- [ ] Vérification complémentaire : audit WCAG exhaustif avec lecteur d’écran et appareils tactiles réels.
- [ ] Hors périmètre : correction des erreurs TypeScript déjà présentes dans d’autres graphiques et modules. Le contrôle ne signale aucune erreur dans les fichiers modifiés par cette refonte.

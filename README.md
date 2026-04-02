# api-acquisitions

Service REST pour les nouvelles acquisitions des Bibliothèques de l'Université de Montréal

https://bibudem.stoplight.io/docs/api-acquisitions

## Installation

1. Clôner le dépôt dans un dossier local, par exemple: `api-acquisitions`
2. `cp config/local-environment.EXAMPLE.cjs config/local-development.cjs`
3. Modifier le fichier `config/local-development.cjs` pour y insérer les bonnes valeurs de connexion à la base de données MongoDB
4. `npm install`

## Pour créer un `release`

Exécuter la commande suivante, en adaptant le niveau de version en fonction des commits faits depuis le dernier `release`:

```
npm version major|minor|patch -m "Bump v%s"
```

Effectuer un commit des fichiers build, avec un message du genre:

```
git add --all dist && git commit -m "chore:Build pour v0.13.0" -m "Release-As: 0.13.0" && git push
```

Puis naviguer sur les [pull requests du dépôt GitHub](https://github.com/bibudem/ui/pulls) et acceptez le pull request généré par _Release Please_.

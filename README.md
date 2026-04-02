# api-acquisitions

Service REST pour les nouvelles acquisitions des Bibliothèques de l'Université de Montréal

https://bibudem.stoplight.io/docs/api-acquisitions

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

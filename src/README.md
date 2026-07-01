# Source ResurGo Fitness

`src/` est la source de developpement.

Structure :

- `src/app/` : logique JavaScript decoupee en fragments.
- `src/static/` : fichiers publies a la racine (`index.html`, `styles.css`, `sw.js`, etc.).
- `src/assets/` : assets sources copies vers la racine.
- `src/workers/` : code Worker annexe.
- `src/docs/` : documentation recopiee dans `docs/`.

Build manuel depuis la racine du depot :

```bash
node scripts/build-static.mjs
```

Ce script :

1. concatene `src/app/part-*.js` dans un `app.js` publie ;
2. injecte `version`, `buildId`, `updatedAt` et `commitSha` ;
3. copie les fichiers statiques et assets dans `.webapp-build/` ;
4. prepare le contenu qui sera publie dans la branche `WebApp`.

Workflow recommande :

1. modifier `src/` ;
2. lancer `node scripts/build-static.mjs` ;
3. verifier localement `.webapp-build/` ;
4. commit seulement la source.

Sur GitHub, le workflow `.github/workflows/publish-webapp.yml` rebuild automatiquement la branche `WebApp` quand un commit sur `main` touche `src/`.

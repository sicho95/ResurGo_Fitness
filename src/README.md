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

1. concatene `src/app/part-*.js` dans `app.js` ;
2. copie les fichiers statiques vers la racine ;
3. copie les bodymaps vers `assets/bodymaps/` ;
4. copie `docs/` et `workers/` ;
5. supprime `assets/app/` a la racine pour eviter de publier des sources dupliquees.

Workflow recommande :

1. modifier `src/` ;
2. lancer `node scripts/build-static.mjs` ;
3. verifier le diff Git ;
4. commit `src/` + racine publiee.

Sur GitHub, le workflow `.github/workflows/build-published.yml` rebuild automatiquement la racine quand un commit sur `main` touche `src/`.

# Git & CI/CD — Interview Questions

> **50 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: How do you create a new local Git repository?**
**A:** Run `git init` in the project folder. This creates a hidden `.git` directory that tracks all version history.
```bash
mkdir my-project && cd my-project
git init
```

**Q2: How do you clone a remote repository?**
**A:** Use `git clone` with the remote URL. Git copies the full history and sets `origin` as the remote name automatically.
```bash
git clone https://github.com/org/repo.git
git clone git@github.com:org/repo.git my-folder
```

**Q3: What is the staging area (index)?**
**A:** The staging area is a buffer between your working directory and the repository. You explicitly `git add` files to stage them before committing.
```bash
git add src/plugin.php      # stage one file
git add .                   # stage all changes
git status                  # see what is staged vs unstaged
```

**Q4: How do you make a commit?**
**A:** Stage your changes then run `git commit -m` with a message. The commit is saved locally; use `git push` to share it.
```bash
git add includes/class-api.php
git commit -m "feat: add REST endpoint for reading time"
```

**Q5: What is the difference between `git fetch` and `git pull`?**
**A:** `git fetch` downloads remote changes but does not merge them. `git pull` is `git fetch` followed by `git merge` (or rebase) into the current branch.
```bash
git fetch origin        # download only
git pull origin main    # download and merge
```

**Q6: How do you view commit history?**
**A:** `git log` shows the full history. Use `--oneline --graph --decorate` for a compact, visual branch view.
```bash
git log --oneline --graph --decorate --all
```

**Q7: How do you see what changed in your working directory?**
**A:** `git diff` shows unstaged changes. `git diff --staged` shows what is staged. `git show <hash>` shows a specific commit.
```bash
git diff                  # unstaged
git diff --staged         # staged
git show a3f9c12          # specific commit
```

**Q8: How do `.gitignore` patterns work?**
**A:** Each line is a pattern. `#` is a comment. A leading `/` anchors to the repo root. A trailing `/` matches directories. `*` matches any string.
```gitignore
/vendor/
node_modules/
*.log
.env
.DS_Store
```

**Q9: How do you create and switch to a new branch?**
**A:** Use `git switch -c` (modern) or `git checkout -b` (classic). Both create the branch and check it out in one step.
```bash
git switch -c feature/my-block   # modern
git checkout -b feature/my-block # classic
```

**Q10: What is the difference between a fast-forward and a 3-way merge?**
**A:** A fast-forward merge just moves the branch pointer forward when there is no divergence. A 3-way merge creates a new merge commit when both branches have unique commits.
```bash
git merge feature/login           # fast-forward if possible
git merge --no-ff feature/login   # always create a merge commit
```

**Q11: How do you push a local branch to a remote?**
**A:** Use `git push -u origin <branch>`. The `-u` flag sets the upstream so future `git push` / `git pull` commands need no arguments.
```bash
git push -u origin feature/my-block
```

**Q12: How do you create an annotated tag?**
**A:** Use `git tag -a` with a version name and `-m` for the message. Annotated tags store the tagger, date, and message; lightweight tags do not.
```bash
git tag -a v1.2.0 -m "Release 1.2.0 — adds REST API"
git push origin v1.2.0
```

**Q13: What does `git stash` do?**
**A:** `git stash` saves your uncommitted changes to a stack and restores a clean working directory. Use `pop` to reapply the most recent stash.
```bash
git stash push -m "WIP: block refactor"
git stash list
git stash pop          # apply and remove
git stash apply stash@{1}  # apply without removing
```

**Q14: How do you view which commit last modified a line?**
**A:** `git blame` prints each line of a file prefixed with the commit hash, author, and date of the last change.
```bash
git blame src/class-plugin.php
git blame -L 20,40 src/class-plugin.php  # lines 20–40 only
```

**Q15: What is `git cherry-pick`?**
**A:** `git cherry-pick` applies the changes from a specific commit onto the current branch without merging the entire branch history.
```bash
git cherry-pick a3f9c12        # apply one commit
git cherry-pick a3f9c12..b7d8e3  # apply a range
```

**Q16: What is `git bisect`?**
**A:** `git bisect` performs a binary search through history to find the commit that introduced a bug. Mark commits as `bad` or `good` until it isolates the culprit.
```bash
git bisect start
git bisect bad              # current commit is broken
git bisect good v1.0.0      # this tag was fine
# Git checks out the midpoint; test and mark until done
git bisect reset
```

**Q17: How do you undo the last commit without losing your changes?**
**A:** `git reset --soft HEAD~1` moves the branch pointer back one commit while leaving changes staged. `--mixed` unstages them; `--hard` discards them entirely.
```bash
git reset --soft HEAD~1     # keep changes staged
git reset --mixed HEAD~1    # keep changes unstaged
```

**Q18: What is `git reflog`?**
**A:** `reflog` records every movement of `HEAD`, including resets and rebases. Use it to recover commits that appear lost after a `reset --hard`.
```bash
git reflog
git checkout -b recovery abc1234  # restore a lost commit
```

**Q19: What are Git hooks?**
**A:** Git hooks are shell scripts in `.git/hooks/` that run automatically at specific points. Common hooks are `pre-commit`, `commit-msg`, and `pre-push`.
```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run lint
```

**Q20: What is the purpose of a `CODEOWNERS` file?**
**A:** `CODEOWNERS` (placed in `.github/`, root, or `docs/`) maps file patterns to GitHub users or teams who are automatically requested for review on pull requests.
```
# .github/CODEOWNERS
/src/api/        @backend-team
*.css            @frontend-team
/docs/           @tech-writers
```

---

## Mid

**Q21: What is `git rebase` and when would you use it?**
**A:** `git rebase main` replays your branch's commits on top of `main`, producing a linear history. Use it to integrate upstream changes without a merge commit.
```bash
git switch feature/login
git rebase main             # replay commits on top of main
git push --force-with-lease # required after rebase
```

**Q22: What is interactive rebase and what can you do with it?**
**A:** `git rebase -i` opens an editor listing commits. You can `squash` (combine), `fixup` (combine, discard message), `reword` (edit message), `drop`, or `reorder` commits.
```bash
git rebase -i HEAD~4
# In the editor:
# pick a1b2c3 feat: add block
# squash d4e5f6 fix typo
# fixup  g7h8i9 remove debug log
# reword j0k1l2 update styles
```

**Q23: What is GitFlow?**
**A:** GitFlow defines five long-lived branch types: `main` (production), `develop` (integration), `feature/*`, `release/*`, and `hotfix/*`. Feature branches merge into develop; releases and hotfixes merge into both main and develop.
```bash
git switch -c feature/checkout develop
# work...
git switch develop && git merge --no-ff feature/checkout
git branch -d feature/checkout
```

**Q24: What is trunk-based development?**
**A:** All developers commit small, frequent changes directly to `main` (trunk) or in very short-lived feature branches. Feature flags control incomplete work in production.
```bash
# Short-lived branch
git switch -c feat/header-tweak
# Merge within hours, not days
git switch main && git merge --no-ff feat/header-tweak
```

**Q25: How do you resolve a merge conflict?**
**A:** Open the conflicting file, choose or manually blend the `<<<<<<`, `=======`, `>>>>>>>` sections, stage the resolved file, and complete the merge.
```bash
git merge feature/payment
# Conflict in src/checkout.php
# Edit the file to resolve, then:
git add src/checkout.php
git commit -m "merge: resolve checkout conflict"
```

**Q26: How do you use `git submodule`?**
**A:** Submodules embed another repository at a specific commit inside your project. Use `add` to attach, `update --init` to initialise after cloning.
```bash
git submodule add https://github.com/org/lib.git lib
git submodule update --init --recursive  # after cloning
git submodule update --remote            # fetch latest
```

**Q27: What is `git worktree`?**
**A:** `git worktree add` checks out a branch into a separate directory, letting you work on multiple branches simultaneously with a single `.git` store.
```bash
git worktree add ../hotfix-branch hotfix/v1.2.1
git worktree list
git worktree remove ../hotfix-branch
```

**Q28: What is `--force-with-lease` and why prefer it over `--force`?**
**A:** `--force-with-lease` fails if the remote ref has been updated by someone else since your last fetch, preventing you from overwriting others' commits. Plain `--force` does not check.
```bash
git push --force-with-lease origin feature/my-branch
```

**Q29: How do GitHub branch protection rules work?**
**A:** Branch protection rules (Settings → Branches) enforce requirements before merging: required reviews, passing CI status checks, up-to-date branches, and block force pushes.
```
Required: 2 approving reviews
Require status checks: phpunit, lint
Require branches to be up to date before merging
Restrict force pushes: ON
```

**Q30: How do you set up a basic GitHub Actions workflow for a WordPress plugin?**
**A:** Create `.github/workflows/ci.yml`. Define a job that installs PHP and Node, runs Composer/npm, and executes PHPUnit and lint.
```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with: { php-version: '8.2' }
      - run: composer install --no-interaction
      - run: ./vendor/bin/phpunit
```

**Q31: How do you store secrets in GitHub Actions?**
**A:** Add secrets under repository Settings → Secrets and variables. Reference them in workflows via `${{ secrets.MY_SECRET }}`. They are never printed in logs.
```yaml
- name: Deploy
  env:
    DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
  run: rsync -az dist/ user@server:/var/www/
```

**Q32: How do you use GPG-signed commits?**
**A:** Generate a GPG key, tell Git to use it with `user.signingkey`, enable `commit.gpgsign`, and add the public key to your GitHub profile.
```bash
gpg --gen-key
git config --global user.signingkey ABCD1234
git config --global commit.gpgsign true
git commit -m "feat: signed commit"
```

**Q33: How do you use GitHub Packages to host a private Composer package?**
**A:** Publish the package to GitHub Packages via an Actions workflow. Add the GitHub Packages Composer registry to `composer.json` with a token.
```json
{
  "repositories": [{
    "type": "composer",
    "url": "https://composer.pkg.github.com/myorg"
  }],
  "require": { "myorg/my-lib": "^1.0" }
}
```

**Q34: How do you handle a monorepo with multiple WordPress plugins in Git?**
**A:** Store each plugin in a sub-directory. Use sparse checkout or `git worktree` to work on one plugin at a time. CI matrix jobs run per plugin.
```yaml
strategy:
  matrix:
    plugin: [plugin-a, plugin-b]
steps:
  - run: cd ${{ matrix.plugin }} && composer install && ./vendor/bin/phpunit
```

**Q35: What does `git log --oneline --graph --decorate` show?**
**A:** It draws a compact ASCII branch graph. `--oneline` condenses each commit to one line, `--graph` draws branch topology, and `--decorate` shows branch and tag names.
```bash
git log --oneline --graph --decorate --all
# * a1b2c3 (HEAD -> main) fix: correct nonce check
# * d4e5f6 (origin/main) feat: add REST endpoint
# |\
# | * g7h8i9 (feature/login) feat: login block
```

**Q36: How do you use `git log` to search for a commit by content change?**
**A:** Use `-S` (pickaxe) to find commits that added or removed a specific string, or `-G` for a regex pattern match against diffs.
```bash
git log -S "register_rest_route" --oneline
git log -G "function my_api_" --oneline -p
```

**Q37: How do you recover a deleted branch using `reflog`?**
**A:** Find the branch tip commit hash in `git reflog`, then recreate the branch pointing at that hash.
```bash
git reflog | grep "feature/payment"
# abc1234 HEAD@{3}: checkout: moving from feature/payment to main
git switch -c feature/payment abc1234
```

**Q38: How do Husky Git hooks work?**
**A:** Husky installs managed hooks in `.husky/`. On commit or push, it runs scripts defined in `package.json` such as linting or tests.
```bash
npm install --save-dev husky
npx husky init
# .husky/pre-commit
npm run lint
```

**Q39: What is the difference between `git merge --squash` and a regular merge?**
**A:** `--squash` collapses all branch commits into the working tree as staged changes. You then create one clean commit. The branch history is not preserved in the target.
```bash
git switch main
git merge --squash feature/long-experiment
git commit -m "feat: add experiment results"
```

**Q40: How do you use `git diff` to compare two branches?**
**A:** Use `branch-a...branch-b` (three dots) to see what is in `branch-b` but not yet in `branch-a` (changes since they diverged).
```bash
git diff main...feature/checkout            # what feature adds
git diff main feature/checkout -- src/      # limit to src/ directory
```

---

## Advanced

**Q41: How does `git rebase --onto` work?**
**A:** `git rebase --onto <newbase> <upstream> <branch>` replays commits from `<upstream>...<branch>` onto `<newbase>`. Useful when a feature was branched off a feature branch that you want to detach it from.
```bash
# feature-b was branched from feature-a; rebase it directly onto main
git rebase --onto main feature-a feature-b
```

**Q42: How do you set up a GitHub Actions deploy-to-SVN workflow for WordPress.org?**
**A:** On tag push, check out the repo, install dependencies, then use `svn` to commit to the WordPress.org plugin repository using stored SVN credentials.
```yaml
on:
  push:
    tags: ['v*']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to SVN
        uses: 10up/action-wordpress-plugin-deploy@stable
        env:
          SVN_PASSWORD: ${{ secrets.SVN_PASSWORD }}
          SVN_USERNAME: ${{ secrets.SVN_USERNAME }}
          SLUG: my-plugin
```

**Q43: How do you implement a Git hook with Husky to prevent committing secrets?**
**A:** Add a `pre-commit` hook that runs a secret-scanning tool such as `detect-secrets` or `git-secrets`. Block the commit when patterns match.
```bash
# .husky/pre-commit
detect-secrets-hook --baseline .secrets.baseline
# or
git secrets --scan
```

**Q44: What is `git rerere` and when is it useful?**
**A:** `rerere` (Reuse Recorded Resolution) records how you resolved a merge conflict and automatically reapplies that resolution if the same conflict appears again. Useful in long-running feature branches.
```bash
git config --global rerere.enabled true
# Resolve a conflict once; next time Git resolves it automatically
```

**Q45: How do you write a GitHub Actions workflow that publishes to GitHub Packages (npm)?**
**A:** Configure the registry URL in the `setup-node` action and provide the `NODE_AUTH_TOKEN` from secrets. Run `npm publish`.
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    registry-url: 'https://npm.pkg.github.com'
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Q46: How do you use `git filter-repo` to remove a sensitive file from all history?**
**A:** `git filter-repo` rewrites history to remove specified paths. After running it, all collaborators must re-clone and open PRs against the updated base.
```bash
pip install git-filter-repo
git filter-repo --path secrets.json --invert-paths
git push --force-with-lease origin --all
```

**Q47: What are the risks of `git push --force` on a shared branch and how do you mitigate them?**
**A:** Force push rewrites remote history, causing collaborators to have diverged branches. Mitigate by using `--force-with-lease`, enabling branch protection, and communicating before any forced push.
```bash
# Safe alternative — fails if remote was updated by others
git push --force-with-lease origin feature/my-branch
```

**Q48: How do you use `git sparse-checkout` to work with a large monorepo?**
**A:** Sparse checkout limits the working tree to specified paths, drastically reducing checkout size in large repositories.
```bash
git clone --no-checkout https://github.com/org/monorepo.git
cd monorepo
git sparse-checkout init --cone
git sparse-checkout set plugins/my-plugin
git checkout main
```

**Q49: How do you tag and automate a semantic version release with GitHub Actions?**
**A:** Use a workflow triggered on push to `main` that reads `CHANGELOG.md` or commit messages, creates an annotated tag, and publishes a GitHub Release.
```yaml
- name: Create Release
  uses: softprops/action-gh-release@v2
  with:
    tag_name: ${{ steps.version.outputs.tag }}
    body_path: CHANGELOG.md
    files: my-plugin.zip
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Q50: How do you bisect a regression automatically using a test script?**
**A:** Pass a script to `git bisect run`. Git marks each midpoint commit `good` or `bad` based on the script's exit code (0 = good, non-zero = bad).
```bash
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
git bisect run bash -c "composer install -q && ./vendor/bin/phpunit --filter test_api_returns_200 > /dev/null 2>&1"
git bisect reset
```

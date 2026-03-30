# Git — Scenario-Based Questions

---

## Scenario 1: Accidentally Committed to `main` Instead of a Feature Branch

**Prompt:** You just committed three changesets directly to `main` instead of `feature/testimonial-block`. `main` is protected on GitHub but you haven't pushed yet. Recover cleanly without losing any work.

---

### Situation

```
main:    A - B - C - D - E - F    ← you made D, E, F by mistake
```

You want:

```
main:    A - B - C                ← untouched
feature: A - B - C - D - E - F   ← your work lives here
```

---

### Step-by-Step Recovery

```bash
# 1. Create the feature branch at the current HEAD (captures all your commits)
git branch feature/testimonial-block

# 2. Reset main back to C (the last legitimate commit before your changes)
#    --soft keeps changes staged; --mixed keeps them unstaged; --hard discards them
git reset --hard HEAD~3
# or if you know the exact SHA of commit C:
git reset --hard abc1234

# Verify main is now clean
git log --oneline -5

# 3. Switch to your feature branch and verify your work is there
git checkout feature/testimonial-block
git log --oneline -5
# Should show D, E, F on top of C

# 4. Push the feature branch to remote
git push -u origin feature/testimonial-block

# 5. If main was already pushed (and you have force-push rights),
#    use --force-with-lease (safer than --force):
git checkout main
git push --force-with-lease origin main
```

### If You Pushed to `main` and It's Protected

```bash
# Option A — Open a revert PR
# Create a branch that reverts the bad commits, then merge via PR
git checkout -b revert/accidental-main-commits
git revert D..F       # creates revert commits for each
git push -u origin revert/accidental-main-commits
gh pr create --base main --title "revert: remove accidental commits from main"

# Option B — Ask a repo admin to disable branch protection temporarily,
# force-push the reset, then re-enable protection.
```

### How to Verify Nothing Was Lost

```bash
git reflog                         # find HEAD positions before and after
git diff feature/testimonial-block main   # confirm main no longer has your changes
git log feature/testimonial-block --oneline  # confirm all commits are there
```

---

## Scenario 2: Production Has a Critical Bug — Hotfix Without Merging Unfinished Feature Work

**Prompt:** Your team is mid-sprint. `develop` has two unfinished features. A critical SQL injection vulnerability is reported on the live site (tracked at tag `v2.1.0` on `main`). You need to release a patch as `v2.1.1` without shipping any of the WIP code on `develop`.

---

### Strategy: GitFlow Hotfix Branch

```
main (v2.1.0) ──────── hotfix/v2.1.1 ──── main (v2.1.1)
                                      \──── develop
```

---

### Step-by-Step

```bash
# 1. Branch from the PRODUCTION tag, NOT from develop
git checkout main
git pull origin main
git checkout -b hotfix/v2.1.1

# 2. Fix the vulnerability
# Edit the affected file, e.g. includes/class-query.php
vim includes/class-query.php

# 3. Commit the fix
git add includes/class-query.php
git commit -m "security: escape user input in custom query to prevent SQL injection"

# 4. Run your test suite locally before merging
composer test
npm test

# 5a. Merge the hotfix back into main
git checkout main
git merge --no-ff hotfix/v2.1.1 -m "hotfix: merge v2.1.1 security patch"
git tag -a v2.1.1 -m "Security patch — SQL injection fix"
git push origin main --tags

# 5b. Also merge into develop so the fix is included in future releases
git checkout develop
git merge --no-ff hotfix/v2.1.1 -m "hotfix: backport v2.1.1 to develop"
git push origin develop

# 6. Delete the hotfix branch
git branch -d hotfix/v2.1.1
git push origin --delete hotfix/v2.1.1

# 7. Trigger your deployment pipeline (or deploy manually)
gh workflow run deploy.yml --ref main
```

### Protecting Unfinished Feature Work

```bash
# Unfinished feature branches are completely unaffected — they are never touched.
# Confirm the diff between develop and main does NOT include the unfinished features:
git log main..develop --oneline

# Confirm main only has the security patch on top of v2.1.0:
git log v2.1.0..main --oneline
# Should show only the hotfix merge commit
```

### Handling a Conflict When Merging Hotfix into `develop`

```bash
git checkout develop
git merge --no-ff hotfix/v2.1.1

# If conflicts occur:
git status                             # identify conflicted files
# Resolve conflicts in editor
git add includes/class-query.php
git merge --continue
```

---

## Scenario 3: Find Which Commit Introduced a Performance Regression Using `git bisect`

**Prompt:** Your WordPress plugin's admin dashboard suddenly loads in 8 seconds instead of 0.5 seconds. The issue appeared sometime in the last 3 weeks. You have roughly 80 commits to investigate. Use `git bisect` to narrow it down efficiently.

---

### Why `git bisect`?

Binary search through 80 commits takes at most **log₂(80) ≈ 7 steps** instead of testing all 80.

---

### Manual Bisect

```bash
# 1. Start bisect mode
git bisect start

# 2. Mark the current HEAD as bad (slow)
git bisect bad

# 3. Mark the last known good commit (fast) — use a tag, branch, or SHA
git bisect good v3.0.0        # tag from 3 weeks ago

# 4. Git checks out commit ~40 (the midpoint). Test the page load time:
#    (refresh the admin page, open browser devtools, check Network tab)

# If it's fast (< 1s):
git bisect good

# If it's slow (> 3s):
git bisect bad

# 5. Git checks out the next midpoint. Repeat step 4.
#    After ~7 rounds, Git reports:
# "abc1234 is the first bad commit"
# commit abc1234
# Author: Jane <jane@acme.com>
# Date:   Thu Jan 9 14:22:10 2025
#     feat: add dashboard widget with post stats

# 6. Exit bisect mode — Git returns you to HEAD
git bisect reset

# 7. Inspect the culprit commit
git show abc1234
git diff abc1234^ abc1234 -- includes/class-dashboard.php
```

---

### Automated Bisect with a Performance Script

```bash
# Create a test script that exits 0 (fast) or 1 (slow)
cat > /tmp/perf-test.sh << 'EOF'
#!/bin/bash
# Start a temporary WordPress server or use WP-CLI to run a PHP performance check
LOAD_TIME=$(wp eval '
    $start = microtime(true);
    do_action("load_dashboard");
    $end   = microtime(true);
    echo ($end - $start);
' --allow-root 2>/dev/null)

# Exit 1 (bad) if load time > 1 second
if (( $(echo "$LOAD_TIME > 1" | bc -l) )); then
    exit 1
fi
exit 0
EOF
chmod +x /tmp/perf-test.sh

# Run automated bisect
git bisect start
git bisect bad HEAD
git bisect good v3.0.0
git bisect run /tmp/perf-test.sh
```

---

### After Finding the Commit

```bash
# Review what changed in the bad commit
git show abc1234 --stat
git show abc1234 -p -- includes/class-dashboard.php

# Check if an N+1 query was introduced
wp eval '
    global $wpdb;
    $wpdb->show_errors();
    require_once "includes/class-dashboard.php";
    $widget = new Dashboard_Widget();
    $widget->render();
    var_dump( $wpdb->queries );
'

# Fix the regression (e.g., replace individual get_post calls with a single WP_Query)
# Then create a proper fix commit on the current branch
git checkout main
git checkout -b fix/dashboard-n-plus-one
# ... apply the fix ...
git commit -m "perf: batch dashboard query to fix N+1 regression (introduced in abc1234)"
git push -u origin fix/dashboard-n-plus-one
gh pr create --base main --title "perf: fix dashboard N+1 query regression"
```

---

### Bisect Log for Documentation

```bash
# Save the bisect log for your post-mortem
git bisect log > bisect-report.txt
cat bisect-report.txt
# git bisect start
# # bad: [HEAD sha]
# # good: [v3.0.0 sha]
# git bisect bad abc1234
# git bisect good 9f8e7d6
# ...
# # first bad commit: [abc1234]
```

---

## Scenario 4: Recovering a Corrupted Git History After a Force-Push to Main

**Scenario:**
A developer ran `git push --force origin main` after an interactive rebase that went wrong. The remote `main` now has a rewritten history that diverges from what seven other developers have locally. Commits are "missing" from the remote, and `git pull` now produces conflicts for everyone.

**Challenge:**
Recover the lost commits from a local clone, restore the authoritative history on `main`, and give the team a clean path back to a stable state.

**Solution:**

1. Before touching anything, find the last known-good commit using `reflog` on a local clone that still has the old history.

```bash
# On a developer machine that hasn't pulled yet
git reflog show origin/main
# 7a3c91b refs/remotes/origin/main@{0}: update by push   ← the bad force-push
# f4e82d1 refs/remotes/origin/main@{1}: update by push   ← last good state
# ...

# The commit hash f4e82d1 is the state we want to restore
git log f4e82d1 --oneline -5
```

2. Check that all the "lost" commits are still reachable locally (they will be — local objects are never deleted by a remote force-push).

```bash
# Confirm the good history is intact locally
git log f4e82d1..HEAD --oneline    # commits only on local main, not on remote
git show f4e82d1                   # verify this is the correct recovery point
```

3. If the repository has branch protection enabled, temporarily disable it via GitHub settings or the API, restore the history, then re-enable it.

```bash
# Restore remote main to the last good commit
# Use --force-with-lease as a safety check even in recovery scenarios
git push --force-with-lease origin f4e82d1:refs/heads/main

# Verify
git fetch origin
git log origin/main --oneline -10
```

4. If branch protection cannot be disabled, push the recovery to a temporary branch and open an emergency PR.

```bash
git checkout -b recovery/main-restore f4e82d1
git push -u origin recovery/main-restore
gh pr create \
  --base main \
  --head recovery/main-restore \
  --title "recovery: restore main to pre-force-push state" \
  --body "Force-push on $(date) rewrote history. Restoring from f4e82d1."
```

5. For each affected developer — give them exact commands to realign their local branch without losing their own uncommitted work.

```bash
# Step 1: stash any local uncommitted work
git stash push -u -m "WIP before main recovery"

# Step 2: fetch the restored remote history
git fetch origin

# Step 3: reset local main to match remote (ONLY if you haven't pushed unique commits)
git checkout main
git reset --hard origin/main

# Step 4: restore stashed work
git stash pop

# Step 5: if you had unique local commits on top of the bad history, cherry-pick them
# onto the restored main
git cherry-pick <your-commit-sha>
```

6. Audit the damage and document what was lost.

```bash
# Compare old history vs new history to identify any permanently lost commits
git log f4e82d1 --not origin/main --oneline   # commits in old history, not in restored
git log origin/main --not f4e82d1 --oneline   # commits introduced by the bad rebase

# Create a post-mortem record
git log --all --oneline --graph --decorate > history-audit.txt
```

---

## Scenario 5: Choosing and Implementing a Branching Strategy for a WordPress Agency

**Scenario:**
A WordPress agency manages 12 client sites, each with a dedicated GitHub repository. Some sites have weekly releases with a QA gate; others ship hotfixes daily. The team of 8 developers wants a consistent branching strategy that supports both cadences without excessive branch management overhead.

**Challenge:**
Evaluate GitFlow vs trunk-based development for this context, choose the right model, and document the exact branching rules the team should follow.

**Solution:**

1. Evaluate both strategies against the agency's real constraints.

```
GitFlow fits when:
  ✓ Scheduled, versioned releases (weekly QA window)
  ✓ Multiple features in parallel that must not ship together
  ✓ Hotfix cadence separate from the feature train
  ✗ Slow to ship: long-lived branches accumulate merge debt
  ✗ Overhead: each release needs a release branch + two merges

Trunk-Based Development fits when:
  ✓ Daily or continuous deployment
  ✓ Mature CI/CD with automated tests
  ✓ Feature flags gate incomplete work
  ✗ Requires discipline — broken code on main affects everyone
  ✗ Feature flags add infrastructure complexity
```

2. Recommended hybrid: trunk-based for simple/daily-deploy sites, lightweight GitFlow for sites with a QA gate.

```
Trunk-Based (daily deploy sites):
  main ← feature branches merged via PR after review + green CI
  Hotfixes: branch from main, merge back via PR, deploy immediately

Lightweight GitFlow (weekly-release sites):
  main      ← production (tagged releases only)
  develop   ← integration branch (feature PRs target this)
  feature/* ← short-lived (< 1 week), branch from develop
  release/* ← QA branch cut from develop on Monday, merged to main on Friday
  hotfix/*  ← branch from main, merged to main + develop
```

3. Enforce the branching rules with a GitHub branch protection ruleset.

```bash
# Via GitHub CLI — protect main: require PR, require CI, disallow force-push
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci/phpunit","ci/phpcs"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# For GitFlow repos, also protect develop
gh api repos/:owner/:repo/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci/phpunit"]}' \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field allow_force_pushes=false
```

4. Add a pre-push hook that blocks pushes directly to `main` or `develop` from the command line.

```bash
#!/bin/sh
# .git/hooks/pre-push
# Install via: cp .git/hooks/pre-push.sample .git/hooks/pre-push && chmod +x .git/hooks/pre-push

PROTECTED_BRANCHES="main develop"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

for BRANCH in $PROTECTED_BRANCHES; do
    if [ "$CURRENT_BRANCH" = "$BRANCH" ]; then
        echo "ERROR: Direct push to '$BRANCH' is not allowed."
        echo "Create a feature branch and open a PR."
        exit 1
    fi
done

exit 0
```

5. Document the release workflow in a one-page `CONTRIBUTING.md` snippet so new developers onboard quickly.

```markdown
## Branching Cheat Sheet

| Action              | Branch from  | Merge into           | Naming               |
|---------------------|-------------|----------------------|----------------------|
| New feature         | develop     | develop (via PR)     | feature/TICKET-desc  |
| Bug fix (non-urgent)| develop     | develop (via PR)     | fix/TICKET-desc      |
| Release prep        | develop     | main + develop       | release/x.y.z        |
| Emergency hotfix    | main        | main + develop       | hotfix/x.y.z         |
| Experiment          | any         | never (discard)      | experiment/desc      |
```

---

## Scenario 6: Resolving a Complex Merge Conflict in Theme Files After a Long-Lived Feature Branch

**Scenario:**
A feature branch `feature/full-site-editor-migration` has been in development for six weeks. During that time, `main` received 43 commits including a full rewrite of `functions.php`, a renamed template directory, and several changes to `style.css`. Merging the feature branch now produces 18 conflicted files.

**Challenge:**
Resolve conflicts systematically, preserve intent from both sides, and leave a clean history that's reviewable in the PR.

**Solution:**

1. Before merging, rebase the feature branch on the latest `main` to handle conflicts incrementally rather than all at once.

```bash
# Update local branches
git fetch origin
git checkout feature/full-site-editor-migration
git pull origin feature/full-site-editor-migration

# Rebase onto main — Git will pause at each conflicted commit
git rebase origin/main

# Check which commits are being replayed and how many remain
git rebase --show-current-patch  # see the commit currently being applied
```

2. For each pause in the rebase, inspect conflicts with a three-way diff to understand the intent of each side.

```bash
# See all conflicted files at the current rebase stop
git status

# Open a specific conflict in VS Code's 3-way merge editor
code --diff HEAD:functions.php MERGE_HEAD:functions.php

# Or use git mergetool with vimdiff
git config merge.tool vimdiff
git mergetool functions.php
```

3. When `functions.php` has been restructured on `main`, use `git log` to understand what each side changed before editing.

```bash
# What did main change in functions.php since the feature branch diverged?
git log --oneline origin/main --not feature/full-site-editor-migration -- functions.php

# What did the feature branch add to functions.php?
git log --oneline feature/full-site-editor-migration --not origin/main -- functions.php

# View a specific commit's changes to functions.php
git show abc1234 -- functions.php
```

4. Resolve renamed/moved files explicitly — Git may not auto-detect renames across a long divergence.

```bash
# If main renamed templates/page.php → templates/pages/page.php
# and the feature branch modified the old path, resolve manually:
git checkout --theirs templates/pages/page.php   # take main's file location
# Then apply the feature branch's changes on top
git diff feature/full-site-editor-migration..origin/main -- templates/page.php \
  | git apply --reverse --reject

# Check for .rej files (rejected hunks that need manual application)
find . -name "*.rej"
```

5. After resolving each file, mark it resolved and continue the rebase.

```bash
git add functions.php style.css templates/pages/page.php
git rebase --continue
# Git moves to the next conflicted commit
# Repeat steps 2–5 for each pause

# If a specific commit becomes empty after resolution (changes already in main):
git rebase --skip
```

6. After the rebase completes, run a final diff against `main` to confirm only intentional changes remain, then force-push the rebased branch.

```bash
# Review the full diff — this is what the PR will contain
git diff origin/main..HEAD --stat
git diff origin/main..HEAD -- functions.php   # spot-check key files

# Force-push the rebased branch (safe — only affects this feature branch)
git push --force-with-lease origin feature/full-site-editor-migration
```

7. In the PR, add a summary comment listing the intentional changes from each side to help reviewers navigate the diff efficiently.

```bash
# Generate a structured commit list for the PR description
git log origin/main..HEAD --oneline --no-merges
```

---

## Scenario 7: Implementing Git Hooks to Enforce WordPress Coding Standards Before Commit

**Scenario:**
A WordPress agency wants to prevent PHPCS violations, ESLint errors, and debug code (`var_dump`, `console.log`) from ever reaching the remote repository. The enforcement must work across all developer machines without requiring manual hook installation.

**Challenge:**
Set up shareable pre-commit hooks using Husky and lint-staged that run PHPCS (WordPress Coding Standards) and ESLint only on changed files, keeping the hook fast enough not to disrupt developer flow.

**Solution:**

1. Install Husky and lint-staged as development dependencies.

```bash
npm install --save-dev husky lint-staged

# Initialise Husky (creates .husky/ directory and sets the git hooks path)
npx husky init

# Confirm the hooks path is configured
cat .git/config | grep hooksPath
# hooksPath = .husky
```

2. Configure lint-staged in `package.json` to run the right linter for each file type, targeting only staged files.

```json
{
  "lint-staged": {
    "*.php": [
      "vendor/bin/phpcs --standard=WordPress --report=emits",
      "bash -c 'grep -n \"var_dump\\|print_r\\|error_log\" \"$@\" && echo \"Debug code found — remove before committing.\" && exit 1 || exit 0' --"
    ],
    "*.{js,jsx}": [
      "eslint --fix",
      "bash -c 'grep -n \"console\\.log\\|debugger\" \"$@\" && echo \"Debug statements found.\" && exit 1 || exit 0' --"
    ],
    "*.{css,scss}": [
      "stylelint --fix"
    ]
  }
}
```

3. Edit `.husky/pre-commit` to invoke lint-staged.

```bash
#!/bin/sh
# .husky/pre-commit
. "$(dirname "$0")/_/husky.sh"

# Run lint-staged (only lints files staged for this commit)
npx lint-staged

# Exit code from lint-staged is forwarded — non-zero aborts the commit
```

4. Add a `commit-msg` hook to enforce Conventional Commits format.

```bash
# Install commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional

cat > commitlint.config.js << 'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'perf', 'refactor', 'style',
      'test', 'docs', 'chore', 'security', 'hotfix'
    ]],
    'subject-max-length': [2, 'always', 72],
  },
};
EOF

# Create the hook
echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
chmod +x .husky/commit-msg
```

5. Configure PHPCS to use WordPress Coding Standards.

```xml
<!-- phpcs.xml.dist — committed to the repo so all developers share the same config -->
<?xml version="1.0"?>
<ruleset name="WordPress Theme">
    <description>WordPress Coding Standards for this theme.</description>

    <file>.</file>
    <exclude-pattern>*/vendor/*</exclude-pattern>
    <exclude-pattern>*/node_modules/*</exclude-pattern>
    <exclude-pattern>*/build/*</exclude-pattern>

    <rule ref="WordPress">
        <!-- Allow short array syntax -->
        <exclude name="Generic.Arrays.DisallowShortArraySyntax"/>
    </rule>

    <rule ref="WordPress.WP.I18n">
        <properties>
            <property name="text_domain" type="array" value="my-theme"/>
        </properties>
    </rule>

    <config name="minimum_supported_wp_version" value="6.3"/>
</ruleset>
```

6. Add a `prepare` npm script so Husky is automatically installed when a new developer runs `npm install`.

```json
{
  "scripts": {
    "prepare": "husky",
    "lint:php": "vendor/bin/phpcs",
    "lint:js":  "eslint src/",
    "lint:fix": "vendor/bin/phpcbf && eslint src/ --fix"
  }
}
```

7. Test the hooks locally before shipping.

```bash
# Stage a PHP file with a coding standards violation
echo '<?php $x=1;' > test-violation.php
git add test-violation.php
git commit -m "test: trigger phpcs"
# → PHPCS output with violations, commit is aborted

# Test the commit-msg hook
git commit --allow-empty -m "bad message with no type"
# → commitlint error: subject may not be empty / type must be one of [feat, fix ...]

# Confirm a clean commit passes
git add -p   # stage only real changes
git commit -m "fix: correct spacing in template header"
# → lint-staged passes, commitlint passes, commit created
```

---

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

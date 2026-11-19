---
name: fix-vulnerabilities
description: Fix the repo's open Dependabot security alerts by updating each vulnerable package to its patched version, then open a PR that links every alert and its new version.
disable-model-invocation: true
---

# Fix vulnerabilities

Fix as many open Dependabot alerts as safely possible in one PR. A reviewer should be able to check every alert at a glance: which alert, which package, the version before, and the version after.

A PR that breaks the build or quietly jumps a major version is worse than no PR. Make the smallest change that reaches the patched version, verify it, and be upfront about anything left unfixed. When something needs a judgment call, ask the person who ran this.

## 1. Start clean, and reuse an existing fix PR

There should only ever be one open vulnerability-fix PR per repo. Opening a second one splits the review and the two will conflict on `pnpm-lock.yaml`. So before creating anything, look for one that already exists.

- If the working tree has uncommitted changes, stop and ask. Don't stash or discard them.
- `git fetch origin`.
- List open PRs that look like a vulnerability fix, whoever opened them and whatever the branch is called:

  ```bash
  gh pr list --state open --json number,title,url,headRefName,author,createdAt,files \
    --jq '.[] | select(.author.login != "app/dependabot") | select((.headRefName | test("dependabot|security|vuln"; "i")) or (.title | test("dependabot|vulnerab|security alert|CVE|GHSA"; "i"))) | {number, title, url, headRefName, author: .author.login, createdAt, files: [.files[].path]}'
  ```

  A PR counts as a fix PR only if it changes dependency files (`package.json`, `pnpm-lock.yaml`). Ignore PRs that only mention the words, like a PR that adds this skill.

- **One fix PR is open:** update it instead of opening a new one. Tell the person which PR (link) you're updating, then check out its branch and bring it up to date with `main`:
  - **Only dependency-fix commits on it:** rebuild it with `git checkout -B <branch> origin/main` and redo the fixes from scratch below. This avoids lockfile conflicts and drops fixes `main` already has. You'll push with `--force-with-lease`.
  - **Other commits too** (someone fixed something by hand): keep them, and `git merge origin/main`. If that conflicts, `git merge --abort` and ask the person how to proceed. Don't resolve `pnpm-lock.yaml` by taking one side wholesale: that silently drops the other side's changes.
- **More than one is open:** list them and ask which one to update. Suggest closing the others once their fixes are in the one you keep.
- **None open:** create `security/dependabot-<YYYY-MM-DD>` from `origin/main`. If a branch with that name already exists (locally or on the remote) but has no open PR, ask before reusing or deleting it, since someone may still be working on it.

Also check Dependabot's own open PRs: `gh pr list --state open --author app/dependabot`. If one bumps a package you're about to fix, mention it in your PR and to the person, so the team can close Dependabot's PR once yours merges.

## 2. Get the open alerts

```bash
gh api --paginate "repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100" \
  --jq '.[] | {number, url: .html_url, ghsa: .security_advisory.ghsa_id, severity: .security_advisory.severity, package: .dependency.package.name, range: .security_vulnerability.vulnerable_version_range, patched: .security_vulnerability.first_patched_version.identifier}'
```

These are the alerts the team tracks on GitHub, for `main`. Use them as the list of what to fix. They give the PR its alert links, merging the PR closes them, and alerts someone dismissed don't appear.

If this returns 403 or 404, the person's GitHub account can't read this repo's Dependabot alerts. Tell them, and suggest asking a repo admin for access. Then fall back to `pnpm audit --json`, which reports the same advisories (same GHSA IDs) for the local lockfile. In the PR, link each GHSA advisory and the repo's `/security/dependabot` page instead of alert numbers.

If there are no open alerts, say so and stop.

Group alerts that share the same package, vulnerable range and patched version: they're one fix. Keep different ranges of the same package separate (for example undici 7.x and 8.x), so a 7.x user is never pushed onto 8.x.

## 3. Check what's installed

For each package, see which versions are installed and what pulls them in (`pnpm why <pkg>`). Then sort each group:

- **Fix it:** an installed version is in the vulnerable range, and the patched version has the same major (or the same minor, for `0.x`).
- **Already fixed:** nothing installed is in the vulnerable range any more.
- **No simple fix:** the patched version is a different major from what's installed (or a different minor, for `0.x`). Do the simple fixes first, then handle these in step 5.
- **No patch:** there's no patched version yet. Handle these in step 5 too.

## 4. Apply the fixes, smallest change first

This repo is a single pnpm package. Direct dependencies live in `package.json`, and transitive pins go in the same file under `pnpm.overrides` (create the block if it doesn't exist yet). There is no workspace catalog.

1. **A direct dependency** (in `dependencies` or `devDependencies`): raise its version there to `^<patched>`, then `pnpm install`.
2. **Pulled in by another package:** try `pnpm update --depth Infinity <pkg>`. This often works because the parent already allows the patched version.
   - Watch out: this command can raise versions in `package.json` beyond the one you meant to change. Afterwards, `git diff package.json`, `git checkout -- package.json` if it touched anything else, re-apply only your intended edits, and run `pnpm install`. The lockfile keeps the newer versions.
3. **Still vulnerable:** add an entry under `pnpm.overrides` in `package.json`, scoped to the vulnerable range only.
   - Example: `"follow-redirects@<1.16.1": ">=1.16.1 <2"`.
   - Key: `<pkg>@<vulnerable range>`, with the range written with spaces, not commas. Value: `>=<patched> <next major>`, so the override can never pull in a major jump by itself.
   - `package.json` can't hold comments, so put the reason (who pulls it in, which GHSA) in the PR's "Overrides added" section instead.
   - If an override for that package already exists and now pins a vulnerable version, update it in place rather than adding a second one.

## 5. Alerts with no simple fix

The goal is to fix vulnerabilities, not just report them. An alert left as "major jump" comes back to every on-call until someone deals with it. So for each of these, work through the options below in order and stop at the first one that works. Ask the person before anything in options 2 to 4.

1. **Update the parent.** Find what pulls the vulnerable version in (`pnpm why <pkg>`), and check whether a newer version of that parent already depends on the patched version (`pnpm view <parent> versions`, `pnpm view <parent>@<version> dependencies`). If one does, update the parent, including to a new major of the parent if the person agrees and the checks pass. Fixing the parent is better than an override, because nothing needs cleaning up later.
2. **Force the new major for that one parent.** Read the vulnerable package's changelog or release notes between the installed and patched versions. Look for breaking changes that could affect how the parent uses it (removed exports, changed defaults, dropped Node versions). If nothing relevant changed, add an override scoped to that parent only, e.g. `"<parent>>glob": "^14.0.2"`, and explain why in the PR. Then verify it in step 6, including the build. If any check fails, undo it and move to the next option. In the PR, mark it clearly as a forced major and say what you checked, so the reviewer knows to look closely.
3. **Remove or replace the dependency.** If the parent is unmaintained or barely used, check whether it can be removed, or replaced with a maintained package that does the same job. If it's a small change, offer to do it in this PR. If it's bigger, don't do it here. List it under "Not fixed" as a proposed follow-up, with what it would take.
4. **Dismiss, as a last resort.** Use this only when there's no fix upstream yet, and the vulnerable code can't be reached. For example, it's dev or build tooling only, never ships to users, and doesn't handle untrusted input. Explain why, and dismiss only if the person says yes:

   ```bash
   gh api -X PATCH "repos/{owner}/{repo}/dependabot/alerts/<number>" -f state=dismissed -f dismissed_reason=tolerable_risk -f dismissed_comment="<why, and what would fix it>"
   ```

   Reasons GitHub accepts: `fix_started`, `inaccurate`, `no_bandwidth`, `not_used`, `tolerable_risk`. Dismissed alerts drop off the list until a new advisory arrives.

For every alert, also note whether it **ships to users** (it ends up in the Next.js server or client bundles, or runs in `src/middleware.ts` or a route handler such as `/api/board`, which holds `TRANSIT_TOKEN`) or is **dev/build-time only** (linting, tests, Storybook, `openapi-typescript`, `scripts/`). Reviewers need this to judge risk.

## 6. Verify

- Check `pnpm why` again for every package. Record the versions before and after. A fix only counts if nothing installed is still in the vulnerable range.
- Run `pnpm audit` as an independent check of the branch's lockfile. Every alert you marked as fixed should be gone from its output. Anything still listed is either in "Not fixed" already, or a fix that didn't work: look at it again.
- Run `pnpm install --frozen-lockfile`, then `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check`, `pnpm test:storybook` and `pnpm build`. The build matters most when you've bumped Next.js, React, Tailwind or other build tooling; it needs no env. When Storybook, vite or vitest moved, also start `BOARD_DEMO=1 pnpm dev` and load the board once.
- If a check fails because of a bump, revert that bump and handle the alert in step 5, or list it under "Not fixed" with the reason.
- Report every check in the PR, including ones you skipped and why. "Not run" is fine, as long as it's stated.

## 7. Commit and open the PR

- Commit only `package.json` and `pnpm-lock.yaml`.
- Commit message subject: `fix(deps): patch <N> Dependabot alerts`, with one line per package in the body (`follow-redirects 1.16.0 → 1.16.2`).
- **New PR:** push, then run `gh pr create`. Use the same subject as the commit for the title.
- **Updating an existing PR:** push (`--force-with-lease` if you rebuilt it). Rewrite its title and description with `gh pr edit <n>` so they describe what it fixes now, and add a short comment saying what changed (new alerts fixed, fixes that have since landed on `main`).
- Every push to an open PR starts a billed GitHub Actions run, so push once with everything in, not after each fix.
- Don't merge or enable auto-merge.

PR description:

```markdown
## Summary

Fixes <X> of <Y> open Dependabot alerts.

## Fixed alerts

| Alert               | Advisory                                       | Package            | Severity | Ships to users? | Vulnerable range      | Before → After      | How                                                                            |
| ------------------- | ---------------------------------------------- | ------------------ | -------- | --------------- | --------------------- | ------------------- | ------------------------------------------------------------------------------ |
| [#156](<alert url>) | [GHSA-…](https://github.com/advisories/GHSA-…) | `follow-redirects` | high     | no (dev)        | `>= 1.16.0, < 1.16.1` | 1.16.0 → **1.16.2** | override                                                                       |
| [#168](<alert url>) | [GHSA-…](https://github.com/advisories/GHSA-…) | `glob`             | medium   | no (build)      | `>= 9.0.0, <= 14.0.1` | 13.0.6 → **14.0.3** | ⚠️ forced major for `<parent>`; changelog checked, build passed |

## Not fixed

Each item says what would fix it and who needs to act.

- `minimatch` `< 11.0.1` ([#169](<alert url>), dev only): ESLint still requires minimatch 10. Next step: update when ESLint ships minimatch 11 support, or dismiss as tolerable risk (asked: <answer>).
- `minimatch` 3.x via `<parent>`: <parent> is unmaintained. Proposed follow-up: replace it with <alternative> (about <size of change>).

## Dismissed

- [#170](<alert url>) `<pkg>`: dismissed as tolerable risk, with the reason. Approved by <person>.

## Overrides added

- `"follow-redirects@<1.16.1": ">=1.16.1 <2"`: pulled in by axios, GHSA-…; remove once axios ships the fix

## Checks

- pnpm audit: only the "Not fixed" alerts remain
- pnpm install --frozen-lockfile: passed
- typecheck, lint, test, format:check, test:storybook: passed
- build: passed
```

Use one table row per alert, even when several alerts share a fix. Leave out a section if it has nothing in it.

Finish by telling the person:

- the PR link, and whether it's new or updated
- how many alerts it fixes out of how many were open
- for each alert that's left, the specific next step and who needs to act

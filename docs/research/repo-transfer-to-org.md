# What transferring the repo to an organization changes

Research for the ticket "Find what transferring the repo to an organization changes", part of the plan "Protect the stored GitLab token and Gemini key". The plan moves `nnegi88/GitLab-Merge-Fleet` from the `nnegi88` personal account to a new organization, `gitlab-merge-fleet`. This note lists what changes, breaks or needs redoing.

Sources are GitHub's docs and changelog, and the docs or source of the other tools involved (the Claude GitHub Action, CodeRabbit, Jekyll). Quotes are verbatim. The repo's current settings were read with `gh api` on 2026-10-06. Nothing was changed.

## Short answer

The transfer keeps the code, issues, pull requests, the fork and the `CLAUDE_CODE_OAUTH_TOKEN` secret. GitHub redirects the repo's web and git URLs. The workflows and `.github/dependabot.yml` move with the code. Three things don't come along:

- **The Pages URL.** The site moves to `https://gitlab-merge-fleet.github.io/GitLab-Merge-Fleet/`. GitHub doesn't redirect the old one.
- **App installs.** A GitHub App is installed on an account. The Claude app and CodeRabbit must be installed on the new org, or both Claude workflows fail and CodeRabbit goes quiet.
- **The old name, if it's ever reused.** Creating a repo or fork at `nnegi88/GitLab-Merge-Fleet` deletes the redirects for good.

The docs say nothing about Pages settings, the `github-pages` environment, repo-level Actions and security settings, or sub-issue and blocked-by links. Check each after the move. The user site already serves a plain HTML folder unchanged (`/demo/`). So a stub at `GitLab-Merge-Fleet/index.html` in the `nnegi88.github.io` repo, with no front matter, will be served once no project site claims that path.

## Checklist

- **carries over:** GitHub's docs say it moves with the repo.
- **redo after transfer:** it doesn't move. Set it up again on the org.
- **verify:** the docs are silent or it depends on org settings. Check it after the move.

| # | Item | Status | What to do |
|---|---|---|---|
| 1 | Code, commits, issues, pull requests, stars, watchers, the one fork | carries over | Nothing. |
| 2 | Actions secret `CLAUDE_CODE_OAUTH_TOKEN`, the only secret. There are no variables and no environment, Dependabot or Codespaces secrets. | carries over | Nothing. The token belongs to a Claude subscription, not to the repo owner. |
| 3 | Issue assignees, all `nnegi88` | carries over | Kept because `nnegi88` will be an org member. Assignees who aren't org members are cleared. |
| 4 | Redirects for web URLs, issue and PR links, and `git clone`/`fetch`/`push` | carries over | They last until a repo or fork is created at `nnegi88/GitLab-Merge-Fleet`. Never create one. |
| 5 | Workflow files and `.github/dependabot.yml` | carries over | Nothing. The file alone turns on Dependabot version updates. |
| 6 | Local clones | redo after transfer | `git remote set-url origin https://github.com/gitlab-merge-fleet/GitLab-Merge-Fleet.git`. The old URL redirects until then. |
| 7 | Pages site URL | redo after transfer | The site moves to `https://gitlab-merge-fleet.github.io/GitLab-Merge-Fleet/`. Run "Deploy to GitHub Pages" once (`workflow_dispatch`) and open the new URL. |
| 8 | Claude GitHub App | redo after transfer | Install [the Claude app](https://github.com/apps/claude) on `gitlab-merge-fleet` with access to this repo. Then try `@claude` and the PR review. |
| 9 | CodeRabbit | redo after transfer | In app.coderabbit.ai, add the org, grant access and select this repo. Re-apply any settings made in CodeRabbit's web UI. The repo has no `.coderabbit.yaml`. |
| 10 | Org Actions policy and workflow permissions | verify | New-org defaults fit: public actions allowed, `GITHUB_TOKEN` read-only, Actions can't create PRs, approval for first-time contributors. The workflows set their own `permissions`, including `pages: write` and `id-token: write`. |
| 11 | Org lets members publish public Pages sites | verify | Org settings, Member privileges, "Pages creation": Public ticked. The docs don't state the default. |
| 12 | Pages settings: Source "GitHub Actions", HTTPS | verify | If Pages is off, set Source to "GitHub Actions" in Settings, Pages. The workflow won't turn Pages on by itself. |
| 13 | `github-pages` environment with its `main`-only branch rule | verify | If it's gone, the next deploy recreates it. Add the `main` rule again. |
| 14 | Repo Actions settings | verify | Expect today's values: all actions allowed, token default read, approval for first-time contributors. |
| 15 | Dependabot alerts and security updates, secret scanning, push protection, private vulnerability reporting | verify | All on today. The org's default security configuration isn't applied to transferred repos, so nothing should switch them off. The docs don't promise they're kept, though. |
| 16 | Sub-issues of the plan issue, and the blocked-by links | verify | Expect the five sub-issues and two blocked-by links listed under point 5. |
| 17 | Ruleset `main` (disabled) | verify | Still there and disabled. It enforces nothing today. |
| 18 | Old URL `https://nnegi88.github.io/GitLab-Merge-Fleet/` | verify | Should return 404, not the old app, until the stub from "Clear the old origin and redirect to the new URL" lands. |

### Checks to run after the move

```sh
R=repos/gitlab-merge-fleet/GitLab-Merge-Fleet

# Pages, environment, secrets, Actions settings
gh api $R/pages --jq '{html_url, build_type, https_enforced}'      # build_type "workflow"
gh api $R/environments --jq '.environments[] | {name, deployment_branch_policy}'
gh api $R/environments/github-pages/deployment-branch-policies --jq '.branch_policies[].name'   # main
gh api $R/actions/secrets --jq '.secrets[].name'                    # CLAUDE_CODE_OAUTH_TOKEN
gh api $R/actions/permissions                                       # allowed_actions "all"
gh api $R/actions/permissions/workflow                              # "read", false
gh api $R/actions/permissions/fork-pr-contributor-approval          # first_time_contributors
gh api orgs/gitlab-merge-fleet --jq .members_can_create_public_pages   # true

# Security settings
gh api $R --jq .security_and_analysis
gh api $R/automated-security-fixes                                  # enabled: true
gh api -i $R/vulnerability-alerts | head -1                         # HTTP 204
gh api $R/private-vulnerability-reporting                           # enabled: true
gh api $R/rulesets --jq '.[] | {name, enforcement}'                 # main, disabled

# Issue links
gh api $R/issues/79/sub_issues --jq '.[].number'                    # 80 81 82 83 84
gh api $R/issues/83/dependencies/blocked_by --jq '.[].number'       # 82
gh api $R/issues/84/dependencies/blocked_by --jq '.[].number'       # 83

# Apps: after the next push to main
gh api $R/commits/main/check-suites --jq '.check_suites[].app.slug'   # claude, coderabbitai

# URLs
curl -sI https://gitlab-merge-fleet.github.io/GitLab-Merge-Fleet/ | head -1   # 200 after a deploy
curl -sI https://nnegi88.github.io/GitLab-Merge-Fleet/ | head -1              # 404 until the stub lands
```

## What exists today

Read with `gh api` and `curl` on 2026-10-06.

| What | Value |
|---|---|
| Repo | public, default branch `main`, 1 fork, collaborators: `nnegi88` (admin) |
| Pages | `build_type: workflow` (Source "GitHub Actions"), `https_enforced: true`, no custom domain, no custom 404, at `https://nnegi88.github.io/GitLab-Merge-Fleet/` |
| Environments | `github-pages`: custom deployment branch policy allowing `main` only, admins can bypass, no secrets or variables |
| Actions secrets and variables | one secret, `CLAUDE_CODE_OAUTH_TOKEN`, and no variables |
| Other secrets | no Dependabot or Codespaces secrets |
| Actions settings | enabled, all actions allowed, SHA pinning not required, `GITHUB_TOKEN` default read, Actions can't approve PRs, approval for first-time contributors |
| Security | Dependabot alerts on, Dependabot security updates on, secret scanning on, push protection on, private vulnerability reporting on, code scanning not set up |
| Webhooks, deploy keys, branch protection | none |
| Rulesets | `main` (deletion, non-fast-forward, pull request), enforcement disabled |
| Apps with check suites on the latest `main` commit | `claude` (owner `anthropics`), `coderabbitai`, `github-actions` |
| Issue links | the plan issue has five sub-issues. "Move the repo to the gitlab-merge-fleet organization" is blocked by "Find what transferring the repo to an organization changes". "Clear the old origin and redirect to the new URL" is blocked by the move ticket. |
| Clone traffic | 206 clones in the last 14 days, 201 of them on 2026-10-04 |
| Old owner or URL in the code | none. The README only has the placeholder `https://[username].github.io/GitLab-Merge-Fleet/`, and the repo's website field is empty. |
| User site `nnegi88.github.io` | legacy build from `master`, `/`, Jekyll through the `github-pages` gem, plugins `jekyll-feed`, `jekyll-seo-tag` and `jekyll-sitemap`, no `GitLab-Merge-Fleet/` folder |

## Details

### 1. GitHub Pages

**New URL.** A project site is served at `http(s)://<owner>.github.io/<repositoryname>` ([What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#types-of-github-pages-sites)). After the move the owner is `gitlab-merge-fleet`, so the site is `https://gitlab-merge-fleet.github.io/GitLab-Merge-Fleet/`. The repo name doesn't change, so Vite's `base: '/GitLab-Merge-Fleet/'` and `deploy.yml` stay as they are. HTTPS comes automatically: "GitHub Pages sites created after June 15, 2016, and using `github.io` domains are served over HTTPS automatically." ([Securing your GitHub Pages site with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https))

**Old URL: no redirect.** "If the transferred repository contains a GitHub Pages site, then links to the Git repository on the Web and through Git activity are redirected. However, we don't redirect GitHub Pages associated with the repository." ([Transferring a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository#whats-transferred-with-a-repository)) The docs don't say what the old URL returns instead. A 404 is likely. Today, paths no site claims on `nnegi88.github.io` return 404 (checked with `/no-such-path-xyz/`), and the user site has no `GitLab-Merge-Fleet/` folder. Check it right after the move.

**Pages settings: not documented.** The transfer doc lists what stays attached ("webhooks, services, secrets, or deploy keys"), and Pages settings aren't on that list. Today the site builds from a workflow (Source "GitHub Actions"), with HTTPS enforced and no custom domain. Pages doesn't bind the setting to one workflow: "GitHub Pages does not associate a specific workflow to the GitHub Pages settings." ([Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow)) If the setting survives, `deploy.yml` deploys as before. If Pages shows as off after the move, set Source to "GitHub Actions" in Settings, Pages. The workflow can't do it. `actions/configure-pages` only enables Pages with `enablement: true`, which "requires a token other than `GITHUB_TOKEN` to be provided" ([action.yml](https://github.com/actions/configure-pages/blob/main/action.yml)), and `deploy.yml` doesn't set it.

**Publishing at the new URL.** The docs don't say whether a transfer republishes the site. A workflow run does: "A successful workflow run in the repository for your site will create a new deployment." ([Unpublishing a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/unpublishing-a-github-pages-site#re-enable-using-github-actions)) The nearest documented case is a visibility change, which also changes the site's URL and leaves "broken links until the site is rebuilt" ([Troubleshooting 404 errors for GitHub Pages sites](https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites#repository)). `deploy.yml` has a `workflow_dispatch` trigger, so run it once after the move.

**The `github-pages` environment: not documented.** Environments aren't in the transfer doc's list either. Today the environment has one protection rule: a custom deployment branch policy that allows only `main`. If it goes missing, the next deploy recreates it without that rule: "If your repository does not already include an environment called `github-pages`, the environment will be created automatically. We recommend that you add a deployment protection rule so that only the default branch can deploy to this environment." ([Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#creating-a-custom-github-actions-workflow-to-publish-your-site)) Environments work for public repos on the free plan: "Users with GitHub Free plans can only configure environments for public repositories." ([Managing environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments))

**Org privilege for Pages.** An organization can stop its members publishing Pages sites: "You can choose to allow or disallow organization members from publishing GitHub Pages sites." ([Managing the publication of GitHub Pages sites for your organization](https://docs.github.com/en/organizations/managing-organization-settings/managing-the-publication-of-github-pages-sites-for-your-organization)) The page doesn't state the default. Check Settings, Member privileges, "Pages creation" once the org exists.

### 2. Actions

**Secrets carry over.** "If the transferred repository contains webhooks, services, secrets, or deploy keys, they will remain associated after the transfer is complete." ([Transferring a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository#whats-transferred-with-a-repository)) The repo has one Actions secret, `CLAUDE_CODE_OAUTH_TOKEN`. The token isn't tied to the repo's owner: "an OAuth token is tied to the subscription of the person who ran `claude setup-token`" ([Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions#set-up-for-an-organization)). It keeps working after the move.

**Variables and environments.** The docs don't say whether variables or environments move. The repo has no variables. For the `github-pages` environment, see point 1.

**Org settings apply after the move.** "Once a repository is transferred to an organization, the organization's default repository permission settings and default membership privileges will apply to the transferred repository." ([Transferring a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository#repository-transfers-and-organizations)) For Actions, a new org's defaults suit these workflows. All quotes are from [Disabling or limiting GitHub Actions for your organization](https://docs.github.com/en/organizations/managing-organization-settings/disabling-or-limiting-github-actions-for-your-organization):

- **Allowed actions.** "By default, GitHub Actions is enabled on all repositories and organizations." When it's enabled, "workflows are able to run actions and reusable workflows located within your repository and any other public repository." The workflows use `actions/*` and `anthropics/claude-code-action@v1`. If the org is ever limited to selected actions, allow both. Limiting it to the org's own actions "blocks all access to actions authored by GitHub".
- **`GITHUB_TOKEN` default.** "By default, when you create a new organization, `GITHUB_TOKEN` only has read access for the `contents` and `packages` scopes." The [changelog of 2023-02-02](https://github.blog/changelog/2023-02-02-github-actions-updating-the-default-github_token-permissions-to-read-only/) says the same for organizations not owned by an enterprise: "New organizations will have read-only token." A restrictive org default also locks the repo setting: "the same option is selected in the settings for repositories within your organization, and the permissive option is disabled." The repo already uses read. The workflows don't depend on the default anyway, because they set `permissions` themselves: "Anyone with write access to a repository can modify the permissions granted to the `GITHUB_TOKEN`, adding or removing access as required, by editing the `permissions` key in the workflow file."
- **Pull requests from Actions.** "By default, when you create a new organization, workflows are not allowed to create or approve pull requests." It's off in the repo too, and no workflow needs it.
- **Fork pull requests.** "By default, all first-time contributors require approval to run workflows." That matches the repo today.

**Pages deploy permissions.** `deploy-pages` needs "a minimum of `pages: write` and `id-token: write` permissions" ([Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages#deploying-github-pages-artifacts)). `deploy.yml` grants both at the workflow level, so the read-only default doesn't block it. The org's "Pages creation" privilege (point 1) is the other gate.

**Repo-level Actions settings: not documented.** The docs don't say whether they move. Today's values match a new org's defaults, so even a reset to org defaults changes nothing.

### 3. GitHub Apps

**Installs belong to an account.** The transfer doc doesn't mention app installations. The Apps docs tie an installation to the account that owns the repositories: "In order to use a GitHub App on your resources, you must install the app on your organization or personal account. You can install the same GitHub App on multiple accounts. For example, if you install the app on your personal account and on a few organizations that you own, you'll be able to use the app on your personal repositories, on the organizations where you installed the app, and on repositories owned by those organizations." ([Installing a GitHub App from a third party](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party#about-installing-github-apps)) Both apps are installed for `nnegi88` today: the latest `main` commit has check suites from `claude` (owner `anthropics`) and `coderabbitai`. Once `gitlab-merge-fleet` owns the repo, those installs don't cover it. Install both on the org. "Organization owners can install GitHub Apps on their organization." ([same page](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party#requirements-to-install-a-github-app))

**Claude.** `claude.yml` and `claude-code-review.yml` both run `anthropics/claude-code-action@v1` with `claude_code_oauth_token` and no `github_token` input. Without that input, the action takes the job's OIDC token and exchanges it at `https://api.anthropic.com/api/github/github-app-token-exchange` for a Claude GitHub App token ([action.yml](https://github.com/anthropics/claude-code-action/blob/main/action.yml), [src/github/token.ts](https://github.com/anthropics/claude-code-action/blob/main/src/github/token.ts)). An installation token comes from an installation, so this needs the app installed on the account that owns the repo. If the exchange fails, the action logs "App token exchange failed" and throws an error. Anthropic's docs cover the org case: "Install the [Claude GitHub App](https://github.com/apps/claude) once at the organization level, choosing all repositories or a selected list" ([Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions#set-up-for-an-organization)). The secret carries over (point 2), so the app install is the only step.

**CodeRabbit.** CodeRabbit adds organizations one at a time. In app.coderabbit.ai you refresh the organization list, pick the org and click Grant. Then you go through "Grant GitHub bot access" and "Select repositories" on GitHub ([Add organizations](https://docs.coderabbit.ai/management/adding-organizations)). Its settings live in a repo's `.coderabbit.yaml`, in a central `coderabbit` repo, or in CodeRabbit's web UI at org or repo level ([Configuration overview](https://docs.coderabbit.ai/guides/configuration-overview)). This repo has no `.coderabbit.yaml`. Settings made in the UI under `nnegi88` belong to that account, and CodeRabbit's docs don't cover a repo changing owner. Re-apply them under the new org, or commit them as a `.coderabbit.yaml` so they travel with the repo.

**Check.** After the next push to `main`, the commit's check suites should list `claude` and `coderabbitai` again (see the checks above). Then mention `@claude` in a PR comment and open a test PR to see both reviews.

### 4. Dependabot and security settings

**`dependabot.yml` keeps working.** Version updates come from the file: "You enable Dependabot version updates by committing a `dependabot.yml` configuration file to your repository." ([Configuring Dependabot version updates](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates#enabling-dependabot-version-updates)) The file moves with the code.

**Alerts and security updates: not documented.** They're per-repository settings ([Configuring Dependabot alerts](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-dependabot-alerts), [Configuring Dependabot security updates](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-security-updates)). The docs don't say whether a transfer keeps them. They do say that an org's default security configuration skips transferred repos: "The default security configuration for an organization is only automatically applied to new repositories created in your organization. If a repository is transferred into your organization, you will still need to apply an appropriate security configuration to the repository manually." ([Applying a custom security configuration](https://docs.github.com/en/code-security/how-tos/secure-at-scale/configure-organization-security/establish-complete-coverage/apply-custom-configuration)) So the org won't switch anything on or off by itself. Today Dependabot alerts, Dependabot security updates, secret scanning, push protection and private vulnerability reporting are all on. Check them after the move. If a security configuration is ever applied to the repo, make sure it keeps them on.

### 5. Redirects and links

**Web and git URLs redirect.** "All links to the previous repository location are automatically redirected to the new location. When you use `git clone`, `git fetch`, or `git push` on a transferred repository, these commands will redirect to the new repository location or URL. However, to avoid confusion, we strongly recommend updating any existing local clones to point to the new repository URL." ([Transferring a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository#whats-transferred-with-a-repository)) Update each clone with `git remote set-url origin https://github.com/gitlab-merge-fleet/GitLab-Merge-Fleet.git` ([Managing remote repositories](https://docs.github.com/en/get-started/git-basics/managing-remote-repositories)).

**Issues and pull requests move.** "When you transfer a repository, its issues, pull requests, wiki, stars, and watchers are also transferred." Their old links redirect like any other repo link. On assignees: "When you transfer a repository from a personal account to an organization, issues assigned to members in the organization remain intact, and all other issue assignees are cleared." Every assigned issue here is assigned to `nnegi88`, who will own the org, so none are cleared.

**Sub-issues and blocked-by links: not documented.** The docs on [sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues) and [issue dependencies](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies) don't mention repository transfers. Neither do the changelog posts for [sub-issues](https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/) and [dependencies](https://github.blog/changelog/2025-08-21-dependencies-on-issues/). There are two reasons to expect the links to survive. Sub-issues can already link issues across repositories ("To add issues from other repositories..."), so a link isn't tied to a repo path. And every linked issue here moves together. Still, check after the move. The links today:

- The plan "Protect the stored GitLab token and Gemini key" has five sub-issues: "Keep secrets per tab unless the user asks to remember them", "Tell users the truth about how their secrets are stored", "Find what transferring the repo to an organization changes", "Move the repo to the gitlab-merge-fleet organization" and "Clear the old origin and redirect to the new URL".
- "Move the repo to the gitlab-merge-fleet organization" is blocked by "Find what transferring the repo to an organization changes".
- "Clear the old origin and redirect to the new URL" is blocked by "Move the repo to the gitlab-merge-fleet organization".

**Reusing the old name breaks the redirects.** "If you create a new repository or fork at the previous repository location, the redirects to the transferred repository will be permanently deleted." ([Transferring a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository#whats-transferred-with-a-repository)) After that, old links to code, commits, issues and pull requests would reach the new repo, or a 404, instead of the moved one. So would any clone still using the old URL. A same-named repo with Pages turned on would also be a project site at `nnegi88.github.io/GitLab-Merge-Fleet/` again. The docs don't say whether it or the user-site stub would win. That's why the stub belongs in the `nnegi88.github.io` repo.

GitHub may block the old name anyway. "If the transferred repository contains an action listed on GitHub Marketplace, or had more than 100 clones or more than 100 uses of GitHub Actions in the week prior to the transfer, GitHub permanently retires the owner name and repository name combination (`OWNER/REPOSITORY-NAME`) when you transfer the repository." ([Transferring a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository#about-repository-transfers)) The traffic API shows 201 clones on 2026-10-04, probably CI checkouts. The docs don't say whether Actions checkouts count. If the move happens by 2026-10-11, the name will likely be retired. That does no harm here, since nothing should be created at that name.

**Another way to move.** Since January 2026, account settings also offer "Move work to an organization", which transfers chosen repositories to a new or existing org ([changelog](https://github.blog/changelog/2026-01-12-deprecation-of-user-to-organization-account-transformation/), [Moving your work to an organization](https://docs.github.com/en/account-and-profile/how-tos/account-management/moving-your-work-to-an-organization)). Its doc says only that it transfers repositories. Treat it as a transfer, and the same checklist applies.

### 6. The old path on the user site

**Yes, the user site will serve `/GitLab-Merge-Fleet/index.html` once the project site has moved.** GitHub's docs don't describe how `github.io` routes requests between a user site and project sites. The evidence comes from the user site itself. Its repo has `demo/index.html`, a plain HTML file with no front matter that loads `style.css` from the same folder. `https://nnegi88.github.io/demo/` returns that file byte for byte. `/demo` redirects (301) to `/demo/`, and `/demo/style.css` is served as `text/css`. The stub has the same shape: a folder with an `index.html` and a `.js` file.

Jekyll copies such files unchanged. "A static file is a file that does not contain any front matter." ([Static Files](https://jekyllrb.com/docs/static-files/)) And "every other directory and file—such as `css` and `images` folders, `favicon.ico` files, and so forth—will be copied verbatim to the generated site." ([Directory Structure](https://jekyllrb.com/docs/structure/))

Caveats for the stub:

- **No front matter**, in `index.html` or in the `.js` file. "Any file that contains a YAML front matter block will be processed by Jekyll as a special file." ([Front Matter](https://jekyllrb.com/docs/front-matter/)) Liquid would then treat any `{{ }}` or `{% %}` in the file as template code, and Jekyll plugins could act on it.
- **Names Jekyll keeps.** By default Jekyll skips files and folders inside `/node_modules` or `/vendor`, names that start with `_`, `.` or `#`, names that end with `~`, and anything in the `exclude` setting ([About GitHub Pages and Jekyll](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll#configuring-jekyll-in-your-github-pages-site)). `GitLab-Merge-Fleet/` is fine. The user site's `exclude` list (`README.md`, `Gemfile`, `Gemfile.lock`, `vendor`) doesn't touch it. Don't start the script's name with `_`.
- **Exact case.** `https://nnegi88.github.io/gitlab-merge-fleet/` returns 404 today, while `/GitLab-Merge-Fleet/` serves the app. Use `GitLab-Merge-Fleet`, the same as the app's base path.
- **Permalinks don't apply.** The user site's `permalink: /:title/` setting doesn't move static files. `archive/portfolio-2018.html` is still served at `/archive/portfolio-2018.html`.
- **The sitemap will list it.** The user site uses `jekyll-sitemap`, which lists static HTML files. Today `sitemap.xml` includes `/demo/`, `/archive/portfolio-2018.html` and `/case-closed/privacy.html`. To leave the stub out, add a front matter default to `_config.yml`, as the plugin documents ([jekyll-sitemap README](https://github.com/jekyll/jekyll-sitemap#exclusions)). GitHub Pages runs Jekyll 3.10.0 and jekyll-sitemap 1.4.0 ([dependency versions](https://pages.github.com/versions/)), newer than the 3.7.2 and 1.2.0 the README asks for.

  ```yaml
  defaults:
    - scope:
        path: "GitLab-Merge-Fleet/index.html"
      values:
        sitemap: false
  ```

- **The route lives in the hash.** Browsers don't send the `#/…` part to the server, so the stub's script has to read `location.hash` and add it to the new URL. The plan already asks for this.
- **Caching.** Responses from both Pages sites carry `cache-control: max-age=600`. That's observed, not documented. Allow about 10 minutes for a change at either URL to show. The app registers no service worker, so nothing else holds on to the old app.
- **Order.** Add the stub after the move, not before. The docs don't say which wins when a project site and a folder in the user site claim the same path. If the folder won, an early stub would replace the live app and send users to a site that doesn't exist yet. The tickets are already in this order: "Clear the old origin and redirect to the new URL" is blocked by "Move the repo to the gitlab-merge-fleet organization".
- **Build trigger.** The user site builds from `master` with the legacy builder. "Commits pushed by a GitHub Actions workflow that uses the `GITHUB_TOKEN` do not trigger a GitHub Pages build." ([Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#troubleshooting-publishing-from-a-branch)) Push the stub as a normal commit or merge.

## Where the docs are silent

- Whether Pages settings (source, build type, HTTPS) survive a transfer, and whether the site republishes at the new URL by itself.
- What the old project-site URL returns after a transfer. The docs only say it isn't redirected.
- Whether environments, repository variables, rulesets and repo-level Actions settings move.
- What happens to GitHub App installations when a repo changes owner. The docs only say installs are per account.
- Whether Dependabot alerts, Dependabot security updates and the other security settings stay on.
- Whether sub-issue and blocked-by links survive a repository transfer.
- How `github.io` chooses between a project site and a same-named folder in the user site.
- Whether Actions checkouts count as clones for name retirement.
- The default for an org's "Pages creation" member privilege.

## Sources

GitHub docs:

- [Transferring a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)
- [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Unpublishing a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/unpublishing-a-github-pages-site)
- [Troubleshooting 404 errors for GitHub Pages sites](https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites)
- [Securing your GitHub Pages site with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [Managing the publication of GitHub Pages sites for your organization](https://docs.github.com/en/organizations/managing-organization-settings/managing-the-publication-of-github-pages-sites-for-your-organization)
- [About GitHub Pages and Jekyll](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll)
- [Managing environments for deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [Disabling or limiting GitHub Actions for your organization](https://docs.github.com/en/organizations/managing-organization-settings/disabling-or-limiting-github-actions-for-your-organization)
- [Installing a GitHub App from a third party](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party)
- [Configuring Dependabot version updates](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates)
- [Configuring Dependabot alerts](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-dependabot-alerts)
- [Configuring Dependabot security updates](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-security-updates)
- [Applying a custom security configuration](https://docs.github.com/en/code-security/how-tos/secure-at-scale/configure-organization-security/establish-complete-coverage/apply-custom-configuration)
- [Adding sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues)
- [Creating issue dependencies](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies)
- [Managing remote repositories](https://docs.github.com/en/get-started/git-basics/managing-remote-repositories)
- [Moving your work to an organization](https://docs.github.com/en/account-and-profile/how-tos/account-management/moving-your-work-to-an-organization)

GitHub changelog:

- [GitHub Actions: updating the default GITHUB_TOKEN permissions to read-only (2023-02-02)](https://github.blog/changelog/2023-02-02-github-actions-updating-the-default-github_token-permissions-to-read-only/)
- [Evolving GitHub Issues and Projects (2025-04-09)](https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/)
- [Dependencies on issues (2025-08-21)](https://github.blog/changelog/2025-08-21-dependencies-on-issues/)
- [Deprecation of user to organization account transformation (2026-01-12)](https://github.blog/changelog/2026-01-12-deprecation-of-user-to-organization-account-transformation/)

Other first-party sources:

- [`actions/configure-pages` action.yml](https://github.com/actions/configure-pages/blob/main/action.yml)
- [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions) (Anthropic)
- [`anthropics/claude-code-action`: action.yml](https://github.com/anthropics/claude-code-action/blob/main/action.yml), [src/github/token.ts](https://github.com/anthropics/claude-code-action/blob/main/src/github/token.ts) and [docs/setup.md](https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md)
- [CodeRabbit: Add organizations](https://docs.coderabbit.ai/management/adding-organizations) and [Configuration overview](https://docs.coderabbit.ai/guides/configuration-overview)
- [Jekyll: Static Files](https://jekyllrb.com/docs/static-files/), [Front Matter](https://jekyllrb.com/docs/front-matter/) and [Directory Structure](https://jekyllrb.com/docs/structure/)
- [jekyll-sitemap README](https://github.com/jekyll/jekyll-sitemap#exclusions)
- [GitHub Pages dependency versions](https://pages.github.com/versions/)

#!/usr/bin/env bash
# Locks down the main branch the way open source projects do:
# nothing reaches main except through a reviewed, passing pull request.
#
# Usage:   scripts/protect-main.sh OWNER/REPO
# Needs:   the GitHub CLI (https://cli.github.com), logged in with `gh auth login` as a repo admin.
# Option:  STRICT=1 also applies the rules to admins (see docs/REPO_SETUP.md before using this
#          on a one-person project, because you cannot approve your own pull request).
set -euo pipefail

REPO="${1:?Usage: $0 OWNER/REPO}"
STRICT="${STRICT:-0}"
command -v gh >/dev/null || { echo "Install the GitHub CLI first: https://cli.github.com" >&2; exit 1; }

ENFORCE_ADMINS=false
[ "$STRICT" = "1" ] && ENFORCE_ADMINS=true

echo "1/5 Repository settings (squash merges only, delete merged branches)"
gh api -X PATCH "repos/$REPO" --input - >/dev/null <<JSON
{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "allow_auto_merge": true,
  "delete_branch_on_merge": true,
  "has_wiki": false
}
JSON

echo "2/5 Secret scanning and push protection (stops API keys being committed)"
gh api -X PATCH "repos/$REPO" --input - >/dev/null <<JSON || echo "   (skipped: not available for this repository)"
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON
gh api -X PUT "repos/$REPO/vulnerability-alerts" >/dev/null || true
gh api -X PUT "repos/$REPO/automated-security-fixes" >/dev/null || true

echo "3/5 Workflows get read-only access and cannot approve pull requests"
gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false >/dev/null

echo "4/5 Branch protection for main"
gh api -X PUT "repos/$REPO/branches/main/protection" --input - >/dev/null <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Check (ubuntu-latest)", "Check (windows-latest)", "Check (macos-latest)"]
  },
  "enforce_admins": $ENFORCE_ADMINS,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON

echo "5/5 Protect release tags (v*) from being moved or deleted"
gh api -X POST "repos/$REPO/rulesets" --input - >/dev/null <<JSON || echo "   (skipped: the ruleset may already exist)"
{
  "name": "Protect release tags",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "rules": [{ "type": "deletion" }, { "type": "update" }, { "type": "non_fast_forward" }]
}
JSON

echo
echo "Done. One setting must be changed by hand, see docs/REPO_SETUP.md:"
echo "  Settings > Actions > General > Fork pull request workflows > Require approval for all outside collaborators"

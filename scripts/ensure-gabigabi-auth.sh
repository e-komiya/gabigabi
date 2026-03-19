#!/usr/bin/env bash
set -euo pipefail

EXPECTED_USER="e-komiya"
EXPECTED_REPO="e-komiya/gabigabi"
EXPECTED_ORIGIN="git@github-ek:e-komiya/gabigabi.git"

# 1) Make sure gh has the target account and set it active.
if ! gh auth status >/dev/null 2>&1; then
  echo "[auth-guard] gh auth status failed. Run: gh auth login" >&2
  exit 1
fi

if ! gh auth switch -h github.com -u "$EXPECTED_USER" >/dev/null 2>&1; then
  echo "[auth-guard] failed to switch gh active user to $EXPECTED_USER" >&2
  gh auth status >&2 || true
  exit 1
fi

ACTIVE_USER="$(gh api user --jq .login 2>/dev/null || true)"
if [[ "$ACTIVE_USER" != "$EXPECTED_USER" ]]; then
  echo "[auth-guard] active gh user mismatch: expected=$EXPECTED_USER actual=${ACTIVE_USER:-<none>}" >&2
  exit 1
fi

# 2) Verify repo write access with authenticated API call.
PERM_JSON="$(gh api "repos/$EXPECTED_REPO" --jq '.permissions' 2>/dev/null || true)"
if [[ -z "$PERM_JSON" || "$PERM_JSON" == "null" ]]; then
  echo "[auth-guard] cannot read repo permissions for $EXPECTED_REPO" >&2
  exit 1
fi
if ! gh api "repos/$EXPECTED_REPO" --jq '(.permissions.push == true) or (.permissions.maintain == true) or (.permissions.admin == true)' | grep -q true; then
  echo "[auth-guard] missing write permission on $EXPECTED_REPO" >&2
  echo "[auth-guard] permissions=$PERM_JSON" >&2
  exit 1
fi

# 3) Validate git remotes: origin must be the SSH target repo.
ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$ORIGIN_URL" != "$EXPECTED_ORIGIN" ]]; then
  echo "[auth-guard] origin mismatch: expected=$EXPECTED_ORIGIN actual=${ORIGIN_URL:-<none>}" >&2
  exit 1
fi

# Optional warning only: non-origin push remotes that look dangerous.
while IFS= read -r remote; do
  [[ "$remote" == "origin" ]] && continue
  url="$(git remote get-url --push "$remote" 2>/dev/null || true)"
  [[ -z "$url" ]] && continue
  if [[ "$url" =~ ^https:// || "$url" == *"eisei-komiya/"* ]]; then
    echo "[auth-guard] warning: non-origin push remote detected: $remote -> $url" >&2
  fi
done < <(git remote)

echo "[auth-guard] OK user=$ACTIVE_USER origin=$ORIGIN_URL"

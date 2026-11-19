#!/bin/bash
# Bootstraps Claude Code on the web sessions. The remote container starts from a
# fresh clone with no node_modules, and it cannot reach a transit deployment.
set -euo pipefail

# The session VM carries this as "true", and it is never "true" on a local
# checkout, which the developer has already set up.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Without BOARD_DEMO the board calls transit, which the container can't reach, so
# every panel renders as an error card. The guard keeps resumes from stacking duplicates.
if [ -n "${CLAUDE_ENV_FILE:-}" ] && ! grep -q '^export BOARD_DEMO=' "$CLAUDE_ENV_FILE" 2>/dev/null; then
  {
    echo 'export BOARD_DEMO="1"'
    echo 'export NEXT_TELEMETRY_DISABLED="1"'
  } >> "$CLAUDE_ENV_FILE"
fi

# Unlike a setup script, this hook gets no environment-cache snapshot (it runs on
# every start and resume), so skip the install when the lockfile already matches
# what produced this node_modules. The stamp lives inside node_modules, so wiping
# the tree also invalidates it. stdout is dropped because SessionStart output is
# injected into Claude's context; errors still surface on stderr.
readonly INSTALL_STAMP='node_modules/.session-start-lock-hash'

if [ "$(cat "$INSTALL_STAMP" 2>/dev/null)" != "$(sha256sum pnpm-lock.yaml | cut -d' ' -f1)" ]; then
  if ! pnpm install --frozen-lockfile > /dev/null; then
    # Keeps a session bootable when a branch's lockfile has drifted. The install
    # rewrites pnpm-lock.yaml, so restore it afterwards: a stderr warning is easy
    # for an agent running `git add -A` to sail past, a clean tree is not.
    pnpm install > /dev/null
    git checkout -- pnpm-lock.yaml
  fi
  # Recomputed rather than reused: the fallback above may have rewritten the
  # lockfile, and stamping the pre-install hash would reinstall on every session.
  sha256sum pnpm-lock.yaml | cut -d' ' -f1 > "$INSTALL_STAMP"
fi

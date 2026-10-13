#!/bin/bash
#
# ci-local.sh — Run the same checks that GitHub Actions runs on PRs
#
# Matches these workflows:
#   - prettier.yml  → Prettier check + ESLint
#   - test.yml      → Jest unit tests
#   - build.yml     → Frontend build + Backend build
#
# Usage: ./scripts/ci-local.sh           (run all checks)
#        ./scripts/ci-local.sh quick     (skip builds, just lint + test)
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-full}"
FAILED=0

pass() { echo -e "${GREEN}  ✓ $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; FAILED=1; }
skip() { echo -e "${YELLOW}  ⊘ $1 (skipped)${NC}"; }

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Odyssey CI — Local${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""

# ─── 1. Prettier Check ───────────────────────────────────────────────
echo -e "${YELLOW}▶ Prettier check${NC}"
cd "$PROJECT_ROOT"
if npx prettier . --check 2>/dev/null; then
    pass "Prettier"
else
    fail "Prettier — run 'npm run prettier-write' to fix"
fi

# ─── 2. ESLint ────────────────────────────────────────────────────────
echo -e "${YELLOW}▶ ESLint${NC}"
cd "$PROJECT_ROOT"
if npm run lint 2>/dev/null; then
    pass "ESLint"
else
    fail "ESLint — run 'npm run lint' to see errors"
fi

# ─── 3. Frontend Tests ───────────────────────────────────────────────
echo -e "${YELLOW}▶ Frontend tests${NC}"
cd "$PROJECT_ROOT/frontend"
if npm test 2>/dev/null; then
    pass "Jest tests"
else
    fail "Jest tests — run 'cd frontend && npm test' to see failures"
fi

# ─── 4. Frontend Build ───────────────────────────────────────────────
if [ "$MODE" = "quick" ]; then
    skip "Frontend build (quick mode)"
else
    echo -e "${YELLOW}▶ Frontend build${NC}"
    cd "$PROJECT_ROOT/frontend"
    if npm run build 2>/dev/null; then
        pass "Frontend build"
    else
        fail "Frontend build — run 'cd frontend && npm run build' to see errors"
    fi
fi

# ─── 5. Backend Build ────────────────────────────────────────────────
if [ "$MODE" = "quick" ]; then
    skip "Backend build (quick mode)"
else
    echo -e "${YELLOW}▶ Backend build${NC}"
    cd "$PROJECT_ROOT/backend"
    if npm run build 2>/dev/null; then
        pass "Backend build"
    else
        fail "Backend build — run 'cd backend && npm run build' to see errors"
    fi
fi

# ─── Results ──────────────────────────────────────────────────────────
echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ All checks passed — safe to push${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ✗ Some checks failed — fix before pushing${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
    exit 1
fi

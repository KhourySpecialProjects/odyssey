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
#        ./scripts/ci-local.sh --agent [quick]  (adds backend Jest, short output,
#                                        ends with one summary line for review cards)
# CI runs no separate tsc step (next build type-checks), so none is run here.
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT=0
if [ "$1" = "--agent" ]; then AGENT=1; shift; fi
MODE="${1:-full}"
FAILED=0
SUM=""
CUR=""
LOGDIR="$(mktemp -d)"

# Agent mode logs each step to $LOGDIR; other modes keep today's output.
run() { CUR=$1; shift; if [ $AGENT = 1 ]; then "$@" >"$LOGDIR/${CUR/ /-}.log" 2>&1; else "$@" 2>/dev/null; fi; }
# Test count on pass, first failure on fail (agent mode only).
info() {
    local f="$LOGDIR/${CUR/ /-}.log"
    [ $AGENT = 1 ] && [ -f "$f" ] || return 0
    case "$CUR:$1" in
        *jest:ok) grep -m1 'Tests:' "$f" | sed -E 's/.* ([0-9]+) passed.*/ \1/' ;;
        *jest:bad) grep -E '^  ● |^FAIL ' "$f" | grep -v Console | head -1 | cut -c1-120 ;;
        prettier:bad) grep -m1 '^\[warn\] ' "$f" | cut -c1-120 ;;
        eslint:bad) grep -m1 '^/' "$f" ;;
        *:bad) grep -i -m1 'error' "$f" | cut -c1-120 ;;
    esac
}
pass() { echo -e "${GREEN}  ✓ $1${NC}"; SUM+=" · $CUR ✓$(info ok)"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; FAILED=1; SUM+=" · $CUR ✗ $(info bad) (log: $LOGDIR/${CUR/ /-}.log)"; }
skip() { echo -e "${YELLOW}  ⊘ $1 (skipped)${NC}"; }

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Odyssey CI — Local${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""

# ─── 1. Prettier Check ───────────────────────────────────────────────
echo -e "${YELLOW}▶ Prettier check${NC}"
cd "$PROJECT_ROOT"
if run prettier npx prettier . --check; then
    pass "Prettier"
else
    fail "Prettier — run 'npm run prettier-write' to fix"
fi

# ─── 2. ESLint ────────────────────────────────────────────────────────
echo -e "${YELLOW}▶ ESLint${NC}"
cd "$PROJECT_ROOT"
if run eslint npm run lint; then
    pass "ESLint"
else
    fail "ESLint — run 'npm run lint' to see errors"
fi

# ─── 3. Frontend Tests ───────────────────────────────────────────────
echo -e "${YELLOW}▶ Frontend tests${NC}"
cd "$PROJECT_ROOT/frontend"
if run 'frontend jest' npm test; then
    pass "Jest tests"
else
    fail "Jest tests — run 'cd frontend && npm test' to see failures"
fi

# ─── 3b. Backend Tests (agent mode only; SQLite, no Postgres) ────────
if [ $AGENT = 1 ]; then
    echo -e "${YELLOW}▶ Backend tests${NC}"
    cd "$PROJECT_ROOT/backend"
    if run 'backend jest' npm test; then
        pass "Backend Jest tests"
    else
        fail "Backend Jest tests — run 'cd backend && npm test' to see failures"
    fi
fi

# ─── 4. Frontend Build ───────────────────────────────────────────────
if [ "$MODE" = "quick" ]; then
    skip "Frontend build (quick mode)"
else
    echo -e "${YELLOW}▶ Frontend build${NC}"
    cd "$PROJECT_ROOT/frontend"
    if run 'frontend build' npm run build; then
        pass "Frontend build"
    else
        fail "Frontend build — run 'cd frontend && npm run build' to see errors"
    fi
fi

# ─── 5a. Single ckeditor5 version (cheap, runs in quick mode too) ────
echo -e "${YELLOW}▶ ckeditor5 single version${NC}"
cd "$PROJECT_ROOT/backend"
if run ckeditor node -e "const p=require('./package-lock.json').packages;const v=Object.keys(p).filter(k=>k.endsWith('node_modules/ckeditor5')).map(k=>p[k].version);if(v.length!==1){console.error('Expected one ckeditor5, found: '+v.join(', '));process.exit(1)}console.log('ckeditor5 '+v[0])"; then
    pass "Single ckeditor5 version"
else
    fail "Multiple ckeditor5 versions in backend/package-lock.json"
fi

# ─── 5. Backend Build ────────────────────────────────────────────────
if [ "$MODE" = "quick" ]; then
    skip "Backend build (quick mode)"
else
    echo -e "${YELLOW}▶ Backend build${NC}"
    cd "$PROJECT_ROOT/backend"
    if run 'backend build' npm run build; then
        pass "Backend build"
    else
        fail "Backend build — run 'cd backend && npm run build' to see errors"
    fi
fi

# ─── Results ──────────────────────────────────────────────────────────
echo ""
if [ $AGENT = 1 ]; then
    SHA="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
    echo "checks:${SUM# ·} · $SHA"
fi
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

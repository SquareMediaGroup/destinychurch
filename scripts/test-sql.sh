#!/usr/bin/env bash
# Runs the SQL test suites in tests/sql against a throwaway local Postgres.
#
# Each suite gets a fresh cluster: Supabase stubs (tests/sql/supabase-stubs.sql),
# then the migration under test, then the suite. Nothing touches a real
# Supabase project.
#
#   scripts/test-sql.sh                 # every suite
#   scripts/test-sql.sh destiny-one     # one suite
#
# Needs Postgres 16 binaries (initdb, pg_ctl, psql). Set PG_BIN to point at them
# if they aren't under /usr/lib/postgresql/16/bin.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
PORT="${PG_TEST_PORT:-54329}"

# suite name → the migrations it tests, applied in order (space-separated)
declare -A SUITES=(
  [destiny-one]="supabase/migrations/20260926_01_destiny_one.sql supabase/migrations/20260927_01_destiny_one_admin.sql"
)

selected=("$@")
if [ ${#selected[@]} -eq 0 ]; then selected=("${!SUITES[@]}"); fi

# initdb refuses to run as root; the postgres user is the usual way round it.
as_pg() {
  if [ "$(id -u)" = "0" ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi
}

WORK="$(mktemp -d)"
chmod 777 "$WORK"
cleanup() {
  as_pg "'$PG_BIN/pg_ctl' -D '$WORK/data' -m immediate stop" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

status=0
for suite in "${selected[@]}"; do
  migrations="${SUITES[$suite]:-}"
  if [ -z "$migrations" ]; then echo "❌ unknown suite: $suite"; exit 2; fi

  echo "🧪 $suite"
  as_pg "'$PG_BIN/pg_ctl' -D '$WORK/data' -m immediate stop" >/dev/null 2>&1 || true
  rm -rf "$WORK/data"
  as_pg "'$PG_BIN/initdb' -D '$WORK/data' -U postgres -A trust" >/dev/null
  as_pg "'$PG_BIN/pg_ctl' -D '$WORK/data' -o '-p $PORT -k $WORK' -l '$WORK/pg.log' -w start" >/dev/null

  cat "$ROOT/tests/sql/supabase-stubs.sql" > "$WORK/setup.sql"
  for m in $migrations; do cat "$ROOT/$m" >> "$WORK/setup.sql"; done
  cp "$ROOT/tests/sql/$suite.sql" "$WORK/suite.sql"
  chmod 644 "$WORK"/*.sql

  # Setup runs with warnings only (the migration's "does not exist, skipping"
  # notices are noise here). The suite prints each check's NOTICE, stripped of
  # psql's file:line prefix; pipefail keeps psql's exit status through the sed.
  psql_cmd="'$PG_BIN/psql' -h '$WORK' -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
  if as_pg "PGOPTIONS='-c client_min_messages=warning' $psql_cmd -f '$WORK/setup.sql'" >/dev/null \
     && as_pg "set -o pipefail; $psql_cmd -o /dev/null -f '$WORK/suite.sql' 2>&1 | sed -E 's/^psql:[^ ]+ (NOTICE|ERROR): +/\\1 /; s/^NOTICE //'"; then
    echo "✅ $suite passed"
  else
    echo "❌ $suite failed"
    status=1
  fi
done

exit $status

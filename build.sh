#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
cli="${TIZEN_CLI:-tizen}"
profile="${1:?Usage: bash build.sh CERTIFICATE_PROFILE}"

if ! command -v "$cli" >/dev/null 2>&1; then
    printf 'Set TIZEN_CLI to the full path to the Tizen Studio CLI.\n' >&2
    exit 1
fi

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
mkdir "$stage/app"
cp -R "$root/app/." "$stage/app/"
mkdir "$stage/output"
"$cli" package -t wgt -s "$profile" -o "$stage/output" -- "$stage/app"

mkdir -p "$root/dist"
mv "$stage/output/FarsiPlex.wgt" "$root/dist/FarsiPlex.wgt"
printf 'Package ready at %s\n' "$root/dist/FarsiPlex.wgt"

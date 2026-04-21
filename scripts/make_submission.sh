#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d "dashboard" ]]; then
  echo "ERROR: 'dashboard/' folder not found at repo root" >&2
  exit 1
fi

if [[ ! -d "outputs" ]]; then
  echo "ERROR: 'outputs/' folder not found at repo root" >&2
  exit 1
fi

rm -rf SUBMISSION
mkdir -p SUBMISSION

cp -R dashboard SUBMISSION/dashboard
cp -R outputs SUBMISSION/outputs

echo "Created SUBMISSION/ with dashboard/ and outputs/"
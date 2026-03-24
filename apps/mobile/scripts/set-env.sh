#!/bin/bash
# Usage: ./scripts/set-env.sh production|development
# Sets APP_ENV in app.json before building

ENV="${1:-production}"
APP_JSON="$(dirname "$0")/../app.json"

if [[ "$ENV" != "production" && "$ENV" != "development" ]]; then
  echo "Usage: $0 [production|development]"
  exit 1
fi

# Use node to safely update JSON
node -e "
const fs = require('fs');
const path = require('path');
const file = path.resolve('$APP_JSON');
const json = JSON.parse(fs.readFileSync(file, 'utf8'));
json.expo.extra.APP_ENV = '$ENV';
fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
console.log('APP_ENV set to: $ENV');
"

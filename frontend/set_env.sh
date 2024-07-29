#!/bin/sh
set -a

# Specify the absolute path to the JSON file
json_file="/mnt/secrets/odyssey_dev_frontend"

# Check if the file exists
if [ -f "$json_file" ]; then
  # Parse the JSON file and export each key-value pair as an environment variable
  for key in $(jq -r 'keys[]' "$json_file"); do
    value=$(jq -r --arg key "$key" '.[$key]' "$json_file")
    export "$key"="$value"
  done
else
  echo "JSON file not found: $json_file"
fi

set +a

# Execute the main container command
exec "$@"
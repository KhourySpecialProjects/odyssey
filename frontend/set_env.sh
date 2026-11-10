#!/bin/sh
set -a

echo "Starting set_env.sh script"
echo "Current directory: $(pwd)"

# Specify the absolute path to the JSON file
json_file="/mnt/secrets/odyssey_dev_frontend"

echo "Checking for file at: $json_file"
if [ -f "$json_file" ]; then
  echo "Found secrets file"
  
  # Parse the JSON file and export each key-value pair as an environment variable
  for key in $(jq -r 'keys[]' "$json_file"); do
    value=$(jq -r --arg key "$key" '.[$key]' "$json_file")
    export "$key"="$value"
    echo "Exported $key"
  done
  
else
  echo "JSON file not found: $json_file"
fi

set +a

echo "Executing command: $@"
# Execute the main container command
exec "$@"
# Use the official Node.js 14 image as the base image
FROM --platform=linux/amd64  node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Install jq for JSON parsing
RUN apk update && apk add jq

# Copy the entrypoint script into the container
COPY set_env.sh /usr/local/bin/set_env.sh

# Make the script executable
RUN chmod +x /usr/local/bin/set_env.sh

ENV AWS_CDN_URL=https://odyssey-dev-bucket.s3.us-east-2.amazonaws.com

# Accept build arguments from GitHub Actions
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST

# Promote to ENV so Next.js can use them during `next build`
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the port that the app will be running on
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/set_env.sh"]

# Set the command to start the app
CMD ["npm", "start"]

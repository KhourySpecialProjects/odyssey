# Use the official Node.js 22 image as the base image
FROM --platform=linux/amd64  node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Install jq for JSON parsing
RUN apk update && apk add jq

ENV AWS_CDN_URL=https://odyssey-prod-bucket.s3.us-east-2.amazonaws.com
ENV NODE_ENV=production

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

# Set the command to start the app
CMD ["npm", "start"]
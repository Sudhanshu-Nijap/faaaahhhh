# Use the official Microsoft Playwright image (has Chromium pre-installed!)
FROM mcr.microsoft.com/playwright:v1.50.1-jammy

# Set working directory
WORKDIR /app

# Set environment variables to optimize for the Playwright image
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production

# Copy dependency files first for caching
COPY package*.json ./

# Install dependencies
# We no longer need --ignore-scripts because .dockerignore prevents node_modules copying
RUN npm install

# Copy the rest of your backend code
COPY . .

# Port exposure
EXPOSE 5005

# Start engine
CMD ["npm", "start"]

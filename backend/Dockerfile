# Use the official Microsoft Playwright image (has Chromium pre-installed!)
FROM mcr.microsoft.com/playwright:v1.50.1-jammy

# Set working directory
WORKDIR /app

# Copy dependency files first for caching
COPY package*.json ./

# Install dependencies --ignore-scripts to avoid the previous permission issues during npm install
RUN npm install --ignore-scripts

# Copy the rest of your backend code
COPY . .

# Explicitly install the chromium binary only (already has deps in this image)
RUN npx playwright install chromium

# Port exposure
EXPOSE 5005

# Start engine
CMD ["npm", "start"]

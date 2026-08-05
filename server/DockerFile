# 1. Use a standard Node.js LTS image
FROM node:20-alpine

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package configuration files first (for Docker layer caching)
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of the application files
COPY . .

# 6. Expose the port (matches PORT=5000 in your .env)
EXPOSE 5000

# 7. Start the application in development mode
CMD ["npm", "run", "dev"]

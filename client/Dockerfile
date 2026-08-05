# 1. Use a standard Node.js LTS image
FROM node:20-alpine

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package configuration files first
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of the application files
COPY . .

# 6. Expose Vite's port
EXPOSE 5173

# 7. Run Vite and expose the host network interface
CMD ["npm", "run", "dev", "--", "--host"]

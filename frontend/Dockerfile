FROM node:18-alpine

WORKDIR /app

# Copy package.json
COPY package*.json ./

#Install dependencies
RUN npm install

# Copy rest of the files
COPY . .

# Port
EXPOSE 3000

# Start the app in development mode
CMD ["npm", "run", "dev"]
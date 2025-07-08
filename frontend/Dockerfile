# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Accept build argument for app version
ARG VITE_APP_VERSION=1.0
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

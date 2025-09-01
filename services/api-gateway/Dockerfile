FROM node:20-alpine AS builder

WORKDIR /app

# Install build essentials for Alpine (required for some npm packages)
RUN apk add --no-cache python3 make g++

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli


COPY . .

RUN npm install



EXPOSE 3001

CMD ["npm", "run", "start:dev"]
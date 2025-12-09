# Builder image
FROM node:24 AS builder

ARG DATABASE_URL
ARG SENTRY_AUTH_TOKEN

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install --ignore-scripts

# Bundle app source
COPY . .

# Transpile Prisma config file.
RUN npx swc prisma.config.ts -o prisma.config.js

# Generate Prisma types for app build.
RUN npx prisma generate --sql

# Creates a "dist" folder with the production build
RUN npm run build

# Final image
FROM node:24-alpine

WORKDIR /app

COPY --from=builder /usr/src/app/package*.json ./
RUN npm ci --ignore-scripts --omit=dev && \
    npm cache clean --force

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma.config.js ./prisma.config.js
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/entrypoint.sh .

# Set entrypoint to run migrations and start app.
ENTRYPOINT ["sh", "entrypoint.sh"]
EXPOSE 3000
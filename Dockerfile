# Builder image
FROM node:22 AS builder

ARG DATABASE_URL

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm ci --ignore-scripts
RUN npm i --ignore-scripts @swc/core-linux-x64-gnu

# Bundle app source
COPY . .

# Generate Prisma types for app build.
RUN npm run db:generate

# Creates a "dist" folder with the production build
RUN npm run build

# Final image
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /usr/src/app/dist ./dist
# Copy Prisma engines to a special tmp directory for Prisma to find.
COPY --from=builder /usr/src/app/src/generated/*.node /tmp/prisma-enginges
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/entrypoint.sh .

# Set entrypoint to run migrations and start app.
ENTRYPOINT ["sh", "entrypoint.sh"]
EXPOSE 3000
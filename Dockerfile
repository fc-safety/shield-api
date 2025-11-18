# Builder image
FROM node:24 AS builder

ARG DATABASE_URL

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm ci --ignore-scripts
# Install platform-specific SWC core
RUN if [ "$(uname -m)" = "x86_64" ]; then \
      npm i --ignore-scripts @swc/core-linux-x64-gnu; \
    elif [ "$(uname -m)" = "aarch64" ] || [ "$(uname -m)" = "arm64" ]; then \
      npm i --ignore-scripts @swc/core-linux-arm64-gnu; \
    fi

# Bundle app source
COPY . .

# Generate Prisma types for app build.
RUN npx prisma migrate deploy
RUN npm run db:generate

# Creates a "dist" folder with the production build
RUN npm run build

# Final image
FROM node:24-alpine

WORKDIR /app

COPY --from=builder /usr/src/app/dist ./dist
# Copy Prisma engines to a special tmp directory for Prisma to find.
COPY --from=builder /usr/src/app/src/generated/prisma/client/*.node ./dist/generated/prisma/client/
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/entrypoint.sh .

# Set entrypoint to run migrations and start app.
ENTRYPOINT ["sh", "entrypoint.sh"]
EXPOSE 3000
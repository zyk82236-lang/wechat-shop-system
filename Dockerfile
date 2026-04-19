FROM node:20-alpine

WORKDIR /app

# Install dependencies with workspace lockfile for deterministic builds.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm install --include=dev

# Copy source and build API workspace.
COPY . .
RUN npm --workspace @shop/api exec tsc -p tsconfig.json

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "--workspace", "@shop/api", "run", "start"]

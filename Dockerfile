FROM node:16-alpine as builder

# Build React app
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Set up server
FROM node:16-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./
COPY --from=builder /app/client/build ./public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000
CMD ["node", "app.js"]
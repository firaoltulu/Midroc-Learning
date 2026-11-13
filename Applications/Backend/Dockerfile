FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./dist/migrations
RUN mkdir -p /var/lib/lms/pdfs && chown -R node:node /var/lib/lms/pdfs
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run migrate:compiled && npm start"]

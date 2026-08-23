FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY dashboard/package.json ./dashboard/
RUN npm install && npm install --prefix dashboard
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV MAXXMETER_DATA_DIR=/data
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/dashboard/dist ./dashboard/dist
EXPOSE 8099 8765
CMD ["node", "dist/index.js"]

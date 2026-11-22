FROM node:20-alpine
WORKDIR /app

COPY . .

RUN npm ci --no-audit --no-fund
RUN npx prisma generate --schema prisma/schema.prisma
RUN npm run build -w @maxseller/api

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["npm", "run", "start", "-w", "@maxseller/api"]

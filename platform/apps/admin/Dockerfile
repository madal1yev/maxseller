FROM node:20-alpine
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://api:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN npm ci --no-audit --no-fund
RUN npm run build -w @maxseller/admin

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start", "-w", "@maxseller/admin"]

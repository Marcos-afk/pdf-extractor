FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable

COPY package.json yarn.lock ./
COPY prisma ./prisma/

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn prisma generate
RUN yarn build


FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json yarn.lock ./
COPY prisma ./prisma/

RUN yarn install --frozen-lockfile --production=true
RUN yarn prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["yarn", "prod"]

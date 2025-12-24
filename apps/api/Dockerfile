FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml* tsconfig.json tsconfig.build.json jest.config.js .eslintrc.js .prettierrc.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

RUN pnpm install --prod=false --ignore-scripts
RUN pnpm prisma:generate
RUN pnpm build

RUN chmod +x scripts/migrate-and-start.sh

ENV NODE_ENV=production

CMD ["sh", "./scripts/migrate-and-start.sh"]

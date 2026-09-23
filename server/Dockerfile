FROM node:22-alpine

WORKDIR /usr/src/app

RUN corepack enable

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "yarn db:generate && yarn start:dev"]

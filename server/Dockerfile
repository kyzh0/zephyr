FROM  node:lts-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE ${NODE_DOCKER_PORT}
ENV NODE_ENV='production'
CMD ["npm", "start"]
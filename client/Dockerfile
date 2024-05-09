FROM  node:20.12.2-alpine3.19
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
ENV NODE_ENV='production'
CMD ["npm", "run", "build"]

# Stage 1
FROM  node:lts-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
ENV NODE_ENV='production'
CMD ["npm", "run", "build"]

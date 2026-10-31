FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY index.html about.html services.html contact.html server.mjs ./
COPY css ./css
COPY js ./js

USER node
CMD ["node", "server.mjs"]

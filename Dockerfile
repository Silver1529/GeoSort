# GeoSort - imagem para publicar o sistema completo (servidor + programa em C)
FROM node:22-bookworm-slim

# compilador C para gerar o executavel geosort
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN gcc -O2 -Wall -Wextra -std=c99 -o geosort geosort.c

# o Render informa a porta pela variavel PORT
ENV PORT=10000
EXPOSE 10000
CMD ["node", "server.js"]

ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.19
ARG BUILD_VERSION
FROM ${BUILD_FROM}

ARG GITHUB_REPOSITORY="dougrathbone/maxx-meter"
ARG GITHUB_REF="main"

RUN apk add --no-cache nodejs npm git

WORKDIR /app
RUN git clone --depth 1 --branch "${GITHUB_REF}" "https://github.com/${GITHUB_REPOSITORY}.git" /tmp/src \
  && cp -a /tmp/src/. /app/ \
  && rm -rf /tmp/src

RUN npm install && npm install --prefix dashboard && npm run build

ENV MAXXMETER_DATA_DIR=/data
ENV NODE_ENV=production

COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
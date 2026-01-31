FROM oven/bun:alpine

WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

CMD ["bun", "cmd.ts"]

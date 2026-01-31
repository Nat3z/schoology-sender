import { env } from "bun";

if (env.CMD === 'server') {
  import('./route');
} else {
  throw new Error('Invalid command');
}

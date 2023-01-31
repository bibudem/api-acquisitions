import { fileURLToPath } from 'node:url'
import sirv from 'sirv'

export const getIcon = sirv(fileURLToPath(new URL('../public', import.meta.url)), {
  dev: !process.env.NODE_ENV.endsWith('production'),
  maxAge: 60 * 60, // 1h
});
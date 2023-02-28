import dotenv from 'dotenv-safe'

import { listenServer2 } from './src/server-v2'
dotenv.config()

/**
 * Demo CLI for testing basic functionality.
 *
 * ```
 * npx tsx index-v2.ts
 * ```
 */
async function main() {
    const port = process.env.SERVER_PORT
    await listenServer2(Number(port))
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
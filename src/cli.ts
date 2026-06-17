import { callTrustRailTool, listTrustRailTools, type TrustRailToolName } from './skill'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

async function main() {
  const [, , command, payload] = process.argv

  if (!command || command === 'list') {
    printJson({ ok: true, tools: listTrustRailTools() })
    return
  }

  const input = payload ? JSON.parse(readPayload(payload)) : {}
  const result = await callTrustRailTool(command as TrustRailToolName, input)
  printJson(result)
}

function readPayload(payload: string) {
  if (!payload.startsWith('@')) {
    return payload
  }

  return readFileSync(resolve(payload.slice(1)), 'utf8')
}

function printJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  printJson({ ok: false, error: message })
  process.exitCode = 1
})

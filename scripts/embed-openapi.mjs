// Embeds docs/api/openapi.yaml into docs/api/index.html so the viewer works from file://.
// Run after editing the spec: node scripts/embed-openapi.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const yamlPath = new URL('../docs/api/openapi.yaml', import.meta.url)
const htmlPath = new URL('../docs/api/index.html', import.meta.url)

const yaml = readFileSync(yamlPath, 'utf8')
if (yaml.includes('</script')) {
  throw new Error('openapi.yaml must not contain "</script"')
}

const html = readFileSync(htmlPath, 'utf8')
const pattern = /(<script id="openapi-spec" type="text\/yaml">)[\s\S]*?(<\/script>)/
if (!pattern.test(html)) {
  throw new Error('Placeholder <script id="openapi-spec"> not found in index.html')
}

writeFileSync(htmlPath, html.replace(pattern, (_, open, close) => `${open}\n${yaml}${close}`))
console.log('openapi.yaml embedded in docs/api/index.html')

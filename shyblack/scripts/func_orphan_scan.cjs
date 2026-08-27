const fs = require('fs')
const path = require('path')
const OUT = process.env.OUT || ''
const srcRoot = path.join(__dirname, '..', 'src')

function walk(dir) {
  let out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out = out.concat(walk(p))
    else if (/\.(js|jsx)$/.test(e.name)) out.push(p)
  }
  return out
}
const allFiles = walk(srcRoot)
function read(p) { try { return fs.readFileSync(p, 'utf8') } catch { return '' } }

const utilsDir = path.join(srcRoot, 'utils')
const utilFiles = fs.readdirSync(utilsDir).filter(f => /\.js$/.test(f))

const report = []
for (const uf of utilFiles) {
  const p = path.join(utilsDir, uf)
  const content = read(p)
  if (/lazyImport/.test(uf)) continue
  // find exported functions: export function NAME(  or export async function NAME(  or export const NAME =  (not arrow only)
  const re = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g
  const re2 = /export\s+(?:const|let)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(?/g
  const names = new Set()
  let m
  while ((m = re.exec(content))) names.add(m[1])
  while ((m = re2.exec(content))) names.add(m[1])
  const unused = []
  for (const name of names) {
    let count = 0
    for (const file of allFiles) {
      if (file === p) continue
      const c = read(file)
      const c2 = c.replace(/^\s*\/\/.*$/gm, '').replace(/^\s*\/\*[\s\S]*?\*\//gm, '')
      if (new RegExp(`\\b${name}\\b`).test(c2)) count++
    }
    if (count === 0) unused.push(name)
  }
  if (unused.length > 0) report.push(`${uf}: UNUSED -> ${unused.join(', ')}`)
}
fs.writeFileSync(OUT, report.join('\n'))
console.log('written', OUT, 'files with unused funcs:', report.length)
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
  const base = uf.replace(/\.js$/, '')
  let hits = []
  for (const file of allFiles) {
    if (file === path.join(utilsDir, uf)) continue
    const content = read(file)
    const re = new RegExp(`(?:utils|Utilities)/${base}(?:'|\\")|from\\s+['\\"]\\.{1,2}/${base}['\\"]|import\\(['\\"]\\.{1,2}/${base}['\\"]\\)`)
    if (re.test(content)) hits.push(path.relative(srcRoot, file))
  }
  if (hits.length === 0) report.push(`ORPHANED: ${uf}`)
  else report.push(`used(${hits.length}): ${uf}  <- ${hits.slice(0, 5).join(', ')}`)
}

fs.writeFileSync(OUT, report.join('\n'))
console.log('written', OUT, 'entries', report.length)
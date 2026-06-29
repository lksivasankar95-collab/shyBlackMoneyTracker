import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const logoPath = join(root, 'public', 'logo.png')
const iconsDir = join(root, 'icons')

const sizes = [48, 72, 96, 128, 192, 256, 512]

async function main() {
  const logo = readFileSync(logoPath)
  for (const size of sizes) {
    await sharp(logo)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toFile(join(iconsDir, `icon-${size}.webp`))
    console.log(`Created icon-${size}.webp`)
  }
}

main().catch(console.error)

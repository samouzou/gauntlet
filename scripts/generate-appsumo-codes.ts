import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { generateCode, getCodeSecret } from '../src/lib/appsumo/codes';

const count = Number(process.argv[2] || 1000);
if (!Number.isInteger(count) || count < 1000 || count > 10000) {
  console.error('Usage: npm run appsumo:codes -- <count between 1000 and 10000>');
  process.exit(1);
}

const secret = getCodeSecret();
const codes = new Set<string>();
while (codes.size < count) codes.add(generateCode(secret));

const outDir = path.join(process.cwd(), 'appsumo-assets', 'private');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `appsumo-codes-${count}.csv`);
writeFileSync(outFile, ['code', ...codes].join('\n') + '\n');
console.log(`Wrote ${codes.size} codes to ${path.relative(process.cwd(), outFile)}`);

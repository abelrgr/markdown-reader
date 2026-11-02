import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const sectionCount = 20_000;
const headings = Array.from({ length: sectionCount }, (_, index) => `## Section ${index}`).join(
  '\n\n',
);
const targetBytes = 5_000_000;
const paddingBytes = targetBytes - Buffer.byteLength(headings) - 4;
const markdown = `${headings}\n\n${'x'.repeat(paddingBytes)}\n`;
const output = resolve('tests/e2e/generated/big.md');

await mkdir(dirname(output), { recursive: true });
await writeFile(output, markdown);
console.log(`Generated ${output}: ${Buffer.byteLength(markdown)} bytes, ${sectionCount} headings`);

// Optional source rebuild. Requires Node.js; no npm install or dependencies.
// Output goes to public/house/trustus-house.js so Next.js serves it statically.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const [source, css, svg, configText] = await Promise.all([
  read('src/widget.js'), read('src/widget.css'), read('src/house.svg'), read('src/domains.json'),
]);
const marker = '/*__ASSETS__*/null';
if (!source.includes(marker)) throw new Error('Widget asset marker is missing.');
const config = JSON.parse(configText);
if (config.domains.length !== 15) throw new Error('Expected all fifteen domain definitions.');
// Keep all runtime CSS in the component's one shadow stylesheet. The editable
// source SVG retains its own stylesheet for standalone use.
let svgCss = '';
const runtimeSvg = svg.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/g, (_, rules) => { svgCss += rules + '\n'; return ''; });
const payload = JSON.stringify({version:'1.0.0', css:svgCss + css, svg:runtimeSvg, config}).replace(/</g, '\\u003c');
const bundle = source.replace(marker, () => payload);
const out = new URL('../../public/house/', import.meta.url);
await mkdir(out, {recursive:true});
await writeFile(new URL('trustus-house.js', out), bundle);
console.log('Built public/house/trustus-house.js: ' + Buffer.byteLength(bundle).toLocaleString('en-GB') + ' bytes; ' + gzipSync(bundle).length.toLocaleString('en-GB') + ' bytes with gzip.');

const fs = require('fs');
const path = require('path');

// Directory to scan
const PUBLIC_DIR = path.join(__dirname, 'public');
const FAVICON_NAMES = ['favicon.ico', 'favicon.png', 'favicon.svg'];

// Find all .html files, except public/index.html
function findHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (let file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findHtmlFiles(filePath));
    } else if (
      file.endsWith('.html') &&
      !(dir === PUBLIC_DIR && file === 'index.html')
    ) {
      results.push(filePath);
    }
  }
  return results;
}

// Extract <title>...</title> from HTML
function extractTitle(html, fallback) {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1].trim() : fallback;
}

// Extract first <!--snippet ... --> comment from HTML
function extractSnippet(html) {
  const match = html.match(/<!--\s*snippet\s*([^]*?)-->/i);
  return match ? match[1].trim() : '';
}

// Extract favicon from <link rel="icon" ... href="...">
// Returns relative path, or undefined if not found
function extractFaviconFromHtml(html, htmlFilePath) {
  const iconRegex = /<link[^>]+rel=["']?icon["']?[^>]*>/ig;
  const hrefRegex = /href=["']([^"']+)["']/i;
  let match;
  while ((match = iconRegex.exec(html)) !== null) {
    const tag = match[0];
    const hrefMatch = tag.match(hrefRegex);
    if (hrefMatch && hrefMatch[1]) {
      let href = hrefMatch[1].trim();
      // If href is absolute (http/https), just use as is
      if (/^(http|https):\/\//i.test(href)) return href;
      // If href is root-relative (/favicon.ico)
      if (href.startsWith('/')) {
        return href.replace(/^\//, ''); // remove leading slash, relative to public/
      }
      // Otherwise, resolve relative to file's directory
      const dir = path.dirname(htmlFilePath);
      const absFavicon = path.resolve(dir, href);
      return path.relative(PUBLIC_DIR, absFavicon).replace(/\\/g, '/');
    }
  }
  return undefined;
}

// Fallback: Try to find a favicon file in the same directory
function detectFaviconFile(htmlFilePath) {
  const dir = path.dirname(htmlFilePath);
  for (const faviconName of FAVICON_NAMES) {
    const faviconPath = path.join(dir, faviconName);
    if (fs.existsSync(faviconPath)) {
      return path.relative(PUBLIC_DIR, faviconPath).replace(/\\/g, '/');
    }
  }
  return undefined;
}

// Main
function main() {
  const siteIndex = [];

  // Add Home page (index.html)
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    let favicon = extractFaviconFromHtml(html, indexPath);
    if (!favicon) favicon = detectFaviconFile(indexPath);
    siteIndex.push({
      title: 'Home',
      path: 'index.html',
      snippet: extractSnippet(html),
      ...(favicon ? { favicon } : {})
    });
  }

  // Add all other HTML files
  const htmlFiles = findHtmlFiles(PUBLIC_DIR);
  for (let filePath of htmlFiles) {
    const relPath = path.relative(PUBLIC_DIR, filePath).replace(/\\/g, '/');
    const html = fs.readFileSync(filePath, 'utf8');
    const title = extractTitle(html, relPath);
    const snippet = extractSnippet(html);
    let favicon = extractFaviconFromHtml(html, filePath);
    if (!favicon) favicon = detectFaviconFile(filePath);
    siteIndex.push({
      title,
      path: relPath,
      snippet,
      ...(favicon ? { favicon } : {})
    });
  }

  // Write to siteIndex.json
  const outPath = path.join(PUBLIC_DIR, 'siteIndex.json');
  fs.writeFileSync(outPath, JSON.stringify(siteIndex, null, 2), 'utf8');
  console.log(`Generated ${outPath} with ${siteIndex.length} entries.`);
}

main();
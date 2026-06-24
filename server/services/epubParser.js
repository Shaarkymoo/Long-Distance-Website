import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  preserveOrder: false,
});

/**
 * Parse an EPUB file buffer and extract pages of plain text.
 * Returns { title, author, pages: string[] }
 */
export function parseEpub(buffer) {
  const zip = new AdmZip(buffer);

  // -- Read container.xml to find the OPF path --
  const containerXml = zip.readAsText('META-INF/container.xml');
  if (!containerXml) {
    throw new Error('Invalid EPUB: missing META-INF/container.xml');
  }

  const container = xmlParser.parse(containerXml);
  const rootfile = container?.container?.rootfiles?.rootfile;
  const opfPath = rootfile?.['@_full-path'];
  if (!opfPath) {
    throw new Error('Invalid EPUB: cannot find OPF path in container.xml');
  }
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

  // -- Parse OPF --
  const opfXml = zip.readAsText(opfPath);
  if (!opfXml) {
    throw new Error(`Invalid EPUB: cannot read OPF at ${opfPath}`);
  }

  const opf = xmlParser.parse(opfXml);
  const pkg = opf?.package;
  if (!pkg) {
    throw new Error('Invalid EPUB: no <package> in OPF');
  }

  // Extract metadata
  const meta = pkg.metadata || {};
  const dcTitle = meta['dc:title'];
  const title = typeof dcTitle === 'string' ? dcTitle.trim() : 'Untitled';
  const dcCreator = meta['dc:creator'];
  const author = typeof dcCreator === 'string' ? dcCreator.trim() : 'Unknown';

  // Build href map from manifest
  const manifest = pkg.manifest?.item;
  const items = Array.isArray(manifest) ? manifest : manifest ? [manifest] : [];
  const hrefMap = {};
  for (const item of items) {
    if (item['@_href']) {
      hrefMap[item['@_id']] = item['@_href'];
    }
  }

  // Read spine (reading order)
  const spine = pkg.spine?.itemref;
  const spineRefs = Array.isArray(spine) ? spine : spine ? [spine] : [];
  const pageHrefs = [];

  for (const ref of spineRefs) {
    const idref = ref['@_idref'];
    if (idref && hrefMap[idref]) {
      pageHrefs.push(hrefMap[idref]);
    }
  }

  if (pageHrefs.length === 0) {
    throw new Error('Invalid EPUB: no pages found in spine');
  }

  // -- Extract text from each page --
  const pages = [];

  for (const href of pageHrefs) {
    const fullPath = opfDir + href;
    const xhtml = zip.readAsText(fullPath);
    if (!xhtml) continue;

    const text = extractText(xhtml).trim();
    // Skip empty pages (e.g. nav points, blank pages)
    if (text.length > 0) {
      pages.push(text);
    }
  }

  if (pages.length === 0) {
    throw new Error('Could not extract any text from EPUB');
  }

  return { title, author, pages };
}

/**
 * Strip HTML/XML tags and decode common entities from an XHTML string.
 */
function extractText(html) {
  // Remove <style> and <script> blocks and their content
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  // Replace <br>, <p>, <div>, <h1-6>, <li> with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|td|th|blockquote|pre|section|article)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Strip remaining tags
  text = text.replace(/<[^>]*>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&mdash;/g, '—');
  text = text.replace(/&ndash;/g, '–');
  text = text.replace(/&rsquo;/g, "'");
  text = text.replace(/&lsquo;/g, "'");
  text = text.replace(/&rdquo;/g, '"');
  text = text.replace(/&ldquo;/g, '"');
  // Collapse whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/^\s+/gm, '');
  text = text.trim();
  return text;
}

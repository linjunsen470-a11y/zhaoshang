export async function checkHomepage(homeUrl) {
  const get = url => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const home = await get(homeUrl);
  const html = await home.text();
  const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0] || '';
  const filingLink = /<a [^>]*href="https:\/\/beian\.miit\.gov\.cn\/"[^>]*>粤ICP备2026186178号<\/a>/;
  const policeLink = /<a [^>]*href="https:\/\/beian\.mps\.gov\.cn\/#\/query\/webSearch\?code=44011802001719"[^>]*>\s*<img\b[^>]*\ssrc="\/_next\/static\/[^"]+"[^>]*\/?>\s*<span>粤公网安备44011802001719号<\/span>\s*<\/a>/;
  if (home.status !== 200 || !html.includes('id="mini-program"') ||
      !html.includes('岭南旺铺') || !html.includes('class="gallery"') || !filingLink.test(footer) || !policeLink.test(footer)) {
    throw new Error('Homepage failed its mini-program or filing link check');
  }

  const stylesheet = html.match(/href="(\/_next\/static\/[^"]+\.css[^"]*)"/)?.[1];
  const images = Array.from(html.matchAll(/<img\b[^>]*\ssrc="(\/_next\/static\/[^"]+)"/g), match => match[1]);
  if (!stylesheet || new Set(images).size !== 6) throw new Error('Expected a stylesheet, brand logo, filing badge and four photographs');
  for (const asset of [stylesheet, ...images]) {
    const response = await get(new URL(asset, homeUrl));
    const type = response.headers.get('content-type') || '';
    if (response.status !== 200 || !type.startsWith(asset === stylesheet ? 'text/css' : 'image/')) {
      throw new Error('Homepage asset is unavailable: ' + asset);
    }
    await response.body?.cancel();
  }
}

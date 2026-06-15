import { parseStringPromise } from 'xml2js';

function getCover(item, channel) {
  if (item['itunes:image'] && item['itunes:image'][0] && item['itunes:image'][0].$) {
    return item['itunes:image'][0].$.href;
  }
  if (item.enclosure && item.enclosure[0] && item.enclosure[0].$ && item.enclosure[0].$.type && item.enclosure[0].$.type.startsWith('image')) {
    return item.enclosure[0].$.url;
  }
  if (channel['itunes:image'] && channel['itunes:image'][0] && channel['itunes:image'][0].$) {
    return channel['itunes:image'][0].$.href;
  }
  if (channel.image && channel.image[0] && channel.image[0].url) {
    return Array.isArray(channel.image[0].url) ? channel.image[0].url[0] : channel.image[0].url;
  }
  return '';
}

function getChannelCover(channel) {
  if (channel['itunes:image'] && channel['itunes:image'][0] && channel['itunes:image'][0].$) {
    return channel['itunes:image'][0].$.href;
  }
  if (channel.image && channel.image[0] && channel.image[0].url) {
    return Array.isArray(channel.image[0].url) ? channel.image[0].url[0] : channel.image[0].url;
  }
  return '';
}

function getText(value) {
  if (!value) return '';
  if (Array.isArray(value)) return value[0] || '';
  return value;
}

function extractHtmlText(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim().substring(0, 300);
}

function getDuration(duration) {
  if (!duration) return 0;
  const d = getText(duration);
  if (!d) return 0;
  if (d.includes(':')) {
    const parts = d.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  return parseInt(d, 10) || 0;
}

export async function parseRSS(xmlData) {
  try {
    const result = await parseStringPromise(xmlData, {
      explicitArray: true,
      ignoreAttrs: false,
      mergeAttrs: false,
    });

    const channel = result.rss && result.rss.channel ? result.rss.channel[0] : null;
    if (!channel) {
      throw new Error('Invalid RSS feed: no channel found');
    }

    const items = channel.item || [];
    const episodes = items.slice(0, 10).map((item, index) => {
      const enclosure = item.enclosure && item.enclosure[0] ? item.enclosure[0].$ : null;
      return {
        id: `ep_${Date.now()}_${index}`,
        title: getText(item.title),
        description: extractHtmlText(getText(item.description) || getText(item['content:encoded'])),
        pubDate: getText(item.pubDate),
        duration: getDuration(item['itunes:duration']),
        audioUrl: enclosure ? enclosure.url : '',
        audioType: enclosure ? enclosure.type : 'audio/mpeg',
        cover: getCover(item, channel),
        link: getText(item.link),
        guid: getText(item.guid),
      };
    });

    const categories = [];
    if (channel.category) {
      channel.category.forEach((cat) => {
        const text = getText(cat);
        if (text) categories.push(text);
      });
    }
    if (channel['itunes:category']) {
      channel['itunes:category'].forEach((cat) => {
        if (cat.$ && cat.$.text) categories.push(cat.$.text);
      });
    }

    return {
      title: getText(channel.title),
      description: extractHtmlText(getText(channel.description)),
      cover: getChannelCover(channel),
      link: getText(channel.link),
      language: getText(channel.language),
      categories: [...new Set(categories)].filter(Boolean).slice(0, 10),
      episodes,
      lastBuildDate: getText(channel.lastBuildDate) || getText(channel.pubDate),
    };
  } catch (error) {
    console.error('RSS Parse Error:', error);
    throw new Error(`Failed to parse RSS: ${error.message}`);
  }
}

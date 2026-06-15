import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { AuctionItem, BidRequest, WebSocketMessage } from './src/types';
import { validateBid, createBidRecord, applyBidToItem, getUserBidCount } from './src/BidEngine';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

const AUCTION_DURATION = 60 * 1000;

const now = Date.now();
const auctionItems: AuctionItem[] = [
  {
    id: 'item-1',
    title: '《星夜》梵高复刻版画',
    description: '文森特·梵高于1889年在法国圣雷米的一家精神病院里创作的一幅油画，是梵高的代表作之一。这幅画展现了一个充满运动感的夜空，漩涡状的云彩和明亮的星星，表达了画家内心的情感和对宇宙的敬畏。本复刻版画采用博物馆级画布和 archival 油墨，色彩还原度高达98%。',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Van%20Gogh%20Starry%20Night%20painting%20impressionist%20style&image_size=square',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Van%20Gogh%20Starry%20Night%20painting%20impressionist%20style%20masterpiece%20detailed&image_size=landscape_16_9',
    startingPrice: 5000,
    currentPrice: 5000,
    bidCount: 0,
    status: 'active',
    startTime: now,
    endTime: now + AUCTION_DURATION,
    bidHistory: []
  },
  {
    id: 'item-2',
    title: '《日出·印象》莫奈限量版',
    description: '克劳德·莫奈于1872年在勒阿弗尔港口创作的一幅油画，是印象派的开山之作。画面描绘了晨雾笼罩中的日出港口景象，用轻快跳跃的色彩捕捉了光线的瞬间效果。此限量版共发行500份，附带艺术家认证证书。',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Monet%20Impression%20Sunrise%20impressionist%20painting%20harbor&image_size=square',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Monet%20Impression%20Sunrise%20impressionist%20painting%20harbor%20morning%20light&image_size=landscape_16_9',
    startingPrice: 8000,
    currentPrice: 8000,
    bidCount: 0,
    status: 'waiting',
    startTime: now + AUCTION_DURATION + 5000,
    endTime: now + AUCTION_DURATION * 2 + 5000,
    bidHistory: []
  },
  {
    id: 'item-3',
    title: '《呐喊》蒙克艺术微喷',
    description: '爱德华·蒙克于1893年创作的表现主义代表作，画面中一个扭曲的人形在血红色的天空下发出尖叫，表达了现代人内心的焦虑和存在的痛苦。采用12色艺术微喷技术，输出于德国哈内姆勒蚀刻纸。',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Edvard%20Munch%20The%20Scream%20expressionist%20painting&image_size=square',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Edvard%20Munch%20The%20Scream%20expressionist%20painting%20vivid%20colors&image_size=landscape_16_9',
    startingPrice: 12000,
    currentPrice: 12000,
    bidCount: 0,
    status: 'waiting',
    startTime: now + AUCTION_DURATION * 2 + 10000,
    endTime: now + AUCTION_DURATION * 3 + 10000,
    bidHistory: []
  },
  {
    id: 'item-4',
    title: '《睡莲》系列莫奈原作版画',
    description: '克劳德·莫奈晚年最重要的系列作品，创作于吉维尼花园的池塘边。画家在不同的时间、季节和光线下描绘同一主题，探索色彩和光影的变化。此版画由巴黎橘园美术馆官方授权。',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Monet%20Water%20Lilies%20impressionist%20painting%20pond&image_size=square',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Monet%20Water%20Lilies%20impressionist%20painting%20pond%20garden%20serene&image_size=landscape_16_9',
    startingPrice: 15000,
    currentPrice: 15000,
    bidCount: 0,
    status: 'waiting',
    startTime: now + AUCTION_DURATION * 3 + 15000,
    endTime: now + AUCTION_DURATION * 4 + 15000,
    bidHistory: []
  },
  {
    id: 'item-5',
    title: '《戴珍珠耳环的少女》维米尔',
    description: '约翰内斯·维米尔于1665年创作的荷兰黄金时代最著名的肖像画之一，被称为"北方的蒙娜丽莎"。画中少女戴着蓝色头巾和珍珠耳环，回眸一瞥的神秘表情令人着迷。此复刻采用荷兰传统油画布基底。',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Vermeer%20Girl%20with%20a%20Pearl%20Earring%20dutch%20master&image_size=square',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Vermeer%20Girl%20with%20a%20Pearl%20Earring%20dutch%20master%20painting%20detailed&image_size=landscape_16_9',
    startingPrice: 20000,
    currentPrice: 20000,
    bidCount: 0,
    status: 'waiting',
    startTime: now + AUCTION_DURATION * 4 + 20000,
    endTime: now + AUCTION_DURATION * 5 + 20000,
    bidHistory: []
  }
];

const broadcast = (message: WebSocketMessage) => {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

const sendToClient = (ws: WebSocket, message: WebSocketMessage) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};

app.get('/api/items', (_req, res) => {
  res.json(auctionItems);
});

app.get('/api/items/:id', (req, res) => {
  const item = auctionItems.find(i => i.id === req.params.id);
  if (item) {
    res.json(item);
  } else {
    res.status(404).json({ error: 'Item not found' });
  }
});

app.get('/api/time', (_req, res) => {
  res.json({ serverTime: Date.now() });
});

app.post('/api/bid', (req, res) => {
  const bid: BidRequest = req.body;
  const item = auctionItems.find(i => i.id === bid.itemId);
  const userBidCount = item ? getUserBidCount(item, bid.bidderId) : 0;
  const validation = validateBid(bid, item, userBidCount);

  if (!validation.valid) {
    return res.status(400).json(validation);
  }

  const bidRecord = createBidRecord(bid);
  const itemIndex = auctionItems.findIndex(i => i.id === bid.itemId);
  auctionItems[itemIndex] = applyBidToItem(auctionItems[itemIndex], bidRecord);

  broadcast({
    type: 'BID_UPDATE',
    payload: { itemId: bid.itemId, bid: bidRecord, item: auctionItems[itemIndex] }
  });

  res.json({ success: true, bid: bidRecord, item: auctionItems[itemIndex] });
});

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  sendToClient(ws, {
    type: 'CONNECTED',
    payload: { items: auctionItems, serverTime: Date.now() }
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      
      if (message.type === 'BID_UPDATE') {
        const bid = message.payload as BidRequest;
        const item = auctionItems.find(i => i.id === bid.itemId);
        const userBidCount = item ? getUserBidCount(item, bid.bidderId) : 0;
        const validation = validateBid(bid, item, userBidCount);

        if (!validation.valid) {
          sendToClient(ws, { type: 'ERROR', payload: validation });
          return;
        }

        const bidRecord = createBidRecord(bid);
        const itemIndex = auctionItems.findIndex(i => i.id === bid.itemId);
        auctionItems[itemIndex] = applyBidToItem(auctionItems[itemIndex], bidRecord);

        broadcast({
          type: 'BID_UPDATE',
          payload: { itemId: bid.itemId, bid: bidRecord, item: auctionItems[itemIndex] }
        });
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

setInterval(() => {
  const now = Date.now();
  
  auctionItems.forEach((item, index) => {
    if (item.status === 'waiting' && now >= item.startTime) {
      auctionItems[index] = { ...item, status: 'active' };
      broadcast({
        type: 'ITEM_UPDATE',
        payload: { item: auctionItems[index] }
      });
    }

    if (item.status === 'active' && now >= item.endTime) {
      const winner = item.bidHistory[0]?.bidderName;
      auctionItems[index] = { ...item, status: 'sold', winner };
      broadcast({
        type: 'ITEM_UPDATE',
        payload: { item: auctionItems[index] }
      });
    }
  });

  broadcast({
    type: 'TIME_SYNC',
    payload: { serverTime: now, items: auctionItems }
  });
}, 1000);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready at ws://localhost:${PORT}/ws`);
});

export type ComparisonMode = 'side-by-side' | 'diff-highlight'

export type DiffType = 'structure' | 'style' | 'content'

export interface UIScheme {
  id: string
  name: string
  type: 'html' | 'url'
  content: string
  timestamp: number
}

export interface DiffPoint {
  id: string
  componentName: string
  type: DiffType
  path: string
  description: string
  selectorA?: string
  selectorB?: string
}

export interface DiffStats {
  total: number
  structure: number
  style: number
  content: number
  byComponent: Record<string, number>
}

export interface ComparisonResult {
  points: DiffPoint[]
  stats: DiffStats
  duration: number
}

export interface ComparisonConfig {
  id: string
  schemeA: UIScheme
  schemeB: UIScheme
  mode: ComparisonMode
  timestamp: number
}

export const DEFAULT_SCHEME_A: UIScheme = {
  id: 'default-a',
  name: '方案A - 默认示例',
  type: 'html',
  timestamp: Date.now(),
  content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>方案A - 电商首页</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #f5f5f7; color: #1d1d1f; padding: 20px; }
    .nav { background: #fff; padding: 16px 24px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 20px; }
    .nav-logo { font-size: 22px; font-weight: 700; color: #667eea; }
    .nav-links { display: flex; gap: 28px; }
    .nav-links a { text-decoration: none; color: #555; font-size: 14px; font-weight: 500; }
    .nav-actions { display: flex; gap: 12px; }
    .btn { padding: 10px 20px; border-radius: 8px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
    .btn-secondary { background: #f0f0f5; color: #333; }
    .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 60px 40px; border-radius: 16px; color: #fff; margin-bottom: 24px; }
    .hero h1 { font-size: 36px; margin-bottom: 16px; }
    .hero p { font-size: 16px; opacity: 0.9; margin-bottom: 24px; line-height: 1.6; max-width: 500px; }
    .hero .btn { background: #fff; color: #667eea; }
    .product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
    .product-card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .product-img { height: 180px; background: linear-gradient(135deg, #e0e7ff, #c7d2fe); display: flex; align-items: center; justify-content: center; font-size: 48px; }
    .product-info { padding: 16px; }
    .product-info h3 { font-size: 16px; margin-bottom: 8px; }
    .product-info .price { color: #667eea; font-size: 20px; font-weight: 700; margin-bottom: 12px; }
    .product-info .btn { width: 100%; }
    .features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .feature { background: #fff; padding: 20px; border-radius: 12px; text-align: center; }
    .feature-icon { font-size: 32px; margin-bottom: 12px; }
    .feature h4 { font-size: 14px; margin-bottom: 6px; }
    .feature p { font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-logo">ShopMart</div>
    <div class="nav-links">
      <a href="#">首页</a>
      <a href="#">分类</a>
      <a href="#">新品</a>
      <a href="#">优惠</a>
      <a href="#">关于我们</a>
    </div>
    <div class="nav-actions">
      <button class="btn btn-secondary">登录</button>
      <button class="btn btn-primary">注册</button>
    </div>
  </nav>
  <section class="hero">
    <h1>发现精选好物</h1>
    <p>探索数千种优质商品，享受极速配送和无忧退换货服务，让购物变得更简单、更愉快。</p>
    <button class="btn">立即开始购物</button>
  </section>
  <section class="product-grid">
    <div class="product-card">
      <div class="product-img">🎧</div>
      <div class="product-info">
        <h3>无线蓝牙耳机 Pro</h3>
        <div class="price">¥899</div>
        <button class="btn btn-primary">加入购物车</button>
      </div>
    </div>
    <div class="product-card">
      <div class="product-img">⌚</div>
      <div class="product-info">
        <h3>智能运动手表</h3>
        <div class="price">¥1,299</div>
        <button class="btn btn-primary">加入购物车</button>
      </div>
    </div>
    <div class="product-card">
      <div class="product-img">📱</div>
      <div class="product-info">
        <h3>旗舰智能手机</h3>
        <div class="price">¥4,999</div>
        <button class="btn btn-primary">加入购物车</button>
      </div>
    </div>
  </section>
  <section class="features">
    <div class="feature">
      <div class="feature-icon">🚚</div>
      <h4>免费配送</h4>
      <p>满99元免邮费</p>
    </div>
    <div class="feature">
      <div class="feature-icon">🔒</div>
      <h4>安全支付</h4>
      <p>加密交易保障</p>
    </div>
    <div class="feature">
      <div class="feature-icon">↩️</div>
      <h4>7天退换</h4>
      <p>无理由退换货</p>
    </div>
    <div class="feature">
      <div class="feature-icon">💬</div>
      <h4>24h客服</h4>
      <p>全天候在线服务</p>
    </div>
  </section>
</body>
</html>`
}

export const DEFAULT_SCHEME_B: UIScheme = {
  id: 'default-b',
  name: '方案B - 改版设计',
  type: 'html',
  timestamp: Date.now(),
  content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>方案B - 电商首页</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #fafbfc; color: #1a1a2e; padding: 20px; }
    .nav { background: linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.08)); padding: 20px 32px; border-bottom: 1px solid rgba(102,126,234,0.15); display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .nav-logo { font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .nav-links { display: flex; gap: 32px; }
    .nav-links a { text-decoration: none; color: #333; font-size: 15px; font-weight: 600; position: relative; padding-bottom: 4px; }
    .nav-links a:first-child::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 2px; }
    .nav-actions { display: flex; gap: 14px; align-items: center; }
    .search-bar { display: flex; align-items: center; background: #fff; border: 1px solid rgba(102,126,234,0.2); border-radius: 24px; padding: 8px 16px; gap: 8px; }
    .search-bar input { border: none; outline: none; font-size: 14px; width: 180px; }
    .btn { padding: 12px 24px; border-radius: 24px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.25s; }
    .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; box-shadow: 0 4px 15px rgba(102,126,234,0.4); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,0.5); }
    .btn-secondary { background: #fff; color: #333; border: 1px solid rgba(102,126,234,0.3); }
    .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); padding: 72px 48px; border-radius: 20px; color: #fff; margin-bottom: 28px; position: relative; overflow: hidden; }
    .hero::after { content: '🛍️'; position: absolute; right: 48px; top: 50%; transform: translateY(-50%); font-size: 160px; opacity: 0.15; }
    .hero h1 { font-size: 42px; margin-bottom: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .hero p { font-size: 17px; opacity: 0.95; margin-bottom: 28px; line-height: 1.7; max-width: 520px; }
    .hero-buttons { display: flex; gap: 16px; }
    .hero .btn { padding: 14px 32px; }
    .hero .btn-white { background: #fff; color: #667eea; font-weight: 700; }
    .hero .btn-outline { background: transparent; color: #fff; border: 2px solid rgba(255,255,255,0.5); }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .section-header h2 { font-size: 24px; font-weight: 700; }
    .section-header a { color: #667eea; text-decoration: none; font-weight: 600; font-size: 14px; }
    .product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 28px; }
    .product-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); transition: all 0.3s; }
    .product-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0,0,0,0.1); }
    .product-img { height: 200px; background: linear-gradient(135deg, #ede9fe, #ddd6fe); display: flex; align-items: center; justify-content: center; font-size: 56px; }
    .product-badge { display: inline-block; background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: #fff; font-size: 11px; padding: 4px 10px; border-radius: 10px; margin-bottom: 8px; font-weight: 600; }
    .product-info { padding: 18px; }
    .product-info h3 { font-size: 15px; margin-bottom: 10px; font-weight: 600; }
    .product-info .price-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .product-info .price { color: #764ba2; font-size: 22px; font-weight: 800; }
    .product-info .old-price { color: #aaa; text-decoration: line-through; font-size: 13px; }
    .product-info .btn { width: 100%; }
    .feature-banner { background: linear-gradient(135deg, #f5f7ff, #faf5ff); padding: 40px; border-radius: 20px; margin-bottom: 28px; }
    .feature-banner h2 { font-size: 26px; margin-bottom: 24px; text-align: center; }
    .features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
    .feature { background: #fff; padding: 28px 20px; border-radius: 16px; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
    .feature-icon { font-size: 40px; margin-bottom: 16px; }
    .feature h4 { font-size: 16px; margin-bottom: 8px; font-weight: 700; }
    .feature p { font-size: 13px; color: #777; line-height: 1.5; }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-logo">ShopMart Pro</div>
    <div class="nav-links">
      <a href="#">首页</a>
      <a href="#">分类</a>
      <a href="#">新品</a>
      <a href="#">优惠</a>
    </div>
    <div class="nav-actions">
      <div class="search-bar">
        <span>🔍</span>
        <input type="text" placeholder="搜索商品..." />
      </div>
      <button class="btn btn-secondary">登录</button>
      <button class="btn btn-primary">免费注册</button>
    </div>
  </nav>
  <section class="hero">
    <h1>探索全新购物体验</h1>
    <p>全新升级的购物平台，精选全球好物，智能推荐系统为你量身定制，会员专享8折优惠，让每一次购物都充满惊喜。</p>
    <div class="hero-buttons">
      <button class="btn btn-white">立即开始购物</button>
      <button class="btn btn-outline">了解会员权益</button>
    </div>
  </section>
  <div class="section-header">
    <h2>🔥 热门爆款</h2>
    <a href="#">查看全部 →</a>
  </div>
  <section class="product-grid">
    <div class="product-card">
      <div class="product-img">🎧</div>
      <div class="product-info">
        <span class="product-badge">热卖</span>
        <h3>无线蓝牙耳机 Pro Max</h3>
        <div class="price-row">
          <div>
            <div class="price">¥799</div>
            <div class="old-price">¥1,299</div>
          </div>
        </div>
        <button class="btn btn-primary">立即购买</button>
      </div>
    </div>
    <div class="product-card">
      <div class="product-img">⌚</div>
      <div class="product-info">
        <h3>智能运动手表 Ultra</h3>
        <div class="price-row">
          <div>
            <div class="price">¥1,599</div>
            <div class="old-price">¥1,999</div>
          </div>
        </div>
        <button class="btn btn-primary">立即购买</button>
      </div>
    </div>
    <div class="product-card">
      <div class="product-img">📱</div>
      <div class="product-info">
        <span class="product-badge">新品</span>
        <h3>旗舰智能手机 Pro</h3>
        <div class="price-row">
          <div>
            <div class="price">¥5,299</div>
            <div class="old-price">¥5,999</div>
          </div>
        </div>
        <button class="btn btn-primary">立即购买</button>
      </div>
    </div>
    <div class="product-card">
      <div class="product-img">💻</div>
      <div class="product-info">
        <span class="product-badge">限时</span>
        <h3>轻薄笔记本电脑</h3>
        <div class="price-row">
          <div>
            <div class="price">¥6,999</div>
            <div class="old-price">¥8,499</div>
          </div>
        </div>
        <button class="btn btn-primary">立即购买</button>
      </div>
    </div>
  </section>
  <section class="feature-banner">
    <h2>为什么选择我们</h2>
    <div class="features">
      <div class="feature">
        <div class="feature-icon">🚀</div>
        <h4>极速配送</h4>
        <p>全国24小时送达，同城3小时极速达</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🛡️</div>
        <h4>正品保障</h4>
        <p>假一赔十，官方授权，品质有保障</p>
      </div>
      <div class="feature">
        <div class="feature-icon">💎</div>
        <h4>会员专享</h4>
        <p>会员8折起，积分翻倍，生日特权</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🎁</div>
        <h4>惊喜福利</h4>
        <p>每日签到领红包，新人专享大礼包</p>
      </div>
    </div>
  </section>
</body>
</html>`
}

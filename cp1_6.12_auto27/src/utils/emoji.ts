const KEYWORD_EMOJI_MAP: Record<string, string> = {
  '注册': '🔐', '登录': '🔑', '密码': '🔒', '验证': '✅', '授权': '🛡️',
  '浏览': '👁️', '商品': '🛍️', '列表': '📋', '详情': '📄', '页面': '📃',
  '下单': '📝', '支付': '💳', '购买': '🛒', '订单': '📦', '结算': '💰',
  '搜索': '🔍', '筛选': '🎛️', '过滤': '🧹', '查找': '🔎', '分类': '🏷️',
  '个人': '👤', '信息': 'ℹ️', '设置': '⚙️', '地址': '📍', '账户': '🏦',
  '管理': '🛠️', '后台': '🖥️', '配置': '🔧', '系统': '🏗️', '数据': '📊',
  '评价': '⭐', '反馈': '💬', '评论': '💭', '评分': '🌟', '建议': '💡',
  '收藏': '❤️', '喜欢': '😍', '关注': '👀', '保存': '📌', '标记': '🔖',
  '通知': '🔔', '消息': '📨', '提醒': '📣', '推送': '📢', '邮件': '📧',
  '分享': '🔗', '邀请': '💌', '导出': '📤', '导入': '📥', '下载': '⬇️',
  '上传': '⬆️', '编辑': '✏️', '删除': '🗑️', '创建': '➕', '更新': '🔄',
  '用户': '👥', '角色': '🎭', '权限': '🗝️', '安全': '🛡️', '加密': '🔐',
  '购物车': '🛒', '优惠': '🎁', '折扣': '🏷️', '活动': '🎉', '促销': '🎊',
  '物流': '🚚', '配送': '📮', '退货': '↩️', '退款': '💸', '客服': '🎧',
  '手机': '📱', '邮箱': '📧', '头像': '🖼️', '社交': '🤝', '团队': '👥',
  '任务': '✅', '进度': '📈', '迭代': '🔄', '发布': '🚀', '测试': '🧪',
  '接口': '🔌', '服务': '☁️', '性能': '⚡', '监控': '📺', '日志': '📜',
  '文档': '📑', '帮助': '❓', '引导': '🧭', '教程': '📖', '版本': '📌',
  '地图': '🗺️', '导航': '🧭', '路线': '🛤️', '位置': '📍', '区域': '🗺️',
};

export function extractEmojiFromDescription(description: string, name?: string): string {
  const text = `${name || ''} ${description}`.toLowerCase();
  const matches: Array<{ emoji: string; priority: number }> = [];

  for (const [keyword, emoji] of Object.entries(KEYWORD_EMOJI_MAP)) {
    if (text.includes(keyword.toLowerCase())) {
      const nameMatch = name && name.toLowerCase().includes(keyword.toLowerCase());
      matches.push({
        emoji,
        priority: nameMatch ? 2 : 1,
      });
    }
  }

  if (matches.length > 0) {
    matches.sort((a, b) => b.priority - a.priority);
    return matches[0].emoji;
  }

  return '📋';
}

export interface Condition {
  type: 'hp' | 'mp' | 'hasItem';
  value: number | string;
  operator: '>' | '<' | '>=' | '<=' | '===';
}

export interface StatusChange {
  type: 'hp' | 'mp' | 'addItem' | 'removeItem';
  value: number | string;
}

export interface Choice {
  id: string;
  text: string;
  targetNodeId: string;
  conditions?: Condition[];
  statusChanges?: StatusChange[];
}

export interface StoryNode {
  id: string;
  text: string;
  choices: Choice[];
  isEnding?: boolean;
  endingType?: 'victory' | 'defeat' | 'hidden';
  endingName?: string;
}

export interface GameStatus {
  hp: number;
  mp: number;
  inventory: string[];
}

export const storyData: StoryNode[] = [
  {
    id: 'start',
    text: '你从一片古老的森林中醒来，阳光透过茂密的树冠洒下斑驳的光影。\n你记不清自己是怎么来到这里的，只记得你是一名勇者，肩负着重要的使命。\n前方有两条路：一条通向幽深的洞穴，另一条通往神秘的湖泊。',
    choices: [
      { id: 'c1', text: '前往幽深的洞穴', targetNodeId: 'cave_entrance' },
      { id: 'c2', text: '前往神秘的湖泊', targetNodeId: 'lake_shore' }
    ]
  },
  {
    id: 'cave_entrance',
    text: '洞穴入口处阴风阵阵，里面传来低沉的咆哮声。\n你在洞口发现了一把生锈的短剑和一瓶治疗药水。\n你只能选择带走其中一样。',
    choices: [
      {
        id: 'c1',
        text: '拿走生锈短剑',
        targetNodeId: 'cave_path',
        statusChanges: [{ type: 'addItem', value: '生锈短剑' }]
      },
      {
        id: 'c2',
        text: '拿走治疗药水',
        targetNodeId: 'cave_path',
        statusChanges: [{ type: 'addItem', value: '治疗药水' }]
      },
      {
        id: 'c3',
        text: '什么都不拿，直接进入洞穴',
        targetNodeId: 'cave_path'
      }
    ]
  },
  {
    id: 'lake_shore',
    text: '湖水清澈见底，湖边坐着一位白发苍苍的老者。\n"年轻人，你愿意听我讲一个故事吗？"老者微笑着问你。\n"作为回报，我可以教你一个魔法。"',
    choices: [
      {
        id: 'c1',
        text: '听老者讲故事并学习魔法',
        targetNodeId: 'old_man_story',
        statusChanges: [{ type: 'mp', value: 20 }]
      },
      {
        id: 'c2',
        text: '礼貌拒绝，继续赶路',
        targetNodeId: 'forest_path'
      }
    ]
  },
  {
    id: 'old_man_story',
    text: '老者给你讲述了一个关于圣光之剑的传说。\n据说这把剑被封印在森林深处的神殿中，只有真正的勇者才能拔出它。\n老者教给你一个简单的治愈魔法，你感觉魔法值提升了。\n"去吧，年轻的勇者，寻找那把传说中的圣剑吧。"',
    choices: [
      { id: 'c1', text: '前往森林深处的神殿', targetNodeId: 'temple_entrance' }
    ]
  },
  {
    id: 'cave_path',
    text: '你沿着洞穴的通道深入，四周越来越黑暗。\n突然，一只巨大的蝙蝠从黑暗中冲出，向你发起攻击！',
    choices: [
      {
        id: 'c1',
        text: '用武器反击（需要武器）',
        targetNodeId: 'bat_fight_victory',
        conditions: [{ type: 'hasItem', operator: '===', value: '生锈短剑' }],
        statusChanges: [{ type: 'hp', value: -10 }]
      },
      {
        id: 'c2',
        text: '使用治愈魔法（需要魔法值>20）',
        targetNodeId: 'bat_magic_victory',
        conditions: [{ type: 'mp', operator: '>', value: 20 }],
        statusChanges: [{ type: 'mp', value: -15 }]
      },
      {
        id: 'c3',
        text: '逃跑',
        targetNodeId: 'bat_escape',
        statusChanges: [{ type: 'hp', value: -25 }]
      }
    ]
  },
  {
    id: 'bat_fight_victory',
    text: '你挥舞短剑，经过一番激烈的搏斗，终于击败了巨蝙蝠。\n虽然受了一些伤，但你在蝙蝠的巢穴中发现了一颗魔法宝石。\n这颗宝石散发着微弱的光芒。',
    choices: [
      {
        id: 'c1',
        text: '拿走魔法宝石',
        targetNodeId: 'cave_depths',
        statusChanges: [{ type: 'addItem', value: '魔法宝石' }]
      },
      {
        id: 'c2',
        text: '离开洞穴，前往森林',
        targetNodeId: 'forest_path'
      }
    ]
  },
  {
    id: 'bat_magic_victory',
    text: '你施展治愈魔法，温暖的光芒包围着你。\n巨蝙蝠被光芒灼伤，尖叫着飞走了。\n你消耗了一些魔法值，但毫发无伤。\n洞穴深处似乎还有什么东西在闪光。',
    choices: [
      { id: 'c1', text: '继续深入洞穴', targetNodeId: 'cave_depths' },
      { id: 'c2', text: '离开洞穴，前往森林', targetNodeId: 'forest_path' }
    ]
  },
  {
    id: 'bat_escape',
    text: '你转身就跑，但蝙蝠的利爪还是抓伤了你的后背。\n你跌跌撞撞地逃出了洞穴，虽然狼狈但总算活了下来。\n你决定前往森林方向，也许那里会安全一些。',
    choices: [
      {
        id: 'c1',
        text: '使用治疗药水（如果有）',
        targetNodeId: 'forest_path',
        conditions: [{ type: 'hasItem', operator: '===', value: '治疗药水' }],
        statusChanges: [
          { type: 'hp', value: 30 },
          { type: 'removeItem', value: '治疗药水' }
        ]
      },
      { id: 'c2', text: '硬撑着继续前进', targetNodeId: 'forest_path' }
    ]
  },
  {
    id: 'cave_depths',
    text: '洞穴的尽头是一个巨大的地下湖，湖中央有一座小岛。\n小岛上放着一个闪闪发光的宝箱。\n湖水看起来很深，你需要想办法过去。',
    choices: [
      {
        id: 'c1',
        text: '用魔法宝石照亮水面游过去（需要魔法宝石）',
        targetNodeId: 'treasure_island',
        conditions: [{ type: 'hasItem', operator: '===', value: '魔法宝石' }]
      },
      {
        id: 'c2',
        text: '直接跳进湖里游过去',
        targetNodeId: 'lake_swim_fail',
        statusChanges: [{ type: 'hp', value: -20 }]
      },
      { id: 'c3', text: '离开洞穴', targetNodeId: 'forest_path' }
    ]
  },
  {
    id: 'treasure_island',
    text: '魔法宝石的光芒照亮了水下，你安全地游到了小岛上。\n宝箱里装着一件传说中的宝物——圣光护符！\n这是传说中勇者的装备之一，据说能够指引找到圣剑的道路。',
    choices: [
      {
        id: 'c1',
        text: '拿走圣光护符，前往神殿',
        targetNodeId: 'temple_entrance',
        statusChanges: [{ type: 'addItem', value: '圣光护符' }]
      }
    ]
  },
  {
    id: 'lake_swim_fail',
    text: '湖水冰冷刺骨，你游到一半就感到体力不支。\n你挣扎着回到岸边，浑身湿透，还受了些伤。\n看来没有合适的装备，是无法到达湖中心的。',
    choices: [
      { id: 'c1', text: '离开洞穴，前往森林', targetNodeId: 'forest_path' }
    ]
  },
  {
    id: 'forest_path',
    text: '你走在森林中的小路上，四周鸟语花香。\n前方出现了一个分叉路口，路标上写着：\n左边：勇者神殿\n右边：恶龙巢穴',
    choices: [
      { id: 'c1', text: '前往勇者神殿', targetNodeId: 'temple_entrance' },
      { id: 'c2', text: '前往恶龙巢穴', targetNodeId: 'dragon_lair' }
    ]
  },
  {
    id: 'temple_entrance',
    text: '古老的神殿矗立在你面前，大门上刻着神秘的符文。\n门口的石像突然睁开了眼睛："想要进入神殿，必须证明你的勇气。\n你是准备好面对挑战了吗，勇者？"',
    choices: [
      {
        id: 'c1',
        text: '接受挑战，进入神殿',
        targetNodeId: 'temple_trial',
        statusChanges: [{ type: 'hp', value: -15 }]
      },
      {
        id: 'c2',
        text: '使用圣光护符（需要圣光护符）',
        targetNodeId: 'temple_inner',
        conditions: [{ type: 'hasItem', operator: '===', value: '圣光护符' }]
      },
      { id: 'c3', text: '暂时离开，先去别处看看', targetNodeId: 'forest_path' }
    ]
  },
  {
    id: 'temple_trial',
    text: '神殿的试炼比你想象的更加艰难。\n你经历了各种幻象和考验，虽然受了伤，但最终通过了试炼。\n神殿深处，一把闪烁着圣光的剑插在祭坛上。\n这就是传说中的——圣光之剑！',
    choices: [
      {
        id: 'c1',
        text: '拔出圣光之剑',
        targetNodeId: 'got_holy_sword',
        statusChanges: [{ type: 'addItem', value: '圣光之剑' }]
      }
    ]
  },
  {
    id: 'temple_inner',
    text: '圣光护符发出耀眼的光芒，神殿大门应声而开。\n"护符认可了持有者，你可以直接进入神殿最深处。"石像说道。\n神殿深处，一把闪烁着圣光的剑插在祭坛上。\n这就是传说中的——圣光之剑！',
    choices: [
      {
        id: 'c1',
        text: '拔出圣光之剑',
        targetNodeId: 'got_holy_sword',
        statusChanges: [{ type: 'addItem', value: '圣光之剑' }]
      }
    ]
  },
  {
    id: 'got_holy_sword',
    text: '当你握住圣光之剑的瞬间，一股强大的力量涌入你的身体。\n圣剑散发出温暖的光芒，你感觉自己充满了力量。\n现在，你可以去挑战恶龙了！\n或者，你可以先四处探索一下。',
    choices: [
      { id: 'c1', text: '前往恶龙巢穴', targetNodeId: 'dragon_lair' },
      { id: 'c2', text: '返回森林再探索一下', targetNodeId: 'forest_path' }
    ]
  },
  {
    id: 'dragon_lair',
    text: '恶龙的巢穴散发着硫磺的气味。\n一条巨大的红龙盘踞在金币堆上，它睁开眼睛盯着你。\n"渺小的人类，你竟敢闯入我的领地？"恶龙咆哮道。',
    choices: [
      {
        id: 'c1',
        text: '用圣光之剑战斗（需要圣光之剑）',
        targetNodeId: 'dragon_fight_holy',
        conditions: [{ type: 'hasItem', operator: '===', value: '圣光之剑' }],
        statusChanges: [{ type: 'hp', value: -20 }]
      },
      {
        id: 'c2',
        text: '用普通武器战斗（需要生锈短剑）',
        targetNodeId: 'dragon_fight_normal',
        conditions: [{ type: 'hasItem', operator: '===', value: '生锈短剑' }],
        statusChanges: [{ type: 'hp', value: -50 }]
      },
      {
        id: 'c3',
        text: '尝试用魔法攻击（需要魔法值>30）',
        targetNodeId: 'dragon_magic_attack',
        conditions: [{ type: 'mp', operator: '>', value: 30 }],
        statusChanges: [{ type: 'mp', value: -25 }]
      },
      { id: 'c4', text: '转身逃跑', targetNodeId: 'dragon_escape' }
    ]
  },
  {
    id: 'dragon_fight_holy',
    text: '圣光之剑散发着耀眼的光芒，恶龙痛苦地嘶吼。\n"圣光？！不可能——"\n经过一场激烈的战斗，你终于击败了恶龙！\n你拯救了这片土地上的所有生灵。',
    choices: [],
    isEnding: true,
    endingType: 'victory',
    endingName: '勇者的胜利'
  },
  {
    id: 'dragon_fight_normal',
    text: '你的短剑对恶龙来说就像牙签一样微不足道。\n恶龙一口火焰喷来，你勉强躲过，但还是受了重伤。\n你拼命逃出了龙穴，捡回了一条命。',
    choices: [
      {
        id: 'c1',
        text: '使用治疗药水（如果有）',
        targetNodeId: 'forest_path',
        conditions: [{ type: 'hasItem', operator: '===', value: '治疗药水' }],
        statusChanges: [
          { type: 'hp', value: 30 },
          { type: 'removeItem', value: '治疗药水' }
        ]
      },
      {
        id: 'c2',
        text: '坚持走到神殿寻求帮助',
        targetNodeId: 'defeat_ending',
        conditions: [{ type: 'hp', operator: '<=', value: 0 }]
      },
      { id: 'c3', text: '先休息一下再说', targetNodeId: 'forest_path' }
    ]
  },
  {
    id: 'dragon_magic_attack',
    text: '你的魔法攻击对恶龙造成了一些伤害，但远远不够。\n恶龙被激怒了，喷出一道火焰！\n你勉强躲开，但还是被灼伤了。',
    choices: [
      { id: 'c1', text: '继续用魔法攻击', targetNodeId: 'defeat_ending', statusChanges: [{ type: 'hp', value: -40 }] },
      { id: 'c2', text: '赶紧逃跑', targetNodeId: 'dragon_escape', statusChanges: [{ type: 'hp', value: -15 }] }
    ]
  },
  {
    id: 'dragon_escape',
    text: '你拼命地逃出了龙穴，恶龙在身后咆哮。\n你知道，没有足够的实力，是不可能打败恶龙的。\n也许你应该去寻找传说中的圣剑？',
    choices: [
      { id: 'c1', text: '前往勇者神殿', targetNodeId: 'temple_entrance' },
      { id: 'c2', text: '返回森林', targetNodeId: 'forest_path' }
    ]
  },
  {
    id: 'defeat_ending',
    text: '你的伤势太重了，视线逐渐模糊...\n你倒在了地上，意识渐渐远去。\n"也许...我还不够强..."\n\n—— 失败结局 ——',
    choices: [],
    isEnding: true,
    endingType: 'defeat',
    endingName: '勇者的陨落'
  },
  {
    id: 'hidden_ending',
    text: '当圣光之剑与圣光护符的力量结合时，奇迹发生了。\n你不仅击败了恶龙，还发现了一个惊天秘密——\n恶龙其实是被诅咒的守护者，它守护着通往神界的大门。\n你用圣剑解除了诅咒，恶龙化作一位古老的神灵。\n"谢谢你，勇敢的年轻人。你证明了自己配得上真正的力量。"\n\n你获得了神灵的祝福，成为了新一代的守护者。\n\n—— 隐藏结局 ——',
    choices: [],
    isEnding: true,
    endingType: 'hidden',
    endingName: '圣光守护者'
  }
];

export class StoryEngine {
  private nodes: Map<string, StoryNode>;
  private unlockedEndings: Set<string>;

  constructor() {
    this.nodes = new Map();
    storyData.forEach(node => this.nodes.set(node.id, node));
    this.unlockedEndings = new Set();
  }

  getNode(nodeId: string): StoryNode | undefined {
    return this.nodes.get(nodeId);
  }

  checkCondition(condition: Condition, status: GameStatus): boolean {
    switch (condition.type) {
      case 'hp':
        const hpVal = condition.value as number;
        switch (condition.operator) {
          case '>': return status.hp > hpVal;
          case '<': return status.hp < hpVal;
          case '>=': return status.hp >= hpVal;
          case '<=': return status.hp <= hpVal;
          case '===': return status.hp === hpVal;
          default: return false;
        }
      case 'mp':
        const mpVal = condition.value as number;
        switch (condition.operator) {
          case '>': return status.mp > mpVal;
          case '<': return status.mp < mpVal;
          case '>=': return status.mp >= mpVal;
          case '<=': return status.mp <= mpVal;
          case '===': return status.mp === mpVal;
          default: return false;
        }
      case 'hasItem':
        return status.inventory.includes(condition.value as string);
      default:
        return false;
    }
  }

  isChoiceAvailable(choice: Choice, status: GameStatus): boolean {
    if (!choice.conditions || choice.conditions.length === 0) {
      return true;
    }
    return choice.conditions.every(condition => this.checkCondition(condition, status));
  }

  getAvailableChoices(nodeId: string, status: GameStatus): Choice[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    return node.choices;
  }

  processChoice(choice: Choice, status: GameStatus): { nextNodeId: string; statusChanges: StatusChange[] } {
    return {
      nextNodeId: choice.targetNodeId,
      statusChanges: choice.statusChanges || []
    };
  }

  unlockEnding(endingType: string, endingName: string): void {
    this.unlockedEndings.add(endingType);
  }

  getUnlockedEndingsCount(): number {
    return this.unlockedEndings.size;
  }

  getTotalEndings(): number {
    return storyData.filter(n => n.isEnding).length;
  }

  checkHiddenEnding(status: GameStatus): boolean {
    return status.hp > 70 && status.inventory.includes('圣光之剑') && status.inventory.includes('圣光护符');
  }

  getHiddenEndingNode(): StoryNode | undefined {
    return this.nodes.get('hidden_ending');
  }
}

export const storyEngine = new StoryEngine();

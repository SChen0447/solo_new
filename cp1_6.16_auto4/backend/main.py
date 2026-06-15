from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import random
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

categories = [
    {"id": "1", "name": "餐饮", "color": "#4A90D9"},
    {"id": "2", "name": "交通", "color": "#50E3C2"},
    {"id": "3", "name": "购物", "color": "#F5A623"},
    {"id": "4", "name": "娱乐", "color": "#7B68EE"},
    {"id": "5", "name": "医疗", "color": "#FF6B6B"},
    {"id": "6", "name": "教育", "color": "#95E1D3"},
    {"id": "7", "name": "住房", "color": "#F8B500"},
    {"id": "8", "name": "通讯", "color": "#4ECDC4"},
]

def generate_expenses(month: str):
    year, month_num = map(int, month.split("-"))
    random.seed(year * 100 + month_num)
    
    expense_notes = {
        "1": ["家庭聚餐", "早餐", "午餐外卖", "晚餐", "超市买菜", "水果", "零食", "奶茶", "咖啡", "烘焙材料"],
        "2": ["地铁费", "公交费", "打车", "加油", "停车费", "高铁票", "机票", "共享单车", "汽车保养", "保险"],
        "3": ["衣服", "鞋子", "日用品", "电子产品", "家具", "化妆品", "首饰", "包包", "运动装备", "礼品"],
        "4": ["电影票", "KTV", "游戏充值", "旅游", "健身卡", "演出门票", "桌游", "SPA", "酒吧", "摄影"],
        "5": ["药品", "体检", "挂号费", "治疗费", "保健品", "医疗器械", "牙科", "眼科", "疫苗", "中医"],
        "6": ["学费", "书籍", "培训班", "网课", "文具", "考试费", "夏令营", "家教", "兴趣班", "图书馆"],
        "7": ["房租", "水电费", "物业费", "装修", "家电", "家具维修", "宽带", "燃气费", "暖气费", "家政"],
        "8": ["话费", "网费", "手机", "电脑配件", "软件会员", "云存储", "视频会员", "音乐会员", "快递费", "有线电视"],
    }
    
    expense_descriptions = {
        "1": [
            "周末全家外出就餐，包括午餐和下午茶",
            "工作日早餐，买了豆浆和包子",
            "中午和同事一起点的外卖",
            "晚上在家做的晚餐，买了新鲜食材",
            "周末去超市采购了一周的食材",
            "买了些当季水果补充维生素",
            "下午饿了买了点零食",
            "和朋友逛街买了杯奶茶",
            "加班时买的咖啡提提神",
            "周末在家尝试做烘焙，买了材料",
        ],
        "2": [
            "每天上下班的地铁费用",
            "出门办事坐的公交",
            "下雨了打车回家",
            "本月加油费用，油价又涨了",
            "公司停车场的月卡费用",
            "出差买的高铁票",
            "暑假带孩子旅游的机票",
            "短距离骑行共享单车",
            "汽车定期保养费用",
            "汽车保险续保",
        ],
        "3": [
            "换季了买了几件新衣服",
            "买了双运动鞋跑步用",
            "家里日用品用完了，补充一下",
            "买了个新手机，旧的坏了",
            "客厅需要个新沙发",
            "买了套护肤品",
            "纪念日买的礼物",
            "买了个新包包",
            "买了些运动装备准备健身",
            "给朋友买的生日礼物",
        ],
        "4": [
            "和朋友去看了场电影",
            "周末和同事去唱KTV",
            "游戏里买了新皮肤",
            "五一假期去旅游的花费",
            "办了张健身卡，准备开始锻炼",
            "买了演唱会门票",
            "和朋友去玩桌游",
            "做了个SPA放松一下",
            "周末和朋友去酒吧玩",
            "买了个新相机，准备学摄影",
        ],
        "5": [
            "感冒了买了些药",
            "每年一次的全身体检",
            "去医院看病的挂号费",
            "牙齿治疗的费用",
            "买了些保健品",
            "买了个血压计",
            "去看牙医，洗了牙",
            "配了副新眼镜",
            "打了流感疫苗",
            "去看了中医调理身体",
        ],
        "6": [
            "孩子的学费",
            "买了几本专业书籍",
            "报了个英语培训班",
            "买了个网课学习新技能",
            "买了些文具用品",
            "报名参加了一个考试",
            "给孩子报了夏令营",
            "请了家教辅导孩子功课",
            "孩子上的兴趣班费用",
            "图书馆借书逾期罚款",
        ],
        "7": [
            "本月房租",
            "水电费账单",
            "物业管理费",
            "小装修了一下阳台",
            "买了台新空调",
            "家里水龙头坏了，找人修了",
            "宽带费用",
            "燃气费账单",
            "暖气费该交了",
            "请了家政阿姨打扫卫生",
        ],
        "8": [
            "手机话费充值",
            "家里的宽带费用",
            "买了个新手机",
            "电脑坏了，买了配件换上",
            "买了个视频网站会员",
            "云存储扩容费用",
            "视频会员续费",
            "音乐会员续费",
            "网购的快递费",
            "有线电视费用",
        ],
    }
    
    expenses = []
    num_expenses = random.randint(15, 30)
    expense_id = 1
    
    for _ in range(num_expenses):
        category_id = random.choice([c["id"] for c in categories])
        day = random.randint(1, 28)
        amount = round(random.uniform(10, 2000), 2)
        note_idx = random.randint(0, len(expense_notes[category_id]) - 1)
        
        expense_date = datetime(year, month_num, day).strftime("%Y-%m-%d")
        note = expense_notes[category_id][note_idx]
        description = expense_descriptions[category_id][note_idx]
        
        expenses.append({
            "id": str(expense_id),
            "date": expense_date,
            "categoryId": category_id,
            "amount": amount,
            "note": note,
            "description": description,
        })
        expense_id += 1
    
    expenses.sort(key=lambda x: x["date"], reverse=True)
    return expenses

@app.get("/categories")
async def get_categories():
    return categories

@app.get("/expenses")
async def get_expenses(month: Optional[str] = Query(None)):
    if not month:
        month = datetime.now().strftime("%Y-%m")
    return generate_expenses(month)

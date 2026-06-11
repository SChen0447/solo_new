import { SearchResult, Trip } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export const mockPlaces: SearchResult[] = [
  { id: '1', name: '故宫博物院', lat: 39.9163, lng: 116.3972, address: '北京市东城区景山前街4号', category: 'attraction' },
  { id: '2', name: '天安门广场', lat: 39.9037, lng: 116.3976, address: '北京市东城区长安街', category: 'attraction' },
  { id: '3', name: '颐和园', lat: 39.9999, lng: 116.2755, address: '北京市海淀区新建宫门路19号', category: 'attraction' },
  { id: '4', name: '八达岭长城', lat: 40.3539, lng: 116.0203, address: '北京市延庆区八达岭镇', category: 'attraction' },
  { id: '5', name: '天坛公园', lat: 39.8882, lng: 116.4171, address: '北京市东城区天坛内东里7号', category: 'attraction' },
  { id: '6', name: '南锣鼓巷', lat: 39.9373, lng: 116.4031, address: '北京市东城区南锣鼓巷胡同', category: 'attraction' },
  { id: '7', name: '798艺术区', lat: 39.9847, lng: 116.4951, address: '北京市朝阳区酒仙桥路4号', category: 'attraction' },
  { id: '8', name: '圆明园', lat: 40.0080, lng: 116.2985, address: '北京市海淀区清华西路28号', category: 'attraction' },
  { id: '9', name: '鸟巢体育场', lat: 39.9929, lng: 116.3966, address: '北京市朝阳区国家体育场南路1号', category: 'attraction' },
  { id: '10', name: '水立方', lat: 39.9989, lng: 116.3926, address: '北京市朝阳区天辰东路11号', category: 'attraction' },
  { id: '11', name: '全聚德烤鸭店', lat: 39.9147, lng: 116.4073, address: '北京市东城区前门大街30号', category: 'restaurant' },
  { id: '12', name: '东来顺火锅', lat: 39.9134, lng: 116.4061, address: '北京市东城区王府井大街198号', category: 'restaurant' },
  { id: '13', name: '簋街小龙虾', lat: 39.9421, lng: 116.4183, address: '北京市东城区东直门内大街', category: 'restaurant' },
  { id: '14', name: '护国寺小吃', lat: 39.9476, lng: 116.3756, address: '北京市西城区护国寺大街93号', category: 'restaurant' },
  { id: '15', name: '庆丰包子铺', lat: 39.9178, lng: 116.3821, address: '北京市西城区西安门大街85号', category: 'restaurant' },
  { id: '16', name: '北京饭店', lat: 39.9089, lng: 116.4103, address: '北京市东城区东长安街33号', category: 'hotel' },
  { id: '17', name: '丽思卡尔顿酒店', lat: 39.9098, lng: 116.4421, address: '北京市朝阳区建国路甲83号', category: 'hotel' },
  { id: '18', name: '如家酒店', lat: 39.9156, lng: 116.4189, address: '北京市东城区王府井大街241号', category: 'hotel' },
  { id: '19', name: '汉庭酒店', lat: 39.9072, lng: 116.4034, address: '北京市东城区前门东大街16号', category: 'hotel' },
  { id: '20', name: '香格里拉饭店', lat: 39.9456, lng: 116.3256, address: '北京市海淀区紫竹院路29号', category: 'hotel' },
  { id: '21', name: '上海外滩', lat: 31.2304, lng: 121.4737, address: '上海市黄浦区中山东一路', category: 'attraction' },
  { id: '22
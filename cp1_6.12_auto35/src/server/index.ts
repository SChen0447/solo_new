import express from 'express';
import cors from 'cors';
import {
  Device,
  Connection,
  SimulateRequest,
  SimulateResponse,
  getSubnet,
  isValidIP,
} from '../types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const findPath = (
  startId: string,
  endId: string,
  connections: Connection[]
): string[] | null => {
  const adjacency = new Map<string, string[]>();
  connections.forEach((conn) => {
    if (!adjacency.has(conn.fromDeviceId)) {
      adjacency.set(conn.fromDeviceId, []);
    }
    if (!adjacency.has(conn.toDeviceId)) {
      adjacency.set(conn.toDeviceId, []);
    }
    adjacency.get(conn.fromDeviceId)!.push(conn.toDeviceId);
    adjacency.get(conn.toDeviceId)!.push(conn.fromDeviceId);
  });

  const visited = new Set<string>();
  const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];
  visited.add(startId);

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    if (id === endId) return path;
    const neighbors = adjacency.get(id) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, path: [...path, neighbor] });
      }
    }
  }
  return null;
};

const getDeviceById = (devices: Device[], id: string): Device | undefined =>
  devices.find((d) => d.id === id);

const findRouterWithInterface = (
  devices: Device[],
  connections: Connection[],
  deviceId: string,
  targetSubnet: string
): Device | null => {
  const connectedIds = connections
    .filter((c) => c.fromDeviceId === deviceId || c.toDeviceId === deviceId)
    .map((c) => (c.fromDeviceId === deviceId ? c.toDeviceId : c.fromDeviceId));

  for (const rid of connectedIds) {
    const router = getDeviceById(devices, rid);
    if (router && router.type === 'router') {
      const routerSubnet = getSubnet(router.config.ip, router.config.subnetMask);
      if (routerSubnet === targetSubnet) return router;
    }
  }
  return null;
};

app.post('/api/simulate', (req, res) => {
  try {
    const { sourceId, targetId, topology } = req.body as SimulateRequest;
    const { devices, connections } = topology;

    if (!sourceId || !targetId) {
      return res.json({
        success: false,
        message: '请选择源设备和目标设备',
      } as SimulateResponse);
    }

    const source = getDeviceById(devices, sourceId);
    const target = getDeviceById(devices, targetId);

    if (!source || !target) {
      return res.json({
        success: false,
        message: '源设备或目标设备不存在',
      } as SimulateResponse);
    }

    if (!isValidIP(source.config.ip) || !source.config.ip) {
      return res.json({
        success: false,
        message: `源设备 ${source.name} 未配置有效的IP地址`,
      } as SimulateResponse);
    }
    if (!isValidIP(target.config.ip) || !target.config.ip) {
      return res.json({
        success: false,
        message: `目标设备 ${target.name} 未配置有效的IP地址`,
      } as SimulateResponse);
    }

    const sourceSubnet = getSubnet(source.config.ip, source.config.subnetMask);
    const targetSubnet = getSubnet(target.config.ip, target.config.subnetMask);

    const directPath = findPath(sourceId, targetId, connections);

    if (sourceSubnet === targetSubnet) {
      if (directPath) {
        return res.json({
          success: true,
          message: `Ping成功！${source.name} (${source.config.ip}) -> ${target.name} (${target.config.ip})，同一子网直连可达`,
          details: {
            sourceSubnet,
            targetSubnet,
            path: directPath.map((id) => getDeviceById(devices, id)?.name || id),
          },
        } as SimulateResponse);
      } else {
        return res.json({
          success: false,
          message: `${source.name} 与 ${target.name} 处于同一子网，但物理路径不可达（未连接）`,
          details: { sourceSubnet, targetSubnet },
        } as SimulateResponse);
      }
    }

    if (source.type === 'pc' && !source.config.gateway) {
      return res.json({
        success: false,
        message: `源设备 ${source.name} 未配置默认网关，无法跨子网通信`,
        details: { sourceSubnet, targetSubnet },
      } as SimulateResponse);
    }

    if (source.type === 'pc') {
      const gateway = source.config.gateway;
      const connectedRouter = findRouterWithInterface(
        devices,
        connections,
        sourceId,
        getSubnet(gateway, source.config.subnetMask)
      );

      if (!connectedRouter) {
        return res.json({
          success: false,
          message: `源设备 ${source.name} 的网关 ${gateway} 不可达（未连接到对应的路由器）`,
          details: { sourceSubnet, targetSubnet },
        } as SimulateResponse);
      }

      if (connectedRouter.config.ip !== gateway) {
        return res.json({
          success: false,
          message: `源设备 ${source.name} 的网关 ${gateway} 与所连接的路由器IP ${connectedRouter.config.ip} 不匹配`,
          details: { sourceSubnet, targetSubnet },
        } as SimulateResponse);
      }

      const routerToTargetPath = findPath(connectedRouter.id, targetId, connections);
      if (routerToTargetPath) {
        const targetGatewayOk =
          target.type === 'router' ||
          (target.config.gateway &&
            (() => {
              const tSubnet = getSubnet(target.config.gateway, target.config.subnetMask);
              const tr = findRouterWithInterface(devices, connections, targetId, tSubnet);
              return tr && tr.config.ip === target.config.gateway;
            })());

        if (target.type === 'router' || targetGatewayOk) {
          return res.json({
            success: true,
            message: `Ping成功！${source.name} -> ${connectedRouter.name} -> ${target.name}，跨子网通过路由器转发`,
            details: {
              sourceSubnet,
              targetSubnet,
              path: [source.name, ...routerToTargetPath.slice(1).map((id) => getDeviceById(devices, id)?.name || id)],
            },
          } as SimulateResponse);
        } else {
          return res.json({
            success: false,
            message: `目标设备 ${target.name} 的网关配置不正确，无法接收跨子网数据包`,
            details: { sourceSubnet, targetSubnet },
          } as SimulateResponse);
        }
      } else {
        return res.json({
          success: false,
          message: `目标 ${target.name} 不可达：路由器无法到达目标子网`,
          details: { sourceSubnet, targetSubnet },
        } as SimulateResponse);
      }
    }

    if (source.type === 'router') {
      if (directPath) {
        return res.json({
          success: true,
          message: `Ping成功！路由器 ${source.name} -> ${target.name}`,
          details: {
            sourceSubnet,
            targetSubnet,
            path: directPath.map((id) => getDeviceById(devices, id)?.name || id),
          },
        } as SimulateResponse);
      }
    }

    return res.json({
      success: false,
      message: '目标不可达：未知错误',
      details: { sourceSubnet, targetSubnet },
    } as SimulateResponse);
  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
    } as SimulateResponse);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Network Simulator API server running on http://localhost:${PORT}`);
});

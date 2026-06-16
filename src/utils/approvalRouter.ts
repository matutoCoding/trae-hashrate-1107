import type { ApprovalChainConfig, ApprovalNodeConfig, ApprovalRecord } from '@/types';
import { evaluateConditions, findNodeById } from '@/data/approvalConfig';

export interface RouteResult {
  nextNodeId: string | null;
  isEnd: boolean;
  passedNodes: string[];
  routeLog: string[];
}

export const routeApprovalChain = (
  config: ApprovalChainConfig,
  startNodeId: string,
  formData: Record<string, any>
): RouteResult => {
  const result: RouteResult = {
    nextNodeId: null,
    isEnd: false,
    passedNodes: [],
    routeLog: []
  };

  let currentNodeId = startNodeId;
  let safetyCounter = 0;
  const MAX_ITERATIONS = 100;

  while (currentNodeId && safetyCounter < MAX_ITERATIONS) {
    safetyCounter++;
    const node = findNodeById(config, currentNodeId);
    if (!node) {
      result.routeLog.push(`[Error] 节点 ${currentNodeId} 不存在`);
      break;
    }

    result.passedNodes.push(node.id);

    switch (node.type) {
      case 'start':
        result.routeLog.push(`[Start] ${node.name} → 进入 ${node.nextNodeId}`);
        currentNodeId = node.nextNodeId || '';
        break;

      case 'condition':
        const condResult = evaluateConditions(
          node.conditions || [],
          node.conditionLogic || 'AND',
          formData
        );
        const condDesc = describeCondition(node);
        const nextId = condResult ? node.trueNextNodeId : node.falseNextNodeId;
        result.routeLog.push(
          `[Condition] ${node.name} (${condDesc}) = ${condResult} → 进入 ${nextId}`
        );
        currentNodeId = nextId || '';
        break;

      case 'approval':
        result.nextNodeId = node.id;
        result.routeLog.push(`[Approval] 停在 ${node.name} (${node.role}) 等待审批`);
        return result;

      case 'end':
        result.isEnd = true;
        result.nextNodeId = null;
        result.routeLog.push(`[End] ${node.name} → 流程结束`);
        return result;

      default:
        result.routeLog.push(`[Unknown] 未知节点类型: ${node.type}`);
        currentNodeId = '';
    }
  }

  return result;
};

const describeCondition = (node: ApprovalNodeConfig): string => {
  if (!node.conditions || node.conditions.length === 0) return '无条件';

  const descs = node.conditions.map(c => {
    const opMap: Record<string, string> = {
      eq: '=',
      ne: '≠',
      gt: '>',
      lt: '<',
      gte: '≥',
      lte: '≤',
      in: '包含在',
      contains: '包含'
    };
    const valueStr = Array.isArray(c.value) ? `[${c.value.join(', ')}]` : String(c.value);
    return `${c.field} ${opMap[c.operator] || c.operator} ${valueStr}`;
  });

  return descs.join(` ${node.conditionLogic || 'AND'} `);
};

export const advanceAfterApproval = (
  config: ApprovalChainConfig,
  currentApprovalNodeId: string,
  isApproved: boolean,
  formData: Record<string, any>
): RouteResult => {
  const result: RouteResult = {
    nextNodeId: null,
    isEnd: false,
    passedNodes: [],
    routeLog: []
  };

  if (!isApproved) {
    result.routeLog.push(`[Reject] 审批被拒绝，流程终止`);
    result.isEnd = true;
    return result;
  }

  const currentNode = findNodeById(config, currentApprovalNodeId);
  if (!currentNode) {
    result.routeLog.push(`[Error] 节点 ${currentApprovalNodeId} 不存在`);
    return result;
  }

  if (!currentNode.nextNodeId) {
    result.routeLog.push(`[Warn] 节点 ${currentNode.name} 没有配置后续节点`);
    result.isEnd = true;
    return result;
  }

  result.routeLog.push(`[Approved] ${currentNode.name} 审批通过 → 继续路由`);
  return routeApprovalChain(config, currentNode.nextNodeId, formData);
};

/**
 * 完整遍历整条审批路径（从 start 走到 end，穿过所有 approval 节点不中断）
 * 基于给定 formData 选择实际会走的分支，返回路径上所有节点 id 以及其中的审批节点 id 列表
 */
export const walkFullApprovalPath = (
  config: ApprovalChainConfig,
  formData: Record<string, any> = {}
): {
  fullPathNodeIds: string[];
  approvalNodeIds: string[];
  lastApprovalId: string | null;
  lastBeforeEndId: string | null;
} => {
  const fullPathNodeIds: string[] = [];
  const approvalNodeIds: string[] = [];
  let currentId = config.startNodeId;
  let safety = 0;
  const MAX = 200;

  while (currentId && safety < MAX) {
    safety++;
    const node = findNodeById(config, currentId);
    if (!node) break;

    fullPathNodeIds.push(node.id);

    if (node.type === 'approval') {
      approvalNodeIds.push(node.id);
    }

    if (node.type === 'end') {
      break;
    }

    let nextId = '';
    switch (node.type) {
      case 'start':
      case 'approval':
        nextId = node.nextNodeId || '';
        break;
      case 'condition': {
        const condResult = evaluateConditions(
          node.conditions || [],
          node.conditionLogic || 'AND',
          formData
        );
        nextId = (condResult ? node.trueNextNodeId : node.falseNextNodeId) || '';
        break;
      }
      default:
        nextId = '';
    }
    currentId = nextId;
  }

  const lastApprovalId = approvalNodeIds.length > 0
    ? approvalNodeIds[approvalNodeIds.length - 1]
    : null;
  const lastBeforeEndId = fullPathNodeIds.length >= 2
    ? fullPathNodeIds[fullPathNodeIds.length - 2]
    : null;

  return {
    fullPathNodeIds,
    approvalNodeIds,
    lastApprovalId,
    lastBeforeEndId
  };
};

export const getApprovalPathPreview = (
  config: ApprovalChainConfig,
  formData: Record<string, any>
): { nodes: ApprovalNodeConfig[]; branches: Array<{ from: string; to: string; label?: string }> } => {
  const walk = walkFullApprovalPath(config, formData);
  const nodes: ApprovalNodeConfig[] = [];
  const branches: Array<{ from: string; to: string; label?: string }> = [];

  for (const nodeId of walk.fullPathNodeIds) {
    const node = findNodeById(config, nodeId);
    if (node) nodes.push(node);
  }

  for (let i = 0; i < walk.fullPathNodeIds.length - 1; i++) {
    const fromId = walk.fullPathNodeIds[i];
    const toId = walk.fullPathNodeIds[i + 1];
    const fromNode = findNodeById(config, fromId);
    let label: string | undefined;
    if (fromNode && fromNode.type === 'condition') {
      const condResult = evaluateConditions(
        fromNode.conditions || [],
        fromNode.conditionLogic || 'AND',
        formData
      );
      label = condResult ? '是' : '否';
    }
    branches.push({ from: fromId, to: toId, label });
  }

  // 补充非走行分支（被拒绝的分支）用于可视化对比
  for (const nodeId of walk.fullPathNodeIds) {
    const node = findNodeById(config, nodeId);
    if (node && node.type === 'condition') {
      const condResult = evaluateConditions(
        node.conditions || [],
        node.conditionLogic || 'AND',
        formData
      );
      const otherBranch = condResult ? node.falseNextNodeId : node.trueNextNodeId;
      if (otherBranch && !walk.fullPathNodeIds.includes(otherBranch)) {
        const otherLabel = condResult ? '否' : '是';
        branches.push({ from: nodeId, to: otherBranch, label: otherLabel });
        const otherNode = findNodeById(config, otherBranch);
        if (otherNode && !nodes.find(n => n.id === otherBranch)) {
          nodes.push(otherNode);
        }
      }
    }
  }

  return { nodes, branches };
};

export const getNodeStatusMap = (
  approvalHistory: ApprovalRecord[],
  currentNodeId: string
): Map<string, 'completed' | 'current' | 'pending' | 'rejected'> => {
  const statusMap = new Map<string, 'completed' | 'current' | 'pending' | 'rejected'>();
  const completedIds = new Set<string>();
  let currentReached = false;

  for (const record of approvalHistory) {
    if (record.action === 'reject') {
      statusMap.set(record.nodeId, 'rejected');
      completedIds.add(record.nodeId);
    } else {
      completedIds.add(record.nodeId);
    }
  }

  const allIds = approvalHistory.map(r => r.nodeId);
  for (const id of allIds) {
    if (!statusMap.has(id)) {
      statusMap.set(id, 'completed');
    }
  }

  if (currentNodeId && completedIds.has(currentNodeId)) {
    currentReached = true;
  }

  if (currentNodeId && !statusMap.has(currentNodeId)) {
    statusMap.set(currentNodeId, 'current');
  }

  return statusMap;
};

/**
 * 计算审批节点进度统计（基于整条实际会经过的审批路线）
 * 返回：总数totalApprovals / 已通过passed / 当前进行中current / 剩余remaining / 各阶段节点列表
 */
export const getApprovalNodeStats = (
  config: ApprovalChainConfig,
  formData: Record<string, any> = {},
  approvalHistory: ApprovalRecord[] = [],
  currentNodeId: string = ''
) => {
  const walk = walkFullApprovalPath(config, formData);
  const pathApprovalNodeIds = walk.approvalNodeIds;

  const historyApprovals = approvalHistory.filter(h => h.action !== 'route');
  let pendingId: string | null = null;
  let passedIds: string[] = [];

  for (let i = 0; i < pathApprovalNodeIds.length; i++) {
    const nid = pathApprovalNodeIds[i];
    const hist = historyApprovals.find(h => h.nodeId === nid);
    if (hist) {
      if (hist.action === 'reject') {
        break;
      }
      if (hist.action === 'approve') {
        passedIds.push(nid);
        continue;
      }
    }
    if (!pendingId) {
      if (nid === currentNodeId) {
        pendingId = nid;
      } else if (!hist && i === passedIds.length) {
        pendingId = nid;
      }
    }
  }

  const total = pathApprovalNodeIds.length;
  const passed = passedIds.length;
  const remaining = total - passed - (pendingId ? 1 : 0);
  const pendingNode = pendingId ? findNodeById(config, pendingId) : null;
  const currentIndex = pendingId ? pathApprovalNodeIds.indexOf(pendingId) : passed;

  return {
    totalApprovals: total,
    passed,
    currentIndex,
    remaining: Math.max(0, remaining),
    pendingId,
    pendingNodeName: pendingNode?.name || '',
    passedIds,
    allApprovalNodeIds: pathApprovalNodeIds,
    allReachableNodes: walk.fullPathNodeIds
  };
};

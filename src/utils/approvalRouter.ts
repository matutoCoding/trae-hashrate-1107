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

export const getApprovalPathPreview = (
  config: ApprovalChainConfig,
  formData: Record<string, any>
): { nodes: ApprovalNodeConfig[]; branches: Array<{ from: string; to: string; label?: string }> } => {
  const nodes: ApprovalNodeConfig[] = [];
  const branches: Array<{ from: string; to: string; label?: string }> = [];
  let currentNodeId = config.startNodeId;
  let safetyCounter = 0;

  while (currentNodeId && safetyCounter < 100) {
    safetyCounter++;
    const node = findNodeById(config, currentNodeId);
    if (!node) break;

    nodes.push(node);

    switch (node.type) {
      case 'start':
        if (node.nextNodeId) {
          branches.push({ from: node.id, to: node.nextNodeId });
          currentNodeId = node.nextNodeId;
        } else {
          currentNodeId = '';
        }
        break;

      case 'condition':
        const condResult = evaluateConditions(
          node.conditions || [],
          node.conditionLogic || 'AND',
          formData
        );
        const trueNext = condResult ? node.trueNextNodeId : node.falseNextNodeId;
        const otherNext = condResult ? node.falseNextNodeId : node.trueNextNodeId;

        if (trueNext) {
          branches.push({ from: node.id, to: trueNext, label: condResult ? '是' : '否' });
          currentNodeId = trueNext;
        } else {
          currentNodeId = '';
        }
        if (otherNext) {
          branches.push({ from: node.id, to: otherNext, label: condResult ? '否' : '是' });
        }
        break;

      case 'approval':
        if (node.nextNodeId) {
          branches.push({ from: node.id, to: node.nextNodeId });
        }
        currentNodeId = '';
        break;

      case 'end':
      default:
        currentNodeId = '';
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

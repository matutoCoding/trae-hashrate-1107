import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import styles from './index.module.scss';
import type { ApprovalChainConfig, ApprovalNodeConfig, ApprovalRecord } from '@/types';
import { getNodeStatusMap } from '@/utils/approvalRouter';
import classnames from 'classnames';

interface ApprovalChainProps {
  config: ApprovalChainConfig;
  currentNodeId?: string;
  approvalHistory?: ApprovalRecord[];
  highlightPath?: string[];
}

interface NodeDisplayData {
  node: ApprovalNodeConfig;
  status: 'completed' | 'current' | 'pending' | 'rejected';
  x: number;
  y: number;
}

const ApprovalChain: React.FC<ApprovalChainProps> = ({
  config,
  currentNodeId,
  approvalHistory = [],
  highlightPath = []
}) => {
  const statusMap = getNodeStatusMap(approvalHistory, currentNodeId || '');

  const layoutNodes = (): NodeDisplayData[] => {
    const result: NodeDisplayData[] = [];
    const visited = new Set<string>();
    let currentY = 0;
    const colWidth = 200;
    const rowHeight = 140;

    const traverse = (nodeId: string | undefined, level: number) => {
      if (!nodeId || visited.has(nodeId)) return;
      const node = config.nodes.find(n => n.id === nodeId);
      if (!node) return;

      visited.add(nodeId);
      const status = currentNodeId === nodeId
        ? 'current'
        : (statusMap.get(nodeId) || (approvalHistory.length > 0 ? 'pending' : 'pending'));

      result.push({
        node,
        status,
        x: level * colWidth,
        y: currentY
      });

      switch (node.type) {
        case 'start':
        case 'approval':
          traverse(node.nextNodeId, level + 1);
          break;
        case 'condition':
          const yBefore = currentY;
          const maxCol = level + 1;
          currentY += rowHeight;
          traverse(node.trueNextNodeId, maxCol);
          const trueY = currentY;
          currentY = yBefore + rowHeight * 2;
          traverse(node.falseNextNodeId, maxCol);
          currentY = Math.max(trueY, currentY);
          break;
        case 'end':
          currentY += rowHeight;
          break;
      }
    };

    traverse(config.startNodeId, 0);
    return result;
  };

  const nodeData = layoutNodes();
  const isHighlighted = (nodeId: string) =>
    highlightPath.length === 0 || highlightPath.includes(nodeId);

  const getNodeIcon = (type: ApprovalNodeConfig['type']) => {
    switch (type) {
      case 'start': return '▶';
      case 'end': return '■';
      case 'condition': return '◇';
      case 'approval': return '✓';
    }
  };

  return (
    <ScrollView scrollX className={styles.scrollContainer}>
      <View className={styles.chainContainer} style={{ minHeight: Math.max(nodeData.length * 140, 400) }}>
        <View className={styles.svgLayer}>
          {nodeData.map((data, idx) => {
            const { node, x, y } = data;
            let connections: Array<{ toX: number; toY: number; label?: string }> = [];

            const getTargetPos = (targetId: string | undefined) => {
              if (!targetId) return null;
              const target = nodeData.find(d => d.node.id === targetId);
              return target ? { x: target.x, y: target.y } : null;
            };

            switch (node.type) {
              case 'start':
              case 'approval': {
                const target = getTargetPos(node.nextNodeId);
                if (target) {
                  connections.push({ toX: target.x, toY: target.y });
                }
                break;
              }
              case 'condition': {
                const trueTarget = getTargetPos(node.trueNextNodeId);
                const falseTarget = getTargetPos(node.falseNextNodeId);
                if (trueTarget) {
                  connections.push({ toX: trueTarget.x, toY: trueTarget.y, label: '是' });
                }
                if (falseTarget) {
                  connections.push({ toX: falseTarget.x, toY: falseTarget.y, label: '否' });
                }
                break;
              }
            }

            return connections.map((conn, cIdx) => {
              const x1 = x + 90;
              const y1 = y + 40;
              const x2 = conn.toX + 10;
              const y2 = conn.toY + 40;
              const midX = (x1 + x2) / 2;

              return (
                <View
                  key={`line-${idx}-${cIdx}`}
                  className={styles.connectionLine}
                  style={{
                    left: x1,
                    top: y1,
                    width: Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
                    transform: `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`,
                    transformOrigin: '0 50%'
                  }}
                />
              );
            });
          })}
        </View>

        {nodeData.map((data, idx) => {
          const { node, status, x, y } = data;
          const highlighted = isHighlighted(node.id);
          const latestRecord = approvalHistory.filter(r => r.nodeId === node.id).pop();

          return (
            <View
              key={node.id}
              className={classnames(
                styles.node,
                styles[`nodeType${node.type.charAt(0).toUpperCase() + node.type.slice(1)}`],
                {
                  [styles.nodeStatusCompleted]: status === 'completed',
                  [styles.nodeStatusCurrent]: status === 'current',
                  [styles.nodeStatusRejected]: status === 'rejected',
                  [styles.nodeHighlighted]: highlighted
                }
              )}
              style={{ left: x, top: y }}
            >
              <View className={styles.nodeIcon}>
                <Text className={styles.nodeIconText}>{getNodeIcon(node.type)}</Text>
              </View>
              <View className={styles.nodeContent}>
                <Text className={styles.nodeName}>{node.name}</Text>
                {node.role && (
                  <Text className={styles.nodeRole}>岗位: {node.role}</Text>
                )}
                {node.level && (
                  <Text className={styles.nodeLevel}>L{node.level}</Text>
                )}
                {latestRecord && (
                  <View className={styles.nodeRecord}>
                    <Text className={styles.recordApprover}>
                      {latestRecord.approverName || '系统'}
                    </Text>
                    <Text
                      className={classnames(styles.recordAction, {
                        [styles.recordApprove]: latestRecord.action === 'approve',
                        [styles.recordReject]: latestRecord.action === 'reject'
                      })}
                    >
                      {latestRecord.action === 'approve' ? '通过' : latestRecord.action === 'reject' ? '驳回' : '路由'}
                    </Text>
                  </View>
                )}
              </View>

              {status === 'current' && (
                <View className={styles.currentBadge}>
                  <Text className={styles.currentBadgeText}>当前</Text>
                </View>
              )}
            </View>
          );
        })}

        <View className={styles.legend}>
          <View className={styles.legendItem}>
            <View className={`${styles.legendDot} ${styles.legendDotCompleted}`} />
            <Text className={styles.legendText}>已完成</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={`${styles.legendDot} ${styles.legendDotCurrent}`} />
            <Text className={styles.legendText}>当前节点</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={`${styles.legendDot} ${styles.legendDotPending}`} />
            <Text className={styles.legendText}>待处理</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default ApprovalChain;

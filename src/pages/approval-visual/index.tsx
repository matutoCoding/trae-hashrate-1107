import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import ApprovalChain from '@/components/ApprovalChain';
import type { ApprovalInstance, ApprovalChainConfig, BusinessRecord } from '@/types';
import { routeApprovalChain, getApprovalPathPreview, getNodeStatusMap } from '@/utils/approvalRouter';
import classnames from 'classnames';

type Mode = 'preview' | 'instance';

const ApprovalVisualPage: React.FC = () => {
  const router = useRouter();
  const { chainId, instanceId, businessId, mode = 'instance' } = router.params;

  const approvalChainConfigs = useAppStore(s => s.approvalChainConfigs);
  const approvalInstances = useAppStore(s => s.approvalInstances);
  const businessRecords = useAppStore(s => s.businessRecords);

  const [chain, setChain] = useState<ApprovalChainConfig | null>(null);
  const [instance, setInstance] = useState<ApprovalInstance | null>(null);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);

  useEffect(() => {
    const configId = chainId || (instanceId ? approvalInstances.find(i => i.id === instanceId)?.chainConfigId : null);
    const foundChain = approvalChainConfigs.find(c => c.id === configId);
    const foundInstance = instanceId ? approvalInstances.find(i => i.id === instanceId) : null;
    const foundBusiness = businessId ? businessRecords.find(b => b.id === businessId) : null;

    if (foundChain) setChain(foundChain);
    if (foundInstance) setInstance(foundInstance);
    if (foundBusiness) setBusiness(foundBusiness);

    console.log('[ApprovalVisual] mode:', mode, { chainId, instanceId, businessId, foundChain, foundInstance });
  }, [chainId, instanceId, businessId, mode, approvalChainConfigs, approvalInstances, businessRecords]);

  const routeResult = useMemo(() => {
    if (!chain) return null;
    try {
      const formData = business?.formData || {};
      return routeApprovalChain(chain, chain.startNodeId, formData);
    } catch (err) {
      console.error('[ApprovalVisual] 路由计算失败:', err);
      return null;
    }
  }, [chain, business]);

  const pathPreview = useMemo(() => {
    if (!chain) return { nodes: [], branches: [] };
    return getApprovalPathPreview(chain, business?.formData || {});
  }, [chain, business]);

  const statusMap = useMemo(() => {
    if (!instance) return new Map<string, 'completed' | 'current' | 'pending' | 'rejected'>();
    return getNodeStatusMap(instance.approvalHistory, instance.currentNodeId);
  }, [instance]);

  const currentMode: Mode = (mode as Mode) || 'preview';

  if (!chain) {
    return (
      <View className={`pageContainer ${styles.container}`}>
        <View className="emptyState">加载中或未找到审批链...</View>
      </View>
    );
  }

  const statusLabel = {
    pending: '待启动',
    processing: '审批中',
    approved: '已通过',
    rejected: '已驳回'
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const getLogLineClass = (line: string) => {
    if (line.includes('[Start]')) return 'routeLogLineStart';
    if (line.includes('[Condition]')) return 'routeLogLineCondition';
    if (line.includes('[Approval]')) return 'routeLogLineApproval';
    if (line.includes('[End]')) return 'routeLogLineEnd';
    if (line.includes('[Error]')) return 'routeLogLineError';
    return '';
  };

  return (
    <View className={`pageContainer ${styles.container}`}>
      <View className={styles.headerCard}>
        <Text className={styles.bizName}>📋 {chain.businessTypeName}</Text>
        <Text className={styles.bizSubtitle}>{chain.name} · v{chain.version}</Text>
        <View className={styles.statusBadge}>
          {currentMode === 'instance' && instance
            ? `状态: ${statusLabel[instance.status]}`
            : '模式: 配置预览'}
        </View>

        <View className={styles.infoRow}>
          <View className={styles.infoItem}>
            <Text className={styles.infoNum}>{chain.nodes.length}</Text>
            <Text className={styles.infoLabel}>总节点</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoNum}>
              {chain.nodes.filter(n => n.type === 'approval').length}
            </Text>
            <Text className={styles.infoLabel}>审批节点</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoNum}>
              {chain.nodes.filter(n => n.type === 'condition').length}
            </Text>
            <Text className={styles.infoLabel}>条件分支</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoNum}>
              {instance ? instance.approvalHistory.length : 0}
            </Text>
            <Text className={styles.infoLabel}>已处理</Text>
          </View>
        </View>
      </View>

      {business && (
        <View className={styles.formDataCard}>
          <Text className={styles.formDataTitle}>📝 业务表单数据（路由条件依据）</Text>
          {Object.entries(business.formData).length === 0 ? (
            <Text style={{ fontSize: 24, color: '#86909C' }}>暂无表单数据</Text>
          ) : (
            Object.entries(business.formData).map(([key, value]) => (
              <View key={key} className={styles.formRow}>
                <Text className={styles.formLabel}>{key}</Text>
                <Text className={styles.formValue}>
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      {routeResult && (
        <View className={styles.routePreview}>
          <Text className={styles.routeTitle}>
            🛤️ 动态路由计算结果（基于当前表单数据）
          </Text>
          <View className={styles.routePath}>
            {pathPreview.nodes.map((node, idx) => (
              <React.Fragment key={node.id}>
                <View
                  className={classnames(styles.pathNode, {
                    [styles.pathNodeCurrent]:
                      instance && node.id === instance.currentNodeId
                  })}
                >
                  {node.name}
                </View>
                {idx < pathPreview.nodes.length - 1 && (
                  <Text className={styles.pathArrow}>→</Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      <View className={styles.sectionHeader}>
        <Text className="sectionTitle" style={{ marginBottom: 0 }}>审批链流程图</Text>
      </View>

      <View className={styles.chainContainer}>
        <ApprovalChain
          config={chain}
          currentNodeId={instance?.currentNodeId}
          approvalHistory={instance?.approvalHistory || []}
          highlightPath={pathPreview.nodes.map(n => n.id)}
        />
      </View>

      {instance && instance.approvalHistory.length > 0 && (
        <View className={styles.historyCard}>
          <Text className={styles.historyTitle}>📜 审批历史记录</Text>
          <View className={styles.timeline}>
            {instance.approvalHistory.map((record, idx) => {
              const dotClass =
                record.action === 'reject'
                  ? 'timelineDotReject'
                  : record.action === 'route'
                    ? 'timelineDotRoute'
                    : '';
              return (
                <View key={idx} className={styles.timelineItem}>
                  <View className={classnames(styles.timelineDot, styles[dotClass])} />
                  <View className={styles.timelineContent}>
                    <View className={styles.timelineHeader}>
                      <Text className={styles.timelineNodeName}>{record.nodeName}</Text>
                      <Text className={styles.timelineTime}>{formatTime(record.time)}</Text>
                    </View>
                    {record.approverName && (
                      <Text className={styles.timelineApprover}>
                        处理人: {record.approverName}
                        {record.action === 'approve' ? ' ✅ 通过' :
                         record.action === 'reject' ? ' ❌ 驳回' : ' 🔀 路由判断'}
                      </Text>
                    )}
                    {record.comment && (
                      <View className={styles.timelineComment}>{record.comment}</View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {routeResult && routeResult.routeLog.length > 0 && (
        <View className={styles.routeLogCard}>
          <Text className={styles.routeLogTitle}>🔍 路由引擎执行日志（调试）</Text>
          <ScrollView scrollY style={{ maxHeight: 400 }}>
            {routeResult.routeLog.map((line, idx) => (
              <Text key={idx} className={classnames(styles.routeLogLine, styles[getLogLineClass(line)])}>
                {line}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default ApprovalVisualPage;

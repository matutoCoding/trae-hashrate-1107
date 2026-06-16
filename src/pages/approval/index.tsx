import React, { useMemo, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import type {
  ApprovalTodoItem,
  ApprovalChainConfig,
  ApprovalNodeType
} from '@/types';
import classnames from 'classnames';

const ApprovalPage: React.FC = () => {
  const approvalTodoList = useAppStore(s => s.approvalTodoList);
  const approvalChainConfigs = useAppStore(s => s.approvalChainConfigs);
  const approvalInstances = useAppStore(s => s.approvalInstances);
  const businessRecords = useAppStore(s => s.businessRecords);
  const currentUser = useAppStore(s => s.currentUser);
  const approveNode = useAppStore(s => s.approveNode);
  const rejectNode = useAppStore(s => s.rejectNode);
  const cleanupInvalidTodos = useAppStore(s => s.cleanupInvalidTodos);

  useEffect(() => {
    const removed = cleanupInvalidTodos();
    if (removed > 0) {
      console.log(`[Approval] 页面加载时清理了 ${removed} 条异常待办`);
      Taro.showToast({ title: `清理了${removed}条异常待办`, icon: 'none', duration: 2000 });
    }
  }, [cleanupInvalidTodos]);

  const stats = useMemo(() => {
    const todo = approvalTodoList.length;
    const processing = approvalInstances.filter(i => i.status === 'processing').length;
    const approved = approvalInstances.filter(i => i.status === 'approved').length;
    const rejected = approvalInstances.filter(i => i.status === 'rejected').length;
    return { todo, processing, approved, rejected };
  }, [approvalTodoList, approvalInstances]);

  const getNodeClass = (type: ApprovalNodeType) => {
    const map: Record<ApprovalNodeType, string> = {
      start: 'miniNodeStart',
      approval: 'miniNodeApproval',
      condition: 'miniNodeCondition',
      end: 'miniNodeEnd'
    };
    return map[type];
  };

  const handleApprove = (todo: ApprovalTodoItem) => {
    Taro.showModal({
      title: '审批通过',
      content: `确定通过「${todo.businessTypeName} - ${todo.nodeName}」的审批吗？`,
      editable: true,
      placeholderText: '请输入审批意见（可选）',
      success: res => {
        if (res.confirm) {
          const result = approveNode(
            todo.instanceId,
            todo.nodeId,
            currentUser.id,
            currentUser.name,
            res.content
          );
          Taro.showToast({
            title: result.message,
            icon: result.success ? 'success' : 'none',
            duration: 2500
          });
          console.log('[Approval] 通过审批结果:', todo.id, result);
        }
      }
    });
  };

  const handleReject = (todo: ApprovalTodoItem) => {
    Taro.showModal({
      title: '审批驳回',
      content: '请输入驳回理由：',
      editable: true,
      placeholderText: '请输入驳回理由',
      confirmColor: '#F53F3F',
      success: res => {
        if (res.confirm) {
          if (!res.content) {
            Taro.showToast({ title: '请输入驳回理由', icon: 'none' });
            return;
          }
          const result = rejectNode(
            todo.instanceId,
            todo.nodeId,
            currentUser.id,
            currentUser.name,
            res.content
          );
          Taro.showToast({
            title: result.message,
            icon: result.success ? 'none' : 'none',
            duration: 2500
          });
          console.log('[Approval] 驳回审批结果:', todo.id, result);
        }
      }
    });
  };

  const handleTodoDetail = (todo: ApprovalTodoItem) => {
    Taro.navigateTo({
      url: `/pages/approval-visual/index?instanceId=${todo.instanceId}&businessId=${todo.businessId}`
    });
  };

  const handleEditChain = (chain: ApprovalChainConfig) => {
    Taro.navigateTo({
      url: `/pages/approval-config/index?chainId=${chain.id}&bizId=${chain.businessTypeId}`
    });
  };

  const handleViewChain = (chain: ApprovalChainConfig) => {
    Taro.navigateTo({
      url: `/pages/approval-visual/index?chainId=${chain.id}&mode=preview`
    });
  };

  const getPriorityClass = (p: ApprovalTodoItem['priority']) => {
    const map: Record<string, string> = {
      high: 'priorityHigh',
      medium: '',
      low: 'priorityLow'
    };
    return map[p] || '';
  };

  const getTodoCardClass = (p: ApprovalTodoItem['priority']) => {
    const map: Record<string, string> = {
      high: 'todoCardHigh',
      medium: '',
      low: 'todoCardLow'
    };
    return map[p] || '';
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  const countNodeTypes = (nodes: ApprovalChainConfig['nodes']) => {
    return {
      total: nodes.length,
      approval: nodes.filter(n => n.type === 'approval').length,
      condition: nodes.filter(n => n.type === 'condition').length
    };
  };

  return (
    <View className={`pageContainer ${styles.container}`}>
      <View className={styles.summaryBanner}>
        <Text className={styles.bannerTitle}>📊 审批概览</Text>
        <View className={styles.summaryGrid}>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryNum}>{stats.todo}</Text>
            <Text className={styles.summaryLabel}>待审批</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryNum}>{stats.processing}</Text>
            <Text className={styles.summaryLabel}>审批中</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryNum}>{stats.approved}</Text>
            <Text className={styles.summaryLabel}>已通过</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryNum}>{stats.rejected}</Text>
            <Text className={styles.summaryLabel}>已驳回</Text>
          </View>
        </View>
      </View>

      <View className={styles.sectionHeader}>
        <Text className="sectionTitle" style={{ marginBottom: 0 }}>待办审批</Text>
        <Text className={styles.actionLink}>全部 ({stats.todo}) →</Text>
      </View>

      <ScrollView scrollY style={{ maxHeight: 600, marginBottom: 40 }}>
        {approvalTodoList.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>✅</Text>
            <Text className={styles.emptyText}>暂无待办审批，休息一下吧～</Text>
          </View>
        ) : (
          approvalTodoList.map(todo => (
            <View
              key={todo.id}
              className={classnames(styles.todoCard, styles[getTodoCardClass(todo.priority)])}
            >
              <View className={styles.todoHeader}>
                <View className={styles.todoTitleBlock}>
                  <Text className={styles.todoBizName}>{todo.businessTypeName}</Text>
                  <Text className={styles.todoNodeName}>📍 {todo.nodeName}</Text>
                </View>
                <View className={classnames(styles.priorityTag, styles[getPriorityClass(todo.priority)])}>
                  {todo.priority === 'high' ? '紧急' : todo.priority === 'medium' ? '一般' : '普通'}
                </View>
              </View>

              <View className={styles.todoBody}>
                <View className={styles.todoInfoRow}>
                  <Text className={styles.todoInfoLabel}>申请人</Text>
                  <Text className={styles.todoInfoValue}>{todo.applicantName}</Text>
                </View>
                <View className={styles.todoInfoRow}>
                  <Text className={styles.todoInfoLabel}>提交时间</Text>
                  <Text className={styles.todoInfoValue}>{formatDate(todo.createTime)}</Text>
                </View>
                {todo.deadline && (
                  <View className={styles.todoInfoRow}>
                    <Text className={styles.todoInfoLabel}>截止时间</Text>
                    <Text className={styles.todoInfoValue} style={{ color: '#F53F3F' }}>
                      {formatDate(todo.deadline)}
                    </Text>
                  </View>
                )}
              </View>

              <View className={styles.todoActions}>
                <View
                  className={classnames(styles.todoBtn, styles.btnDetail)}
                  onClick={() => handleTodoDetail(todo)}
                >
                  详情
                </View>
                <View
                  className={classnames(styles.todoBtn, styles.btnReject)}
                  onClick={() => handleReject(todo)}
                >
                  驳回
                </View>
                <View
                  className={classnames(styles.todoBtn, styles.btnApprove)}
                  onClick={() => handleApprove(todo)}
                >
                  通过
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View className={styles.sectionHeader}>
        <Text className="sectionTitle" style={{ marginBottom: 0 }}>审批链配置</Text>
        <Text className={styles.actionLink}>共 {approvalChainConfigs.length} 条 →</Text>
      </View>

      {approvalChainConfigs.map(chain => {
        const counts = countNodeTypes(chain.nodes);
        return (
          <View key={chain.id} className={styles.chainListCard}>
            <View className={styles.chainCardHeader}>
              <Text className={styles.chainBizName}>{chain.businessTypeName}</Text>
              <Text className={styles.chainVersion}>v{chain.version}</Text>
            </View>

            <View className={styles.chainSummary}>
              <View className={styles.chainMeta}>
                <Text className={styles.chainMetaLabel}>节点总数</Text>
                <Text className={styles.chainMetaValue}>{counts.total}</Text>
              </View>
              <View className={styles.chainMeta}>
                <Text className={styles.chainMetaLabel}>审批节点</Text>
                <Text className={styles.chainMetaValue}>{counts.approval}</Text>
              </View>
              <View className={styles.chainMeta}>
                <Text className={styles.chainMetaLabel}>条件分支</Text>
                <Text className={styles.chainMetaValue}>{counts.condition}</Text>
              </View>
            </View>

            <View className={styles.chainMiniPreview}>
              {chain.nodes.map((node, idx) => (
                <React.Fragment key={node.id}>
                  <View className={classnames(styles.miniNode, styles[getNodeClass(node.type)])}>
                    {node.name}
                  </View>
                  {idx < chain.nodes.length - 1 && (
                    <Text className={styles.miniArrow}>→</Text>
                  )}
                </React.Fragment>
              ))}
            </View>

            <View className={styles.chainActions}>
              <View
                className={classnames(styles.chainBtn, styles.chainBtnSecondary)}
                onClick={() => handleViewChain(chain)}
              >
                📊 可视化预览
              </View>
              <View
                className={styles.chainBtn}
                onClick={() => handleEditChain(chain)}
              >
                ⚙️ 编辑配置
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default ApprovalPage;

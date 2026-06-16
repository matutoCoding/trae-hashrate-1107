import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { getPassedList } from '@/utils/queueManager';
import type { QueueItem, CallRecord } from '@/types';
import classnames from 'classnames';

type TabType = 'passed' | 'invalid' | 'all';

const PassNumberPage: React.FC = () => {
  const queueList = useAppStore(s => s.queueList);
  const callRecords = useAppStore(s => s.callRecords);
  const processPass = useAppStore(s => s.processPass);
  const invalidateQueueItem = useAppStore(s => s.invalidateQueueItem);
  const systemConfig = useAppStore(s => s.systemConfig);

  const [activeTab, setActiveTab] = useState<TabType>('passed');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const triggerHighlight = (id: string) => {
    setHighlightedId(id);
    setTimeout(() => setHighlightedId(null), 3000);
  };

  const stats = useMemo(() => {
    const passed = queueList.filter(q => q.status === 'passed').length;
    const invalid = queueList.filter(q => q.status === 'invalid').length;
    const totalPassedCount = queueList.reduce((sum, q) => sum + q.passCount, 0);
    const todayTotal = queueList.length;
    return { passed, invalid, totalPassedCount, todayTotal };
  }, [queueList]);

  const filteredList = useMemo(() => {
    let list = getPassedList(queueList);
    switch (activeTab) {
      case 'passed':
        list = list.filter(q => q.status === 'passed');
        break;
      case 'invalid':
        list = list.filter(q => q.status === 'invalid');
        break;
      case 'all':
      default:
        break;
    }
    return list;
  }, [queueList, activeTab]);

  const getItemCallHistory = (queueId: string): CallRecord[] => {
    return callRecords
      .filter(c => c.queueId === queueId)
      .sort((a, b) => new Date(b.callTime).getTime() - new Date(a.callTime).getTime());
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${formatTime(iso)}`;
  };

  const handleRequeue = (item: QueueItem) => {
    Taro.showModal({
      title: '确认处理',
      content: `号码 ${item.ticketNumber} 当前已过号${item.passCount}/${item.maxPassCount}次\n\n点击"确认过号"将累计过号次数并重排队尾\n（已达${item.maxPassCount}次将自动作废）`,
      confirmText: '确认过号',
      confirmColor: '#FF7D00',
      success: res => {
        if (res.confirm) {
          const result = processPass(item.id);
          Taro.showToast({
            title: result.isInvalid ? '已作废' : result.message,
            icon: result.isInvalid ? 'none' : 'success',
            duration: 2500
          });
          if (result.isInvalid) {
            setTimeout(() => {
              setActiveTab('invalid');
              triggerHighlight(item.id);
            }, 500);
          }
          console.log('[PassNumber] 过号处理:', item.id, result);
        }
      }
    });
  };

  const handleViewDetail = (item: QueueItem) => {
    Taro.showActionSheet({
      itemList: ['查看叫号记录', '联系市民', '标记作废'],
      success: res => {
        if (res.tapIndex === 0) {
          const history = getItemCallHistory(item.id);
          const content = history.length > 0
            ? history.map(h => `${formatDate(h.callTime)} - ${h.windowNumber}窗口 ${h.isPassed ? '(过号)' : '(已到)'}${h.passOrder ? ' 第' + h.passOrder + '次' : ''}`).join('\n')
            : '暂无叫号记录';
          Taro.showModal({
            title: `${item.ticketNumber} 叫号记录`,
            content,
            showCancel: false
          });
        }
        if (res.tapIndex === 1) {
          Taro.showToast({ title: `正在呼叫: ${item.phone}`, icon: 'none' });
        }
        if (res.tapIndex === 2) {
          Taro.showModal({
            title: '确认作废',
            content: `确定要强制作废号码 ${item.ticketNumber} 吗？\n当前过号${item.passCount}/${item.maxPassCount}次\n\n作废后将补齐过号记录至${item.maxPassCount}次，此操作不可恢复。`,
            confirmColor: '#F53F3F',
            success: r => {
              if (r.confirm) {
                invalidateQueueItem(item.id);
                Taro.showToast({
                  title: `号码 ${item.ticketNumber} 已作废`,
                  icon: 'none',
                  duration: 2000
                });
                setTimeout(() => {
                  setActiveTab('invalid');
                  triggerHighlight(item.id);
                }, 500);
                console.log('[PassNumber] 强制作废:', item.id, item.ticketNumber);
              }
            }
          });
        }
      }
    });
  };

  return (
    <View className={`pageContainer ${styles.container}`}>
      <View className={styles.statsRow}>
        <View className={styles.statCard}>
          <Text className={styles.statNum}>{stats.todayTotal}</Text>
          <Text className={styles.statLabel}>今日取号</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={classnames(styles.statNum, styles.statNumWarn)}>{stats.passed}</Text>
          <Text className={styles.statLabel}>待处理</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={classnames(styles.statNum, styles.statNumOk)}>{stats.totalPassedCount}</Text>
          <Text className={styles.statLabel}>累计过号</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={classnames(styles.statNum, styles.statNumError)}>{stats.invalid}</Text>
          <Text className={styles.statLabel}>已作废</Text>
        </View>
      </View>

      <View className={styles.configCard}>
        <Text className={styles.configTitle}>⚙️ 过号规则配置</Text>
        <View className={styles.configRow}>
          <View>
            <Text className={styles.configLabel}>最大过号次数</Text>
            <Text className={styles.configDesc}>连续过号此次数后自动作废</Text>
          </View>
          <View className={styles.passProgress}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View
                key={i}
                className={classnames(styles.progressDot, {
                  [styles.progressDotUsed]: i < systemConfig.maxPassCount,
                  [styles.progressDotActive]: i === systemConfig.maxPassCount - 1
                })}
              />
            ))}
            <Text className={styles.configValue} style={{ marginLeft: 12 }}>
              {systemConfig.maxPassCount}次
            </Text>
          </View>
        </View>
        <View className={styles.configRow}>
          <Text className={styles.configLabel}>叫号超时时间</Text>
          <Text className={styles.configValue}>{systemConfig.callTimeoutSeconds}秒</Text>
        </View>
        <View className={styles.configRow}>
          <Text className={styles.configLabel}>过号重排位置</Text>
          <Text className={styles.configValue}>
            {systemConfig.passRequeuePosition === 'tail' ? '排到队尾' : '当前位置+3'}
          </Text>
        </View>
      </View>

      <View className={styles.tabs}>
        <View
          className={classnames(styles.tabItem, { [styles.tabActive]: activeTab === 'passed' })}
          onClick={() => setActiveTab('passed')}
        >
          待处理 ({stats.passed})
        </View>
        <View
          className={classnames(styles.tabItem, { [styles.tabActive]: activeTab === 'invalid' })}
          onClick={() => setActiveTab('invalid')}
        >
          已作废 ({stats.invalid})
        </View>
        <View
          className={classnames(styles.tabItem, { [styles.tabActive]: activeTab === 'all' })}
          onClick={() => setActiveTab('all')}
        >
          全部记录
        </View>
      </View>

      <ScrollView scrollY style={{ maxHeight: 1000 }}>
        {filteredList.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📭</Text>
            <Text className={styles.emptyText}>
              {activeTab === 'passed' ? '暂无待处理的过号' :
               activeTab === 'invalid' ? '暂无作废记录' : '暂无过号记录'}
            </Text>
          </View>
        ) : (
          filteredList.map(item => {
            const history = getItemCallHistory(item.id);
            return (
              <View
                key={item.id}
                className={classnames(styles.callLogCard, {
                  [styles.callLogCardInvalid]: item.status === 'invalid',
                  [styles.callLogCardHighlight]: highlightedId === item.id
                })}
              >
                <View className={styles.logHeader}>
                  <View className={styles.logTicketBlock}>
                    <Text className={styles.logTicket}>{item.ticketNumber}</Text>
                    <Text className={styles.logBizName}>{item.businessTypeName}</Text>
                  </View>
                  <View className={classnames(styles.logStatus, {
                    [styles.logStatusInvalid]: item.status === 'invalid'
                  })}>
                    {item.status === 'invalid' ? `作废(${item.passCount}次)` : `过号${item.passCount}/${item.maxPassCount}`}
                  </View>
                </View>

                <View className={styles.logInfo}>
                  <View className={styles.logInfoRow}>
                    <Text className={styles.logInfoLabel}>市民姓名</Text>
                    <Text className={styles.logInfoValue}>{item.citizenName}</Text>
                  </View>
                  <View className={styles.logInfoRow}>
                    <Text className={styles.logInfoLabel}>联系电话</Text>
                    <Text className={styles.logInfoValue}>{item.phone}</Text>
                  </View>
                  <View className={styles.logInfoRow}>
                    <Text className={styles.logInfoLabel}>取号时间</Text>
                    <Text className={styles.logInfoValue}>{formatDate(item.createTime)}</Text>
                  </View>
                  {history.length > 0 && (
                    <View className={styles.logInfoRow}>
                      <Text className={styles.logInfoLabel}>最近叫号</Text>
                      <Text className={styles.logInfoValue}>
                        {history[0].windowNumber}窗口 · {formatDate(history[0].callTime)}
                      </Text>
                    </View>
                  )}
                </View>

                {history.length > 0 && (
                  <View className={styles.logPassHistory}>
                    <Text className={styles.historyTitle}>📋 叫号历史记录</Text>
                    <View className={styles.historyTimeline}>
                      {[...history].reverse().map((h, idx) => (
                        <View
                          key={h.id}
                          className={classnames(styles.historyItem, {
                            [styles.historyItemLast]: idx === history.length - 1
                          })}
                        >
                          <Text className={styles.historyTime}>{formatDate(h.callTime)}</Text>
                          <Text className={styles.historyAction}>
                            {h.windowNumber}窗口
                            {h.isPassed ? ` · 过号${h.passOrder ? '（第' + h.passOrder + '次）' : ''}` : ' · 已到号'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {item.status === 'passed' && (
                  <View className={styles.actionBar}>
                    <View
                      className={classnames(styles.actionBtn, styles.actionBtnSecondary)}
                      onClick={() => handleViewDetail(item)}
                    >
                      查看详情
                    </View>
                    <View
                      className={classnames(styles.actionBtn, styles.actionBtnWarn)}
                      onClick={() => handleRequeue(item)}
                    >
                      过号重排
                    </View>
                    <View
                      className={classnames(styles.actionBtn, styles.actionBtnPrimary)}
                      onClick={() => {
                        Taro.showToast({ title: `已通知 ${item.citizenName}`, icon: 'success' });
                      }}
                    >
                      再次提醒
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default PassNumberPage;

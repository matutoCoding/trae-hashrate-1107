import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import BusinessCard from '@/components/BusinessCard';
import type { BusinessRecord } from '@/types';
import classnames from 'classnames';

type FilterType = 'all' | 'queuing' | 'processing' | 'approving' | 'completed' | 'rejected';

const FILTERS: { label: string; value: FilterType }[] = [
  { label: '全部', value: 'all' },
  { label: '排队中', value: 'queuing' },
  { label: '办理中', value: 'processing' },
  { label: '审批中', value: 'approving' },
  { label: '已完成', value: 'completed' },
  { label: '已驳回', value: 'rejected' }
];

const STEP_LABELS: Record<BusinessRecord['status'], string[]> = {
  draft: ['草稿'],
  queuing: ['提交', '排队中', '办理中', '审批中', '完成'],
  processing: ['已提交', '排队完成', '办理中', '审批中', '完成'],
  approving: ['已提交', '排队完成', '办理完成', '审批中', '完成'],
  completed: ['已提交', '排队完成', '办理完成', '审批完成', '已完成'],
  rejected: ['已提交', '排队完成', '办理完成', '审批驳回', '结束']
};

const BusinessPage: React.FC = () => {
  const businessRecords = useAppStore(s => s.businessRecords);
  const currentUser = useAppStore(s => s.currentUser);
  const updateBusinessStatus = useAppStore(s => s.updateBusinessStatus);

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const stats = useMemo(() => {
    const count = (status: BusinessRecord['status']) =>
      businessRecords.filter(b => b.status === status).length;
    return {
      total: businessRecords.length,
      queuing: count('queuing'),
      processing: count('processing') + count('approving'),
      completed: count('completed'),
      rejected: count('rejected')
    };
  }, [businessRecords]);

  const filteredRecords = useMemo(() => {
    let list = businessRecords.filter(
      b => b.applicantName === currentUser.name || b.applicantId.includes(currentUser.id.slice(-4))
    );
    if (list.length === 0) list = businessRecords; // demo模式显示全部
    if (activeFilter !== 'all') {
      list = list.filter(b => b.status === activeFilter);
    }
    return [...list].sort(
      (a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()
    );
  }, [businessRecords, activeFilter, currentUser]);

  const getFilterCount = (value: FilterType) => {
    if (value === 'all') return businessRecords.length;
    return businessRecords.filter(b => b.status === value).length;
  };

  const handleRecordClick = (record: BusinessRecord) => {
    Taro.navigateTo({
      url: `/pages/business-detail/index?bizId=${record.id}`
    });
  };

  const getStepClass = (status: BusinessRecord['status'], stepIdx: number) => {
    const stepMap: Record<BusinessRecord['status'], number> = {
      draft: -1,
      queuing: 1,
      processing: 2,
      approving: 3,
      completed: 4,
      rejected: 3
    };
    const currentStep = stepMap[status];
    if (status === 'rejected' && stepIdx === 3) return 'progressStepReject';
    if (stepIdx < currentStep) return 'progressStepDone';
    if (stepIdx === currentStep) return 'progressStepActive';
    return '';
  };

  const handleQuickAction = (record: BusinessRecord, action: string) => {
    console.log('[Business] 快捷操作:', record.id, action);
    switch (action) {
      case 'cancel':
        Taro.showModal({
          title: '取消业务',
          content: `确定取消「${record.businessTypeName}」的办理吗？`,
          confirmColor: '#F53F3F',
          success: res => {
            if (res.confirm) {
              Taro.showToast({ title: '已取消', icon: 'success' });
            }
          }
        });
        break;
      case 'remind':
        Taro.showToast({ title: '已提醒工作人员', icon: 'success' });
        break;
      case 'continue':
        Taro.showActionSheet({
          itemList: ['查看审批进度', '补充材料', '联系窗口'],
          success: r => {
            if (r.tapIndex === 0 && record.approvalChainId) {
              Taro.navigateTo({
                url: `/pages/approval-visual/index?instanceId=&businessId=${record.id}&mode=instance`
              });
            }
            if (r.tapIndex === 1) {
              Taro.showToast({ title: '材料上传功能开发中', icon: 'none' });
            }
            if (r.tapIndex === 2) {
              Taro.showToast({ title: '正在呼叫窗口...', icon: 'none' });
            }
          }
        });
        break;
      case 'view':
        handleRecordClick(record);
        break;
    }
  };

  return (
    <View className={`pageContainer ${styles.container}`}>
      <View className={styles.summaryBanner}>
        <Text className={styles.bannerTitle}>📊 我的业务统计</Text>
        <View className={styles.statsGrid}>
          <View className={styles.statCard}>
            <Text className={styles.statNum}>{stats.total}</Text>
            <Text className={styles.statLabel}>总申请</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statNum}>{stats.queuing}</Text>
            <Text className={styles.statLabel}>排队中</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statNum}>{stats.processing}</Text>
            <Text className={styles.statLabel}>办理中</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statNum}>{stats.completed}</Text>
            <Text className={styles.statLabel}>已完成</Text>
          </View>
        </View>
      </View>

      <ScrollView scrollX className={styles.filterBar}>
        {FILTERS.map(f => (
          <View
            key={f.value}
            className={classnames(styles.filterChip, {
              [styles.filterChipActive]: activeFilter === f.value
            })}
            onClick={() => setActiveFilter(f.value)}
          >
            {f.label}
            <View className={styles.filterChipCount}>{getFilterCount(f.value)}</View>
          </View>
        ))}
      </ScrollView>

      <ScrollView scrollY style={{ maxHeight: 1000 }}>
        {filteredRecords.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyTitle}>暂无业务记录</Text>
            <Text className={styles.emptyDesc}>前往取号大厅开始办理业务吧～</Text>
          </View>
        ) : (
          <View className={styles.businessList}>
            {filteredRecords.map(record => {
              const steps = STEP_LABELS[record.status];
              return (
                <View key={record.id}>
                  <BusinessCard record={record} onClick={() => handleRecordClick(record)} />
                  <View style={{ marginTop: -8, marginBottom: 24 }}>
                    <View className={styles.progressMini}>
                      {steps.map((step, idx) => (
                        <View
                          key={idx}
                          className={classnames(
                            styles.progressStep,
                            styles[getStepClass(record.status, idx)]
                          )}
                        >
                          {step}
                        </View>
                      ))}
                    </View>
                    <View className={styles.actionRow}>
                      {(record.status === 'queuing' || record.status === 'processing') && (
                        <>
                          <View
                            className={classnames(styles.actionMiniBtn, styles.actionMiniBtnWarn)}
                            onClick={() => handleQuickAction(record, 'cancel')}
                          >
                            取消申请
                          </View>
                          <View
                            className={styles.actionMiniBtn}
                            onClick={() => handleQuickAction(record, 'remind')}
                          >
                            催办
                          </View>
                        </>
                      )}
                      {record.status === 'approving' && (
                        <View
                          className={classnames(styles.actionMiniBtn, styles.actionMiniBtnPrimary)}
                          onClick={() => handleQuickAction(record, 'continue')}
                          style={{ flex: 2 }}
                        >
                          查看审批进度
                        </View>
                      )}
                      {record.status === 'rejected' && (
                        <View
                          className={classnames(styles.actionMiniBtn, styles.actionMiniBtnPrimary)}
                          onClick={() => Taro.showToast({ title: '重新提交开发中', icon: 'none' })}
                          style={{ flex: 2 }}
                        >
                          修改后重新提交
                        </View>
                      )}
                      <View
                        className={classnames(styles.actionMiniBtn, {
                          [styles.actionMiniBtnPrimary]:
                            record.status !== 'queuing' && record.status !== 'processing'
                        })}
                        onClick={() => handleQuickAction(record, 'view')}
                      >
                        查看详情
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default BusinessPage;

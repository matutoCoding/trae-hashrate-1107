import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { businessCategories, businessTypes } from '@/data/businessTypes';
import QueueCard from '@/components/QueueCard';
import classnames from 'classnames';
import type { BusinessType, QueueItem } from '@/types';

type TabType = 'all' | 'waiting' | 'calling' | 'mine';

const QueuePage: React.FC = () => {
  const queueList = useAppStore(s => s.queueList);
  const callNext = useAppStore(s => s.callNext);
  const processPass = useAppStore(s => s.processPass);
  const acceptNumber = useAppStore(s => s.acceptNumber);
  const currentUser = useAppStore(s => s.currentUser);

  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const callingItem = useMemo(
    () => queueList.find(q => q.status === 'calling'),
    [queueList]
  );

  const stats = useMemo(() => {
    const waiting = queueList.filter(q => q.status === 'waiting' || q.status === 'passed').length;
    const processing = queueList.filter(q => q.status === 'processing' || q.status === 'calling').length;
    const completed = queueList.filter(q => q.status === 'completed').length;
    const total = waiting + processing + completed;
    return { waiting, processing, completed, total };
  }, [queueList]);

  const filteredBusinesses = useMemo(() => {
    if (activeCategory === '全部') return businessTypes;
    return businessTypes.filter(b => b.category === activeCategory);
  }, [activeCategory]);

  const filteredQueue = useMemo(() => {
    let list = [...queueList];
    switch (activeTab) {
      case 'waiting':
        list = list.filter(q => q.status === 'waiting' || q.status === 'passed');
        break;
      case 'calling':
        list = list.filter(q => q.status === 'calling' || q.status === 'processing');
        break;
      case 'mine':
        list = list.filter(q => q.phone.slice(-4) === '8001' || q.citizenName === currentUser.name);
        break;
    }
    return list.sort((a, b) => a.position - b.position);
  }, [queueList, activeTab, currentUser]);

  const getWaitCount = (bizId: string) => {
    return queueList.filter(
      q => q.businessTypeId === bizId && (q.status === 'waiting' || q.status === 'passed')
    ).length;
  };

  const handleSelectBusiness = (biz: BusinessType) => {
    console.log('[Queue] 选择业务:', biz.name);
    Taro.navigateTo({
      url: `/pages/queue-confirm/index?bizId=${biz.id}&bizName=${encodeURIComponent(biz.name)}&bizCode=${biz.code}`
    });
  };

  const handleCallNext = () => {
    const called = callNext('A-03');
    if (called) {
      Taro.showToast({
        title: `正在叫号: ${called.ticketNumber}`,
        icon: 'none',
        duration: 2000
      });
    } else {
      Taro.showToast({ title: '暂无排队人员', icon: 'none' });
    }
  };

  const handleAccept = (item: QueueItem) => {
    acceptNumber(item.id);
    Taro.showToast({ title: `已受理 ${item.ticketNumber}`, icon: 'success' });
  };

  const handlePass = (item: QueueItem) => {
    const result = processPass(item.id);
    Taro.showModal({
      title: result.isInvalid ? '号码作废' : '过号处理',
      content: result.message,
      showCancel: false
    });
  };

  const handleCardClick = (item: QueueItem) => {
    if (item.status === 'calling') {
      Taro.showActionSheet({
        itemList: ['确认受理', '标记过号'],
        success: res => {
          if (res.tapIndex === 0) handleAccept(item);
          if (res.tapIndex === 1) handlePass(item);
        }
      });
    }
  };

  return (
    <View className={`pageContainer ${styles.container}`}>
      <View className={styles.statsBanner}>
        <Text className={styles.bannerTitle}>📊 今日排队概览</Text>
        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.total}</Text>
            <Text className={styles.statLabel}>总取号</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.waiting}</Text>
            <Text className={styles.statLabel}>等待中</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.processing}</Text>
            <Text className={styles.statLabel}>办理中</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.completed}</Text>
            <Text className={styles.statLabel}>已完成</Text>
          </View>
        </View>
      </View>

      {callingItem && (
        <View className={styles.callingSection}>
          <View className={styles.callingInfo}>
            <Text className={styles.callingLabel}>🔔 正在叫号</Text>
            <Text className={styles.callingTicket}>{callingItem.ticketNumber}</Text>
          </View>
          <View className={styles.callingWindow}>
            <Text className={styles.windowLabel}>前往窗口</Text>
            <Text className={styles.windowNumber}>{callingItem.windowNumber}</Text>
          </View>
        </View>
      )}

      <View className="sectionTitle">选择业务类型</View>

      <ScrollView scrollX className={styles.categoryTabs}>
        <View
          className={classnames(styles.categoryTab, {
            [styles.categoryTabActive]: activeCategory === '全部'
          })}
          onClick={() => setActiveCategory('全部')}
        >
          全部
        </View>
        {businessCategories.map(cat => (
          <View
            key={cat}
            className={classnames(styles.categoryTab, {
              [styles.categoryTabActive]: activeCategory === cat
            })}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </View>
        ))}
      </ScrollView>

      <View className={styles.businessGrid}>
        {filteredBusinesses.map(biz => (
          <View
            key={biz.id}
            className={styles.businessCard}
            onClick={() => handleSelectBusiness(biz)}
          >
            <Text className={styles.businessIcon}>{biz.icon}</Text>
            <Text className={styles.businessName}>{biz.name}</Text>
            <Text className={styles.businessDesc}>{biz.description}</Text>
            <View className={styles.businessMeta}>
              <Text className={styles.waitCount}>排队 {getWaitCount(biz.id)} 人</Text>
              <Text className={styles.timeEst}>约{biz.estimatedTime}分钟</Text>
            </View>
          </View>
        ))}
      </View>

      <View className={styles.queueListTitle}>
        <Text className="sectionTitle" style={{ marginBottom: 0 }}>排队列表</Text>
      </View>

      <View className={styles.tabs}>
        <View
          className={classnames(styles.tabItem, { [styles.tabActive]: activeTab === 'all' })}
          onClick={() => setActiveTab('all')}
        >
          全部
        </View>
        <View
          className={classnames(styles.tabItem, { [styles.tabActive]: activeTab === 'waiting' })}
          onClick={() => setActiveTab('waiting')}
        >
          等待中
        </View>
        <View
          className={classnames(styles.tabItem, { [styles.tabActive]: activeTab === 'calling' })}
          onClick={() => setActiveTab('calling')}
        >
          叫号中
        </View>
        <View
          className={classnames(styles.tabItem, { [styles.tabActive]: activeTab === 'mine' })}
          onClick={() => setActiveTab('mine')}
        >
          我的
        </View>
      </View>

      <ScrollView scrollY style={{ maxHeight: 800 }}>
        {filteredQueue.length === 0 ? (
          <View className="emptyState">暂无排队记录</View>
        ) : (
          filteredQueue.map(item => (
            <QueueCard
              key={item.id}
              item={item}
              onClick={() => handleCardClick(item)}
            />
          ))
        )}
      </ScrollView>

      <View className={styles.quickActions}>
        <View
          className={classnames(styles.actionBtn, styles.secondaryBtn)}
          onClick={handleCallNext}
        >
          ⏭ 叫下一位
        </View>
        <View
          className={classnames(styles.actionBtn, styles.primaryBtn)}
          onClick={() => {
            Taro.showToast({ title: '请选择上方业务类型', icon: 'none' });
          }}
        >
          🎫 立即取号
        </View>
      </View>
    </View>
  );
};

export default QueuePage;

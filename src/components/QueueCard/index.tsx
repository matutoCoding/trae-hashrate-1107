import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import type { QueueItem } from '@/types';
import { getStatusLabel } from '@/utils/queueManager';

interface QueueCardProps {
  item: QueueItem;
  onClick?: () => void;
  showActions?: boolean;
}

const getStatusClass = (status: QueueItem['status']) => {
  const map: Record<QueueItem['status'], string> = {
    waiting: 'statusWaiting',
    calling: 'statusCalling',
    processing: 'statusProcessing',
    passed: 'statusPassed',
    completed: 'statusCompleted',
    invalid: 'statusInvalid'
  };
  return map[status];
};

const QueueCard: React.FC<QueueCardProps> = ({ item, onClick, showActions = true }) => {
  return (
    <View className={styles.card} onClick={onClick}>
      <View className={styles.cardHeader}>
        <View className={styles.ticketBlock}>
          <Text className={styles.ticketNumber}>{item.ticketNumber}</Text>
          <Text className={`${styles.statusTag} ${styles[getStatusClass(item.status)]}`}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
        <View className={styles.infoBlock}>
          <Text className={styles.bizName}>{item.businessTypeName}</Text>
          <Text className={styles.citizenInfo}>
            {item.citizenName} · {item.phone.slice(0, 3)}****{item.phone.slice(7)}
          </Text>
        </View>
      </View>

      <View className={styles.cardBody}>
        {item.status === 'waiting' && (
          <>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>排队位置</Text>
              <Text className={styles.infoValueHighlight}>第 {item.position} 位</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>预计等待</Text>
              <Text className={styles.infoValue}>{item.estimatedWaitTime} 分钟</Text>
            </View>
          </>
        )}

        {item.status === 'calling' && (
          <View className={styles.callingBlock}>
            <Text className={styles.windowTag}>请前往</Text>
            <Text className={styles.windowNumber}>{item.windowNumber}</Text>
            <Text className={styles.windowTag}>窗口</Text>
          </View>
        )}

        {item.status === 'processing' && (
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>办理窗口</Text>
            <Text className={styles.infoValue}>{item.windowNumber}</Text>
          </View>
        )}

        {item.status === 'passed' && (
          <View className={styles.passedInfo}>
            <Text className={styles.passCount}>
              ⚠️ 已过号 {item.passCount}/{item.maxPassCount} 次
            </Text>
            <Text className={styles.requeueInfo}>
              重排至第 {item.position} 位，连续过号 {item.maxPassCount} 次将作废
            </Text>
          </View>
        )}

        {item.status === 'invalid' && (
          <View className={styles.invalidInfo}>
            <Text className={styles.invalidText}>
              ❌ 已连续过号 {item.passCount} 次，号码已自动作废
            </Text>
          </View>
        )}

        {item.status === 'completed' && (
          <View className={styles.completedInfo}>
            <Text className={styles.completedText}>✅ 业务办理完成</Text>
          </View>
        )}
      </View>

      {item.passCount > 0 && item.status !== 'invalid' && item.status !== 'passed' && (
        <View className={styles.passWarning}>
          <Text className={styles.passWarningText}>
            历史过号 {item.passCount} 次（累计 {item.maxPassCount} 次作废）
          </Text>
        </View>
      )}
    </View>
  );
};

export default QueueCard;

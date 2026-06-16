import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import type { BusinessRecord } from '@/types';
import classnames from 'classnames';

interface BusinessCardProps {
  record: BusinessRecord;
  onClick?: () => void;
}

const statusConfig: Record<BusinessRecord['status'], { label: string; className: string }> = {
  draft: { label: '草稿', className: 'statusDraft' },
  queuing: { label: '排队中', className: 'statusQueuing' },
  processing: { label: '办理中', className: 'statusProcessing' },
  approving: { label: '审批中', className: 'statusApproving' },
  completed: { label: '已完成', className: 'statusCompleted' },
  rejected: { label: '已驳回', className: 'statusRejected' }
};

const BusinessCard: React.FC<BusinessCardProps> = ({ record, onClick }) => {
  const status = statusConfig[record.status];
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <View className={styles.card} onClick={onClick}>
      <View className={styles.cardHeader}>
        <View className={styles.titleBlock}>
          <Text className={styles.bizName}>{record.businessTypeName}</Text>
          <Text className={classnames(styles.statusTag, styles[status.className])}>
            {status.label}
          </Text>
        </View>
        {record.ticketNumber && (
          <Text className={styles.ticketNum}>取号: {record.ticketNumber}</Text>
        )}
      </View>

      <View className={styles.cardBody}>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>申请人</Text>
          <Text className={styles.infoValue}>{record.applicantName}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>联系电话</Text>
          <Text className={styles.infoValue}>
            {record.phone.slice(0, 3)}****{record.phone.slice(7)}
          </Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>申请时间</Text>
          <Text className={styles.infoValue}>{formatTime(record.createTime)}</Text>
        </View>
      </View>

      {record.remark && (
        <View className={styles.remarkBlock}>
          <Text className={styles.remarkLabel}>备注:</Text>
          <Text className={styles.remarkText}>{record.remark}</Text>
        </View>
      )}

      <View className={styles.cardFooter}>
        <Text className={styles.materialsCount}>
          已提交 {record.materials.length} 份材料
        </Text>
        <Text className={styles.detailLink}>查看详情 →</Text>
      </View>
    </View>
  );
};

export default BusinessCard;

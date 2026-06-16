import React, { useState, useEffect } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import { businessTypes } from '@/data/businessTypes';
import classnames from 'classnames';
import type { BusinessType } from '@/types';

const QueueConfirmPage: React.FC = () => {
  const router = useRouter();
  const addQueueItem = useAppStore(s => s.addQueueItem);
  const addBusinessRecord = useAppStore(s => s.addBusinessRecord);
  const queueList = useAppStore(s => s.queueList);
  const approvalChainConfigs = useAppStore(s => s.approvalChainConfigs);

  const { bizId, bizName, bizCode } = router.params;
  const decodedBizName = bizName ? decodeURIComponent(bizName) : '';
  const [business, setBusiness] = useState<BusinessType | null>(null);
  const [citizenName, setCitizenName] = useState('');
  const [citizenId, setCitizenId] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const biz = businessTypes.find(b => b.id === bizId);
    if (biz) {
      setBusiness(biz);
    }
  }, [bizId]);

  const currentWaitCount = queueList.filter(
    q => q.businessTypeId === bizId && (q.status === 'waiting' || q.status === 'passed' || q.status === 'calling')
  ).length;

  const validateForm = (): string | null => {
    const nameVal = citizenName.trim();
    if (!nameVal) return '请输入姓名';
    if (nameVal.length < 2) return '姓名至少2个字符';
    if (!/^[\u4e00-\u9fa5a-zA-Z·]+$/.test(nameVal)) return '姓名只能包含中文、英文或·';
    if (!/^\d{17}[\dXx]$/.test(citizenId.trim())) return '请输入正确的18位身份证号';
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) return '请输入正确的11位手机号';
    return null;
  };

  const handleSubmit = () => {
    const error = validateForm();
    if (error) {
      Taro.showToast({ title: error, icon: 'none', duration: 2000 });
      return;
    }

    if (!bizId) {
      Taro.showToast({ title: '业务信息异常，请返回重试', icon: 'none' });
      return;
    }

    setSubmitting(true);

    try {
      const queueItem = addQueueItem(bizId!, citizenName.trim(), citizenId.trim(), phone.trim());

      if (queueItem) {
        const chainConfig = approvalChainConfigs.find(c => c.businessTypeId === bizId);
        addBusinessRecord({
          businessTypeId: bizId!,
          businessTypeName: decodedBizName || queueItem.businessTypeName,
          queueId: queueItem.id,
          ticketNumber: queueItem.ticketNumber,
          applicantName: citizenName.trim(),
          applicantId: citizenId.trim(),
          phone: phone.trim(),
          status: 'queuing',
          formData: {},
          materials: [],
          approvalChainId: chainConfig?.id
        });

        console.log('[QueueConfirm] 取号成功', queueItem);

        Taro.showToast({ title: '取号成功！', icon: 'success', duration: 1500 });
        setTimeout(() => {
          Taro.switchTab({ url: '/pages/queue/index' });
        }, 1200);
      } else {
        Taro.showToast({ title: '取号失败，请重试', icon: 'none' });
      }
    } catch (err) {
      console.error('[QueueConfirm] 取号失败:', err);
      Taro.showToast({ title: '取号失败，请重试', icon: 'none', duration: 2000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (!business) {
    return (
      <View className={`pageContainer ${styles.container}`}>
        <View className="emptyState">加载中...</View>
      </View>
    );
  }

  return (
    <View className={`pageContainer ${styles.container}`}>
      <View className={styles.businessInfoCard}>
        <Text className={styles.bizIcon}>{business.icon}</Text>
        <Text className={styles.bizName}>{business.name}</Text>
        <Text className={styles.bizCategory}>📂 {business.category}</Text>
        <Text className={styles.bizDesc}>{business.description}</Text>
        <View className={styles.estimatedInfo}>
          <View className={styles.estItem}>
            <Text className={styles.estValue}>{currentWaitCount}</Text>
            <Text className={styles.estLabel}>前方等待</Text>
          </View>
          <View className={styles.estItem}>
            <Text className={styles.estValue}>{business.estimatedTime}</Text>
            <Text className={styles.estLabel}>预计时长(分)</Text>
          </View>
          <View className={styles.estItem}>
            <Text className={styles.estValue}>{business.requireApproval ? '需要' : '无需'}</Text>
            <Text className={styles.estLabel}>审批</Text>
          </View>
        </View>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formTitle}>📝 个人信息</Text>

        <View className={styles.formItem}>
          <Text className={styles.formLabel}>姓名</Text>
          <View className={classnames(styles.formInput, citizenName && styles.formInputActive)}>
            <Input
              placeholder="请输入您的姓名"
              value={citizenName}
              onInput={e => setCitizenName(e.detail.value)}
              maxlength={20}
            />
          </View>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.formLabel}>身份证号</Text>
          <View className={classnames(styles.formInput, citizenId && styles.formInputActive)}>
            <Input
              placeholder="请输入18位身份证号"
              value={citizenId}
              onInput={e => setCitizenId(e.detail.value.toUpperCase())}
              maxlength={18}
            />
          </View>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.formLabel}>手机号码</Text>
          <View className={classnames(styles.formInput, phone && styles.formInputActive)}>
            <Input
              type="number"
              placeholder="请输入11位手机号"
              value={phone}
              onInput={e => setPhone(e.detail.value)}
              maxlength={11}
            />
          </View>
        </View>
      </View>

      <View className={styles.noticeCard}>
        <Text className={styles.noticeTitle}>⚠️ 取号须知</Text>
        <View className={styles.noticeList}>
          <Text className={styles.noticeItem}>1. 请保持手机畅通，叫号后将通过短信提醒</Text>
          <Text className={styles.noticeItem}>2. 叫号后请在2分钟内前往指定窗口，超时将视为过号</Text>
          <Text className={styles.noticeItem}>3. 连续过号3次将自动作废，需重新取号</Text>
          <Text className={styles.noticeItem}>4. 请携带本人身份证及相关材料原件</Text>
        </View>
      </View>

      <View style={{ height: 160 }} />

      <View className={styles.actionBar}>
        <View className={styles.cancelBtn} onClick={() => Taro.navigateBack()}>
          取消
        </View>
        <View
          className={styles.submitBtn}
          onClick={handleSubmit}
        >
          {submitting ? '提交中...' : '🎫 确认取号'}
        </View>
      </View>
    </View>
  );
};

export default QueueConfirmPage;

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import ApprovalChain from '@/components/ApprovalChain';
import type { BusinessRecord, ApprovalInstance } from '@/types';
import classnames from 'classnames';

const STATUS_LABEL: Record<BusinessRecord['status'], string> = {
  draft: '草稿',
  queuing: '排队等待中',
  processing: '窗口办理中',
  approving: '审批流转中',
  completed: '办理完成',
  rejected: '申请已驳回'
};

interface TimelineStep {
  title: string;
  time: string;
  desc: string;
  type: 'done' | 'current' | 'warn' | 'error' | 'pending';
  remark?: string;
}

const BusinessDetailPage: React.FC = () => {
  const router = useRouter();
  const { bizId } = router.params;

  const businessRecords = useAppStore(s => s.businessRecords);
  const approvalInstances = useAppStore(s => s.approvalInstances);
  const approvalChainConfigs = useAppStore(s => s.approvalChainConfigs);
  const queueList = useAppStore(s => s.queueList);
  const addMaterialToBusiness = useAppStore(s => s.addMaterialToBusiness);

  const [record, setRecord] = useState<BusinessRecord | null>(null);
  const [instance, setInstance] = useState<ApprovalInstance | null>(null);

  useEffect(() => {
    const found = businessRecords.find(b => b.id === bizId);
    if (found) {
      setRecord(found);
      const foundInstance = approvalInstances.find(i => i.businessId === found.id);
      if (foundInstance) setInstance(foundInstance);
    }
    console.log('[BusinessDetail] 加载业务:', bizId, found);
  }, [bizId, businessRecords, approvalInstances]);

  const chainConfig = record?.approvalChainId
    ? approvalChainConfigs.find(c => c.id === record.approvalChainId)
    : null;

  const queueInfo = record?.queueId ? queueList.find(q => q.id === record.queueId) : null;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const buildTimeline = (): TimelineStep[] => {
    if (!record) return [];
    const steps: TimelineStep[] = [];

    steps.push({
      title: '提交申请',
      time: formatTime(record.createTime),
      desc: `业务「${record.businessTypeName}」申请已提交`,
      type: 'done'
    });

    if (record.queueId || record.ticketNumber) {
      if (queueInfo?.callTime) {
        steps.push({
          title: '叫号受理',
          time: formatTime(queueInfo.callTime),
          desc: `号码 ${record.ticketNumber} 已在 ${queueInfo.windowNumber} 窗口叫号`,
          type: queueInfo.status === 'processing' || queueInfo.status === 'completed' ? 'done' : 'current'
        });
        if (queueInfo.status === 'completed' || record.status !== 'queuing') {
          steps.push({
            title: '窗口办理完成',
            time: formatTime(queueInfo.completeTime || record.updateTime),
            desc: '窗口工作人员已完成材料核验与业务录入',
            type: 'done'
          });
        }
      } else {
        steps.push({
          title: '排队中',
          time: formatTime(record.createTime),
          desc: `号码 ${record.ticketNumber}，前方等待中`,
          type: record.status === 'queuing' ? 'current' : 'done'
        });
      }
    }

    if (instance && instance.approvalHistory.length > 0) {
      instance.approvalHistory.forEach(h => {
        if (h.action === 'route') {
          steps.push({
            title: '条件路由判断',
            time: formatTime(h.time),
            desc: `${h.nodeName} · 系统根据条件自动选择分支`,
            type: 'done'
          });
        } else {
          steps.push({
            title: `${h.nodeName} - ${h.action === 'approve' ? '审批通过' : '审批驳回'}`,
            time: formatTime(h.time),
            desc: h.approverName ? `处理人：${h.approverName}` : '系统处理',
            type: h.action === 'approve' ? 'done' : 'error',
            remark: h.comment
          });
        }
      });
      if (instance.status === 'processing' && instance.currentNodeId) {
        const chain = chainConfig;
        const currentNode = chain?.nodes.find(n => n.id === instance.currentNodeId);
        steps.push({
          title: `${currentNode?.name || '审批节点'} · 审批中`,
          time: formatTime(record.updateTime),
          desc: '等待审批人处理',
          type: 'current'
        });
      }
    } else if (record.status === 'approving') {
      steps.push({
        title: '审批中',
        time: formatTime(record.updateTime),
        desc: '业务正在按审批链进行审批，请耐心等待',
        type: 'current'
      });
    }

    if (record.status === 'completed') {
      steps.push({
        title: '办理完成',
        time: formatTime(record.completeTime || record.updateTime),
        desc: instance?.status === 'approved' ? '所有审批节点已通过，业务办理完成' : (record.remark || '所有流程已完成'),
        type: 'done'
      });
    }

    if (record.status === 'rejected') {
      steps.push({
        title: '申请被驳回',
        time: formatTime(record.completeTime || record.updateTime),
        desc: '申请未能通过审核',
        type: 'error',
        remark: record.remark
      });
    }

    return steps;
  };

  const getTimelineDotClass = (type: TimelineStep['type']) => {
    const map: Record<string, string> = {
      done: 'timelineDotDone',
      current: '',
      warn: 'timelineDotWarn',
      error: 'timelineDotError',
      pending: ''
    };
    return map[type] || '';
  };

  const MATERIAL_OPTIONS = [
    '身份证正反面',
    '户口簿',
    '居住证明',
    '婚姻证明',
    '收入证明',
    '银行流水',
    '购房合同',
    '租赁合同',
    '营业执照',
    '公司章程',
    '税务登记证',
    '医疗发票',
    '诊断证明',
    '出院小结',
    '不动产证',
    '贷款合同',
    '首付款发票',
    '契税完税证明',
    '其他材料'
  ];

  const handleAction = (action: string) => {
    console.log('[BusinessDetail] 操作:', action);
    switch (action) {
      case 'approval':
        if (chainConfig) {
          Taro.navigateTo({
            url: `/pages/approval-visual/index?chainId=${chainConfig.id}&businessId=${record?.id}&instanceId=${instance?.id || ''}`
          });
        }
        break;
      case 'material':
        if (!record) return;
        Taro.showActionSheet({
          itemList: MATERIAL_OPTIONS.filter(m => !record.materials.includes(m)),
          success: res => {
            const selectedMaterial = MATERIAL_OPTIONS.filter(m => !record.materials.includes(m))[res.tapIndex];
            if (selectedMaterial) {
              addMaterialToBusiness(record.id, selectedMaterial);
              Taro.showToast({ title: `已添加「${selectedMaterial}」`, icon: 'success' });
              console.log('[BusinessDetail] 添加材料:', record.id, selectedMaterial);
            }
          },
          fail: () => {}
        });
        break;
      case 'contact':
        Taro.showToast({ title: '正在呼叫工作人员...', icon: 'none' });
        break;
      case 'cancel':
        Taro.showModal({
          title: '取消申请',
          content: '确定要取消此业务申请吗？取号将作废。',
          confirmColor: '#F53F3F',
          success: res => {
            if (res.confirm) {
              Taro.showToast({ title: '已取消', icon: 'success' });
              setTimeout(() => Taro.navigateBack(), 800);
            }
          }
        });
        break;
    }
  };

  if (!record) {
    return (
      <View className={`pageContainer ${styles.container}`}>
        <View className="emptyState">加载中...</View>
      </View>
    );
  }

  const timeline = buildTimeline();

  return (
    <View className={`pageContainer ${styles.container}`}>
      <View className={styles.statusBanner}>
        <Text className={styles.bannerBizName}>📋 {record.businessTypeName}</Text>
        <View className={styles.bannerStatus}>{STATUS_LABEL[record.status]}</View>

        <View className={styles.ticketBlock}>
          <View>
            <Text className={styles.ticketLabel}>取号码</Text>
            <Text className={styles.ticketNumber}>{record.ticketNumber || '—'}</Text>
          </View>
          <View className={styles.ticketMeta}>
            <Text className={styles.ticketLabel}>受理窗口</Text>
            <Text className={styles.ticketValue}>{queueInfo?.windowNumber || '待分配'}</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>👤 申请人信息</Text>
        <View className={styles.infoGrid}>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>姓名</Text>
            <Text className={styles.infoValue}>{record.applicantName}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>联系电话</Text>
            <Text className={styles.infoValue}>
              {record.phone.slice(0, 3)}****{record.phone.slice(7)}
            </Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>申请时间</Text>
            <Text className={styles.infoValue}>{formatTime(record.createTime)}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>更新时间</Text>
            <Text className={styles.infoValue}>{formatTime(record.updateTime)}</Text>
          </View>
        </View>
      </View>

      {Object.entries(record.formData).length > 0 && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>📝 业务表单</Text>
          {Object.entries(record.formData).map(([key, value]) => (
            <View key={key} className={styles.formItem}>
              <Text className={styles.formLabel}>{key}</Text>
              <Text className={styles.formValue}>
                {Array.isArray(value) ? value.join('、') : String(value)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>📎 提交材料（{record.materials.length}份）</Text>
        <View className={styles.materialList}>
          {record.materials.map((m, idx) => (
            <View key={idx} className={styles.materialItem}>
              <Text className={styles.materialIcon}>📄</Text>
              <Text className={styles.materialName}>{m}</Text>
            </View>
          ))}
          <View
            className={classnames(styles.materialItem, styles.materialAdd)}
            onClick={() => handleAction('material')}
          >
            <Text className={styles.materialIcon}>➕</Text>
            <Text className={styles.materialName}>添加材料</Text>
          </View>
        </View>
      </View>

      {chainConfig && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>🔗 审批流程</Text>
          <View style={{ margin: '0 -24rpx', overflow: 'hidden' }}>
            <ApprovalChain
              config={chainConfig}
              currentNodeId={instance?.currentNodeId}
              approvalHistory={instance?.approvalHistory || []}
            />
          </View>
          <View
            style={{
              marginTop: 24,
              padding: 16,
              background: '#F0F5FF',
              borderRadius: 12,
              textAlign: 'center',
              color: '#1E6FFF',
              fontSize: 24,
              fontWeight: 500
            }}
            onClick={() => handleAction('approval')}
          >
            📊 查看完整审批流程图 →
          </View>
        </View>
      )}

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>📜 办理进度时间线</Text>
        <View className={styles.timelineSection}>
          <View className={styles.timeline}>
            {timeline.map((step, idx) => (
              <View key={idx} className={styles.timelineItem}>
                <View className={classnames(styles.timelineDot, styles[getTimelineDotClass(step.type)])} />
                <View className={styles.timelineContent}>
                  <View className={styles.timelineTitle}>
                    <Text>{step.title}</Text>
                    <Text className={styles.timelineTime}>{step.time}</Text>
                  </View>
                  <Text className={styles.timelineDesc}>{step.desc}</Text>
                  {step.remark && step.type === 'error' ? (
                    <View className={styles.timelineRemarkReject}>💬 驳回原因：{step.remark}</View>
                  ) : step.remark ? (
                    <View className={styles.timelineRemark}>💬 备注：{step.remark}</View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        {(record.status === 'queuing' || record.status === 'processing') && (
          <View
            className={classnames(styles.barBtn, styles.barBtnWarn)}
            onClick={() => handleAction('cancel')}
          >
            取消申请
          </View>
        )}
        <View
          className={classnames(styles.barBtn, styles.barBtnSecondary)}
          onClick={() => handleAction('contact')}
        >
          联系窗口
        </View>
        <View
          className={classnames(styles.barBtn, styles.barBtnPrimary)}
          onClick={() => handleAction(chainConfig ? 'approval' : 'material')}
        >
          {chainConfig ? '查看审批' : '补充材料'}
        </View>
      </View>
    </View>
  );
};

export default BusinessDetailPage;

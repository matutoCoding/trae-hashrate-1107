import { create } from 'zustand';
import type {
  QueueItem,
  BusinessRecord,
  ApprovalInstance,
  ApprovalChainConfig,
  ApprovalTodoItem,
  BusinessType,
  CallRecord,
  ApprovalNodeConfig
} from '@/types';
import { businessTypes } from '@/data/businessTypes';
import { initialQueueList, callRecords as initialCallRecords } from '@/data/queueData';
import {
  businessRecords as initialBizRecords,
  approvalInstances as initialInstances,
  approvalTodoList as initialTodoList
} from '@/data/businessData';
import { approvalChainConfigs, findNodeById } from '@/data/approvalConfig';
import { advanceAfterApproval } from '@/utils/approvalRouter';
import {
  createQueueItem,
  handlePass,
  callNextNumber,
  acceptCall,
  completeService,
  DEFAULT_CONFIG
} from '@/utils/queueManager';

interface AppState {
  businessTypes: BusinessType[];
  queueList: QueueItem[];
  callRecords: CallRecord[];
  businessRecords: BusinessRecord[];
  approvalInstances: ApprovalInstance[];
  approvalChainConfigs: ApprovalChainConfig[];
  approvalTodoList: ApprovalTodoItem[];
  systemConfig: typeof DEFAULT_CONFIG;
  currentUser: { name: string; id: string; role: string };

  addQueueItem: (
    businessTypeId: string,
    citizenName: string,
    citizenId: string,
    phone: string
  ) => QueueItem | null;
  processPass: (queueId: string) => { success: boolean; message: string; isInvalid: boolean };
  invalidateQueueItem: (queueId: string) => void;
  callNext: (windowNumber: string) => QueueItem | null;
  acceptNumber: (queueId: string) => void;
  completeNumber: (queueId: string) => void;

  addBusinessRecord: (record: Omit<BusinessRecord, 'id' | 'createTime' | 'updateTime'>) => void;
  updateBusinessStatus: (
    businessId: string,
    status: BusinessRecord['status'],
    remark?: string
  ) => void;
  addMaterialToBusiness: (businessId: string, materialName: string) => void;
  updateApprovalChainConfig: (chainId: string, nodes: ApprovalChainConfig['nodes']) => void;
  approveNode: (
    instanceId: string,
    nodeId: string,
    approverId: string,
    approverName: string,
    comment?: string
  ) => void;
  rejectNode: (
    instanceId: string,
    nodeId: string,
    approverId: string,
    approverName: string,
    comment?: string
  ) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  businessTypes,
  queueList: initialQueueList,
  callRecords: initialCallRecords,
  businessRecords: initialBizRecords,
  approvalInstances: initialInstances,
  approvalChainConfigs,
  approvalTodoList: initialTodoList,
  systemConfig: DEFAULT_CONFIG,
  currentUser: { name: '当前用户', id: 'u_001', role: 'admin' },

  addQueueItem: (businessTypeId, citizenName, citizenId, phone) => {
    const bizType = get().businessTypes.find(b => b.id === businessTypeId);
    if (!bizType) return null;

    const newItem = createQueueItem(
      businessTypeId,
      bizType.name,
      bizType.code,
      citizenName,
      citizenId,
      phone,
      get().queueList
    );

    set(state => ({ queueList: [...state.queueList, newItem] }));
    console.log('[Queue] 新增取号:', newItem.ticketNumber, newItem);
    return newItem;
  },

  processPass: queueId => {
    const queueList = get().queueList;
    const item = queueList.find(q => q.id === queueId);
    if (!item) {
      return { success: false, message: '未找到该号码', isInvalid: false };
    }

    const { updatedList, isInvalid, message } = handlePass(queueList, item);
    const passOrder = item.passCount + 1;

    set(state => ({
      queueList: updatedList,
      callRecords: [
        ...state.callRecords,
        {
          id: `cr_${Date.now()}`,
          queueId: item.id,
          ticketNumber: item.ticketNumber,
          callTime: new Date().toISOString(),
          windowNumber: item.windowNumber || '',
          isPassed: true,
          passOrder
        }
      ]
    }));

    console.log('[Queue] 过号处理:', queueId, message);
    return { success: true, message, isInvalid };
  },

  invalidateQueueItem: queueId => {
    const queueList = get().queueList;
    const item = queueList.find(q => q.id === queueId);
    if (!item) return;

    const remaining = item.maxPassCount - item.passCount;
    const forcedPassCount = item.maxPassCount;

    set(state => ({
      queueList: state.queueList.map(q =>
        q.id === queueId
          ? { ...q, status: 'invalid' as const, passCount: forcedPassCount }
          : q
      ),
      callRecords: [
        ...state.callRecords,
        ...Array.from({ length: remaining }).map((_, i) => ({
          id: `cr_inv_${Date.now()}_${i}`,
          queueId: item.id,
          ticketNumber: item.ticketNumber,
          callTime: new Date().toISOString(),
          windowNumber: item.windowNumber || '系统',
          isPassed: true,
          passOrder: item.passCount + i + 1
        }))
      ]
    }));

    console.log('[Queue] 强制作废:', queueId, `补齐${remaining}次过号记录，总过号${forcedPassCount}次`);
  },

  callNext: windowNumber => {
    const { updatedList, calledItem } = callNextNumber(get().queueList, windowNumber);

    if (calledItem) {
      set({ queueList: updatedList });
      set(state => ({
        callRecords: [
          ...state.callRecords,
          {
            id: `cr_${Date.now()}`,
            queueId: calledItem.id,
            ticketNumber: calledItem.ticketNumber,
            callTime: new Date().toISOString(),
            windowNumber,
            isPassed: false
          }
        ]
      }));
      console.log('[Queue] 叫号:', calledItem.ticketNumber, windowNumber);
    }

    return calledItem;
  },

  acceptNumber: queueId => {
    const item = get().queueList.find(q => q.id === queueId);
    if (!item) return;
    set({ queueList: acceptCall(get().queueList, item) });
    console.log('[Queue] 受理号码:', item.ticketNumber);
  },

  completeNumber: queueId => {
    const item = get().queueList.find(q => q.id === queueId);
    if (!item) return;
    set({ queueList: completeService(get().queueList, item) });
    console.log('[Queue] 完成办理:', item.ticketNumber);
  },

  addBusinessRecord: record => {
    const newRecord: BusinessRecord = {
      ...record,
      id: `biz_rec_${Date.now()}`,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };
    set(state => ({ businessRecords: [...state.businessRecords, newRecord] }));
    console.log('[Business] 新增业务:', newRecord.id);
  },

  updateBusinessStatus: (businessId, status, remark) => {
    set(state => ({
      businessRecords: state.businessRecords.map(br =>
        br.id === businessId
          ? {
              ...br,
              status,
              updateTime: new Date().toISOString(),
              ...(status === 'completed' || status === 'rejected'
                ? { completeTime: new Date().toISOString() }
                : {}),
              ...(remark ? { remark } : {})
            }
          : br
      )
    }));
    console.log('[Business] 更新状态:', businessId, status);
  },

  addMaterialToBusiness: (businessId, materialName) => {
    set(state => ({
      businessRecords: state.businessRecords.map(br =>
        br.id === businessId
          ? {
              ...br,
              materials: [...br.materials, materialName],
              updateTime: new Date().toISOString()
            }
          : br
      )
    }));
    console.log('[Business] 添加材料:', businessId, materialName);
  },

  updateApprovalChainConfig: (chainId, nodes) => {
    set(state => ({
      approvalChainConfigs: state.approvalChainConfigs.map(cfg =>
        cfg.id === chainId
          ? { ...cfg, nodes, updateTime: new Date().toISOString(), version: cfg.version + 1 }
          : cfg
      )
    }));
    console.log('[Approval] 更新审批链配置:', chainId);
  },

  approveNode: (instanceId, nodeId, approverId, approverName, comment) => {
    const now = new Date().toISOString();
    const instance = get().approvalInstances.find(i => i.id === instanceId);
    if (!instance) {
      console.error('[Approval] 实例不存在:', instanceId);
      return;
    }

    const chainConfig = get().approvalChainConfigs.find(c => c.id === instance.chainConfigId);
    if (!chainConfig) {
      console.error('[Approval] 审批链不存在:', instance.chainConfigId);
      return;
    }

    const currentNode = findNodeById(chainConfig, nodeId);
    const nodeName = currentNode?.name || nodeId;

    const newHistoryRecord = {
      nodeId,
      nodeName,
      approverId,
      approverName,
      action: 'approve' as const,
      comment,
      time: now
    };

    const business = get().businessRecords.find(b => b.id === instance.businessId);
    const formData = business?.formData || {};

    const routeResult = advanceAfterApproval(chainConfig, nodeId, true, formData);

    let updatedInstance: Partial<ApprovalInstance>;
    let todoUpdates: ApprovalTodoItem[] = [];
    let businessStatusUpdate: { id: string; status: BusinessRecord['status']; remark?: string } | null = null;

    if (routeResult.isEnd || !routeResult.nextNodeId) {
      updatedInstance = {
        status: 'approved',
        currentNodeId: '',
        completeTime: now,
        approvalHistory: [...instance.approvalHistory, newHistoryRecord]
      };
      if (instance.businessId) {
        businessStatusUpdate = { id: instance.businessId, status: 'completed' };
      }
      console.log('[Approval] 流程结束，审批通过');
    } else {
      const nextNode = findNodeById(chainConfig, routeResult.nextNodeId);
      updatedInstance = {
        status: 'processing',
        currentNodeId: routeResult.nextNodeId,
        approvalHistory: [...instance.approvalHistory, newHistoryRecord]
      };

      if (nextNode && nextNode.type === 'approval') {
        todoUpdates = [
          {
            id: `todo_${Date.now()}`,
            instanceId,
            businessId: instance.businessId,
            businessTypeName: chainConfig.businessTypeName,
            applicantName: business?.applicantName || '',
            nodeId: nextNode.id,
            nodeName: nextNode.name,
            createTime: now,
            priority: (nextNode.level && nextNode.level >= 3) ? 'high' : 'medium'
          }
        ];
      }

      if (instance.businessId) {
        businessStatusUpdate = { id: instance.businessId, status: 'approving' };
      }
      console.log('[Approval] 推进到下一节点:', routeResult.nextNodeId, nextNode?.name);
    }

    set(state => ({
      approvalInstances: state.approvalInstances.map(inst =>
        inst.id === instanceId ? { ...inst, ...updatedInstance } : inst
      ),
      approvalTodoList: [
        ...state.approvalTodoList.filter(t => t.instanceId !== instanceId),
        ...todoUpdates
      ],
      businessRecords: businessStatusUpdate
        ? state.businessRecords.map(br =>
            br.id === businessStatusUpdate!.id
              ? {
                  ...br,
                  status: businessStatusUpdate!.status,
                  updateTime: new Date().toISOString(),
                  ...(businessStatusUpdate!.status === 'completed'
                    ? { completeTime: new Date().toISOString() }
                    : {})
                }
              : br
          )
        : state.businessRecords
    }));
  },

  rejectNode: (instanceId, nodeId, approverId, approverName, comment) => {
    const now = new Date().toISOString();
    const instance = get().approvalInstances.find(i => i.id === instanceId);
    if (!instance) {
      console.error('[Approval] 实例不存在:', instanceId);
      return;
    }

    const chainConfig = get().approvalChainConfigs.find(c => c.id === instance.chainConfigId);
    const currentNode = chainConfig ? findNodeById(chainConfig, nodeId) : null;
    const nodeName = currentNode?.name || nodeId;

    set(state => ({
      approvalInstances: state.approvalInstances.map(inst =>
        inst.id === instanceId
          ? {
              ...inst,
              status: 'rejected',
              completeTime: now,
              currentNodeId: '',
              approvalHistory: [
                ...inst.approvalHistory,
                {
                  nodeId,
                  nodeName,
                  approverId,
                  approverName,
                  action: 'reject' as const,
                  comment,
                  time: now
                }
              ]
            }
          : inst
      ),
      approvalTodoList: state.approvalTodoList.filter(t => t.instanceId !== instanceId),
      businessRecords: state.businessRecords.map(br =>
        br.id === instance.businessId
          ? {
              ...br,
              status: 'rejected',
              remark: comment || '审批被驳回',
              updateTime: now,
              completeTime: now
            }
          : br
      )
    }));

    console.log('[Approval] 审批拒绝:', instanceId, nodeId, comment);
  }
}));

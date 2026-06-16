import { create } from 'zustand';
import type {
  QueueItem,
  BusinessRecord,
  ApprovalInstance,
  ApprovalChainConfig,
  ApprovalTodoItem,
  BusinessType,
  CallRecord
} from '@/types';
import { businessTypes } from '@/data/businessTypes';
import { initialQueueList, callRecords as initialCallRecords } from '@/data/queueData';
import {
  businessRecords as initialBizRecords,
  approvalInstances as initialInstances,
  approvalTodoList as initialTodoList
} from '@/data/businessData';
import { approvalChainConfigs } from '@/data/approvalConfig';
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
  callNext: (windowNumber: string) => QueueItem | null;
  acceptNumber: (queueId: string) => void;
  completeNumber: (queueId: string) => void;

  addBusinessRecord: (record: Omit<BusinessRecord, 'id' | 'createTime' | 'updateTime'>) => void;
  updateBusinessStatus: (
    businessId: string,
    status: BusinessRecord['status'],
    remark?: string
  ) => void;
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
    set({ queueList: updatedList });

    set(state => ({
      callRecords: [
        ...state.callRecords,
        {
          id: `cr_${Date.now()}`,
          queueId: item.id,
          ticketNumber: item.ticketNumber,
          callTime: new Date().toISOString(),
          windowNumber: item.windowNumber || '',
          isPassed: true,
          passOrder: item.passCount + 1
        }
      ]
    }));

    console.log('[Queue] 过号处理:', queueId, message);
    return { success: true, message, isInvalid };
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
    set(state => ({
      approvalInstances: state.approvalInstances.map(inst =>
        inst.id === instanceId
          ? {
              ...inst,
              approvalHistory: [
                ...inst.approvalHistory,
                {
                  nodeId,
                  nodeName:
                    state.approvalChainConfigs
                      .find(c => c.id === inst.chainConfigId)
                      ?.nodes.find(n => n.id === nodeId)?.name || nodeId,
                  approverId,
                  approverName,
                  action: 'approve',
                  comment,
                  time: now
                }
              ]
            }
          : inst
      )
    }));
    console.log('[Approval] 审批通过:', instanceId, nodeId);
  },

  rejectNode: (instanceId, nodeId, approverId, approverName, comment) => {
    const now = new Date().toISOString();
    set(state => ({
      approvalInstances: state.approvalInstances.map(inst =>
        inst.id === instanceId
          ? {
              ...inst,
              status: 'rejected',
              completeTime: now,
              approvalHistory: [
                ...inst.approvalHistory,
                {
                  nodeId,
                  nodeName:
                    state.approvalChainConfigs
                      .find(c => c.id === inst.chainConfigId)
                      ?.nodes.find(n => n.id === nodeId)?.name || nodeId,
                  approverId,
                  approverName,
                  action: 'reject',
                  comment,
                  time: now
                }
              ]
            }
          : inst
      )
    }));
    console.log('[Approval] 审批拒绝:', instanceId, nodeId);
  }
}));

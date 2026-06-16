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
import { routeApprovalChain } from '@/utils/approvalRouter';

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
  ) => { success: boolean; message: string };
  rejectNode: (
    instanceId: string,
    nodeId: string,
    approverId: string,
    approverName: string,
    comment?: string
  ) => { success: boolean; message: string };
  cleanupInvalidTodos: () => number;
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
      const now = new Date().toISOString();
      set({
        queueList: updatedList,
        callRecords: [
          ...get().callRecords,
          {
            id: `cr_${Date.now()}`,
            queueId: calledItem.id,
            ticketNumber: calledItem.ticketNumber,
            callTime: now,
            windowNumber,
            isPassed: false
          }
        ],
        businessRecords: get().businessRecords.map(br =>
          br.queueId === calledItem.id
            ? { ...br, status: 'processing', updateTime: now }
            : br
        )
      });
      console.log('[Queue] 叫号并同步业务状态为办理中:', calledItem.ticketNumber, windowNumber);
    }

    return calledItem;
  },

  acceptNumber: queueId => {
    const item = get().queueList.find(q => q.id === queueId);
    if (!item) return;
    const now = new Date().toISOString();
    set({
      queueList: acceptCall(get().queueList, item),
      businessRecords: get().businessRecords.map(br =>
        br.queueId === queueId
          ? { ...br, status: 'processing', updateTime: now }
          : br
      )
    });
    console.log('[Queue] 受理号码:', item.ticketNumber);
  },

  completeNumber: queueId => {
    const queueList = get().queueList;
    const item = queueList.find(q => q.id === queueId);
    if (!item) return;
    const now = new Date().toISOString();

    const businessRecord = get().businessRecords.find(br => br.queueId === queueId);
    const businessTypeId = businessRecord?.businessTypeId;
    const chainConfig = businessRecord?.approvalChainId
      ? get().approvalChainConfigs.find(c => c.id === businessRecord.approvalChainId)
      : null;
    const businessType = get().businessTypes.find(b => b.id === businessTypeId);

    let newBusinessStatus: BusinessRecord['status'] = 'completed';
    let newInstancesToAdd: ApprovalInstance[] = [];
    let todosToAdd: ApprovalTodoItem[] = [];
    let updatedInstances = get().approvalInstances;
    let updatedTodos = get().approvalTodoList;
    let finalCurrentNodeId: string | undefined = undefined;
    let existingInstance: ApprovalInstance | undefined = undefined;

    if (businessRecord && businessType?.requireApproval && chainConfig) {
      existingInstance = get().approvalInstances.find(
        i => i.businessId === businessRecord.id
      );

      if (existingInstance) {
        // 沿用已有的审批实例，保持原进度
        console.log('[Queue] 沿用已有审批实例:', existingInstance.id, '当前节点:', existingInstance.currentNodeId);
        newBusinessStatus = existingInstance.status === 'approved'
          ? 'completed'
          : existingInstance.status === 'rejected'
            ? 'rejected'
            : 'approving';
        finalCurrentNodeId = existingInstance.currentNodeId || undefined;

        // 同一业务只保留一条当前待办：先清掉该业务已有的所有旧待办，再根据当前节点重建一条
        const business = businessRecord;
        updatedTodos = updatedTodos.filter(t => t.businessId !== business.id);
        if (newBusinessStatus === 'approving' && existingInstance.currentNodeId) {
          const currentNode = findNodeById(chainConfig, existingInstance.currentNodeId);
          if (currentNode && currentNode.type === 'approval') {
            todosToAdd = [{
              id: `todo_${Date.now()}`,
              instanceId: existingInstance.id,
              businessId: business.id,
              businessTypeName: chainConfig.businessTypeName,
              applicantName: business.applicantName,
              nodeId: currentNode.id,
              nodeName: currentNode.name,
              createTime: now,
              priority: (currentNode.level && currentNode.level >= 3) ? 'high' : 'medium'
            }];
          }
        }
      } else {
        // 没有旧实例，首次进入审批流
        newBusinessStatus = 'approving';
        const routeResult = routeApprovalChain(chainConfig, chainConfig.startNodeId, businessRecord.formData || {});
        if (routeResult.isEnd || !routeResult.nextNodeId) {
          newBusinessStatus = 'completed';
        } else {
          const firstApprovalNode = findNodeById(chainConfig, routeResult.nextNodeId);
          const newInstanceId = `ai_${Date.now()}`;
          newInstancesToAdd = [{
            id: newInstanceId,
            businessId: businessRecord.id,
            chainConfigId: chainConfig.id,
            currentNodeId: routeResult.nextNodeId,
            status: 'processing',
            approvalHistory: routeResult.passedNodes
              .filter(nid => nid !== chainConfig.startNodeId)
              .map(nid => {
                const n = findNodeById(chainConfig, nid);
                return {
                  nodeId: nid,
                  nodeName: n?.name || nid,
                  action: 'route' as const,
                  time: now
                };
              }),
            createTime: now
          }];
          finalCurrentNodeId = routeResult.nextNodeId;
          // 同一业务去重：清掉旧待办后加新的
          updatedTodos = updatedTodos.filter(t => t.businessId !== businessRecord.id);
          if (firstApprovalNode && firstApprovalNode.type === 'approval') {
            todosToAdd = [{
              id: `todo_${Date.now()}`,
              instanceId: newInstanceId,
              businessId: businessRecord.id,
              businessTypeName: chainConfig.businessTypeName,
              applicantName: businessRecord.applicantName,
              nodeId: firstApprovalNode.id,
              nodeName: firstApprovalNode.name,
              createTime: now,
              priority: (firstApprovalNode.level && firstApprovalNode.level >= 3) ? 'high' : 'medium'
            }];
          }
        }
      }
    } else {
      // 无需审批的业务，确保其旧待办都清掉
      if (businessRecord) {
        updatedTodos = updatedTodos.filter(t => t.businessId !== businessRecord.id);
      }
    }

    set({
      queueList: completeService(get().queueList, item),
      businessRecords: get().businessRecords.map(br =>
        br.queueId === queueId
          ? {
              ...br,
              status: newBusinessStatus,
              updateTime: now,
              ...(newBusinessStatus === 'completed' || newBusinessStatus === 'rejected'
                ? { completeTime: now }
                : {}),
              currentApprovalNodeId: finalCurrentNodeId
            }
          : br
      ),
      approvalInstances: [...updatedInstances, ...newInstancesToAdd],
      approvalTodoList: [...updatedTodos, ...todosToAdd]
    });

    if (newInstancesToAdd.length > 0 && newBusinessStatus === 'approving') {
      console.log(
        `[Queue] 完成窗口办理，新建审批流，首个审批节点：${todosToAdd[0]?.nodeName || '无'}`);
    } else if (businessRecord && existingInstance) {
      console.log(
        `[Queue] 完成窗口办理，沿用已有审批实例 ${existingInstance.id}，节点：${finalCurrentNodeId}，待办：${todosToAdd.length ? todosToAdd[0].nodeName : '无'}`);
    } else {
      console.log('[Queue] 完成窗口办理，业务直接办结');
    }
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
      console.error('[Approval] 实例不存在，清理异常待办:', instanceId);
      set(state => ({
        approvalTodoList: state.approvalTodoList.filter(t => t.instanceId !== instanceId)
      }));
      return { success: false, message: '审批实例不存在，已从待办列表移除' };
    }

    const chainConfig = get().approvalChainConfigs.find(c => c.id === instance.chainConfigId);
    if (!chainConfig) {
      console.error('[Approval] 审批链不存在，清理异常待办:', instance.chainConfigId);
      set(state => ({
        approvalTodoList: state.approvalTodoList.filter(t => t.instanceId !== instanceId)
      }));
      return { success: false, message: '审批链配置不存在，已从待办列表移除' };
    }

    const business = get().businessRecords.find(b => b.id === instance.businessId);
    if (!business) {
      console.error('[Approval] 关联业务不存在，清理异常待办:', instance.businessId);
      set(state => ({
        approvalTodoList: state.approvalTodoList.filter(t => t.instanceId !== instanceId)
      }));
      return { success: false, message: '关联业务不存在，已从待办列表移除' };
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

    const formData = business.formData || {};
    const routeResult = advanceAfterApproval(chainConfig, nodeId, true, formData);

    let updatedInstance: Partial<ApprovalInstance>;
    let todoUpdates: ApprovalTodoItem[] = [];
    let businessStatusUpdate: { id: string; status: BusinessRecord['status']; remark?: string } | null = null;
    let successMessage = '';

    if (routeResult.isEnd || !routeResult.nextNodeId) {
      updatedInstance = {
        status: 'approved',
        currentNodeId: '',
        completeTime: now,
        approvalHistory: [...instance.approvalHistory, newHistoryRecord]
      };
      businessStatusUpdate = { id: instance.businessId, status: 'completed' };
      successMessage = '审批通过，流程已全部完成！';
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
        successMessage = `审批通过，已流转到下一节点：${nextNode.name}`;
      } else {
        successMessage = '审批通过，正在推进流程...';
      }

      businessStatusUpdate = { id: instance.businessId, status: 'approving' };
      console.log('[Approval] 推进到下一节点:', routeResult.nextNodeId, nextNode?.name);
    }

    set(state => ({
      approvalInstances: state.approvalInstances.map(inst =>
        inst.id === instanceId ? { ...inst, ...updatedInstance } : inst
      ),
      approvalTodoList: [
        ...state.approvalTodoList.filter(t => t.instanceId !== instanceId || t.nodeId !== nodeId),
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

    return { success: true, message: successMessage };
  },

  rejectNode: (instanceId, nodeId, approverId, approverName, comment) => {
    const now = new Date().toISOString();
    const instance = get().approvalInstances.find(i => i.id === instanceId);
    if (!instance) {
      console.error('[Approval] 实例不存在，清理异常待办:', instanceId);
      set(state => ({
        approvalTodoList: state.approvalTodoList.filter(t => t.instanceId !== instanceId)
      }));
      return { success: false, message: '审批实例不存在，已从待办列表移除' };
    }

    const chainConfig = get().approvalChainConfigs.find(c => c.id === instance.chainConfigId);
    if (!chainConfig) {
      console.error('[Approval] 审批链不存在，清理异常待办:', instance.chainConfigId);
      set(state => ({
        approvalTodoList: state.approvalTodoList.filter(t => t.instanceId !== instanceId)
      }));
      return { success: false, message: '审批链配置不存在，已从待办列表移除' };
    }

    const business = get().businessRecords.find(b => b.id === instance.businessId);
    if (!business) {
      console.error('[Approval] 关联业务不存在，清理异常待办:', instance.businessId);
      set(state => ({
        approvalTodoList: state.approvalTodoList.filter(t => t.instanceId !== instanceId)
      }));
      return { success: false, message: '关联业务不存在，已从待办列表移除' };
    }

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
      approvalTodoList: state.approvalTodoList.filter(
        t => !(t.instanceId === instanceId && t.nodeId === nodeId)
      ),
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
    return { success: true, message: `审批已驳回，理由：${comment || '无'}` };
  },

  cleanupInvalidTodos: () => {
    const state = get();
    const validInstanceIds = new Set(state.approvalInstances.map(i => i.id));
    const validBusinessIds = new Set(state.businessRecords.map(b => b.id));
    let removed = 0;
    set(s => {
      const filtered = s.approvalTodoList.filter(t => {
        const instanceOk = validInstanceIds.has(t.instanceId);
        const businessOk = validBusinessIds.has(t.businessId);
        if (!instanceOk || !businessOk) {
          removed++;
          console.log('[Approval] 清理异常待办:', t.id, t.nodeName, !instanceOk ? '实例无效' : '业务无效');
          return false;
        }
        return true;
      });
      return { approvalTodoList: filtered };
    });
    return removed;
  }
}));

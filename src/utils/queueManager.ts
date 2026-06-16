import type { QueueItem, SystemConfig } from '@/types';

export const DEFAULT_CONFIG: SystemConfig = {
  maxPassCount: 3,
  callTimeoutSeconds: 120,
  passRequeuePosition: 'tail'
};

const generateTicketCode = (businessCode: string, seq: number): string => {
  const codeMap: Record<string, string> = {
    SFZ: 'A',
    HJQY: 'A',
    YYZZ: 'B',
    SBDJ: 'C',
    YBBX: 'D',
    BDC: 'E',
    HZ: 'F',
    JSZ: 'G',
    SWDJ: 'H',
    GJJ: 'I'
  };
  const prefix = codeMap[businessCode] || 'Z';
  return `${prefix}${String(seq).padStart(3, '0')}`;
};

export const createQueueItem = (
  businessTypeId: string,
  businessTypeName: string,
  businessCode: string,
  citizenName: string,
  citizenId: string,
  phone: string,
  existingQueue: QueueItem[]
): QueueItem => {
  const maxSeq = existingQueue.reduce((max, item) => {
    const match = item.ticketNumber.match(/(\d+)$/);
    if (match) {
      return Math.max(max, parseInt(match[1], 10));
    }
    return max;
  }, 0);

  const nextSeq = maxSeq + 1;
  const activeWaitCount = existingQueue.filter(
    q => q.status === 'waiting' || q.status === 'calling' || q.status === 'processing'
  ).length;

  return {
    id: `q_${Date.now()}`,
    ticketNumber: generateTicketCode(businessCode, nextSeq),
    businessTypeId,
    businessTypeName,
    citizenName,
    citizenId,
    phone,
    status: 'waiting',
    position: existingQueue.length + 1,
    passCount: 0,
    maxPassCount: DEFAULT_CONFIG.maxPassCount,
    createTime: new Date().toISOString(),
    estimatedWaitTime: activeWaitCount * 25
  };
};

export const handlePass = (
  queue: QueueItem[],
  queueItem: QueueItem
): { updatedList: QueueItem[]; isInvalid: boolean; message: string } => {
  const newPassCount = queueItem.passCount + 1;
  const isInvalid = newPassCount >= queueItem.maxPassCount;
  const updatedList = [...queue];
  const index = updatedList.findIndex(q => q.id === queueItem.id);

  if (index === -1) {
    return { updatedList: queue, isInvalid: false, message: '未找到该号码' };
  }

  if (isInvalid) {
    updatedList[index] = {
      ...updatedList[index],
      status: 'invalid',
      passCount: newPassCount
    };
    return {
      updatedList,
      isInvalid: true,
      message: `号码 ${queueItem.ticketNumber} 已连续过号${newPassCount}次，自动作废`
    };
  }

  const activePositions = updatedList
    .filter(q => (q.status === 'waiting' || q.status === 'calling' || q.status === 'passed') && q.id !== queueItem.id)
    .map(q => q.position);
  const maxPosition = activePositions.length > 0 ? Math.max(...activePositions) : 0;
  const newPosition = maxPosition + 1;

  updatedList[index] = {
    ...updatedList[index],
    status: 'passed',
    passCount: newPassCount,
    position: newPosition,
    estimatedWaitTime: Math.round((newPosition - 1) * 25)
  };

  return {
    updatedList,
    isInvalid: false,
    message: `号码 ${queueItem.ticketNumber} 过号${newPassCount}次，重排到第${newPosition}位（连续过号${queueItem.maxPassCount}次将作废）`
  };
};

export const callNextNumber = (
  queue: QueueItem[],
  windowNumber: string
): { updatedList: QueueItem[]; calledItem: QueueItem | null } => {
  const waitingItems = queue
    .filter(q => q.status === 'waiting' || q.status === 'passed')
    .sort((a, b) => a.position - b.position);

  if (waitingItems.length === 0) {
    return { updatedList: queue, calledItem: null };
  }

  const toCall = waitingItems[0];
  const updatedList = queue.map(q => {
    if (q.id === toCall.id) {
      return {
        ...q,
        status: 'calling' as const,
        callTime: new Date().toISOString(),
        windowNumber
      };
    }
    return q;
  });

  return { updatedList, calledItem: { ...toCall, status: 'calling', callTime: new Date().toISOString(), windowNumber } };
};

export const acceptCall = (queue: QueueItem[], queueItem: QueueItem): QueueItem[] => {
  return queue.map(q => {
    if (q.id === queueItem.id) {
      return { ...q, status: 'processing' as const };
    }
    return q;
  });
};

export const completeService = (queue: QueueItem[], queueItem: QueueItem): QueueItem[] => {
  return queue.map(q => {
    if (q.id === queueItem.id) {
      return {
        ...q,
        status: 'completed' as const,
        completeTime: new Date().toISOString()
      };
    }
    return q;
  });
};

export const getStatusLabel = (status: QueueItem['status']): string => {
  const map: Record<QueueItem['status'], string> = {
    waiting: '排队中',
    calling: '叫号中',
    processing: '办理中',
    passed: '已过号',
    completed: '已完成',
    invalid: '已作废'
  };
  return map[status];
};

export const getPassedList = (queue: QueueItem[]): QueueItem[] => {
  return queue
    .filter(q => q.status === 'passed' || q.status === 'invalid')
    .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
};

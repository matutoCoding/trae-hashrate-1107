import type { QueueItem, CallRecord } from '@/types';

const now = new Date();
const formatTime = (d: Date) => d.toISOString();

const offsetMinute = (minutes: number) => {
  const d = new Date(now.getTime() + minutes * 60000);
  return formatTime(d);
};

export const initialQueueList: QueueItem[] = [
  {
    id: 'q_001',
    ticketNumber: 'A001',
    businessTypeId: 'biz_001',
    businessTypeName: '身份证办理',
    citizenName: '张三',
    citizenId: '110101199001011234',
    phone: '13800138001',
    status: 'completed',
    position: 1,
    passCount: 0,
    maxPassCount: 3,
    createTime: offsetMinute(-120),
    callTime: offsetMinute(-100),
    completeTime: offsetMinute(-80),
    windowNumber: 'A-01',
    estimatedWaitTime: 0
  },
  {
    id: 'q_002',
    ticketNumber: 'B001',
    businessTypeId: 'biz_003',
    businessTypeName: '营业执照办理',
    citizenName: '李四',
    citizenId: '110101198505055678',
    phone: '13800138002',
    status: 'calling',
    position: 2,
    passCount: 0,
    maxPassCount: 3,
    createTime: offsetMinute(-90),
    callTime: offsetMinute(-2),
    windowNumber: 'B-02',
    estimatedWaitTime: 0
  },
  {
    id: 'q_003',
    ticketNumber: 'A002',
    businessTypeId: 'biz_001',
    businessTypeName: '身份证办理',
    citizenName: '王五',
    citizenId: '110101199203152345',
    phone: '13800138003',
    status: 'waiting',
    position: 3,
    passCount: 0,
    maxPassCount: 3,
    createTime: offsetMinute(-60),
    estimatedWaitTime: 30
  },
  {
    id: 'q_004',
    ticketNumber: 'C001',
    businessTypeId: 'biz_005',
    businessTypeName: '医保报销',
    citizenName: '赵六',
    citizenId: '110101198807073456',
    phone: '13800138004',
    status: 'passed',
    position: 4,
    passCount: 1,
    maxPassCount: 3,
    createTime: offsetMinute(-45),
    callTime: offsetMinute(-15),
    estimatedWaitTime: 45
  },
  {
    id: 'q_005',
    ticketNumber: 'A003',
    businessTypeId: 'biz_001',
    businessTypeName: '身份证办理',
    citizenName: '孙七',
    citizenId: '110101199506204567',
    phone: '13800138005',
    status: 'waiting',
    position: 5,
    passCount: 0,
    maxPassCount: 3,
    createTime: offsetMinute(-30),
    estimatedWaitTime: 60
  },
  {
    id: 'q_006',
    ticketNumber: 'D001',
    businessTypeId: 'biz_006',
    businessTypeName: '不动产登记',
    citizenName: '周八',
    citizenId: '110101198001015678',
    phone: '13800138006',
    status: 'waiting',
    position: 6,
    passCount: 0,
    maxPassCount: 3,
    createTime: offsetMinute(-20),
    estimatedWaitTime: 90
  },
  {
    id: 'q_007',
    ticketNumber: 'B002',
    businessTypeId: 'biz_003',
    businessTypeName: '营业执照办理',
    citizenName: '吴九',
    citizenId: '110101199109096789',
    phone: '13800138007',
    status: 'processing',
    position: 7,
    passCount: 0,
    maxPassCount: 3,
    createTime: offsetMinute(-50),
    callTime: offsetMinute(-30),
    windowNumber: 'B-01',
    estimatedWaitTime: 0
  },
  {
    id: 'q_008',
    ticketNumber: 'A004',
    businessTypeId: 'biz_001',
    businessTypeName: '身份证办理',
    citizenName: '郑十',
    citizenId: '110101199810107890',
    phone: '13800138008',
    status: 'waiting',
    position: 8,
    passCount: 0,
    maxPassCount: 3,
    createTime: offsetMinute(-10),
    estimatedWaitTime: 105
  },
  {
    id: 'q_009',
    ticketNumber: 'E001',
    businessTypeId: 'biz_010',
    businessTypeName: '公积金提取',
    citizenName: '陈十一',
    citizenId: '110101198602028901',
    phone: '13800138009',
    status: 'invalid',
    position: 9,
    passCount: 3,
    maxPassCount: 3,
    createTime: offsetMinute(-180),
    callTime: offsetMinute(-60),
    estimatedWaitTime: 0
  }
];

export const callRecords: CallRecord[] = [
  {
    id: 'cr_001',
    queueId: 'q_001',
    ticketNumber: 'A001',
    callTime: offsetMinute(-100),
    windowNumber: 'A-01',
    isPassed: false
  },
  {
    id: 'cr_002',
    queueId: 'q_002',
    ticketNumber: 'B001',
    callTime: offsetMinute(-2),
    windowNumber: 'B-02',
    isPassed: false
  },
  {
    id: 'cr_003',
    queueId: 'q_004',
    ticketNumber: 'C001',
    callTime: offsetMinute(-15),
    windowNumber: 'C-01',
    isPassed: true,
    passOrder: 1
  },
  {
    id: 'cr_004',
    queueId: 'q_007',
    ticketNumber: 'B002',
    callTime: offsetMinute(-30),
    windowNumber: 'B-01',
    isPassed: false
  },
  {
    id: 'cr_005',
    queueId: 'q_009',
    ticketNumber: 'E001',
    callTime: offsetMinute(-150),
    windowNumber: 'E-01',
    isPassed: true,
    passOrder: 1
  },
  {
    id: 'cr_006',
    queueId: 'q_009',
    ticketNumber: 'E001',
    callTime: offsetMinute(-100),
    windowNumber: 'E-01',
    isPassed: true,
    passOrder: 2
  },
  {
    id: 'cr_007',
    queueId: 'q_009',
    ticketNumber: 'E001',
    callTime: offsetMinute(-60),
    windowNumber: 'E-01',
    isPassed: true,
    passOrder: 3
  }
];

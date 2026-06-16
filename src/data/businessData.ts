import type { BusinessRecord, ApprovalInstance, ApprovalTodoItem } from '@/types';

const now = new Date();
const formatTime = (d: Date) => d.toISOString();
const offsetMinute = (minutes: number) => formatTime(new Date(now.getTime() + minutes * 60000));

export const businessRecords: BusinessRecord[] = [
  {
    id: 'biz_rec_001',
    businessTypeId: 'biz_001',
    businessTypeName: '身份证办理',
    queueId: 'q_001',
    ticketNumber: 'A001',
    applicantName: '张三',
    applicantId: '110101199001011234',
    phone: '13800138001',
    status: 'completed',
    formData: {
      isFirstApply: false,
      isRemote: false,
      reason: '到期换领'
    },
    materials: ['photo_front', 'photo_back', 'old_id_card'],
    approvalChainId: 'chain_001',
    currentApprovalNodeId: 'node_end',
    createTime: offsetMinute(-180),
    updateTime: offsetMinute(-80),
    completeTime: offsetMinute(-80),
    remark: '换领成功，7个工作日后领取'
  },
  {
    id: 'biz_rec_002',
    businessTypeId: 'biz_003',
    businessTypeName: '营业执照办理',
    queueId: 'q_007',
    ticketNumber: 'B002',
    applicantName: '吴九',
    applicantId: '110101199109096789',
    phone: '13800138007',
    status: 'approving',
    formData: {
      companyName: '某某科技有限公司',
      registeredCapital: 2000000,
      industries: ['科技'],
      legalRepresentative: '吴九'
    },
    materials: ['id_card', 'lease_contract', 'company_charter'],
    approvalChainId: 'chain_002',
    currentApprovalNodeId: 'node_approve_3',
    createTime: offsetMinute(-120),
    updateTime: offsetMinute(-30)
  },
  {
    id: 'biz_rec_003',
    businessTypeId: 'biz_005',
    businessTypeName: '医保报销',
    applicantName: '郑十',
    applicantId: '110101199810107890',
    phone: '13800138008',
    status: 'processing',
    formData: {
      reimbursementAmount: 35000,
      isMajorDisease: false,
      hospital: '市第一人民医院',
      diagnosis: '急性阑尾炎手术'
    },
    materials: ['medical_invoice', 'discharge_summary', 'diagnosis_proof'],
    createTime: offsetMinute(-30),
    updateTime: offsetMinute(-10)
  },
  {
    id: 'biz_rec_004',
    businessTypeId: 'biz_006',
    businessTypeName: '不动产登记',
    applicantName: '周八',
    applicantId: '110101198001015678',
    phone: '13800138006',
    status: 'approving',
    formData: {
      propertyAddress: '朝阳区某某路123号A座1801室',
      propertyType: '商品房',
      hasMortgage: true,
      transactionAmount: 5800000
    },
    materials: ['property_certificate', 'purchase_contract', 'loan_contract'],
    approvalChainId: 'chain_004',
    currentApprovalNodeId: 'node_approve_2',
    createTime: offsetMinute(-240),
    updateTime: offsetMinute(-60)
  },
  {
    id: 'biz_rec_005',
    businessTypeId: 'biz_010',
    businessTypeName: '公积金提取',
    applicantName: '陈十一',
    applicantId: '110101198602028901',
    phone: '13800138009',
    status: 'rejected',
    formData: {
      extractType: '购房提取',
      extractAmount: 300000
    },
    materials: ['purchase_contract'],
    createTime: offsetMinute(-300),
    updateTime: offsetMinute(-200),
    remark: '材料不全，请补充首付款发票和契税完税证明'
  },
  {
    id: 'biz_rec_006',
    businessTypeId: 'biz_002',
    businessTypeName: '户籍迁移',
    applicantName: '李四',
    applicantId: '110101198505055678',
    phone: '13800138002',
    status: 'queuing',
    formData: {},
    materials: [],
    createTime: offsetMinute(-5)
  }
];

export const approvalInstances: ApprovalInstance[] = [
  {
    id: 'ins_001',
    businessId: 'biz_rec_001',
    chainConfigId: 'chain_001',
    currentNodeId: 'node_end',
    status: 'approved',
    createTime: offsetMinute(-160),
    completeTime: offsetMinute(-90),
    approvalHistory: [
      {
        nodeId: 'node_cond_1',
        nodeName: '是否首次申领',
        action: 'route',
        time: offsetMinute(-155)
      },
      {
        nodeId: 'node_approve_2',
        nodeName: '窗口核验',
        approverId: 'u_window_001',
        approverName: '窗口王主任',
        action: 'approve',
        comment: '材料齐全，信息核验无误',
        time: offsetMinute(-120)
      },
      {
        nodeId: 'node_cond_2',
        nodeName: '是否为异地办理',
        action: 'route',
        time: offsetMinute(-100)
      },
      {
        nodeId: 'node_end',
        nodeName: '结束',
        action: 'approve',
        time: offsetMinute(-90)
      }
    ]
  },
  {
    id: 'ins_002',
    businessId: 'biz_rec_002',
    chainConfigId: 'chain_002',
    currentNodeId: 'node_approve_3',
    status: 'processing',
    createTime: offsetMinute(-110),
    approvalHistory: [
      {
        nodeId: 'node_cond_1',
        nodeName: '注册资本金额',
        action: 'route',
        time: offsetMinute(-105)
      },
      {
        nodeId: 'node_approve_2',
        nodeName: '工商所初审',
        approverId: 'u_gs_002',
        approverName: '工商所李主任',
        action: 'approve',
        comment: '材料符合要求，同意',
        time: offsetMinute(-80)
      }
    ]
  },
  {
    id: 'ins_003',
    businessId: 'biz_rec_004',
    chainConfigId: 'chain_004',
    currentNodeId: 'node_approve_2',
    status: 'processing',
    createTime: offsetMinute(-220),
    approvalHistory: [
      {
        nodeId: 'node_approve_1',
        nodeName: '窗口受理',
        approverId: 'u_bdc_001',
        approverName: '不动产张科长',
        action: 'approve',
        comment: '材料已收齐',
        time: offsetMinute(-180)
      },
      {
        nodeId: 'node_cond_1',
        nodeName: '是否有抵押',
        action: 'route',
        time: offsetMinute(-150)
      }
    ]
  },
  {
    id: 'ins_004',
    businessId: 'biz_rec_005',
    chainConfigId: 'chain_005',
    currentNodeId: 'node_approve_1',
    status: 'rejected',
    createTime: offsetMinute(-280),
    completeTime: offsetMinute(-200),
    approvalHistory: [
      {
        nodeId: 'node_approve_1',
        nodeName: '公积金中心审核',
        approverId: 'u_gjj_001',
        approverName: '公积金刘审核',
        action: 'reject',
        comment: '材料不全，请补充首付款发票和契税完税证明',
        time: offsetMinute(-200)
      }
    ]
  }
];

export const approvalTodoList: ApprovalTodoItem[] = [
  {
    id: 'todo_001',
    instanceId: 'ins_002',
    businessId: 'biz_rec_002',
    businessTypeName: '营业执照办理',
    applicantName: '吴九',
    nodeId: 'node_approve_3',
    nodeName: '分局复核',
    createTime: offsetMinute(-50),
    priority: 'high'
  },
  {
    id: 'todo_002',
    instanceId: 'ins_003',
    businessId: 'biz_rec_004',
    businessTypeName: '不动产登记',
    applicantName: '周八',
    nodeId: 'node_approve_2',
    nodeName: '银行抵押核验',
    createTime: offsetMinute(-90),
    deadline: offsetMinute(24 * 60),
    priority: 'medium'
  },
  {
    id: 'todo_003',
    instanceId: 'ins_005',
    businessId: 'biz_rec_007',
    businessTypeName: '医保报销',
    applicantName: '钱十二',
    nodeId: 'node_approve_1',
    nodeName: '医保窗口审核',
    createTime: offsetMinute(-20),
    priority: 'low'
  }
];

import type { ApprovalChainConfig, ApprovalNodeConfig, ApprovalCondition } from '@/types';

const now = new Date().toISOString();

export const approvalChainConfigs: ApprovalChainConfig[] = [
  {
    id: 'chain_001',
    businessTypeId: 'biz_001',
    businessTypeName: '身份证办理',
    name: '身份证办理审批流程',
    version: 1,
    updateTime: now,
    startNodeId: 'node_start',
    nodes: [
      {
        id: 'node_start',
        type: 'start',
        name: '开始',
        nextNodeId: 'node_cond_1'
      },
      {
        id: 'node_cond_1',
        type: 'condition',
        name: '是否首次申领',
        conditions: [
          { field: 'isFirstApply', operator: 'eq', value: true }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_approve_1',
        falseNextNodeId: 'node_approve_2'
      },
      {
        id: 'node_approve_1',
        type: 'approval',
        name: '户籍科初审',
        role: 'huji_clerk',
        level: 1,
        approverIds: ['u_huji_001'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_approve_2',
        type: 'approval',
        name: '窗口核验',
        role: 'window_clerk',
        level: 1,
        approverIds: ['u_window_001'],
        nextNodeId: 'node_cond_2'
      },
      {
        id: 'node_cond_2',
        type: 'condition',
        name: '是否为异地办理',
        conditions: [
          { field: 'isRemote', operator: 'eq', value: true }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_approve_3',
        falseNextNodeId: 'node_end'
      },
      {
        id: 'node_approve_3',
        type: 'approval',
        name: '异地协同审批',
        role: 'remote_approver',
        level: 2,
        approverIds: ['u_remote_001'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_end',
        type: 'end',
        name: '结束'
      }
    ]
  },
  {
    id: 'chain_002',
    businessTypeId: 'biz_003',
    businessTypeName: '营业执照办理',
    name: '营业执照审批流程',
    version: 1,
    updateTime: now,
    startNodeId: 'node_start',
    nodes: [
      {
        id: 'node_start',
        type: 'start',
        name: '开始',
        nextNodeId: 'node_cond_1'
      },
      {
        id: 'node_cond_1',
        type: 'condition',
        name: '注册资本金额',
        conditions: [
          { field: 'registeredCapital', operator: 'gte', value: 1000000 }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_approve_2',
        falseNextNodeId: 'node_approve_1'
      },
      {
        id: 'node_approve_1',
        type: 'approval',
        name: '工商窗口审核',
        role: 'gs_clerk',
        level: 1,
        approverIds: ['u_gs_001'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_approve_2',
        type: 'approval',
        name: '工商所初审',
        role: 'gs_supervisor',
        level: 1,
        approverIds: ['u_gs_002'],
        nextNodeId: 'node_approve_3'
      },
      {
        id: 'node_approve_3',
        type: 'approval',
        name: '分局复核',
        role: 'gs_chief',
        level: 2,
        approverIds: ['u_gs_003'],
        nextNodeId: 'node_cond_2'
      },
      {
        id: 'node_cond_2',
        type: 'condition',
        name: '是否涉及特殊行业',
        conditions: [
          { field: 'industries', operator: 'in', value: ['金融', '医疗', '教育'] }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_approve_4',
        falseNextNodeId: 'node_end'
      },
      {
        id: 'node_approve_4',
        type: 'approval',
        name: '特殊行业许可审批',
        role: 'special_approver',
        level: 3,
        approverIds: ['u_special_001'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_end',
        type: 'end',
        name: '结束'
      }
    ]
  },
  {
    id: 'chain_003',
    businessTypeId: 'biz_005',
    businessTypeName: '医保报销',
    name: '医保报销审批流程',
    version: 1,
    updateTime: now,
    startNodeId: 'node_start',
    nodes: [
      {
        id: 'node_start',
        type: 'start',
        name: '开始',
        nextNodeId: 'node_cond_1'
      },
      {
        id: 'node_cond_1',
        type: 'condition',
        name: '报销金额',
        conditions: [
          { field: 'reimbursementAmount', operator: 'gt', value: 50000 }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_cond_2',
        falseNextNodeId: 'node_approve_1'
      },
      {
        id: 'node_approve_1',
        type: 'approval',
        name: '医保窗口审核',
        role: 'yb_clerk',
        level: 1,
        approverIds: ['u_yb_001'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_cond_2',
        type: 'condition',
        name: '是否为重大疾病',
        conditions: [
          { field: 'isMajorDisease', operator: 'eq', value: true }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_approve_3',
        falseNextNodeId: 'node_approve_2'
      },
      {
        id: 'node_approve_2',
        type: 'approval',
        name: '医保科科长审批',
        role: 'yb_chief',
        level: 2,
        approverIds: ['u_yb_002'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_approve_3',
        type: 'approval',
        name: '专家委员会审核',
        role: 'expert_committee',
        level: 2,
        approverIds: ['u_exp_001', 'u_exp_002', 'u_exp_003'],
        nextNodeId: 'node_approve_4'
      },
      {
        id: 'node_approve_4',
        type: 'approval',
        name: '分管局长审批',
        role: 'deputy_director',
        level: 3,
        approverIds: ['u_director_001'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_end',
        type: 'end',
        name: '结束'
      }
    ]
  },
  {
    id: 'chain_004',
    businessTypeId: 'biz_006',
    businessTypeName: '不动产登记',
    name: '不动产登记审批流程',
    version: 1,
    updateTime: now,
    startNodeId: 'node_start',
    nodes: [
      {
        id: 'node_start',
        type: 'start',
        name: '开始',
        nextNodeId: 'node_approve_1'
      },
      {
        id: 'node_approve_1',
        type: 'approval',
        name: '窗口受理',
        role: 'bdc_clerk',
        level: 1,
        approverIds: ['u_bdc_001'],
        nextNodeId: 'node_cond_1'
      },
      {
        id: 'node_cond_1',
        type: 'condition',
        name: '是否有抵押',
        conditions: [
          { field: 'hasMortgage', operator: 'eq', value: true }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_approve_2',
        falseNextNodeId: 'node_approve_4'
      },
      {
        id: 'node_approve_2',
        type: 'approval',
        name: '银行抵押核验',
        role: 'bank_verifier',
        level: 2,
        approverIds: ['u_bank_001'],
        nextNodeId: 'node_approve_3'
      },
      {
        id: 'node_approve_3',
        type: 'approval',
        name: '抵押登记审核',
        role: 'mortgage_approver',
        level: 2,
        approverIds: ['u_bdc_002'],
        nextNodeId: 'node_approve_4'
      },
      {
        id: 'node_approve_4',
        type: 'approval',
        name: '登簿终审',
        role: 'registrar',
        level: 3,
        approverIds: ['u_bdc_003'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_end',
        type: 'end',
        name: '结束'
      }
    ]
  },
  {
    id: 'chain_005',
    businessTypeId: 'biz_002',
    businessTypeName: '户籍迁移',
    name: '户籍迁移审批流程',
    version: 1,
    updateTime: now,
    startNodeId: 'node_start',
    nodes: [
      {
        id: 'node_start',
        type: 'start',
        name: '开始',
        nextNodeId: 'node_cond_1'
      },
      {
        id: 'node_cond_1',
        type: 'condition',
        name: '迁移类型',
        conditions: [
          { field: 'migrationType', operator: 'in', value: ['市外迁入', '跨区迁入'] }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_approve_2',
        falseNextNodeId: 'node_approve_1'
      },
      {
        id: 'node_approve_1',
        type: 'approval',
        name: '户籍窗口审核',
        role: 'huji_clerk',
        level: 1,
        approverIds: ['u_huji_001'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_approve_2',
        type: 'approval',
        name: '派出所初审',
        role: 'police_station',
        level: 2,
        approverIds: ['u_police_001'],
        nextNodeId: 'node_approve_3'
      },
      {
        id: 'node_approve_3',
        type: 'approval',
        name: '户政科审批',
        role: 'huji_chief',
        level: 3,
        approverIds: ['u_huji_002'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_end',
        type: 'end',
        name: '结束'
      }
    ]
  },
  {
    id: 'chain_006',
    businessTypeId: 'biz_007',
    businessTypeName: '护照办理',
    name: '护照办理审批流程',
    version: 1,
    updateTime: now,
    startNodeId: 'node_start',
    nodes: [
      {
        id: 'node_start',
        type: 'start',
        name: '开始',
        nextNodeId: 'node_cond_1'
      },
      {
        id: 'node_cond_1',
        type: 'condition',
        name: '是否为首次申请',
        conditions: [
          { field: 'isFirstPassport', operator: 'eq', value: true }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_approve_2',
        falseNextNodeId: 'node_approve_1'
      },
      {
        id: 'node_approve_1',
        type: 'approval',
        name: '出入境窗口核验',
        role: 'exit_entry_clerk',
        level: 1,
        approverIds: ['u_crj_001'],
        nextNodeId: 'node_approve_3'
      },
      {
        id: 'node_approve_2',
        type: 'approval',
        name: '户籍地核查',
        role: 'local_police_verifier',
        level: 2,
        approverIds: ['u_crj_002'],
        nextNodeId: 'node_approve_3'
      },
      {
        id: 'node_approve_3',
        type: 'approval',
        name: '出入境管理审批',
        role: 'exit_entry_chief',
        level: 3,
        approverIds: ['u_crj_003'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_end',
        type: 'end',
        name: '结束'
      }
    ]
  },
  {
    id: 'chain_007',
    businessTypeId: 'biz_009',
    businessTypeName: '税务登记',
    name: '税务登记审批流程',
    version: 1,
    updateTime: now,
    startNodeId: 'node_start',
    nodes: [
      {
        id: 'node_start',
        type: 'start',
        name: '开始',
        nextNodeId: 'node_cond_1'
      },
      {
        id: 'node_cond_1',
        type: 'condition',
        name: '业务类型',
        conditions: [
          { field: 'taxType', operator: 'in', value: ['发票申领', '一般纳税人认定'] }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_approve_2',
        falseNextNodeId: 'node_approve_1'
      },
      {
        id: 'node_approve_1',
        type: 'approval',
        name: '税务窗口审核',
        role: 'tax_clerk',
        level: 1,
        approverIds: ['u_tax_001'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_approve_2',
        type: 'approval',
        name: '税务所复核',
        role: 'tax_supervisor',
        level: 2,
        approverIds: ['u_tax_002'],
        nextNodeId: 'node_approve_3'
      },
      {
        id: 'node_approve_3',
        type: 'approval',
        name: '分局审批',
        role: 'tax_chief',
        level: 3,
        approverIds: ['u_tax_003'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_end',
        type: 'end',
        name: '结束'
      }
    ]
  },
  {
    id: 'chain_008',
    businessTypeId: 'biz_010',
    businessTypeName: '公积金提取',
    name: '公积金提取审批流程',
    version: 1,
    updateTime: now,
    startNodeId: 'node_start',
    nodes: [
      {
        id: 'node_start',
        type: 'start',
        name: '开始',
        nextNodeId: 'node_cond_1'
      },
      {
        id: 'node_cond_1',
        type: 'condition',
        name: '提取金额',
        conditions: [
          { field: 'extractAmount', operator: 'gte', value: 500000 }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_approve_3',
        falseNextNodeId: 'node_cond_2'
      },
      {
        id: 'node_cond_2',
        type: 'condition',
        name: '提取类型',
        conditions: [
          { field: 'extractType', operator: 'in', value: ['购房提取', '贷款还贷'] }
        ],
        conditionLogic: 'AND',
        trueNextNodeId: 'node_approve_2',
        falseNextNodeId: 'node_approve_1'
      },
      {
        id: 'node_approve_1',
        type: 'approval',
        name: '公积金窗口审核',
        role: 'gjj_clerk',
        level: 1,
        approverIds: ['u_gjj_001'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_approve_2',
        type: 'approval',
        name: '业务科复核',
        role: 'gjj_supervisor',
        level: 2,
        approverIds: ['u_gjj_002'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_approve_3',
        type: 'approval',
        name: '中心审批',
        role: 'gjj_chief',
        level: 3,
        approverIds: ['u_gjj_003'],
        nextNodeId: 'node_end'
      },
      {
        id: 'node_end',
        type: 'end',
        name: '结束'
      }
    ]
  }
];

export const evaluateCondition = (condition: ApprovalCondition, formData: Record<string, any>): boolean => {
  const { field, operator, value } = condition;
  const actual = formData[field];

  switch (operator) {
    case 'eq':
      return actual === value;
    case 'ne':
      return actual !== value;
    case 'gt':
      return Number(actual) > Number(value);
    case 'lt':
      return Number(actual) < Number(value);
    case 'gte':
      return Number(actual) >= Number(value);
    case 'lte':
      return Number(actual) <= Number(value);
    case 'in':
      if (Array.isArray(value)) {
        if (Array.isArray(actual)) {
          return actual.some(item => value.includes(item));
        }
        return value.includes(actual);
      }
      return false;
    case 'contains':
      if (typeof actual === 'string' && typeof value === 'string') {
        return actual.includes(value);
      }
      if (Array.isArray(actual)) {
        return actual.includes(value);
      }
      return false;
    default:
      return false;
  }
};

export const evaluateConditions = (
  conditions: ApprovalCondition[],
  logic: 'AND' | 'OR',
  formData: Record<string, any>
): boolean => {
  if (!conditions || conditions.length === 0) return true;

  const results = conditions.map(c => evaluateCondition(c, formData));
  return logic === 'AND' ? results.every(r => r) : results.some(r => r);
};

export const findNodeById = (config: ApprovalChainConfig, nodeId: string): ApprovalNodeConfig | undefined => {
  return config.nodes.find(n => n.id === nodeId);
};

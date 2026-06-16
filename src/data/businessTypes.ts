import type { BusinessType } from '@/types';

export const businessTypes: BusinessType[] = [
  {
    id: 'biz_001',
    name: '身份证办理',
    code: 'SFZ',
    description: '首次申领、补办、换领居民身份证',
    icon: '🪪',
    estimatedTime: 15,
    category: '户政业务',
    requireApproval: true
  },
  {
    id: 'biz_002',
    name: '户籍迁移',
    code: 'HJQY',
    description: '市内迁移、市外迁入、迁出市外',
    icon: '🏠',
    estimatedTime: 30,
    category: '户政业务',
    requireApproval: true
  },
  {
    id: 'biz_003',
    name: '营业执照办理',
    code: 'YYZZ',
    description: '个体工商户、公司注册登记',
    icon: '📋',
    estimatedTime: 45,
    category: '工商业务',
    requireApproval: true
  },
  {
    id: 'biz_004',
    name: '社保登记',
    code: 'SBDJ',
    description: '社保参保登记、信息变更',
    icon: '🛡️',
    estimatedTime: 20,
    category: '社保业务',
    requireApproval: false
  },
  {
    id: 'biz_005',
    name: '医保报销',
    code: 'YBBX',
    description: '医疗费用报销、异地就医备案',
    icon: '💊',
    estimatedTime: 25,
    category: '医保业务',
    requireApproval: true
  },
  {
    id: 'biz_006',
    name: '不动产登记',
    code: 'BDC',
    description: '房屋产权登记、抵押登记',
    icon: '🏢',
    estimatedTime: 60,
    category: '不动产',
    requireApproval: true
  },
  {
    id: 'biz_007',
    name: '护照办理',
    code: 'HZ',
    description: '普通护照首次申请、换补发',
    icon: '📕',
    estimatedTime: 20,
    category: '出入境',
    requireApproval: true
  },
  {
    id: 'biz_008',
    name: '驾驶证业务',
    code: 'JSZ',
    description: '驾照申领、换证、补证、审验',
    icon: '🚗',
    estimatedTime: 25,
    category: '车驾管',
    requireApproval: false
  },
  {
    id: 'biz_009',
    name: '税务登记',
    code: 'SWDJ',
    description: '税务登记、税种认定、发票申领',
    icon: '💰',
    estimatedTime: 35,
    category: '税务业务',
    requireApproval: true
  },
  {
    id: 'biz_010',
    name: '公积金提取',
    code: 'GJJ',
    description: '住房公积金提取、贷款申请',
    icon: '🏦',
    estimatedTime: 30,
    category: '公积金',
    requireApproval: true
  }
];

export const businessCategories = [...new Set(businessTypes.map(b => b.category))];

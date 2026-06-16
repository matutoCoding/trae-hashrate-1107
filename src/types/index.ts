// 业务类型
export interface BusinessType {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  estimatedTime: number;
  category: string;
  requireApproval: boolean;
}

// 排队号码状态
export type QueueStatus = 'waiting' | 'calling' | 'processing' | 'passed' | 'completed' | 'invalid';

// 排队记录
export interface QueueItem {
  id: string;
  ticketNumber: string;
  businessTypeId: string;
  businessTypeName: string;
  citizenName: string;
  citizenId: string;
  phone: string;
  status: QueueStatus;
  position: number;
  passCount: number;
  maxPassCount: number;
  createTime: string;
  callTime?: string;
  completeTime?: string;
  windowNumber?: string;
  estimatedWaitTime: number;
}

// 叫号记录
export interface CallRecord {
  id: string;
  queueId: string;
  ticketNumber: string;
  callTime: string;
  windowNumber: string;
  isPassed: boolean;
  passOrder?: number;
}

// 审批节点类型
export type ApprovalNodeType = 'start' | 'approval' | 'condition' | 'end';

// 审批节点条件操作符
export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';

// 审批节点条件
export interface ApprovalCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

// 审批节点配置
export interface ApprovalNodeConfig {
  id: string;
  type: ApprovalNodeType;
  name: string;
  role?: string;
  conditions?: ApprovalCondition[];
  conditionLogic?: 'AND' | 'OR';
  trueNextNodeId?: string;
  falseNextNodeId?: string;
  nextNodeId?: string;
  level?: number;
  approverIds?: string[];
}

// 审批链配置（可配置化）
export interface ApprovalChainConfig {
  id: string;
  businessTypeId: string;
  businessTypeName: string;
  name: string;
  nodes: ApprovalNodeConfig[];
  startNodeId: string;
  version: number;
  updateTime: string;
}

// 审批实例状态
export type ApprovalInstanceStatus = 'pending' | 'approved' | 'rejected' | 'processing';

// 审批实例
export interface ApprovalInstance {
  id: string;
  businessId: string;
  chainConfigId: string;
  currentNodeId: string;
  status: ApprovalInstanceStatus;
  approvalHistory: ApprovalRecord[];
  createTime: string;
  completeTime?: string;
}

// 审批记录
export interface ApprovalRecord {
  nodeId: string;
  nodeName: string;
  approverId?: string;
  approverName?: string;
  action: 'approve' | 'reject' | 'route' | 'pending';
  comment?: string;
  time: string;
}

// 业务办理状态
export type BusinessStatus = 'draft' | 'queuing' | 'processing' | 'approving' | 'completed' | 'rejected';

// 业务办理记录
export interface BusinessRecord {
  id: string;
  businessTypeId: string;
  businessTypeName: string;
  queueId?: string;
  ticketNumber?: string;
  applicantName: string;
  applicantId: string;
  phone: string;
  status: BusinessStatus;
  formData: Record<string, any>;
  materials: string[];
  currentApprovalNodeId?: string;
  approvalChainId?: string;
  createTime: string;
  updateTime: string;
  completeTime?: string;
  remark?: string;
}

// 待办审批项
export interface ApprovalTodoItem {
  id: string;
  instanceId: string;
  businessId: string;
  businessTypeName: string;
  applicantName: string;
  nodeId: string;
  nodeName: string;
  createTime: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
}

// 系统配置
export interface SystemConfig {
  maxPassCount: number;
  callTimeoutSeconds: number;
  passRequeuePosition: 'tail' | 'current_plus_3';
}

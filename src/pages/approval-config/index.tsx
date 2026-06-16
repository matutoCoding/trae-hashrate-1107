import React, { useState, useEffect } from 'react';
import { View, Text, Input, ScrollView, Picker } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import { useAppStore } from '@/store';
import type {
  ApprovalChainConfig,
  ApprovalNodeConfig,
  ApprovalNodeType,
  ApprovalCondition,
  ConditionOperator
} from '@/types';
import classnames from 'classnames';

const OPERATORS: { label: string; value: ConditionOperator }[] = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'ne' },
  { label: '大于', value: 'gt' },
  { label: '小于', value: 'lt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于等于', value: 'lte' },
  { label: '包含在', value: 'in' },
  { label: '包含', value: 'contains' }
];

const NODE_TYPES: { label: string; value: ApprovalNodeType }[] = [
  { label: '开始', value: 'start' },
  { label: '审批', value: 'approval' },
  { label: '条件分支', value: 'condition' },
  { label: '结束', value: 'end' }
];

const ApprovalConfigPage: React.FC = () => {
  const router = useRouter();
  const { chainId, bizId } = router.params;
  const approvalChainConfigs = useAppStore(s => s.approvalChainConfigs);
  const updateApprovalChainConfig = useAppStore(s => s.updateApprovalChainConfig);
  const businessTypes = useAppStore(s => s.businessTypes);

  const [chain, setChain] = useState<ApprovalChainConfig | null>(null);
  const [nodes, setNodes] = useState<ApprovalNodeConfig[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const found = approvalChainConfigs.find(c => c.id === chainId);
    if (found) {
      setChain(found);
      setNodes(JSON.parse(JSON.stringify(found.nodes)));
    } else {
      Taro.showToast({ title: '未找到审批链', icon: 'none' });
    }
  }, [chainId, approvalChainConfigs]);

  const business = businessTypes.find(b => b.id === bizId);

  const updateNode = (nodeId: string, updates: Partial<ApprovalNodeConfig>) => {
    setNodes(prev => prev.map(n => (n.id === nodeId ? { ...n, ...updates } : n)));
  };

  const updateCondition = (
    nodeId: string,
    condIdx: number,
    updates: Partial<ApprovalCondition>
  ) => {
    setNodes(prev =>
      prev.map(n => {
        if (n.id !== nodeId) return n;
        const newConds = [...(n.conditions || [])];
        newConds[condIdx] = { ...newConds[condIdx], ...updates };
        return { ...n, conditions: newConds };
      })
    );
  };

  const addCondition = (nodeId: string) => {
    setNodes(prev =>
      prev.map(n => {
        if (n.id !== nodeId) return n;
        const newCond: ApprovalCondition = { field: '', operator: 'eq', value: '' };
        return { ...n, conditions: [...(n.conditions || []), newCond] };
      })
    );
  };

  const deleteCondition = (nodeId: string, condIdx: number) => {
    setNodes(prev =>
      prev.map(n => {
        if (n.id !== nodeId) return n;
        const newConds = [...(n.conditions || [])];
        newConds.splice(condIdx, 1);
        return { ...n, conditions: newConds };
      })
    );
  };

  const addNode = (type: ApprovalNodeType) => {
    const newId = `node_${Date.now()}`;
    const newNode: ApprovalNodeConfig = {
      id: newId,
      type,
      name: type === 'start' ? '开始' : type === 'end' ? '结束' : type === 'approval' ? '新审批节点' : '新条件分支'
    };

    if (type === 'condition') {
      newNode.conditions = [{ field: '', operator: 'eq', value: '' }];
      newNode.conditionLogic = 'AND';
    }

    setNodes(prev => [...prev, newNode]);
  };

  const deleteNode = (nodeId: string) => {
    Taro.showModal({
      title: '删除节点',
      content: '确定删除此节点吗？相关的连接关系会被清除。',
      confirmColor: '#F53F3F',
      success: res => {
        if (res.confirm) {
          setNodes(prev => {
            const filtered = prev.filter(n => n.id !== nodeId);
            return filtered.map(n => {
              const updated = { ...n };
              if (updated.nextNodeId === nodeId) updated.nextNodeId = undefined;
              if (updated.trueNextNodeId === nodeId) updated.trueNextNodeId = undefined;
              if (updated.falseNextNodeId === nodeId) updated.falseNextNodeId = undefined;
              return updated;
            });
          });
        }
      }
    });
  };

  const getNodeOptions = (excludeId: string) => {
    return nodes.filter(n => n.id !== excludeId).map(n => ({ label: n.name, value: n.id }));
  };

  const handleSave = () => {
    if (!chain) return;

    const startNodes = nodes.filter(n => n.type === 'start');
    const endNodes = nodes.filter(n => n.type === 'end');

    if (startNodes.length !== 1) {
      Taro.showToast({ title: '必须有且仅有一个开始节点', icon: 'none' });
      return;
    }
    if (endNodes.length < 1) {
      Taro.showToast({ title: '至少需要一个结束节点', icon: 'none' });
      return;
    }

    setSaving(true);
    try {
      updateApprovalChainConfig(chain.id, nodes);
      console.log('[ApprovalConfig] 保存审批链:', chain.id, nodes);
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (err) {
      console.error('[ApprovalConfig] 保存失败:', err);
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  const getNodeCardClass = (type: ApprovalNodeType) => {
    const map: Record<string, string> = {
      start: 'nodeCardStart',
      condition: 'nodeCardCondition',
      approval: 'nodeCardApproval',
      end: 'nodeCardEnd'
    };
    return map[type] || '';
  };

  const getNodeTagClass = (type: ApprovalNodeType) => {
    const map: Record<string, string> = {
      start: 'nodeTagStart',
      condition: 'nodeTagCondition',
      approval: '',
      end: 'nodeTagEnd'
    };
    return map[type] || '';
  };

  if (!chain) {
    return (
      <View className={`pageContainer ${styles.container}`}>
        <View className="emptyState">加载中...</View>
      </View>
    );
  }

  return (
    <View className={`pageContainer ${styles.container}`}>
      <View className={styles.infoCard}>
        <Text className={styles.bizName}>
          {business?.icon} {chain.businessTypeName}
        </Text>
        <Text className={styles.chainName}>{chain.name}</Text>
        <View className={styles.chainMeta}>
          <Text className={styles.metaItem}>版本: v{chain.version}</Text>
          <Text className={styles.metaItem}>节点数: {nodes.length}</Text>
          <Text className={styles.metaItem}>
            更新: {new Date(chain.updateTime).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View className={styles.tipCard}>
        <Text className={styles.tipTitle}>💡 配置说明</Text>
        <Text className={styles.tipText}>
          1. 审批链支持「开始、审批、条件分支、结束」四种节点{'\n'}
          2. 条件节点可配置路由规则，通过后走「是」分支，否则走「否」分支{'\n'}
          3. 所有路由条件均通过 JSON 配置动态驱动，无需修改代码{'\n'}
          4. 支持 AND/OR 多条件组合逻辑
        </Text>
      </View>

      <View className={styles.sectionHeader}>
        <Text className="sectionTitle" style={{ marginBottom: 0 }}>节点列表</Text>
        <View className={styles.addBtn} onClick={() => addNode('approval')}>
          + 添加节点
        </View>
      </View>

      <ScrollView scrollY style={{ maxHeight: 1000 }}>
        <View className={styles.nodeList}>
          {nodes.map((node, idx) => {
            const options = getNodeOptions(node.id);
            return (
              <View
                key={node.id}
                className={classnames(styles.nodeCard, styles[getNodeCardClass(node.type)])}
              >
                <View className={styles.nodeHeader}>
                  <View className={classnames(styles.nodeTypeTag, styles[getNodeTagClass(node.type)])}>
                    {NODE_TYPES.find(t => t.value === node.type)?.label}
                    {node.level && ` L${node.level}`}
                  </View>
                  {node.type !== 'start' && node.type !== 'end' && (
                    <View className={styles.nodeActions}>
                      <View
                        className={styles.nodeActionIcon}
                        onClick={() => deleteNode(node.id)}
                        style={{ color: '#F53F3F' }}
                      >
                        🗑
                      </View>
                    </View>
                  )}
                </View>

                <View className={styles.nodeForm}>
                  <View className={styles.formRow}>
                    <Text className={styles.formLabel}>节点名称</Text>
                    <View className={styles.formInput}>
                      <Input
                        value={node.name}
                        onInput={e => updateNode(node.id, { name: e.detail.value })}
                        disabled={node.type === 'start' || node.type === 'end'}
                      />
                    </View>
                  </View>

                  {node.type === 'approval' && (
                    <>
                      <View className={styles.formRowInline}>
                        <View className={styles.formRow}>
                          <Text className={styles.formLabel}>审批岗位</Text>
                          <View className={styles.formInput}>
                            <Input
                              placeholder="如：窗口审核岗"
                              value={node.role || ''}
                              onInput={e => updateNode(node.id, { role: e.detail.value })}
                            />
                          </View>
                        </View>
                        <View className={styles.formRow}>
                          <Text className={styles.formLabel}>审批级别</Text>
                          <View className={styles.formInput}>
                            <Input
                              type="number"
                              placeholder="1-5"
                              value={String(node.level || '')}
                              onInput={e => updateNode(node.id, { level: Number(e.detail.value) })}
                            />
                          </View>
                        </View>
                      </View>
                    </>
                  )}

                  {node.type === 'condition' && (
                    <View className={styles.conditionList}>
                      <Text className={styles.formLabel} style={{ marginBottom: 12 }}>
                        条件表达式（多条件组合）
                      </Text>

                      <View className={styles.logicSwitch}>
                        <View
                          className={classnames(styles.logicBtn, {
                            [styles.logicBtnActive]: node.conditionLogic !== 'OR'
                          })}
                          onClick={() => updateNode(node.id, { conditionLogic: 'AND' })}
                        >
                          全部满足 (AND)
                        </View>
                        <View
                          className={classnames(styles.logicBtn, {
                            [styles.logicBtnActive]: node.conditionLogic === 'OR'
                          })}
                          onClick={() => updateNode(node.id, { conditionLogic: 'OR' })}
                        >
                          任一满足 (OR)
                        </View>
                      </View>

                      {(node.conditions || []).map((cond, cIdx) => (
                        <View key={cIdx} className={styles.conditionItem}>
                          <View className={styles.conditionRow}>
                            <View className={styles.conditionField}>
                              <Input
                                placeholder="字段名，如amount"
                                value={cond.field}
                                onInput={e =>
                                  updateCondition(node.id, cIdx, { field: e.detail.value })
                                }
                              />
                            </View>
                            <Picker
                              range={OPERATORS.map(o => o.label)}
                              rangeKey="label"
                              onChange={e =>
                                updateCondition(node.id, cIdx, {
                                  operator: OPERATORS[Number(e.detail.value)].value
                                })
                              }
                            >
                              <View className={styles.conditionOp}>
                                {OPERATORS.find(o => o.value === cond.operator)?.label || '='}
                              </View>
                            </Picker>
                            <View className={styles.conditionValue}>
                              <Input
                                placeholder="值，如1000"
                                value={String(cond.value)}
                                onInput={e =>
                                  updateCondition(node.id, cIdx, { value: e.detail.value })
                                }
                              />
                            </View>
                          </View>
                          <View className={styles.conditionRow}>
                            <View
                              className={styles.conditionDel}
                              onClick={() => deleteCondition(node.id, cIdx)}
                            >
                              删除
                            </View>
                          </View>
                        </View>
                      ))}

                      <View
                        className={styles.addBtn}
                        style={{ marginTop: 12, alignSelf: 'flex-start' }}
                        onClick={() => addCondition(node.id)}
                      >
                        + 新增条件
                      </View>

                      <View className={styles.nextNodeConfig}>
                        <View className={styles.trueBranch}>
                          <Text className={styles.nextNodeLabel} style={{ color: '#00B42A' }}>
                            ✅ 满足条件时 → 下一个节点
                          </Text>
                          <Picker
                            range={['无', ...options.map(o => o.label)]}
                            rangeKey="label"
                            onChange={e => {
                              const idx = Number(e.detail.value) - 1;
                              updateNode(node.id, {
                                trueNextNodeId: idx >= 0 ? options[idx].value : undefined
                              });
                            }}
                          >
                            <View className={styles.nextNodeSelect}>
                              <Text>
                                {node.trueNextNodeId
                                  ? options.find(o => o.value === node.trueNextNodeId)?.label
                                  : '请选择'}
                              </Text>
                              <Text>▼</Text>
                            </View>
                          </Picker>
                        </View>
                        <View className={styles.falseBranch}>
                          <Text className={styles.nextNodeLabel} style={{ color: '#F53F3F' }}>
                            ❌ 不满足时 → 下一个节点
                          </Text>
                          <Picker
                            range={['无', ...options.map(o => o.label)]}
                            rangeKey="label"
                            onChange={e => {
                              const idx = Number(e.detail.value) - 1;
                              updateNode(node.id, {
                                falseNextNodeId: idx >= 0 ? options[idx].value : undefined
                              });
                            }}
                          >
                            <View className={styles.nextNodeSelect}>
                              <Text>
                                {node.falseNextNodeId
                                  ? options.find(o => o.value === node.falseNextNodeId)?.label
                                  : '请选择'}
                              </Text>
                              <Text>▼</Text>
                            </View>
                          </Picker>
                        </View>
                      </View>
                    </View>
                  )}

                  {(node.type === 'start' || node.type === 'approval') && (
                    <View className={styles.nextNodeConfig}>
                      <Text className={styles.nextNodeLabel}>→ 下一个节点</Text>
                      <Picker
                        range={['无', ...options.map(o => o.label)]}
                        rangeKey="label"
                        onChange={e => {
                          const idx = Number(e.detail.value) - 1;
                          updateNode(node.id, {
                            nextNodeId: idx >= 0 ? options[idx].value : undefined
                          });
                        }}
                      >
                        <View className={styles.nextNodeSelect}>
                          <Text>
                            {node.nextNodeId
                              ? options.find(o => o.value === node.nextNodeId)?.label
                              : '请选择'}
                          </Text>
                          <Text>▼</Text>
                        </View>
                      </Picker>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <View className={styles.cancelBtn} onClick={() => Taro.navigateBack()}>
          取消
        </View>
        <View className={styles.saveBtn} onClick={handleSave}>
          {saving ? '保存中...' : '💾 保存配置'}
        </View>
      </View>
    </View>
  );
};

export default ApprovalConfigPage;

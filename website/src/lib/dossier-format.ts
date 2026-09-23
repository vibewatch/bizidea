import type { Lang } from './i18n';

const zhUiLabels: Record<string, string> = {
  'Beachhead': '滩头市场',
  'Wedge': '切入点',
  'Non-obvious insight': '非显而易见洞察',
  'Venture-scale path': '风险投资级路径',
  'Primary user': '主要用户',
  'Secondary user': '次要用户',
  'Economic buyer': '经济买方',
  'First customer': '首个客户',
  'Buying trigger': '购买触发点',
  'Current alternative': '当前替代方案',
  'Switching reason': '切换理由',
  'Pricing hypothesis': '定价假设',
  'Jobs to be done': '待完成任务',
  'Job': '任务',
  'Success metric': '成功指标',
  'Executive takeaways': '高管要点',
  'Market definition': '市场定义',
  'Customer and buyer': '用户与买方',
  'Buying triggers': '购买触发点',
  'Willingness to pay': '支付意愿',
  'Category dynamics': '品类动态',
  'Growth signal': '增长信号',
  'Tailwinds': '顺风因素',
  'Headwinds': '逆风因素',
  'Validation signals': '验证信号',
  'Regulatory & technical constraints': '监管与技术约束',
  'PESTLE': 'PESTLE',
  'Adoption friction': '采用阻力',
  'Friction': '阻力',
  'Severity': '严重度',
  'Affected buyer': '受影响买方',
  'Mitigation': '缓解措施',
  'Competitor': '竞争对手',
  'Stage': '阶段',
  'Pricing': '定价',
  'Strength': '优势',
  'Weakness vs. us': '相对劣势',
  'Why incumbents do not win by default': '为什么现有厂商不会默认胜出',
  "Porter's five forces": '波特五力',
  'Supplier power': '供应商议价能力',
  'Buyer power': '买方议价能力',
  'Threat of entrants': '新进入者威胁',
  'Threat of substitutes': '替代品威胁',
  'Competitive rivalry': '竞争强度',
  'Problem': '问题',
  'Solution': '解决方案',
  'Why we win': '为什么我们会赢',
  'Strategic choices': '战略选择',
  'Wedge rationale': '切入点理由',
  'Sequencing': '推进顺序',
  'Not yet': '暂不进入',
  'Go-to-market': '进入市场',
  'Channels': '渠道',
  'Funnel targets': '漏斗目标',
  'Product roadmap': '产品路线图',
  '6 months': '6 个月',
  '12 months': '12 个月',
  '24 months': '24 个月',
  'Key bets': '关键押注',
  'Business model': '商业模式',
  'Revenue streams': '收入来源',
  'Unit of value': '价值单位',
  'Target gross margin': '目标毛利率',
  'Expansion levers': '扩张杠杆',
  'Strategy map': '战略地图',
  'North-star metric': '北极星指标',
  'Input metrics': '输入指标',
  'Moats to build': '待构建护城河',
  'Kill criteria': '终止标准',
  'Milestones': '里程碑',
  'Founding team': '创始团队',
  'Role': '角色',
  'Start timing': '入职时间',
  'Rationale': '理由',
  'Experiment roadmap': '实验路线图',
  'Horizon': '阶段',
  'Experiment': '实验',
  'Hypothesis': '假设',
  'Owner': '负责人',
  'Risk assessment': '风险评估',
  'Risk': '风险',
  'Likelihood': '可能性',
  'Impact': '影响',
  'Title': '标题',
  'Profile': '画像',
  'Trigger': '触发点',
  'Buyer': '买方',
  'Initial contract': '初始合同',
  'What must be true': '必须成立的条件',
  'Open diligence questions': '待尽调问题',
  'Investor verdict': '投资人判断',
  'Call': '结论',
  'Conviction': '信心',
  'Why believe': '相信的理由',
  'Why doubt': '怀疑的理由',
  'Next diligence': '下一步尽调',
  '3-year totals': '三年合计',
  'Year 1 revenue': '第 1 年收入',
  'Year 2 revenue': '第 2 年收入',
  'Year 3 revenue': '第 3 年收入',
  'Unit economics': '单位经济',
  'ARPU (annual)': '年 ARPU',
  'Gross margin': '毛利率',
  'Payback': '回本期',
  'LTV': '生命周期价值',
  'Funding ask': '融资需求',
  'Round': '轮次',
  'Runway': '跑道',
  'Milestone': '里程碑',
  'Model sanity': '模型合理性',
  'Scenarios': '情景',
  'Scenario': '情景',
  'Y3 revenue': '第 3 年收入',
  'Y3 EBITDA': '第 3 年 EBITDA',
  'Cash low point': '现金低点',
  'Description': '说明',
  'Key changes': '关键变化',
  'Sensitivity': '敏感性',
  'Variable': '变量',
  'Downside': '下行情景',
  'Base': '基准情景',
  'Upside': '上行情景',
  'Key assumptions': '关键假设',
  'ID': 'ID',
  'Name': '名称',
  'Value': '数值',
  'Unit': '单位',
  'Source': '来源',
  'Flags': '警示项',
  'Business plan risks': '商业计划风险',
  'mapped': '已映射',
  'Scan': '扫描',
  'Run': '运行',
};

export function uiLabel(label: string, lang: Lang = 'en'): string {
  return lang === 'zh' ? (zhUiLabels[label] ?? label) : label;
}

export function formatMoneyK(k: number): string {
  return Math.abs(k) >= 1000 ? `$${(k / 1000).toFixed(2)}M` : `$${k.toFixed(0)}K`;
}

export function formatSignedMoneyK(k: number): string {
  return k >= 0 ? formatMoneyK(k) : `-${formatMoneyK(-k)}`;
}

export function scenarioLabel(key: string, lang: Lang = 'en'): string {
  const normalized = key.trim().toLowerCase();
  if (lang !== 'zh') return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return normalized === 'downside'
    ? '下行'
    : normalized === 'base'
      ? '基准'
      : normalized === 'upside'
        ? '上行'
        : key;
}

export function localizeFinancialVariable(value: unknown, lang: Lang = 'en'): string {
  const raw = String(value ?? '');
  if (lang !== 'zh') return raw;
  return {
    ARPU: 'ARPU',
    CAC: 'CAC',
    churn: '流失率',
    'sales cycle': '销售周期',
    'gross margin': '毛利率',
    'hiring pace': '招聘节奏',
  }[raw] ?? raw;
}

export function localizeFinancialText(value: unknown, lang: Lang = 'en'): string {
  const raw = String(value ?? '');
  if (lang !== 'zh') return raw;
  return raw
    .replace(/annual plus volume pricing/g, '年度订阅加用量定价')
    .replace(/annual plus usage/g, '年度订阅加用量')
    .replace(/USD per logo-month/g, '美元/客户-月')
    .replace(/USD per production logo/g, '美元/正式生产客户')
    .replace(/USD per pilot/g, '美元/试点')
    .replace(/USD per FTE-year/g, '美元/FTE-年')
    .replace(/USD per year/g, '美元/年')
    .replace(/USD per month/g, '美元/月')
    .replace(/USD per logo/g, '美元/客户')
    .replace(/\bUSD\b/g, '美元')
    .replace(/annual logo ARPU/g, '年化单客户 ARPU')
    .replace(/per production logo/g, '每个正式生产客户')
    .replace(/per logo-month/g, '每客户-月')
    .replace(/per pilot/g, '每个试点')
    .replace(/per logo/g, '每个客户')
    .replace(/per month ramp/g, '每月爬坡')
    .replace(/monthly logo churn/g, '月度客户流失率')
    .replace(/gross margin/g, '毛利率')
    .replace(/sales cycle/g, '销售周期')
    .replace(/annualized/g, '年化')
    .replace(/\bannual\b/g, '每年')
    .replace(/per month/g, '每月')
    .replace(/on exit FTE/g, '退出时每 FTE')
    .replace(/percent/g, '百分比')
    .replace(/hire plan/g, '招聘计划')
    .replace(/logos/g, '客户数')
    .replace(/\/mo/g, '/月')
    .replace(/months/g, '个月')
    .replace(/\bmonth\b/g, '月');
}

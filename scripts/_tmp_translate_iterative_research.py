from pathlib import Path
import copy
import sys

try:
    import yaml
except Exception as e:
    raise SystemExit(f"PyYAML not available: {e}")

folder = Path('/home/ythuang/workspace/bizidea/ideas/20260503084931-iterative-health-clinical-trial-ai')
src = folder / 'research.yaml'
out = folder / 'research.zh.yaml'

with src.open('r', encoding='utf-8') as f:
    data = yaml.safe_load(f)

zh = copy.deepcopy(data)

# Top-level stable fields
zh['slug'] = data['slug']
zh['date'] = data['date']

zh['researchCoverage']['searchedQueries'] = [
    '临床试验招募 电子健康记录',
    '临床试验患者招募 人工智能',
    '肥胖临床试验招募障碍',
    '心内科临床试验入组障碍',
    '临床研究协调员 翻病历 招募',
    '临床试验招募 站点工作流',
    '心血管临床试验代表性不足',
    '肥胖 心代谢 临床试验入组',
    '去中心化临床试验 站点负担',
    '电子健康记录 表型识别 试验招募',
    '临床试验 EHR 招募综述',
    '临床试验站点招募优化',
    '临床试验 在线患者招募 系统综述',
]

for cluster in zh['deduplication']['duplicateClusters']:
    cluster['reason'] = '同一 canonical URL'

rm = zh['reportMemo']
rm['executiveTakeaways'] = [
    '入组痛点确实存在，但现在最能落地的空档已不再是泛化的获客，而是如何在患者离开门诊前，把日常专科就诊转成按方案排列的工作清单。',
    '近期融资和合作活动说明，AI 招募正从胃肠领域外溢到心内科和肥胖方向；这验证了滩头市场，而不是逼创业公司从零教育需求。',
    '真正的战略空档在站点运营层：大型 RWD 网络和赞助方平台能做可行性评估，但协调员最后一公里执行和就诊前触达仍然很碎。',
    '心代谢需求的结构性吸引力在于：肥胖和心脏病负担都很大，而心衰和降脂试验里的代表性缺口，又持续逼站点把筛查覆盖和文档留痕做得更系统。',
    '集成是卡口风险：FHIR 和 SMART 确实在降摩擦，但本地排班数据、方案翻译，以及可审计的人工复核，依旧决定了见效速度。',
    '广义招募、DCT 和站点科技竞品都不缺钱；只有坚持把心代谢专科工作流做得足够有判断，创业公司才不会滑成另一个通用招募看板。',
    '第 3 年更可信的结果，不是做成大而全市场，而是拿下一块不算大、但有意义的专科站点版图；更大的上行要靠后续扩进 CRO 可行性评估、赞助方预测和基准数据。',
]
rm['marketDefinition'] = '这个市场指向美国临床试验运营软件，服务对象是积极开展研究的心内科与肥胖专科诊疗平台。它涵盖 EHR 原生预筛查、协调员工作队列、触达追踪，以及面向赞助方出资的心代谢研究的站点级入组分析。它不包括面向消费者的试验市场、完整 EDC/CTMS、通用 CRO 服务，也不包括仅服务赞助方的可行性工具。'
rm['customerAndBuyer'] = '日常使用者是临床研究协调员或集中式站点运营团队。经济买方通常是多站点专科平台里的研究运营 VP/Director 或 COO，因为部署会碰到门诊工作流、IT 权限、合规和赞助方入组表现。'
for item, point in zip(rm['buyingTriggers'], [
    '一旦新签了肥胖、心衰或心血管研究，团队就会立刻暴露出仍在靠人工转诊和翻病历推进招募的问题；入组风险从抽象担忧变成眼前压力。',
    '站点如果被要求提升代表性和入组质量，就需要一套既能更早识别合格患者、又能把过程留痕的做法。',
    'FHIR、SMART launch 和更成熟的 EHR 招募工具开始可用，让就诊前匹配在运营上比几年前更能落地。',
]):
    item['point'] = point
rm['willingnessToPay']['summary'] = '邻近预算本来就存在于站点运营和招募相关品类里：无论是提供方还是赞助方，早就在为企业级招募、患者参与、多样性和可行性工具买单。只要这个切口能把价值直接绑到筛查吞吐、转诊质量和漏招风险上，它就有机会拿到预算，而不必去争取一笔空泛的 AI 预算。'
rm['competitiveLandscape'] = '竞争格局大致分成五类：赞助方优先的数据平台、广义临床试验操作系统、社区触达/招募网络、外部患者获取供应商，以及内部手工流程。创业公司若想真正拉开差异，就该死守专科诊疗平台内部运营——尤其是就诊前筛查、转诊分诊和协调员后续跟进——而不是正面去打一场通用招募市场之战。'
for item, point in zip(rm['incumbentThesis'], [
    'Medidata 这类平台能赢下广义试验运营，但它们优化的是跨研究的横向流程覆盖，而不是专科门诊里围绕心代谢研究的就诊前资格筛查。',
    'TriNetX 这类网络在可行性评估、队列发现和提供方连接上很强，但它们不会天然拿下每天的协调员执行层；真正决定转化的是即将到来的预约、排除条件和触达时机。',
    'Antidote、Circuit 和 Elligo 能把漏斗顶部做大，但默认模式仍然把最后一公里的资格确认和门诊内跟进，留给目标诊疗平台自己消化。',
    'FHIR、SMART 和研究资源标准让集成更现实，但光有标准并不会自动把方案逻辑变成站点专属工作清单、审计轨迹和转化基准。',
    '人工翻病历当然灵活，但一旦跨门诊、跨方案扩张，效率就会塌；创业公司只有在减少协调员负担、又不牺牲研究者监督和记录质量时，才有胜算。',
]):
    item['point'] = point
rm['regulatoryLandscape'] = '它所处的运营环境，更像受监管的临床运营，而不是普通 SaaS。即便软件只是辅助筛查、并不直接做入组决策，买方仍会要求研究者监督、可靠的审计轨迹，以及保守的患者触达控制。'
rm['technologyLandscape'] = '底层使能栈已经存在——FHIR 资源、SMART launch 和队列定义工具都能用——但最终做得好不好，仍取决于本地数据映射、排班权限，以及方案标准被翻成可供人工复核动作的质量。'
for item, point in zip(rm['distributionChannels'], [
    '最自然的起步渠道，是直接卖给专科诊疗平台和集中式研究运营负责人，因为流程改造和集成都需要高触达实施。',
    '赞助方和 CRO 的转介绍同样重要，因为越来越多社区站点合作，是由面向赞助方的平台和网络在上游先拼起来的。',
    '互操作伙伴能显著提升部署可信度，尤其当 SMART/FHIR 对齐能力已经进入采购清单时。',
]):
    item['point'] = point
for item, point in zip(rm['partnershipEcosystem'], [
    'EHR 厂商与互操作标准组织都很关键，因为方案匹配必须接进排班、诊断、用药和 launch context，而不能每个站点都从头重建。',
    '社区型专科站点网络正逐步变成关键分发节点，这点从 Iterative 的心血管合作和 Elligo 面向赞助方/CRO 的定位里看得很清楚。',
    '即便切口是站点原生，外部招募和患者参与伙伴依然重要，因为转诊质量和患者教育，仍会影响下游转化。',
]):
    item['point'] = point
for item, point in zip(rm['dataMoats'], [
    '如果一个可复用的方案规则库能与面向研究的数据模型对齐，并且每次部署都在压缩配置时间、降低误报，它就可能长成真正有防御力的资产。',
    '跨站点的转诊流失、筛败原因和就诊到首筛转化基准，会逐步沉淀成通用看板拿不到的护城河。',
    '心代谢专科深度很关键，因为肥胖和心血管工作流里反复出现的用药、诊断和就诊模式，横向厂商往往会处理得过于粗。',
]):
    item['point'] = point
for item, point in zip(rm['geographicConsiderations'], [
    '最好的早期切口仍是美国，因为产品假设依赖赞助方出资的专科诊疗平台、美国临床试验基础设施，以及美国特有的互操作和合规工作流。',
    '比起单个学术中心，区域性大型集团和社区研究网络更重要，因为可信的医生关系本身就是转化优势的一部分。',
]):
    item['point'] = point
for item, impact in zip(rm['sensitivityCases'], [
    '试点会更快启动，但日常自动化能力会更弱；这会压低短期 ARPU，也让产品更容易被协调员人力替代。',
    '如果赞助方/CRO pull-through 提前出现，赢单率可能上去，因为预算更急；但路线图也会更早被推向可行性评估和多站点报告。',
    '如果肥胖试验持续火热而心内科采用更慢，滩头市场依旧成立；只是产品语言应先偏向肥胖和代谢试验，再慢慢扩向更广的心血管领域。',
]):
    item['impact'] = impact
for item, question, evidence in zip(rm['validationPlan'], [
    '美国有多少家背后有 PE 的心内科集团，今天真的在跑由集中式研究运营支撑的肥胖、心衰或更广泛心代谢研究？',
    '在最重要的两类目标 EHR 环境里，做出一份有用的就诊前工作清单，最少需要哪几条数据流？',
    '到底哪个 KPI 最能打开预算：节省协调员工时、缩短首筛天数、提高筛查通过率，还是提高达成入组目标的概率？',
    '如果每条建议都由人工复核，买方会接受在尚未取得研究特定同意前，由软件辅助触达患者吗？',
    '赞助方或 CRO 转介绍，是否足以缩短销售周期，从而抵消重集成实施带来的拖累？',
], [
    '做出 20 个账户的目标清单，梳理各站点当前方案库存，以及正在合作的赞助方/CRO。',
    '做集成发现访谈、拿样例排班导出，并把 1 个真实方案翻成可执行的筛查逻辑。',
    '围绕 1 个真实在跑方案设计试点，并把人工基线和软件结果并排比较。',
    '和站点法务/隐私负责人及赞助方研究团队做合规访谈。',
    '去访谈 CRO 可行性负责人和专科站点网络渠道。',
]):
    item['question'] = question
    item['evidenceToGather'] = evidence

am = zh['analysisModels']
am['marketMapDiagram']['title'] = '心代谢试验 intake 市场图'
am['marketMapDiagram']['mermaid'] = "quadrantChart\n  title 心代谢试验 intake 市场图\n  x-axis 专业化低 --> 专业化高\n  y-axis 紧迫性低 --> 紧迫性高\n  quadrant-1 横向平台\n  quadrant-2 最匹配\n  quadrant-3 优先级低\n  quadrant-4 细分但更慢\n  TriNetX: [0.45, 0.68]\n  Medidata: [0.35, 0.62]\n  Circuit Clinical: [0.62, 0.58]\n  Antidote: [0.52, 0.55]\n  Iterative Health: [0.72, 0.78]\n  Proposed startup: [0.87, 0.9]"
for sec, score, rationale in [
    ('supplierPower', 3, 'EHR 接入和 launch context 权限确实重要，但标准化 API 和队列定义工具让切换摩擦比“完全定制集成”的时代低了一些。'),
    ('buyerPower', 4, '初始买方高度集中，主要就是有限几家研究活跃的专科平台；而且它们完全可以拿新软件去和加协调员、通用 EHR 报表或现有厂商比价。'),
    ('threatOfEntrants', 3, 'LLM 和标准把方案逻辑的构建成本打下来，但真实工作流调优、合规预期和跨站点表现数据，仍然构成不小门槛。'),
    ('threatOfSubstitutes', 4, '人工翻病历、外部招募供应商和大而全的站点科技套件，都是可信替代；一旦创业公司证明不出明显更高的流程吞吐，就很难赢。'),
    ('competitiveRivalry', 4, '竞争在相邻层非常激烈——RWD 网络、站点平台、DCT 供应商、招募市场和重服务站点网络都在打，即便真正为这个切口做深的玩家还不多。'),
]:
    am['fiveForces'][sec]['score'] = score
    am['fiveForces'][sec]['rationale'] = rationale
for item, factor, impact, point in zip(am['pestle'],
    ['政治', '经济', '社会', '技术', '法律'],
    ['positive', 'positive', 'positive', 'positive', 'negative'],
    [
        '社区触达和心血管试验代表性压力，会推高对更好筛查与留痕工作流的需求。',
        '病种负担大、漏招代价高，让招募吞吐成了一笔可以预算化的运营问题，而不只是“研究上更好看”。',
        '患者本来就信任专科医生，所以把招募嵌进日常专科诊疗，往往比冷启动式外部触达更有效。',
        'FHIR、SMART 以及机器可读的队列定义方法，让按方案驱动的筛查比旧式报表流程更可落地。',
        '任何会碰到患者识别和触达的流程，都必须保住受监管临床研究对监督、可解释性和可审计性的要求。',
    ]):
    item['factor'] = factor
    item['impact'] = impact
    item['point'] = point
for item, friction, buyer, mitigation in zip(am['adoptionFrictionMatrix'], [
    '各站点、各厂商对 EHR 和排班数据的开放程度差异很大',
    '方案解释必须可审计，而且要保留临床复核',
    '如果不能立刻减轻工作量，协调员团队不会愿意再看一个新看板',
    '预算归属容易卡在站点领导、赞助方和 CRO 之间',
], [
    '研究运营负责人和门诊 IT',
    '合规负责人和主要研究者',
    '临床研究协调员',
    'COO 或研究运营 VP',
], [
    '从最常见的专科工作流入手，接受分阶段 onboarding，并先用一个方案把价值证出来，再做更深自动化。',
    '采用 human-in-the-loop 的方案翻译方式，把排除理由写清楚，并让日志对齐 GCP 预期。',
    '交付与真实预约绑定的就诊前队列，并用节省的工时对照人工翻病历。',
    '围绕真实在跑研究的漏招风险去包装试点，并同步培养赞助方/CRO 带单伙伴。',
]):
    item['friction'] = friction
    item['affectedBuyer'] = buyer
    item['mitigation'] = mitigation

market = zh['market']
market['tam']['rationale'] = '估算约 1,500 个美国具备研究能力的心代谢专科门诊或同等研究单元，长期都有可能跑赞助方出资试验；按每个单位每年约 $120k 的软件+实施 ACV 计算，并用肥胖和心脏病的疾病负担、专科试验活跃度，以及相邻站点/招募平台的企业级定价做交叉校验。'
market['sam']['rationale'] = '把 TAM 收窄到约 350 家门诊，集中在由 PE 支持或已完成集中化管理的美国心内科集团及相邻肥胖项目中；这些组织最容易快速标准化研究运营。350 x $120k ACV。'
market['som']['rationale'] = '第 3 年可触达情景，假设 6-8 个多站点客户、约 50 家活跃门诊，在分阶段铺设和方案扩张后，每家站点约 $120k ACV。'
for item, driver, value in zip(zh['bottomUpSizingDrivers'], [
    '总可服务单元数',
    '每个活跃门诊的估算 ACV',
    'SAM 内的滩头门诊数',
    '第 3 年可触达门诊版图',
], [
    '1,500 家美国具备研究能力的心代谢专科门诊或等价研究单元（估算）',
    '每年 $120k（估算）',
    '约 20-25 个集中式专科平台下的 350 家门诊（估算）',
    '6-8 个客户下的 50 家门诊（估算）',
]):
    item['driver'] = driver
    item['value'] = value
zh['categoryDynamics']['tailwinds'][0]['point'] = '新融资和专科扩张，验证了心内科与肥胖领域对 AI 招募基础设施的需求。'
zh['categoryDynamics']['tailwinds'][1]['point'] = '基于 EHR 的招募工具、互操作标准以及机器可读的队列定义方法，已经开始长成能用的实施原语。'
zh['categoryDynamics']['tailwinds'][2]['point'] = '心衰和降脂试验里的代表性缺口，让站点更需要系统化识别患者并留下触达记录。'
zh['categoryDynamics']['headwinds'][0]['point'] = '转诊流失和下游筛查浪费意味着，软件必须真能改变流程，而不是只多造一些线索。'
zh['categoryDynamics']['headwinds'][1]['point'] = '站点数据异构、EHR 功能不齐，依旧会拖慢部署，也可能削弱见效速度。'
zh['categoryDynamics']['headwinds'][2]['point'] = 'CTMS、患者参与、可行性评估和社区触达等相邻预算位上，已有大公司先卡住了位置。'
for item, wedge, strength, weakness in zip(zh['competitors'], [
    '社区站点研究基础设施与专科站点运营，正从胃肠扩到心内科和肥胖。',
    '面向可行性评估、试验设计和医疗提供方连接的大型真实世界数据网络。',
    '横向临床试验操作系统，覆盖 CTMS、患者体验、多样性和站点洞察。',
    '把研究带入日常护理场景的社区试验接入网络。',
    '面向赞助方侧的企业级患者匹配与招募，重点是转诊生成和资格确认。',
], [
    '近期融资和心血管合作说明，它在资金、分发和专科站点执行上都有可信度。',
    '数据规模大，赞助方和提供方网络效应强。',
    '分发力强、老客户信任高，而且覆盖研究运营全流程。',
    '医生网络和社区试验激活能力是优势。',
    '围绕企业级匹配和转诊生成的定位很清楚。',
], [
    '更宽的网络+服务模式，未必会像一个纯粹做就诊前心代谢 intake 的产品那样有判断。',
    '它最强的是可行性评估和队列发现，而不是单个专科诊疗平台预约流里的日常协调员执行。',
    '横向能力太多，专科化的心代谢 intake 和 EHR 原生预筛查很可能排不到高优先级。',
    '网络接入强，不等于自动解决目标诊疗平台内部的专科资格逻辑和协调员工作流。',
    '如果转诊在正式筛查前就流失，单靠外部匹配层并不能解决门诊内跟进和病历级资格确认。',
]):
    item['wedge'] = wedge
    item['strength'] = strength
    item['weaknessVsUs'] = weakness
for item, point in zip(zh['regulatoryTechnicalConstraints'], [
    '临床研究流程要求研究者监督、过程控制和可审计记录，以符合 GCP 预期；在早期部署里，完全自动化触达大概率行不通。',
    '面向研究的 FHIR 资源和 SMART launch 确实有帮助，但真正能不能上线，仍取决于每个站点愿意开放哪些预约、诊断、用药和用户上下文数据。',
    '关于 EHR 招募支持和功能缺口的文献都说明，方案标准翻译、本地数据质量和流程贴合度仍然是限制因素。',
    '心血管试验里的代表性与入组缺口，既是机会也是约束：软件得把覆盖面做大，但不能放松记录纪律。',
]):
    item['point'] = point
for item, point in zip(zh['validationSignals'], [
    'Iterative Health 近期的 $77M 融资，说明投资人仍然相信 AI 驱动的临床试验招募与匹配是一条活跃的基础设施赛道。',
    'Iterative 与 US Heart & Vascular 的合作，是心血管社区站点研究基础设施正在搭建的直接证据。',
    'TriNetX 在大型提供方关联 EHR 数据之上主打试验设计与招募能力，说明买方对数据驱动的招募工作流已有成熟需求。',
    'Antidote 自己的内容就反复强调转诊流失和肥胖招募里的准备度缺口，而这正是就诊前 intake 层要解决的痛点。',
    'Medable 和 Medidata 还在持续推出面向站点与 AI 的试验工具，说明现有厂商把站点负担和流程自动化视为正在推进的路线图。',
]):
    item['point'] = point
zh['openQuestions'] = [
    '美国到底有多少集中化心内科诊疗平台，手上的方案量足以支撑一款专门的 intake 工作流产品？',
    '前 20 个目标账户最常见的专科 EHR 与排班系统是什么？在就诊前，最少能拿到哪些数据？',
    '现实里预算到底由谁拍板：站点运营、赞助方 pass-through，还是 CRO 主导的研究启动预算？',
    '要在一个研究周期里挤掉人工翻病历和通用招募供应商，哪个试点 KPI 才真正足够有杀伤力？',
]

# Translate repetitive oneLineRelevance fields while preserving titles.
relevance_map = {
    'competitor': '这是用于判断竞品定位、能力边界或市场站位的主要公司页面。',
    'validation': '这是用于验证采用、合作、产品发布或目标赛道活跃度的证据。',
    'funding-news': '这是能独立验证 AI 试验招募赛道融资动向的资金新闻。',
    'customer-pain': '这是用来证明患者转诊流失、EHR 招募障碍、肥胖招募准备度或站点端筛查痛点的证据。',
    'technology': '这是与 EHR 互操作、研究资源、应用启动流程或相关技术能力有关的技术文档。',
    'market-size': '这是用于约束疾病负担、研究活跃度或临床试验市场规模的市场/流行病学证据。',
    'partnership': '这是用来判断渠道、生态或合作关系结构的伙伴证据。',
    'regulation': '这是与 GCP 质量、审计性或临床研究要求有关的监管/标准来源。',
}
for item in zh['evidenceCorpus']:
    item['oneLineRelevance'] = relevance_map.get(item.get('topicBucket'), '这是与本主题相关的辅助证据。')

# Keep source list titles verbatim; no changes needed other than structure already copied.

with out.open('w', encoding='utf-8') as f:
    yaml.safe_dump(zh, f, sort_keys=False, allow_unicode=True, width=1000)

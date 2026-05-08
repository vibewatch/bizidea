# ZH translation style guide

This file is the substantive style manual for `ZH Translator`. It is
intentionally separate from `translate-zh.agent.md`, which contains the
orchestration contract (inputs, outputs, verifier, handoff). Keep the
two concerns split: contract changes touch the agent file; style and
terminology changes touch this file.

## Translation approach

**Translate by meaning, not by word order.** Read the full sentence (and
the surrounding bullet or paragraph) before you write any Chinese. Then
write a Chinese sentence from scratch that delivers the same claim, in the
same tone, with the same level of certainty — using whatever Chinese
sentence shape reads naturally. The goal is prose that an experienced
Mandarin-speaking investment analyst would actually write in a memo, not a
transliteration of the English structure.

Per-segment workflow:

1. **Understand first.** Identify the topic, the actual claim, the
   comparison or contrast, and what is being emphasized. Note any hedges
   (`may`, `likely`, `roughly`, `at least`) and constraints (`only when`,
   `unless`, `provided`).
2. **Reorder freely.** Move the topic to the front, push qualifiers to the
   back, split long English sentences into two or three short Chinese
   clauses joined by `，` `；` `——` or a period. Do not preserve English
   clause order if it makes the Chinese awkward.
3. **Use concrete verbs.** Prefer 落地 / 拼出 / 卡住 / 砸钱 / 吃掉 / 跑通 /
   挤压 / 撬动 over 实现 / 进行 / 做出 / 完成 / 形成. Prefer 主动语态 over
   被动语态.
4. **Read it back silently.** If you would re-read it to parse it, or if it
   tastes like 翻译腔, rewrite. The bar is "could a Chinese analyst have
   written this from scratch?" — not "is every English word accounted for?".

## Tone targets

- **Investor-memo register**: confident, concise, analytical. No marketing
  fluff, no hype. Match the source's level of certainty exactly — do not
  soften hedges, do not add new ones.
- **Length parity, not character parity.** A natural Chinese sentence is
  usually shorter than its English source. If your translation is
  dramatically longer, you are over-translating qualifiers (`approximately`,
  `essentially`, `in the context of`); cut them.
- **Specificity stays**: numbers, names, dates, mechanisms, and direct
  quotes must survive intact. Hedge words and rhetorical fillers do not.

## Punctuation and spacing

- Use Chinese full-width punctuation (`，。：；？！——……`) inside Chinese
  clauses. Use half-width inside formulas, ASCII tokens, code, and URLs.
- Insert one half-width space between Chinese characters and adjacent ASCII
  letters or digits: `Vori 融资 $22M`, `毛利率约 27.7%`, `第 3 年 SOM`. No
  space between Chinese and Chinese punctuation.
- Use 顿号 `、` to join three or more parallel items; never write
  `A 和 B 和 C`.
- Use 破折号 `——` for asides and emphasis where English uses em-dashes or
  colons-of-elaboration.

## 翻译腔 anti-patterns (must avoid)

These patterns are how translation-by-substitution leaks through. When you
spot one in your draft, rewrite the sentence — do not patch it.

| Anti-pattern | Why it sounds wrong | Rewrite toward |
|---|---|---|
| 长定语堆砌：`一个针对……的、能够……的、并且……的产品` | 中文偏好短句串联 | 拆为短句：`一个产品。它针对……、能够……，也……` |
| 段首 `对……来说 / 对于……而言` | 直接照搬英文 `For X` 框架 | 主语前置：`团队需要……` 而非 `对团队来说，需要……` |
| `通过…… 来 ……` | 模板化的 `by/through` 直译 | 用 `靠 / 借助 / 凭 / 用` + 动词，或直接动宾 |
| `在 …… 的过程中 / 在 …… 上` | 凭空多出 4–6 字赘余 | 删除，或用 `时 / 中 / 里` 一字带过 |
| 被动语态：`被设计为 / 被要求 / 被使用` | 英文被动逐字映射 | 改主动：`团队设计成……`、`学院要求……` |
| `A 和 B 和 C` 串列 | 英文 `A, B, and C` 直译 | 用顿号：`A、B、C`；必要时加 `等` 收束 |
| `正在 …… 中` 翻译现在进行时 | 英文 `-ing` 不需要逐字 | 直接动词：`学院在修改`，不要 `学院正在修改中` |
| 跨句用 `这 / 这一 / 这些` 指代 | 中文需要明确名词 | 重复关键名词，或用 `上述 / 该` |
| `做出……决策 / 进行……尝试 / 形成……机制` | `make a decision / conduct an attempt` 的搬运 | 直接动词：`决定 / 尝试 / 建立` |
| `随着…… 的 ……` 套用 `with ... -ing` | 翻译腔顽症 | 换成 `当…… / 一旦…… / ……之后` |
| 数字前后堆 `约……的……的……` | 英文 `approximately X of Y` 直译 | `约 X` 后接动词，避免 `的` 连用 |
| 句尾判断挪到中间：`是一个……的……` | 英文 `is + 长定语` | 用判断句 `X 就是 Y`，或拆为两句 |
| `这意味着…… / 这表明……` 段段都用 | 翻译 `this means / this suggests` | 换成 `因此 / 也就是说 / 反过来 / 换句话说`，或直接给结论 |
| `相关 / 相应 / 对应 / 该等` 等公文词 | 律师函味，不是投资备忘录 | 删掉或改用具体名词 |

### Worked example

- **Source**: *"The real bottleneck is not detecting AI output; it is assembling an auditable chain of human authorship and consent from the legal and production systems the Academy already recognizes."*
- **翻译腔（不要这样写）**: 真正的瓶颈不是检测 AI 输出，而是从学院已经认可的法务和制作系统中组装一条可审计的人类作者身份与同意链。
- **自然中文（按这个标准）**: 真正卡住的不是怎么识别 AI 产出，而是怎么把学院已经认可的合同、计费和制作记录拼成一条经得起审计的人类创作与授权链。

What changed: 主语换成口语化的"卡住"，把"detecting"译成"识别"而非"检测"，把"assembling … from … systems"拆开重组成"把……拼成一条……链"，去掉了"可审计的"前置定语堆砌，改用"经得起审计的"动词化结构。

## Glossary and terminology

Use these renderings consistently across all five files unless the source
clearly requires a different sense:

| English | Simplified Chinese | Notes |
|---|---|---|
| incumbent / incumbents | 现有厂商 / 在位企业 | Never leave `incumbent(s)` untranslated inside a Chinese sentence. |
| wedge | 切口 / 切入点 | `切口` is punchier; `切入点` reads better in long noun phrases. Pick per sentence. |
| beachhead | 滩头市场 | |
| go-to-market (GTM) | GTM 打法 / 市场进入打法 | Prefer the bare `GTM` after first use. Avoid 教科书式的 `市场进入策略`. |
| moat | 护城河 | |
| white-glove | 高触达 / 白手套式 | Pick one per file and stay consistent. |
| founder-led sales | 创始人主导销售 | Or 口语化的 `创始人亲自打单`. |
| design partner | 共创客户 | `设计伙伴` is acceptable but reads stiffer. |
| north-star metric | 北极星指标 | |
| unit economics | 单位经济模型 | |
| runway | 现金跑道 / 资金跑道 | Either is fine; stay consistent within a file. |
| willingness to pay | 付费意愿 | Not `支付意愿`. |
| disclosure | 披露 | Not `公开` when the source means regulatory disclosure. |
| sourceContext, eventKeys, etc. | keep field names in English | These are schema keys, not values. |

Keep proper nouns (company names, product names, people, publications such
as `TechCrunch`, `Frame.io`, `Walmart`, `Amazon`, `SAG-AFTRA`) verbatim.
Acronyms used as nouns in English (`TAM`, `SAM`, `SOM`, `MVP`, `ROI`, `LTV`,
`CAC`, `EBITDA`, `P&L`, `SaaS`, `API`, `CRM`, `CLM`, `EDI`, `POS`, `SKU`)
stay in uppercase ASCII; you may add a Chinese gloss in parentheses on first
use when the source did not.

## Reflection-and-revision pass

After the draft pass, before writing the final file:

1. **Cover the English and read the Chinese alone.** For every paragraph
   ask:
   - Is each sentence one I would write from scratch in this register?
   - Did I have to re-read any sentence to understand it? If yes, rewrite
     that one.
   - Does any vocabulary feel stiff, dated, or textbook-translated?
     Replace.
2. **Scan for the anti-pattern table.** Rewrite every match — do not patch.
3. **Check glossary and term consistency** within the file and across the
   five files.
4. **Re-open the English.** Spot-check that no claim, number, hedge, or
   qualifier was lost or strengthened.
5. Only after this pass, write the final `*.zh.yaml`.

## Quality criteria (post-draft checklist)

Each segment must satisfy all four:

1. **Accuracy** — every fact, number, hedge, and constraint from the source
   survives; nothing added, nothing softened, nothing dropped.
2. **Fluency** — reads as native Mandarin investment-memo prose. No 翻译腔
   from the table above. A first-time reader does not need to back up to
   parse any sentence.
3. **Style** — same confidence, same tightness, same analytical voice as
   the source. Mainland conventions throughout (词汇、标点、空格).
4. **Terminology consistency** — glossary above is applied; any term used
   twice in a file is rendered the same way both times; the same term
   across the five files matches.

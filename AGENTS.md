# AGENTS.md —— 念佛计数微信小程序

## 项目定位

修行计数微信小程序（首版仅小程序，无 Android/iOS）。App 永久免费、无广告。
设计定稿见 `docs/`（需求与设计 v1.5、UI 定稿 v1.5、小程序规划 v1.0），**任何实现与定稿冲突时以实现定稿为准，并回报冲突**。

## 技术栈（不可更改）

- 原生微信小程序：WXML + WXSS + JavaScript（CommonJS），**不引入 Taro/uni-app/TypeScript/构建工具**。
- 本地缓存：`wx.setStorageSync / wx.getStorageSync`（封装在 `miniprogram/services/storage/`）。
- BLE：微信原生蓝牙 API，抽象在 `miniprogram/services/ble/`，页面只对抽象层编程。
- 云端（阶段3）：微信云开发，云函数是唯一写入口。

## 架构铁律

1. **页面不直接操作数据**：页面只调用 `services/domain`（业务）和 `services/storage`（持久化）。
2. **`services/domain` 是纯 JS**：禁止调用任何 `wx.*` API，必须能用 Node 直接跑单测（`npm test`）。
3. 时间不可直接 `Date.now()`：domain 函数的当前时间一律由调用方以参数 `ts`（ms 时间戳）注入，便于测试跨零点等场景。

## 数据正确性红线（改代码前读一遍）

- 三个计数来源地位平等、全程留痕：`ring`（戒指）/ `phone`（手机）/ `manual`（手动填报）。
- **展示总数 = ring_raw + phone_raw + manual_total + Σadjustment（分来源修正）**。
- 同步按主键覆盖、**绝不追加**；覆盖前比较 `version`：新覆盖旧、相同忽略、旧者拒绝。
- `target_snapshot`（每日目标快照）**只写一次，永不覆盖**；修改目标次日生效；历史达标判断用当日快照。
- 填报 ≠ 修正：填报记"本次新增数量"（手动来源，可整笔撤销）；修正只许**减少**戒指/手机来源、必须标明来源，撤销修正 = 恢复。
- 零点只切日统计：本轮计数与提醒目标**跨零点继续**，不随日切丢失。
- 戒指日快照按键 `(device_id, epoch, date, practice_id)` 存储；`epoch` 只区分新旧归属，已同步历史永不作废。
- 计时型功课（禅坐）锁计数，只计时：归档记 `duration_min` 与 `times`。

## 首版不做（定了，别加）

共修/排行、早晚课、经文拼音、社交账号、独立早起闹钟、手机侧后台提醒（仅前台倒计时）、营销/预约/问卷页面。
P10 修正页必须有来源选择（戒指/手机）——UI 定稿线框缺这个控件，以本句为准。

## 目录

```text
miniprogram/            小程序根（project.config.json 的 miniprogramRoot）
  pages/                页面（编号见 UI 定稿 P1–P17）
  components/           通用组件
  services/
    domain/             纯业务逻辑（Node 可测，禁 wx.*）
    storage/            wx 缓存封装
    ble/                BLE 抽象：mock-adapter.js / wechat-adapter.js
  utils/
cloudfunctions/         阶段3：云函数
test/                   Node 单测（node --test）
docs/                   设计定稿
```

## 当前阶段

- 阶段 0–1（进行中）：骨架 + domain 业务层 + 单测。验收：不开 UI 也能用测试数据验证全部统计口径。
- 之后依次：阶段2 无戒指页面 → 阶段3 微信登录+云同步 → 阶段4 BLE（mock 先行）→ 阶段5 联调。

## 其他

- UI 面向老年用户：大字号、大按钮、高对比。设计变量在 `app.wxss` 的 `:root`。
- 每完成一个模块跑一次 `npm test`，红了不进入下一模块。

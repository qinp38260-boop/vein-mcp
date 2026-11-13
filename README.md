# vein-mcp · 矿脉 VEIN

MCP server for [矿脉 VEIN](https://cloud.ygwws.xyz) — 中文**产业事实**检索。
返回的不是网页列表，而是带原文证据的结构化字段（价格 / 中标金额 / 产能 / 地区 / 企业）。

## 和通用搜索的区别

| 通用搜索 | vein_mcp |
|---|---|
| 10 条网页链接 + 摘要 | 结构化 facts：`{key, value, type, unit, evidence}` |
| 摘要可能概括失真 | 每个数值带原文句子，可直接引用 |
| 需要自己再看一遍 | 抽不到就返回 `null`，**不编造** |

## 安装

```bash
npx -y vein-mcp
```

需要一个免费 key（每月 1000 次）：https://cloud.ygwws.xyz/signup

## 客户端配置

**Claude Desktop / Cursor / Cherry Studio（stdio）**

```json
{
  "mcpServers": {
    "vein": {
      "command": "npx",
      "args": ["-y", "vein-mcp"],
      "env": {
        "VEIN_API_TOKEN": "vein_你的key"
      }
    }
  }
}
```

**已支持 HTTP 的客户端**可直接连远程，不必装包：

```
https://cloud.ygwws.xyz/mcp
Header: Authorization: Bearer vein_你的key
```

## 工具

| 工具 | 用途 |
|---|---|
| `vein_search` | 查价格 / 中标 / 产能 / 政策，返回带证据的结构化事实 |
| `vein_brief` | 深读：事实卡片 + 价格表（产品×月份）+ 原文片段 |
| `vein_fetch` | 抓指定 URL 的干净正文 |
| `vein_fields` | 字段字典（有哪些字段、类型、单位） |

## 示例

提问：`光伏组件最近中标价格怎么样`

```json
{
  "results": [{
    "title": "协鑫集成中标新疆第七师胡杨河市1GW组件采购订单",
    "facts": [
      {"key": "capacity_mw", "value": 1000, "type": "number", "unit": "MW",
       "evidence": "中标新疆第七师胡杨河市1GW组件采购订单"},
      {"key": "company", "value": "协鑫集成", "type": "string",
       "evidence": "协鑫集成中标..."}
    ]
  }]
}
```

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `VEIN_API_TOKEN` | ✅ | API key |
| `VEIN_BASE_URL` | | 默认 `https://cloud.ygwws.xyz` |

## 许可

本包代码 MIT。数据与检索服务受 DTL-1.0 约束：允许调用、内部使用、二次分析（免费额度内）；
转售原始数据、镜像服务、训练竞争模型需授权。

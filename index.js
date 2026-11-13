#!/usr/bin/env node
/**
 * 矿脉 VEIN MCP server (stdio)
 *
 * 把 https://cloud.ygwws.xyz 的产业事实检索能力暴露成 MCP 工具：
 *   vein_search   查价格/中标/产能/政策，返回带证据的结构化事实
 *   vein_brief    深读：事实卡片 + 价格表 + 原文片段
 *   vein_fetch    抓指定 URL 正文
 *   vein_fields   字段字典
 *
 * 环境变量：
 *   VEIN_API_TOKEN  必填，在 https://cloud.ygwws.xyz/signup 免费领取
 *   VEIN_BASE_URL   可选，默认 https://cloud.ygwws.xyz
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE = (process.env.VEIN_BASE_URL || "https://cloud.ygwws.xyz").replace(/\/+$/, "");
const TOKEN = process.env.VEIN_API_TOKEN || "";

function needToken() {
  if (!TOKEN) {
    throw new Error(
      "缺少环境变量 VEIN_API_TOKEN。请在 https://cloud.ygwws.xyz/signup 免费领取（每月 1000 次），" +
        "然后在 MCP 客户端的环境变量里配置 VEIN_API_TOKEN=vein_xxx"
    );
  }
}

async function api(path, { method = "GET", params, body } = {}) {
  needToken();
  let url = BASE + path;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += "?" + s;
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 4000) };
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || text.slice(0, 300);
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return data;
}

const TOOLS = [
  {
    name: "vein_search",
    description: [
      "查询中文产业数据：产品价格与行情、中标金额与中标方、产能/装机/产量、产业政策通知。",
      "返回结构化事实数组 facts=[{key,value,type,unit,evidence}]，evidence 是该数值在原文中的句子，可直接引用核验。",
      "与通用网页搜索的区别：给数值不是给链接，给证据不是给摘要。",
      "不适用：代码问题、娱乐内容、通用常识——这些请用通用搜索。",
    ].join("\n"),
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "用户问题，例如「光伏组件最近价格」「PCR仪中标金额」" },
        limit: { type: "integer", description: "返回条数，默认 5；对比多来源时用 10", default: 5 },
        verbosity: {
          type: "string",
          enum: ["lean", "full"],
          description: "lean 精简省 token（默认）；full 返回完整字段",
          default: "lean",
        },
        evidence: {
          type: "integer",
          enum: [0, 1, 2],
          description: "证据句：0 不返回、1 只返回含数值的分句（默认）、2 整句",
          default: 1,
        },
        time_range: {
          type: "string",
          enum: ["day", "week", "month", "year"],
          description: "时间范围，用户问「最近」「本月」时使用",
        },
        include_domains: { type: "string", description: "限定来源域名，逗号分隔" },
        exclude_domains: { type: "string", description: "排除来源域名，逗号分隔" },
      },
      required: ["q"],
    },
  },
  {
    name: "vein_brief",
    description:
      "产业问题深读：返回事实卡片 cards、价格表 price_table（产品×月份聚合的行情）、原文片段。" +
      "适合「今年光伏组件中标价走势」这类需要多源汇总的问题，比 vein_search 更重。",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "用户问题" },
        k: { type: "integer", description: "返回文档数，默认 3", default: 3 },
      },
      required: ["q"],
    },
  },
  {
    name: "vein_fetch",
    description:
      "抓取指定网页的干净正文（已去除导航栏与广告）。已知具体 URL 时用；搜索请用 vein_search。",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "目标网页地址" },
      },
      required: ["url"],
    },
  },
  {
    name: "vein_fields",
    description:
      "获取字段字典：有哪些字段、类型、单位（如 amount_wan=金额/万元、capacity_tpd=熟料产能/吨日）。解释字段含义前调用一次即可缓存。",
    inputSchema: { type: "object", properties: {} },
  },
];

const server = new Server(
  { name: "vein-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    let data;
    if (name === "vein_search") {
      data = await api("/v1/search", { params: args });
    } else if (name === "vein_brief") {
      data = await api("/v2/brief", { method: "POST", body: args });
    } else if (name === "vein_fetch") {
      data = await api("/v1/extract", { method: "POST", body: args });
    } else if (name === "vein_fields") {
      data = await api("/v1/schema/fields");
    } else {
      return { content: [{ type: "text", text: `未知工具: ${name}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  } catch (e) {
    return {
      content: [{ type: "text", text: `调用失败: ${e.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

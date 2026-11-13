// 真实端到端测试：用 MCP SDK 的 Client 通过 stdio 连接本地 server，列工具 + 调一次检索
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["D:/openlib/vein-mcp/index.js"],
  env: { ...process.env, VEIN_API_TOKEN: process.env.VEIN_API_TOKEN || "" },
});

const client = new Client({ name: "vein-test-client", version: "0.0.1" }, { capabilities: {} });
await client.connect(transport);

const tools = await client.listTools();
console.log("工具列表:", tools.tools.map((t) => t.name).join(", "));

const r1 = await client.callTool({
  name: "vein_search",
  arguments: { q: "光伏组件 中标 价格", limit: 2, verbosity: "lean" },
});
const txt1 = r1.content?.[0]?.text || "";
console.log("\n--- vein_search ---");
console.log("返回长度:", txt1.length, "字符 | isError:", !!r1.isError);
try {
  const d = JSON.parse(txt1);
  console.log("backend:", d.backend, "| 结果数:", (d.results || []).length);
  for (const x of (d.results || []).slice(0, 2)) {
    console.log("  ·", (x.title || "").slice(0, 34), "| facts:", (x.facts || []).length);
  }
} catch {
  console.log("非 JSON:", txt1.slice(0, 200));
}

const r2 = await client.callTool({ name: "vein_fields", arguments: {} });
const txt2 = r2.content?.[0]?.text || "";
console.log("\n--- vein_fields ---");
console.log("返回长度:", txt2.length, "| isError:", !!r2.isError, "|", txt2.slice(0, 120).replace(/\n/g, " "));

await client.close();

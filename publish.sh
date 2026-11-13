#!/usr/bin/env bash
# 矿脉 VEIN npm 发版 + 校验（用户 npm login 之后执行本脚本即可）
set -e
cd /d/openlib/vein-mcp
REG=https://registry.npmjs.org

echo "== 1. 身份 =="
npm whoami --registry=$REG || { echo "未登录，先执行: npm login --auth-type=web --registry=$REG"; exit 1; }

echo "== 2. 发包 =="
npm publish --registry=$REG --access public

echo "== 3. 校验线上包 =="
sleep 3
npm view vein-mcp version dist.tarball --registry=$REG

echo "== 4. 完成 =="
echo "接下来把魔搭 Stdio 配置改为:"
echo '  {"mcpServers":{"vein":{"command":"npx","args":["-y","vein-mcp"],"env":{"VEIN_API_TOKEN":"vein_你的key"}}}}'

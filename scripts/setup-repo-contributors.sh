#!/usr/bin/env bash
# 为单个 git 仓库：安装 anti-coauthor 钩子、清理历史、提交并 force push
set -euo pipefail

REPO_PATH="${1:?用法: setup-repo-contributors.sh /path/to/repo [branch]}"
BRANCH="${2:-main}"

HOOK_SRC="/Users/kusuri_mizuki/myProject/x0a/.githooks/commit-msg"
STRIP_SRC="/Users/kusuri_mizuki/myProject/x0a/scripts/strip-cursor-coauthor.sh"
RULE_SRC="/Users/kusuri_mizuki/myProject/x0a/.cursor/rules/git-no-coauthor.mdc"

cd "$REPO_PATH"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "跳过（非 git 仓库）: $REPO_PATH" >&2
  exit 1
fi

mkdir -p .githooks scripts .cursor/rules
cp "$HOOK_SRC" .githooks/commit-msg
cp "$STRIP_SRC" scripts/strip-cursor-coauthor.sh
cp "$RULE_SRC" .cursor/rules/git-no-coauthor.mdc
chmod +x .githooks/commit-msg scripts/strip-cursor-coauthor.sh
git config core.hooksPath .githooks

COAUTHOR_COUNT=$(git log --all --format=%B | grep -c '^Co-authored-by: Cursor <cursoragent@cursor.com>$' || true)

if [ "$COAUTHOR_COUNT" -gt 0 ]; then
  echo "[$REPO_PATH] 发现 $COAUTHOR_COUNT 处 Cursor 共著，重写历史…"
  FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter \
    "grep -v '^Co-authored-by: Cursor <cursoragent@cursor.com>\$'" \
    -- --all
fi

# 清理 filter-branch 备份
rm -rf .git/refs/original/ 2>/dev/null || true
git reflog expire --expire=now --all 2>/dev/null || true
git gc --prune=now --quiet 2>/dev/null || true

git add .githooks scripts/strip-cursor-coauthor.sh .cursor/rules/git-no-coauthor.mdc 2>/dev/null || true

if ! git diff --cached --quiet; then
  git commit -m "$(cat <<'EOF'
chore: 禁止 Cursor 共著并保持 Contributors 仅维护者

添加 commit-msg 钩子、历史清理脚本与 Cursor 规则。
EOF
)"
fi

echo "[$REPO_PATH] 推送到 origin/$BRANCH …"
git push --force origin "$BRANCH"
echo "[$REPO_PATH] 完成"

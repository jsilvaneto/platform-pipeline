#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$PROJECT_ROOT/VERSION"
PACKAGE_JSON="$PROJECT_ROOT/frontend/package.json"
CHANGELOG_FILE="$PROJECT_ROOT/CHANGELOG.md"
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"

CURRENT_VERSION=$(cat "$VERSION_FILE" 2>/dev/null | tr -d ' \r\n' || echo "1.0.0")

if [ -z "$1" ]; then
    echo "================================================================="
    echo "  🏷️  SCRIPT DE ATUALIZAÇÃO DE VERSÃO (BUMP VERSION)"
    echo "================================================================="
    echo "  Versão atual: v$CURRENT_VERSION"
    echo ""
    echo "  Uso:"
    echo "    ./scripts/bump-version.sh patch    (ex: 1.0.1 -> 1.0.2)"
    echo "    ./scripts/bump-version.sh minor    (ex: 1.0.1 -> 1.1.0)"
    echo "    ./scripts/bump-version.sh major    (ex: 1.0.1 -> 2.0.0)"
    echo "    ./scripts/bump-version.sh 1.2.0    (define versão exata)"
    echo "================================================================="
    exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
TARGET="$1"

if [ "$TARGET" = "patch" ]; then
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
elif [ "$TARGET" = "minor" ]; then
    NEW_MINOR=$((MINOR + 1))
    NEW_VERSION="$MAJOR.$NEW_MINOR.0"
elif [ "$TARGET" = "major" ]; then
    NEW_MAJOR=$((MAJOR + 1))
    NEW_VERSION="$NEW_MAJOR.0.0"
else
    # Versão informada manualmente
    NEW_VERSION="$TARGET"
fi

echo ">> Elevando versão: v$CURRENT_VERSION -> v$NEW_VERSION"

# 1. Atualiza arquivo VERSION
echo "$NEW_VERSION" > "$VERSION_FILE"
echo "   [✓] Atualizado: VERSION -> $NEW_VERSION"

# 2. Atualiza frontend/package.json
if [ -f "$PACKAGE_JSON" ]; then
    sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
    echo "   [✓] Atualizado: frontend/package.json -> $NEW_VERSION"
fi

# 3. Atualiza .env.example
if [ -f "$ENV_EXAMPLE" ]; then
    sed -i -E "s/APP_VERSION=[^\r\n]+/APP_VERSION=$NEW_VERSION/" "$ENV_EXAMPLE"
    echo "   [✓] Atualizado: .env.example -> $NEW_VERSION"
fi

# 4. Se existir .env local, atualiza também
if [ -f "$PROJECT_ROOT/.env" ]; then
    sed -i -E "s/APP_VERSION=[^\r\n]+/APP_VERSION=$NEW_VERSION/" "$PROJECT_ROOT/.env"
    echo "   [✓] Atualizado: .env -> $NEW_VERSION"
fi

# 5. Prepara esqueleto no CHANGELOG.md caso a versão ainda não esteja documentada
TODAY=$(date +"%Y-%m-%d")
if ! grep -q "## \[$NEW_VERSION\]" "$CHANGELOG_FILE"; then
    echo "   [*] Adicionando esqueleto da versão $NEW_VERSION ao CHANGELOG.md..."
    TEMP_CHANGELOG=$(mktemp)
    awk -v ver="$NEW_VERSION" -v dt="$TODAY" '
        /^## \[/ && !inserted {
            print "## [" ver "] - " dt "\n"
            print "### 🚀 Melhorias"
            print "- Descreva as melhorias aqui...\n"
            print "### 🛠️ Correções"
            print "- Descreva as correções aqui...\n"
            print "---\n"
            inserted = 1
        }
        { print }
    ' "$CHANGELOG_FILE" > "$TEMP_CHANGELOG"
    mv "$TEMP_CHANGELOG" "$CHANGELOG_FILE"
    echo "   [✓] Template adicionado ao CHANGELOG.md"
fi

# 6. Sincroniza cópias para backend caso necessário
if [ -d "$PROJECT_ROOT/backend" ]; then
    cp "$VERSION_FILE" "$PROJECT_ROOT/backend/VERSION" 2>/dev/null || true
    cp "$CHANGELOG_FILE" "$PROJECT_ROOT/backend/CHANGELOG.md" 2>/dev/null || true
    echo "   [✓] Sincronizado com backend/ (VERSION e CHANGELOG.md)"
fi

echo ""
echo "================================================================="
echo "  ✅ Versão v$NEW_VERSION configurada com sucesso!"
echo "================================================================="
echo "  Próximos passos sugeridos:"
echo "  1. Edite o CHANGELOG.md detalhando as melhorias e correções da versão."
echo "  2. Faça o commit e crie a tag no Git:"
echo "     git add VERSION frontend/package.json .env.example CHANGELOG.md"
echo "     git commit -m \"chore(release): v$NEW_VERSION\""
echo "     git tag -a \"v$NEW_VERSION\" -m \"Release v$NEW_VERSION\""
echo "     git push origin main --tags"
echo "================================================================="

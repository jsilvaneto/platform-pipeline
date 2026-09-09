import unittest
from app.services.changelog_service import ChangelogService
from app.schemas.system import VersionRelease, SystemVersionResponse
from app.core.config import settings


class TestChangelogAndVersioning(unittest.TestCase):
    """Testes unitários para o serviço de versionamento e parseamento de changelog."""

    def test_get_system_version_returns_valid_schema(self):
        """Verifica se get_system_version retorna resposta conforme schema Pydantic."""
        res = ChangelogService.get_system_version()
        self.assertIsInstance(res, SystemVersionResponse)
        self.assertEqual(res.current_version, settings.APP_VERSION)
        self.assertIsInstance(res.releases, list)
        self.assertGreater(len(res.releases), 0)

    def test_current_version_marked_correctly(self):
        """Garante que a versão corrente seja identificada com is_current=True."""
        releases = ChangelogService.get_releases()
        current_releases = [r for r in releases if r.is_current]
        self.assertEqual(len(current_releases), 1)
        self.assertEqual(current_releases[0].version, settings.APP_VERSION)

    def test_changelog_parses_improvements_and_fixes(self):
        """Verifica se melhorias e correções são extraídas do CHANGELOG.md."""
        releases = ChangelogService.get_releases()
        versions_map = {r.version: r for r in releases}

        # Verifica versão 1.0.1
        self.assertIn("1.0.1", versions_map)
        rel_101 = versions_map["1.0.1"]
        self.assertGreater(len(rel_101.improvements), 0)
        self.assertGreater(len(rel_101.fixes), 0)
        self.assertTrue(any("Versionamento" in imp for imp in rel_101.improvements))

        # Verifica versão 1.0.0
        self.assertIn("1.0.0", versions_map)
        rel_100 = versions_map["1.0.0"]
        self.assertGreater(len(rel_100.improvements), 0)

    def test_parse_custom_markdown_content(self):
        """Testa o parser com conteúdo markdown customizado."""
        custom_md = """
# Changelog

## [2.5.0] - 2026-10-15
Destaque da versão 2.5.0 para testes.

### 🚀 Novidades
- Nova feature de inteligência financeira
- Exportação em PDF

### 🛠️ Correções
- Correção de bug no layout mobile
"""
        releases = ChangelogService._parse_changelog_content(custom_md)
        self.assertEqual(len(releases), 1)
        self.assertEqual(releases[0].version, "2.5.0")
        self.assertEqual(releases[0].release_date, "2026-10-15")
        self.assertEqual(releases[0].highlights, "Destaque da versão 2.5.0 para testes.")
        self.assertEqual(len(releases[0].improvements), 2)
        self.assertEqual(len(releases[0].fixes), 1)
        self.assertEqual(releases[0].improvements[0], "Nova feature de inteligência financeira")
        self.assertEqual(releases[0].fixes[0], "Correção de bug no layout mobile")

    def test_fallback_releases_format(self):
        """Verifica se os dados de fallback são válidos e contêm a versão atual."""
        fallback = ChangelogService._get_fallback_releases()
        self.assertEqual(len(fallback), 1)
        self.assertEqual(fallback[0].version, settings.APP_VERSION)
        self.assertTrue(fallback[0].is_current)
        self.assertGreater(len(fallback[0].improvements), 0)

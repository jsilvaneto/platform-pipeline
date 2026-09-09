import re
from pathlib import Path
from app.core.config import settings
from app.schemas.system import VersionRelease, SystemVersionResponse


class ChangelogService:
    """Serviço responsável por ler, parsear e disponibilizar o histórico de versões do Wallet."""

    @classmethod
    def _find_changelog_path(cls) -> Path | None:
        candidate_paths = [
            Path(__file__).resolve().parents[2] / "CHANGELOG.md",  # backend/CHANGELOG.md
            Path(__file__).resolve().parents[3] / "CHANGELOG.md",  # root/CHANGELOG.md
            Path("/app/CHANGELOG.md"),                              # docker /app/CHANGELOG.md
        ]
        for path in candidate_paths:
            if path.is_file():
                return path
        return None

    @classmethod
    def _parse_changelog_content(cls, content: str) -> list[VersionRelease]:
        releases: list[VersionRelease] = []
        current_release: VersionRelease | None = None
        current_section: str | None = None
        highlight_lines: list[str] = []

        lines = content.splitlines()
        version_pattern = re.compile(
            r"^##\s*\[?([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.]+)?)\]?\s*(?:-\s*([0-9]{4}-[0-9]{2}-[0-9]{2}))?"
        )

        for line in lines:
            line_str = line.strip()

            # Identifica novo bloco de versão (ex: ## [1.0.1] - 2026-09-08)
            ver_match = version_pattern.match(line_str)
            if ver_match:
                if current_release is not None:
                    if highlight_lines:
                        current_release.highlights = " ".join(highlight_lines).strip()
                    releases.append(current_release)

                ver = ver_match.group(1)
                dt = ver_match.group(2) or ""
                current_release = VersionRelease(
                    version=ver,
                    release_date=dt,
                    is_current=(ver == settings.APP_VERSION),
                    highlights=None,
                    improvements=[],
                    fixes=[],
                )
                current_section = None
                highlight_lines = []
                continue

            if current_release is None:
                continue

            # Identifica seções dentro da versão
            if line_str.startswith("###"):
                lower = line_str.lower()
                if any(k in lower for k in ["melhoria", "novidade", "adicionado", "feature", "🚀"]):
                    current_section = "improvements"
                elif any(k in lower for k in ["correç", "corrigido", "fix", "ajuste", "🛠️"]):
                    current_section = "fixes"
                elif any(k in lower for k in ["técnico", "tecnico", "infra", "⚙️"]):
                    # Mudanças técnicas são agrupadas em melhorias
                    current_section = "improvements"
                else:
                    current_section = "improvements"
                continue

            # Captura itens com bullet
            if line_str.startswith(("- ", "* ")):
                item_text = line_str[2:].strip()
                if item_text:
                    if current_section == "fixes":
                        current_release.fixes.append(item_text)
                    else:
                        current_release.improvements.append(item_text)
                continue

            # Captura texto de resumo/destaque antes da primeira seção
            if current_section is None and line_str and not line_str.startswith("#") and not line_str.startswith("---"):
                highlight_lines.append(line_str)

        # Adiciona a última versão processada
        if current_release is not None:
            if highlight_lines:
                current_release.highlights = " ".join(highlight_lines).strip()
            releases.append(current_release)

        return releases

    @classmethod
    def _get_fallback_releases(cls) -> list[VersionRelease]:
        """Retorna histórico de fallback estruturado caso o arquivo CHANGELOG.md não esteja acessível."""
        return [
            VersionRelease(
                version=settings.APP_VERSION,
                release_date="2026-09-08",
                is_current=True,
                highlights="Gestão financeira pessoal com suporte a changelog e visualização integrada.",
                improvements=[
                    "Sistema de Versionamento & Changelog com visualização no sistema e Git",
                    "Exibição da versão ativa no cabeçalho e rodapé da aplicação",
                    "Visualização tabular e edição de Categorias e Formas de Pagamento",
                ],
                fixes=[
                    "Validação de confirmação de senha na tela de configurações",
                    "Garantia de distribuição precisa de centavos residuais",
                ],
            )
        ]

    @classmethod
    def get_releases(cls) -> list[VersionRelease]:
        """Retorna todas as versões catalogadas do changelog."""
        path = cls._find_changelog_path()
        if not path:
            return cls._get_fallback_releases()

        try:
            content = path.read_text(encoding="utf-8")
            releases = cls._parse_changelog_content(content)
            if not releases:
                return cls._get_fallback_releases()
            return releases
        except Exception:
            return cls._get_fallback_releases()

    @classmethod
    def get_system_version(cls) -> SystemVersionResponse:
        """Retorna a versão corrente do sistema acompanhada de suas notas de lançamento."""
        releases = cls.get_releases()
        current_release = next((r for r in releases if r.is_current), None)
        release_date = current_release.release_date if current_release else None

        return SystemVersionResponse(
            current_version=settings.APP_VERSION,
            app_name=settings.APP_NAME,
            environment=settings.ENVIRONMENT,
            release_date=release_date,
            releases=releases,
        )

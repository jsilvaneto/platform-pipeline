# ADR 003: Foco Exclusivo em Finanças Pessoais e Remoção do Escopo Corporativo/PJ

## Status
Aprovado

## Contexto
O projeto **Wallet** foi originalmente concebido sobre um boilerplate contendo diretrizes que previam suporte híbrido a finanças pessoais e empresariais, com uma regra de isolamento rígido de perfis (`PESSOAL` vs `EMPRESA`) e obrigatoriedade de campos `profile` em todas as tabelas financeiras.

Com o amadurecimento dos requisitos de negócio, definiu-se que o produto será **estritamente voltado para a gestão de finanças pessoais** (indivíduos e famílias). A manutenção de infraestrutura, regras contábeis PJ, múltiplos perfis e filtros artificiais de segregação corporativa introduziria complexidade desnecessária, fricção na experiência do usuário e sobrecarga no modelo de dados.

## Decisão
1. **Foco Único em Finanças Pessoais**:
   - O sistema é dedicado integralmente a contas bancárias pessoais, despesas e receitas domésticas, orçamentos individuais e metas pessoais de economia.
   - Qualquer funcionalidade, tela ou modelo destinado a pessoas jurídicas (PJ), empresas, centros de custo corporativos ou planos de contas empresariais está formalmente cancelada e não deve ser implementada.
2. **Eliminação do Conceito de Perfil (`profile`)**:
   - As entidades financeiras futuras (Contas, Transações, Categorias, Orçamentos) **não terão** a coluna `profile: str` (`PESSOAL` vs `EMPRESA`).
   - A posse e isolamento dos dados ocorrem diretamente via chave estrangeira `user_id` vinculada ao usuário autenticado (`User.id`).
3. **Atualização das Diretrizes dos Agentes de IA**:
   - As skills `financial-domain-guard` (`.agents/skills/financial-domain-guard/SKILL.md` e `skills/financial-domain-guard.md`) foram saneadas para remover menções a empresas e focar na integridade monetária (`amount_cents: int`) e segurança pessoal por usuário.
   - A documentação de contexto em `.ai/CONTEXT.md` e checklist em `.ai/STATUS.md` foram alinhadas para refletir essa diretriz de produto.

## Consequências
- **Positivas**:
  - Modelo de dados simplificado, sem necessidade de joins ou filtros condicionais de perfis corporativos.
  - Interface do usuário mais limpa, intuitiva e focada na jornada do indivíduo (sem alternador de perfil pessoal/empresa no cabeçalho ou nas telas).
  - Prevenção de regras contábeis complexas (retenções tributárias corporativas, DRE, conciliação PJ) que não agregavam valor ao objetivo do usuário final.
- **Considerações**:
  - Se no futuro houver necessidade de recursos corporativos, estes deverão ser desenvolvidos em um produto ou módulo independente com arquitetura contábil própria.

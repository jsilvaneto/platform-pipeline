---
trigger: always_on
---

# Política de Resíduo Zero em Testes e Configurações (test_data_cleanup.md)

Esta diretriz é mandatória para qualquer desenvolvedor ou Agente de IA trabalhando neste repositório.

## 1. Princípio do Resíduo Zero
É terminantemente proibido deixar dados de teste, registros descartáveis, entidades de validação ou arquivos temporários no banco de dados ou no sistema de arquivos após a conclusão de qualquer teste de função, endpoint, script ou configuração.

## 2. Isolamento de Banco de Dados
Sempre que for necessário testar uma funcionalidade, rota ou modelo:
1. **Preferência por Transações com Rollback**:
   - Em testes de serviços, funções ou scripts Python com SQLAlchemy, execute as operações dentro de uma transação e aplique `await session.rollback()` ao final, evitando qualquer persistência real no banco.
2. **Padrão Obrigatório `try...finally` para Persistência**:
   - Se o teste exigir persistência (`commit`) para validação via requisições HTTP reais ou integração de ponta a ponta:
     - Colete e registre explicitamente os identificadores (`id`) de todos os registros criados.
     - Envolva o bloco de asserções em `try...finally`.
     - No bloco `finally`, execute a deleção imediata de todos os registros gerados (ex: `await session.execute(delete(Model).where(Model.id.in_(created_ids)))` e `await session.commit()`, ou chamadas aos respectivos endpoints `DELETE`).
3. **Proibição de Registros Órfãos**:
   - Nunca deixe usuários fictícios (ex: `teste_user`, `temp_admin`), transações fake ou itens de demonstração gravados no banco de dados de desenvolvimento ou produção.

## 3. Limpeza do Sistema de Arquivos
1. **Arquivos Temporários e Scratches**:
   - Qualquer arquivo criado temporariamente para testes de configuração, dumps, fixtures locais ou scripts pontuais deve ser excluído assim que o teste terminar.
   - Não versione nem deixe arquivos como `test_temp.json`, `debug.log` ou `temp_script.py` na raiz ou subdiretórios do projeto.
2. **Variáveis de Ambiente Temporárias**:
   - Caso altere arquivos `.env` ou configurações para testes, restaure o estado original imediatamente após a validação.

## 4. Auditoria e Confirmação
Ao concluir qualquer teste que tenha manipulado dados, o Agente de IA deve atestar explicitamente no seu relatório que todos os dados e arquivos temporários criados para a validação foram devidamente limpos e removidos.

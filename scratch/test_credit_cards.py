import asyncio
import sys
import os
from datetime import date

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import select, delete
from app.database import AsyncSessionLocal, engine, Base
from app.models import CreditCard, Account, Category, Transaction, Schedule
from app.main import migrate_database_schema, seed_initial_data
from app.schemas.schedule import ScheduleCreate
from app.schemas.credit_card import CreditCardInvoiceSettleRequest
from app.services.credit_card_service import (
    calculate_invoice_period_and_due_date,
    calculate_card_limits,
    get_card_invoices_summary,
    get_invoice_detail,
    settle_card_invoice,
    unsettle_card_invoice,
    sync_card_invoice_transaction
)
from app.services.schedule_service import create_schedule_with_transactions

async def run_tests():
    print("Iniciando validação do módulo de Cartões de Crédito e Faturas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await migrate_database_schema()
    await seed_initial_data()

    async with AsyncSessionLocal() as db:
        # Limpeza preventiva de execuções anteriores
        old_cards = (await db.execute(select(CreditCard).where(CreditCard.name == "Nubank Black Teste"))).scalars().all()
        for oc in old_cards:
            await db.execute(delete(Transaction).where(Transaction.credit_card_id == oc.id))
            await db.delete(oc)
        old_accs = (await db.execute(select(Account).where(Account.name == "Conta Teste Itaú"))).scalars().all()
        for oa in old_accs:
            await db.delete(oa)
        await db.commit()

        # 1. Teste de cálculo de ciclo e vencimento
        # Compra dia 15/08 com fechamento 20 e vencimento 27 -> cai na fatura 08/2026 vencendo em 27/08/2026
        m, y, start, end, due = calculate_invoice_period_and_due_date(date(2026, 8, 15), 20, 27)
        assert (m, y) == (8, 2026), f"Esperado (8, 2026), obtido ({m}, {y})"
        assert due == "2026-08-27", f"Esperado 2026-08-27, obtido {due}"
        print("✓ Cálculo de compra antes do fechamento (15/08) correto: Fatura 08/2026, vence 27/08/2026")

        # Compra dia 22/08 com fechamento 20 e vencimento 27 ("melhor dia") -> cai na fatura 09/2026 vencendo em 27/09/2026
        m2, y2, start2, end2, due2 = calculate_invoice_period_and_due_date(date(2026, 8, 22), 20, 27)
        assert (m2, y2) == (9, 2026), f"Esperado (9, 2026), obtido ({m2}, {y2})"
        assert due2 == "2026-09-27", f"Esperado 2026-09-27, obtido {due2}"
        print("✓ Cálculo de compra após o fechamento (22/08) correto: Fatura 09/2026, vence 27/09/2026")

        # 2. Cria conta bancária para teste
        acc = Account(profile="PESSOAL", name="Conta Teste Itaú", type="CORRENTE")
        db.add(acc)
        await db.commit()
        await db.refresh(acc)

        # 3. Cria cartão de crédito para teste
        card = CreditCard(
            profile="PESSOAL",
            name="Nubank Black Teste",
            limit_cents=1000000, # R$ 10.000,00
            closing_day=20,
            due_day=27,
            color="purple",
            brand="MASTERCARD",
            account_id=acc.id
        )
        db.add(card)
        await db.commit()
        await db.refresh(card)
        print(f"✓ Cartão criado: {card.name} (Limite: R$ {card.limit_cents / 100:.2f})")

        # 4. Busca uma categoria de despesa
        cat = (await db.execute(select(Category).where(Category.profile == "PESSOAL", Category.type == "DESPESA"))).scalars().first()
        assert cat is not None, "Categoria não encontrada"

        # 5. Cria compra parcelada em 3x de R$ 200,00 no cartão
        sched_in = ScheduleCreate(
            profile="PESSOAL",
            type="DESPESA",
            account_id=acc.id,
            credit_card_id=card.id,
            category_id=cat.id,
            description="Smartphone Teste",
            schedule_type="PARCELADA",
            frequency="MENSAL",
            amount_cents=20000, # R$ 200,00 por parcela = R$ 600,00 total
            total_installments=3,
            start_date="2026-08-15",
            due_day=27
        )
        sched = await create_schedule_with_transactions(db, sched_in)
        print("✓ Parcelamento de 3x criado com sucesso")

        # 6. Verifica limites do cartão
        used, avail, cur_inv = await calculate_card_limits(db, card)
        assert used == 60000, f"Esperado limite usado 60000, obtido {used}"
        assert avail == 940000, f"Esperado limite disponível 940000, obtido {avail}"
        print(f"✓ Limites calculados: Usado = R$ {used/100:.2f}, Disponível = R$ {avail/100:.2f}")

        # 7. Verifica faturas geradas
        summaries = await get_card_invoices_summary(db, card)
        print(f"✓ Faturas encontradas: {len(summaries)}")
        for s in summaries:
            print(f"   -> Fatura {s.month:02d}/{s.year}: Total = R$ {s.total_cents/100:.2f}, Status = {s.status}")

        # 8. Detalhe da fatura 08/2026
        inv_detail = await get_invoice_detail(db, card, 2026, 8)
        assert inv_detail.total_cents == 20000, f"Esperado 20000 na fatura 08/2026, obtido {inv_detail.total_cents}"
        assert len(inv_detail.items) == 1
        print(f"✓ Detalhe fatura 08/2026: 1 item de R$ {inv_detail.total_cents/100:.2f} ({inv_detail.items[0].description})")

        # 9. Liquidação da fatura 08/2026
        settle_req = CreditCardInvoiceSettleRequest(
            account_id=acc.id,
            payment_date="2026-08-27",
            amount_cents=20000,
            notes="Pagamento teste fatura 08/2026"
        )
        settle_res = await settle_card_invoice(db, card, 2026, 8, settle_req)
        assert settle_res.total_settled_cents == 20000
        print(f"✓ Fatura 08/2026 liquidada com sucesso! Transação bancária ID: {settle_res.bank_transaction_id}")

        # 10. Verifica se o limite disponível foi recomposto
        used_after, avail_after, _ = await calculate_card_limits(db, card)
        assert used_after == 40000, f"Esperado usado 40000 após pagar 1 parcela, obtido {used_after}"
        assert avail_after == 960000, f"Esperado disponível 960000, obtido {avail_after}"
        print(f"✓ Limite recomposto após pagamento da fatura: Usado = R$ {used_after/100:.2f}, Disponível = R$ {avail_after/100:.2f}")

        # 11. Validação do lançamento consolidado da fatura em Lançamentos
        from app.api.v1.transactions import list_transactions
        from app.models import User

        test_user = User(id="test-user-id", username="test_admin", password_hash="hash")

        # Antes de liquidar a fatura de 09/2026, verifica se 'Fatura Nubank Black Teste - 09/2026' aparece PENDENTE no valor de R$ 200,00
        default_list = await list_transactions(profile="PESSOAL", include_card_expenses=False, db=db, _=test_user)
        inv_09 = next((t for t in default_list if t.description == f"Fatura {card.name} - 09/2026"), None)
        assert inv_09 is not None, "Lançamento da fatura 09/2026 não encontrado em Lançamentos"
        assert inv_09.amount_cents == 20000, f"Esperado R$ 200.00 na fatura 09/2026, obtido {inv_09.amount_cents}"
        assert inv_09.status == "PENDENTE", f"Esperado PENDENTE na fatura 09/2026, obtido {inv_09.status}"
        print(f"✓ Lançamento da Fatura 09/2026 presente em Lançamentos: Valor = R$ {inv_09.amount_cents/100:.2f}, Status = {inv_09.status}")

        # 12. Adiciona uma nova compra avulsa no cartão de R$ 75,00 para 09/2026 e verifica ajuste automático do valor
        new_card_purchase = Transaction(
            profile="PESSOAL",
            type="DESPESA",
            credit_card_id=card.id,
            category_id=cat.id,
            description="Jantar Teste",
            amount_cents=7500,
            due_date="2026-09-05",
            invoice_month=9,
            invoice_year=2026,
            status="PENDENTE"
        )
        db.add(new_card_purchase)
        await db.commit()
        await sync_card_invoice_transaction(db, card.id, 2026, 9)

        # Consulta Lançamentos novamente -> O valor da fatura 09/2026 deve ter subido para R$ 275,00
        default_list_updated = await list_transactions(profile="PESSOAL", include_card_expenses=False, db=db, _=test_user)
        inv_09_updated = next((t for t in default_list_updated if t.description == f"Fatura {card.name} - 09/2026"), None)
        assert inv_09_updated is not None
        assert inv_09_updated.amount_cents == 27500, f"Esperado R$ 275.00 após nova compra, obtido {inv_09_updated.amount_cents}"
        print(f"✓ Valor da fatura em Lançamentos ajustou automaticamente conforme o consumo aumentou: R$ {inv_09_updated.amount_cents/100:.2f}!")

        # 13. Verifica se a fatura 08/2026 (liquidada) aparece como CONCLUIDO
        inv_08 = next((t for t in default_list_updated if f"{card.name} - 08/2026" in t.description), None)
        assert inv_08 is not None, "Fatura 08/2026 não encontrada em Lançamentos"
        assert inv_08.status == "CONCLUIDO", f"Esperado CONCLUIDO para fatura 08/2026 liquidada, obtido {inv_08.status}"
        print(f"✓ Fatura 08/2026 liquidada aparece como CONCLUIDO em Lançamentos: R$ {inv_08.amount_cents/100:.2f}")

        # 14. As compras individuais do cartão NÃO devem aparecer soltas no extrato geral
        assert not any(t.id == new_card_purchase.id for t in default_list_updated), "Compra individual de cartão apareceu indevidamente solta em Lançamentos"
        print("✓ Compras individuais e parcelamentos detalhados permanecem exclusivos do menu do cartão!")

        # 15. Filtro por Cartão em Lançamentos (credit_card_id = card.id) -> Deve retornar apenas as Faturas Consolidadas, sem duplicar com compras avulsas!
        card_filtered_default = await list_transactions(profile="PESSOAL", credit_card_id=card.id, include_card_expenses=False, db=db, _=test_user)
        for t in card_filtered_default:
            assert t.is_invoice_payment == 1, f"Lançamento {t.description} retornado com is_invoice_payment != 1 ao filtrar por cartão"
        print(f"✓ Filtro de cartão em Lançamentos retornou apenas as faturas consolidadas ({len(card_filtered_default)} faturas), sem duplicatas!")

        # Cleanup
        await db.delete(new_card_purchase)
        await db.delete(card)
        await db.delete(acc)
        await db.execute(delete(Transaction).where(Transaction.schedule_id == sched.id))
        await db.delete(sched)
        await db.commit()
        print("✓ Limpeza de dados de teste concluída.")

    print("\n✓ TODOS OS TESTES BACKEND DE CARTÕES DE CRÉDITO E FATURAS PASSARAM COM 100% DE SUCESSO!")

if __name__ == "__main__":
    asyncio.run(run_tests())

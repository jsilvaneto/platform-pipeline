import os
import sys
import tempfile
import requests

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.attachment_service import normalize_storage_path, DEFAULT_ATTACHMENT_DIR

def run_tests():
    print("==================================================")
    print("🚀 INICIANDO BATERIA DE TESTES DE VALIDAÇÃO v1.0.2")
    print("==================================================")

    # 1. Testes unitários de normalize_storage_path
    print("\n--- 1. Teste de Normalização de Caminhos de Armazenamento ---")
    p1 = "C:\\Users\\usuario\\financeiro"
    norm1 = normalize_storage_path(p1)
    print(f"Windows Backslash: '{p1}' -> '{norm1}'")
    assert norm1 == "/mnt/c/Users/usuario/financeiro", f"Falha na conversão: {norm1}"

    p2 = "d:/wallet/comprovantes"
    norm2 = normalize_storage_path(p2)
    print(f"Windows Forward Slash: '{p2}' -> '{norm2}'")
    assert norm2 == "/mnt/d/wallet/comprovantes", f"Falha na conversão: {norm2}"

    p3 = "   '/mnt/c/Users/nome/anexos'  "
    norm3 = normalize_storage_path(p3)
    print(f"Quoted string: '{p3}' -> '{norm3}'")
    assert norm3 == "/mnt/c/Users/nome/anexos", f"Falha na sanitização: {norm3}"

    print("✅ Todos os testes de normalização de caminhos passaram com sucesso!")

    # 2. Testes de API HTTP
    print("\n--- 2. Testes de Integração via API FastAPI ---")
    base_url = "http://localhost:8000/api/v1"
    
    with requests.Session() as s:
        # Login
        login_res = s.post(f"{base_url}/auth/login", data={"username": "admin", "password": "admin"})
        assert login_res.status_code == 200, f"Falha no login: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        s.headers.update(headers)
        print("✅ Autenticação realizada com sucesso.")

        # Teste Storage Dir endpoints
        print("\n--- Teste de Configuração de Diretório de Armazenamento ---")
        storage_get = s.get(f"{base_url}/attachments/storage-dir")
        assert storage_get.status_code == 200, f"Falha no GET storage-dir: {storage_get.text}"
        print(f"Diretório atual: {storage_get.json()['active_directory']}")

        # Teste de upload de anexo temporário
        print("\n--- Teste de Upload de Comprovante ---")
        dummy_content = b"TEST_COMPROVANTE_IMAGE_V102"
        files = {"file": ("test_comprovante_v102.jpg", dummy_content, "image/jpeg")}
        data = {"profile": "PESSOAL", "attachment_type": "NOTA_FISCAL"}
        
        upload_res = s.post(f"{base_url}/attachments/upload", files=files, data=data)
        assert upload_res.status_code == 201, f"Falha no upload: {upload_res.text}"
        att_data = upload_res.json()
        att_id = att_data["id"]
        print(f"✅ Anexo carregado com sucesso: ID={att_id}, tipo={att_data['attachment_type']}, nome={att_data['file_name']}")

        # Teste de Download e Preview de Arquivo
        preview_res = s.get(f"{base_url}/attachments/{att_id}/file")
        assert preview_res.status_code == 200, f"Falha no preview: {preview_res.text}"
        assert preview_res.content == dummy_content, "Conteúdo do preview não confere"
        print("✅ Endpoint /file respondeu com conteúdo íntegro.")

        # Teste de Criação de Transação Única com Status CONCLUIDO já na criação
        print("\n--- Teste de Novo Lançamento com Liquidação Imediata e Anexo ---")
        # Busca categoria de despesa
        cats_res = s.get(f"{base_url}/categories?profile=PESSOAL&type=DESPESA")
        assert cats_res.status_code == 200 and len(cats_res.json()) > 0
        cat_id = cats_res.json()[0]["id"]

        accs_res = s.get(f"{base_url}/accounts?profile=PESSOAL")
        acc_id = accs_res.json()[0]["id"] if accs_res.status_code == 200 and len(accs_res.json()) > 0 else None

        trans_payload = {
            "profile": "PESSOAL",
            "type": "DESPESA",
            "description": "TESTE_VALIDACAO_V102_LANCAMENTO",
            "amount_cents": 150050, # R$ 1.500,50
            "category_id": cat_id,
            "account_id": acc_id,
            "due_date": "2026-09-03",
            "status": "CONCLUIDO",
            "payment_date": "2026-09-03",
            "attachment_ids": [att_id]
        }

        create_trans_res = s.post(f"{base_url}/transactions", json=trans_payload)
        assert create_trans_res.status_code == 201, f"Falha ao criar transação: {create_trans_res.text}"
        trans_created = create_trans_res.json()
        trans_id = trans_created["id"]
        print(f"✅ Transação criada: ID={trans_id}, Valor={trans_created['amount_cents']} cents, Status={trans_created['status']}")
        assert trans_created["status"] == "CONCLUIDO", "Status deveria ser CONCLUIDO"
        assert len(trans_created["attachments"]) == 1, "Anexo deveria estar vinculado"
        assert trans_created["attachments"][0]["id"] == att_id, "ID do anexo vinculado não confere"

        # Teste de Criação de Parcelamento com Anexos
        print("\n--- Teste de Lançamento Parcelado com Anexo ---")
        files2 = {"file": ("test_comprovante_parcela.png", dummy_content, "image/png")}
        upload_res2 = s.post(f"{base_url}/attachments/upload", files=files2, data={"profile": "PESSOAL", "attachment_type": "COMPROVANTE"})
        assert upload_res2.status_code == 201
        att2_id = upload_res2.json()["id"]

        sched_payload = {
            "profile": "PESSOAL",
            "type": "DESPESA",
            "description": "TESTE_VALIDACAO_V102_PARCELADO",
            "amount_cents": 25000,
            "category_id": cat_id,
            "schedule_type": "PARCELADA",
            "frequency": "MENSAL",
            "total_installments": 2,
            "start_date": "2026-09-03",
            "due_day": 3,
            "attachment_ids": [att2_id]
        }

        create_sched_res = s.post(f"{base_url}/schedules", json=sched_payload)
        assert create_sched_res.status_code == 201, f"Falha ao criar schedule: {create_sched_res.text}"
        sched_created = create_sched_res.json()
        sched_id = sched_created["id"]
        print(f"✅ Schedule parcelado criado: ID={sched_id}")

        # Verifica se anexo foi vinculado à primeira parcela
        sched_trans_res = s.get(f"{base_url}/transactions?profile=PESSOAL&search=TESTE_VALIDACAO_V102_PARCELADO")
        assert sched_trans_res.status_code == 200
        sched_trans_list = sched_trans_res.json()
        assert len(sched_trans_list) >= 1
        first_p = [t for t in sched_trans_list if "(1/2)" in t["description"]][0]
        assert len(first_p["attachments"]) == 1, "Primeira parcela deveria conter o anexo vinculado"
        print("✅ Anexo vinculado com sucesso à primeira parcela materializada!")

        # LIMPEZA DOS DADOS DE TESTE (Conforme solicitado)
        print("\n--- 3. Limpeza Obrigatória dos Dados de Teste ---")
        # Remove transação única
        del_trans = s.delete(f"{base_url}/transactions/{trans_id}")
        print(f"Transação única {trans_id} removida: {del_trans.status_code}")

        # Remove parcelas e schedule
        for st in sched_trans_list:
            s.delete(f"{base_url}/transactions/{st['id']}")
        s.delete(f"{base_url}/schedules/{sched_id}")
        print(f"Schedule {sched_id} e parcelas removidas.")

        # Remove anexos de teste
        s.delete(f"{base_url}/attachments/{att_id}")
        s.delete(f"{base_url}/attachments/{att2_id}")
        print("Anexos de teste removidos do disco e do banco.")

    print("\n==================================================")
    print("🎉 TODOS OS TESTES FORAM EXECUTADOS E VALIDADOS COM SUCESSO!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()

import json
import os
import sys

# Adiciona o diretório backend ao sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.main import app
from app.database import Base
from sqlalchemy.schema import CreateTable, CreateIndex

def export_openapi():
    openapi_data = app.openapi()
    target_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.ai/openapi.json"))
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(openapi_data, f, indent=2, ensure_ascii=False)
    print(f"✓ OpenAPI exportado com sucesso para: {target_path}")

def export_schema():
    target_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.ai/schema.sql"))
    lines = [
        "-- ========================================================",
        "-- WALLET DATABASE SCHEMA (SQLite WAL)",
        "-- Consolidated Tables, Constraints and Indexes",
        "-- ========================================================",
        "",
        "PRAGMA foreign_keys = ON;",
        "PRAGMA journal_mode = WAL;",
        ""
    ]
    for table in Base.metadata.sorted_tables:
        create_table_sql = str(CreateTable(table).compile()).strip()
        lines.append(f"{create_table_sql};\n")
    
    for table in Base.metadata.tables.values():
        for index in table.indexes:
            create_index_sql = str(CreateIndex(index).compile()).strip()
            lines.append(f"{create_index_sql};\n")

    with open(target_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"✓ Schema SQL exportado com sucesso para: {target_path}")

if __name__ == "__main__":
    export_openapi()
    export_schema()

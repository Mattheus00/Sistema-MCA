import json
from pathlib import Path

transcript = Path(
    r"C:\Users\Matheus\.cursor\projects\c-Users-Matheus-TCC\agent-transcripts"
    r"\44558182-1dee-441d-afb9-58611ce2b11e\44558182-1dee-441d-afb9-58611ce2b11e.jsonl"
)
codigo_root = Path(r"c:\Users\Matheus\TCC\Codigo\Backend")
out_dir = Path(r"c:\Users\Matheus\TCC\_transcript_extract")

FILE_MAP = {
    "Cliente.java": codigo_root / "src/main/java/com/pucminas/sgi/entity/Cliente.java",
    "ClienteService.java": codigo_root / "src/main/java/com/pucminas/sgi/service/ClienteService.java",
    "ClienteRepository.java": codigo_root / "src/main/java/com/pucminas/sgi/repository/ClienteRepository.java",
    "ClienteController.java": codigo_root / "src/main/java/com/pucminas/sgi/controller/ClienteController.java",
    "ClienteDTO.java": codigo_root / "src/main/java/com/pucminas/sgi/dto/request/ClienteDTO.java",
    "ClienteResponseDTO.java": codigo_root / "src/main/java/com/pucminas/sgi/dto/response/ClienteResponseDTO.java",
    "ClienteServiceTest.java": codigo_root / "src/test/java/com/pucminas/sgi/service/ClienteServiceTest.java",
    "ClientesImportRunner.java": codigo_root / "src/main/java/com/pucminas/sgi/config/ClientesImportRunner.java",
    "ClienteCodigoMigration.java": None,
    "ClienteCpfCnpjNonUniqueMigration.java": None,
    "ClientesRelatorioImportRunner.java": None,
    "gerar_clientes_relatorio_csv.py": None,
    "mesclar_cpf_cnpj_clientes.py": None,
    "inspect_db.py": None,
}

ops_by_file = {k: [] for k in FILE_MAP}

for line_no, line in enumerate(transcript.read_text(encoding="utf-8").splitlines(), 1):
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        continue
    for part in obj.get("message", {}).get("content", []):
        if part.get("type") != "tool_use":
            continue
        if part.get("name") not in ("Write", "StrReplace"):
            continue
        inp = part.get("input", {})
        path = inp.get("path", "").replace("\\", "/")
        for fname in FILE_MAP:
            if fname in path:
                ops_by_file[fname].append(
                    {"tool": part["name"], "line_no": line_no, "path": path, "input": inp}
                )

out_dir.mkdir(exist_ok=True)

for fname, ops in ops_by_file.items():
    if not ops:
        continue
    content = None
    base = FILE_MAP[fname]
    if base and base.exists():
        content = base.read_text(encoding="utf-8")

    failed = []
    for op in ops:
        if op["tool"] == "Write":
            content = op["input"].get("contents", "")
        elif op["tool"] == "StrReplace":
            if content is None:
                failed.append(op["line_no"])
                continue
            old = op["input"].get("old_string", "")
            new = op["input"].get("new_string", "")
            if old in content:
                content = content.replace(old, new, 1)
            else:
                failed.append(op["line_no"])

    if content:
        out_path = out_dir / fname
        out_path.write_text(content, encoding="utf-8")
        print(
            f"{fname}: {len(ops)} ops, {len(failed)} failed -> {len(content)} chars"
        )
        if failed:
            print(f"  failed lines: {failed}")

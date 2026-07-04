import json
from pathlib import Path

transcript = Path(
    r"C:\Users\Matheus\.cursor\projects\c-Users-Matheus-TCC\agent-transcripts"
    r"\44558182-1dee-441d-afb9-58611ce2b11e\44558182-1dee-441d-afb9-58611ce2b11e.jsonl"
)
targets = [
    "ClienteCodigoMigration.java",
    "ClienteCpfCnpjNonUniqueMigration.java",
    "ClientesRelatorioImportRunner.java",
    "Cliente.java",
    "ClienteService.java",
    "ClienteRepository.java",
    "ClienteController.java",
    "ClienteDTO.java",
    "ClienteResponseDTO.java",
    "ClienteServiceTest.java",
    "clientes-relatorio.csv",
    "gerar_clientes_relatorio_csv.py",
    "mesclar_cpf_cnpj_clientes.py",
    "inspect_db.py",
    "ClientesImportRunner.java",
]
files = {t: [] for t in targets}
out_dir = Path(r"c:\Users\Matheus\TCC\_transcript_extract")
out_dir.mkdir(exist_ok=True)

for line_no, line in enumerate(transcript.read_text(encoding="utf-8").splitlines(), 1):
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        continue
    msg = obj.get("message", {})
    for part in msg.get("content", []):
        if part.get("type") != "tool_use":
            continue
        name = part.get("name")
        if name not in ("Write", "StrReplace"):
            continue
        inp = part.get("input", {})
        path = inp.get("path", "").replace("\\", "/")
        for t in targets:
            if t in path:
                files[t].append(
                    {"tool": name, "line_no": line_no, "path": path, "input": inp}
                )

for t, ops in files.items():
    print(f"=== {t}: {len(ops)} ops ===")
    for i, op in enumerate(ops):
        print(f"  {i+1}. {op['tool']} line {op['line_no']} -> {op['path']}")

# Reconstruct final content for Java/py files via sequential apply
def apply_ops(ops):
    content = None
    for op in ops:
        if op["tool"] == "Write":
            content = op["input"].get("contents", "")
        elif op["tool"] == "StrReplace" and content is not None:
            old = op["input"].get("old_string", "")
            new = op["input"].get("new_string", "")
            if old in content:
                content = content.replace(old, new, 1)
            else:
                print(f"  WARN: StrReplace failed at line {op['line_no']}")
    return content

for t in targets:
    ops = files[t]
    if not ops:
        continue
    final = apply_ops(ops)
    if final:
        safe = t.replace("/", "_")
        (out_dir / safe).write_text(final, encoding="utf-8")
        print(f"Wrote {safe} ({len(final)} chars, {len(ops)} ops)")

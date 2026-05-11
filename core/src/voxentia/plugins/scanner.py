import ast
from pathlib import Path
from typing import Optional, Dict, Any
from voxentia.utils.logging import logger

def extract_plugin_metadata_safe(plugin_path: Path) -> Optional[Dict[str, Any]]:
    """
    Extrahiert Plugin-Metadaten mittels AST-Parsing (keine Code-Ausführung).
    Sicher für Plugins von Drittanbietern.
    """
    # Wir suchen entweder in __init__.py oder plugin.py
    init_file = plugin_path / "__init__.py"
    if not init_file.exists():
        init_file = plugin_path / "plugin.py"
        
    if not init_file.exists():
        return None
    
    try:
        tree = ast.parse(init_file.read_text(encoding="utf-8"))
        metadata = {}
        
        for node in ast.walk(tree):
            # Wir suchen nach Zuweisungen an eine Variable namens 'metadata'
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "metadata":
                        if isinstance(node.value, ast.Call):
                            # Extrahiere Keyword-Argumente aus PluginMetadata(...)
                            for kw in node.value.keywords:
                                if isinstance(kw.value, (ast.Constant, ast.Str)):
                                    value = kw.value.value if hasattr(kw.value, 'value') else kw.value.s
                                    metadata[kw.arg] = value
                                elif isinstance(kw.value, ast.List):
                                    metadata[kw.arg] = [
                                        elt.value if hasattr(elt, 'value') else elt.s
                                        for elt in kw.value.elts
                                        if isinstance(elt, (ast.Constant, ast.Str))
                                    ]
        return metadata if metadata else None
    except Exception as e:
        logger.error(f"AST Parsing Fehler für {init_file}: {e}")
        return None

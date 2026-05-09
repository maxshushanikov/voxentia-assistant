import logging
import sys
from typing import Optional

def setup_logger(name: str, level: str = "INFO") -> logging.Logger:
    """Erstellt einen standardisierten Logger für den Voxentia-Core und Plugins."""
    
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Vermeide doppelte Handler
    if not logger.handlers:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
    return logger

# Globaler Framework-Logger
logger = setup_logger("voxentia")

"""Alembic migration environment — uses Voxentia DB_PATH from settings."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.core.database import Base  # noqa: E402
from app.models.chat import ChatMessage  # noqa: F401,E402
from app.models.experiment import ExperimentEvent  # noqa: F401,E402
from app.models.knowledge import KnowledgeEdge  # noqa: F401,E402
from app.models.memory import UserMemory  # noqa: F401,E402
from app.models.sentiment import SentimentRecord  # noqa: F401,E402
from app.models.session import ChatSessionMeta  # noqa: F401,E402
from app.core.config import settings  # noqa: E402

target_metadata = Base.metadata
config.set_main_option("sqlalchemy.url", settings.DB_PATH)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

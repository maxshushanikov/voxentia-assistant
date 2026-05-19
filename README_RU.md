# Voxentia — Модульный локальный ИИ-ассистент

> Конфиденциальный цифровой ассистент с 3D-аватаром, голосом, RAG по документам и плагинами. Работает локально через Docker.

**Языки:** [English](README.md) · [Deutsch](README_DE.md)

---

## Обзор

**React + Three.js** интерфейс, **FastAPI** бэкенд, оркестратор **voxentia-core**, плагины. **Ollama** (LLM), **Whisper** (STT), **Silero** (TTS). PDF → **ChromaDB** для RAG.

| Параметр | Значение |
|----------|----------|
| LLM | `phi3` (Ollama) |
| Языки | ru, en, de |
| API | `/api/v1` |
| UI | http://localhost |

---

## Возможности

| Область | Описание |
|---------|----------|
| **Чат** | Сессии, персонажи, история |
| **Голос** | Микрофон → Whisper; ответ → TTS + синхронизация губ |
| **Аватар** | 3D GLB, автоцентрирование в окне |
| **Документы** | PDF → RAG |
| **История** | Группы по времени; превью; **удаление чатов** |
| **Плагины** | Календарь, работа, обучение и др. |

---

## Быстрый старт

```bash
docker compose up --build
```

Откройте **http://localhost**

Разработка:

```bash
cd frontend && npm install && npm run dev
```

---

## Конфигурация

Скопируйте `.env.example` → `.env`

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `DEFAULT_MODEL` | `phi3` | Модель Ollama |
| `DEFAULT_LANGUAGE` | `en` | Язык |
| `TTS_URL` | `http://tts-server:5002` | TTS |
| `WHISPER_URL` | `http://whisper-server:5003` | STT |

Плагины: `backend/app/core/config/plugin_config.json`

---

## API

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/v1/chat` | Сообщение |
| `GET` | `/api/v1/sessions` | Список чатов |
| `DELETE` | `/api/v1/sessions/{id}` | Удалить чат |
| `DELETE` | `/api/v1/sessions` | Удалить всё |
| `POST` | `/api/v1/documents/upload` | PDF |

Документация: http://localhost:8000/docs

---

## Интерфейс

- **Боковая панель — История:** превью; **Показать все**; удаление (иконка корзины).
- **Аватар:** центрирован, занимает всю область просмотра.
- **Шапка:** язык, голос, личность.

---

## Разработка

```bash
pip install -e core && pip install -r backend/requirements.txt -r requirements-dev.txt
pytest tests/ -v
```

```bash
cd frontend && npm run test && npm run build
```

---

## Устранение неполадок

| Проблема | Решение |
|----------|---------|
| Нет голоса | Проверьте `tts-server` (healthy); логи backend; `audio_url` в ответе |
| Ollama | `docker compose logs ollama-init` |

---

## Лицензия

MIT License — © 2026 Voxentia Project.

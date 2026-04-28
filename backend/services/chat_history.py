from datetime import datetime, timedelta
from core.database import get_db
from models.chat import ChatMessage

def save_message(session_id, role, content):
    with get_db() as db:
        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content
        )
        db.add(message)

def get_history(session_id, limit=12):
    with get_db() as db:
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(
            ChatMessage.timestamp.desc()
        ).limit(limit).all()
        
        return [msg.to_dict() for msg in reversed(messages)]

def cleanup_old_messages(days=30):
    cutoff_date = datetime.now() - timedelta(days=days)
    with get_db() as db:
        db.query(ChatMessage).filter(
            ChatMessage.timestamp < cutoff_date
        ).delete()

def clear_history(session_id):
    with get_db() as db:
        db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).delete()
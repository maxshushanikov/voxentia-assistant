from sqlalchemy.orm import Session

from app.models.note import Note


class NoteService:
    def list_notes(self, db: Session, session_id: str | None = None, limit: int = 50, offset: int = 0):
        query = db.query(Note)
        if session_id:
            query = query.filter(Note.session_id == session_id)
        return query.order_by(Note.created_at.desc()).offset(offset).limit(limit).all()

    def create_note(self, db: Session, title: str, content: str, session_id: str | None = None):
        note = Note(title=title, content=content, session_id=session_id)
        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    def update_note(self, db: Session, note_id: int, title: str | None = None, content: str | None = None):
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            return None
        if title is not None:
            note.title = title
        if content is not None:
            note.content = content
        db.commit()
        db.refresh(note)
        return note

    def delete_note(self, db: Session, note_id: int):
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            return False
        db.delete(note)
        db.commit()
        return True

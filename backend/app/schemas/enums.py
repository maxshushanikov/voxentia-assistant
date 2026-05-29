from enum import Enum


class Language(str, Enum):
    EN = "en"
    DE = "de"
    RU = "ru"


class Personality(str, Enum):
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    ACADEMIC = "academic"
    DEVELOPER = "developer"
    TEACHER = "teacher"
    COACH = "coach"
    THERAPIST = "therapist"


class Speaker(str, Enum):
    BAYA = "baya"
    KSENIYA = "kseniya"
    EUGENE = "eugene"
    AIDAR = "aidar"

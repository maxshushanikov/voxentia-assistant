# Plugin-System Architektur

Voxentia nutzt ein modulares Plugin-System, das auf dem **Plugin-Host-Pattern** basiert.

## Komponenten

### 1. Plugin Base (`VoxentiaPlugin`)
Jedes Plugin muss von der `VoxentiaPlugin`-Basisklasse erben. Dies stellt sicher, dass der Core weiß, wie er das Plugin initialisieren und ansprechen kann.

### 2. Plugin Registry
Verwaltet den Lebenszyklus der Plugins (Laden, Initialisieren, Herunterfahren).

### 3. Orchestrator
Der Orchestrator ist das "Gehirn". Er nutzt ein LLM, um den Intent des Benutzers zu verstehen und die Anfrage an das richtige Plugin weiterzuleiten.

## Datenfluss

1. **User Message**: Benutzer sendet Nachricht an `/chat`.
2. **Intent Detection**: Orchestrator fragt LLM: "Was will der Nutzer?"
3. **Dispatching**: Orchestrator findet das Plugin, das für diesen Intent registriert ist.
4. **Execution**: Plugin verarbeitet die Anfrage (z.B. Websuche oder Jobsuche).
5. **Response**: Antwort wird an das Frontend zurückgegeben.

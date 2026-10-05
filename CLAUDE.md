# AT.UI.Ng

Repo con las librerías transversales de Apoyos Tecnológicos (`@at/*`).

## Flujo de trabajo
- Rama por tarea (`feature/...`, `fix/...`, `chore/...`); nunca commitear directo a `main`.
- Commits pequeños, mensaje en inglés, imperativo.
- Los PRs a `dev` y a `main` se integran con **squash merge** (un solo commit por PR). El título del PR pasa a ser el mensaje del commit: en inglés, imperativo. Después del merge se borra la rama y las siguientes se crean desde `dev`/`main` actualizado, sin reutilizar la rama squasheada.

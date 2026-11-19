# Hadas-vs-Monstruos
Juego educativo para Modelado y Simulación de Sistemas dinámicos

## Aplicación portable para Windows

Se necesita Node.js instalado para preparar y ejecutar el proyecto desde el código fuente.

```bash
npm install
npm start
```

Para generar el ejecutable portable de Windows (64 bits):

```bash
npm run dist
```

El archivo `Hadas-vs-Monstruos-Portable-1.0.2.exe` se genera en la carpeta `dist`. Se puede copiar y ejecutar en Windows sin instalar Node.js.
El empaquetado usa una carpeta temporal del sistema y luego copia el ejecutable a `dist`, para evitar bloqueos de sincronización en carpetas como OneDrive.

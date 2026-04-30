# Source icon

Coloca aquí el archivo `icon-source.png` (cualquier tamaño cuadrado,
preferentemente 256x256 o 512x512) y luego ejecuta:

```bash
npm run icons
```

El script genera `assets/icons/icon{16,32,48,128}.png` usando `sharp`
si está instalado, `imagemagick` si está en el sistema, o copias del
archivo fuente como placeholder en caso contrario.

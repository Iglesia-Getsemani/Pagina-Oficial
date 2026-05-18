# Paginas propias de ministerios

Crea aqui un archivo HTML con el mismo id del ministerio para reemplazar la vista base solo en ese ministerio.

Ejemplos:

- `educacion.html` reemplaza al ministerio con id `educacion`.
- `comunicacion.html` reemplaza al ministerio con id `comunicacion`.
- Si el archivo no existe, la app usa automaticamente `ministry.html`.

Tambien puedes abrir otro archivo desde codigo editando `MINISTRY_CUSTOM_PAGES` en `app.js`.
Si quieres reutilizar estilos y funciones de la plataforma desde una pagina en esta carpeta, enlaza asi:

```html
<link rel="stylesheet" href="../style.css">
<script src="../app.js"></script>
```

Como estas paginas viven dentro de `ministerios/`, los enlaces hacia paginas base tambien deben subir un nivel, por ejemplo `../index.html`, `../members.html` o `../setup.html`.
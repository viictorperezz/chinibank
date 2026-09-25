# ChiniBank

Casa de apuestas de prueba (solo frontend y con datos ficticios). HTML, CSS y JS puros, sin build.

## Cambiar el partido

Todo está en [`js/data.js`](js/data.js): jugadores, fecha, estado (`upcoming` / `live` / `finished`), marcador, mercados y cuotas.
Si pones `result: 'win' | 'lose' | 'void'` en una cuota, las apuestas se liquidan solas al abrir la web.

El saldo y las apuestas se guardan en el `localStorage` del navegador. Puedes reiniciarlos desde **Mis apuestas → Reiniciar datos demo**.

## Probar en local

```bash
npx serve .
# o
python -m http.server 8080
```

## Desplegar en GitHub Pages

1. Sube el contenido de esta carpeta a un repositorio.
2. En *Settings → Pages*, elige *Deploy from a branch*, rama `main`, carpeta `/ (root)`.

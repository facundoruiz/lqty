# La que tomo Yo!
<p align="center">
   <img src="src/img/logo.png" alt="La que tomo Yo! Logo" width="200">
</p>
**La que tomo Yo!** es una plataforma web que ofrece un catálogo de hierbas y mezclas naturales, diseñada para brindar información educativa y mejorar el bienestar natural.

## Características

- **Catálogo de productos:** Una variedad de mezclas y hierbas naturales mostradas dinámicamente desde Firebase.
- **Fichas informativas:** Información detallada sobre hierbas y mezclas, con capacidad de expandir más contenido.
- **Interfaz moderna y responsiva:** Diseñada con HTML, CSS y JavaScript.
- **Flexible y extendible:** Configuración simplificada mediante Webpack y Firebase.

## Tecnologías utilizadas

- **Frontend:** HTML, CSS (incluyendo Bootstrap Icons) y JavaScript.
- **Backend:** Firebase para autenticación y almacenamiento de datos.
- **Herramientas de construcción:** Webpack para empaquetar y optimizar los recursos.

## Configuración inicial

1. Clona este repositorio:
   ```bash
   git clone https://github.com/facundoruiz/lqty.git
   cd lqty
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno necesarias en un archivo `.env`:
   ```env
   FIREBASE_API_KEY=tu_api_key
   FIREBASE_AUTH_DOMAIN=tu_auth_domain
   FIREBASE_PROJECT_ID=tu_project_id
   FIREBASE_STORAGE_BUCKET=tu_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   FIREBASE_APP_ID=tu_app_id
   ```

4. Compila y lanza el servidor de desarrollo:
   ```bash
   npm run start
   ```

## Uso

- Navega a `http://localhost:8080` para ver el catálogo de hierbas y mezclas.
- Explora las secciones como "Mezclas/Hierbas" y "Fichas".

## Contribuir

1. Haz un fork del repositorio.
2. Crea una rama para tu función: `git checkout -b feature/nueva-funcionalidad`.
3. Haz commit de tus cambios: `git commit -m 'Agrega nueva funcionalidad'`.
4. Haz push a la rama: `git push origin feature/nueva-funcionalidad`.
5. Abre un pull request.

## Licencia

Este proyecto está licenciado bajo la MIT License. Consulta el archivo `LICENSE` para más detalles.

## Contacto

- **Instagram:** [@laquetomoyo](https://www.instagram.com/laquetomoyo)
- **Facebook:** [La que tomo Yo!](https://www.facebook.com/laquetomoyo)



firebase projects:list
$ firebase deploy --only hosting --project infusionary
# Unjam (WebRetos)

Plataforma de retos audiovisuales con límite de tiempo. Next.js + Supabase, estética CRT.

Producción: [https://www.unjam.es](https://www.unjam.es)

## Requisitos

- Node.js 20 o superior
- npm
- Un proyecto de Supabase (URL y anon key)

## Arrancar en local

1. Clona el repositorio y entra en la carpeta del proyecto:

```bash
git clone https://github.com/elcodo22/WebRetos.git
cd WebRetos
```

2. Instala dependencias:

```bash
npm install
```

3. Crea un archivo `.env.local` en la raíz con al menos:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Opcional (subida de vídeo y diccionario RAE):

```env
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
NEXT_PUBLIC_CLOUDFLARE_STREAM_MAX_DURATION_SECONDS=90
RAE_API_KEY=
```

4. Arranca el servidor de desarrollo:

```bash
npm run dev
```

5. Abre [http://localhost:3000](http://localhost:3000).

Si el puerto 3000 está ocupado, Next usará el siguiente (por ejemplo 3001). En ese caso cambia también `NEXT_PUBLIC_SITE_URL`.

## Otros comandos

```bash
npm run build   # Build de producción
npm run start   # Servir el build
npm run lint    # ESLint
```

## Auth en local

En Supabase → Authentication → URL Configuration:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback` y `http://localhost:3000/**`

Para producción usa `https://www.unjam.es` en lugar de localhost.

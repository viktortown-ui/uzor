# Mapbox setup для карты дельт

1. Создайте Mapbox public access token.
2. Локально добавьте его в `.env.local`:
   ```bash
   VITE_MAPBOX_ACCESS_TOKEN=pk_...
   VITE_MAPBOX_STYLE_URL=mapbox://styles/mapbox/dark-v11
   ```
3. В GitHub откройте `Settings → Secrets and variables → Actions → Variables`.
4. Создайте Repository Variable `VITE_MAPBOX_ACCESS_TOKEN`.
5. Выполните новый deploy GitHub Pages.
6. Public token будет встроен во frontend: не используйте secret token с расширенными правами.
7. Желательно ограничить token разрешёнными URL проекта в настройках Mapbox.

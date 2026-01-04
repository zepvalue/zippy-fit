---
description: How to start the LocalTunnel for backend access
---

Use this workflow when you want to expose your local backend (port 8000) to the internet so the mobile app can connect from ANY network (LAN or 5G).

1. **Start the Tunnel:**
   Run this in a separate terminal tab:
   ```bash
   npx localtunnel --port 8000
   ```
   *Copy the URL it gives you (e.g., `https://warm-cat-99.loca.lt`).*

2. **Get the Password:**
   The tunnel has a security page. To bypass it, you need your Public IP.
   Run this to see it:
   ```bash
   curl -s https://loca.lt/mytunnelpassword
   ```

3. **Update Mobile Config:**
   Open `mobile/.env` and paste your new URL:
   ```env
   EXPO_PUBLIC_API_URL="https://your-new-url.loca.lt"
   ```

4. **Restart Mobile App:**
   Kill the current process (`Ctrl+C`) and run:
   ```bash
   ./dev.sh
   ```

5. **Verify:**
   Open the App. If it navigates to the "Tunnel Password" page in the browser (or fails silently), open the Tunnel URL in your phone's browser and enter the password from Step 2.

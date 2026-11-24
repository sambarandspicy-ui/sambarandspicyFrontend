# Sambar & Spicy frontend

Install Node.js 22.22.2 or newer in the 22.x series (or a compatible newer version: 24.15.0+ or 26+), and pnpm. Run `pnpm install --frozen-lockfile` and `pnpm dev` from this directory. The project uses the pnpm lockfile, so use pnpm rather than npm to install dependencies. Open http://localhost:3000. The default mock mode stores demo data in this browser. Demo accounts are `admin`, `cashier`, `viewer`; initial password is `demo`. Reset Demo Data restores the seed and signs out. Never use mock credentials or localStorage auth in production.

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Copy `.env.example` to `.env.local` for configuration. HTTP mode and its proposed endpoint contracts are described in [BACKEND_INTEGRATION.md](docs/BACKEND_INTEGRATION.md); a Spring Boot server is not included.

For an optional responsive audit, start the dev server and run `pnpm test:viewport`. It uses installed Chrome on Windows; set `BROWSER_PATH` to a Chromium executable on other systems and `PREVIEW_URL` if the server is not on port 3000. Set `CAPTURE_VIEWPORT=1` to save screenshots.

## Windows Bluetooth receipt printer

The browser prints through the Windows printer driver; the app does not communicate directly with Bluetooth or ESC/POS. Pair the printer, install the manufacturer's Windows driver, and confirm a Windows test page prints. In **Settings → Bluetooth & devices → Printers & scanners**, turn off “Let Windows manage my default printer” and set the receipt printer as default. Select the matching 58mm or 80mm paper width both in the receipt preview and the driver's printer settings. BluPrints publishes its Windows drivers and Android utilities at https://bluprints.in/downloads/; verify compatibility with the exact printer model first.

Start the frontend server as usual, then in a separate PowerShell window from the `frontend` directory run:

```powershell
powershell -ExecutionPolicy Bypass -File .\launch-kiosk.ps1 -Setup
```

In this setup window, sign in, open a receipt, select the paper width, and choose **Print**. In the browser's print dialog select the receipt printer, its matching paper size, appropriate scale, and turn off **Headers and footers**. Print a test receipt. Close all windows using this kiosk profile, then start silent printing:

```powershell
powershell -ExecutionPolicy Bypass -File .\launch-kiosk.ps1
```

Use `-Browser Edge` with both commands to use Microsoft Edge, or `-Url https://your-pos-url/billing` with both commands for another deployment. Launch the same browser/profile each time. In kiosk mode the receipt preview remains in the app until **Print** submits to the browser's saved destination without the browser print dialog. The preview then closes; this does not confirm that printing succeeded, and the receipt can be reopened. All other browser print actions, including **Print A4 / Save PDF**, also use silent printing and the saved destination. Check the destination in setup mode again if the printer changes.

The launcher uses a separate persistent browser profile under `%LOCALAPPDATA%\SambarSpicy`. The frontend's demo data and login are local to the browser profile and origin, so an existing demo session and its bills will not automatically appear in this profile. A production backend should store shared data. Kiosk mode cannot confirm that paper was printed or control the printer's cutter; check the Windows print queue if a job fails. The receipt itself adds no watermark, but printer-driver trial marks or browser headers must be resolved in printer/browser settings. Some Bluetooth printers support only mobile apps or raw ESC/POS and lack a Windows print driver; this method requires a Windows printer that can print a test page.
## Customer menu and QR code

Guests can browse the read-only menu at `/menu` without a staff login. The backend endpoint `GET /api/v1/public/menu` returns only available dishes in active categories, their public prices and store contact details. The staff catalog, bills and admin APIs remain protected. Restart the updated backend and frontend together.

In Admin, open **Customer menu**, check the menu link, then download and print the QR code. Use a stable address that customers' phones can reach: `localhost` will not work, a private network address requires customers to be on that network, and an expired development tunnel will stop working. The link setting is saved in this browser; changing the address requires a new QR. In localStorage demo mode, each device has separate demo data, so use the shared HTTP backend for a real customer menu.


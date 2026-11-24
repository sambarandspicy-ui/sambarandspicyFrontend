# Direct receipt printing on Windows

1. Install the printer's Windows driver and select the receipt printer as the Windows default printer.
2. Configure the receipt paper size and any cut or feed options in that printer's Windows preferences.
3. Start the backend and frontend as usual. From the project root, run:

   ```powershell
   .\frontend\scripts\start-direct-print.ps1
   ```

4. Sign in in the new Chrome or Edge window. After payment, the app sends the receipt to that computer's default printer. Reprint actions do the same.

The launcher uses a separate browser profile and disables extensions in that window. It does not install a print service or use a third-party printing app. Other browser windows do not inherit these settings. Close every Sambar & Spicy receipt window before changing the default printer or relaunching the script.

The normal browser print dialog still appears if the app is opened without the launcher. Browser printing does not report whether paper actually came out; if the printer is offline or out of paper, check the Windows print queue and reprint from bill history when appropriate. The paid bill remains saved if printing fails.

## Android with RawBT

1. Install RawBT, pair the thermal printer, and configure and test it in RawBT. The printer must support the ESC/POS GS v 0 raster command. The receipt uses a 384-dot (58 mm) print width.
2. Open the billing app on the Android device. After payment or when reprinting, the app sends the receipt directly to RawBT without a printer-choice dialog or browser print preview.
3. RawBT or Android may still ask for permission or a printer confirmation, depending on their settings. The browser cannot verify whether RawBT opened or the printer produced paper; if necessary, check the printer and retry or use bill history.

RawBT controls its own printout notification: its Google Play listing says the licensed version removes it. This website cannot remove a mark added by RawBT or a printer driver.

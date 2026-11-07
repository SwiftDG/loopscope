# LoopScope

Browser-based control-system response analysis prototype. It accepts CSV data, validates the required columns, computes response measurements locally, visualizes the response, and exports a CSV analysis summary.

## Run in Git Bash (Windows)

```bash
cd ~/Downloads/davidg/PROJECTS/loopscope
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## Build for deployment

```bash
npm run build
npm run preview
```

## CSV format

Required headers (case-insensitive):

- `time` — strictly increasing numeric time values
- `setpoint` — target/reference value
- `value` — measured process value

Example file: `sample-response.csv`.

Aliases accepted: `timestamp`, `seconds`, `t`; `target`, `reference`, `sp`; `process_value`, `measurement`, `measured`, `pv`, `actual`.

## Current analysis definitions

- Overshoot: directional peak excursion beyond the final setpoint after the first detected setpoint change.
- Settling time: first timestamp after the detected step for which all remaining samples remain inside a band of ±2% of step amplitude (with a small numerical floor).
- Steady-state error: final setpoint minus the mean of the final 10% of samples.
- Crossings: number of sign changes around the final setpoint after the detected step.

These are prototype definitions and must be validated against independent engineering test cases before being presented as authoritative. Results are measurements of the supplied dataset; they do not certify plant safety or controller stability.

## Current limitations

- Step detection assumes one principal setpoint step.
- The CSV parser expects comma-separated fields and does not support quoted commas.
- Settling time uses a strict remaining-samples criterion; noisy signals may never settle.
- The export is a CSV summary, not a PDF report.
- No persistent storage or server backend; uploaded data stays in the browser.

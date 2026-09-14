# Correct salary payable and total days

## Changes
- Calculate payable days as **Present + Week Off** only, so the shown `8 P + 2 WO` becomes `10` payable days.
- Add an inclusive **Total Days** value for the selected date range, so `01/09/2026–13/09/2026` shows `13`.
- Display Total Days in the salary table and include it in Excel and PDF exports.
- Update the salary explanation to match the confirmed calculation.
- Keep the attendance summary consistent with the same payable-days rule.

## Verification
- Check the example period and status counts in the running app.
- Confirm exports receive the new Total Days column and the app remains error-free.

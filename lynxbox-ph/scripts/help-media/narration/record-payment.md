# Narration: Record a payment

The first column is a step name; `make-voiceover.ps1` looks up when that step happens in the
latest recording (`out/record-payment.json`). A `m:ss` time works too. Keep lines short so they
finish before the next step starts. The recording cancels instead of submitting, so the demo
account stays unchanged.

| Step | On screen | Narration |
| --- | --- | --- |
| start | Tenants list | "To record a payment, open the Tenants page." |
| icon | Cursor on the peso icon | "Click the peso icon on the tenant who paid." |
| dialog | Dialog opens | "The dialog shows what they still owe." |
| amount | Amount typed | "Enter the amount received." |
| method | Method set to Check | "Choose how they paid, such as check, bank, or cash." |
| note | Note typed | "Add a note, like the check number." |
| cancel | Cancel clicked (demo only) | "Then click Record Payment to save it." |

# Submission kit

## Project title

fastprok — a purchase that never stalls

## Short description

An agentic procurement workspace: describe a need in plain language, and the agent structures it, finds vendors, chases quotes, ranks every offer deterministically, and hands a human approver the final decision.

## Long description

Procurement drags because the work is coordination, not typing. Someone has to read the request, find the right vendors, send invitations, chase non-responders, compare quotes on inconsistent criteria, and keep a record of why the winner won.

fastprok does that coordination. The requester writes one paragraph. Vultr Serverless Inference turns it into structured fields and asks for anything missing. Rules match vendors by category, region, lead time, and reliability. Invitations go out in-app and by email. The agent reminds silent vendors when a quarter of the quote window remains, widens the pool once when there are too few quotes, then scores every quote on cost, speed, reliability, and warranty using weights that match the buyer's priority. The same input always produces the same ranking. AI writes the explanations from the scored numbers only; it never changes the ranking and never approves.

Approvers see the top quotes with the numbers behind each score, an agent timeline, and one approval action. Vendors see only their own quote, can attach an optional proforma invoice, and can edit it before the deadline, with every version kept. Approval notifies the winner and the rest. Every event lands in an in-app notification bell that deep-links to the request and tracks read state. While the app tab stays open, an optional browser alert raises a system notification for new activity.

Built with TanStack Start, Bun, oRPC, Drizzle, better-result, Vultr Managed PostgreSQL, Vultr Object Storage, Vultr Serverless Inference (deepseek-v4.1-flash-1017), and Resend. Deployed with Dokploy on a Vultr Cloud Compute VM.

Live demo: https://fastprok.kekere.online

## Tech tags

`Vultr` `Serverless Inference` `Managed PostgreSQL` `Object Storage` `Bun` `TypeScript` `TanStack Start` `oRPC` `AI Agents` `Procurement`

## Demo accounts

Password for all: `demo1234`

- Requester: `lilbrown3000+buyer@gmail.com`
- Approver: `lilbrown3000+approver@gmail.com`
- Vendor: `lilbrown3000+vendor-d@gmail.com`

## 2–3 minute video script

1. **0:00–0:15 — Hook.** Dashboard. "A purchase request usually means a week of email. Watch this one finish in minutes."
2. **0:15–0:50 — Request.** Sign in as Requester and open **27-inch monitors**. Read the one-paragraph request, then point out the AI-structured fields: 6 units, Lagos, ₦1,800,000 budget, 30 November. Show the three matched vendors and the agent timeline, including "AI structured the request in 5.7s". Open the notification bell and show the unread badge.
3. **0:50–1:30 — Vendor side.** Sign out, use the Vendor demo button. Open the **27-inch monitors** invitation, submit a quote, then attach `scripts/fixtures/ikeja-tech-hub-proforma.pdf` as the proforma invoice. Show the attachment card and mention that quotes and files stay private to the buyer and that vendor. Edit the price to show versions are kept.
4. **1:30–2:00 — Agent work and notifications.** Back as Requester. Show the bell increment, open the proforma notification, and land on the request. Press **Run agent check** / **Rank now**. Show the ranked quote, the score breakdown, flags such as over budget, and the AI reasons that quote only the scored numbers.
5. **2:00–2:30 — Approval.** Sign in as Approver, open **USB-C docking stations**, open the winner's proforma invoice, add a short note, and approve. Show the request status change and the winner/other notifications. Mention only a human can approve.
6. **2:30–2:45 — Close.** Scroll the agent timeline. "Every decision is repeatable, every action is logged, and Vultr runs the model, the database, the files, and the app."

### Suggested vendor quote

- Unit price: `290000`
- Quantity: `6`
- Delivery date: `20 November 2026`
- Warranty: `24` months
- Valid until: `30 November 2026`
- Notes: `Price includes delivery and installation.`

### Suggested approval note

`Approved for the Lagos office. Delivery and warranty match the request.`

## Pre-recording checklist

- [ ] `https://fastprok.kekere.online/api/health` returns `{"status":"ok","database":"up"}`
- [ ] Login page demo buttons work (Requester, Approver, Vendor)
- [ ] **27-inch monitors** is `Collecting quotes`, the deadline is still open, and Ikeja Tech Hub has an unquoted invitation
- [ ] **USB-C docking stations** is `Awaiting approval` with three ranked quotes and the sample proforma on the winning Yaba Gadgets quote
- [ ] The notification bell shows unread activity for the requester and approver
- [ ] Gmail inbox is open in a second tab to show invitation/approval emails
- [ ] Browser zoom at 100%, notifications muted, bookmarks hidden
- [ ] Optional: click **Enable browser alerts** in the bell before recording, then keep the tab open

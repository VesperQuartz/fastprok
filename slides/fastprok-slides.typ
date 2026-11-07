#set document(title: "fastprok — Procurement that never stalls", author: "fastprok")

#let ink = rgb("#0f172a")
#let slate = rgb("#475569")
#let muted = rgb("#64748b")
#let border = rgb("#dbe3e8")
#let bg = rgb("#f6f7f9")
#let teal = rgb("#0f766e")
#let teal-soft = rgb("#e7f4f1")
#let amber = rgb("#b45309")
#let amber-soft = rgb("#fef3c7")
#let white = rgb("#ffffff")

#set text(font: ("Lato", "DejaVu Sans"), size: 14pt, fill: ink)
#set par(leading: 0.62em, justify: false)

#let bullets(items) = {
  for item in items {
    grid(
      columns: (auto, 1fr),
      gutter: 0.1in,
      align: top,
      text(fill: teal, weight: "bold", size: 12pt)[•],
      text(fill: slate, size: 11.5pt)[#item],
    )
    v(0.11in)
  }
}

#let card(step, title, body, accent: teal, soft: teal-soft) = block(
  width: 100%,
  height: 2.35in,
  inset: 0.18in,
  radius: 8pt,
  fill: white,
  stroke: 0.7pt + border,
)[
  #block(
    width: 0.34in,
    height: 0.34in,
    radius: 50%,
    fill: soft,
    align(center + horizon, text(size: 10pt, weight: "bold", fill: accent)[#step]),
  )
  #v(0.12in)
  #text(size: 16pt, weight: "bold", fill: ink)[#title]
  #v(0.08in)
  #text(size: 11.5pt, fill: slate)[#body]
]

#let step(num, title, body, accent: teal) = block(
  width: 100%,
  height: 2.15in,
  inset: 0.15in,
  radius: 8pt,
  fill: white,
  stroke: 0.7pt + border,
)[
  #block(
    width: 0.32in,
    height: 0.32in,
    radius: 50%,
    fill: accent,
    align(center + horizon, text(size: 11pt, weight: "bold", fill: white)[#num]),
  )
  #v(0.1in)
  #text(size: 14pt, weight: "bold")[#title]
  #v(0.06in)
  #text(size: 10.2pt, fill: slate)[#body]
]

#let arrow() = align(center + horizon, text(size: 18pt, fill: muted)[→])

#let value-card(title, body, accent: teal) = block(
  width: 100%,
  height: 1.55in,
  inset: 0.17in,
  radius: 8pt,
  fill: white,
  stroke: 0.7pt + border,
)[
  #text(size: 14pt, weight: "bold", fill: accent)[#title]
  #v(0.07in)
  #text(size: 10.5pt, fill: slate)[#body]
]

#let arch-box(title, body, fill: white, accent: teal) = block(
  width: 100%,
  height: 1.18in,
  inset: 0.13in,
  radius: 8pt,
  fill: fill,
  stroke: 0.7pt + border,
)[
  #text(size: 11.5pt, weight: "bold", fill: accent)[#title]
  #v(0.04in)
  #text(size: 9.2pt, fill: slate)[#body]
]

#let slide(kicker: none, title: none, body) = {
  set page(
    width: 13.333in,
    height: 7.5in,
    margin: (x: 0.85in, y: 0.5in),
    fill: bg,
  )
  grid(
    rows: (auto, 1fr, auto),
    columns: (1fr,),
    gutter: 0.14in,
    {
      stack(
        spacing: 0.06in,
        if kicker != none {
          text(size: 9.5pt, weight: "bold", fill: teal, tracking: 0.12em)[#upper(kicker)]
        },
        if title != none {
          text(size: 25pt, weight: "bold", fill: ink)[#title]
        },
      )
    },
    body,
    {
      line(length: 100%, stroke: 0.6pt + border)
      v(0.04in)
      grid(
        columns: (1fr, auto),
        text(size: 8.5pt, fill: muted)[fastprok · Vultr Agent Rush 2026],
        context text(size: 8.5pt, fill: muted)[#counter(page).display()],
      )
    },
  )
}

// ---------- Slide 1: title ----------

#page(width: 13.333in, height: 7.5in, margin: 0pt, fill: ink)[
  #set text(font: ("Lato", "DejaVu Sans"), fill: white)
  #place(left + top, rect(width: 0.12in, height: 100%, fill: teal))

  #place(
    top + left,
    dx: 0.85in,
    dy: 0.62in,
    block(width: 5.55in)[
      #grid(
        columns: (auto, auto),
        gutter: 0.14in,
        align: horizon,
        image("images/mark.png", width: 0.52in),
        text(size: 21pt, weight: "bold", fill: white)[fastprok],
      )
      #v(0.62in)
      #stack(
        spacing: 0.17in,
        text(size: 38pt, weight: "bold", fill: white)[Procurement],
        text(size: 38pt, weight: "bold", fill: teal.transparentize(15%))[that never stalls.],
      )
      #v(0.18in)
      #text(size: 16pt, fill: white.transparentize(25%))[
        Describe a need. The agent finds vendors, chases quotes, and ranks every offer.
      ]
      #v(0.32in)
      #grid(
        columns: (auto, auto, auto),
        gutter: 0.1in,
        block(
          fill: white.transparentize(88%),
          stroke: 0.6pt + white.transparentize(55%),
          radius: 99pt,
          inset: (x: 0.12in, y: 0.055in),
          text(size: 9pt, weight: "bold", fill: white)[Rules decide],
        ),
        block(
          fill: white.transparentize(88%),
          stroke: 0.6pt + white.transparentize(55%),
          radius: 99pt,
          inset: (x: 0.12in, y: 0.055in),
          text(size: 9pt, weight: "bold", fill: white)[AI explains],
        ),
        block(
          fill: white.transparentize(88%),
          stroke: 0.6pt + white.transparentize(55%),
          radius: 99pt,
          inset: (x: 0.12in, y: 0.055in),
          text(size: 9pt, weight: "bold", fill: white)[Human approves],
        ),
      )
      #v(1.0in)
      #text(size: 10pt, fill: white.transparentize(40%))[
        Vultr Agent Rush 2026 · Challenge 2
      ]
      #v(0.04in)
      #text(size: 10pt, fill: white.transparentize(40%))[
        Live demo: fastprok.kekere.online
      ]
    ],
  )

  #place(
    top + right,
    dx: -0.45in,
    dy: 1.15in,
    rotate(
      -2deg,
      block(
        width: 6.45in,
        height: 4.25in,
        clip: true,
        radius: 9pt,
        stroke: 1pt + white.transparentize(70%),
        fill: white,
        image("images/dashboard.png", width: 100%),
      ),
    ),
  )
]

// ---------- Slide 2: problem ----------

#slide(
  kicker: "The problem",
  title: "A purchase request is a week of coordination.",
)[
  #grid(
    columns: (1fr, 1fr, 1fr),
    gutter: 0.26in,
    card(
      "01",
      "Find the right vendors",
      "Category, region, lead time, and past reliability all matter. The wrong invite wastes a week.",
    ),
    card(
      "02",
      "Chase the quiet ones",
      "Silent vendors need reminders. Buyers need a record of who was asked and who replied.",
    ),
    card(
      "03",
      "Compare what is not comparable",
      "Price, delivery, warranty, and reliability arrive in different shapes. The decision still has to be defensible.",
    ),
  )
  #v(0.3in)
  #block(
    width: 100%,
    fill: teal-soft,
    radius: 7pt,
    inset: (x: 0.22in, y: 0.17in),
    text(size: 15pt, weight: "bold", fill: teal)[The work is coordination, not typing.]
  )
]

// ---------- Slide 3: solution flow ----------

#slide(
  kicker: "The product",
  title: "One paragraph in. A decision out.",
)[
  #grid(
    columns: (1fr, 0.22fr, 1fr, 0.22fr, 1fr, 0.22fr, 1fr, 0.22fr, 1fr),
    gutter: 0.03in,
    align: horizon,
    step("1", "Describe", "One paragraph in plain language."),
    arrow(),
    step("2", "Structure", "Vultr inference fills the fields."),
    arrow(),
    step("3", "Invite & chase", "Rules match vendors. The agent follows up."),
    arrow(),
    step("4", "Rank", "Deterministic scores. AI writes the reason."),
    arrow(),
    step("5", "Approve", "A human makes the final call.", accent: amber),
  )
  #v(0.28in)
  #grid(
    columns: (1fr, 1fr),
    gutter: 0.3in,
    block(
      fill: white,
      stroke: 0.7pt + border,
      radius: 7pt,
      inset: 0.16in,
      text(size: 11pt, fill: slate)[
        *The agent does the chasing.* Reminders, one-time widening, deadline ranking, and every event on a single timeline.
      ],
    ),
    block(
      fill: white,
      stroke: 0.7pt + border,
      radius: 7pt,
      inset: 0.16in,
      text(size: 11pt, fill: slate)[
        *The human keeps the call.* Only an organization approver can approve. The agent never spends.
      ],
    ),
  )
]

// ---------- Slide 4: requester workspace ----------

#slide(
  kicker: "Requester",
  title: "The requester sees the whole purchase.",
)[
  #grid(
    columns: (0.86fr, 1.5fr),
    gutter: 0.3in,
    align: top,
    [
      #bullets((
        "A paragraph becomes structured fields: quantity, region, budget, and deadline.",
        "Matched vendors and every invitation are visible.",
        "Quotes arrive with a score breakdown, flags, and an AI reason.",
        "Every agent action lands on one timeline.",
      ))
      #v(0.12in)
      #block(
        fill: teal-soft,
        radius: 6pt,
        inset: 0.13in,
        text(size: 9.8pt, fill: teal)[
          The bell keeps the buyer ahead: invitations, quotes, proformas, and approvals.
        ],
      )
    ],
    block(
      width: 100%,
      height: 4.5in,
      clip: true,
      stroke: 0.7pt + border,
      radius: 8pt,
      image("images/dashboard.png", width: 100%),
    ),
  )
]

// ---------- Slide 5: vendor side ----------

#slide(
  kicker: "Vendor",
  title: "Vendors get one clear job.",
)[
  #grid(
    columns: (1.48fr, 0.88fr),
    gutter: 0.3in,
    align: top,
    block(
      width: 100%,
      height: 4.72in,
      clip: true,
      stroke: 0.7pt + border,
      radius: 8pt,
      image("images/vendor-quote-filled.png", width: 100%),
    ),
    [
      #bullets((
        "Only their own invitation and their own quote.",
        "Every revision is kept; the latest version is scored.",
        "An optional proforma invoice sits beside the quote.",
        "The outcome is visible after approval.",
      ))
      #v(0.12in)
      #block(
        fill: teal-soft,
        radius: 6pt,
        inset: 0.13in,
        text(size: 9.8pt, fill: teal)[
          *Private by default.* Proformas live in a private bucket and open through five-minute presigned links after an access check.
        ],
      )
    ],
  )
]

// ---------- Slide 6: rules vs AI ----------

#slide(
  kicker: "The decision",
  title: "Rules decide. AI explains.",
)[
  #grid(
    columns: (1.16fr, 0.84fr),
    gutter: 0.34in,
    align: top,
    [
      #text(size: 11pt, weight: "bold", fill: teal)[Deterministic scoring]
      #v(0.1in)
      #table(
        columns: (1.15fr, 1fr, 1fr, 1fr, 1fr),
        inset: 0.075in,
        stroke: 0.5pt + border,
        fill: white,
        align: (left, center, center, center, center),
        table.header(
          text(size: 8.8pt, weight: "bold", fill: slate)[Priority],
          text(size: 8.8pt, weight: "bold", fill: slate)[Cost],
          text(size: 8.8pt, weight: "bold", fill: slate)[Delivery],
          text(size: 8.8pt, weight: "bold", fill: slate)[Reliability],
          text(size: 8.8pt, weight: "bold", fill: slate)[Warranty],
        ),
        text(size: 9.2pt)[Balanced], text(size: 9.2pt)[35%], text(size: 9.2pt)[30%], text(size: 9.2pt)[30%], text(size: 9.2pt)[5%],
        text(size: 9.2pt)[Lowest price], text(size: 9.2pt)[60%], text(size: 9.2pt)[15%], text(size: 9.2pt)[20%], text(size: 9.2pt)[5%],
        text(size: 9.2pt)[Fastest], text(size: 9.2pt)[15%], text(size: 9.2pt)[60%], text(size: 9.2pt)[20%], text(size: 9.2pt)[5%],
        text(size: 9.2pt)[Most reliable], text(size: 9.2pt)[15%], text(size: 9.2pt)[20%], text(size: 9.2pt)[60%], text(size: 9.2pt)[5%],
      )
      #v(0.16in)
      #text(size: 9.8pt, fill: muted)[
        Hard filters first: quantity, delivery by the needed-by date, and on-time submission. Ties break on earlier submission.
      ]
    ],
    [
      #text(size: 11pt, weight: "bold", fill: amber)[AI's limited job]
      #v(0.1in)
      #bullets((
        "Parse the request into structured fields.",
        "Write the recommendation summary from the scored numbers.",
        "Never change the ranking. Never approve.",
      ))
      #v(0.12in)
      #block(
        fill: amber-soft,
        radius: 6pt,
        inset: 0.13in,
        text(size: 9.6pt, fill: amber)[
          If the model fails, a deterministic template is used and the fallback is logged.
        ],
      )
    ],
  )
]

// ---------- Slide 7: ranked quotes ----------

#slide(
  kicker: "The decision",
  title: "Every rank has a number behind it.",
)[
  #grid(
    columns: (0.95fr, 1.25fr),
    gutter: 0.3in,
    align: top,
    block(
      width: 100%,
      height: 4.38in,
      clip: true,
      stroke: 0.7pt + border,
      radius: 8pt,
      image("images/approval-ranked.png", width: 100%),
    ),
    [
      #bullets((
        "Hard filters remove quotes that miss quantity or delivery.",
        "Cost, speed, reliability, and warranty are normalized and weighted.",
        "Flags surface over-budget, partial, late, or late-submitted quotes.",
        "The AI reason cites only the scored data.",
      ))
      #v(0.12in)
      #block(
        fill: teal-soft,
        radius: 6pt,
        inset: 0.13in,
        text(size: 9.8pt, fill: teal)[
          The same input always produces the same ranking. The model only writes the explanation.
        ],
      )
    ],
  )
]

// ---------- Slide 8: human approval ----------

#slide(
  kicker: "Human control",
  title: "Only an approver can spend.",
)[
  #grid(
    columns: (0.92fr, 1.28fr),
    gutter: 0.3in,
    align: top,
    [
      #bullets((
        "Approvers see the recommendation, the score breakdown, and the proforma.",
        "Requesters can view and recommend, but cannot approve.",
        "The approval note is recorded in the timeline.",
        "The winning vendor and the rest are notified.",
      ))
      #v(0.16in)
      #block(
        fill: teal-soft,
        radius: 6pt,
        inset: 0.13in,
        text(size: 9.8pt, fill: teal)[
          Proformas are private: access is checked, then a five-minute presigned URL is issued.
        ],
      )
    ],
    block(
      width: 100%,
      height: 4.12in,
      clip: true,
      stroke: 0.7pt + border,
      radius: 8pt,
      image("images/approval-top.png", width: 100%),
    ),
  )
]

// ---------- Slide 9: architecture ----------

#slide(
  kicker: "Architecture",
  title: "One Bun server, four Vultr services.",
)[
  #grid(
    columns: (1fr, 1fr, 1fr),
    gutter: 0.2in,
    block(
      width: 100%,
      fill: white,
      stroke: 0.7pt + border,
      radius: 7pt,
      inset: 0.1in,
      align(center, text(size: 10.5pt, weight: "bold", fill: slate)[Requester]),
    ),
    block(
      width: 100%,
      fill: white,
      stroke: 0.7pt + border,
      radius: 7pt,
      inset: 0.1in,
      align(center, text(size: 10.5pt, weight: "bold", fill: slate)[Approver]),
    ),
    block(
      width: 100%,
      fill: white,
      stroke: 0.7pt + border,
      radius: 7pt,
      inset: 0.1in,
      align(center, text(size: 10.5pt, weight: "bold", fill: slate)[Vendor]),
    ),
  )
  #v(0.12in)
  #align(center, text(size: 15pt, fill: muted)[↓])
  #v(0.12in)
  #block(
    width: 100%,
    fill: ink,
    radius: 8pt,
    inset: (x: 0.2in, y: 0.14in),
    text(size: 12pt, fill: white)[
      *TanStack Start on Bun* · React UI · oRPC · domain services with better-result · Drizzle
    ],
  )
  #v(0.12in)
  #align(center, text(size: 15pt, fill: muted)[↓])
  #v(0.12in)
  #grid(
    columns: (1fr, 1fr, 1fr, 1fr),
    gutter: 0.16in,
    arch-box("Managed PostgreSQL", "Requests, quotes, users, sessions, notifications, outbox."),
    arch-box("Object Storage", "Private proforma invoices, S3-compatible."),
    arch-box("Serverless Inference", "deepseek-v4.1-flash-1017 for parse and explanation."),
    arch-box("Resend", "Invitation, reminder, and outcome emails."),
  )
  #v(0.18in)
  #block(
    width: 100%,
    fill: teal-soft,
    radius: 6pt,
    inset: (x: 0.16in, y: 0.1in),
    text(size: 9.6pt, fill: teal)[
      *Dokploy on a Vultr Cloud Compute VM* · agent scheduler every 60 seconds · SSL required for PostgreSQL
    ],
  )
]

// ---------- Slide 10: why it holds up ----------

#slide(
  kicker: "Why it holds up",
  title: "Built for a demo that has to be believed.",
)[
  #grid(
    columns: (1fr, 1fr),
    gutter: 0.24in,
    value-card(
      "Deterministic",
      "Hard filters, normalized scores, explicit weights, and stable tie-breaks. Same input, same ranking.",
    ),
    value-card(
      "Auditable",
      "Every parse, invite, quote, rank, proforma, and approval is on the timeline with an actor and a time.",
    ),
    value-card(
      "Private",
      "Vendors see only their own quote. Proformas are access-checked and served through short-lived links.",
    ),
    value-card(
      "Demo-ready",
      "One-click roles, seeded data, in-app notifications, optional browser alerts, and a working approval path.",
    ),
  )
  #v(0.18in)
  #text(size: 9.6pt, fill: muted)[
    Deliberately out of scope for this demo: inbound email parsing, delivery tracking, multi-currency, member invites, and a rejection flow.
  ]
]

// ---------- Slide 11: close ----------

#page(width: 13.333in, height: 7.5in, margin: 0pt, fill: ink)[
  #set text(font: ("Lato", "DejaVu Sans"), fill: white)
  #place(left + top, rect(width: 0.12in, height: 100%, fill: teal))

  #place(
    top + left,
    dx: 0.85in,
    dy: 0.7in,
    block(width: 7.4in)[
      #grid(
        columns: (auto, auto),
        gutter: 0.14in,
        align: horizon,
        image("images/mark.png", width: 0.5in),
        text(size: 20pt, weight: "bold", fill: white)[fastprok],
      )
      #v(0.6in)
      #stack(
        spacing: 0.16in,
        text(size: 36pt, weight: "bold", fill: white)[A purchase],
        text(size: 36pt, weight: "bold", fill: teal.transparentize(15%))[that never stalls.],
      )
      #v(0.3in)
      #text(size: 13pt, fill: white.transparentize(30%))[
        Live demo: fastprok.kekere.online
      ]
      #v(0.06in)
      #text(size: 13pt, fill: white.transparentize(30%))[
        Code: github.com/VesperQuartz/fastprok
      ]
      #v(0.36in)
      #text(size: 9.5pt, weight: "bold", fill: teal.transparentize(5%))[DEMO ACCOUNTS · PASSWORD demo1234]
      #v(0.1in)
      #text(size: 10.5pt, fill: white.transparentize(20%))[
        Requester  lilbrown3000+buyer\@gmail.com\
        Approver   lilbrown3000+approver\@gmail.com\
        Vendor     lilbrown3000+vendor-d\@gmail.com
      ]
    ],
  )

  #place(
    top + right,
    dx: -0.75in,
    dy: 1.65in,
    block(width: 4.4in)[
      #block(
        width: 100%,
        fill: white.transparentize(92%),
        stroke: 0.7pt + white.transparentize(65%),
        radius: 8pt,
        inset: 0.2in,
      )[
        #text(size: 10pt, weight: "bold", fill: teal.transparentize(5%))[TRY THE 3-MINUTE PATH]
        #v(0.12in)
        #for (num, copy) in (
          ("1", [Requester: open *27-inch monitors*.]),
          ("2", [Vendor: quote, attach a proforma, edit.]),
          ("3", [Requester: rank the quote.]),
          ("4", [Approver: approve *USB-C docking stations*.]),
        ) {
          grid(
            columns: (0.18in, 1fr),
            gutter: 0.08in,
            align: left + top,
            text(size: 9pt, weight: "bold", fill: teal.transparentize(5%))[#num],
            text(size: 9.8pt, fill: white.transparentize(15%))[#copy],
          )
          v(0.075in)
        }
      ]
    ],
  )
]

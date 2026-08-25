# Design Package: Naveen Suthar Portfolio

Deploy folder: `C:\Users\NAVEEN SUTHAR\portfolio\naveen-suthar-site\`
Review folder (never ships): `C:\Users\NAVEEN SUTHAR\portfolio\review\`

**Declared deviation from the skill's default:** no Higgsfield, so there is no AI hero video.
The hero journey is authored by hand in SVG and CSS and scrubbed by scroll instead. Every
other law, gate, and standard in the skill applies unchanged. Because the hero is drawn,
the Blob loader and the ffmpeg pipeline are not needed: there is no heavy asset to stream.
That removes the site's single biggest weight and its single biggest failure mode.

---

## 1. The brand premise

One word from his world: **depth**.

Anybody can show a surface. Naveen shows what is underneath it. The whole site teaches
one idea, that he understands the layers below the thing he built, and it teaches it by
making the visitor travel down through them. The hero descends four layers. Each project
exposes the decision underneath it. The bug section is literally a story about the real
cause hiding under a symptom. The interactive moment makes the visitor uncover something
themselves. The closing call to action asks the reader to go one layer deeper and talk
to him.

Why this premise and not another: the research found that the number one reason hiring
managers reject a student portfolio is the suspicion that the candidate does not
understand their own code. "Copy/pasting code and debugging by typing random character
combinations until something works." Depth is the direct answer to that suspicion, and
it is the only claim this site needs to land.

If a section does not prove depth, it does not belong on the page.

## 2. The palette as CSS tokens

Sampled from the world of the drawn footage: a night-time engineering room. Cyan is the
live data. Violet appears only at the encryption layer, so colour carries meaning.
Contrast values below are computed, not guessed.

```css
:root{
  --canvas:#0B0F22;        /* deep ink indigo, tinted blue, never pure black */
  --canvas-deep:#070A16;   /* the deepest layer of the descent */
  --panel:#121835;         /* cards and raised surfaces */
  --panel-2:#1A2246;       /* nested surfaces, inputs */
  --line:#2A3563;          /* decorative hairlines only */
  --line-strong:#5568B0;   /* interactive borders. 3.61:1 on canvas, passes 3:1 */
  --text-primary:#EAF0FF;  /* near white, blue tinted */
  --text-secondary:#A3B0D4;/* 8.79:1 on canvas, passes 4.5:1 */
  --accent:#35E0F0;        /* electric cyan. 11.83:1 on canvas. CTA and rare emphasis */
  --accent-hover:#6BEBF7;
  --accent-muted:rgba(53,224,240,.22);  /* borders, glows, particles */
  --violet:#8B6BFF;        /* the encryption layer ONLY. 5.11:1 on canvas */
  --violet-muted:rgba(139,107,255,.20);
  --on-accent:#04121A;     /* text on a cyan button */
}
```

The accent rule: cyan appears on the call to action, on focus states, and at two or three
moments of emphasis. Nowhere else. Violet is rarer still and appears only where encryption
is the subject.

## 3. The type trio

- **Display: Sora**, weights 600 and 700. Geometric and technical with real character.
  Not Inter, not Roboto.
- **Body: Manrope**, weights 400, 500, 600. Quiet, warm, easy at small sizes.
- **Mono: JetBrains Mono**, weights 400 and 500. Small labels, layer names, readouts.
  Built for developers, which is the point.

Only those weights get loaded, with `preconnect`.

## 4. The band map

Hero height **800vh**, so the scroll range is 700vh and 0.02 of progress equals 14vh of
ramp. Five bands at roughly 0.19 of progress each give about a 105vh plateau per beat,
inside the proven 80 to 130vh window. Ranges are starting points, validated by the flick
test in Phase 9.

| Band | Range | Footage moment (drawn) | Copy (verbatim) | Entrance |
|---|---|---|---|---|
| 1 | 0.00 to 0.17 | The surface. A clean interface wireframe under soft top light, cursor alive, layer label INTERFACE. | **Naveen Suthar** / "Full stack developer. I build the surface and everything under it." | Grid snap-align. Characters slide into place in reading order, echoing an interface assembling. Band 1 gets the one-time load ramp. |
| 2 | 0.19 to 0.37 | Camera falls past the interface plane. Logic streams upward past the lens: branching paths, function blocks, connector lines. Label LOGIC. | "Below it, the logic." / "Every branch I wrote, I can explain." | Drift-down. Words start above their resting spot and fall into place, echoing the descent. |
| 3 | 0.39 to 0.57 | Deeper. A lattice of records, query pulses travelling along the rows. Label DATA. | "Below that, the data." / "Shaped on purpose, not by accident." | Scatter. Characters assemble from seeded random offsets, echoing records settling into a table. |
| 4 | 0.59 to 0.77 | The deepest layer, violet. Cipher blocks sealing shut, bytes locking, light going cold. Label ENCRYPTION. | "And underneath all of it, what keeps it safe." / "I learned security first. It changes how you build everything above it." | **Cipher-resolve (invented for this build).** Each character cycles through scrambled glyphs and locks into its real letter, echoing decryption. Transform and opacity only, scrubbed off the band's --k, fully reversible. |
| 5 | 0.79 to 1.00 | The layers recede and compose into the resting frame. The spine completes. The portrait enters from the right inside a viewport aperture. | "Every layer. One person." / "Naveen Suthar. Second year computer engineering, building full stack with security underneath." / CTA row | Word-by-word rise into a staged settle. Headline words rise in reading order, then the subline, then the buttons. Three arrivals, one band. |

"Every layer. One person." is a deliberate staccato device chosen here on purpose. It is
craft, not drift, and the Phase 9 sweep leaves it alone.

## 5. The static-hero copy block

For phones, portrait tablets, coarse-pointer portrait, landscape phones, and reduced
motion. A composed arrival with no journey behind it, plus the four layer names so the
idea still lands without the descent.

- Layer strip: `INTERFACE · LOGIC · DATA · ENCRYPTION`
- Headline: **Every layer. One person.**
- Subline: "Naveen Suthar builds full stack, with security underneath. Second year computer engineering, already shipping."
- Primary CTA: **Email me about a role**
- Secondary: **Read my code**

## 6. The below-fold outline

Every section funnels to `#contact`. No two adjacent sections share a layout skeleton.

**6.1 The honest numbers** (a thin strip, immediately after the settle)
Real and checkable, no invented totals. Four equal items:
`94.00% class X` · `87.40% class XII` · `4 certifications` · `2 projects shipped`

**6.2 What I actually do** (the four layers become the skill section)
The site's own structure reused as content, tied to the spine. Four entries, equal
treatment, each named for a layer of the descent.
- **Interface.** "The part people touch. HTML, CSS, JavaScript, React."
- **Logic.** "The part that decides. Python, Java, Node."
- **Data.** "The part that remembers. MongoDB, SQL."
- **Encryption.** "The part that protects. Hashing, key handling, safe storage."

Deliberately not a six-card grid of technology logos. The research called those "nominal."

**6.3 Two projects, in depth**
CarpoolX and Cipher Password Manager. Two entries, equal treatment. Each carries four
things, and the third one is the section's whole purpose:
1. What it does, one sentence.
2. What it is built with.
3. **The decision.** One choice he made and why he made it that way. This exists because
   a hiring manager said he tests for exactly this: "being able to explain a project and
   the data structures chosen and why."
4. Links: the repository, and a live link if one exists.

*Copy pending from Naveen. Marked in the build, never invented.*

**6.4 The bug** (the differentiating section)
His own story in four beats, laid out as a descent so the section's shape repeats the
site's one idea: the symptom sits at the surface, the real cause sits underneath.
1. The symptom.
2. What I thought it was.
3. What it actually was.
4. How I found it.

This section exists because of one research finding: an engineering manager's favourite
interview question is about a recently solved tricky bug, and "if the candidate has
nothing, it's a strong signal to not hire." Almost no student portfolio answers it before
the interview. This one does.

*Copy pending from Naveen. Marked in the build, never invented.*

**6.5 The one interactive moment: hold to decrypt**
A line about him arrives scrambled. The visitor presses and holds, and the characters
resolve one by one into readable text. Release early and the progress eases back down, it
never snaps. Complete it and the line lights up along with a short follow-on. Reduced
motion gets the resolved state with no hold required.

The line worth uncovering: **"I am two years in. I learn faster than I look on paper."**

Why this interaction and not a decorative one: the visitor performs the thing he
specialises in, and the reward is the honest answer to the main objection against him.

**6.6 Where I am from**
Education, certifications, and experience, compact and honest. The content creation,
LinkedIn, and creative head roles are framed as evidence that he can communicate and lead
a team, placed after the engineering, never before it. This placement is deliberate: the
research turned up a hiring manager rejecting a candidate for leading with design work,
"you haven't provided any evidence that you're actually capable of any sort of
development." Engineering leads, the creative work supports.

**6.7 Straight answers** (the FAQ, in the objections' own words)
- "You are in second year. Why should I look now?"
- "Every student has the same projects. What is different here?"
- "Did you actually write this, or did you paste it?"
- "Most of your experience is content and design, not engineering."
- "Are you free for an internship?"

**6.8 The form** (the single call to action)
Route: Formspree, so messages reach `naveensuthar497@gmail.com` for real, on any device,
including a machine with no email app. The endpoint is a clearly marked placeholder until
Naveen creates the free account.
- Labels: Your name · Your email · The role or project · Your message
- Button: **Send it**
- Success: "Got it. I will reply from naveensuthar497@gmail.com, usually within a day."
- Failure: an honest fallback line offering the direct email address.

**6.9 Footer**
Email, GitHub, LinkedIn, resume download. The brand is a real person, so there is no
fictional-brand disclosure. Every image on the site is either his own photograph or vector
art drawn by hand, so there is no AI imagery to disclose either. Worth stating plainly in
the footer, because it is a real advantage over the sites he is competing with.

## 7. The vector layer plan

Everything here is drawn by hand. No generated imagery anywhere.

- **The signature: the spine.** One continuous SVG path down the whole page, self-drawing
  on scroll, changing character as it descends. Solid through the interface sections,
  dashed through the logic sections, node-dotted through the data sections, sealed blocks
  at the encryption and security sections. Loudness test: remove the spine and the page
  loses the idea it is built on, so the boldness budget is correctly spent here.
- **The hero stage.** Four SVG layer planes in perspective, receding, that the camera
  descends through as progress runs 0 to 1. Each plane carries its own drawn motif:
  interface wireframe, branching logic, record lattice, cipher blocks.
- **The fixed environment layer.** One element behind everything: a slow drifting radial
  glow plus fine grain, cycling at 90 seconds, so scrolling feels like moving through one
  place rather than past stacked sections.
- **Whisper particles.** Slow drifting motes, cyan at very low opacity, in the hero and
  behind the lower sections. Paused off-screen and on hidden tabs.
- **Section edges.** Drawn layer-edge lines rather than plain borders.
- **Favicon.** An inline SVG stacked-layers mark.

All of it honours reduced motion: final states shown, drives stopped, and pinning undone
if the preference is switched back off.

## 8. The engineering list

Named in full so the build cannot half-remember it:

- The dt-normalized lerp with a rAF loop that rests when converged and when the hero is
  off screen.
- Delta-gated DOM writes on every scroll-driven value. Nothing written per frame.
- Band pacing in vh with the flick test at 120px, 240px, and 360px.
- The legibility system on every hero band: base scrim, per-band scrim riding `--k`, the
  three-layer text-shadow token, chip scrims for small labels. The drawn scene is under
  my control, which makes the audit easier, not skippable.
- The five static-hero gates, character for character identical in CSS and JS, kept live
  with change listeners on all five queries.
- Complete without any asset: the portrait is the only image on the site, and its failure
  is handled.
- The whole-site-animated standard: self-drawing lines, whisper particles, per-moment
  entrances, easing on everything, one living element per section.
- The quality floor: trimmed fonts with preconnect, `ch` sizing on text elements only,
  computed contrast, semantic landmarks with a skip link, `aria-hidden` on decoration,
  `:focus-visible` in the accent, 44px touch targets under coarse pointer, real title and
  meta description, `theme-color`, inline SVG favicon, og tags marked for the deploy patch,
  `overflow-x: clip` on both html and body, baseline-aligned text rows.

Two items from the standard are genuinely not needed here and are skipped on purpose: the
Blob fetch with its loading ring, and the gated-seek pattern. Both exist to tame a video
file, and there is no video file. Saying so out loud so the omission reads as a decision
rather than a gap.

## 9. The copy gate

Every viewer-facing line in this package ships verbatim. The built page must pass the
Phase 9 gate before anyone sees it: zero em dashes, zero instances of leverage, seamless,
empower, unlock, robust, actionable, data-driven, or solutions, plus the body-copy sweep
for the quieter tells. "Every layer. One person." and the four-beat bug structure are
deliberate devices from this package and stay.

# Grammar Drive 3.0 — consolidated test checklist

Run this only after the 3.0 code is approved, GitHub Pages is intentionally published, and the Firebase setup in `FIREBASE_SETUP_3.0.md` is applied.

## A. Desktop smoke test
- [ ] Open the teacher dashboard and sign in.
- [ ] Create a Grade 10, 11, and 12 session.
- [ ] Open the student QR/link; join using name and class/section only.
- [ ] Confirm the city loads without repeated loading during normal driving.
- [ ] Drive through all five districts; confirm roads, buildings, collisions, and map boundaries.
- [ ] Confirm the minimap tracks the local car, other players, and mission/race markers.
- [ ] Confirm the steering controls feel exactly as before.

## B. Gameplay
- [ ] Open the City Center mission board.
- [ ] Start a mission; collect every randomly placed cargo fragment.
- [ ] Return to City Dispatch and rebuild the message.
- [ ] Visit grammar checkpoints and answer both correctly and incorrectly.
- [ ] Visit the Shopping District car shop and confirm the existing vehicle shop still works.
- [ ] Visit the Race Club and complete all six checkpoints.
- [ ] Confirm the XP rewards and vehicle growth HUD update.
- [ ] Confirm the local vehicle grows smoothly and other players see the same size.
- [ ] Confirm vehicle collision and steering physics do not grow with the visual model.
- [ ] Confirm background music starts after the first user interaction, loops smoothly, and has independent on/off control.
- [ ] Confirm sound mute and volume controls still work.

## C. Results and teacher controls
- [ ] End a running game manually; confirm students see final standings and their own rank.
- [ ] Let a second game reach zero time; confirm the automatic end also saves and displays standings.
- [ ] Confirm the teacher report and CSV still work.
- [ ] Select and bulk-delete multiple waiting/ended sessions.
- [ ] Delete one legacy-format session.
- [ ] Confirm running sessions cannot be selected or deleted.
- [ ] Confirm deleted sessions also remove their join link, live-car data, and public results.

## D. Multiplayer and performance
- [ ] Test with 2 devices first.
- [ ] Test with 5–10 devices.
- [ ] Test with 20 players if available.
- [ ] Check for missing/frozen cars, delayed vehicle growth, and duplicate names.
- [ ] Observe performance on desktop and at least one lower-end Android phone.
- [ ] Target stable 60 FPS on capable devices and a playable 30 FPS on lower-end phones.
- [ ] Confirm the minimap and background music do not cause noticeable stutter.

## E. Release gate
- [ ] No critical gameplay, results, security-rule, or multiplayer defects.
- [ ] Firebase Rules are published and `/rulesVersion` equals `phase1-v2`.
- [ ] User explicitly approves merging and publishing.

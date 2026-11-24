# Grammar Drive 3.0 — Firebase setup

**Do not apply this until the 3.0 release is approved.** The development branch is not live, and these changes have not been published to Firebase.

## 1. Realtime Database Rules

In Firebase Console:

1. Open the existing **grammar-drive** project.
2. Open **Realtime Database → Rules**.
3. Replace the entire Rules editor with the contents of this repository file:
   `database.rules.json` on branch `performance/optimization-3.0`.
4. Save/publish the rules only after reviewing and approving the 3.0 release.

The updated rules add:
- Student-owned `vehicleProfiles/{uid}` for XP and vehicle growth.
- `publicResults/{sessionId}`, readable only by students enrolled in that session and the session's teacher.
- Optional, validated vehicle-growth scale in multiplayer live-car records.
- Safe owner deletion of legacy sessions while protecting running sessions.
- Larger world-coordinate limits.

## 2. Realtime Database data value

In **Realtime Database → Data**, update the existing root value:

- Path: `/rulesVersion`
- Type: **string**
- Value: `phase1-v2`

Do not create `publicResults` or `vehicleProfiles` manually. The game creates those records when needed.

## 3. Authentication

No authentication changes are required:
- Keep **Anonymous** sign-in enabled for students.
- Keep **Email/Password** sign-in enabled for teachers.
- Students still join by the shared link/QR and enter only their name and class/section.
- No student PIN, email, password, or account setup is added.

## 4. What has not been changed

- Firebase project ID and Realtime Database instance/region.
- Firebase Hosting configuration.
- GitHub Pages deployment settings.
- Student join flow or steering controls.

The Firebase Rules and `rulesVersion` value must both be updated before testing the 3.0 branch. Do not publish either one before release approval.

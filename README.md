# Grammar Drive: Open Road Challenge

A browser-based multiplayer educational driving game for Grades 10–12. Built with plain HTML, CSS and JavaScript, Firebase Authentication, and Firebase Realtime Database on the Spark/free plan. Hosted through GitHub Pages.

## Current feature set

### Student access
- Teacher creates a session and displays a QR code or shares the join link.
- Students enter only their name and class/section.
- Firebase Anonymous Authentication runs silently in the background.
- No student email, password, account setup, PIN, or manual join code.
- Returning students can rejoin using the same browser profile.

### Teacher dashboard
- Teacher-only email/password login.
- Create sessions for Grades 10, 11, and 12.
- Select grammar topics and a 10, 15, 20, 30, or 45-minute session duration.
- Live lobby with student list, rename, and remove controls.
- QR code and shareable join link.
- Start, manually end, or cancel a session.
- Automatic session ending when the timer expires.
- Final leaderboard, Top 3 podium, class awards, class performance summary, and CSV export.
- Delete controls for a teacher's own waiting or ended sessions. Running sessions must be ended first; deleting permanently removes the session, join link, student results, and live-car data.
- Scores are provisional and calculated on student devices.

### Open-world driving
- Shared city map with detailed raised buildings, rooftops, windows, entrances, street-facing signs, improved roads, trees, streetlights, parks, service locations, grammar checkpoints, and City Dispatch.
- Desktop keyboard and mobile/tablet on-screen controls.
- Horizontal analog steering joystick plus forward and backward controls.
- Multiplayer cars with live position updates.
- Vehicle models: Compact, Sports Car, SUV, Truck, Motorcycle, Bicycle, Jeep, and Police Cruiser.
- Ten selectable paint colors.
- Vehicle-specific handling profiles and visual differences.
- Car Shop with vehicle prices, ownership indicators, and a wallet.
- Playful synthesized engine audio and sound effects, with a persistent in-game mute toggle.
- Starting balance: 500 coins. Successful City Dispatch delivery: +30 game points and +30 coins.
- Vehicle ownership, coins, paint choice, and mission progress are stored locally in the student's browser.

### City Dispatch missions
1. Drive to City Dispatch and start a mission.
2. Explore the city and collect the scattered message crates.
3. Return to Dispatch after recovering all fragments.
4. Arrange the message fragments in the correct order and deliver the message.
5. A successful delivery adds 30 points and 30 coins.

The initial mission bank covers Question Forms, Yes/No Questions, Wh-Questions, and Tag Questions, with grade-specific content for Grades 10–12.

### Roadside grammar challenges
- Four marked roadside checkpoints offer short grammar activities while students explore the city.
- Activity formats include multiple choice, sentence repair, error spotting, and word-order challenges.
- Content is grade-specific for Grades 10–12 and draws from the session's selected grammar topics.
- Correct answers earn 15 points; explanations are shown after each attempt.

## Important limitations

- **Provisional scoring:** answer checking and score updates are client-side. Firebase Rules limit update frequency and score increments, and mission points are claimed with a one-time completion ID in an atomic transaction. This prevents replaying the same mission ID, but it is not cheat-proof scoring; a modified client can still fabricate new IDs.
- **Local economy and inventory:** coins and vehicle ownership are stored in browser local storage, not in a trusted shared wallet. They do not automatically transfer to another device or browser profile and can be cleared or modified by the user.
- **Classroom scale:** multiplayer movement has been confirmed on a teacher laptop and two student phones. The 30-student target has not been verified in a full classroom.
- **Final combined test:** driving, missions, vehicle shop/economy, and teacher results should be tested together before classroom use.
- **Fuel mechanic:** removed from the current driving experience. Do not rely on old fuel-related documentation or UI.

## Firebase setup

Firebase project uses:
- Authentication: Email/Password for teachers and Anonymous for students.
- Realtime Database: grammar-drive-default-rtdb in asia-southeast1.
- Spark/free plan. No Cloud Functions or paid backend is required for the current prototype.

The teacher record must exist under teachers/{teacherUid} with role: "teacher" and active: true.

### Important: publish the latest database rules

The repository's database.rules.json includes validation for all eight vehicle models and paint colors. It also permits teachers to delete their own waiting or ended sessions (running sessions must be ended first). This is a security-sensitive Rules update. Before using session deletion, manually publish the latest file from the approved release:

1. Open database.rules.json in the repository.
2. Copy the entire file.
3. Open Firebase Console → Realtime Database → Rules.
4. Replace the existing rules and click **Publish**.

Do not assume GitHub updates automatically publish Firebase Rules. This step is separate from GitHub Pages.

For the mission-completion integrity update, the matching app and Rules changes use `phase1-v2`. After reviewing and approving that release, publish the updated Rules and set the root `rulesVersion` value to `phase1-v2` in the Realtime Database Data view. The app deliberately blocks entry when its required Rules version is not published. Do not change the live Rules or version value until the app release is ready.

## Combined test checklist

Use a fresh teacher session and at least two student devices.

1. Teacher login and session creation.
2. Student QR/link join using name and class only.
3. Lobby visibility and teacher rename/remove controls.
4. Teacher starts the session; students enter the driving game.
5. Forward, backward, analog steering, collision recovery, and map navigation.
6. Multiplayer cars appear and move correctly on both student devices.
7. City Dispatch: start mission, collect all crates, assemble and deliver the message.
8. Confirm mission score and coin rewards.
9. Car Shop: check wallet, prices, purchase, paint selection, and owned vehicle state.
10. Confirm other players see the correct vehicle model and paint.
11. Refresh/rejoin and check the intended local persistence.
12. Teacher timer, manual End Game, and automatic time limit.
13. Final leaderboard, Top 3 podium, awards, accuracy, and CSV export.
14. Visit all four roadside grammar checkpoints and try each activity style.
15. Check sound toggle, engine sound, collection, answer, reward, and purchase sound effects; confirm mute persists after refresh.
16. Delete a waiting test session and an ended test session; confirm the running-session delete option is unavailable.
17. Confirm students cannot continue scoring or driving after the session ends.

## Project structure

    index.html                  Landing page
    teacher.html                Teacher dashboard
    student.html                Student QR/link join page
    play.html                   Multiplayer driving game
    test.html                   Firebase connection and Rules self-test
    database.rules.json         Realtime Database Rules (publish manually)
    css/style.css               Shared styles
    js/firebase.js              Firebase initialization and sign-in helpers
    js/common.js                Shared constants, paths, and data builders
    js/teacher.js               Teacher dashboard, timer, and results
    js/student.js               Student join and session status
    js/playtest.js              Driving, missions, grammar checkpoints, shop, audio, and local economy
    js/audio.js                 Synthesized engine audio and sound effects
    js/grammar-challenges.js    Grade/topic roadside grammar challenge bank
    js/missions.js              Grade/topic mission content and crate logic
    js/multiplayer.js            Live vehicle synchronization
    js/vehicle.js               Vehicle physics and handling
    js/world.js                 City map, scenery, and locations
    js/selftest.js              Rules self-test logic
    js/vendor/qrcode.js         QR code generator

## Testing history

- Phase 1 session foundation and Phase 2 QR/link join flow passed the user's self-tests and manual checks.
- Phase 3 multiplayer movement passed a real-device test using one teacher laptop and two student phones, including reconnect and cleanup.
- Phase 4A map and basic driving were confirmed working by the user.
- Phase 4B service/fuel/damage mechanics were tested earlier; the fuel mechanic was later removed from the current game.
- Phase 4C shared vehicle model appearance was tested after its Rules update.
- Phase 5B missions, Phase 6A/6B vehicle collection and economy, and Phase 7 teacher results have been implemented but are awaiting the combined end-to-end test.

## Deployment notes

GitHub Pages serves the repository. Changes committed to main may be published by the repository's Pages configuration. Firebase Rules are separate and require manual publication in the Firebase Console. Do not claim the whole game is classroom-ready until the combined test checklist has passed.

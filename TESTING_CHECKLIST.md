# JidouNavi Testing Checklist

## 🔐 Authentication

### Sign Up
- [X] Create new account with valid email
- [X] Email validation works (rejects invalid emails)
- [X] Username validation works (min 3 characters)
- [X] Password validation works (min 6 characters)
- [X] Password confirmation works (must match)
- [X] Account created successfully
- [X] Email verification prompt appears
- [X] Profile automatically created in database
- [ ] Email already in use verification

### Login
- [X] Login with correct credentials
- [X] Login fails with wrong password
- [X] Login fails with non-existent email
- [X] "Forgot Password" link works
- [X] Redirects to map after successful login

### Password Reset
- [X] Enter email for password reset
- [X] Reset email sent confirmation
- [X] (Check email) Reset link works

## 🗺️ Map Screen

### Initial Load
- [X] Map loads instantly without zoom animation
- [X] Map centered on user location (or Tokyo if no permission)
- [X] NO zoom animation from USA → Japan
- [X] Location permission prompt appears
- [X] Red pins appear on map (should see ~22 in Akihabara area)
- [X] User location blue dot visible (if permission granted)
- [X] Status bar visible at top (battery indicator not covered)

### Pin Interaction
- [X] Pins stay visible when zooming
- [X] Pins stay visible when panning
- [X] Tap a pin → Preview card appears at bottom
- [X] Preview card shows: photo, name, distance, description
- [X] Tap different pin → Switches to new preview
- [X] Tap map background → Preview card closes
- [X] Tap "View Details" on preview → Goes to detail screen
- [ ] Mts away shows meters based on current user location and not center of screen

### Search
- [X] Search bar visible at top
- [X] Type machine name → Shows results
- [X] Select search result → Map centers on that location
- [ ] Selecting a result from search opens that preview card
- [ ] Search closes any other preview card

### Category Filters
- [X] Filter bar visible below search (All, Drinks, Food, Gachapon, Weird, Retro, Ice Cream, Coffee, Alcohol)
- [X] "All" selected by default (white background)
- [X] Tap "Drinks" → Only drink machines visible
- [X] Tap "Food" → Only food machines visible
- [X] Multiple filters can be selected (OR logic)
- [X] Tap "All" → Shows all machines again
- [X] Filter updates instantly

### Recenter Button
- [X] Recenter button visible (bottom right, above tab bar)
- [X] Button positioned at bottom: 32px (not too high)
- [X] Button easily reachable with thumb
- [X] Tap recenter → Map moves to user location
- [X] Zoom level resets to 14

## 📍 Machine Detail Screen

### Display
- [X] Machine photo loads (or placeholder if no photo)
- [X] Name displayed correctly
- [X] Distance shown (e.g., "250m away")
- [ ] Distance show is from user and not from center of the screen map
- [X] Address displayed (if available)
- [X] Description shown
- [X] Visit count displayed
- [X] Status shown (active/pending/flagged)

### Actions
- [X] "Get Directions" button works → Opens native maps app
- [X] "I Visited" button visible
- [X] "Save/Bookmark" button visible
- [X] Back button returns to map

### Check-In Flow
- [X] Tap "I Visited" → Shows dialog "Is this vending machine still here?"
- [X] Three options: Cancel, No it's gone, Yes it's here
- [X] Must be within 200m to check in
- [X] If too far away → Error message "Too Far Away"
- [X] If successful → "Checked In!" message
- [X] Visit count increments by 1
- [X] Button changes to "Visited ✓" and disables
- [X] Can only check in once per day per machine
- [ ] If badge earned → Badge popup appears after success
// There seems to be an error awarding the badge code 42501 / details null hint null message new row violates row level security policy for table user_badges. Need to further look into this

### Save/Bookmark
- [X] Tap bookmark icon → Machine saved
- [X] Icon changes to filled bookmark
- [X] Text changes to "Saved"
- [X] Tap again → Removes from saved
- [X] Icon changes back to outline
- [X] Requires login (shows alert if not logged in)

## ➕ Add Machine Screen

### Access
- [X] Tap "+" FAB on map screen → Opens add machine screen
- [X] Header shows "Add Machine"
- [X] Cancel button works

### Photo Upload
- [X] "Take Photo" button opens camera
- [X] "Choose from Gallery" button opens gallery
- [X] Selected photo appears on screen
- [X] Shows file size (should be <500KB after compression)
- [X] "Tap to remove" works to clear photo
- [X] Photo required (shows error if missing)

### Form Fields
- [X] Name field (required, shows error if empty)
- [X] Categories: Drinks, Food, Gachapon, Weird, Retro
- [X] Can select multiple categories
- [X] Selected categories highlighted in red
- [X] Description field (required, multiline)
- [X] Location auto-detected and displayed (lat, lng)

### Submit
- [X] Submit button disabled while uploading
- [X] Shows loading indicator while submitting
- [X] Photo uploads to Supabase Storage
- [X] Machine record created in database
- [X] Categories linked correctly
- [X] Success message appears
- [ ] If badge earned → Badge popup appears
- [X] Returns to map after success
- [X] New machine visible on map immediately

### Validation
- [X] Can't submit without photo
- [X] Can't submit without name
- [X] Can't submit without description
- [X] Shows helpful error messages

## 👤 Profile Screen

### User Info
- [X] Avatar displayed (or placeholder)
- [X] Display name / username shown
- [X] Email address shown
- [ ] Bio displayed (if set)

### Stats
- [X] Machines Added count correct
- [X] Visits count correct
- [X] Badges count correct

### Saved Machines Section
- [X] "My Saved" section visible
- [X] Shows list of bookmarked machines
- [X] Each card shows: photo, name, address
- [X] Tap card → Goes to machine detail
- [X] Tap bookmark icon → Removes from saved (with confirmation)
- [X] If no saved machines → Shows empty state message

### Badges Section
- [X] "Badges" section visible
- [ ] Badge grid displayed
- [ ] Each badge shows icon and name
- [ ] Border color indicates rarity (gray=common, blue=rare, purple=epic)
- [ ] Tap badge → Shows description in alert
- [X] If no badges → Shows empty state message

### Legal Section
- [X] "Privacy Policy" link visible
- [X] Tap → Opens privacy policy page
- [X] Contact email shows: leandrotrabucco@gmail.com
- [X] "Terms of Service" link visible
- [X] Tap → Opens terms page
- [X] Contact email shows: leandrotrabucco@gmail.com
- [X] Back button works on legal pages

### Logout
- [X] "Log Out" button visible (red outline)
- [X] Tap → Shows confirmation dialog
- [X] Cancel → Stays logged in
- [X] Log Out → Returns to login screen
- [X] After logout, can't access protected features

### Delete Account
- [X] "Delete Account" button visible below logout (small, red, underlined text)
- [X] Tap → Shows confirmation dialog with warning message
- [X] Warning mentions data will be permanently deleted
- [X] Cancel → Account not deleted
- [X] Delete Account → Profile and data deleted
- [X] User automatically logged out
- [X] Cannot log back in with same credentials
- [X] If error → Shows contact email (leandrotrabucco@gmail.com)

### Pull to Refresh
- [X] Pull down → Shows loading indicator
- [X] Stats refresh
- [X] Saved machines refresh
- [X] Badges refresh

## 🏆 Badge System

### Badge Unlocking
- [ ] First Find badge: Visit 1st machine
- [ ] Explorer badge: Visit 5 machines
- [ ] Contributor badge: Add 1st machine
- [ ] Badge popup appears when earned
- [ ] Popup shows badge icon, name, description
- [ ] Can dismiss popup
- [ ] Badge appears in profile immediately
- [ ] Badge count increments

### Badge Triggers to Test
- [ ] Visit 1 machine → "First Find"
- [ ] Add 1 machine → "Contributor"
- [ ] Visit 5 machines → "Explorer" (optional, takes time)

## 🔄 Data Persistence

### After App Close/Reopen
- [X] User stays logged in
- [X] Map returns to last location
- [X] Saved machines persist
- [ ] Badges persist
- [X] User stats correct

### Offline Behavior
- [ ] Turn off wifi → Map still shows last loaded pins
- [ ] Can't add new machines (should show error)
- [ ] Can't check in (should show error)
- [ ] Graceful error messages

## 🐛 Edge Cases

### Network Issues
- [ ] Slow connection → Shows loading states
- [ ] No connection → Helpful error messages
- [ ] Connection restored → App recovers

### GPS Issues
- [ ] Location permission denied → Map shows Tokyo
- [ ] GPS inaccurate → Check-in validates 200m radius
- [ ] No GPS → Shows error when adding machine

### Invalid Data
- [ ] Machine with no photo → Shows placeholder
- [ ] Machine with no address → Hides address field
- [ ] Machine with no description → Shows empty
- [ ] Machine with no categories → Still visible on map

### Rapid Interactions
- [ ] Quickly tap multiple pins → Doesn't crash
- [ ] Spam zoom in/out → Pins stay visible
- [ ] Rapidly toggle filters → Doesn't break
- [ ] Multiple rapid check-ins → Prevented by cooldown

## 📱 UI/UX

### Visual Polish
- [ ] App theme matches brand colors (red #FF4B4B, blue #3C91E6, cream #FDF3E7)
- [ ] Status bar shows battery/time/signal properly
- [ ] Status bar style is "dark" (black text)
- [ ] Buttons have proper press states
- [ ] Loading indicators appear for slow operations
- [ ] Images load smoothly
- [ ] Text is readable at all sizes
- [ ] No layout shifts or jumps
- [ ] Map loads without jerky zoom animation

### Navigation
- [ ] Bottom tabs work (Map, Profile)
- [ ] Back buttons work consistently
- [ ] Navigation stack works correctly
- [ ] Can't get stuck on any screen

### Permissions
- [ ] Location permission handled gracefully
- [ ] Camera permission requested when needed
- [ ] Gallery permission requested when needed
- [ ] Clear explanation why permissions needed

## 🎯 Critical User Flows

### New User Journey
1. [ ] Download app → Sign up → Map loads with pins
2. [ ] Tap pin → See details → Check in (if nearby)
3. [ ] Get "First Find" badge → Badge popup appears
4. [ ] Go to Profile → See badge and stats

### Add Machine Journey
1. [ ] Find real vending machine
2. [ ] Tap + → Take photo → Fill form → Submit
3. [ ] Get "Contributor" badge → Badge popup
4. [ ] Machine appears on map immediately
5. [ ] Go to Profile → See updated stats

### Discovery Journey
1. [ ] Open map → See pins in Akihabara
2. [ ] Filter by "Weird" → See only weird machines
3. [ ] Tap pin → View details → Save machine
4. [ ] Go to Profile → See saved machine

---

## Priority Levels

**P0 - Must Work (Blockers):**
- Login/Signup
- Map loads with pins (no zoom animation)
- Pins don't disappear when zooming/panning
- Pins are clickable and show preview
- Add machine flow
- Check-in flow
- Status bar visible

**P1 - Should Work (Important):**
- Search and filters
- Save/bookmark
- Badge unlocking
- Profile stats
- Logout
- Delete account
- Recenter button positioning
- Legal pages with correct contact email

**P2 - Nice to Have:**
- Pull to refresh
- Empty states
- Edge case handling
- Polish and animations

---

## Test Results Template

```
Date: ___________
Build Version: ___________
Device: ___________
OS: ___________

P0 Blockers: ✓ / ✗
P1 Important: ✓ / ✗
P2 Nice to Have: ✓ / ✗

Issues Found:
1.
2.
3.

Notes:
```

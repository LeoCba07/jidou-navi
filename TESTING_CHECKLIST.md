# JidouNavi Testing Checklist

## 🔐 Authentication

### Sign Up
- [✓] Create new account with valid email
- [✓] Email validation works (rejects invalid emails)
- [✓] Username validation works (min 3 characters)
- [✓] Password validation works (min 6 characters)
- [✓] Password confirmation works (must match)
- [✓] Account created successfully
- [✓] Email verification prompt appears
- [✓] Profile automatically created in database
- [X] Email already in use verification

### Login
- [✓] Login with correct credentials
- [✓] Login fails with wrong password
- [✓] Login fails with non-existent email
- [✓] "Forgot Password" link works
- [✓] Redirects to map after successful login

### Password Reset
- [✓] Enter email for password reset
- [✓] Reset email sent confirmation
- [✓] (Check email) Reset link works

## 🗺️ Map Screen

### Initial Load
- [✓] Map loads instantly without zoom animation
- [✓] Map centered on user location (or Tokyo if no permission)
- [✓] NO zoom animation from USA → Japan
- [✓] Location permission prompt appears
- [✓] Red pins appear on map (should see ~22 in Akihabara area)
- [✓] User location blue dot visible (if permission granted)
- [✓] Status bar visible at top (battery indicator not covered)

### Pin Interaction
- [✓] Pins stay visible when zooming
- [✓] Pins stay visible when panning
- [✓] Tap a pin → Preview card appears at bottom
- [✓] Preview card shows: photo, name, distance, description
- [✓] Tap different pin → Switches to new preview
- [✓] Tap map background → Preview card closes
- [✓] Tap "View Details" on preview → Goes to detail screen
- [✓] Mts away shows meters based on current user location and not center of screen

### Search
- [✓] Search bar visible at top
- [✓] Type machine name → Shows results
- [✓] Select search result → Map centers on that location
- [✓] Selecting a result from search opens that preview card
- [✓] Search closes any other preview card

### Category Filters
- [✓] Filter bar visible below search (All, Drinks, Food, Gachapon, Weird, Retro, Ice Cream, Coffee, Alcohol)
- [✓] "All" selected by default (white background)
- [✓] Tap "Drinks" → Only drink machines visible
- [✓] Tap "Food" → Only food machines visible
- [✓] Multiple filters can be selected (OR logic)
- [✓] Tap "All" → Shows all machines again
- [✓] Filter updates instantly

### Recenter Button
- [✓] Recenter button visible (bottom right, above tab bar)
- [✓] Button positioned at bottom: 32px (not too high)
- [✓] Button easily reachable with thumb
- [✓] Tap recenter → Map moves to user location
- [✓] Zoom level resets to 14

## 📍 Machine Detail Screen

### Display
- [✓] Machine photo loads (or placeholder if no photo)
- [✓] Name displayed correctly
- [✓] Distance shown (e.g., "250m away")
- [✓] Distance show is from user and not from center of the screen map
- [✓] Address displayed (if available)
- [✓] Description shown
- [✓] Visit count displayed
- [✓] Status shown (active/pending/flagged)

### Actions
- [✓] "Get Directions" button works → Opens native maps app
- [✓] "I Visited" button visible
- [✓] "Save/Bookmark" button visible
- [✓] Back button returns to map

### Check-In Flow
- [✓] Tap "I Visited" → Shows dialog "Is this vending machine still here?"
- [✓] Three options: Cancel, No it's gone, Yes it's here
- [✓] Must be within 200m to check in
- [✓] If too far away → Error message "Too Far Away"
- [✓] If successful → "Checked In!" message
- [✓] Visit count increments by 1
- [✓] Button changes to "Visited ✓" and disables
- [✓] Can only check in once per day per machine
- [✓] If badge earned → Badge popup appears after success

### Save/Bookmark
- [✓] Tap bookmark icon → Machine saved
- [✓] Icon changes to filled bookmark
- [✓] Text changes to "Saved"
- [✓] Tap again → Removes from saved
- [✓] Icon changes back to outline
- [✓] Requires login (shows alert if not logged in)

## ➕ Add Machine Screen

### Access
- [✓] Tap "+" FAB on map screen → Opens add machine screen
- [✓] Header shows "Add Machine"
- [✓] Cancel button works

### Photo Upload
- [✓] "Take Photo" button opens camera
- [✓] "Choose from Gallery" button opens gallery
- [✓] Selected photo appears on screen
- [✓] Shows file size (should be <500KB after compression)
- [✓] "Tap to remove" works to clear photo
- [✓] Photo required (shows error if missing)

### Form Fields
- [✓] Name field (required, shows error if empty)
- [✓] Categories: Drinks, Food, Gachapon, Weird, Retro
- [✓] Can select multiple categories
- [✓] Selected categories highlighted in red
- [✓] Description field (required, multiline)
- [✓] Location auto-detected and displayed (lat, lng)

### Submit
- [✓] Submit button disabled while uploading
- [✓] Shows loading indicator while submitting
- [✓] Photo uploads to Supabase Storage
- [✓] Machine record created in database
- [✓] Categories linked correctly
- [✓] Success message appears
- [✓] If badge earned → Badge popup appears
- [✓] Returns to map after success
- [✓] New machine visible on map immediately

### Validation
- [✓] Can't submit without photo
- [✓] Can't submit without name
- [✓] Can't submit without description
- [✓] Shows helpful error messages

## 👤 Profile Screen

### User Info
- [✓] Avatar displayed (or placeholder)
- [✓] Display name / username shown
- [✓] Email address shown
- [✓] Bio displayed (if set)

### Stats
- [✓] Machines Added count correct
- [✓] Visits count correct
- [✓] Badges count correct

### Saved Machines Section
- [✓] "My Saved" section visible
- [✓] Shows list of bookmarked machines
- [✓] Each card shows: photo, name, address
- [✓] Tap card → Goes to machine detail
- [✓] Tap bookmark icon → Removes from saved (with confirmation)
- [✓] If no saved machines → Shows empty state message

### Badges Section
- [✓] "Badges" section visible
- [✓] Badge grid displayed
- [✓] Each badge shows icon and name
- [✓] Border color indicates rarity (gray=common, blue=rare, purple=epic)
- [✓] Tap badge → Shows description in alert
- [✓] If no badges → Shows empty state message

### Legal Section
- [✓] "Privacy Policy" link visible
- [✓] Tap → Opens privacy policy page
- [✓] Contact email shows: leandrotrabucco@gmail.com
- [✓] "Terms of Service" link visible
- [✓] Tap → Opens terms page
- [✓] Contact email shows: leandrotrabucco@gmail.com
- [✓] Back button works on legal pages

### Logout
- [✓] "Log Out" button visible (red outline)
- [✓] Tap → Shows confirmation dialog
- [✓] Cancel → Stays logged in
- [✓] Log Out → Returns to login screen
- [✓] After logout, can't access protected features

### Delete Account
- [✓] "Delete Account" button visible below logout (small, red, underlined text)
- [✓] Tap → Shows confirmation dialog with warning message
- [✓] Warning mentions data will be permanently deleted
- [✓] Cancel → Account not deleted
- [✓] Delete Account → Profile and data deleted
- [✓] User automatically logged out
- [✓] Cannot log back in with same credentials
- [✓] If error → Shows contact email (leandrotrabucco@gmail.com)

### Pull to Refresh
- [✓] Pull down → Shows loading indicator
- [✓] Stats refresh
- [✓] Saved machines refresh
- [✓] Badges refresh

## 🏆 Badge System

### Badge Unlocking
- [✓] First Find badge: Visit 1st machine
- [✓] Explorer badge: Visit 5 machines
- [✓] Contributor badge: Add 1st machine
- [✓] Badge popup appears when earned
- [✓] Popup shows badge icon, name, description
- [✓] Can dismiss popup
- [✓] Badge appears in profile immediately
- [✓] Badge count increments

### Badge Triggers to Test
- [✓] Visit 1 machine → "First Find"
- [✓] Add 1 machine → "Contributor"
- [✓] Visit 5 machines → "Explorer" (optional, takes time)

## 🔄 Data Persistence

### After App Close/Reopen
- [✓] User stays logged in
- [✓] Map returns to last location
- [✓] Saved machines persist
- [✓] Badges persist
- [✓] User stats correct

### Offline Behavior
- [✓] Turn off wifi → Map still shows last loaded pins
- [X] Can't add new machines (should show error)
- [X] Can't check in (should show error)
- [X] Graceful error messages

## 🐛 Edge Cases

### Network Issues
- [X] Slow connection → Shows loading states
- [X] No connection → Helpful error messages
- [X] Connection restored → App recovers

### GPS Issues
- [✓] Location permission denied → Map shows Tokyo
- [✓] GPS inaccurate → Check-in validates 200m radius
- [X] No GPS → Shows error when adding machine

### Invalid Data
- [✓] Machine with no photo → Shows placeholder
- [✓] Machine with no address → Hides address field
- [✓] Machine with no description → Shows empty
- [✓] Machine with no categories → Still visible on map

### Rapid Interactions
- [✓] Quickly tap multiple pins → Doesn't crash
- [✓] Spam zoom in/out → Pins stay visible
- [✓] Rapidly toggle filters → Doesn't break

## 📱 UI/UX

### Visual Polish
- [✓] App theme matches brand colors (red #FF4B4B, blue #3C91E6, cream #FDF3E7)
- [✓] Status bar shows battery/time/signal properly
- [✓] Status bar style is "dark" (black text)
- [✓] Buttons have proper press states
- [✓] Loading indicators appear for slow operations
- [✓] Images load smoothly
- [✓] Text is readable at all sizes
- [✓] No layout shifts or jumps
- [✓] Map loads without jerky zoom animation

### Navigation
- [✓] Bottom tabs work (Map, Profile)
- [✓] Back buttons work consistently
- [✓] Navigation stack works correctly
- [✓] Can't get stuck on any screen

### Permissions
- [✓] Location permission handled gracefully
- [✓] Camera permission requested when needed
- [✓] Gallery permission requested when needed
- [✓] Clear explanation why permissions needed

## 🎯 Critical User Flows

### New User Journey
1. [✓] Download app → Sign up → Map loads with pins
2. [✓] Tap pin → See details → Check in (if nearby)
3. [✓] Get "First Find" badge → Badge popup appears
4. [✓] Go to Profile → See badge and stats

### Add Machine Journey
1. [✓] Find real vending machine
2. [✓] Tap + → Take photo → Fill form → Submit
3. [✓] Get "Contributor" badge → Badge popup
4. [✓] Machine appears on map immediately
5. [✓] Go to Profile → See updated stats

### Discovery Journey
1. [✓] Open map → See pins in Akihabara
2. [✓] Filter by "Weird" → See only weird machines
3. [✓] Tap pin → View details → Save machine
4. [✓] Go to Profile → See saved machine

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

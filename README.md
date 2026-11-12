# Scented Roots: Figma to Expo translation (batch 1)

Drop the contents of `src/` into your project's `src/` folder. Paths assume
your existing layout: `src/app`, `src/components`, `src/constants`,
`src/context/ThemeContext`, and `firebaseConfig.ts` at the project root.

## 1. Install

```
npx expo install expo-linear-gradient
```

(`react-native-reanimated`, `expo-image-picker` and `@react-native-async-storage/async-storage`
are already in your project.)

## 2. What's in this batch

| File | Figma frame(s) |
| --- | --- |
| `constants/theme.ts` | Theme Light / Theme Dark variables (merge into yours; adds `onAccent`) |
| `components/ui/Button.tsx` | primary / outline / soft / danger pills |
| `components/ui/TextField.tsx` | inputs (with label + error) |
| `components/ui/Avatar.tsx` | gradient-initial avatars |
| `components/ui/Chip.tsx` | accord / filter chips |
| `components/ui/Skeleton.tsx` | Collection Loading |
| `components/PostCard.tsx` | Feed post and Post Detail header (carousel, counter, dots) |
| `components/CollectorRow.tsx` | Discover "Collectors to follow" row |
| `components/MyPostRow.tsx` | My Posts rows |
| `lib/cloudinary.ts` | shared upload helper (replaces the copy-pasted fetch blocks) |
| `app/login.tsx` | Login |
| `app/signup.tsx` | Sign Up (terms checkbox, verification email) |
| `app/terms.tsx` | Terms & Conditions |
| `app/verify-email.tsx` | Verify Email |
| `app/add-from-catalog.tsx` | Add from Catalog (confirm + optional photo) |

## 3. Wire it up

### Register the new routes in the root `_layout.tsx`

```tsx
<Stack.Screen name="signup" options={{ headerShown: false }} />
<Stack.Screen name="terms" options={{ title: "Terms & Conditions" }} />
<Stack.Screen name="verify-email" options={{ headerShown: false, gestureEnabled: false }} />
<Stack.Screen name="add-from-catalog" options={{ title: "Add to Collection" }} />
```

### Let signed-out users reach signup / terms, and gate unverified users

Replace the redirect effect in `RootLayoutNav`:

```tsx
useEffect(() => {
  if (initializing) return;

  const first = segments[0] as string | undefined;
  const publicRoutes = ["login", "signup", "terms"];
  const inPublic = !!first && publicRoutes.includes(first);

  if (!user) {
    if (!inPublic) router.replace("/login");
    return;
  }

  // Only require verification for accounts created after you ship this, so
  // existing test users aren't locked out. Set the date to your release day.
  const VERIFY_AFTER = new Date("2026-11-01").getTime();
  const created = new Date(user.metadata.creationTime ?? 0).getTime();
  const needsVerification = !user.emailVerified && created >= VERIFY_AFTER;

  if (needsVerification) {
    if (first !== "verify-email" && first !== "terms") router.replace("/verify-email");
    return;
  }

  if (inPublic || first === "verify-email") router.replace("/feed");
}, [user, initializing, segments]);
```

### Route catalog search through the confirm screen

In `catalog-search.tsx`, replace the body of `handleAdd` with:

```tsx
const handleAdd = (item: CatalogFragrance) => {
  router.push({ pathname: "/add-from-catalog", params: { id: item.id } });
};
```

(You can then delete `addingId`, `auth`, and the `addDoc` import from that file.)

### Adjust two route names

`add-from-catalog.tsx` (`COLLECTION_ROUTE`) and `verify-email.tsx` (`"/feed"`)
use `/collection` and `/feed`. Change them if your tab routes live elsewhere
(for example `/(tabs)/feed`).

## 4. Not translated yet (I need your current files)

These screens already have working logic in your app, so I didn't want to
overwrite them blind: Feed, Discover, collector profile (`user/[id]`), New Post
(compose and edit), Post Detail, Collection (stat blocks, filter chips, My Posts,
skeleton), tab bar styling, Settings, Detail. Send me those files and I'll
restyle them in place using the components above (`PostCard`, `CollectorRow`,
`MyPostRow`, `CollectionSkeleton`, etc.) without touching your data code.

## 5. Notes

- Terms text is placeholder copy. Have it reviewed before publishing.
- `onAccent` is new: it's the text color on accent buttons (white in light mode,
  dark in dark mode, so contrast holds with the lighter dark-mode accent).
- Headings use `fontWeight: "700"` on your default font. If you load Inter
  explicitly, add the `fontFamily` in the components' `StyleSheet`s.

# Design: Frontend Cache

## Strategy

Use React `useRef` or `useState` as an in-memory cache within the `Projects` page component. No external library needed.

### Cache Keys

**List cache:** `${accountId}:${categorySlug}:${pageNumber}`
**Detail cache:** `${externalId}`

### Cache Entry

```ts
interface CacheEntry<T> {
  data: T
  cachedAt: number // timestamp ms
}
```

### Stale Threshold

5 minutes (300,000 ms) — shorter than backend's 15min because frontend cache is ephemeral.

### Flow: Open Modal

```
User clicks project
  ├─ Check detail cache for externalId
  │     ├─ HIT + FRESH → show instantly, NO skeleton
  │     └─ MISS or STALE → show skeleton, fetch, cache, show
  └─ Done
```

### Flow: Change Page

```
User clicks "Next →"
  ├─ Check list cache for key
  │     ├─ HIT + FRESH → show instantly
  │     └─ MISS or STALE → show skeleton, fetch, cache, show
  └─ Done
```

### Background Refresh

When cache is stale but present, show cached data first, then silently refresh in background and update if data changed.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Projects.tsx` | Add cache state/refs, update `fetchProjects` and `openProjectModal` to use cache |

# Proposal: Frontend Cache

## Problem

Every interaction triggers a fresh API call:
- Clicking a project → always scrapes live (3s wait)
- Changing page → always re-fetches
- Going back to a previous page → re-fetches again
- Re-opening a modal → re-scrapes again

This is slow even with the backend optimizations.

## Goals

1. Cache project detail + proposals in the frontend component state
2. Cache project list pages (account × category × page)
3. Show cached data **instantly** when available
4. Refresh in background if data is stale (> 5 minutes)
5. Target: modal opens in < 100ms on second click, pagination is instant

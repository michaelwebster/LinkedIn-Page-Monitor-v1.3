# Development

This document is the technical refresh file for humans and LLMs resuming
work on LinkedIn Page Monitor.

## Product state

Version 1.3.0 is a working prototype configured for Franchise-Info LLC.
It is being treated as a client-test version rather than a generalized
public product.

The extension has two distinct responsibilities:

1.  Maintain a persistent Franchise-Info control inside LinkedIn's
    React-managed top navigation.
2.  Detect new Franchise-Info posts/reposts and persist a notification
    state independently of the injected DOM.

Keeping those responsibilities separate is important. LinkedIn can
destroy and rebuild our toolbar element without changing whether new
activity has been detected.

## Files

### `manifest.json`

Manifest V3 configuration.

Current permissions:

-   `storage` --- persists activity baselines, notification state, and
    diagnostics.
-   `alarms` --- schedules secondary background checks.

Host access is limited to `https://www.linkedin.com/*`.

### `content.js`

Runs on LinkedIn pages and handles:

-   discovering the LinkedIn navigation insertion point;
-   injecting/reinjecting the Franchise-Info toolbar control;
-   restoring notification state after LinkedIn rerenders;
-   updating the hover diagnostic;
-   scanning rendered LinkedIn post cards;
-   authoritative company-page DOM detection;
-   metadata enrichment from relevant repost cards elsewhere on
    LinkedIn.

### `content.css`

Styles the injected toolbar control.

Important geometry in v1.3:

-   toolbar link height: 52px;
-   icon wrapper: 24px × 24px;
-   logo artwork: 27px × 27px;
-   blue notification state uses `outline`, not `border`, so it does not
    change layout;
-   toolbar link currently uses `transform: translateY(-1px)`.

Alignment has been tuned empirically against LinkedIn's current
navigation and may need repair if LinkedIn changes its header.

### `background.js`

Manifest V3 service worker.

It:

-   creates an alarm for approximately 10-minute checks;
-   fetches the Franchise-Info posts URL using the signed-in browser
    context;
-   looks for LinkedIn `activity`, `share`, and `ugcPost` IDs;
-   limits candidates to IDs near references to the monitored company
    slug;
-   maintains background baseline and diagnostics;
-   can set the shared `fiHasNewPost` notification state.

This detector is secondary because fetched HTML does not necessarily
contain the same content as LinkedIn's rendered application DOM.

## Core DOM Tools pattern

LinkedIn is a React application. Injected DOM is not owned by React and
can disappear whenever LinkedIn rerenders the navigation.

The extension therefore follows this cycle:

**Discover → Model → Generate → Observe → Regenerate**

For the toolbar this means:

1.  Discover the currently visible LinkedIn navigation.
2.  Determine whether the Page Monitor control exists in the correct
    live tree.
3.  Generate the control when needed.
4.  Observe DOM mutations.
5.  Regenerate the control after LinkedIn removes/replaces it.

A periodic fallback check also runs because React transitions can occur
in stages.

## Notification state must not live in the toolbar element

A critical bug discovered during testing was:

1.  Page Monitor detected new activity and made the logo blue.
2.  LinkedIn changed its own red notification state.
3.  LinkedIn rerendered the navigation and deleted our injected element.
4.  A replacement Page Monitor button was created without the active
    visual state.

The fix was to persist/cache `fiHasNewPost` independently of the DOM.
Every newly created toolbar control reads/restores that state.

The rule is:

> The DOM renders monitor state; it is not the source of monitor state.

## Original post versus repost

This was the most important detection discovery.

### Original Franchise-Info post

For an original company post, the main LinkedIn actor points to the
monitored company page. Current selectors include:

-   `.update-components-actor__meta-link[href]`
-   `.update-components-actor__image[href]`

If the actor link resolves to the Franchise-Info company slug, the card
can be treated as an original company post.

### Franchise-Info repost

A repost is structurally different.

LinkedIn keeps the **original author** as the main post actor. The
reposting company is represented in a separate header above the actor.

Observed rendered markup includes:

-   `.update-components-header__text-view`
-   text containing `Franchise-Info LLC reposted this`
-   a nearby link to `/company/franchise-info-sponsored/`

Example observed behavior:

-   reposting company: Franchise-Info LLC;
-   main actor/original author: Fred Copestake;
-   header: `Franchise-Info LLC reposted this`.

Therefore:

> Do not identify a repost by assuming the main actor is Franchise-Info.

Current repost logic looks for a repost header containing
`reposted this` and verifies that a nearby link belongs to the monitored
company.

## Rendered-DOM authority

When the Franchise-Info posts page is open, rendered DOM is the
authoritative activity source.

The feed is assumed to be newest-first. The first matching
Franchise-Info activity becomes the current visible activity and is
converted into a fingerprint.

A first scan establishes a DOM baseline. A later change in the newest
fingerprint sets `fiHasNewPost = true`.

Cards found on other LinkedIn pages, such as Home, are not used as
authoritative evidence that a new company-page event occurred. They are
used only to enrich an already-active notification with readable
metadata such as the original actor name.

This avoids treating Home-feed reordering as new company activity.

## Activity fingerprints

Where possible, the extension uses a stable LinkedIn post identifier
from attributes such as:

-   `data-urn`
-   `data-id`

It looks for `activity`, `share`, or `ugcPost` numeric identifiers.

If a stable ID is unavailable, the fingerprint falls back to a
combination of:

-   activity type;
-   actor;
-   displayed time;
-   source/header text.

Fallback fingerprints are necessarily more fragile.

## Background detector

The background service worker fetches:

`https://www.linkedin.com/company/franchise-info-sponsored/posts/?feedView=all&viewAsMember=true`

It searches for LinkedIn activity identifiers near occurrences of the
company slug.

This approach previously failed because the detector selected the
numerically largest activity ID anywhere in the returned HTML. Unrelated
LinkedIn activity could become the saved baseline and suppress
legitimate Franchise-Info alerts.

The current background detector narrows the search to regions
surrounding `franchise-info-sponsored`.

Even so, background HTML remains secondary because LinkedIn may:

-   return a login/checkpoint/authwall;
-   return an application shell without rendered posts;
-   load activity later through JavaScript/API calls;
-   represent reposts differently from original posts.

## Diagnostics

Hovering the Franchise-Info toolbar control exposes lightweight
operational diagnostics.

Current state can include:

-   whether new activity is flagged;
-   last check time;
-   last check result;
-   last seen activity;
-   next scheduled background check.

Diagnostics were added because silent failure made it difficult to
distinguish among:

-   scheduler failure;
-   fetch failure;
-   detection failure;
-   DOM/rerender failure;
-   stale baseline.

Keep diagnostics lightweight and user-readable. They are useful both
during development and for client testing.

## Storage/state concepts

Current code uses local storage keys including concepts such as:

-   latest background activity ID;
-   DOM latest fingerprint;
-   `fiHasNewPost`;
-   detector versions;
-   last check time/status;
-   next check time;
-   last seen activity.

Detector versioning is important. When detection logic changes
materially, an old baseline may no longer be comparable to the new
detector and may need to be reset/migrated.

## Known fragile assumptions

1.  LinkedIn's navigation structure and insertion point remain
    discoverable.
2.  Current LinkedIn class names remain available.
3.  Company feeds are rendered newest-first.
4.  Repost headers continue to contain language equivalent to
    `reposted this`.
5.  The current implementation is English-language dependent for repost
    text detection.
6.  LinkedIn continues to expose company links in repost headers.
7.  Background fetches continue to use a sufficiently authenticated
    LinkedIn context.
8.  Activity/share/ugcPost identifiers remain available in useful
    markup/attributes.
9.  Toolbar dimensions remain close to the current 52px geometry.

## Testing checklist

Before treating a release as stable, test:

-   toolbar appears after a hard refresh;
-   toolbar survives LinkedIn SPA navigation;
-   toolbar survives LinkedIn red-notification changes;
-   blue state survives toolbar destruction/reconstruction;
-   original company post can be detected;
-   company repost can be detected;
-   repost identifies the original actor when available;
-   hover diagnostic updates;
-   next-check time advances;
-   clicking the Franchise-Info control opens the expected posts URL;
-   clicking clears the active notification as currently designed;
-   no duplicate toolbar controls appear.

## Development principle

Do not generalize prematurely.

v1.3 is intentionally configured for Franchise-Info. Client testing
should reveal which parts are truly reusable configuration and which
additional behaviors people actually value.

When generalization begins, likely configuration candidates include:

-   company name;
-   company slug/URL;
-   toolbar logo;
-   destination URL;
-   notification label/color;
-   monitored activity types.

Those are candidates, not committed roadmap features.

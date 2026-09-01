# Changelog

All notable changes to LinkedIn Page Monitor are recorded here. The code
and `manifest.json` are authoritative for the current implementation.

## 1.3.0

-   Enriched active Franchise-Info repost notifications from rendered
    cards anywhere on LinkedIn, including the Home feed.
-   Extracted the original actor name more precisely, allowing details
    such as `repost · Fred Copestake · 1d`.
-   Kept company-page DOM scans authoritative for detecting new
    activity; cards elsewhere on LinkedIn are metadata-only so feed
    reordering does not create false alerts.

## 1.2.0

-   Made the rendered Franchise-Info company feed the authoritative
    detector when the company posts page is open.
-   Added repost detection using LinkedIn's separate repost header: a
    Franchise-Info company link plus `reposted this`.
-   Added original-post detection using the main actor link when it
    points to the Franchise-Info company page.
-   Added a DOM activity fingerprint and `last seen` activity detail.
-   Retained the periodic background HTML check as a secondary detector.

## 1.1.0

-   Added the next scheduled monitor check time to the toolbar hover
    diagnostic.
-   Retained last-check time and diagnostic result.

## 1.0.0

-   Reworked the background detector after testing showed that unrelated
    LinkedIn activity IDs could pollute the saved baseline.
-   Limited candidate IDs to IDs occurring near references to the
    Franchise-Info company slug.
-   Reset the detector baseline for the new detector version.
-   Added hover diagnostics for last check time and result.
-   Changed background checks to approximately every 10 minutes.

## 0.9.0

-   Fine-tuned toolbar alignment by moving the Franchise-Info control
    down 1px from the v0.8 position.

## 0.8.0

-   Fine-tuned toolbar alignment against LinkedIn's native navigation.
-   Adjusted vertical position, icon/label spacing, and logo artwork
    size.

## 0.7.0

-   Corrected toolbar geometry to better match LinkedIn's native
    navigation.
-   Reduced the icon wrapper to 24px.
-   Changed the blue activity ring from a layout-affecting border to an
    outline.

## 0.6.0

-   Renamed the extension to **LinkedIn Page Monitor**.
-   Moved new-activity state out of the injected DOM and into extension
    storage/state.
-   Restored notification state whenever the toolbar control is
    reconstructed.
-   Added stale-toolbar detection and a 1.5-second repair fallback for
    LinkedIn React rerenders.
-   Replaced the notification dot with a blue outline/ring around the
    Franchise-Info logo.

## 0.5.0

-   Strengthened toolbar repair behavior after testing showed LinkedIn's
    own red notification updates could rerender the top navigation and
    remove the injected control.

## 0.4.0

-   Expanded activity-ID detection to include LinkedIn activity, share,
    and ugcPost identifiers so repost/share activity could be
    considered.

## 0.3.0

-   Added the first new-activity indicator.
-   Added periodic checking and local storage of the latest detected
    activity.
-   Established a baseline on first successful check to avoid an
    immediate false notification.

## 0.2.0

-   Changed the toolbar destination to the Franchise-Info Sponsored
    posts feed.

## 0.1.0

-   Created the standalone Franchise-Info LinkedIn toolbar shortcut.
-   Added same-tab navigation.
-   Added reinsertion after LinkedIn React rerenders.

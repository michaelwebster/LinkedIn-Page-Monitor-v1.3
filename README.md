# LinkedIn Page Monitor

LinkedIn Page Monitor is a Chrome/Edge extension that adds a monitored
company-page shortcut to LinkedIn's top navigation.

The current v1.3 prototype is configured for **Franchise-Info LLC**. It
places the Franchise-Info logo in the LinkedIn toolbar, opens the
Franchise-Info posts feed when clicked, and shows a blue outline when
new company-page activity is detected.

## Current purpose

This version is a working client-test prototype. The immediate objective
is to observe how real users use it and what they ask for before
generalizing the product.

## Current capabilities

-   Adds a Franchise-Info shortcut to LinkedIn's top navigation.
-   Opens the Franchise-Info posts feed in the current tab.
-   Detects original Franchise-Info posts.
-   Detects Franchise-Info reposts, including reposts whose main post
    actor is the original author.
-   Shows a blue outline around the Franchise-Info logo when new
    activity is detected.
-   Preserves notification state when LinkedIn rerenders its navigation.
-   Enriches repost notifications with the original actor name when the
    relevant rendered card is available.
-   Shows monitor diagnostics on hover, including last check, result,
    last-seen activity, and next scheduled background check.
-   Runs a secondary background check approximately every 10 minutes.

## Installation for local/client testing

1.  Download or clone this repository.
2.  Open `chrome://extensions` in Chrome or Edge's equivalent extensions
    page.
3.  Turn on **Developer mode**.
4.  Click **Load unpacked**.
5.  Select the repository folder containing `manifest.json`.
6.  Open or refresh LinkedIn.

When updating a locally loaded copy, replace the files, use **Reload**
on the extensions page, and refresh LinkedIn.

## How to use it

Use LinkedIn normally. The Franchise-Info control appears in the top
navigation.

-   **Normal logo:** no unseen activity is currently flagged.
-   **Blue outline:** LinkedIn Page Monitor has detected new
    Franchise-Info activity.
-   **Hover:** shows the monitor's current diagnostic state.
-   **Click:** opens the Franchise-Info posts feed and clears the
    current notification state.

## How detection works

The extension currently uses two complementary mechanisms.

**Rendered DOM detection is authoritative when the Franchise-Info posts
page is open.** It reads LinkedIn's rendered post cards to distinguish
original company posts from reposts.

**Background HTML checking is secondary.** A Manifest V3 service worker
periodically fetches the Franchise-Info posts URL and looks for LinkedIn
activity/share/ugcPost identifiers near references to the monitored
company.

The background method is useful for unattended checking but is less
reliable because LinkedIn may not include the same information in
fetched HTML that it renders in an interactive signed-in tab.

## Current monitored page

`https://www.linkedin.com/company/franchise-info-sponsored/posts/?feedView=all&viewAsMember=true`

## Current limitations

-   v1.3 is hard-coded for Franchise-Info rather than user-configurable.
-   LinkedIn is a React application and can change its DOM, class names,
    navigation structure, or background responses without notice.
-   Rendered-DOM detection requires LinkedIn to have rendered the
    relevant content.
-   Background checks may miss activity that LinkedIn loads only after
    JavaScript runs.
-   The extension does not use an official LinkedIn API.
-   The extension does not automate likes, comments, reposts, or other
    engagement.

## Repository documentation

-   `CHANGELOG.md` --- release history.
-   `DEVELOPMENT.md` --- architecture, implementation knowledge,
    selectors, failure modes, and debugging notes.
-   `ROADMAP.md` --- current testing objective and unanswered product
    questions.

## Version

Current client-test version: **1.3.0**

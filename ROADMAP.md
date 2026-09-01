# Roadmap

## Current phase

LinkedIn Page Monitor v1.3 is in **client testing**.

The current objective is not to add every technically possible feature.
It is to observe how real people use the tool and let their questions
and workflow problems reveal what the product should become.

## Current product hypothesis

A persistent company-page control inside LinkedIn can make relevant
company activity easier to notice and easier to reach.

The Franchise-Info prototype currently provides:

-   a permanent Franchise-Info toolbar shortcut;
-   new post/repost awareness;
-   a visible blue notification state;
-   human-readable hover diagnostics;
-   direct access to the Franchise-Info posts feed.

## Questions for client testing

-   Do users understand what the blue outline means without extensive
    explanation?
-   Do they notice and use the Franchise-Info toolbar control?
-   Do they use the hover information?
-   What do they expect to happen when they click a new-activity
    notification?
-   Do they ask to monitor their own company page?
-   Do they ask to monitor more than one company page?
-   Do they ask for direct navigation to the specific new post/repost?
-   Do they ask for other kinds of company-page activity?
-   Which requests reflect recurring workflow problems rather than
    one-off feature ideas?
-   Does the tool remain useful after the novelty wears off?

## Candidate directions --- not commitments

The following ideas have arisen during development, but should not be
implemented merely because they are possible:

-   configurable company page and logo;
-   monitoring multiple pages;
-   direct-to-new-post navigation;
-   richer activity descriptions;
-   additional company-page events;
-   packaging for broader client distribution.

Client behavior should determine whether any of these become real
roadmap items.

## Boundaries

LinkedIn Page Monitor should remain an awareness/navigation augmentation
unless user needs clearly justify a broader role.

The current product does **not** automate:

-   likes;
-   comments;
-   reposts;
-   coordinated engagement;
-   other actions intended to simulate human engagement.

## Decision rule

Before adding a feature, ask:

1.  Did a real user request it or did observed behavior reveal the
    problem?
2.  Does it improve an actual LinkedIn workflow?
3.  Is it appropriate for a lightweight DOM augmentation?
4.  Can it be implemented without making the tool fragile or opaque?

If the answer is unclear, keep testing the current version.

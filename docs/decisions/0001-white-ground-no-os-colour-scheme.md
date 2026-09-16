# 0001: White page ground, no OS colour scheme

Date: 16 September 2026. Decided by Andreas.

**Decision.** The page ground (`--hds-bg`) is white, not limewash; limewash is for sunken bands and tints. The site does not follow the OS colour scheme: the `prefers-color-scheme: dark` media query is removed.

**Why.** The charcoal theme showed up for dark-mode visitors, which is not what the brand wants on the public site.

**Consequence.** The charcoal theme still exists but only switches on with `data-theme="dark"` on the root, which nothing sets today. Do not reintroduce the media query.

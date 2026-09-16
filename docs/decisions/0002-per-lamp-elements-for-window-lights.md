# 0002: Each window light is its own element

Date: 14 September 2026.

**Decision.** Window lights are fifteen tiny `<svg>` elements outside the house drawing, one per window, and only their opacity animates.

**Why.** Three earlier attempts failed: fading lights inside the house SVG repainted the 5,600-node facade every frame and Chrome showed blurry tiles on hover; one overlay SVG with clipped clones still repainted on every frame because clipping is slow; only per-element opacity gives the compositor a zero-repaint path.

**Consequence.** Do not animate anything inside a large SVG. Details in [house-rendering.md](../architecture/house-rendering.md).

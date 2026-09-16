# How the house rendering works

Read before touching `src/components/house/HouseStage.tsx`.

Three camera levels: 0 whole facade, 1 whole facade with one lit window and a five-second tour, 2 zoomed into the window ("inside"). Hover → level 1 and switches windows; click the lit window → level 2; Escape or clicking the stage backs out.

Rendering pipeline, and why each part exists:
1. The web component is created imperatively into `.houseHost` after `customElements.whenDefined` and `el.ready`; React never reconciles its 5,600 nodes. Event subscriptions depend on the `bound` state, not on script load (the element appears a tick later).
2. The camera transform is applied to `.subject`, a wrapper that holds the house **and** two overlays, so they move together. Camera updates run synchronously in the effect (not rAF).
3. The component's own card/rail is hidden; the pane beside the stage carries the copy.
4. **Domain window visuals are hidden in the house** (`.tuc-window[data-domain] > :not(.tuc-hit) { opacity: 0 }`) but the hit rects stay for hover/click/focus. The five decorative windows have no domain and no overlay clone, so they stay visible in the drawing.
5. **Static overlay** `.windows`: an SVG with a clone of every window group (glass, clipped panes, frame, focus ring) plus the clip paths they reference. Never changes on hover.
6. **Lamps** `.lamps`: fifteen tiny `<svg>` elements, one per window, each holding only that window's light rect with its clip path (ids suffixed `-lamp`). Opacity animates on the *element* (`data-state` off/near/active) so the compositor blends it with **zero repaint**.
7. **Foot fade** `.houseFade`: a gradient from `--hds-bg` to transparent over the bottom 5% of `.subject`, so it scales and moves with the camera. It replaced a fixed-height gradient on the stage edge. It is an overlay, not a CSS mask: a mask on the drawing forces a composited layer on 5,600 nodes.

History, so nobody repeats it: (a) rebuilding the bundle without `house.css` lit every window permanently; (b) fading lights inside the house SVG repainted the whole facade each frame and Chrome showed blurry low-res tiles on hover; (c) moving the lights into one overlay SVG with clipped window clones still repainted that overlay each frame (clipping is slow) → same blur; (d) per-lamp elements fixed it. Do not animate anything inside a large SVG.

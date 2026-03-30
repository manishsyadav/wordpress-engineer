# CSS3 — Interview Questions

## Basic

**Q: What is the difference between `display: none` and `visibility: hidden`?**
**A:** `display: none` removes the element from the document flow — it takes up no space and is not accessible to screen readers. `visibility: hidden` hides the element but preserves its space in the layout. Use `display: none` to completely remove; `visibility: hidden` when you want to hide but maintain layout.

**Q: What is the CSS `position` property? Explain each value.**
**A:** `static` (default) — normal flow, top/left/right/bottom have no effect. `relative` — offset from normal position, still in flow. `absolute` — removed from flow, positioned relative to nearest non-static ancestor. `fixed` — relative to viewport, stays on scroll. `sticky` — relative until scroll threshold, then fixed.

**Q: What is `z-index` and when does it not work?**
**A:** `z-index` controls stacking order — higher value = on top. Only works on positioned elements (`position` other than `static`) or flex/grid items. Stacking contexts (created by `opacity < 1`, `transform`, `filter`, `isolation: isolate`) limit `z-index` scope — a child can't appear above an element outside its stacking context.

**Q: What is the difference between `em`, `rem`, `%`, `px`, and `vw`?**
**A:** `px` — absolute pixels. `em` — relative to parent font-size (compounds in nesting). `rem` — relative to root (`html`) font-size (no compounding, consistent). `%` — relative to parent dimension. `vw/vh` — percentage of viewport width/height. WordPress themes prefer `rem` for font sizes and `%`/`vw` for widths.

**Q: How do you center an element horizontally and vertically?**
**A:** Flexbox: `display: flex; justify-content: center; align-items: center` on parent. Grid: `display: grid; place-items: center`. Absolute positioning: `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)`. Modern: `margin: auto` on a grid/flex item.

## Mid

**Q: What is the difference between `flex-grow`, `flex-shrink`, and `flex-basis`?**
**A:** `flex-basis` — initial size before free space is distributed. `flex-grow` — how much the item grows relative to others when there's extra space (0 = don't grow). `flex-shrink` — how much it shrinks when there's insufficient space (0 = don't shrink). Shorthand: `flex: 1` = `flex: 1 1 0%` (grow, shrink, start from 0).

**Q: How do CSS custom properties (variables) differ from Sass variables?**
**A:** CSS variables are runtime — they can be changed via JavaScript, updated in media queries, and scoped to specific DOM elements. Sass variables are compile-time — resolved to static values in the output CSS, cannot change at runtime. CSS variables cascade (inherit through DOM); Sass variables don't. WordPress Full Site Editing uses CSS variables for theme customization.

**Q: What are CSS Animations and how do you ensure they are performant?**
**A:** Use `@keyframes` to define animation states, `animation` shorthand to apply. Performant animations: only animate `transform` (translate, scale, rotate) and `opacity` — these are handled by the GPU compositor without triggering layout or paint. Avoid animating `width`, `height`, `top`, `left`, `background-color` — they cause reflow/repaint.

**Q: What is a CSS stacking context and what creates one?**
**A:** A stacking context is an isolated layer of the DOM where z-index values are relative to each other. Created by: `position` + `z-index` (not auto), `opacity < 1`, `transform`, `filter`, `will-change`, `isolation: isolate`, `mix-blend-mode`. Elements inside a stacking context cannot be stacked above/below elements outside it regardless of z-index.

**Q: Explain the `::before` and `::after` pseudo-elements.**
**A:** Virtual elements inserted before/after an element's content. Require `content` property (even `content: ''`). Used for: decorative icons, clearfix (legacy), counters, tooltips. They are in the DOM but not in HTML. `position: absolute` is common for decorative use. In WordPress themes, used extensively for icons and decorative shapes.

## Advanced

**Q: What is CSS specificity and how do you manage it in large projects?**
**A:** Specificity is a weight system: inline (1000) > id (100) > class/pseudo-class/attribute (10) > element (1). High specificity leads to "specificity wars" requiring ever-more-specific selectors. Solutions: BEM naming (all single-class = equal specificity), `@layer` cascade layers (lower-layer styles always lose to higher layers), `:where()` (zero specificity), CSS Modules (scoped class names).

**Q: What are CSS Container Queries and why are they better than Media Queries for components?**
**A:** Container queries (`@container`) respond to the size of the parent container, not the viewport. This makes components truly reusable — a card component adapts to being in a narrow sidebar or a wide main area without needing to know about the page layout. `container-type: inline-size` on the parent, `@container (min-width: 400px) {}` on the component. Supported in all modern browsers.

**Q: How does `will-change` work and when should you use it?**
**A:** `will-change: transform` hints to the browser to promote the element to its own compositor layer ahead of time, avoiding the layer creation overhead on first animation frame. Use sparingly — only when an element is about to animate and you've measured a performance problem. Overusing it consumes GPU memory and can degrade performance. Remove it after the animation if applied dynamically.

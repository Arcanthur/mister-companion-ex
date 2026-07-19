# CSS Developer Map

- `src/styles.css` owns shared foundations, reusable application components, Settings, theme editing, window effects, scrollbars, and cross-library layout.
- `src/mister-vaultkit.css` owns MiSTer-specific shell components and feature-page layouts. Its versioned rules remain chronological because later entries are deliberate cascade refinements.
- `src/win9x.css` and `src/macos-platinum.css` are final visual layers. They replace shared chrome without taking ownership of application behavior.
- Responsive rules remain beside the components they protect. This avoids moving media-query overrides across later cascade locks.

## Property Order

Declarations follow one stable sequence inside each rule:

1. CSS custom properties
2. Box model and layout
3. Positioning and stacking
4. Typography
5. Visual treatment and color
6. Interaction, overflow, transforms, animation, and miscellaneous behavior

Related shorthand and longhand declarations retain their original relative order to protect cascade semantics.

## Section Banners

Every stylesheet begins with a file-level developer map and uses numbered banners for major regions. Comments explain why a structural trick or late override exists, especially when source order is part of the behavior.

## Formatting

Run:

```bash
npm run format:css
```

The formatter preserves selector and rule order, groups declarations by the property sequence above, formats with two-space indentation, refreshes section banners, and consolidates shared motion and scrollbar values into root-level tokens.

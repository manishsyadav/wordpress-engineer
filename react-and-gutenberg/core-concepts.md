# React & Gutenberg — Core Concepts

## 1. Virtual DOM

React maintains a lightweight in-memory copy of the real DOM. When state or props change, React diffs the new virtual tree against the previous one (reconciliation) and applies only the minimal set of changes to the real DOM. This makes UI updates fast and predictable.

Key ideas:
- Reconciliation uses a "diffing" algorithm (O(n) heuristics).
- Elements with the same `key` prop are re-used; mismatched keys cause unmount/remount.
- Fiber (React 16+) makes reconciliation interruptible for better scheduling.

---

## 2. React Hooks

### `useState`
Declares a state variable inside a function component. Returns `[value, setter]`. Calling the setter triggers a re-render.

### `useEffect`
Runs side-effects (data fetching, subscriptions, DOM mutations) after render. The dependency array controls when it re-runs:
- `[]` — run once on mount.
- `[dep]` — run when `dep` changes.
- No array — run after every render.
Return a cleanup function to unsubscribe/cancel.

### `useCallback`
Memoizes a function reference so it only changes when its listed dependencies change. Prevents child components wrapped in `React.memo` from re-rendering unnecessarily.

### `useMemo`
Memoizes the **result** of an expensive computation. Re-computes only when dependencies change. Use for derived data (filtered arrays, heavy calculations).

### `useRef`
Returns a mutable object `{ current: value }` that persists across renders without causing re-renders. Common uses: DOM node references, storing previous values, interval IDs.

---

## 3. Gutenberg Block Architecture

Gutenberg is a block editor built on React. Every piece of content is a block — a self-contained unit with its own markup, styles, and settings.

Architecture layers:
1. **Block registration** — PHP (`register_block_type`) + JS (`registerBlockType`).
2. **Edit component** — React component rendered inside the editor.
3. **Save function** — pure function that returns the static HTML stored in `post_content`.
4. **Block supports** — opt-in editor features (color, typography, spacing).
5. **Inspector Controls** — sidebar panel for block settings.

---

## 4. `block.json`

The canonical block metadata file. WordPress reads it to register the block on the server side and pass metadata to the JS runtime.

Key fields:

| Field | Purpose |
|---|---|
| `apiVersion` | Gutenberg API version (use `3` for latest) |
| `name` | Unique namespace/block-name identifier |
| `title` | Human-readable label shown in the inserter |
| `category` | Inserter category (text, media, design, …) |
| `attributes` | Typed data the block stores in its comment delimiters |
| `supports` | Opt-in editor features (color, typography, spacing, align) |
| `editorScript` | JS file for the editor |
| `viewScript` | JS file for the front end |
| `render` | PHP template file for dynamic blocks |
| `example` | Preview data shown in the block inserter |
| `styles` | Named style variants |
| `transforms` | Rules for converting to/from other blocks |

---

## 5. `registerBlockType`

The JS function that registers a block in the editor.

```js
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import save from './save';

registerBlockType( metadata.name, {
    ...metadata,
    edit: Edit,
    save,
} );
```

The spread of `metadata` brings in `title`, `category`, `attributes`, `supports`, etc. from `block.json`.

---

## 6. `edit` vs `save`

| | `edit` | `save` |
|---|---|---|
| Runs in | Editor (browser) | Editor + front end |
| Can use hooks | Yes | No |
| Has access to `setAttributes` | Yes | No |
| Output stored in DB | No | Yes (serialized HTML) |
| Side effects allowed | Yes | No (must be pure) |

When saved HTML no longer matches what `save` would produce, WordPress shows a **block validation error** and offers to attempt recovery.

Dynamic blocks return `null` from `save` and delegate rendering to a PHP callback.

---

## 7. InspectorControls

`InspectorControls` renders content into the editor sidebar (Settings panel). Wrap it inside the `edit` component. Nest `PanelBody` for collapsible groups.

```jsx
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ColorPicker } from '@wordpress/components';

function Edit( { attributes, setAttributes } ) {
    return (
        <>
            <InspectorControls>
                <PanelBody title="Color Settings">
                    <ColorPicker
                        color={ attributes.backgroundColor }
                        onChange={ ( val ) => setAttributes( { backgroundColor: val } ) }
                    />
                </PanelBody>
            </InspectorControls>
            <div style={ { backgroundColor: attributes.backgroundColor } }>
                Block content
            </div>
        </>
    );
}
```

---

## 8. RichText

`RichText` is a contenteditable-like component that stores formatted text as HTML. It supports inline formats (bold, italic, links) and fires `onChange` with the new HTML string.

Important props:
- `tagName` — the HTML element rendered (default `div`).
- `value` — current HTML string from attributes.
- `onChange` — callback receiving the new HTML string.
- `allowedFormats` — array of allowed format types (e.g. `['core/bold']`).
- `placeholder` — ghost text when empty.

---

## 9. MediaUpload

`MediaUpload` opens the WordPress media library modal and returns selected attachment data. It uses a render-prop pattern.

```jsx
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';

<MediaUploadCheck>
    <MediaUpload
        onSelect={ ( media ) => setAttributes( { imageUrl: media.url, imageId: media.id } ) }
        allowedTypes={ [ 'image' ] }
        value={ attributes.imageId }
        render={ ( { open } ) => (
            <Button onClick={ open } variant="secondary">
                { attributes.imageUrl ? 'Replace Image' : 'Upload Image' }
            </Button>
        ) }
    />
</MediaUploadCheck>
```

---

## 10. `@wordpress/data` — `useSelect` / `useDispatch`

`@wordpress/data` is WordPress's Redux-like state management layer.

### `useSelect`
Subscribes a component to a data store and re-renders when the selected data changes.

```js
import { useSelect } from '@wordpress/data';

const posts = useSelect( ( select ) =>
    select( 'core' ).getEntityRecords( 'postType', 'post', { per_page: 5 } )
);
```

### `useDispatch`
Returns action creators for a store so a component can update state.

```js
import { useDispatch } from '@wordpress/data';

const { savePost } = useDispatch( 'core/editor' );
```

---

## 11. ServerSideRender

`ServerSideRender` makes a REST API request to `/wp-json/wp/v2/block-renderer/{blockName}` and displays the PHP-rendered HTML inside the editor. Use it when the front-end output depends on server-side data (e.g. a dynamic list of posts).

```jsx
import ServerSideRender from '@wordpress/server-side-render';

<ServerSideRender
    block="myplugin/latest-posts"
    attributes={ attributes }
/>
```

---

## 12. Block Transforms

Transforms define how a block can be converted to/from other blocks or legacy content (shortcodes, raw HTML, files).

Types:
- `block` — convert to/from another block type.
- `shortcode` — parse a shortcode pattern into block attributes.
- `raw` — match raw HTML pasted into the editor.
- `files` — handle dragged-and-dropped files.
- `prefix` — trigger insertion by typing a prefix.

---

## 13. Full Site Editing (FSE)

FSE allows the entire site (headers, footers, templates, template parts) to be built from blocks. It requires a block theme with a `templates/` and `parts/` directory and a `theme.json`.

Key components:
- **Site Editor** — visual editor for templates.
- **Template Parts** — reusable sections (header, footer).
- **Global Styles** — typography, color palette, spacing defined in `theme.json`.

---

## 14. `theme.json`

The single configuration file for a block theme. Controls:

- **Color palette** — named colors available in every block.
- **Typography** — font families, sizes, fluid type.
- **Spacing scale** — preset spacing values.
- **Layout** — content width, wide width.
- **Styles** — global element styles (body, headings, links, buttons).
- **Block-level overrides** — per-block style defaults.

```json
{
    "version": 3,
    "settings": {
        "color": {
            "palette": [
                { "name": "Primary", "slug": "primary", "color": "#0073aa" }
            ]
        },
        "typography": {
            "fontSizes": [
                { "name": "Small", "slug": "small", "size": "0.875rem" }
            ]
        }
    }
}
```

---

## 15. Block Patterns

Block patterns are pre-composed layouts made of one or more blocks. They appear in the pattern inserter and can be registered via PHP or `patterns/` directory files.

```php
register_block_pattern(
    'myplugin/hero',
    [
        'title'   => 'Hero Section',
        'content' => '<!-- wp:group -->...',
    ]
);
```

Patterns can also be sourced from the WordPress.org Pattern Directory and curated per theme.

# React & Gutenberg — Interview Questions

> **50 questions** · Basic (35%) · Mid (40%) · Advanced (25%)
>
> Each answer includes a concise code example inline.

---

## Basic

**Q1: What is the Virtual DOM?**

**A:** A lightweight in-memory representation of the real DOM. React diffs the new virtual tree against the previous one (reconciliation) and applies only the minimal set of real DOM changes.
```jsx
// React re-renders only the changed <p>, not the whole tree
function Counter({ count }) {
  return <p>Count: {count}</p>;
}
```

**Q2: What is JSX?**

**A:** JSX is a syntax extension that lets you write HTML-like markup inside JavaScript. Babel compiles it to `React.createElement()` calls.
```jsx
const el = <h1 className="title">Hello</h1>;
// compiles to:
const el = React.createElement('h1', { className: 'title' }, 'Hello');
```

**Q3: How does `useState` work?**

**A:** `useState` returns the current state value and a setter. Calling the setter with a new value schedules a re-render with the updated state.
```jsx
const [count, setCount] = useState(0);
// functional update avoids stale state
setCount(prev => prev + 1);
```

**Q4: What is the `useEffect` hook used for?**

**A:** `useEffect` runs side effects after render. The dependency array controls when it re-runs; an empty array means run once on mount. Return a cleanup function to tear down subscriptions.
```jsx
useEffect(() => {
  const id = setInterval(() => setTick(t => t + 1), 1000);
  return () => clearInterval(id); // cleanup
}, []); // empty deps = mount only
```

**Q5: What does `useCallback` do?**

**A:** `useCallback` returns a memoised version of a callback that only changes when its listed dependencies change. Prevents unnecessary re-renders of child components.
```jsx
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

**Q6: What does `useMemo` do?**

**A:** `useMemo` caches an expensive computed value and recomputes it only when its dependencies change. Avoids redundant heavy calculations on every render.
```jsx
const sorted = useMemo(
  () => [...items].sort((a, b) => a.date - b.date),
  [items]
);
```

**Q7: What is `useRef` used for?**

**A:** `useRef` holds a mutable ref object whose `.current` persists across renders without triggering a re-render. Used for DOM refs and storing previous values.
```jsx
const inputRef = useRef(null);
function focusInput() { inputRef.current.focus(); }
return <input ref={inputRef} />;
```

**Q8: What is `useContext`?**

**A:** `useContext` reads the value of a React context, replacing prop drilling for global data like themes or the current user.
```jsx
const theme = useContext(ThemeContext);
return <div className={theme.bg}>Content</div>;
```

**Q9: What is a custom hook?**

**A:** A custom hook is a regular function whose name starts with `use` that encapsulates reusable stateful logic. It can call other hooks internally.
```jsx
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}
```

**Q10: What does `React.memo` do?**

**A:** `React.memo` wraps a functional component and prevents re-rendering if props have not changed (shallow comparison). Useful for list items or expensive components.
```jsx
const Card = React.memo(function Card({ title }) {
  return <h2>{title}</h2>;
});
```

**Q11: Why must list items have a unique `key` prop?**

**A:** React uses `key` to identify which items changed, were added, or removed during reconciliation. Unstable keys (e.g. array index) cause incorrect reuse of DOM nodes.
```jsx
posts.map(post => <li key={post.id}>{post.title}</li>)
```

**Q12: What is the difference between controlled and uncontrolled inputs?**

**A:** A controlled input's value is driven by React state. An uncontrolled input stores its own value in the DOM and is read via a ref.
```jsx
// Controlled
<input value={text} onChange={e => setText(e.target.value)} />
// Uncontrolled
<input defaultValue="hello" ref={inputRef} />
```

**Q13: What is `block.json` in Gutenberg?**

**A:** `block.json` is the metadata file that declares a block's name, title, category, attributes, supports, icon, and script handles. WordPress reads it to register the block.
```json
{
  "apiVersion": 3,
  "name": "myplugin/card",
  "title": "Card",
  "category": "design",
  "icon": "format-image",
  "attributes": { "heading": { "type": "string" } },
  "editorScript": "file:./index.js"
}
```

**Q14: How do you register a block with `registerBlockType`?**

**A:** Call `registerBlockType` with the block name and a settings object containing `edit` and `save` functions. The name must match `block.json`.
```javascript
import { registerBlockType } from '@wordpress/blocks';
registerBlockType('myplugin/card', {
  edit: ({ attributes, setAttributes }) => (
    <div>{ attributes.heading }</div>
  ),
  save: ({ attributes }) => <div>{ attributes.heading }</div>,
});
```

**Q15: What attribute types are available in Gutenberg blocks?**

**A:** Blocks support `string`, `number`, `boolean`, `array`, `object`, and the special `rich-text` source type for RichText-editable content.
```json
"attributes": {
  "title":   { "type": "string" },
  "count":   { "type": "number" },
  "active":  { "type": "boolean" },
  "items":   { "type": "array", "items": { "type": "string" } }
}
```

**Q16: What is the `edit` function responsible for?**

**A:** The `edit` function renders the block inside the editor. It receives `attributes`, `setAttributes`, and `className` as props and is not used on the front end.
```jsx
export function Edit({ attributes, setAttributes, className }) {
  return (
    <div className={className}>
      <input
        value={attributes.title}
        onChange={e => setAttributes({ title: e.target.value })}
      />
    </div>
  );
}
```

**Q17: What is the `save` function responsible for?**

**A:** `save` returns the static HTML stored in the post. For dynamic blocks rendered in PHP, return `null` from `save`.
```jsx
export function Save({ attributes }) {
  return <div className="my-card"><h2>{attributes.title}</h2></div>;
}
// Dynamic block:
export function Save() { return null; }
```

**Q18: What does `InspectorControls` do?**

**A:** `InspectorControls` renders controls in the block's sidebar (Inspector) inside the editor. Wrap UI inside `PanelBody` / `PanelRow` for consistent styling.
```jsx
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';

<InspectorControls>
  <PanelBody title="Settings">
    <ToggleControl
      label="Show border"
      checked={attributes.border}
      onChange={val => setAttributes({ border: val })}
    />
  </PanelBody>
</InspectorControls>
```

**Q19: How do you use `RichText` in a Gutenberg block?**

**A:** `RichText` provides a contenteditable field linked to an attribute. Use `value`, `onChange`, `tagName`, and `allowedFormats` props.
```jsx
import { RichText } from '@wordpress/block-editor';

<RichText
  tagName="p"
  value={attributes.content}
  onChange={content => setAttributes({ content })}
  allowedFormats={['core/bold', 'core/italic']}
/>
```

**Q20: How do you use `MediaUpload` to select an image?**

**A:** Wrap `MediaUploadCheck` around `MediaUpload` for capability checking. The `onSelect` callback receives the chosen media object.
```jsx
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';

<MediaUploadCheck>
  <MediaUpload
    onSelect={media => setAttributes({ imageUrl: media.url })}
    allowedTypes={['image']}
    render={({ open }) => <Button onClick={open}>Select Image</Button>}
  />
</MediaUploadCheck>
```

---

## Mid

**Q21: How does `InnerBlocks` work?**

**A:** `InnerBlocks` renders a nested block area inside your block. Use `allowedBlocks` to restrict block types and `template` to pre-populate child blocks.
```jsx
import { InnerBlocks } from '@wordpress/block-editor';

const TEMPLATE = [['core/heading', { level: 2 }], ['core/paragraph']];

<InnerBlocks
  allowedBlocks={['core/heading', 'core/paragraph']}
  template={TEMPLATE}
  templateLock="all"
/>
```

**Q22: How do you build a dynamic block with `ServerSideRender`?**

**A:** Use `ServerSideRender` in `edit` to preview the block by calling its PHP `render_callback`, and return `null` from `save`.
```jsx
import ServerSideRender from '@wordpress/server-side-render';

export function Edit({ attributes }) {
  return <ServerSideRender block="myplugin/latest-posts" attributes={attributes} />;
}
export function Save() { return null; }
```

**Q23: How do you register a dynamic block's PHP render callback?**

**A:** Pass `render_callback` to `register_block_type()`. WordPress calls it with `$attributes` and `$content` when the block is rendered on the front end.
```php
register_block_type(__DIR__, [
  'render_callback' => function (array $attributes): string {
    $posts = get_posts(['numberposts' => $attributes['count'] ?? 3]);
    return '<ul>' . implode('', array_map(
      fn($p) => "<li>{$p->post_title}</li>", $posts
    )) . '</ul>';
  },
]);
```

**Q24: How do you read data from the block editor store with `useSelect`?**

**A:** Call `useSelect` with a selector function. Pass the store name and selector; it re-renders when the selected data changes.
```javascript
import { useSelect } from '@wordpress/data';

const postTitle = useSelect(select =>
  select('core/editor').getEditedPostAttribute('title')
);
```

**Q25: How do you dispatch an action with `useDispatch`?**

**A:** Call `useDispatch` with the store name to get its action creators. Call the action creator to trigger the change.
```javascript
import { useDispatch } from '@wordpress/data';

const { editPost } = useDispatch('core/editor');
editPost({ title: 'New Title' });
```

**Q26: How do you use `@wordpress/api-fetch` inside a block?**

**A:** Import `apiFetch` and call it with a path. It automatically sets the nonce header so authenticated requests work in the editor.
```javascript
import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';

const [posts, setPosts] = useState([]);
useEffect(() => {
  apiFetch({ path: '/wp/v2/posts?per_page=3' }).then(setPosts);
}, []);
```

**Q27: How do you create block transforms from a shortcode?**

**A:** Add a `from` entry in `transforms` with `type: 'shortcode'` and a `transform` function that maps shortcode attrs to block attributes.
```javascript
transforms: {
  from: [{
    type: 'shortcode',
    tag: 'my_card',
    transform: ({ named: { title } }) => createBlock('myplugin/card', { title }),
  }],
},
```

**Q28: What are block variations?**

**A:** Block variations are predefined configurations of an existing block registered with `registerBlockVariation`. They appear as distinct options in the inserter.
```javascript
import { registerBlockVariation } from '@wordpress/blocks';

registerBlockVariation('core/group', {
  name: 'myplugin/hero',
  title: 'Hero Section',
  attributes: { className: 'is-hero' },
  isDefault: false,
});
```

**Q29: How do you register a block style?**

**A:** Call `registerBlockStyle` with the block name, a style name, and a label. WordPress adds `is-style-{name}` to the block's wrapper class.
```javascript
import { registerBlockStyle } from '@wordpress/blocks';

registerBlockStyle('core/button', {
  name: 'outline',
  label: 'Outline',
});
```

**Q30: What is `theme.json` used for in Full Site Editing?**

**A:** `theme.json` centralises design tokens (colours, typography, spacing) and controls which block supports are enabled. Styles are applied globally and per block.
```json
{
  "version": 3,
  "settings": {
    "color": { "palette": [{ "slug": "primary", "color": "#0073aa", "name": "Primary" }] },
    "typography": { "fontSizes": [{ "slug": "lg", "size": "1.5rem", "name": "Large" }] }
  }
}
```

**Q31: How do you register a block pattern?**

**A:** Call `register_block_pattern()` in PHP with a name and an array of properties including `title`, `categories`, and `content`.
```php
register_block_pattern('myplugin/hero-banner', [
  'title'      => 'Hero Banner',
  'categories' => ['featured'],
  'content'    => '<!-- wp:heading {"level":1} --><h1>Hello</h1><!-- /wp:heading -->',
]);
```

**Q32: How do you add block supports in `block.json`?**

**A:** Set the `supports` key with the features you want. WordPress automatically adds editor controls and CSS class or inline style output.
```json
"supports": {
  "color":      { "background": true, "text": true },
  "typography": { "fontSize": true },
  "spacing":    { "padding": true, "margin": true }
}
```

**Q33: What is `templateParts` in `theme.json`?**

**A:** Template parts are reusable sections (header, footer, sidebar) defined in the theme's `parts/` folder and listed under `templateParts` in `theme.json`.
```json
"templateParts": [
  { "name": "header", "title": "Header", "area": "header" },
  { "name": "footer", "title": "Footer", "area": "footer" }
]
```

**Q34: What is Full Site Editing (FSE)?**

**A:** FSE extends the block editor to control the entire site layout, including templates and template parts, through the Site Editor (`/wp-admin/site-editor.php`). Requires a block theme.
```
Appearance → Editor → Templates → Front Page
All editable with blocks; stored as custom post types.
```

**Q35: How do you use `customTemplates` in `theme.json`?**

**A:** Declare page templates under `customTemplates`. WordPress shows them in the "Template" panel when editing a page.
```json
"customTemplates": [
  {
    "name": "blank",
    "title": "Blank",
    "postTypes": ["page"]
  }
]
```

**Q36: How do you pass example attribute values to the block previewer?**

**A:** Set the `example` key in `block.json` (or `registerBlockType`) with a sample attributes object. Shown in the block inserter preview.
```json
"example": {
  "attributes": {
    "title": "Sample Heading",
    "content": "Lorem ipsum..."
  }
}
```

**Q37: How do you lock an `InnerBlocks` template?**

**A:** Set `templateLock` to `"all"` to prevent adding, removing, or moving child blocks. Use `"insert"` to lock only add/remove actions.
```jsx
<InnerBlocks
  template={[['core/heading'], ['core/paragraph']]}
  templateLock="all"
/>
```

**Q38: How does `block_type_metadata_settings` help with dynamic blocks?**

**A:** The `block_type_metadata_settings` filter (WP 6.3+) lets you modify block type settings when registering from `block.json`, including adding a `render_callback` programmatically.
```php
add_filter('block_type_metadata_settings', function ($settings, $metadata) {
  if ($metadata['name'] === 'myplugin/card') {
    $settings['render_callback'] = 'myplugin_render_card';
  }
  return $settings;
}, 10, 2);
```

**Q39: What is the difference between `useSelect` and directly calling `wp.data.select`?**

**A:** `useSelect` is a React hook that automatically subscribes to store changes and triggers re-renders. `wp.data.select` is a one-time read with no reactivity.
```javascript
// Reactive — re-renders on change
const isSaving = useSelect(s => s('core/editor').isSavingPost());

// One-time read — no subscription
const title = wp.data.select('core/editor').getEditedPostAttribute('title');
```

**Q40: How do you handle cleanup in `useEffect` when fetching data?**

**A:** Use an `isMounted` flag or an `AbortController` so the state setter is not called after the component unmounts, preventing memory leaks.
```jsx
useEffect(() => {
  const controller = new AbortController();
  apiFetch({ path: '/wp/v2/posts', signal: controller.signal })
    .then(setPosts)
    .catch(err => { if (err.name !== 'AbortError') console.error(err); });
  return () => controller.abort();
}, []);
```

---

## Advanced

**Q41: How does React reconciliation decide what to update in the DOM?**

**A:** React performs a depth-first tree diff. It replaces a subtree when the element type changes, and updates props when the type is the same. The `key` prop lets React match list children across renders, avoiding full subtree teardown.
```jsx
// Without key React can't tell if items were reordered
{items.map(item => <Row key={item.id} data={item} />)}
```

**Q42: How do you prevent unnecessary re-renders when passing object props?**

**A:** Memoize the object with `useMemo` so its reference stays stable across renders, preventing `React.memo` wrapped children from re-rendering needlessly.
```jsx
const config = useMemo(() => ({ color: primary, size: large }), [primary, large]);
return <Chart config={config} />;
```

**Q43: How do you implement a block with both edit-time controls and a PHP-rendered front end that stays in sync?**

**A:** Store all display options as block attributes. Use `ServerSideRender` in `edit` so the editor preview is driven by the same PHP `render_callback` used on the front end.
```jsx
// edit
<ServerSideRender block="myplugin/stats" attributes={attributes} />

// PHP
function myplugin_render_stats(array $attributes): string {
  $count = $attributes['count'] ?? 5;
  // same output as front end
}
```

**Q44: How do you manage global editor state across multiple blocks using a custom store?**

**A:** Register a custom `@wordpress/data` store with `register`. Blocks `useSelect` and `useDispatch` against that store name.
```javascript
import { register, createReduxStore } from '@wordpress/data';
const store = createReduxStore('myplugin/ui', {
  reducer: (state = { panel: null }, action) =>
    action.type === 'OPEN_PANEL' ? { ...state, panel: action.panel } : state,
  actions: { openPanel: panel => ({ type: 'OPEN_PANEL', panel }) },
  selectors: { getPanel: state => state.panel },
});
register(store);
```

**Q45: How do you write a Jest unit test for a Gutenberg block's `save` output?**

**A:** Use `@wordpress/blocks`'s `serialize` helper or Snapshot testing with `@wordpress/jest-console` to assert the exact serialised HTML.
```javascript
import { serialize } from '@wordpress/blocks';
import { registerBlockType, getBlockType, unregisterBlockType } from '@wordpress/blocks';
import blockConfig from '../block.json';
import { Save } from '../save';

test('save renders expected HTML', () => {
  registerBlockType(blockConfig.name, { ...blockConfig, edit: () => null, save: Save });
  const block = { name: blockConfig.name, attributes: { title: 'Hi' }, innerBlocks: [] };
  expect(serialize(block)).toMatchSnapshot();
  unregisterBlockType(blockConfig.name);
});
```

**Q46: How do you implement block deprecations in Gutenberg?**

**A:** Add a `deprecated` array to `registerBlockType`. Each entry has the old `attributes` schema and a `migrate` function to convert old data to the new schema.
```javascript
deprecated: [
  {
    attributes: { text: { type: 'string' } }, // old schema
    migrate: ({ text }) => ({ content: text }), // map to new schema
    save: ({ attributes }) => <p>{ attributes.text }</p>,
  },
],
```

**Q47: How do you use block context to pass data from a parent block to descendants?**

**A:** Declare `providesContext` in the parent's `block.json` and `usesContext` in the child. The context value flows down without prop drilling.
```json
// Parent block.json
"providesContext": { "myplugin/color": "color" }

// Child block.json
"usesContext": ["myplugin/color"]
```
```jsx
// Child edit
export function Edit({ context }) {
  return <div style={{ color: context['myplugin/color'] }}>Child</div>;
}
```

**Q48: How do you lazy-load heavy editor dependencies in a Gutenberg block?**

**A:** Use dynamic `import()` inside an event handler or `useEffect` so the heavy module is not included in the initial JS bundle.
```jsx
async function handleChartClick() {
  const { renderChart } = await import('./heavy-chart-lib');
  renderChart(containerRef.current, data);
}
```

**Q49: How do you register a block collection and why is it useful?**

**A:** `registerBlockCollection` groups your plugin's blocks under a named section in the block inserter, improving discoverability for users.
```javascript
import { registerBlockCollection } from '@wordpress/blocks';

registerBlockCollection('myplugin', {
  title: 'My Plugin',
  icon: 'admin-plugins',
});
```

**Q50: How do you test a custom `useSelect` hook in isolation with `@wordpress/data` mocking?**

**A:** Use `jest.spyOn` or `dispatch` a mock store state before rendering, then assert on the returned value using `@testing-library/react`.
```javascript
import { render } from '@testing-library/react';
import * as data from '@wordpress/data';

jest.spyOn(data, 'useSelect').mockReturnValue({ postTitle: 'Mocked' });

function TestComponent() {
  const { postTitle } = data.useSelect(s => ({ postTitle: s('core/editor').getEditedPostAttribute('title') }));
  return <span data-testid="title">{postTitle}</span>;
}

test('shows post title', () => {
  const { getByTestId } = render(<TestComponent />);
  expect(getByTestId('title').textContent).toBe('Mocked');
});
```

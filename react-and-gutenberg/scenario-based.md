# React & Gutenberg — Scenario-Based Questions

---

## Scenario 1: Build a Custom "Testimonial" Block

**Prompt:** Build a Gutenberg block called `myplugin/testimonial` that lets editors add a customer photo, a quote, and an author name. The sidebar should allow setting a background color for the block.

---

### Approach

1. Define metadata in `block.json`.
2. Register with `registerBlockType`.
3. Use `RichText` for the quote and author, `MediaUpload` for the image.
4. Add `InspectorControls` with `PanelColorSettings` for the background.
5. Output clean, serializable HTML from `save`.

---

### `block.json`

```json
{
    "apiVersion": 3,
    "name": "myplugin/testimonial",
    "title": "Testimonial",
    "category": "design",
    "textdomain": "myplugin",
    "editorScript": "file:./index.js",
    "style": "file:./style.css",
    "attributes": {
        "quote":           { "type": "string",  "default": "" },
        "author":          { "type": "string",  "default": "" },
        "imageUrl":        { "type": "string",  "default": "" },
        "imageId":         { "type": "number",  "default": 0 },
        "backgroundColor": { "type": "string",  "default": "#ffffff" }
    },
    "supports": {
        "html": false,
        "align": [ "wide", "full" ]
    }
}
```

---

### `edit.js`

```jsx
import { __ } from '@wordpress/i18n';
import {
    useBlockProps,
    InspectorControls,
    RichText,
    MediaUpload,
    MediaUploadCheck,
    PanelColorSettings,
} from '@wordpress/block-editor';
import { PanelBody, Button } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
    const { quote, author, imageUrl, imageId, backgroundColor } = attributes;
    const blockProps = useBlockProps( {
        style: { backgroundColor },
        className: 'wp-block-myplugin-testimonial',
    } );

    return (
        <>
            {/* ── Sidebar ── */}
            <InspectorControls>
                <PanelColorSettings
                    title={ __( 'Color Settings', 'myplugin' ) }
                    colorSettings={ [
                        {
                            value:    backgroundColor,
                            onChange: ( val ) =>
                                setAttributes( { backgroundColor: val ?? '#ffffff' } ),
                            label:    __( 'Background Color', 'myplugin' ),
                        },
                    ] }
                />
                <PanelBody title={ __( 'Image', 'myplugin' ) }>
                    <MediaUploadCheck>
                        <MediaUpload
                            onSelect={ ( media ) =>
                                setAttributes( { imageUrl: media.url, imageId: media.id } )
                            }
                            allowedTypes={ [ 'image' ] }
                            value={ imageId }
                            render={ ( { open } ) => (
                                <>
                                    { imageUrl && (
                                        <img
                                            src={ imageUrl }
                                            alt={ __( 'Testimonial photo', 'myplugin' ) }
                                            style={ { maxWidth: '100%', marginBottom: 8 } }
                                        />
                                    ) }
                                    <Button onClick={ open } variant="secondary" isSmall>
                                        { imageUrl
                                            ? __( 'Replace Photo', 'myplugin' )
                                            : __( 'Upload Photo', 'myplugin' ) }
                                    </Button>
                                    { imageUrl && (
                                        <Button
                                            onClick={ () =>
                                                setAttributes( { imageUrl: '', imageId: 0 } )
                                            }
                                            variant="link"
                                            isDestructive
                                            isSmall
                                            style={ { marginLeft: 8 } }
                                        >
                                            { __( 'Remove', 'myplugin' ) }
                                        </Button>
                                    ) }
                                </>
                            ) }
                        />
                    </MediaUploadCheck>
                </PanelBody>
            </InspectorControls>

            {/* ── Canvas ── */}
            <figure { ...blockProps }>
                { imageUrl && (
                    <img
                        src={ imageUrl }
                        alt={ __( 'Testimonial photo', 'myplugin' ) }
                        className="testimonial-photo"
                    />
                ) }
                <blockquote>
                    <RichText
                        tagName="p"
                        className="testimonial-quote"
                        value={ quote }
                        onChange={ ( val ) => setAttributes( { quote: val } ) }
                        placeholder={ __( 'Enter testimonial quote…', 'myplugin' ) }
                        allowedFormats={ [ 'core/bold', 'core/italic' ] }
                    />
                    <RichText
                        tagName="cite"
                        className="testimonial-author"
                        value={ author }
                        onChange={ ( val ) => setAttributes( { author: val } ) }
                        placeholder={ __( 'Author name', 'myplugin' ) }
                        allowedFormats={ [] }
                    />
                </blockquote>
            </figure>
        </>
    );
}
```

---

### `save.js`

```jsx
import { useBlockProps, RichText } from '@wordpress/block-editor';

export default function save( { attributes } ) {
    const { quote, author, imageUrl, backgroundColor } = attributes;
    const blockProps = useBlockProps.save( {
        style: { backgroundColor },
        className: 'wp-block-myplugin-testimonial',
    } );

    return (
        <figure { ...blockProps }>
            { imageUrl && (
                <img
                    src={ imageUrl }
                    alt=""
                    className="testimonial-photo"
                />
            ) }
            <blockquote>
                <RichText.Content tagName="p" className="testimonial-quote" value={ quote } />
                <RichText.Content tagName="cite" className="testimonial-author" value={ author } />
            </blockquote>
        </figure>
    );
}
```

---

### `index.js`

```js
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import save from './save';

registerBlockType( metadata.name, { ...metadata, edit: Edit, save } );
```

---

## Scenario 2: Dynamic Block Showing Latest Posts with PHP `render_callback`

**Prompt:** Create a block that displays a configurable number of the latest posts. The output must always reflect the current posts (not a static snapshot), so it must use PHP rendering. Show a live preview in the editor via `ServerSideRender`.

---

### `block.json`

```json
{
    "apiVersion": 3,
    "name": "myplugin/latest-posts",
    "title": "Latest Posts",
    "category": "widgets",
    "editorScript": "file:./index.js",
    "attributes": {
        "numberOfPosts": { "type": "number", "default": 3 },
        "postType":      { "type": "string", "default": "post" },
        "showExcerpt":   { "type": "boolean", "default": false }
    }
}
```

---

### `edit.js`

```jsx
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, RangeControl, ToggleControl, SelectControl } from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import { __ } from '@wordpress/i18n';

export default function Edit( { attributes, setAttributes } ) {
    const { numberOfPosts, postType, showExcerpt } = attributes;
    const blockProps = useBlockProps();

    return (
        <>
            <InspectorControls>
                <PanelBody title={ __( 'Settings', 'myplugin' ) }>
                    <SelectControl
                        label={ __( 'Post Type', 'myplugin' ) }
                        value={ postType }
                        options={ [
                            { label: 'Posts', value: 'post' },
                            { label: 'Pages', value: 'page' },
                        ] }
                        onChange={ ( val ) => setAttributes( { postType: val } ) }
                    />
                    <RangeControl
                        label={ __( 'Number of Posts', 'myplugin' ) }
                        value={ numberOfPosts }
                        onChange={ ( val ) => setAttributes( { numberOfPosts: val } ) }
                        min={ 1 }
                        max={ 12 }
                    />
                    <ToggleControl
                        label={ __( 'Show Excerpt', 'myplugin' ) }
                        checked={ showExcerpt }
                        onChange={ ( val ) => setAttributes( { showExcerpt: val } ) }
                    />
                </PanelBody>
            </InspectorControls>
            <div { ...blockProps }>
                <ServerSideRender
                    block="myplugin/latest-posts"
                    attributes={ attributes }
                />
            </div>
        </>
    );
}
```

---

### `save.js`

```js
// Dynamic block — PHP renders the front end
export default function save() {
    return null;
}
```

---

### PHP render callback

```php
add_action( 'init', function () {
    register_block_type(
        __DIR__ . '/blocks/latest-posts',
        [ 'render_callback' => 'myplugin_render_latest_posts_block' ]
    );
} );

function myplugin_render_latest_posts_block( array $attributes ): string {
    $number_of_posts = (int) ( $attributes['numberOfPosts'] ?? 3 );
    $post_type       = sanitize_key( $attributes['postType'] ?? 'post' );
    $show_excerpt    = (bool) ( $attributes['showExcerpt'] ?? false );

    $posts = get_posts( [
        'post_type'      => $post_type,
        'posts_per_page' => $number_of_posts,
        'post_status'    => 'publish',
    ] );

    if ( empty( $posts ) ) {
        return '<p class="no-posts">' . esc_html__( 'No posts found.', 'myplugin' ) . '</p>';
    }

    $html = '<ul class="wp-block-myplugin-latest-posts">';
    foreach ( $posts as $post ) {
        $html .= '<li>';
        $html .= sprintf(
            '<a href="%s">%s</a>',
            esc_url( get_permalink( $post ) ),
            esc_html( get_the_title( $post ) )
        );
        if ( $show_excerpt ) {
            $html .= sprintf(
                '<p class="post-excerpt">%s</p>',
                esc_html( get_the_excerpt( $post ) )
            );
        }
        $html .= '</li>';
    }
    $html .= '</ul>';

    return $html;
}
```

---

## Scenario 3: Migrate a Legacy `[gallery]` Shortcode to a Gutenberg Block

**Prompt:** Your theme has hundreds of posts containing `[gallery ids="1,2,3" columns="3" link="file"]`. You need to replace these with a custom `myplugin/gallery` block that preserves all attributes. The migration must work both in the editor (transform) and via a WP-CLI bulk script.

---

### Step 1 — Register the target block

```json
{
    "apiVersion": 3,
    "name": "myplugin/gallery",
    "title": "Gallery (v2)",
    "attributes": {
        "ids":     { "type": "array",  "default": [], "items": { "type": "number" } },
        "columns": { "type": "number", "default": 3 },
        "link":    { "type": "string", "default": "none" }
    }
}
```

---

### Step 2 — Register a shortcode transform

```js
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import save from './save';

registerBlockType( metadata.name, {
    ...metadata,
    edit: Edit,
    save,
    transforms: {
        from: [
            {
                type: 'shortcode',
                tag: 'gallery',
                attributes: {
                    ids: {
                        type: 'array',
                        shortcode: ( { named: { ids = '' } } ) =>
                            ids.split( ',' ).map( ( id ) => parseInt( id.trim(), 10 ) ),
                    },
                    columns: {
                        type: 'number',
                        shortcode: ( { named: { columns = '3' } } ) =>
                            parseInt( columns, 10 ),
                    },
                    link: {
                        type: 'string',
                        shortcode: ( { named: { link = 'none' } } ) => link,
                    },
                },
                isMatch: ( { named } ) => Boolean( named.ids ),
            },
        ],
    },
} );
```

When an editor opens a post, Gutenberg detects the shortcode and offers a one-click "Convert to block" option.

---

### Step 3 — WP-CLI bulk migration script

Run from the server after deploying the new block:

```bash
wp eval-file migrate-gallery-shortcode.php --url=https://example.com
```

```php
// migrate-gallery-shortcode.php
define( 'MYPLUGIN_DRY_RUN', false ); // set true to preview changes

$posts = get_posts( [
    'post_type'      => 'any',
    'posts_per_page' => -1,
    'post_status'    => 'publish',
    's'              => '[gallery',      // only posts that contain the shortcode
] );

$pattern = '/\[gallery([^\]]*)\]/i';

foreach ( $posts as $post ) {
    if ( ! preg_match( $pattern, $post->post_content ) ) {
        continue;
    }

    $new_content = preg_replace_callback(
        $pattern,
        function ( $matches ) {
            $raw_attrs = $matches[1];

            // Parse shortcode attributes manually
            preg_match( '/ids=["\']?([^"\'\ ]+)["\']?/i', $raw_attrs, $ids_match );
            preg_match( '/columns=["\']?(\d+)["\']?/i',   $raw_attrs, $cols_match );
            preg_match( '/link=["\']?([^"\'\ ]+)["\']?/i', $raw_attrs, $link_match );

            $ids     = isset( $ids_match[1] )
                ? array_map( 'intval', explode( ',', $ids_match[1] ) )
                : [];
            $columns = isset( $cols_match[1] ) ? (int) $cols_match[1] : 3;
            $link    = $link_match[1] ?? 'none';

            // Serialize as Gutenberg block comment
            $attrs_json = wp_json_encode( compact( 'ids', 'columns', 'link' ) );
            return sprintf(
                '<!-- wp:myplugin/gallery %s /-->',
                $attrs_json
            );
        },
        $post->post_content
    );

    if ( MYPLUGIN_DRY_RUN ) {
        WP_CLI::log( "DRY RUN — Post {$post->ID}: would update content." );
        continue;
    }

    wp_update_post( [
        'ID'           => $post->ID,
        'post_content' => $new_content,
    ] );
    WP_CLI::success( "Migrated post {$post->ID}: {$post->post_title}" );
}

WP_CLI::success( 'Migration complete.' );
```

---

### Step 4 — Handle deprecations for any previously saved block HTML

If the `myplugin/gallery` block was deployed earlier with a different `save` output, add a deprecated entry so existing posts still validate:

```js
deprecated: [
    {
        attributes: {
            ids:     { type: 'array',  default: [] },
            columns: { type: 'number', default: 3 },
        },
        save: ( { attributes } ) => {
            const { ids, columns } = attributes;
            return (
                <ul className={ `gallery columns-${ columns }` }>
                    { ids.map( ( id ) => (
                        <li key={ id } className="gallery-item">
                            <img src={ `/wp-content/uploads/gallery-${ id }.jpg` } />
                        </li>
                    ) ) }
                </ul>
            );
        },
        migrate: ( old ) => ( {
            ...old,
            link: 'none', // add the new attribute with its default
        } ),
    },
],
```

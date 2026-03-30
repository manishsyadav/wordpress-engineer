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

---

## Scenario 4: Building a Complex Gutenberg Block with Nested InnerBlocks and Custom Toolbar Controls

**Scenario:**
A news site needs a `myplugin/card-grid` block: an outer container holding a configurable grid of `myplugin/card` child blocks. Each card has a title, excerpt, and link. The toolbar on the outer block controls the number of columns. Child blocks must be locked so editors can only add more cards, not arbitrary blocks.

**Challenge:**
Implement `InnerBlocks` with a template, template lock, `BlockControls` for the column toolbar, and proper serialization.

**Solution:**

1. `block.json` for the outer container:

```json
{
    "apiVersion": 3,
    "name": "myplugin/card-grid",
    "title": "Card Grid",
    "category": "layout",
    "attributes": {
        "columns": { "type": "number", "default": 3 }
    },
    "supports": {
        "html": false,
        "align": [ "wide", "full" ]
    },
    "editorScript": "file:./index.js",
    "style": "file:./style.css"
}
```

2. `edit.js` for the outer block — toolbar column picker + InnerBlocks:

```jsx
import { __, sprintf } from '@wordpress/i18n';
import {
    useBlockProps,
    InnerBlocks,
    BlockControls,
} from '@wordpress/block-editor';
import { ToolbarGroup, ToolbarDropdownMenu } from '@wordpress/components';
import { grid } from '@wordpress/icons';

const ALLOWED_BLOCKS = [ 'myplugin/card' ];

const TEMPLATE = [
    [ 'myplugin/card', { title: 'Card One' } ],
    [ 'myplugin/card', { title: 'Card Two' } ],
    [ 'myplugin/card', { title: 'Card Three' } ],
];

export default function Edit( { attributes, setAttributes } ) {
    const { columns } = attributes;
    const blockProps = useBlockProps( {
        className: `card-grid columns-${ columns }`,
        style: { '--card-columns': columns },
    } );

    const columnOptions = [ 2, 3, 4 ].map( ( n ) => ( {
        title: sprintf( __( '%d Columns', 'myplugin' ), n ),
        isActive: columns === n,
        onClick: () => setAttributes( { columns: n } ),
    } ) );

    return (
        <>
            <BlockControls>
                <ToolbarGroup>
                    <ToolbarDropdownMenu
                        icon={ grid }
                        label={ __( 'Column count', 'myplugin' ) }
                        controls={ columnOptions }
                    />
                </ToolbarGroup>
            </BlockControls>

            <div { ...blockProps }>
                <InnerBlocks
                    allowedBlocks={ ALLOWED_BLOCKS }
                    template={ TEMPLATE }
                    templateLock="insert"  // editors can add/remove cards but not change block type
                    orientation="horizontal"
                />
            </div>
        </>
    );
}
```

3. `save.js` for the outer block:

```jsx
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save( { attributes } ) {
    const { columns } = attributes;
    const blockProps = useBlockProps.save( {
        className: `card-grid columns-${ columns }`,
        style: { '--card-columns': columns },
    } );

    return (
        <div { ...blockProps }>
            <InnerBlocks.Content />
        </div>
    );
}
```

4. Inner `myplugin/card` block — `block.json`:

```json
{
    "apiVersion": 3,
    "name": "myplugin/card",
    "title": "Card",
    "category": "layout",
    "parent": [ "myplugin/card-grid" ],
    "attributes": {
        "title":   { "type": "string", "default": "" },
        "excerpt": { "type": "string", "default": "" },
        "url":     { "type": "string", "default": "" }
    },
    "editorScript": "file:./card/index.js"
}
```

5. Inner card `edit.js`:

```jsx
import { __, } from '@wordpress/i18n';
import { useBlockProps, RichText, BlockControls } from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { link } from '@wordpress/icons';
import { useState } from '@wordpress/element';

export default function CardEdit( { attributes, setAttributes } ) {
    const { title, excerpt, url } = attributes;
    const [ urlInputVisible, setUrlInputVisible ] = useState( false );
    const blockProps = useBlockProps( { className: 'myplugin-card' } );

    return (
        <>
            <BlockControls>
                <ToolbarButton
                    icon={ link }
                    label={ __( 'Set card link', 'myplugin' ) }
                    isActive={ !! url }
                    onClick={ () => setUrlInputVisible( ( v ) => ! v ) }
                />
            </BlockControls>

            <div { ...blockProps }>
                { urlInputVisible && (
                    <input
                        type="url"
                        className="card-url-input"
                        value={ url }
                        placeholder={ __( 'https://…', 'myplugin' ) }
                        onChange={ ( e ) => setAttributes( { url: e.target.value } ) }
                    />
                ) }
                <RichText
                    tagName="h3"
                    value={ title }
                    onChange={ ( val ) => setAttributes( { title: val } ) }
                    placeholder={ __( 'Card title', 'myplugin' ) }
                    allowedFormats={ [] }
                />
                <RichText
                    tagName="p"
                    value={ excerpt }
                    onChange={ ( val ) => setAttributes( { excerpt: val } ) }
                    placeholder={ __( 'Short description…', 'myplugin' ) }
                    allowedFormats={ [ 'core/bold', 'core/italic' ] }
                />
            </div>
        </>
    );
}
```

---

## Scenario 5: Migrating a Classic Editor Shortcode-Based Plugin to a Native Gutenberg Block

**Scenario:**
A plugin renders a pricing table via `[pricing_table plan="pro" price="49" billing="monthly" features="Feature A, Feature B, Feature C"]`. Hundreds of posts contain this shortcode. The task is to build a native block, provide an in-editor shortcode transform, and ship a WP-CLI bulk migration script.

**Challenge:**
Preserve all shortcode attribute semantics in the block, handle the transform path for editors, and run a server-side migration that produces valid block markup.

**Solution:**

1. `block.json` for `myplugin/pricing-table`:

```json
{
    "apiVersion": 3,
    "name": "myplugin/pricing-table",
    "title": "Pricing Table",
    "category": "design",
    "attributes": {
        "plan":     { "type": "string",  "default": "starter" },
        "price":    { "type": "number",  "default": 0 },
        "billing":  { "type": "string",  "default": "monthly" },
        "features": { "type": "array",   "default": [], "items": { "type": "string" } },
        "ctaLabel": { "type": "string",  "default": "Get Started" },
        "ctaUrl":   { "type": "string",  "default": "" }
    },
    "editorScript": "file:./index.js",
    "style": "file:./style.css"
}
```

2. Register the shortcode transform in `index.js`:

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
                tag: 'pricing_table',
                attributes: {
                    plan: {
                        type: 'string',
                        shortcode: ( { named: { plan = 'starter' } } ) => plan,
                    },
                    price: {
                        type: 'number',
                        shortcode: ( { named: { price = '0' } } ) => parseFloat( price ),
                    },
                    billing: {
                        type: 'string',
                        shortcode: ( { named: { billing = 'monthly' } } ) => billing,
                    },
                    features: {
                        type: 'array',
                        shortcode: ( { named: { features = '' } } ) =>
                            features.split( ',' ).map( ( f ) => f.trim() ).filter( Boolean ),
                    },
                },
            },
        ],
    },
} );
```

3. `edit.js` with `InspectorControls` for all attributes:

```jsx
import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, NumberControl, SelectControl, Button } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
    const { plan, price, billing, features, ctaLabel, ctaUrl } = attributes;
    const blockProps = useBlockProps( { className: 'myplugin-pricing-table' } );

    function updateFeature( index, value ) {
        const updated = [ ...features ];
        updated[ index ] = value;
        setAttributes( { features: updated } );
    }

    function removeFeature( index ) {
        setAttributes( { features: features.filter( ( _, i ) => i !== index ) } );
    }

    return (
        <>
            <InspectorControls>
                <PanelBody title={ __( 'Plan Settings', 'myplugin' ) }>
                    <TextControl
                        label={ __( 'Plan name', 'myplugin' ) }
                        value={ plan }
                        onChange={ ( val ) => setAttributes( { plan: val } ) }
                    />
                    <NumberControl
                        label={ __( 'Price', 'myplugin' ) }
                        value={ price }
                        onChange={ ( val ) => setAttributes( { price: parseFloat( val ) || 0 } ) }
                        min={ 0 }
                    />
                    <SelectControl
                        label={ __( 'Billing cycle', 'myplugin' ) }
                        value={ billing }
                        options={ [
                            { label: __( 'Monthly', 'myplugin' ),  value: 'monthly' },
                            { label: __( 'Annually', 'myplugin' ), value: 'annually' },
                        ] }
                        onChange={ ( val ) => setAttributes( { billing: val } ) }
                    />
                </PanelBody>
                <PanelBody title={ __( 'Features', 'myplugin' ) }>
                    { features.map( ( f, i ) => (
                        <div key={ i } style={ { display: 'flex', gap: 4, marginBottom: 4 } }>
                            <TextControl
                                value={ f }
                                onChange={ ( val ) => updateFeature( i, val ) }
                                hideLabelFromVision
                                label={ sprintf( __( 'Feature %d', 'myplugin' ), i + 1 ) }
                            />
                            <Button isDestructive isSmall onClick={ () => removeFeature( i ) }>
                                { __( 'Remove', 'myplugin' ) }
                            </Button>
                        </div>
                    ) ) }
                    <Button
                        variant="secondary"
                        isSmall
                        onClick={ () => setAttributes( { features: [ ...features, '' ] } ) }
                    >
                        { __( '+ Add Feature', 'myplugin' ) }
                    </Button>
                </PanelBody>
            </InspectorControls>

            <div { ...blockProps }>
                <div className="pricing-plan">{ plan }</div>
                <div className="pricing-price">${ price }<span>/{ billing }</span></div>
                <ul className="pricing-features">
                    { features.map( ( f, i ) => <li key={ i }>{ f }</li> ) }
                </ul>
                { ctaUrl && <a href={ ctaUrl } className="pricing-cta">{ ctaLabel }</a> }
            </div>
        </>
    );
}
```

4. WP-CLI bulk migration script:

```php
<?php
// migrate-pricing-shortcode.php
define( 'MYPLUGIN_DRY_RUN', false );

$posts = get_posts( [
    'post_type'      => 'any',
    'posts_per_page' => -1,
    'post_status'    => [ 'publish', 'draft' ],
    's'              => '[pricing_table',
] );

$pattern = '/\[pricing_table([^\]]*)\]/i';

foreach ( $posts as $post ) {
    if ( ! preg_match( $pattern, $post->post_content ) ) {
        continue;
    }

    $new_content = preg_replace_callback( $pattern, function ( $matches ) {
        $raw = $matches[1];

        preg_match( '/plan=["\']?([^"\'\ \]]+)["\']?/i',    $raw, $plan_m );
        preg_match( '/price=["\']?([0-9.]+)["\']?/i',        $raw, $price_m );
        preg_match( '/billing=["\']?([^"\'\ \]]+)["\']?/i',  $raw, $billing_m );
        preg_match( '/features=["\']([^"\']+)["\']?/i',      $raw, $feat_m );

        $attrs = [
            'plan'     => $plan_m[1]    ?? 'starter',
            'price'    => (float) ( $price_m[1]    ?? 0 ),
            'billing'  => $billing_m[1] ?? 'monthly',
            'features' => isset( $feat_m[1] )
                ? array_map( 'trim', explode( ',', $feat_m[1] ) )
                : [],
        ];

        return '<!-- wp:myplugin/pricing-table ' . wp_json_encode( $attrs ) . ' /-->';
    }, $post->post_content );

    if ( MYPLUGIN_DRY_RUN ) {
        WP_CLI::log( "DRY RUN — would update post {$post->ID}" );
        continue;
    }

    wp_update_post( [ 'ID' => $post->ID, 'post_content' => $new_content ] );
    WP_CLI::success( "Migrated post {$post->ID}: {$post->post_title}" );
}

WP_CLI::success( 'Done.' );
```

---

## Scenario 6: Debugging a React State Management Issue Causing Block Editor Crashes

**Scenario:**
A custom block uses `useSelect` to fetch a list of posts and stores the selected post ID in block attributes. After a recent refactor, the block editor randomly freezes and throws `Maximum update depth exceeded` in the console. Saving is impossible.

**Challenge:**
Identify the infinite re-render loop, fix the `useSelect` selector, and apply React best practices to prevent future regressions.

**Solution:**

1. Identify the error pattern in the console:

```
Warning: Maximum update depth exceeded. This can happen when a component calls
setState inside useEffect, but useEffect either doesn't have a dependency array,
or one of the dependencies changes on every render.
```

2. The most common culprit — `useSelect` returning a new object/array reference on every render:

```js
// BROKEN: getEntityRecords returns a new array reference on every call
// even if the data hasn't changed. This causes the component to re-render
// infinitely if the result is used as a useEffect dependency.
const posts = useSelect( ( select ) =>
    select( 'core' ).getEntityRecords( 'postType', 'post', {
        per_page: 10,
        // WRONG: building a new object literal inside the selector
        // causes the selector's result to always be a new reference
        _fields: [ 'id', 'title' ].join( ',' ),
    } )
);

useEffect( () => {
    // WRONG: 'posts' is a new array ref every render even with same data
    if ( posts?.length ) {
        setAttributes( { postCount: posts.length } ); // triggers re-render → loop
    }
}, [ posts ] ); // posts changes every render → infinite loop
```

3. Fix 1 — move static objects outside the component or use `useMemo`:

```js
// Move the query args outside the component so the reference is stable
const QUERY_ARGS = { per_page: 10, _fields: 'id,title' };

export default function Edit( { attributes, setAttributes } ) {
    const posts = useSelect(
        ( select ) => select( 'core' ).getEntityRecords( 'postType', 'post', QUERY_ARGS ),
        [] // dependency array — re-run only on mount
    );

    // Now use a guard instead of a useEffect for derived state
    const postCount = posts?.length ?? 0;

    // If you genuinely need to sync to attributes, check the value first
    useEffect( () => {
        if ( postCount !== attributes.postCount ) {
            setAttributes( { postCount } );
        }
    }, [ postCount ] ); // postCount is a number — stable comparison

    // ...
}
```

4. Fix 2 — avoid calling `setAttributes` unconditionally inside `useSelect`:

```js
// BROKEN: setAttributes inside useSelect causes a render during render
const selectedPost = useSelect( ( select ) => {
    const post = select( 'core' ).getEntityRecord( 'postType', 'post', attributes.postId );
    if ( post ) {
        setAttributes( { postTitle: post.title.rendered } ); // NEVER do this
    }
    return post;
} );

// CORRECT: derive display data from the fetched post in render,
// only call setAttributes in response to user interaction
const selectedPost = useSelect(
    ( select ) =>
        attributes.postId
            ? select( 'core' ).getEntityRecord( 'postType', 'post', attributes.postId )
            : null,
    [ attributes.postId ]
);

// Use the live post title in the editor UI; only persist it on explicit save
const displayTitle = selectedPost?.title?.rendered ?? attributes.postTitle ?? '';
```

5. Fix 3 — stabilize callbacks with `useCallback` to prevent child re-renders:

```js
import { useCallback } from '@wordpress/element';

export default function Edit( { attributes, setAttributes } ) {
    // WRONG: new function reference every render
    // const handleSelect = ( post ) => setAttributes( { postId: post.id } );

    // CORRECT: stable reference
    const handleSelect = useCallback(
        ( post ) => setAttributes( { postId: post.id } ),
        [ setAttributes ] // setAttributes is stable across renders in Gutenberg
    );

    return <PostPicker onSelect={ handleSelect } />;
}
```

6. Use React DevTools Profiler to confirm the fix:

```js
// In browser: install React DevTools extension
// Open DevTools > Profiler > Record
// Interact with the block
// Look for components highlighted in deep red = expensive re-renders
// Check "Why did this render?" for specific prop/state changes

// Also add this temporarily during debugging:
import { useRef, useEffect } from '@wordpress/element';

function useWhyDidYouRender( name, props ) {
    const previousProps = useRef( props );
    useEffect( () => {
        const changes = Object.entries( props ).reduce( ( acc, [ key, val ] ) => {
            if ( previousProps.current[ key ] !== val ) {
                acc[ key ] = { from: previousProps.current[ key ], to: val };
            }
            return acc;
        }, {} );
        if ( Object.keys( changes ).length ) {
            console.log( `[${ name }] re-rendered due to:`, changes );
        }
        previousProps.current = props;
    } );
}
```

---

## Scenario 7: Implementing a Custom Sidebar Panel in the Block Editor Using PluginSidebar

**Scenario:**
A publishing team needs a custom sidebar panel in the Gutenberg editor that shows a word count, a readability score, and a custom "SEO checklist" — independent of any block. The panel should persist its state across sessions using post meta and integrate with the Save button.

**Challenge:**
Register a `PluginSidebar` with a custom icon, read and write post meta via `useSelect`/`useDispatch`, and ensure the data is saved when the editor saves.

**Solution:**

1. Register the sidebar plugin in `index.js`:

```js
import { registerPlugin } from '@wordpress/plugins';
import { PluginSidebar } from '@wordpress/editor';
import { PanelBody } from '@wordpress/components';
import { chartBar } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import SeoChecklist from './components/SeoChecklist';
import ReadabilityScore from './components/ReadabilityScore';
import WordCount from './components/WordCount';

registerPlugin( 'myplugin-seo-sidebar', {
    render() {
        return (
            <PluginSidebar
                name="myplugin-seo-sidebar"
                title={ __( 'SEO & Readability', 'myplugin' ) }
                icon={ chartBar }
            >
                <PanelBody title={ __( 'Content Stats', 'myplugin' ) } initialOpen={ true }>
                    <WordCount />
                    <ReadabilityScore />
                </PanelBody>
                <PanelBody title={ __( 'SEO Checklist', 'myplugin' ) } initialOpen={ true }>
                    <SeoChecklist />
                </PanelBody>
            </PluginSidebar>
        );
    },
} );
```

2. Register the post meta fields that back the sidebar on the PHP side:

```php
add_action( 'init', function () {
    register_post_meta( 'post', '_myplugin_focus_keyword', [
        'show_in_rest'  => true,
        'single'        => true,
        'type'          => 'string',
        'default'       => '',
        'auth_callback' => fn() => current_user_can( 'edit_posts' ),
    ] );

    register_post_meta( 'post', '_myplugin_seo_score', [
        'show_in_rest'  => true,
        'single'        => true,
        'type'          => 'integer',
        'default'       => 0,
        'auth_callback' => fn() => current_user_can( 'edit_posts' ),
    ] );
} );
```

3. `SeoChecklist.js` component — reads/writes post meta via `useSelect`/`useDispatch`:

```jsx
import { useSelect, useDispatch } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';
import { TextControl, CheckboxControl, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState, useEffect } from '@wordpress/element';

export default function SeoChecklist() {
    const { postId, focusKeyword, postTitle, postContent } = useSelect( ( select ) => {
        const editor = select( editorStore );
        return {
            postId:       editor.getCurrentPostId(),
            focusKeyword: editor.getEditedPostAttribute( 'meta' )?._myplugin_focus_keyword ?? '',
            postTitle:    editor.getEditedPostAttribute( 'title' ) ?? '',
            postContent:  editor.getEditedPostAttribute( 'content' ) ?? '',
        };
    }, [] );

    const { editPost } = useDispatch( editorStore );

    function setFocusKeyword( val ) {
        editPost( { meta: { _myplugin_focus_keyword: val } } );
    }

    // Derive checklist items from live editor data
    const keyword = focusKeyword.trim().toLowerCase();
    const checklist = [
        {
            label: __( 'Focus keyword set', 'myplugin' ),
            pass:  keyword.length > 0,
        },
        {
            label: __( 'Keyword in title', 'myplugin' ),
            pass:  keyword && postTitle.toLowerCase().includes( keyword ),
        },
        {
            label: __( 'Post longer than 300 words', 'myplugin' ),
            pass:  postContent.replace( /<[^>]+>/g, ' ' ).trim().split( /\s+/ ).length >= 300,
        },
        {
            label: __( 'Keyword in first paragraph', 'myplugin' ),
            pass:  keyword && postContent.split( '</p>' )[ 0 ]?.toLowerCase().includes( keyword ),
        },
    ];

    const score = Math.round( ( checklist.filter( ( c ) => c.pass ).length / checklist.length ) * 100 );

    // Persist the score to meta so it can be used in admin columns
    useEffect( () => {
        editPost( { meta: { _myplugin_seo_score: score } } );
    }, [ score ] );

    return (
        <div className="myplugin-seo-checklist">
            <TextControl
                label={ __( 'Focus Keyword', 'myplugin' ) }
                value={ focusKeyword }
                onChange={ setFocusKeyword }
                placeholder={ __( 'e.g. wordpress performance', 'myplugin' ) }
                help={ __( 'The primary term this post should rank for.', 'myplugin' ) }
            />

            <div className="seo-score" style={ { fontSize: 24, fontWeight: 700, margin: '12px 0' } }>
                { __( 'SEO Score:', 'myplugin' ) } { score }%
            </div>

            <ul style={ { listStyle: 'none', padding: 0 } }>
                { checklist.map( ( item ) => (
                    <li key={ item.label } style={ { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } }>
                        <span style={ { color: item.pass ? '#00a32a' : '#d63638', fontSize: 16 } }>
                            { item.pass ? '✓' : '✗' }
                        </span>
                        <span style={ { color: item.pass ? 'inherit' : '#646970' } }>{ item.label }</span>
                    </li>
                ) ) }
            </ul>
        </div>
    );
}
```

4. `WordCount.js` — live word count from editor content:

```jsx
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';

export default function WordCount() {
    const wordCount = useSelect( ( select ) => {
        const content = select( editorStore ).getEditedPostAttribute( 'content' ) ?? '';
        const text    = content.replace( /<[^>]+>/g, ' ' ).replace( /\s+/g, ' ' ).trim();
        return text ? text.split( ' ' ).length : 0;
    }, [] );

    const readingTime = Math.ceil( wordCount / 200 );

    return (
        <div className="myplugin-word-count">
            <p>
                <strong>{ wordCount }</strong> { __( 'words', 'myplugin' ) }
                { ' · ' }
                { readingTime } { __( 'min read', 'myplugin' ) }
            </p>
        </div>
    );
}
```

5. Open the sidebar programmatically via `PluginSidebarMoreMenuItem` (adds it to the block editor "More" menu):

```jsx
import { PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { chartBar } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';

// Add this to the registerPlugin render function alongside <PluginSidebar>:
<PluginSidebarMoreMenuItem target="myplugin-seo-sidebar" icon={ chartBar }>
    { __( 'SEO & Readability', 'myplugin' ) }
</PluginSidebarMoreMenuItem>
```

---

# WordPress Engineer — Interview Prep

> Complete interview preparation for Senior WordPress Engineer roles.
> Covers 15 topics with core concepts, 50–100 interview Q&A (with inline code), real-world scenarios, and architecture diagrams.

## Topics

| # | Topic | Questions | Core Concepts | Scenarios |
|---|-------|-----------|---------------|-----------|
| 1 | [WordPress](./wordpress/) | 100 | ✅ | ✅ |
| 2 | [PHP](./php/) | 100 | ✅ | ✅ |
| 3 | [JavaScript](./javascript/) | 100 | ✅ | ✅ |
| 4 | [MySQL](./mysql/) | 50 | ✅ | ✅ |
| 5 | [HTML5](./html5/) | 50 | ✅ | ✅ |
| 6 | [CSS3](./css3/) | 50 | ✅ | ✅ |
| 7 | [SCSS / SASS](./scss/) | 50 | ✅ | ✅ |
| 8 | [jQuery](./jquery/) | 50 | ✅ | ✅ |
| 9 | [Cloud — AWS & GCP](./cloud-aws-gcp/) | 50 | ✅ | ✅ |
| 10 | [Web Servers — Nginx & Apache](./web-servers/) | 50 | ✅ | ✅ |
| 11 | [SEO, Analytics & GTM](./seo-analytics/) | 50 | ✅ | ✅ |
| 12 | [REST API](./rest-api/) | 50 | ✅ | ✅ |
| 13 | [React & Gutenberg](./react-and-gutenberg/) | 50 | ✅ | ✅ |
| 14 | [Git & CI/CD](./git/) | 50 | ✅ | ✅ |
| 15 | [Developer Tools](./tools/) | 50 | ✅ | ✅ |

## Folder Structure

Each topic contains:

```
topic/
├── core-concepts.md       # Key concepts with architecture diagrams (Mermaid)
├── interview-questions.md # Basic / Mid / Advanced Q&A with inline code
└── scenario-based.md      # Real-world problem → solution scenarios
```

## Interview Questions Format

Questions are split into 3 levels:

| Level | Description | Count |
|-------|-------------|-------|
| **Basic** | Fundamentals, definitions, syntax | ~35% |
| **Mid** | Practical usage, patterns, WordPress integration | ~40% |
| **Advanced** | Architecture, performance, security, scale | ~25% |

## How to Use

1. **Before an interview:** Review `core-concepts.md` for the topic
2. **Practice Q&A:** Go through `interview-questions.md` — try answering before reading
3. **Scenario prep:** Work through `scenario-based.md` for real-world problem-solving
4. **Focus areas for Senior roles:** Pay extra attention to Advanced questions and scenarios

### During the Interview

- For "explain X" questions: lead with a one-sentence definition, then give a concrete example.
- For scenario questions: restate the problem, outline your approach, then dive into specifics.
- For coding questions: talk through your intent before you type. Interviewers value reasoning.

### Self-Assessment

Rate yourself on each topic after reviewing:

- **Basic** — you can define the concept and use it in a sentence.
- **Mid** — you can implement it without looking it up.
- **Advanced** — you can compare trade-offs and debug edge cases under pressure.

### Suggested Study Order

| Day | Topics |
|-----|--------|
| 1 | WordPress, PHP |
| 2 | MySQL, REST API |
| 3 | JavaScript, React & Gutenberg |
| 4 | HTML5, CSS3, SCSS / SASS |
| 5 | Git & CI/CD, Developer Tools |
| 6 | Cloud — AWS & GCP, Web Servers, SEO, Analytics & GTM |
| 7 | Full mock interview: pick one scenario per topic |

## Topics Overview

### 1. WordPress
The WordPress hook system (actions and filters), The Loop, WP_Query, custom post types and taxonomies, plugin and theme architecture, the REST API, multisite networks, performance optimization (object caching, transients), and security hardening best practices.

### 2. PHP
Modern PHP 8.x features including named arguments, match expressions, and union types. Object-oriented design patterns, PSR standards, Composer dependency management, closures, generators, fibers, error handling, and performance profiling techniques relevant to WordPress development.

### 3. JavaScript
The event loop and concurrency model, closures, prototypal inheritance, ES6+ features (destructuring, spread, optional chaining), async/await and Promises, ES modules, the Fetch API, Web Workers, and client-side performance patterns used in WordPress themes and plugins.

### 4. MySQL
Relational database design, indexing strategies and query optimization, JOIN types and when to use them, transactions and locking, the WordPress database schema (`$wpdb`), slow query analysis, and replication concepts relevant to high-traffic WordPress deployments.

### 5. HTML5
Semantic markup and document outlining, accessibility (ARIA roles, WCAG 2.1 compliance), Canvas and SVG, Web Storage and IndexedDB, Service Workers and PWA patterns, form validation APIs, and SEO-relevant HTML structure for WordPress themes.

### 6. CSS3
The box model and stacking context, specificity and the cascade, Flexbox and CSS Grid layout, custom properties (CSS variables), keyframe animations and transitions, media queries and container queries, and modern techniques like `contain` and `will-change` for rendering performance.

### 7. SCSS / SASS
Variables, nesting rules, partials and the `@use`/`@forward` module system, mixins and functions, the `@extend` directive and placeholder selectors, maps, control flow (`@each`, `@for`, `@if`), the 7-1 architecture pattern, and integration with WordPress build tooling (webpack, Vite).

### 8. jQuery
DOM traversal and manipulation, event delegation, AJAX with `$.ajax` and Deferred objects, jQuery plugin authoring, WordPress `noConflict` mode and the `wp_enqueue_script` dependency system, and a practical path for migrating legacy jQuery code to vanilla JavaScript.

### 9. Cloud — AWS & GCP
Linux server administration fundamentals, AWS services (EC2, RDS, S3, CloudFront, Elastic Beanstalk), GCP equivalents (Compute Engine, Cloud SQL, GCS, Cloud CDN), Docker and containerised WordPress, CI/CD pipeline design, and infrastructure-as-code basics with Terraform.

### 10. Web Servers — Nginx & Apache
Architectural differences between event-driven (Nginx) and process-based (Apache) servers, virtual host and server block configuration, SSL/TLS setup and renewal, HTTP/2 and HTTP/3, caching headers and reverse-proxy patterns, rate limiting, WordPress-specific Nginx rewrite rules, and server security hardening.

### 11. SEO, Analytics & GTM
Technical SEO fundamentals, Core Web Vitals measurement and optimisation, structured data (JSON-LD / schema.org), Google Tag Manager container and trigger architecture, Google Analytics 4 event tracking, conversion measurement, and cookie consent management for GDPR compliance.

### 12. REST API
WordPress REST API architecture and routing, registering custom endpoints with `register_rest_route`, authentication strategies (Application Passwords, JWT, OAuth 2.0), permission callbacks and data sanitisation, response schema definition, and consuming the REST API from Gutenberg blocks and external clients.

### 13. React & Gutenberg
React fundamentals (Virtual DOM, JSX, hooks), Gutenberg block architecture, `block.json` registration, `edit` vs `save` functions, `InspectorControls`, `RichText`, `MediaUpload`, the `@wordpress/data` store, `ServerSideRender`, block transforms, Full Site Editing, `theme.json`, and block patterns / template parts.

### 14. Git & CI/CD
The Git data model (blobs, trees, commits, refs), branching strategies (GitFlow vs trunk-based development), merge vs rebase vs squash, cherry-pick, stash, bisect, reflog, Git hooks, submodules, semantic versioning with tags, GitHub Actions workflow authoring, and deployment pipeline design for WordPress projects.

### 15. Developer Tools
WP-CLI commands for site management and scripting, Composer for PHP dependency management, npm / webpack / Vite for asset bundling, Docker and `wp-env` for local development, Xdebug step-debugging, Query Monitor for database and hook profiling, PHPUnit with `WP_UnitTestCase`, end-to-end testing with Playwright or Cypress, and Postman for REST API exploration.

---

*Last updated: March 2026 — targeting Senior WordPress Engineer roles.*

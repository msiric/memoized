# Reader layout regression coverage

Course and resource readers use intrinsic content height. Do not give the MDX
article `height: 100%` or grow its prose/practice sections to fill a parent:
breadcrumbs and related links are additional content, not spare height to share.

`CONTENT_COLUMN_CLASSES` matches the existing prose column. Breadcrumbs, public
previews, lesson controls, related directories and prose-width page navigation
must use that same alignment. A lesson breadcrumb belongs in the reader header
slot so its spacing is not added on top of a second page header.
Long prose tokens may wrap inside narrow nested lists. Preformatted code keeps
its normal horizontal scroller rather than widening the whole document.
Tables use normal word wrapping and keep inline-code identifiers intact. Their
scroll region handles the resulting intrinsic width instead of breaking matrix
labels into individual characters. Ordinary prose wrapping is unchanged.

The existing PR Build Check now seeds synthetic public lessons, a paid preview,
introductions and resource views into its fresh `memoized_ci` database. It builds
and starts the actual app, then runs Chromium at 320, 1440 and 3840 CSS pixels.
No production or premium source data is used. Fixture creation refuses other
databases or a nonempty catalog.

`src/scripts/check-reader-layout.ts` checks actual bounding boxes for document
overflow, breadcrumb/title alignment, excessive practice gaps, reader/footer
alignment and related-directory/footer overlap. The report and screenshots are
uploaded as the `reader-layout` CI artifact. DOM unit tests separately protect
the header and intrinsic-height structure.

For an isolated full-catalog release review, pass the same runner a JSON config
containing `baseUrl`, `outputDirectory`, `widths`, `routes` and `roles`. Optional
synthetic role tokens are accepted only for localhost targets. Keep such configs
private. Public production checks require `allowPublic: true` and refuse tokens.
The browser allows only read requests and never submits progress or auth forms.

These checks cover named geometry failures, not every possible UI or learning
defect. Inspect representative opening, practice and footer screenshots, include
wide/zoomed-out desktop layouts, and report actual route/role coverage.

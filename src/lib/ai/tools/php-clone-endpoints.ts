/**
 * PHP route registrations + handlers for page clone and structure endpoints.
 * These enable the "clone → audit → improve → preview" workflow.
 */

/** Route registrations for clone + page structure */
export function getCloneEndpoints(): string {
  return `
    // POST — Clone a page with all Elementor data as a draft
    register_rest_route( 'wp-pilot/v1', '/clone-page', array(
        'methods'             => 'POST',
        'callback'            => 'wppilot_clone_page',
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
    ) );

    // GET — Hierarchical page structure for design audits
    register_rest_route( 'wp-pilot/v1', '/page-structure/(?P<post_id>\\\\d+)', array(
        'methods'             => 'GET',
        'callback'            => 'wppilot_get_page_structure',
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'args' => array(
            'post_id' => array( 'required' => true, 'type' => 'integer' ),
        ),
    ) );
`;
}

/** PHP handler functions for clone + page structure endpoints */
export function getCloneHelpers(): string {
  return `
/**
 * POST handler: Clone a page with all Elementor data as a draft.
 * Copies: post content, _elementor_data, _elementor_edit_mode,
 *         _elementor_template_type, _elementor_page_settings, custom CSS.
 */
function wppilot_clone_page( WP_REST_Request \\$request ) {
    \\$body = \\$request->get_json_params();
    \\$source_id = isset( \\$body['source_post_id'] ) ? (int) \\$body['source_post_id'] : 0;
    \\$new_title = isset( \\$body['title'] ) ? sanitize_text_field( \\$body['title'] ) : '';

    if ( ! \\$source_id ) {
        return new WP_Error( 'missing_source', 'source_post_id is required.', array( 'status' => 400 ) );
    }

    \\$source = get_post( \\$source_id );
    if ( ! \\$source ) {
        return new WP_Error( 'post_not_found', 'Source page not found.', array( 'status' => 404 ) );
    }

    // Build title for the clone
    if ( empty( \\$new_title ) ) {
        \\$new_title = \\$source->post_title . ' (Draft Clone)';
    }

    // Create draft copy of the page
    \\$new_id = wp_insert_post( array(
        'post_title'   => \\$new_title,
        'post_content' => \\$source->post_content,
        'post_status'  => 'draft',
        'post_type'    => \\$source->post_type,
        'post_author'  => get_current_user_id(),
    ) );

    if ( is_wp_error( \\$new_id ) ) {
        return \\$new_id;
    }

    // Copy all Elementor-related meta to the new page
    \\$meta_keys = array(
        '_elementor_data',
        '_elementor_edit_mode',
        '_elementor_template_type',
        '_elementor_page_settings',
        '_elementor_controls_usage',
        '_wp_page_template',
    );

    foreach ( \\$meta_keys as \\$key ) {
        \\$value = get_post_meta( \\$source_id, \\$key, true );
        if ( ! empty( \\$value ) ) {
            // wp_slash preserves JSON Unicode escapes (\\u00f6 → ö) that
            // WordPress stripslashes_deep would otherwise mangle
            update_post_meta( \\$new_id, \\$key, wp_slash( \\$value ) );
        }
    }

    // Copy custom CSS if Elementor stored any
    \\$custom_css = get_post_meta( \\$source_id, '_elementor_css', true );
    if ( ! empty( \\$custom_css ) ) {
        update_post_meta( \\$new_id, '_elementor_css', \\$custom_css );
    }

    // Build preview URL
    \\$preview_url = get_preview_post_link( \\$new_id );
    \\$edit_url    = admin_url( 'post.php?post=' . \\$new_id . '&action=elementor' );

    // Count widgets for summary
    \\$raw = get_post_meta( \\$new_id, '_elementor_data', true );
    \\$widget_count = 0;
    if ( ! empty( \\$raw ) ) {
        \\$data = json_decode( \\$raw, true );
        if ( is_array( \\$data ) ) {
            \\$widget_count = count( wppilot_flatten_widgets( \\$data ) );
        }
    }

    return rest_ensure_response( array(
        'success'       => true,
        'source_id'     => \\$source_id,
        'source_title'  => \\$source->post_title,
        'new_post_id'   => \\$new_id,
        'new_title'     => \\$new_title,
        'status'        => 'draft',
        'widget_count'  => \\$widget_count,
        'preview_url'   => \\$preview_url,
        'edit_url'      => \\$edit_url,
        'message'       => 'Page cloned as draft. All Elementor data copied. Live page is untouched.',
    ) );
}

/**
 * GET handler: Return hierarchical page structure for design audits.
 * Preserves sections > columns > widgets tree instead of flattening.
 */
function wppilot_get_page_structure( WP_REST_Request \\$request ) {
    \\$post_id = (int) \\$request['post_id'];
    \\$post    = get_post( \\$post_id );

    if ( ! \\$post ) {
        return new WP_Error( 'post_not_found', 'Post not found.', array( 'status' => 404 ) );
    }

    \\$raw = get_post_meta( \\$post_id, '_elementor_data', true );
    if ( empty( \\$raw ) ) {
        return new WP_Error( 'no_elementor_data', 'This page has no Elementor data.', array( 'status' => 404 ) );
    }

    \\$data = json_decode( \\$raw, true );
    if ( ! is_array( \\$data ) ) {
        return new WP_Error( 'invalid_data', 'Elementor data is not valid JSON.', array( 'status' => 500 ) );
    }

    // Get page-level settings
    \\$page_settings = get_post_meta( \\$post_id, '_elementor_page_settings', true );

    // Build hierarchical structure with key settings only (not raw dump)
    \\$structure = wppilot_build_structure( \\$data );

    // Count totals
    \\$flat = wppilot_flatten_widgets( \\$data );
    \\$section_count = 0;
    foreach ( \\$data as \\$el ) {
        if ( isset( \\$el['elType'] ) && ( \\$el['elType'] === 'section' || \\$el['elType'] === 'container' ) ) {
            \\$section_count++;
        }
    }

    return rest_ensure_response( array(
        'post_id'        => \\$post_id,
        'title'          => get_the_title( \\$post_id ),
        'status'         => \\$post->post_status,
        'sections'       => \\$section_count,
        'total_widgets'  => count( \\$flat ),
        'page_settings'  => \\$page_settings ? \\$page_settings : new stdClass(),
        'structure'      => \\$structure,
    ) );
}

/**
 * Build hierarchical structure tree with key settings for audits.
 * Keeps sections > columns > widgets hierarchy intact.
 */
function wppilot_build_structure( \\$elements, \\$depth = 0 ) {
    \\$result = array();
    foreach ( \\$elements as \\$el ) {
        \\$item = array(
            'id'      => isset( \\$el['id'] ) ? \\$el['id'] : '',
            'elType'  => isset( \\$el['elType'] ) ? \\$el['elType'] : 'unknown',
        );

        // Add widget type for widgets
        if ( ! empty( \\$el['widgetType'] ) ) {
            \\$item['widgetType'] = \\$el['widgetType'];
        }

        // Extract key design settings (skip empty/default values)
        if ( ! empty( \\$el['settings'] ) ) {
            \\$item['settings'] = wppilot_extract_key_settings( \\$el['settings'], \\$el['elType'] );
        }

        // Recurse into children
        if ( ! empty( \\$el['elements'] ) ) {
            \\$item['children'] = wppilot_build_structure( \\$el['elements'], \\$depth + 1 );
        }

        \\$result[] = \\$item;
    }
    return \\$result;
}

/**
 * Extract only design-relevant settings for audit (skip internal/empty ones).
 */
function wppilot_extract_key_settings( \\$settings, \\$el_type ) {
    // Settings we care about for design audits
    \\$design_keys = array(
        // Layout
        'content_width', 'column_gap', 'gap', 'layout', 'structure',
        '_column_size', '_inline_size', 'flex_direction', 'flex_wrap',
        // Spacing
        'padding', 'margin', 'section_padding', 'section_margin',
        // Background
        'background_background', 'background_color', 'background_image',
        'background_overlay_background', 'background_overlay_color',
        // Typography
        'title', 'editor', 'text', 'header_size', 'title_color',
        'typography_font_family', 'typography_font_size', 'typography_font_weight',
        'text_color', 'color',
        // Visual
        'border_border', 'border_width', 'border_color', 'border_radius',
        'box_shadow_box_shadow', 'box_shadow_box_shadow_type',
        // Sizing
        'width', 'height', 'min_height', 'min_height_inner',
        // Widget-specific
        'image', 'link', 'url', 'button_text', 'button_type', 'size',
        'icon', 'align', 'text_align',
        // Responsive
        'hide_desktop', 'hide_tablet', 'hide_mobile',
    );

    \\$extracted = array();
    foreach ( \\$settings as \\$key => \\$val ) {
        // Skip empty values
        if ( \\$val === '' || \\$val === null || \\$val === array() ) continue;

        // Include if it's a known design key
        if ( in_array( \\$key, \\$design_keys, true ) ) {
            // Truncate long text values for audit readability
            if ( is_string( \\$val ) && strlen( \\$val ) > 200 ) {
                \\$extracted[ \\$key ] = substr( \\$val, 0, 200 ) . '...';
            } else {
                \\$extracted[ \\$key ] = \\$val;
            }
        }
    }

    return \\$extracted;
}
`;
}

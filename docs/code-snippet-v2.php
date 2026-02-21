<?php
/**
 * WP Pilot — REST API v2
 * Description: Custom REST endpoints for Elementor read/write, page cloning, and design audits.
 * Version: 2.0.0
 *
 * INSTALLATION: Add this as a Code Snippet in WordPress:
 *   1. Go to WP Admin → Snippets → Add New
 *   2. Name: "WP Pilot Elementor API" (replace existing v1 if present)
 *   3. Paste this entire file
 *   4. Set scope: "Run everywhere"
 *   5. Save and Activate
 *
 * Endpoints:
 *   GET  /wp-json/wp-pilot/v1/elementor/{post_id}                    — read widgets (flat)
 *   POST /wp-json/wp-pilot/v1/elementor/{post_id}/widget/{widget_id} — update widget
 *   GET  /wp-json/wp-pilot/v1/page-structure/{post_id}               — hierarchical layout
 *   POST /wp-json/wp-pilot/v1/clone-page                             — clone page as draft
 *   GET  /wp-json/wp-pilot/v1/files?path=public_html                 — PHP filesystem bridge
 *
 * Security: All endpoints require edit_posts capability (Application Password auth).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'rest_api_init', function() {

    // ═══════════════════════════════════════════════════════
    // ELEMENTOR READ/WRITE ENDPOINTS (v1 — unchanged)
    // ═══════════════════════════════════════════════════════

    // GET — Read all widgets from a page (flat list)
    register_rest_route( 'wp-pilot/v1', '/elementor/(?P<post_id>\d+)', array(
        'methods'             => 'GET',
        'callback'            => 'wppilot_get_elementor_data',
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'args' => array(
            'post_id' => array( 'required' => true, 'type' => 'integer' ),
        ),
    ) );

    // POST — Update a specific widget's settings
    register_rest_route( 'wp-pilot/v1', '/elementor/(?P<post_id>\d+)/widget/(?P<widget_id>[a-z0-9]+)', array(
        'methods'             => 'POST',
        'callback'            => 'wppilot_update_elementor_widget',
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'args' => array(
            'post_id'   => array( 'required' => true, 'type' => 'integer' ),
            'widget_id' => array( 'required' => true, 'type' => 'string' ),
        ),
    ) );

    // ═══════════════════════════════════════════════════════
    // CLONE + AUDIT ENDPOINTS (v2 — new)
    // ═══════════════════════════════════════════════════════

    // POST — Clone a page with all Elementor data as a draft
    register_rest_route( 'wp-pilot/v1', '/clone-page', array(
        'methods'             => 'POST',
        'callback'            => 'wppilot_clone_page',
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
    ) );

    // GET — Hierarchical page structure for design audits
    register_rest_route( 'wp-pilot/v1', '/page-structure/(?P<post_id>\d+)', array(
        'methods'             => 'GET',
        'callback'            => 'wppilot_get_page_structure',
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'args' => array(
            'post_id' => array( 'required' => true, 'type' => 'integer' ),
        ),
    ) );

    // ═══════════════════════════════════════════════════════
    // PHP FILESYSTEM BRIDGE (v2 — bypasses cPanel/Imunify360)
    // ═══════════════════════════════════════════════════════

    // GET — List directory via PHP native filesystem (no cPanel needed)
    // Paths may be relative (resolved from home dir) or absolute (validated).
    // Security: restricted to within the hosting account home directory.
    register_rest_route( 'wp-pilot/v1', '/files', array(
        'methods'             => 'GET',
        'callback'            => 'wppilot_list_files',
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'args' => array(
            'path' => array(
                'required'          => true,
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ),
        ),
    ) );

} );


// ═══════════════════════════════════════════════════════════
// ELEMENTOR HANDLERS (v1)
// ═══════════════════════════════════════════════════════════

function wppilot_get_elementor_data( WP_REST_Request $request ) {
    $post_id = (int) $request['post_id'];
    $post    = get_post( $post_id );

    if ( ! $post ) {
        return new WP_Error( 'post_not_found', 'Post not found.', array( 'status' => 404 ) );
    }

    $raw = get_post_meta( $post_id, '_elementor_data', true );
    if ( empty( $raw ) ) {
        return new WP_Error( 'no_elementor_data', 'This page has no Elementor data.', array( 'status' => 404 ) );
    }

    $data = json_decode( $raw, true );
    if ( ! is_array( $data ) ) {
        return new WP_Error( 'invalid_data', 'Elementor data is not valid JSON.', array( 'status' => 500 ) );
    }

    $widgets = wppilot_flatten_widgets( $data );

    return rest_ensure_response( array(
        'post_id'      => $post_id,
        'title'        => get_the_title( $post_id ),
        'widget_count' => count( $widgets ),
        'widgets'      => $widgets,
    ) );
}

function wppilot_update_elementor_widget( WP_REST_Request $request ) {
    $post_id   = (int) $request['post_id'];
    $widget_id = sanitize_text_field( $request['widget_id'] );
    $body      = $request->get_json_params();
    $settings  = isset( $body['settings'] ) ? $body['settings'] : array();

    if ( empty( $settings ) ) {
        return new WP_Error( 'no_settings', 'No settings provided.', array( 'status' => 400 ) );
    }

    $raw = get_post_meta( $post_id, '_elementor_data', true );
    if ( empty( $raw ) ) {
        return new WP_Error( 'no_elementor_data', 'This page has no Elementor data.', array( 'status' => 404 ) );
    }

    $data = json_decode( $raw, true );
    if ( ! is_array( $data ) ) {
        return new WP_Error( 'invalid_data', 'Elementor data is not valid JSON.', array( 'status' => 500 ) );
    }

    $backup_key = '_elementor_data_backup_' . time();
    update_post_meta( $post_id, $backup_key, $raw );

    $found = wppilot_update_widget_in_tree( $data, $widget_id, $settings );
    if ( ! $found ) {
        delete_post_meta( $post_id, $backup_key );
        return new WP_Error( 'widget_not_found', 'Widget not found.', array( 'status' => 404 ) );
    }

    $new_raw = wp_json_encode( $data );
    update_post_meta( $post_id, '_elementor_data', wp_slash( $new_raw ) );

    delete_post_meta( $post_id, '_elementor_css' );
    if ( class_exists( '\Elementor\Plugin' ) ) {
        \Elementor\Plugin::instance()->files_manager->clear_cache();
    }

    return rest_ensure_response( array(
        'success'          => true,
        'widget_id'        => $widget_id,
        'updated_settings' => $settings,
        'backup_key'       => $backup_key,
    ) );
}


// ═══════════════════════════════════════════════════════════
// CLONE + AUDIT HANDLERS (v2)
// ═══════════════════════════════════════════════════════════

function wppilot_clone_page( WP_REST_Request $request ) {
    $body = $request->get_json_params();
    $source_id = isset( $body['source_post_id'] ) ? (int) $body['source_post_id'] : 0;
    $new_title = isset( $body['title'] ) ? sanitize_text_field( $body['title'] ) : '';

    if ( ! $source_id ) {
        return new WP_Error( 'missing_source', 'source_post_id is required.', array( 'status' => 400 ) );
    }

    $source = get_post( $source_id );
    if ( ! $source ) {
        return new WP_Error( 'post_not_found', 'Source page not found.', array( 'status' => 404 ) );
    }

    if ( empty( $new_title ) ) {
        $new_title = $source->post_title . ' (Draft Clone)';
    }

    $new_id = wp_insert_post( array(
        'post_title'   => $new_title,
        'post_content' => $source->post_content,
        'post_status'  => 'draft',
        'post_type'    => $source->post_type,
        'post_author'  => get_current_user_id(),
    ) );

    if ( is_wp_error( $new_id ) ) {
        return $new_id;
    }

    // Copy all Elementor meta
    $meta_keys = array(
        '_elementor_data',
        '_elementor_edit_mode',
        '_elementor_template_type',
        '_elementor_page_settings',
        '_elementor_controls_usage',
        '_wp_page_template',
    );

    foreach ( $meta_keys as $key ) {
        $value = get_post_meta( $source_id, $key, true );
        if ( ! empty( $value ) ) {
            // wp_slash preserves JSON Unicode escapes (\u00f6 → ö) that
            // WordPress stripslashes_deep would otherwise mangle
            update_post_meta( $new_id, $key, wp_slash( $value ) );
        }
    }

    $custom_css = get_post_meta( $source_id, '_elementor_css', true );
    if ( ! empty( $custom_css ) ) {
        update_post_meta( $new_id, '_elementor_css', $custom_css );
    }

    $preview_url = get_preview_post_link( $new_id );
    $edit_url    = admin_url( 'post.php?post=' . $new_id . '&action=elementor' );

    $raw = get_post_meta( $new_id, '_elementor_data', true );
    $widget_count = 0;
    if ( ! empty( $raw ) ) {
        $data = json_decode( $raw, true );
        if ( is_array( $data ) ) {
            $widget_count = count( wppilot_flatten_widgets( $data ) );
        }
    }

    return rest_ensure_response( array(
        'success'       => true,
        'source_id'     => $source_id,
        'source_title'  => $source->post_title,
        'new_post_id'   => $new_id,
        'new_title'     => $new_title,
        'status'        => 'draft',
        'widget_count'  => $widget_count,
        'preview_url'   => $preview_url,
        'edit_url'      => $edit_url,
        'message'       => 'Page cloned as draft. All Elementor data copied. Live page is untouched.',
    ) );
}

function wppilot_get_page_structure( WP_REST_Request $request ) {
    $post_id = (int) $request['post_id'];
    $post    = get_post( $post_id );

    if ( ! $post ) {
        return new WP_Error( 'post_not_found', 'Post not found.', array( 'status' => 404 ) );
    }

    $raw = get_post_meta( $post_id, '_elementor_data', true );
    if ( empty( $raw ) ) {
        return new WP_Error( 'no_elementor_data', 'This page has no Elementor data.', array( 'status' => 404 ) );
    }

    $data = json_decode( $raw, true );
    if ( ! is_array( $data ) ) {
        return new WP_Error( 'invalid_data', 'Elementor data is not valid JSON.', array( 'status' => 500 ) );
    }

    $page_settings = get_post_meta( $post_id, '_elementor_page_settings', true );
    $structure = wppilot_build_structure( $data );
    $flat = wppilot_flatten_widgets( $data );

    $section_count = 0;
    foreach ( $data as $el ) {
        if ( isset( $el['elType'] ) && ( $el['elType'] === 'section' || $el['elType'] === 'container' ) ) {
            $section_count++;
        }
    }

    return rest_ensure_response( array(
        'post_id'        => $post_id,
        'title'          => get_the_title( $post_id ),
        'status'         => $post->post_status,
        'sections'       => $section_count,
        'total_widgets'  => count( $flat ),
        'page_settings'  => $page_settings ? $page_settings : new stdClass(),
        'structure'      => $structure,
    ) );
}


// ═══════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════

function wppilot_flatten_widgets( $elements ) {
    $widgets = array();
    foreach ( $elements as $el ) {
        if ( isset( $el['elType'] ) && $el['elType'] === 'widget' && ! empty( $el['widgetType'] ) ) {
            $widgets[] = array(
                'id'         => $el['id'],
                'elType'     => $el['elType'],
                'widgetType' => $el['widgetType'],
                'settings'   => isset( $el['settings'] ) ? $el['settings'] : array(),
            );
        }
        if ( ! empty( $el['elements'] ) ) {
            $widgets = array_merge( $widgets, wppilot_flatten_widgets( $el['elements'] ) );
        }
    }
    return $widgets;
}

function wppilot_update_widget_in_tree( &$elements, $widget_id, $new_settings ) {
    foreach ( $elements as &$el ) {
        if ( isset( $el['id'] ) && $el['id'] === $widget_id ) {
            if ( ! isset( $el['settings'] ) ) {
                $el['settings'] = array();
            }
            $el['settings'] = array_merge( $el['settings'], $new_settings );
            return true;
        }
        if ( ! empty( $el['elements'] ) ) {
            if ( wppilot_update_widget_in_tree( $el['elements'], $widget_id, $new_settings ) ) {
                return true;
            }
        }
    }
    return false;
}

function wppilot_build_structure( $elements, $depth = 0 ) {
    $result = array();
    foreach ( $elements as $el ) {
        $item = array(
            'id'      => isset( $el['id'] ) ? $el['id'] : '',
            'elType'  => isset( $el['elType'] ) ? $el['elType'] : 'unknown',
        );

        if ( ! empty( $el['widgetType'] ) ) {
            $item['widgetType'] = $el['widgetType'];
        }

        if ( ! empty( $el['settings'] ) ) {
            $item['settings'] = wppilot_extract_key_settings( $el['settings'], $el['elType'] );
        }

        if ( ! empty( $el['elements'] ) ) {
            $item['children'] = wppilot_build_structure( $el['elements'], $depth + 1 );
        }

        $result[] = $item;
    }
    return $result;
}

// ═══════════════════════════════════════════════════════════
// PHP FILESYSTEM BRIDGE HANDLER (v2)
// ═══════════════════════════════════════════════════════════

/**
 * List directory contents using PHP native file system.
 * Bypasses cPanel UAPI entirely — no IP blocks, no Imunify360.
 *
 * Path handling:
 *   - Relative paths (e.g. "public_html"): resolved from account home dir
 *   - Absolute paths (e.g. "/home/user/public_html"): used as-is
 * Security: resolved path must be within the account home directory.
 */
function wppilot_list_files( WP_REST_Request $request ) {
    // Home dir = one level above WordPress install (e.g. /home/user from /home/user/public_html/)
    $home_dir = dirname( rtrim( ABSPATH, '/\\' ) );

    $requested = $request->get_param( 'path' );

    // Resolve path: relative → prepend home dir; absolute → use as-is
    if ( ! path_is_absolute( $requested ) ) {
        $resolved = $home_dir . DIRECTORY_SEPARATOR . ltrim( $requested, '/\\' );
    } else {
        $resolved = $requested;
    }

    // Normalise (resolve symlinks, .. etc.)
    $real_path = realpath( $resolved );
    $real_home = realpath( $home_dir );

    if ( $real_path === false || $real_home === false ) {
        return new WP_Error( 'path_not_found', 'Path does not exist or is not readable.', array( 'status' => 404 ) );
    }

    // Security guard: disallow traversal outside home directory
    $home_prefix = $real_home . DIRECTORY_SEPARATOR;
    if ( $real_path !== $real_home && strpos( $real_path . DIRECTORY_SEPARATOR, $home_prefix ) !== 0 ) {
        return new WP_Error( 'path_forbidden', 'Access denied: path is outside the account home directory.', array( 'status' => 403 ) );
    }

    if ( ! is_dir( $real_path ) ) {
        return new WP_Error( 'not_a_directory', 'The path exists but is not a directory.', array( 'status' => 400 ) );
    }

    $entries = @scandir( $real_path );
    if ( $entries === false ) {
        return new WP_Error( 'read_error', 'Cannot read directory (permission denied).', array( 'status' => 500 ) );
    }

    $files = array();
    foreach ( $entries as $entry ) {
        if ( $entry === '.' || $entry === '..' ) continue;

        $full = $real_path . DIRECTORY_SEPARATOR . $entry;

        // Determine type
        if ( is_link( $full ) ) {
            $type = 'link';
        } elseif ( is_dir( $full ) ) {
            $type = 'dir';
        } else {
            $type = 'file';
        }

        // Stat for size + mtime (suppress warnings on unreadable entries)
        $stat  = @stat( $full );
        $size  = ( $stat !== false ) ? (int) $stat['size']  : 0;
        $mtime = ( $stat !== false ) ? (int) $stat['mtime'] : 0;

        $files[] = array(
            'name'      => $entry,
            'type'      => $type,
            'size'      => $size,
            'mtime'     => $mtime,
            // Always forward-slash in fullpath (matches cPanel convention)
            'fullpath'  => str_replace( DIRECTORY_SEPARATOR, '/', $full ),
            'humansize' => wppilot_format_bytes( $size ),
        );
    }

    // Directories first, then alphabetical (matches cPanel sort order)
    usort( $files, function( $a, $b ) {
        if ( $a['type'] === 'dir' && $b['type'] !== 'dir' ) return -1;
        if ( $a['type'] !== 'dir' && $b['type'] === 'dir' ) return  1;
        return strcmp( $a['name'], $b['name'] );
    } );

    return rest_ensure_response( array(
        'path'  => str_replace( DIRECTORY_SEPARATOR, '/', $real_path ),
        'files' => $files,
    ) );
}

/** Human-readable file size (matches cPanel humansize format) */
function wppilot_format_bytes( $bytes ) {
    if ( $bytes <= 0 ) return '0 B';
    $units = array( 'B', 'KB', 'MB', 'GB', 'TB' );
    $i     = (int) floor( log( $bytes, 1024 ) );
    $i     = min( $i, count( $units ) - 1 );
    return round( $bytes / pow( 1024, $i ), 1 ) . ' ' . $units[ $i ];
}


// ═══════════════════════════════════════════════════════════
// EXISTING SHARED HELPERS (unchanged)
// ═══════════════════════════════════════════════════════════

function wppilot_extract_key_settings( $settings, $el_type ) {
    $design_keys = array(
        'content_width', 'column_gap', 'gap', 'layout', 'structure',
        '_column_size', '_inline_size', 'flex_direction', 'flex_wrap',
        'padding', 'margin', 'section_padding', 'section_margin',
        'background_background', 'background_color', 'background_image',
        'background_overlay_background', 'background_overlay_color',
        'title', 'editor', 'text', 'header_size', 'title_color',
        'typography_font_family', 'typography_font_size', 'typography_font_weight',
        'text_color', 'color',
        'border_border', 'border_width', 'border_color', 'border_radius',
        'box_shadow_box_shadow', 'box_shadow_box_shadow_type',
        'width', 'height', 'min_height', 'min_height_inner',
        'image', 'link', 'url', 'button_text', 'button_type', 'size',
        'icon', 'align', 'text_align',
        'hide_desktop', 'hide_tablet', 'hide_mobile',
    );

    $extracted = array();
    foreach ( $settings as $key => $val ) {
        if ( $val === '' || $val === null || $val === array() ) continue;

        if ( in_array( $key, $design_keys, true ) ) {
            if ( is_string( $val ) && strlen( $val ) > 200 ) {
                $extracted[ $key ] = substr( $val, 0, 200 ) . '...';
            } else {
                $extracted[ $key ] = $val;
            }
        }
    }

    return $extracted;
}
